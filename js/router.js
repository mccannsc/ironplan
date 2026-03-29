/**
 * Hash-based router.
 * Routes: /  /workouts  /workouts/new  /workouts/:id  /session/:id  /exercises  /exercises/:id
 */

const _handlers = [];

export function onRoute(pattern, handler) {
  _handlers.push({ pattern, handler });
}

export function navigate(path) {
  window.location.hash = path;
}

export function back() {
  window.history.back();
}

function _match(pattern, path) {
  const patParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function _dispatch(path) {
  for (const { pattern, handler } of _handlers) {
    const params = _match(pattern, path);
    if (params !== null) {
      handler(params);
      return;
    }
  }
}

export function initRouter() {
  const getPath = () => window.location.hash.slice(1) || '/';

  window.addEventListener('hashchange', () => {
    _dispatch(getPath());
  });

  // Initial route
  _dispatch(getPath());
}
