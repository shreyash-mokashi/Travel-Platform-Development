// Vercel serverless entry point.
//
// Plain JavaScript on purpose: Vercel compiles functions with esbuild, which
// does not emit the decorator metadata NestJS depends on. The Nest application
// is therefore compiled ahead of time by `nest build` and only required here.
//
// Routing: vercel.json rewrites /api/(.*) to this function. Vercel preserves
// the original request URL on rewrites, so Nest's router sees /api/v1/<path>.
// (Bracket catch-all filenames are a Next.js convention; plain api/ functions
// deployed them at their literal, percent-encoded URL - verified in prod.)
module.exports = require('../dist/serverless.js').default;
