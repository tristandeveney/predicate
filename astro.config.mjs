import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://www.predicatehighered.com',

    trailingSlash: 'always',

    integrations: [
        sitemap({
            canonical: true,
        }),
    ],
});