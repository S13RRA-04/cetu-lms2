import { APP_TARGETS } from './apps.js';

export default {
  async fetch(request) {
    const host   = new URL(request.url).hostname;
    const target = APP_TARGETS[host];

    if (!target) {
      return new Response(`No app configured for ${host}`, { status: 502 });
    }

    const url    = new URL(request.url);
    url.hostname = 'cetu-lms.onrender.com';
    url.protocol = 'https:';

    const headers = new Headers(request.headers);
    headers.set('X-App-Target', target);

    return fetch(new Request(url.toString(), {
      method:   request.method,
      headers,
      body:     request.body,
      redirect: 'manual',
    }));
  },
};
