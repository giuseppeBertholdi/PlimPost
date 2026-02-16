// Funções compartilhadas para geração de posts
// Estas funções são usadas tanto na API de geração quanto no worker

import { createClient } from "@supabase/supabase-js";

export type OnboardingProfile = {
  business_name: string;
  business_description: string;
  business_differential: string;
  tone_tags: string[];
  target_audience: string;
};

export type GeneratePayload = {
  onboarding: OnboardingProfile;
  objective: string;
  mainTheme: string;
  extraInfo?: string;
  palette?: {
    name?: string;
    colors?: string[];
  };
  fontTitle?: string;
  fontText?: string;
  additionalText?: string;
  imageStyle?: string;
  textStyle?: string;
  userId?: string;
  inspirationImage?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export async function savePostToDb(
  payload: GeneratePayload,
  postText: string,
  imageUrl: string | null
): Promise<void> {
  if (!payload.userId || !supabaseAdmin) {
    if (payload.userId && !supabaseAdmin) {
      console.warn(
        "[generate] Post não salvo na galeria: configure SUPABASE_SERVICE_ROLE_KEY no .env.local"
      );
    }
    return;
  }
  try {
    const { error } = await supabaseAdmin
      .from("generated_posts")
      .insert({
        user_id: payload.userId,
        post_text: postText,
        post_image_url: imageUrl,
        objective: payload.objective,
        main_theme: payload.mainTheme,
        extra_info: payload.extraInfo || null,
        palette_name: payload.palette?.name || null,
        palette_colors: payload.palette?.colors || null,
      });
    if (error) console.error("[generate] Erro ao salvar post na galeria:", error);
  } catch (err) {
    console.error("[generate] Erro ao salvar post:", err);
  }
}

export const buildPrompt = (payload: GeneratePayload) => {
  const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
  const extra = payload.extraInfo?.trim()
    ? payload.extraInfo.trim()
    : "Não informado";
  const paletteName = payload.palette?.name ?? "Personalizada";
  const paletteColors = payload.palette?.colors?.join(", ") ?? "Não informado";

  return `Crie um post autêntico e humano para Instagram.

MARCA: ${payload.onboarding.business_name} | ${payload.onboarding.business_description} | Diferencial: ${payload.onboarding.business_differential} | Tom: ${tones} | Público: ${payload.onboarding.target_audience}

POST: Objetivo: ${payload.objective} | Tema: ${payload.mainTheme}${extra !== "Não informado" ? ` | Extra: ${extra}` : ""}

REGRAS:
- Linguagem natural, como pessoa real falaria
- MÁXIMO 20-30 palavras, extremamente conciso
- Abertura impactante + desenvolvimento direto + CTA curta
- Tom: ${tones}
- Português do Brasil
- Sem hashtags
   - ${extra !== "Não informado" ? "Mencione as informações adicionais de forma MUITO breve (1-2 palavras se possível)" : ""}
   - O texto deve ser visual e direto, não uma conversa longa
   - Priorize impacto visual sobre extensão de texto
   - Lembre-se: a imagem é o foco, o texto é complemento

IMPORTANTE: O post deve soar como se uma pessoa real, que conhece bem a marca e o público, estivesse escrevendo para seus amigos ou seguidores. Evite qualquer coisa que soe robótica, genérica ou excessivamente promocional.

Agora, crie um post autêntico, humano e envolvente que realmente conecte com o público.
`.trim();
};

/** Descrições visuais para o modelo de imagem diferenciar título vs texto */
export const FONT_VISUAL_DESCRIPTIONS: Record<string, { title: string; body: string }> = {
  "Inter, sans-serif": { title: "sans-serif geométrica, limpa, traços retos e modernos, peso bold", body: "Inter regular, menor e legível" },
  "Poppins, sans-serif": { title: "sans-serif arredondada e geométrica, bold, impactante", body: "Poppins regular, tamanho menor" },
  "Roboto, sans-serif": { title: "sans-serif neutra e legível, bold", body: "Roboto regular, tamanho reduzido" },
  "Montserrat, sans-serif": { title: "sans-serif elegante tipo display, bold, letras altas", body: "Montserrat regular, corpo legível" },
  "Raleway, sans-serif": { title: "sans-serif refinada, traços elegantes, bold", body: "Raleway regular, menor" },
  "Open Sans, sans-serif": { title: "sans-serif aberta e amigável, bold", body: "Open Sans regular, muito legível" },
  "'Open Sans', sans-serif": { title: "sans-serif aberta e amigável, bold", body: "Open Sans regular, muito legível" },
  "Lato, sans-serif": { title: "sans-serif quente, semi-rounded, bold", body: "Lato regular, tamanho de leitura" },
  "Nunito, sans-serif": { title: "sans-serif arredondada e suave, bold", body: "Nunito regular, amigável" },
  "Playfair Display, serif": { title: "serifada clássica, alta elegância, bold", body: "serif mais leve ou Open Sans para corpo" },
  "'Playfair Display', serif": { title: "serifada clássica, elegante, bold", body: "fonte legível para corpo" },
  "Oswald, sans-serif": { title: "sans-serif condensada e forte, estilo headline", body: "fonte legível (ex: Open Sans) para corpo" },
  "'Bebas Neue', sans-serif": { title: "sans-serif condensada, maiúsculas, estilo poster", body: "fonte legível para corpo do texto" },
  "Anton, sans-serif": { title: "sans-serif pesada, impacto, estilo cartaz", body: "fonte legível para corpo" },
  "'Archivo Black', sans-serif": { title: "sans-serif black, forte, display", body: "fonte legível para corpo" },
  "Righteous, cursive": { title: "estilo retrô, arredondado, bold", body: "fonte legível para corpo" },
  "'League Spartan', sans-serif": { title: "sans-serif geométrica, forte, moderna", body: "League Spartan regular, menor" },
  "'Barlow Condensed', sans-serif": { title: "sans-serif condensada, bold", body: "fonte legível para corpo" },
  "'Titillium Web', sans-serif": { title: "sans-serif moderna, bold", body: "Titillium regular, legível" },
  "'Alfa Slab One', serif": { title: "serifada slab, impacto, estilo cartaz", body: "fonte legível para corpo" },
  "'Rubik Mono One', monospace": { title: "monoespacada, tech, bold", body: "fonte legível para corpo" },
  "'Passion One', cursive": { title: "estilo display, arredondado, impacto", body: "fonte legível para corpo" },
  "Staatliches, cursive": { title: "estilo display, maiúsculas", body: "fonte legível para corpo" },
  "'Black Ops One', cursive": { title: "estilo militar/tech, bold", body: "fonte legível para corpo" },
  "Lobster, cursive": { title: "script/cursiva, elegante", body: "fonte legível para corpo" },
  "Pacifico, cursive": { title: "script suave, descontraído", body: "fonte legível para corpo" },
  "'Permanent Marker', cursive": { title: "estilo caneta, informal", body: "fonte legível para corpo" },
  "'Abril Fatface', serif": { title: "serifada elegante, alta moda", body: "fonte legível para corpo" },
  "'Fjalla One', sans-serif": { title: "sans-serif condensada, forte", body: "fonte legível para corpo" },
  "Bangers, cursive": { title: "estilo comic, divertido", body: "fonte legível para corpo" },
  "Merriweather, serif": { title: "serifada clássica, bold", body: "Merriweather regular, legível" },
  "'Slabo 27px', serif": { title: "serifada newspaper, bold", body: "fonte legível para corpo" },
  "Caveat, cursive": { title: "script manuscrita", body: "fonte legível para corpo" },
  "'Dancing Script', cursive": { title: "script elegante", body: "fonte legível para corpo" },
  "Source Sans 3, sans-serif": { title: "sans-serif neutra, bold", body: "Source Sans 3 regular, muito legível" },
  "'Source Sans 3', sans-serif": { title: "sans-serif neutra, bold", body: "Source Sans 3 regular, muito legível" },
  "DM Sans, sans-serif": { title: "sans-serif moderna, bold", body: "DM Sans regular, legível" },
  "'DM Sans', sans-serif": { title: "sans-serif moderna, bold", body: "DM Sans regular, legível" },
  "Manrope, sans-serif": { title: "sans-serif geométrica, bold", body: "Manrope regular, legível" },
  "Work Sans, sans-serif": { title: "sans-serif profissional, bold", body: "Work Sans regular, legível" },
  "'Work Sans', sans-serif": { title: "sans-serif profissional, bold", body: "Work Sans regular, legível" },
  "Karla, sans-serif": { title: "sans-serif limpa, bold", body: "Karla regular, legível" },
  "Lora, serif": { title: "serifada editorial, bold", body: "Lora regular, muito legível" },
  "PT Sans, sans-serif": { title: "sans-serif clara, bold", body: "PT Sans regular, legível" },
  "'PT Sans', sans-serif": { title: "sans-serif clara, bold", body: "PT Sans regular, legível" },
  "Mulish, sans-serif": { title: "sans-serif moderna, bold", body: "Mulish regular, legível" },
  "Red Hat Display, sans-serif": { title: "sans-serif técnica, bold", body: "Red Hat Display regular, legível" },
  "'Red Hat Display', sans-serif": { title: "sans-serif técnica, bold", body: "Red Hat Display regular, legível" },
  "Outfit, sans-serif": { title: "sans-serif moderna, bold", body: "Outfit regular, legível" },
  "Figtree, sans-serif": { title: "sans-serif amigável, bold", body: "Figtree regular, legível" },
};

export const buildImagePrompt = (payload: GeneratePayload, postText: string) => {
  const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
  const paletteName = payload.palette?.name ?? "Personalizada";
  const paletteColors = payload.palette?.colors?.join(", ") ?? "#f97316, #fb923c, #0f172a";
  const onboarding = payload.onboarding as Record<string, unknown>;
  const fontTitle: string = (payload.fontTitle ?? onboarding?.brand_font_title ?? onboarding?.brand_font ?? "Montserrat, sans-serif") as string;
  const fontText: string = (payload.fontText ?? onboarding?.brand_font_text ?? onboarding?.brand_font ?? "Open Sans, sans-serif") as string;
  const additionalText = payload.additionalText || "";
  const imageStyle = payload.imageStyle || "moderno";
  const textStyle = payload.textStyle || "padrão";
  const mainTheme = payload.mainTheme || "";
  const extraInfo = payload.extraInfo || "";
  const logoUrl = onboarding?.logo_url as string | undefined;

  const descTitle = FONT_VISUAL_DESCRIPTIONS[fontTitle]?.title ?? `fonte para título: ${fontTitle}, negrito e grande`;
  const descText = FONT_VISUAL_DESCRIPTIONS[fontText]?.body ?? `fonte para corpo: ${fontText}, regular e menor`;

  // Mapear estilos de imagem para descrições
  const imageStyleDescriptions: Record<string, string> = {
    moderno: "Design moderno e contemporâneo, com elementos geométricos sutis e layout limpo",
    minimalista: "Design minimalista com muito espaço em branco, elementos simples e focados",
    colorido: "Design vibrante e colorido, com uso generoso de cores e elementos visuais chamativos",
    elegante: "Design elegante e sofisticado, com tipografia refinada e elementos decorativos discretos",
    divertido: "Design descontraído e divertido, com elementos lúdicos e cores alegres",
    profissional: "Design corporativo e profissional, com layout estruturado e visual sério",
  };

  // Mapear estilos de texto para formatação
  const textStyleDescriptions: Record<string, string> = {
    "padrão": "texto com formatação padrão",
    "negrito": "texto em negrito e destacado",
    "itálico": "texto em itálico e elegante",
    "maiúsculas": "texto em maiúsculas para maior impacto",
    "destaque": "texto com destaque visual, usando cores ou efeitos especiais",
  };

  const fullText = additionalText ? `${postText}\n\n${additionalText}` : postText;
  const imageStyleDesc = imageStyleDescriptions[imageStyle] || imageStyleDescriptions["moderno"];
  const textStyleDesc = textStyleDescriptions[textStyle] || textStyleDescriptions["padrão"];

  // Separar o texto em título e corpo (primeira linha vs resto)
  const lines = fullText.split('\n').filter(l => l.trim());
  const titleText = lines[0] || fullText.split('.')[0] || fullText.substring(0, 50);
  const bodyText = lines.slice(1).join(' ') || fullText.substring(titleText.length).trim();

  return `Crie imagem 1080x1080px para Instagram. 70% visual, 30% texto.

MARCA: ${payload.onboarding.business_name} | ${payload.onboarding.business_description} | Diferencial: ${payload.onboarding.business_differential} | Tom: ${tones}
${logoUrl ? `LOGO: Use a logo fornecida EXATAMENTE como está, sem modificações. Apenas ajuste tamanho mantendo proporções.` : ''}
CORES: ${paletteColors} - Use como base, crie gradientes. NUNCA mostre códigos hex ou swatches.
ESTILO: ${imageStyleDesc}
${mainTheme ? `TEMA: "${mainTheme}" - Represente visualmente.` : ''}${extraInfo ? `EXTRA: "${extraInfo}" - Inclua na imagem.` : ''}
${payload.inspirationImage ? `INSPIRAÇÃO: Use a imagem fornecida como referência de composição e estilo.` : ''}
TEXTO: TÍTULO "${titleText}" (${descTitle}, grande, 3-5 palavras, ${textStyleDesc})${bodyText ? ` | CORPO "${bodyText}" (${descText}, pequeno, 1 linha)` : ''}
REGRAS: 70% elementos visuais (formas, gradientes, padrões, ícones) + 30% texto. Fundo rico visualmente. NUNCA mencione nomes de fontes ou códigos de cores na imagem. Apenas USE visualmente.
PROIBIDO: Nomes de fontes, códigos hex, swatches, informações técnicas, sites/URLs/perfis inventados.
QUALIDADE: 1080x1080px, alta qualidade, PNG, pronto para publicação.
`.trim();
};

