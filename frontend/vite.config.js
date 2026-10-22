import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Evita publicar por error una compilación sin backend o apuntando a localhost:
  // en ese modo cualquiera entraría con cualquier contraseña y vería todas las fincas.
  if (mode === 'production' && env.ALLOW_LOCAL_BUILD !== 'true') {
    const url = env.VITE_API_URL || ''
    if (env.VITE_USE_BACKEND !== 'true') {
      throw new Error('VITE_USE_BACKEND debe ser "true" para compilar a producción (revisa frontend/.env.production).')
    }
    if (!/^https:\/\//.test(url) || /localhost|127\.0\.0\.1/.test(url)) {
      throw new Error(`VITE_API_URL debe ser la URL https del backend publicado (termina en /api). Valor actual: "${url}"`)
    }
  }

  return {
    plugins: [react()],
    server: {
      allowedHosts: true,
    },
  }
})
