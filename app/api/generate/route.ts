import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Cliente com service role key para operações server-side
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

type OnboardingProfile = {
  business_name: string;
  business_description: string;
  business_differential: string;
  tone_tags: string[];
  target_audience: string;
};

type GeneratePayload = {
  onboarding: OnboardingProfile;
  objective: string;
  mainTheme: string;
  extraInfo?: string;
  palette?: {
    name?: string;
    colors?: string[];
  };
  /** Fonte para títulos / frase de destaque na imagem */
  fontTitle?: string;
  /** Fonte para o corpo do texto na imagem */
  fontText?: string;
  /** Texto adicional para aparecer na imagem */
  additionalText?: string;
  /** Estilo visual da imagem (moderno, minimalista, colorido, etc.) */
  imageStyle?: string;
  /** Estilo do texto (padrão, negrito, itálico, etc.) */
  textStyle?: string;
  userId?: string;
  /** Imagem de inspiração em base64 (data:image/...) */
  inspirationImage?: string;
};

/** Salva o post na tabela generated_posts quando há userId e supabaseAdmin configurado. */
async function savePostToDb(
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

const buildPrompt = (payload: GeneratePayload) => {
  const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
  const extra = payload.extraInfo?.trim()
    ? payload.extraInfo.trim()
    : "Não informado";
  const paletteName = payload.palette?.name ?? "Personalizada";
  const paletteColors = payload.palette?.colors?.join(", ") ?? "Não informado";

  return `
Você é um redator especialista em social media com talento para criar conteúdo autêntico, humano e envolvente. Seu objetivo é criar posts que soem como se fossem escritos por uma pessoa real, não por uma máquina.

SOBRE A MARCA:
- Nome: ${payload.onboarding.business_name}
- O que faz: ${payload.onboarding.business_description}
- O que a torna especial: ${payload.onboarding.business_differential}
- Tom de voz: ${tones}
- Público-alvo: ${payload.onboarding.target_audience}

SOBRE ESTE POST:
- Objetivo: ${payload.objective}
- Tema principal: ${payload.mainTheme}
${extra !== "Não informado" ? `- Informações adicionais: ${extra}` : ""}

DIRETRIZES PARA UM POST AUTÊNTICO E HUMANO:

1. LINGUAGEM NATURAL:
   - Escreva como uma pessoa real falaria, não como um robô
   - Use contrações quando fizer sentido (ex: "você está" pode virar "você tá" se o tom permitir)
   - Varie o tamanho das frases para criar ritmo
   - Evite jargões corporativos e palavras muito formais

2. CONEXÃO EMOCIONAL:
   - Comece criando uma conexão com o leitor
   - Use perguntas retóricas quando apropriado
   - Mostre empatia e compreensão do público
   - Seja genuíno e autêntico

3. ESTRUTURA CONCISA:
   - Abertura: Uma frase curta e impactante que captura atenção (máximo 1 linha)
   - Desenvolvimento: 1-2 frases que desenvolvem o tema de forma direta e natural
   - Destaque do diferencial: Integre o diferencial da marca de forma sutil em uma frase
   - CTA: Uma chamada para ação curta e direta (máximo 1 linha)

4. PERSONALIDADE:
   - Adapte o tom exatamente ao perfil indicado (${tones})
   - Se for "Amigável": use linguagem calorosa e acessível
   - Se for "Profissional": mantenha credibilidade mas seja humano
   - Se for "Divertido": permita-se ser leve e descontraído
   - Se for "Inspirador": use linguagem motivacional mas genuína

5. TÉCNICAS DE ESCRITA:
   - Use quebras de linha estratégicas para facilitar leitura
   - Crie ênfase com emojis sutis (máximo 2-3, apenas se fizer sentido)
   - Varie entre frases curtas e médias
   - Evite listas numeradas ou bullet points (a menos que seja essencial)

6. ESPECIFICAÇÕES:
   - Português do Brasil
   - MÁXIMO 20-30 palavras (seja EXTREMAMENTE conciso)
   - Foco em impacto visual, não em texto longo
   - Apenas uma frase impactante ou duas frases muito curtas
   - Sem hashtags no corpo do texto
   - ${extra !== "Não informado" ? "Mencione as informações adicionais de forma MUITO breve (1-2 palavras se possível)" : ""}
   - O texto deve ser visual e direto, não uma conversa longa
   - Priorize impacto visual sobre extensão de texto
   - Lembre-se: a imagem é o foco, o texto é complemento

IMPORTANTE: O post deve soar como se uma pessoa real, que conhece bem a marca e o público, estivesse escrevendo para seus amigos ou seguidores. Evite qualquer coisa que soe robótica, genérica ou excessivamente promocional.

Agora, crie um post autêntico, humano e envolvente que realmente conecte com o público.
`.trim();
};

/** Descrições visuais para o modelo de imagem diferenciar título vs texto */
const FONT_VISUAL_DESCRIPTIONS: Record<string, { title: string; body: string }> = {
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

const buildImagePrompt = (payload: GeneratePayload, postText: string) => {
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

  return `
Crie uma imagem VISUALMENTE IMPACTANTE e PROFISSIONAL para post do Instagram. A IMAGEM É O FOCO PRINCIPAL, o texto é apenas complemento.

ESPECIFICAÇÕES TÉCNICAS OBRIGATÓRIAS:
- Tamanho: EXATAMENTE 1080x1080 pixels (formato quadrado 1:1)
- Resolução: ALTA QUALIDADE, nítida e clara
- Formato: PNG com fundo
- Qualidade: pronta para publicação profissional
- NÃO inclua swatches de cores, códigos hexadecimais ou paletas visíveis na imagem
- NÃO mostre códigos de cores no topo ou em qualquer lugar da imagem
- NÃO inclua nomes de fontes na imagem (como "Open Sans", "Montserrat", etc.)
- NÃO mencione ou mostre informações técnicas sobre fontes ou tipografia na imagem
- APENAS USE as fontes e cores, mas NUNCA as mencione textualmente na imagem

SOBRE A MARCA:
- Nome: ${payload.onboarding.business_name}
- Descrição: ${payload.onboarding.business_description}
- Diferencial: ${payload.onboarding.business_differential}
- Tom de voz: ${tones}
${logoUrl ? `
LOGO DA MARCA (CRÍTICO - SIGA EXATAMENTE):
Uma logo da marca foi fornecida como imagem de referência. REGRAS ABSOLUTAS E OBRIGATÓRIAS:
- Use a logo EXATAMENTE como está na imagem fornecida, SEM NENHUMA MODIFICAÇÃO
- NÃO redesenhe, NÃO adapte, NÃO modifique a logo de forma alguma
- NÃO altere cores, formas, proporções ou qualquer elemento da logo
- NÃO adicione efeitos, sombras, bordas ou transformações à logo
- NÃO recrie ou reinterprete a logo
- Use a logo ORIGINAL e IDÊNTICA, pixel a pixel, como aparece na imagem fornecida
- A logo deve aparecer na imagem gerada EXATAMENTE como está no arquivo original
- Se a logo tiver fundo transparente, mantenha o fundo transparente
- Se a logo tiver cores específicas, mantenha essas cores exatas
- A única coisa permitida é ajustar o TAMANHO/ESCALA da logo para caber harmoniosamente no design, mas SEMPRE mantendo todas as proporções, cores e elementos originais intactos
- Copie a logo da imagem fornecida e coloque na imagem gerada, mantendo-a idêntica

IMPORTANTE: A logo é um elemento sagrado da identidade visual da marca. Ela DEVE aparecer na imagem gerada EXATAMENTE como foi fornecida, sem qualquer alteração visual, de cor, forma, estilo ou elemento. Use a logo da imagem de referência como modelo e replique-a identicamente na imagem gerada.

` : ''}
PALETA DE CORES: ${paletteName}
Cores principais: ${paletteColors}
Use essas cores como base, crie variações e gradientes harmoniosos. 
REGRA CRÍTICA: APENAS USE AS CORES NA IMAGEM, MAS NUNCA MOSTRE:
- Códigos hexadecimais (#f97316, etc.)
- Swatches ou paletas de cores
- Nomes de cores
- Qualquer referência textual às cores

ESTILO VISUAL: ${imageStyleDesc}

INSTRUÇÕES ESPECÍFICAS DO USUÁRIO (SIGA EXATAMENTE):
${mainTheme ? `TEMA CENTRAL DO POST:
"${mainTheme}"

IMPORTANTE: A imagem DEVE representar visualmente este tema. Se o usuário mencionou pessoas, adicione pessoas. Se mencionou produtos, mostre produtos. Se mencionou um estilo específico, aplique esse estilo. Siga EXATAMENTE o que foi solicitado.

` : ''}${extraInfo ? `INFORMAÇÕES ADICIONAIS IMPORTANTES:
"${extraInfo}"

IMPORTANTE: Estas informações são CRÍTICAS e DEVEM ser representadas na imagem quando aplicável. Se mencionar preços, promoções, detalhes específicos, elementos visuais específicos, etc., INCLUA na imagem.

` : ''}

${payload.inspirationImage ? `IMAGEM DE INSPIRAÇÃO:
Uma imagem de exemplo foi fornecida como referência. Use esta imagem como inspiração para:
- Composição e layout similar
- Estilo visual e estética
- Elementos gráficos e disposição
- Tom e atmosfera geral
Adapte e personalize para a marca e conteúdo específico deste post, mantendo a essência visual da imagem de inspiração mas aplicando as cores, fontes e elementos da marca.

` : ''}TEXTO NA IMAGEM (MÍNIMO POSSÍVEL):
TÍTULO PRINCIPAL (máximo 3-5 palavras, grande e destacado):
"${titleText}"

${bodyText ? `TEXTO SECUNDÁRIO (máximo 1 linha, pequeno e discreto):
"${bodyText}"` : ''}

REGRAS CRÍTICAS DE DESIGN VISUAL:

1. PRIORIDADE: ELEMENTOS VISUAIS > TEXTO
   - A imagem deve ser 70% visual e 30% texto
   - Use elementos gráficos, formas, ícones, ilustrações que representem o negócio
   - O texto deve ocupar NO MÁXIMO 30% da imagem
   - Espaço em branco generoso ao redor do texto

2. COMPOSIÇÃO VISUAL FORTE:
   - Layout com elementos visuais em destaque (formas, gradientes, padrões, ilustrações)
   - Hierarquia: Elementos visuais > Título > Texto secundário
   - Use elementos gráficos que representem o tipo de negócio (ex: comida = ícones de comida, tecnologia = formas geométricas modernas)
   - Fundo rico visualmente, não apenas cor sólida

3. TIPOGRAFIA (TEXTO MÍNIMO):
   - TÍTULO: ${descTitle}. Tamanho GRANDE mas não dominante. Máximo 3-5 palavras. Estilo: ${textStyleDesc}
   - TEXTO SECUNDÁRIO: ${descText}. Tamanho PEQUENO e discreto. Máximo 1 linha ou omita se não couber bem.
   - O texto NÃO deve dominar a imagem - é complemento visual
   - PROIBIDO: NÃO inclua nomes de fontes na imagem (ex: "Open Sans", "Montserrat", etc.)
   - PROIBIDO: NÃO mencione informações sobre tipografia ou fontes na imagem
   - APENAS USE a fonte visualmente, mas NUNCA a mencione textualmente

4. CORES E ELEMENTOS VISUAIS:
   - Use a paleta fornecida criando gradientes, formas coloridas, padrões
   - Adicione elementos gráficos: formas geométricas, linhas, padrões, ícones, ilustrações sutis
   - Fundo visualmente interessante, não apenas cor plana
   - Elementos que representem o negócio de forma visual

5. ESTILO: ${imageStyleDesc}
   - Aplique consistentemente este estilo em todos os elementos
   - Visual atraente que chame atenção no feed
   - Profissional mas acessível
   - Alinhado com tom: ${tones}

6. QUALIDADE FINAL:
   - Imagem COMPLETA e FINALIZADA
   - ALTA QUALIDADE visual
   - Texto legível mas NÃO dominante
   - Balance: 70% visual / 30% texto

PROIBIÇÕES ABSOLUTAS NA IMAGEM:
- NUNCA inclua nomes de fontes (ex: "Open Sans", "Montserrat", "Roboto", etc.)
- NUNCA mostre códigos de cores (ex: #f97316, #ff0000, etc.)
- NUNCA mostre swatches, paletas ou referências a cores
- NUNCA mencione informações técnicas sobre tipografia ou design
- NUNCA inclua sites, URLs ou endereços web fictícios ou inventados
- NUNCA inclua menções (@) ou perfis de redes sociais inventados
- NUNCA crie informações de contato falsas (emails, telefones, etc.)
- NUNCA adicione elementos fictícios que não foram explicitamente solicitados pelo usuário
- A imagem deve conter APENAS o conteúdo visual do post, sem metadados ou informações técnicas
- APENAS inclua sites, @, URLs ou informações de contato se o usuário EXPLICITAMENTE solicitar no tema central ou informações adicionais

IMPORTANTE: Siga EXATAMENTE estas regras. A imagem deve ser PRIMARIAMENTE VISUAL. O texto é complemento, não o foco. Use elementos gráficos, formas, padrões, gradientes. Gere com EXATAMENTE 1080x1080 pixels, alta qualidade. A imagem final deve ser limpa, profissional e pronta para publicação, SEM qualquer referência a fontes, cores ou elementos técnicos. NÃO invente informações de contato, sites ou perfis - apenas use se o usuário pedir explicitamente.
`.trim();
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const textModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash";
    const captionModel = process.env.GEMINI_CAPTION_MODEL || "gemini-2.5-flash";

    if (!apiKey) {
      console.error("GEMINI_API_KEY não configurada");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    const payload = (await request.json()) as GeneratePayload;

    if (!payload?.onboarding || !payload?.mainTheme || !payload?.objective) {
      return NextResponse.json(
        { error: "Dados insuficientes para gerar o post." },
        { status: 400 }
      );
    }

    // Verificar e usar créditos
    if (!payload.userId || !supabaseAdmin) {
      return NextResponse.json(
        { error: "Usuário não identificado ou Supabase não configurado." },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem créditos suficientes
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", payload.userId)
      .maybeSingle();

    if (creditsError) {
      console.error("Erro ao verificar créditos:", creditsError);
      return NextResponse.json(
        { error: "Erro ao verificar créditos." },
        { status: 500 }
      );
    }

    const currentCredits = creditsData?.credits ?? 0;

    if (currentCredits < 1) {
      return NextResponse.json(
        {
          error: "Créditos insuficientes. Você precisa de pelo menos 1 crédito para gerar um post.",
          insufficientCredits: true,
        },
        { status: 402 }
      );
    }

    // Usar 1 crédito usando a função do banco
    const { data: useCreditsResult, error: useCreditsError } = await supabaseAdmin.rpc(
      "use_user_credits",
      {
        p_user_id: payload.userId,
        p_amount: 1,
        p_description: "Geração de post",
      }
    );

    if (useCreditsError || !useCreditsResult) {
      console.error("Erro ao usar créditos:", useCreditsError);
      return NextResponse.json(
        { error: "Erro ao processar créditos. Tente novamente." },
        { status: 500 }
      );
    }

    // Primeiro, gerar o texto do post
    const prompt = buildPrompt(payload);

    // Timeout de 18 segundos para a requisição de texto (Netlify tem timeout de 10s, mas com edge functions pode ser maior)
    const textController = new AbortController();
    const textTimeout = setTimeout(() => textController.abort(), 18000);

    const textResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 400,
          },
        }),
        signal: textController.signal,
      }
    ).finally(() => clearTimeout(textTimeout));

    if (!textResponse.ok) {
      // Verificar se foi timeout
      if (textResponse.status === 0 || textResponse.type === 'error') {
        return NextResponse.json(
          {
            error: "Timeout ao gerar o texto do post. A requisição demorou muito para responder. Tente novamente.",
            timeout: true,
          },
          { status: 504 }
        );
      }
      
      const errorData = await textResponse.json().catch(() => ({}));
      console.error("Gemini API error:", textResponse.status, errorData);
      
      const errorMessage = errorData?.error?.message || `Erro na API do Gemini: ${textResponse.status}`;
      
      // Check if it's a quota exceeded error
      const isQuotaExceeded = 
        errorMessage.includes("quota") || 
        errorMessage.includes("Quota exceeded") ||
        errorMessage.includes("rate limit") ||
        textResponse.status === 429;
      
      if (isQuotaExceeded) {
        // Try to extract retry time from error message
        const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i) || 
                          errorMessage.match(/retry in ([\d.]+) seconds/i);
        const retrySeconds = retryMatch ? parseFloat(retryMatch[1]) : null;
        
        return NextResponse.json(
          {
            error: "Limite de requisições excedido. Por favor, tente novamente em alguns instantes.",
            quotaExceeded: true,
            retryAfter: retrySeconds,
            details: "Você atingiu o limite de requisições da sua conta. Verifique seu plano e detalhes de cobrança em https://ai.google.dev/gemini-api/docs/rate-limits",
          },
          { 
            status: 429,
            headers: {
              'Retry-After': retrySeconds ? Math.ceil(retrySeconds).toString() : '60',
            }
          }
        );
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: textResponse.status }
      );
    }

    const textData = await textResponse.json();
    const postText =
      textData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!postText) {
      console.error("Resposta vazia do Gemini:", textData);
      return NextResponse.json(
        { error: "Falha ao gerar o post. Resposta vazia." },
        { status: 500 }
      );
    }

    // Agora, gerar a imagem do post usando o modelo de imagem
    const imagePrompt = buildImagePrompt(payload, postText);

    // Usar gemini-3-pro-image-preview se houver imagem de inspiração ou logo
    const hasLogo = !!(payload.onboarding as Record<string, unknown>)?.logo_url;
    const finalImageModel = (payload.inspirationImage || hasLogo)
      ? "gemini-3-pro-image-preview" 
      : imageModel;

    try {
      // Preparar as partes da requisição
      const parts: any[] = [{ text: imagePrompt }];
      
      // Se houver logo, buscar e adicionar às partes
      const logoUrl = (payload.onboarding as Record<string, unknown>)?.logo_url as string | undefined;
      if (logoUrl) {
        try {
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const logoBase64 = Buffer.from(logoBuffer).toString('base64');
            const contentType = logoResponse.headers.get('content-type') || 'image/png';
            parts.push({
              inlineData: {
                mimeType: contentType,
                data: logoBase64,
              },
            });
          }
        } catch (logoError) {
          console.warn("Erro ao buscar logo:", logoError);
        }
      }
      
      // Se houver imagem de inspiração, adicionar ela às partes
      if (payload.inspirationImage) {
        // Extrair base64 e mimeType do data URL
        const match = payload.inspirationImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const [, mimeType, base64Data] = match;
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          });
        }
      }

      // Timeout de 18 segundos para a requisição de imagem
      const imageController = new AbortController();
      const imageTimeout = setTimeout(() => imageController.abort(), 18000);

      const imageResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${finalImageModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: parts,
              },
            ],
            generationConfig: {
              temperature: 0.85,
              topP: 0.95,
            },
          }),
          signal: imageController.signal,
        }
      ).finally(() => clearTimeout(imageTimeout));

      if (!imageResponse.ok) {
        // Verificar se foi timeout
        if (imageResponse.status === 0 || imageResponse.type === 'error') {
          // Salvar post (só texto) na galeria mesmo quando a imagem falha por timeout
          await savePostToDb(payload, postText, null);
          return NextResponse.json({
            post: postText,
            imageError: "Timeout ao gerar a imagem, mas o texto foi gerado com sucesso. Tente gerar novamente para obter a imagem.",
            timeout: true,
          });
        }
        
        const errorData = await imageResponse.json().catch(() => ({}));
        console.error("Gemini Image API error:", imageResponse.status, errorData);
        // Salvar post (só texto) na galeria mesmo quando a imagem falha
        await savePostToDb(payload, postText, null);
        return NextResponse.json({
          post: postText,
          imageError: "Falha ao gerar a imagem, mas o texto foi gerado com sucesso.",
        });
      }

      const imageData = await imageResponse.json();
      
      // O Gemini retorna a imagem em base64 no campo inlineData
      const imagePart = imageData?.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData
      );
      const imageBase64 = imagePart?.inlineData?.data;
      const imageMimeType = imagePart?.inlineData?.mimeType || 'image/png';
      
      let imageUrl: string | null = null;
      
      // Salvar imagem no Supabase Storage se houver userId
      if (imageBase64 && payload.userId && supabaseAdmin) {
        try {
          // Converter base64 para buffer
          const imageBuffer = Buffer.from(imageBase64, 'base64');
          const fileName = `posts/${payload.userId}-${Date.now()}.png`;
          
          const { error: uploadError } = await supabaseAdmin.storage
            .from('posts')
            .upload(fileName, imageBuffer, {
              contentType: imageMimeType,
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('posts')
              .getPublicUrl(fileName);
            imageUrl = publicUrl;
          } else {
            console.error('Error uploading image to storage:', uploadError);
          }
        } catch (storageError) {
          console.error('Error saving image to storage:', storageError);
        }
      }
      
      // Gerar legenda usando gemini-2.5-flash com a imagem gerada
      let caption = postText; // Fallback para o texto original
      
      if (imageBase64) {
        try {
          const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
          const captionPrompt = `
Você é um especialista em criar legendas para posts do Instagram. Crie uma legenda autêntica, envolvente e que gere engajamento.

SOBRE A MARCA:
- Nome: ${payload.onboarding.business_name}
- Descrição: ${payload.onboarding.business_description}
- Diferencial: ${payload.onboarding.business_differential}
- Tom de voz: ${tones}
- Público-alvo: ${payload.onboarding.target_audience}

SOBRE O POST:
- Objetivo: ${payload.objective}
- Tema principal: ${payload.mainTheme}
${payload.extraInfo ? `- Informações adicionais: ${payload.extraInfo}` : ''}

TEXTO GERADO PARA A IMAGEM:
${postText}

DIRETRIZES PARA A LEGENDA:
1. Seja autêntico e humano, como se uma pessoa real estivesse escrevendo
2. Crie conexão emocional com o público
3. Use o tom de voz: ${tones}
4. Adapte ao objetivo: ${payload.objective}
5. Seja envolvente e completo (mínimo 50 palavras, idealmente 80-150 palavras)
6. Use quebras de linha estratégicas para facilitar a leitura
7. Pode incluir 2-4 emojis relevantes se fizer sentido com o tom
8. NÃO inclua hashtags (serão adicionadas depois se necessário)
9. Português do Brasil
10. A legenda deve complementar a imagem, expandindo o tema e criando contexto
11. Seja específico e detalhado - não seja genérico ou vago
12. Inclua uma chamada para ação (CTA) quando apropriado
13. Crie uma narrativa que envolva o leitor

PROIBIÇÕES ABSOLUTAS NA LEGENDA:
- NUNCA inclua sites, URLs ou endereços web fictícios ou inventados
- NUNCA inclua menções (@) ou perfis de redes sociais inventados
- NUNCA crie informações de contato falsas (emails, telefones, etc.)
- NUNCA adicione elementos fictícios que não foram explicitamente solicitados pelo usuário
- APENAS inclua sites, @, URLs ou informações de contato se o usuário EXPLICITAMENTE mencionar no tema central ou informações adicionais

IMPORTANTE: Gere uma legenda COMPLETA e DESENVOLVIDA. Não seja breve demais. A legenda deve ter substância e valor para o leitor. NÃO invente informações de contato, sites ou perfis - apenas use se o usuário pedir explicitamente.

Crie uma legenda autêntica, envolvente e completa para este post do Instagram.
`.trim();

          // Timeout de 15 segundos para a requisição de legenda
          const captionController = new AbortController();
          const captionTimeout = setTimeout(() => captionController.abort(), 15000);

          const captionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${captionModel}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      { text: captionPrompt },
                      {
                        inlineData: {
                          mimeType: imageMimeType,
                          data: imageBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.8,
                  topP: 0.95,
                  maxOutputTokens: 5000,
                },
              }),
              signal: captionController.signal,
            }
          ).finally(() => clearTimeout(captionTimeout));

          if (captionResponse.ok) {
            const captionData = await captionResponse.json();
            const generatedCaption = captionData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (generatedCaption) {
              caption = generatedCaption;
            }
          } else {
            console.warn("Falha ao gerar legenda, usando texto original");
          }
        } catch (captionError) {
          console.warn("Erro ao gerar legenda:", captionError);
          // Continua com o texto original como fallback
        }
      }
      
      await savePostToDb(payload, caption, imageUrl);

      return NextResponse.json({ 
        post: caption,
        originalPost: postText, // Manter o texto original também
        image: imageBase64 ? `data:${imageMimeType};base64,${imageBase64}` : null,
        imageUrl: imageUrl,
        palette: payload.palette,
        businessName: payload.onboarding.business_name
      });
    } catch (imageError) {
      console.error("Error generating image:", imageError);
      await savePostToDb(payload, postText, null);
      // Se falhar a imagem, retorna pelo menos o texto
      return NextResponse.json({ 
        post: postText,
        imageError: "Falha ao gerar a imagem, mas o texto foi gerado com sucesso."
      });
    }
  } catch (error) {
    console.error("Generate API error:", error);
    
    // Verificar se foi timeout ou abort
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: "A requisição demorou muito para ser processada. O servidor tem um limite de tempo. Tente novamente com uma imagem mais simples ou sem imagem de inspiração.",
            timeout: true,
          },
          { status: 504 }
        );
      }
      
      // Verificar se é um erro de timeout do Netlify
      if (error.message.includes('Inactivity Timeout') || error.message.includes('504')) {
        return NextResponse.json(
          {
            error: "A geração do post demorou muito e foi interrompida pelo servidor. Isso pode acontecer quando a API está lenta. Tente novamente ou simplifique a solicitação.",
            timeout: true,
          },
          { status: 504 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao gerar o post.",
      },
      { status: 500 }
    );
  }
}
