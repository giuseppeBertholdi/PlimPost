// Lógica para processar um job de geração
// Esta função processa um job completo: texto, imagem e legenda

import { supabaseAdmin, savePostToDb, buildPrompt, buildImagePrompt, GeneratePayload } from "./generation-utils";

export async function processJob(jobId: string, payload: GeneratePayload) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const textModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const imageModel = process.env.OPENAI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || "gpt-image-1";
  const captionModel = process.env.GEMINI_CAPTION_MODEL || "gemini-2.5-flash";

  if (!geminiApiKey || !openaiApiKey || !supabaseAdmin) {
    // Atualizar status para failed antes de lançar erro
    if (supabaseAdmin) {
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "failed",
          error_message: "APIs não configuradas",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
    throw new Error("APIs não configuradas");
  }

  // Verificar se o job já está sendo processado por outro worker
  const { data: existingJob } = await supabaseAdmin
    .from("generation_jobs")
    .select("status")
    .eq("id", jobId)
    .single();

  // Se já está em processing, pode ser que outro worker já esteja processando
  // ou que este worker já tenha marcado como processing antes
  if (existingJob?.status === "completed" || existingJob?.status === "failed") {
    throw new Error(`Job já foi processado. Status: ${existingJob?.status}`);
  }

  // Se ainda não está em processing, atualizar (pode já estar se foi chamado pelo endpoint)
  if (existingJob?.status === "pending") {
    await supabaseAdmin
      .from("generation_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  // Timeout de 4 minutos para o processamento completo
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Timeout: Processamento demorou mais de 4 minutos"));
    }, 240000); // 4 minutos
  });

  try {
    // Executar processamento com timeout
    const result = await Promise.race([
      processJobInternal(jobId, payload, geminiApiKey, openaiApiKey, textModel, imageModel, captionModel),
      timeoutPromise,
    ]) as any;
    return result;
  } catch (error) {
    // Garantir que o status seja atualizado mesmo em caso de erro
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao processar job";
    await supabaseAdmin
      .from("generation_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    throw error;
  }
}

async function processJobInternal(
  jobId: string,
  payload: GeneratePayload,
  geminiApiKey: string,
  openaiApiKey: string,
  textModel: string,
  imageModel: string,
  captionModel: string
) {
  if (!supabaseAdmin) {
    throw new Error("Supabase não configurado");
  }

  try {
    // 1. Gerar texto do post
    const prompt = buildPrompt(payload);
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
      }
    );

    if (!textResponse.ok) {
      const errorData = await textResponse.json().catch(() => ({}));
      throw new Error(`Erro ao gerar texto: ${errorData?.error?.message || textResponse.statusText}`);
    }

    const textData = await textResponse.json();
    const candidate = textData?.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (finishReason === 'PROHIBITED_CONTENT' || finishReason === 'SAFETY') {
      throw new Error("Conteúdo proibido pelas políticas do Google");
    }

    const postText = candidate?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!postText) {
      throw new Error("Falha ao gerar o post. Resposta vazia.");
    }

    // 2. Gerar imagem
    const imagePrompt = buildImagePrompt(payload, postText);
    let enhancedPrompt = imagePrompt;

    const logoUrl = (payload.onboarding as Record<string, unknown>)?.logo_url as string | undefined;
    if (logoUrl) {
      enhancedPrompt += "\n\nIMPORTANTE: Inclua o logo da marca na imagem. O logo está disponível em: " + logoUrl;
    }

    if (payload.inspirationImage) {
      enhancedPrompt += "\n\nIMPORTANTE: Use esta imagem como referência visual e estilo para criar uma imagem similar, mas única e original.";
    }

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
      }
    );

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // Ignore parse error
      }
      const errorMessage = errorData?.error?.message || errorData?.message || `Erro na API da OpenAI: ${imageResponse.status}`;
      throw new Error(`Erro ao gerar imagem: ${errorMessage}`);
    }

    const imageData = await imageResponse.json();
    const imageUrlFromApi = imageData?.data?.[0]?.url;

    if (!imageUrlFromApi) {
      throw new Error("A API retornou uma resposta sem imagem.");
    }

    // Baixar e salvar imagem
    const imageDownloadResponse = await fetch(imageUrlFromApi);
    if (!imageDownloadResponse.ok) {
      throw new Error(`Erro ao baixar imagem: ${imageDownloadResponse.status}`);
    }

    const imageBuffer = await imageDownloadResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const imageMimeType = 'image/png';

    let imageUrl: string | null = null;

    if (imageBase64 && payload.userId && supabaseAdmin) {
      try {
        const buffer = Buffer.from(imageBase64, 'base64');
        const fileName = `posts/${payload.userId}-${Date.now()}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('posts')
          .upload(fileName, buffer, {
            contentType: imageMimeType,
            upsert: false,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('posts')
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      } catch (storageError) {
        console.error('Error saving image to storage:', storageError);
      }
    }

    // 3. Gerar legenda (opcional)
    let caption = postText;
    const shouldGenerateCaption = imageBase64 && imageBase64.length < 2000000;

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
          }
        );

        if (captionResponse.ok) {
          const captionData = await captionResponse.json();
          const captionCandidate = captionData?.candidates?.[0];
          const captionFinishReason = captionCandidate?.finishReason;

          if (captionFinishReason !== 'PROHIBITED_CONTENT' && captionFinishReason !== 'SAFETY') {
            const generatedCaption = captionCandidate?.content?.parts?.[0]?.text?.trim();
            if (generatedCaption) {
              caption = generatedCaption;
            }
          }
        }
      } catch (captionError) {
        console.warn("Erro ao gerar legenda:", captionError);
        // Continua com o texto original
      }
    }

    // Salvar post na galeria
    await savePostToDb(payload, caption, imageUrl);

    // Atualizar job com resultado
    const result = {
      post: caption,
      originalPost: postText,
      image: imageBase64 ? `data:${imageMimeType};base64,${imageBase64}` : null,
      imageUrl: imageUrl,
      palette: payload.palette,
      businessName: payload.onboarding.business_name,
    };

    await supabaseAdmin
      .from("generation_jobs")
      .update({
        status: "completed",
        result: result as any,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return result;
  } catch (error) {
    // Atualizar job com erro
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao processar job";
    try {
      await supabaseAdmin
        .from("generation_jobs")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    } catch (updateError) {
      console.error(`[process-job] Erro ao atualizar status do job ${jobId} para failed:`, updateError);
    }
    throw error;
  }
}

