import path from 'path'
import { defineConfig, mergeConfig } from 'vite'
import base from './build/vite.config.base'
import { env } from 'process'

const config = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'lib'),
      name: 'Kunun',
      fileName: (format) => `index.${format}.js`,
    },
    sourcemap: env.NODE_ENV == 'production',
    minify: env.NODE_ENV == 'production',
    rollupOptions: {
      external: [
      ],
      output: {
        globals: {
        },
      },
    },
  },
})

export default mergeConfig(base, config)
