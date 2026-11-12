// Idiomas do site. O português do Brasil é o padrão e fica sem prefixo na URL.
export const locales = {
	'pt-BR': { prefix: '', label: 'Português (Brasil)', short: 'BR' },
	en: { prefix: 'en', label: 'English', short: 'EN' },
	es: { prefix: 'es', label: 'Español', short: 'ES' },
	'pt-PT': { prefix: 'pt', label: 'Português (Portugal)', short: 'PT' },
} as const;

export type Locale = keyof typeof locales;

export const defaultLocale: Locale = 'pt-BR';

/** Locales com prefixo (todos menos o padrão), usados para gerar as rotas /en, /es, /pt. */
export const prefixedLocales = (Object.keys(locales) as Locale[]).filter((locale) => locales[locale].prefix);

/** Páginas que existem em todos os idiomas. As demais (termos, privacidade) ficam só em pt-BR. */
export const translatedPaths = ['/', '/contact'];

export function localeFromPath(pathname: string): Locale {
	const first = pathname.split('/')[1] ?? '';
	const match = prefixedLocales.find((locale) => locales[locale].prefix === first);
	return match ?? defaultLocale;
}

/** Remove o prefixo de idioma: /en/contact -> /contact, /en -> / */
export function stripLocale(pathname: string): string {
	const locale = localeFromPath(pathname);
	const prefix = locales[locale].prefix;
	if (!prefix) return pathname || '/';
	const rest = pathname.slice(prefix.length + 1);
	return rest.startsWith('/') ? rest : `/${rest}`;
}

/** Caminho de uma página em outro idioma. Páginas sem tradução levam à home daquele idioma. */
export function localizePath(path: string, locale: Locale): string {
	const [pathname, hash = ''] = path.split('#');
	const base = pathname.replace(/\/$/, '') || '/';
	const prefix = locales[locale].prefix;
	const target = translatedPaths.includes(base) ? base : '/';
	const localized = prefix ? `/${prefix}${target === '/' ? '/' : target}` : target;
	return hash ? `${localized}#${hash}` : localized;
}
