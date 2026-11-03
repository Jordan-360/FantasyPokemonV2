import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // The Pokémon/NFL data changes weekly while the code doesn't, so it gets its own
        // chunk that browsers can cache separately (and the code chunk stays small).
        codeSplitting: {
          groups: [{ name: 'data', test: /src[\\/]data[\\/]/ }],
        },
      },
    },
  },
})
