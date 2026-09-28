import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig(() => {
  const enableHttps = process.env.HTTPS === 'true' || process.argv.includes('--https')
  return {
    base: '/Peta-Suplemen/',
    plugins: [
      react(),
      ...(enableHttps ? [basicSsl()] : []),
    ],
  }
})