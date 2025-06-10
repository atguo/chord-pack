import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: ['./components/index.tsx'],
    },
  },
  lib: [
    {
      bundle: true,
      dts: true,
      format: 'esm',
      syntax: 'es6'
    },
  ],
  output: {
    target: 'web',
  },
  plugins: [pluginReact()],
});
