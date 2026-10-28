// Vercel serverless entry point.
//
// Plain JavaScript on purpose: Vercel compiles functions with esbuild, which
// does not emit the decorator metadata NestJS depends on. The Nest application
// is therefore compiled ahead of time by `nest build` and only required here.
//
// The filename is a catch-all, so /api/v1/<anything> reaches this function
// with req.url unchanged and Nest's own router handles the path.
module.exports = require('../dist/serverless.js').default;
