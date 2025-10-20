import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import svelte from '@astrojs/svelte';

export default defineConfig({
    site: 'https://www.predicatehighered.com',

    trailingSlash: 'always',

    integrations: [sitemap(), svelte()],
});