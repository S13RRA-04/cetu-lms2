/**
 * Maps each proxied subdomain to the X-App-Target value Express uses
 * to select which built frontend to serve.
 *
 * To add a new course subdomain:
 *   1. Add an entry here: 'myapp.cetu.online': 'myapp'
 *   2. Add the route to wrangler.toml
 *   3. Ensure the Express server in backend/src/server.js has a matching
 *      isMyApp() check and serves the corresponding /public-myapp directory.
 */
export const APP_TARGETS = {};
