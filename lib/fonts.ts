/** Dados das fontes gerados a partir de fonts.txt (Google Fonts API). Ver scripts/generate-fonts-from-api.js */
import {
  TITLE_FONT_OPTIONS as TITLE_OPTIONS,
  TEXT_FONT_OPTIONS as TEXT_OPTIONS,
  type FontOption,
} from "./fonts-data.generated";

export type { FontOption };
export const TITLE_FONT_OPTIONS: FontOption[] = TITLE_OPTIONS;
export const TEXT_FONT_OPTIONS: FontOption[] = TEXT_OPTIONS;

/** Lista única para compatibilidade (ex.: Marca) */
export const FONT_OPTIONS = [...TITLE_FONT_OPTIONS];

/** Não precarregamos todas as fontes no layout; o home carrega só as 2 selecionadas via API. */
export const ALL_GOOGLE_FONT_PARAMS: string[] = [];

export const DEFAULT_FONT_TITLE = "'Abril Fatface', display";
export const DEFAULT_FONT_TEXT = "'Open Sans', sans-serif";

const VALUE_TO_GOOGLE = (() => {
  const m = new Map<string, string>();
  for (const f of TITLE_FONT_OPTIONS) m.set(f.value, f.googleFont);
  for (const f of TEXT_FONT_OPTIONS) if (!m.has(f.value)) m.set(f.value, f.googleFont);
  return m;
})();

/** Retorna a URL do Google Fonts CSS para carregar as fontes pelos valores (font-family). */
export function getGoogleFontsCssUrl(fontFamilyValues: string[]): string {
  const params = fontFamilyValues
    .filter((v) => v && VALUE_TO_GOOGLE.has(v))
    .map((v) => VALUE_TO_GOOGLE.get(v)!)
    .filter((p, i, a) => a.indexOf(p) === i);
  if (params.length === 0) return "";
  const query = params.map((p) => `family=${encodeURIComponent(p)}`).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
