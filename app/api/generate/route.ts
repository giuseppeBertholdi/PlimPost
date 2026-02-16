import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Configurações para Netlify Functions
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 26; // Netlify permite até 26 segundos no plano gratuito

// Limite de tamanho do payload (em bytes) - Netlify tem limite de ~6MB
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB

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

export async function POST(request: Request) {
  try {
    console.log("[generate] Iniciando requisição de geração de post");
    
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const textModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const imageModel = process.env.OPENAI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || "dall-e-3";
    const captionModel = process.env.GEMINI_CAPTION_MODEL || "gemini-2.5-flash";

    if (!geminiApiKey) {
      console.error("[generate] GEMINI_API_KEY não configurada");
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
      console.error("[generate] OPENAI_API_KEY não configurada");
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    // Parse do payload com tratamento de erro e validação de tamanho
    let payload: GeneratePayload;
    try {
      // Verificar tamanho do conteúdo antes de fazer parse
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
        console.error("[generate] Payload muito grande:", contentLength);
        return NextResponse.json(
          { error: "O payload da requisição é muito grande. Reduza o tamanho da imagem de inspiração." },
          { status: 413 }
        );
      }
      
      payload = await request.json() as GeneratePayload;
      console.log("[generate] Payload parseado com sucesso");
      
      // Validar tamanho da imagem de inspiração se existir
      if (payload.inspirationImage && payload.inspirationImage.length > MAX_PAYLOAD_SIZE) {
        console.warn("[generate] Imagem de inspiração muito grande, removendo do payload");
        payload.inspirationImage = undefined;
      }
    } catch (parseError) {
      console.error("[generate] Erro ao fazer parse do JSON:", parseError);
      return NextResponse.json(
        { error: "Erro ao processar os dados da requisição. Verifique se os dados estão no formato correto." },
        { status: 400 }
      );
    }

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

    // Timeout de 15 segundos para a requisição de texto (reduzido para deixar mais tempo para imagem)
    const textController = new AbortController();
    const textTimeout = setTimeout(() => textController.abort(), 15000);

    const textResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${geminiApiKey}`,
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
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("resource exhausted") ||
        errorMessage.includes("limit") ||
        errorData?.error?.code === 429 ||
        errorData?.error?.status === "RESOURCE_EXHAUSTED" ||
        textResponse.status === 429 ||
        textResponse.status === 403;
      
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

    // Usar sempre o modelo de imagem configurado (dall-e-3 por padrão)
    const finalImageModel = imageModel;

    try {
      // A OpenAI não suporta imagens de inspiração da mesma forma que o Gemini
      // Vamos incluir informações sobre logo/imagem de inspiração no prompt de texto
      let enhancedPrompt = imagePrompt;
      
      const logoUrl = (payload.onboarding as Record<string, unknown>)?.logo_url as string | undefined;
      if (logoUrl) {
        enhancedPrompt += "\n\nIMPORTANTE: Inclua o logo da marca na imagem. O logo está disponível em: " + logoUrl;
      }
      
      if (payload.inspirationImage) {
        enhancedPrompt += "\n\nIMPORTANTE: Use esta imagem como referência visual e estilo para criar uma imagem similar, mas única e original.";
      }

      // Timeout de 25s para OpenAI (dentro do limite do Netlify de 26s)
      const imageTimeoutDuration = 25000;
      const imageController = new AbortController();
      const imageTimeout = setTimeout(() => imageController.abort(), imageTimeoutDuration);
      
      console.log(`[generate] Usando modelo OpenAI ${finalImageModel} com timeout de ${imageTimeoutDuration}ms`);

      let imageResponse: Response;
      try {
        const requestBody = {
          model: finalImageModel,
          prompt: enhancedPrompt,
          size: "1024x1024",
          quality: "high",
          n: 1,
        };
        
        console.log(`[generate] Enviando requisição para OpenAI ${finalImageModel}`);
        console.log(`[generate] Tamanho do prompt: ${enhancedPrompt.length} caracteres`);
        
        imageResponse = await fetch(
          `https://api.openai.com/v1/images/generations`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: imageController.signal,
          }
        );
        clearTimeout(imageTimeout);
      } catch (fetchError) {
        clearTimeout(imageTimeout);
        // Verificar se foi abortado por timeout
        if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('aborted'))) {
          console.error(`[generate] Error generating image: AbortError - timeout de ${imageTimeoutDuration}ms atingido`);
          await savePostToDb(payload, postText, null);
          return NextResponse.json({
            post: postText,
            imageError: `A geração da imagem demorou mais de ${Math.round(imageTimeoutDuration / 1000)} segundos e foi interrompida. O modelo ${finalImageModel} pode estar lento. Tente novamente.`,
            timeout: true,
          });
        }
        // Log detalhado do erro
        console.error("[generate] Erro ao fazer fetch da imagem:", {
          name: fetchError instanceof Error ? fetchError.name : 'Unknown',
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          model: finalImageModel,
        });
        // Re-throw outros erros para serem capturados pelo catch externo
        throw fetchError;
      }

      console.log(`[generate] Resposta recebida: ${imageResponse.status} ${imageResponse.statusText}`);
      
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
        
        const errorText = await imageResponse.text().catch(() => '');
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("[generate] Erro ao fazer parse do JSON de erro:", errorText.substring(0, 500));
        }
        
        console.error(`[generate] OpenAI Image API error (${finalImageModel}):`, {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          error: errorData,
        });
        
        const errorMessage = errorData?.error?.message || errorData?.message || `Erro na API da OpenAI: ${imageResponse.status}`;
        
        // Verificar se é erro de quota/limite
        const isQuotaExceeded = 
          errorMessage.includes("quota") || 
          errorMessage.includes("Quota exceeded") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("insufficient_quota") ||
          errorMessage.includes("limit") ||
          imageResponse.status === 429 ||
          imageResponse.status === 403;
        
        // Salvar post (só texto) na galeria mesmo quando a imagem falha
        await savePostToDb(payload, postText, null);
        
        if (isQuotaExceeded) {
          // Try to extract retry time from error message
          const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i) || 
                            errorMessage.match(/retry in ([\d.]+) seconds/i) ||
                            errorMessage.match(/retry after ([\d.]+)s/i);
          const retrySeconds = retryMatch ? parseFloat(retryMatch[1]) : null;
          
          return NextResponse.json({
            post: postText,
            imageError: `⚠️ Limite de requisições da OpenAI atingido. A imagem não pôde ser gerada, mas o texto foi criado com sucesso.${retrySeconds ? ` Tente novamente em ${Math.ceil(retrySeconds)} segundos.` : ' Tente novamente em alguns minutos.'}`,
            quotaExceeded: true,
            retryAfter: retrySeconds,
          });
        }
        
        return NextResponse.json({
          post: postText,
          imageError: "Falha ao gerar a imagem, mas o texto foi gerado com sucesso.",
        });
      }

      const imageData = await imageResponse.json();
      
      console.log(`[generate] Resposta parseada com sucesso. Estrutura:`, {
        hasData: !!imageData?.data,
        dataLength: imageData?.data?.length || 0,
      });
      
      // A OpenAI retorna a imagem como URL no campo data[0].url
      const imageUrlFromApi = imageData?.data?.[0]?.url;
      
      if (!imageUrlFromApi) {
        console.error("[generate] Resposta não contém URL da imagem:", JSON.stringify(imageData, null, 2).substring(0, 1000));
        await savePostToDb(payload, postText, null);
        return NextResponse.json({
          post: postText,
          imageError: "A API retornou uma resposta sem imagem. Tente novamente.",
        });
      }
      
      // Baixar a imagem da URL e converter para base64
      console.log(`[generate] Baixando imagem da URL: ${imageUrlFromApi}`);
      const imageDownloadResponse = await fetch(imageUrlFromApi);
      if (!imageDownloadResponse.ok) {
        throw new Error(`Erro ao baixar imagem: ${imageDownloadResponse.status}`);
      }
      
      const imageBuffer = await imageDownloadResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const imageMimeType = 'image/png'; // OpenAI sempre retorna PNG
      
      console.log(`[generate] Imagem extraída: ${imageBase64.length} caracteres base64, tipo: ${imageMimeType}`);
      
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
      
      // Gerar legenda usando gemini-2.5-flash (opcional, pode pular se demorar muito)
      let caption = postText; // Fallback para o texto original
      
      // Pular geração de legenda se a imagem for muito grande (para evitar timeout)
      const shouldGenerateCaption = imageBase64 && imageBase64.length < 2000000; // ~1.5MB em base64
      
      if (shouldGenerateCaption) {
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

          // Timeout de 10 segundos para a requisição de legenda (reduzido para evitar timeout total)
          const captionController = new AbortController();
          const captionTimeout = setTimeout(() => captionController.abort(), 10000);

          const captionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${captionModel}:generateContent?key=${geminiApiKey}`,
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

      const responseData = { 
        post: caption,
        originalPost: postText, // Manter o texto original também
        image: imageBase64 ? `data:${imageMimeType};base64,${imageBase64}` : null,
        imageUrl: imageUrl,
        palette: payload.palette,
        businessName: payload.onboarding.business_name
      };

      console.log("✅ Post gerado com sucesso:", {
        hasPost: !!responseData.post,
        postLength: responseData.post?.length || 0,
        hasImage: !!(responseData.image || responseData.imageUrl),
        imageType: responseData.image ? 'base64' : responseData.imageUrl ? 'url' : 'none'
      });

      return NextResponse.json(responseData);
    } catch (imageError) {
      console.error("Error generating image:", imageError);
      
      // Verificar se foi abortado por timeout
      if (imageError instanceof Error && (imageError.name === 'AbortError' || imageError.message.includes('aborted'))) {
        await savePostToDb(payload, postText, null);
        return NextResponse.json({
          post: postText,
          imageError: "A geração da imagem demorou muito e foi interrompida. Tente novamente com uma imagem de inspiração menor ou sem imagem de inspiração.",
          timeout: true,
        });
      }
      
      await savePostToDb(payload, postText, null);
      // Se falhar a imagem, retorna pelo menos o texto
      return NextResponse.json({ 
        post: postText,
        imageError: "Falha ao gerar a imagem, mas o texto foi gerado com sucesso."
      });
    }
  } catch (error) {
    console.error("[generate] Erro na API de geração:", error);
    
    // Log detalhado do erro para debug
    if (error instanceof Error) {
      console.error("[generate] Detalhes do erro:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500), // Primeiros 500 chars do stack
      });
    }
    
    // Verificar se foi timeout ou abort
    if (error instanceof Error) {
      // Erros de timeout/abort
      if (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('timeout')) {
        console.error("[generate] Timeout detectado");
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
        console.error("[generate] Timeout do Netlify detectado");
        return NextResponse.json(
          {
            error: "A geração do post demorou muito e foi interrompida pelo servidor. Isso pode acontecer quando a API está lenta. Tente novamente ou simplifique a solicitação.",
            timeout: true,
          },
          { status: 504 }
        );
      }
      
      // Erros de rede ou conexão
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        console.error("[generate] Erro de rede detectado");
        return NextResponse.json(
          {
            error: "Erro de conexão com a API. Verifique sua conexão com a internet e tente novamente.",
            networkError: true,
          },
          { status: 502 }
        );
      }
      
      // Erros de parsing JSON
      if (error.message.includes('JSON') || error.message.includes('parse') || error.name === 'SyntaxError') {
        console.error("[generate] Erro de parsing JSON detectado");
        return NextResponse.json(
          {
            error: "Erro ao processar os dados da requisição. Verifique se os dados estão no formato correto.",
            parseError: true,
          },
          { status: 400 }
        );
      }
    }
    
    // Erro genérico - retornar 502 para erros de gateway/proxy
    console.error("[generate] Erro genérico não tratado, retornando 502");
    return NextResponse.json(
      {
        error: error instanceof Error 
          ? `Erro ao processar a requisição: ${error.message}. Tente novamente.`
          : "Erro inesperado ao gerar o post. O servidor pode estar temporariamente indisponível. Tente novamente em alguns instantes.",
        serverError: true,
      },
      { status: 502 }
    );
  }
}
