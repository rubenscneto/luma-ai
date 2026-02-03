import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'LumaAI',
        short_name: 'LumaAI',
        description: 'Seu assistente de produtividade e estudos',
        start_url: '/?source=pwa',
        display: 'standalone',
        background_color: '#090C08',
        theme_color: '#090C08',
        orientation: 'portrait',
        icons: [
            {
                src: '/brand/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/brand/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/brand/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/brand/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
