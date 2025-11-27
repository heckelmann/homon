import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HOMON System Monitor',
    short_name: 'HOMON',
    description: 'Cyberpunk System Monitoring Dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#06b6d4',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
