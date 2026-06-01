export const routes = [
  ['GET', /^\/api\/signals\/latest\/?$/, './api/signals/latest/route.js', 'GET'],
  ['GET', /^\/api\/signals\/collect\/?$/, './api/signals/collect/route.js', 'GET'],
  ['GET', /^\/api\/signals\/fmkorea-browser\/?$/, './api/signals/fmkorea-browser/route.js', 'GET'],
  ['POST', /^\/api\/signals\/import\/?$/, './api/signals/import/route.js', 'POST'],
  ['GET', /^\/api\/trends\/latest\/?$/, './api/trends/latest/route.js', 'GET'],
  ['GET', /^\/api\/trends\/history\/?$/, './api/trends/history/route.js', 'GET'],
  ['GET', /^\/api\/trends\/rank\/?$/, './api/trends/rank/route.js', 'GET'],
  ['GET', /^\/api\/search\/verify\/?$/, './api/search/verify/route.js', 'GET'],
  ['POST', /^\/api\/content\/plan\/?$/, './api/content/plan/route.js', 'POST'],
  ['GET', /^\/api\/content\/plan\/?$/, './api/content/plan/route.js', 'GET'],
  ['POST', /^\/api\/content\/image\/?$/, './api/content/image/route.js', 'POST']
];
