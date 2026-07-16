'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { attachSquadChallengeSocket } = require('./squadChallengeSocket');
const { InMemorySquadLockCoordinator, createSquadLockCoordinator } = require('./squadLockCoordinator');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function client(port, token) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/squad-challenge`);
  const messages = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const message = JSON.parse(raw);
    messages.push(message);
    for (const waiter of [...waiters]) waiter();
  });
  const next = (type, predicate = () => true) => new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 2000);
    const check = () => {
      const index = messages.findIndex((message) => message.type === type && predicate(message));
      if (index < 0) return;
      clearTimeout(deadline);
      waiters.splice(waiters.indexOf(check), 1);
      resolve(messages.splice(index, 1)[0]);
    };
    waiters.push(check);
    check();
  });
  return {
    ws,
    next,
    async join() {
      await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
      ws.send(JSON.stringify({ type: 'auth', token }));
      await next('authed');
      ws.send(JSON.stringify({ type: 'join', courseId: 'course-1', assignmentId: 'assignment-1' }));
      await next('joined');
    },
    send(message) { ws.send(JSON.stringify(message)); },
  };
}

async function runCrossInstanceScenario(t, coordinatorA, coordinatorB) {
  const authenticate = async (token) => ({
    id: token, first_name: token === 'student-a' ? 'Alex' : 'Blair', last_name: 'Investigator', is_active: true,
  });
  const authorizeJoin = async () => ({ room: 'assignment-1:squad-1' });
  const serverA = http.createServer();
  const serverB = http.createServer();
  const socketA = await attachSquadChallengeSocket(serverA, { coordinator: coordinatorA, authenticate, authorizeJoin });
  const socketB = await attachSquadChallengeSocket(serverB, { coordinator: coordinatorB, authenticate, authorizeJoin });
  const [portA, portB] = await Promise.all([listen(serverA), listen(serverB)]);
  const a = client(portA, 'student-a');
  const b = client(portB, 'student-b');

  t.after(async () => {
    a.ws.terminate();
    b.ws.terminate();
    await Promise.all([
      new Promise((resolve) => socketA.close(resolve)),
      new Promise((resolve) => socketB.close(resolve)),
      new Promise((resolve) => serverA.close(resolve)),
      new Promise((resolve) => serverB.close(resolve)),
    ]);
  });

  await Promise.all([a.join(), b.join()]);
  a.send({ type: 'claim', field: '0' });
  const firstClaim = await b.next('claimed');
  assert.equal(firstClaim.user.user_id, 'student-a');

  a.send({ type: 'input', field: '0', value: 'first response' });
  assert.equal((await b.next('input')).value, 'first response');

  b.send({ type: 'claim', field: '0' });
  const takeover = await a.next('claimed', (message) => message.user.user_id === 'student-b');
  assert.equal(takeover.previousUser.user_id, 'student-a');

  a.send({ type: 'input', field: '0', value: 'stale response' });
  assert.match((await a.next('rejected')).reason, /not controlled/);

  b.send({ type: 'input', field: '0', value: 'controlled response' });
  assert.equal((await a.next('input')).value, 'controlled response');
  b.send({ type: 'release', field: '0' });
  await Promise.all([a.next('released'), b.next('released')]);
  assert.deepEqual(await coordinatorA.snapshot('assignment-1:squad-1'), {});
}

test('coordinates claims, takeover, input rejection, and release across backend instances', async (t) => {
  const coordinator = new InMemorySquadLockCoordinator();
  await runCrossInstanceScenario(t, coordinator, coordinator);
});

test('coordinates the WebSocket scenario through separate Redis connections', {
  skip: !process.env.TEST_REDIS_URL,
}, async (t) => {
  const redisLogger = { warn() {}, error() {} };
  const coordinatorA = await createSquadLockCoordinator({ env: { REDIS_URL: process.env.TEST_REDIS_URL }, logger: redisLogger });
  const coordinatorB = await createSquadLockCoordinator({ env: { REDIS_URL: process.env.TEST_REDIS_URL }, logger: redisLogger });
  t.after(async () => Promise.all([coordinatorA.close(), coordinatorB.close()]));
  await runCrossInstanceScenario(t, coordinatorA, coordinatorB);
});

test('refuses multi-instance mode without Redis coordination', async () => {
  await assert.rejects(
    createSquadLockCoordinator({ env: { BACKEND_INSTANCE_COUNT: '2' }, logger: { warn() {} } }),
    /REDIS_URL is required/,
  );
});

test('rejects an invalid backend instance count', async () => {
  await assert.rejects(
    createSquadLockCoordinator({ env: { BACKEND_INSTANCE_COUNT: 'many' }, logger: { warn() {} } }),
    /positive integer/,
  );
});
