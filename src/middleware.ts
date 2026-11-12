import { defineMiddleware } from 'astro:middleware';
import { locales, localeFromPath, type Locale } from './i18n/config';
import { AUTO_COOKIE, CHOICE_COOKIE, parseAcceptLanguage, pickLocale } from './i18n/detect';
import { translateHtml } from './i18n/translate';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|linkedin|preview|lighthouse/i;

/**
 * Na home (/), redireciona a primeira visita para o idioma do navegador.
 * Respeita a escolha salva em cookie e nunca redireciona robôs ou visitas sem idioma informado.
 */
function homeRedirect(request: Request, cookies: { get(name: string): { value: string } | undefined }): Locale | null {
	const chosen = cookies.get(CHOICE_COOKIE)?.value as Locale | undefined;
	if (chosen && chosen in locales) return chosen === 'pt-BR' ? null : chosen;

	if (BOT.test(request.headers.get('user-agent') ?? '')) return null;
	const languages = parseAcceptLanguage(request.headers.get('accept-language'));
	if (!languages.length) return null;

	const locale = pickLocale(languages, request.headers.get('cf-ipcountry'));
	return locale && locale !== 'pt-BR' ? locale : null;
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	if (pathname === '/') {
		const target = homeRedirect(context.request, context.cookies);
		const automatic = target && !context.cookies.get(CHOICE_COOKIE);
		if (target) {
			const response = context.redirect(`/${locales[target].prefix}/`, 302);
			const headers = new Headers(response.headers);
			headers.set('Cache-Control', 'private, no-store');
			headers.set('Vary', 'Accept-Language, Cookie');
			if (automatic) headers.append('Set-Cookie', `${AUTO_COOKIE}=1; Path=/; Max-Age=120; SameSite=Lax`);
			return new Response(null, { status: 302, headers });
		}
		const response = await next();
		const headers = new Headers(response.headers);
		headers.set('Cache-Control', 'private, no-store');
		headers.set('Vary', 'Accept-Language, Cookie');
		return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
	}

	// Traduz as páginas de /en, /es e /pt (no build, para as páginas pré-renderizadas)
	const response = await next();
	const locale = localeFromPath(pathname);
	if (locale === 'pt-BR' || !response.headers.get('content-type')?.includes('text/html')) return response;

	const html = translateHtml(await response.text(), locale);
	const headers = new Headers(response.headers);
	headers.delete('content-length');
	return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
