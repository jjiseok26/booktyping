import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['server/app.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'api/_app.mjs',
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
