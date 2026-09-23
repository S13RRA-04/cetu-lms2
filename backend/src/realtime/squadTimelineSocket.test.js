'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { attachSquadTimelineSocket } = require('./squadTimelineSocket');
const { InMemorySquadLockCoordinator } = require('./squadLockCoordinator');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function client(port, token) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/squad-timeline`);
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
    // No assignmentId in the join payload — a case timeline is course+squad
    // scoped only, unlike the challenge socket's assignment+squad room.
    async join() {
      await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
      ws.send(JSON.stringify({ type: 'auth', token }));
      await next('authed');
      ws.send(JSON.stringify({ type: 'join', courseId: 'course-1' }));
      await next('joined');
    },
    send(message) { ws.send(JSON.stringify(message)); },
  };
}

test('two squadmates claim, edit, and release a timeline event field live, with no assignment involved', async (t) => {
  const authenticate = async (token) => ({
    id: token, first_name: token === 'student-a' ? 'Alex' : 'Blair', last_name: 'Investigator', is_active: true,
  });
  const authorizeJoin = async () => ({ room: 'timeline:course-1:squad-1' });
  const coordinator = new InMemorySquadLockCoordinator();
  const server = http.createServer();
  const socket = await attachSquadTimelineSocket(server, { coordinator, authenticate, authorizeJoin });
  const port = await listen(server);
  const a = client(port, 'student-a');
  const b = client(port, 'student-b');

  t.after(async () => {
    a.ws.terminate();
    b.ws.terminate();
    await Promise.all([
      new Promise((resolve) => socket.close(resolve)),
      new Promise((resolve) => server.close(resolve)),
    ]);
  });

  await Promise.all([a.join(), b.join()]);

  a.send({ type: 'claim', field: 'event:evt-1:title' });
  const claimed = await b.next('claimed');
  assert.equal(claimed.field, 'event:evt-1:title');
  assert.equal(claimed.user.user_id, 'student-a');

  a.send({ type: 'input', field: 'event:evt-1:title', value: 'Appliance discovered in Rack C3' });
  assert.equal((await b.next('input')).value, 'Appliance discovered in Rack C3');

  // b cannot write a field a holds
  b.send({ type: 'input', field: 'event:evt-1:title', value: 'stale' });
  assert.match((await b.next('rejected')).reason, /not controlled/);

  a.send({ type: 'release', field: 'event:evt-1:title' });
  await Promise.all([a.next('released'), b.next('released')]);
  assert.deepEqual(await coordinator.snapshot('timeline:course-1:squad-1'), {});
});

test('authorizeJoin refuses a caller with no squad — no assignment lookup involved', async (t) => {
  const authenticate = async () => ({ id: 'u1', first_name: 'No', last_name: 'Squad', is_active: true });
  const authorizeJoin = async () => { throw new Error('Not enrolled in a squad for this course'); };
  const coordinator = new InMemorySquadLockCoordinator();
  const server = http.createServer();
  const socket = await attachSquadTimelineSocket(server, { coordinator, authenticate, authorizeJoin });
  const port = await listen(server);
  const c = client(port, 'u1');

  t.after(async () => {
    c.ws.terminate();
    await Promise.all([
      new Promise((resolve) => socket.close(resolve)),
      new Promise((resolve) => server.close(resolve)),
    ]);
  });

  await new Promise((resolve, reject) => { c.ws.once('open', resolve); c.ws.once('error', reject); });
  c.ws.send(JSON.stringify({ type: 'auth', token: 'u1' }));
  await c.next('authed');
  c.ws.send(JSON.stringify({ type: 'join', courseId: 'course-1' }));
  const error = await c.next('error');
  assert.match(error.message, /Not enrolled in a squad/);
});
