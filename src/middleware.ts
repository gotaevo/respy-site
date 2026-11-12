import { defineMiddleware } from 'astro:middleware';
import { localeFromPath } from './i18n/config';
import { translateHtml } from './i18n/translate';

// Traduz as páginas de /en, /es e /pt (no build, para as páginas pré-renderizadas).
export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();
	const locale = localeFromPath(context.url.pathname);
	if (locale === 'pt-BR' || !response.headers.get('content-type')?.includes('text/html')) return response;

	const html = translateHtml(await response.text(), locale);
	const headers = new Headers(response.headers);
	headers.delete('content-length');
	return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
