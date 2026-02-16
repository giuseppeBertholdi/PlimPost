import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

type ModifyPayload = {
  userId: string;
  originalPost: string;
  originalImage: string;
  modificationRequest: string;
  onboarding: {
    business_name: string;
    business_description: string;
    business_differential: string;
    tone_tags: string[];
    target_audience: string;
    logo_url?: string;
    brand_color_primary?: string;
    brand_color_secondary?: string;
    brand_color_text?: string;
  };
  currentPalette?: {
    name: string;
    colors: string[];
  };
  currentFontTitle?: string;
  currentFontText?: string;
  imageStyle?: string;
  textStyle?: string;
};

const buildModificationPrompt = (
  payload: ModifyPayload,
  originalPost: string
) => {
  const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
  
  return `
Você é um assistente especializado em modificar posts do Instagram. O usuário quer modificar um post que já foi gerado.

POST ORIGINAL GERADO:
"${originalPost}"

SOLICITAÇÃO DE MODIFICAÇÃO DO USUÁRIO:
"${payload.modificationRequest}"

SOBRE A MARCA:
- Nome: ${payload.onboarding.business_name}
- O que faz: ${payload.onboarding.business_description}
- O que a torna especial: ${payload.onboarding.business_differential}
- Tom de voz: ${tones}
- Público-alvo: ${payload.onboarding.target_audience}

INSTRUÇÕES:
1. Mantenha a essência e o contexto do post original
2. Aplique EXATAMENTE a modificação solicitada pelo usuário
3. Se o usuário pedir para mudar fonte, cor, estilo, etc., anote isso mas mantenha o texto
4. Se o usuário pedir para mudar o texto, reescreva mantendo o tom de voz da marca
5. O resultado deve ser um texto de legenda para Instagram (máximo 20-30 palavras)
6. Seja conciso e autêntico
7. Mantenha o português do Brasil

IMPORTANTE: 
- Se a modificação for sobre visual (fonte, cor, estilo), apenas confirme a mudança mas mantenha o texto original
- Se a modificação for sobre o conteúdo do texto, reescreva o texto aplicando a mudança
- Sempre retorne um texto de legenda válido para Instagram

Gere a nova versão do post aplicando a modificação solicitada:
`.trim();
};

const buildImageModificationPrompt = (
  payload: ModifyPayload,
  modifiedPostText: string
) => {
  const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
  const paletteColors = payload.currentPalette?.colors?.join(", ") || "Não informado";
  
  return `
Modifique a imagem do post do Instagram aplicando a seguinte solicitação do usuário:

SOLICITAÇÃO: "${payload.modificationRequest}"

POST ORIGINAL: "${payload.originalPost}"
POST MODIFICADO: "${modifiedPostText}"

SOBRE A MARCA:
- Nome: ${payload.onboarding.business_name}
- Descrição: ${payload.onboarding.business_description}
- Diferencial: ${payload.onboarding.business_differential}
- Tom de voz: ${tones}
- Público-alvo: ${payload.onboarding.target_audience}

PALETA DE CORES: ${paletteColors}
${payload.currentFontTitle ? `FONTE TÍTULO: ${payload.currentFontTitle}` : ''}
${payload.currentFontText ? `FONTE TEXTO: ${payload.currentFontText}` : ''}
${payload.imageStyle ? `ESTILO DE IMAGEM: ${payload.imageStyle}` : ''}

ESPECIFICAÇÕES TÉCNICAS:
- Tamanho: EXATAMENTE 1080x1080 pixels
- Formato: PNG com fundo
- Alta qualidade, pronta para publicação

INSTRUÇÕES:
1. Aplique a modificação solicitada pelo usuário
2. Se for mudança de cor/fonte/estilo, aplique essas mudanças visuais
3. Se for mudança de conteúdo, ajuste a imagem para refletir o novo texto
4. Mantenha a qualidade profissional
5. Use as cores da paleta especificada
6. NÃO mostre códigos de cores ou nomes de fontes na imagem

TEXTO NA IMAGEM:
"${modifiedPostText}"

Gere a imagem modificada conforme a solicitação do usuário.
`.trim();
};

