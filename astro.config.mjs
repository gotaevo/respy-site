// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	// Domínio principal, usado nas tags hreflang dos idiomas
	site: 'https://respy.com.br',
	output: 'server',
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
	devToolbar: {
		enabled: false,
	},
});

