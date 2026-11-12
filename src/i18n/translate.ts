// Tradução do HTML já renderizado. Os componentes continuam escritos em pt-BR (vindos do Framer);
// para /en, /es e /pt os textos são trocados aqui usando os dicionários {texto pt-BR: tradução}.
import en from './en.json';
import es from './es.json';
import ptPT from './pt-PT.json';
import { locales, translatedPaths, type Locale } from './config';

const dictionaries: Record<Exclude<Locale, 'pt-BR'>, Record<string, string>> = {
	en,
	es,
	'pt-PT': ptPT,
};

const decode = (text: string) =>
	text
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&#x27;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');

const encodeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const encodeAttr = (text: string) => encodeText(text).replace(/"/g, '&quot;');

const TRANSLATABLE_ATTRS = /(\s(?:placeholder|aria-label|alt|title|content)=")([^"]*)(")/g;

function translateMarkup(markup: string, dict: Record<string, string>, prefix: string): string {
	// Textos entre tags, preservando os espaços das pontas
	let out = markup.replace(/>([^<>]+)</g, (match, raw: string) => {
		const text = decode(raw);
		const trimmed = text.trim();
		const translated = trimmed && dict[trimmed];
		if (!translated) return match;
		const lead = text.slice(0, text.indexOf(trimmed));
		const tail = text.slice(text.indexOf(trimmed) + trimmed.length);
		return `>${encodeText(lead + translated + tail)}<`;
	});

	// Atributos visíveis ou lidos por leitores de tela e buscadores
	out = out.replace(TRANSLATABLE_ATTRS, (match, start: string, raw: string, end: string) => {
		const translated = dict[decode(raw).trim()];
		return translated ? `${start}${encodeAttr(translated)}${end}` : match;
	});

	// Links internos das páginas traduzidas passam a apontar para o mesmo idioma.
	// Links com hreflang (seletor de idioma e alternates) já apontam para o idioma certo.
	out = out.replace(/<(?:a|link)\b[^>]*>/g, (tag) => {
		if (/\shreflang=/.test(tag)) return tag;
		return tag.replace(/href="(\/[^"]*)"/, (match, href: string) => {
			const [pathname, hash] = href.split('#');
			const base = pathname.replace(/\/$/, '') || '/';
			if (!translatedPaths.includes(base)) return match;
			const localized = `/${prefix}${base === '/' ? '/' : base}`;
			return `href="${hash !== undefined ? `${localized}#${hash}` : localized}"`;
		});
	});

	return out;
}

export function translateHtml(html: string, locale: Locale): string {
	if (locale === 'pt-BR') return html;
	const dict = dictionaries[locale];
	const prefix = locales[locale].prefix;

	// Não mexe em <script> e <style>
	const parts = html.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/i);
	const translated = parts
		.map((part) => (/^<(script|style)\b/i.test(part) ? part : translateMarkup(part, dict, prefix)))
		.join('');

	return translated.replace(/<html lang="[^"]*"/, `<html lang="${locale}"`);
}