export async function POST(request: Request) {
  // Timeout para imagem (26s - máximo permitido pelo Netlify)
  const imageTimeoutDuration = 26000;
  
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const textModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const imageModel = process.env.OPENAI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || "gpt-image-1";

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    const payload = (await request.json()) as ModifyPayload;

    if (!payload?.userId || !payload?.modificationRequest || !payload?.originalPost) {
      return NextResponse.json(
        { error: "Dados insuficientes para modificar o post." },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase não configurado." },
        { status: 500 }
      );
    }

    // Verificar créditos
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", payload.userId)
      .maybeSingle();

    if (creditsError) {
      return NextResponse.json(
        { error: "Erro ao verificar créditos." },
        { status: 500 }
      );
    }

    const currentCredits = creditsData?.credits ?? 0;

    if (currentCredits < 1) {
      return NextResponse.json(
        {
          error: "Créditos insuficientes. Você precisa de pelo menos 1 crédito para modificar o post.",
          insufficientCredits: true,
        },
        { status: 402 }
      );
    }

    // Usar 1 crédito
    const { data: useCreditsResult, error: useCreditsError } = await supabaseAdmin.rpc(
      "use_user_credits",
      {
        p_user_id: payload.userId,
        p_amount: 1,
        p_description: "Modificação de post via chat",
      }
    );

    if (useCreditsError || !useCreditsResult) {
      return NextResponse.json(
        { error: "Erro ao processar créditos. Tente novamente." },
        { status: 500 }
      );
    }

    // Verificar se a modificação é sobre visual ou conteúdo
    const isVisualModification = 
      payload.modificationRequest.toLowerCase().includes("fonte") ||
      payload.modificationRequest.toLowerCase().includes("cor") ||
      payload.modificationRequest.toLowerCase().includes("cor ") ||
      payload.modificationRequest.toLowerCase().includes("paleta") ||
      payload.modificationRequest.toLowerCase().includes("estilo") ||
      payload.modificationRequest.toLowerCase().includes("visual");

    let modifiedPostText = payload.originalPost;
    let needsImageRegeneration = isVisualModification;

    // Se não for apenas visual, modificar o texto
    if (!isVisualModification) {
      const modificationPrompt = buildModificationPrompt(payload, payload.originalPost);
      
      const textResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: modificationPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.9,
              topP: 0.95,
              maxOutputTokens: 400,
            },
          }),
        }
      );

      if (!textResponse.ok) {
        const errorData = await textResponse.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: errorData?.error?.message || "Erro ao modificar o texto do post.",
          },
          { status: textResponse.status }
        );
      }

      const textData = await textResponse.json();
      modifiedPostText = textData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? payload.originalPost;
      
      // Se o texto mudou, precisa regenerar a imagem
      if (modifiedPostText !== payload.originalPost) {
        needsImageRegeneration = true;
      }
    }

    // Regenerar imagem se necessário
    let modifiedImage = payload.originalImage;
    
    if (needsImageRegeneration) {
      const imagePrompt = buildImageModificationPrompt(payload, modifiedPostText);
      
      // A OpenAI não suporta imagens de inspiração da mesma forma que o Gemini
      // Vamos incluir informações sobre logo no prompt de texto
      let enhancedPrompt = imagePrompt;
      
      const logoUrl = payload.onboarding.logo_url;
      if (logoUrl) {
        enhancedPrompt += "\n\nIMPORTANTE: Inclua o logo da marca na imagem. O logo está disponível em: " + logoUrl;
      }

      // Timeout para imagem
      const imageController = new AbortController();
      const imageTimeout = setTimeout(() => imageController.abort(), imageTimeoutDuration);

      const imageResponse = await fetch(
        `https://api.openai.com/v1/images/generations`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: imageModel,
            prompt: enhancedPrompt,
            size: "1024x1024",
            quality: "high",
            n: 1,
          }),
          signal: imageController.signal,
        }
      ).finally(() => clearTimeout(imageTimeout));

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imageUrlFromApi = imageData?.data?.[0]?.url;
        
        if (imageUrlFromApi) {
          // Baixar a imagem da URL e converter para base64
          const imageDownloadResponse = await fetch(imageUrlFromApi);
          if (imageDownloadResponse.ok) {
            const imageBuffer = await imageDownloadResponse.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            const imageMimeType = 'image/png'; // OpenAI sempre retorna PNG
            
            modifiedImage = `data:${imageMimeType};base64,${imageBase64}`;
            
            // Salvar no Supabase Storage
            try {
              const fileName = `posts/${payload.userId}-${Date.now()}.png`;
              
              const { error: uploadError } = await supabaseAdmin.storage
                .from('posts')
                .upload(fileName, Buffer.from(imageBase64, 'base64'), {
                  contentType: imageMimeType,
                  upsert: false,
                });

              if (!uploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                  .from('posts')
                  .getPublicUrl(fileName);
                modifiedImage = publicUrl;
              }
            } catch (storageError) {
              console.error('Error saving image to storage:', storageError);
            }
          }
        }
      }
    }

    return NextResponse.json({
      post: modifiedPostText,
      image: modifiedImage,
      success: true,
    });
  } catch (error) {
    console.error("Modify post API error:", error);
    
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      return NextResponse.json(
        {
          error: `A geração da imagem demorou mais de ${Math.round(imageTimeoutDuration / 1000)} segundos e foi interrompida. Isso pode acontecer quando: • O modelo está processando uma imagem complexa • A conexão está lenta • O servidor está sobrecarregado Tente: • Simplificar a solicitação • Tentar novamente em alguns instantes`,
          timeout: true,
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro inesperado ao modificar o post.",
      },
      { status: 500 }
    );
  }
}



