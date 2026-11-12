import type { Locale } from './config';

/** Cookie com o idioma escolhido pela pessoa (seletor ou faixa de sugestão). */
export const CHOICE_COOKIE = 'respy_lang';
/** Cookie curto gravado quando a home redireciona sozinha, para mostrar a opção de voltar. */
export const AUTO_COOKIE = 'respy_auto';

/**
 * Escolhe o idioma do site a partir dos idiomas do navegador, na ordem de preferência.
 * Retorna null quando nenhum idioma do navegador é atendido pelo site.
 * Português sem região usa o país como desempate (Portugal -> pt-PT, resto -> pt-BR).
 */
export function pickLocale(languages: readonly string[], country?: string | null): Locale | null {
	for (const raw of languages) {
		const tag = raw.trim().toLowerCase();
		if (!tag) continue;
		if (tag.startsWith('en')) return 'en';
		if (tag.startsWith('es')) return 'es';
		if (tag === 'pt-pt') return 'pt-PT';
		if (tag.startsWith('pt-')) return 'pt-BR';
		if (tag === 'pt') return country?.toUpperCase() === 'PT' ? 'pt-PT' : 'pt-BR';
	}
	return null;
}

/** Lê o cabeçalho Accept-Language em ordem de prioridade (q). */
export function parseAcceptLanguage(header: string | null): string[] {
	if (!header) return [];
	return header
		.split(',')
		.map((part, index) => {
			const [tag, ...params] = part.trim().split(';');
			const q = Number(params.find((p) => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
			return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, index };
		})
		.filter((item) => item.tag && item.tag !== '*' && item.q > 0)
		.sort((a, b) => b.q - a.q || a.index - b.index)
		.map((item) => item.tag);
}
