// Supabase Edge Function para processar jobs de geração de posts
// Roda no Deno runtime do Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Job {
  id: string;
  status: string;
  payload: any;
  result: any;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ProcessResult {
  jobId: string;
  status: "completed" | "failed";
  error?: string;
}

/**
 * Gera o texto do post usando Gemini
 */
async function generateText(payload: any): Promise<string> {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const textModel = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
  
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
  const extra = payload.extraInfo?.trim() ? payload.extraInfo.trim() : "Não informado";
  
  const prompt = `Crie um post autêntico e humano para Instagram.

MARCA: ${payload.onboarding.business_name} | ${payload.onboarding.business_description} | Diferencial: ${payload.onboarding.business_differential} | Tom: ${tones} | Público: ${payload.onboarding.target_audience}

POST: Objetivo: ${payload.objective} | Tema: ${payload.mainTheme}${extra !== "Não informado" ? ` | Extra: ${extra}` : ""}

REGRAS:
- Linguagem natural, como pessoa real falaria
- MÁXIMO 20-30 palavras, extremamente conciso
- Abertura impactante + desenvolvimento direto + CTA curta
- Tom: ${tones}
- Português do Brasil
- Sem hashtags

IMPORTANTE: O post deve soar como se uma pessoa real, que conhece bem a marca e o público, estivesse escrevendo para seus amigos ou seguidores. Evite qualquer coisa que soe robótica, genérica ou excessivamente promocional.

Agora, crie um post autêntico, humano e envolvente que realmente conecte com o público.`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 400,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Erro ao gerar texto: ${errorData?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  
  if (candidate?.finishReason === 'PROHIBITED_CONTENT' || candidate?.finishReason === 'SAFETY') {
    throw new Error("Conteúdo proibido pelas políticas do Google");
  }

  const postText = candidate?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!postText) {
    throw new Error("Falha ao gerar o post. Resposta vazia.");
  }

  return postText;
}

/**
 * Gera a imagem do post usando OpenAI
 * Retorna objeto com imageUrl e imageBase64
 */
async function generateImage(payload: any, postText: string, supabase: any): Promise<{ imageUrl: string | null; imageBase64: string }> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  const imageModel = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1";
  
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  // Construir prompt de imagem completo
  const tones = payload.onboarding.tone_tags?.join(", ") || "Neutro";
  const paletteColors = payload.palette?.colors?.join(", ") || "#f97316, #fb923c, #0f172a";
  const onboarding = payload.onboarding as Record<string, unknown>;
  const fontTitle = payload.fontTitle ?? onboarding?.brand_font_title ?? onboarding?.brand_font ?? "Montserrat, sans-serif";
  const fontText = payload.fontText ?? onboarding?.brand_font_text ?? onboarding?.brand_font ?? "Open Sans, sans-serif";
  const additionalText = payload.additionalText || "";
  const imageStyle = payload.imageStyle || "moderno";
  const textStyle = payload.textStyle || "padrão";
  const mainTheme = payload.mainTheme || "";
  const extraInfo = payload.extraInfo || "";
  const logoUrl = onboarding?.logo_url as string | undefined;

  const imageStyleDescriptions: Record<string, string> = {
    moderno: "Design moderno e contemporâneo, com elementos geométricos sutis e layout limpo",
    minimalista: "Design minimalista com muito espaço em branco, elementos simples e focados",
    colorido: "Design vibrante e colorido, com uso generoso de cores e elementos visuais chamativos",
    elegante: "Design elegante e sofisticado, com tipografia refinada e elementos decorativos discretos",
    divertido: "Design descontraído e divertido, com elementos lúdicos e cores alegres",
    profissional: "Design corporativo e profissional, com layout estruturado e visual sério",
  };

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

  // Separar o texto em título e corpo
  const lines = fullText.split('\n').filter(l => l.trim());
  const titleText = lines[0] || fullText.split('.')[0] || fullText.substring(0, 50);
  const bodyText = lines.slice(1).join(' ') || fullText.substring(titleText.length).trim();

  let imagePrompt = `Crie imagem 1080x1080px para Instagram. 70% visual, 30% texto.

MARCA: ${payload.onboarding.business_name} | ${payload.onboarding.business_description} | Diferencial: ${payload.onboarding.business_differential} | Tom: ${tones}
${logoUrl ? `LOGO: Use a logo fornecida EXATAMENTE como está, sem modificações. Apenas ajuste tamanho mantendo proporções.` : ''}
CORES: ${paletteColors} - Use como base, crie gradientes. NUNCA mostre códigos hex ou swatches.
ESTILO: ${imageStyleDesc}
${mainTheme ? `TEMA: "${mainTheme}" - Represente visualmente.` : ''}${extraInfo ? `EXTRA: "${extraInfo}" - Inclua na imagem.` : ''}
${payload.inspirationImage ? `INSPIRAÇÃO: Use a imagem fornecida como referência de composição e estilo.` : ''}
TEXTO: TÍTULO "${titleText}" (fonte ${fontTitle}, negrito e grande, 3-5 palavras, ${textStyleDesc})${bodyText ? ` | CORPO "${bodyText}" (fonte ${fontText}, regular e menor)` : ''}
REGRAS: 70% elementos visuais (formas, gradientes, padrões, ícones) + 30% texto. Fundo rico visualmente. NUNCA mencione nomes de fontes ou códigos de cores na imagem. Apenas USE visualmente.
PROIBIDO: Nomes de fontes, códigos hex, swatches, informações técnicas, sites/URLs/perfis inventados.
QUALIDADE: 1080x1080px, alta qualidade, PNG, pronto para publicação.`.trim();

  // Adicionar informações sobre logo/imagem de inspiração
  if (logoUrl) {
    imagePrompt += "\n\nIMPORTANTE: Inclua o logo da marca na imagem. O logo está disponível em: " + logoUrl;
  }
  
  if (payload.inspirationImage) {
    imagePrompt += "\n\nIMPORTANTE: Use esta imagem como referência visual e estilo para criar uma imagem similar, mas única e original.";
  }

  const response = await fetch(
    `https://api.openai.com/v1/images/generations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: imageModel,
        prompt: imagePrompt,
        size: "1024x1024",
        quality: "high",
        n: 1,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      // Ignore
    }
    const errorMessage = errorData?.error?.message || errorData?.message || `Erro na API da OpenAI: ${response.status}`;
    throw new Error(`Erro ao gerar imagem: ${errorMessage}`);
  }

  const imageData = await response.json();
  const imageUrlFromApi = imageData?.data?.[0]?.url;

  if (!imageUrlFromApi) {
    throw new Error("A API retornou uma resposta sem imagem.");
  }

  // Baixar imagem e salvar no Supabase Storage
  const imageResponse = await fetch(imageUrlFromApi);
  if (!imageResponse.ok) {
    throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
  }

  const imageArrayBuffer = await imageResponse.arrayBuffer();
  const imageBytes = new Uint8Array(imageArrayBuffer);
  
  // Converter para base64 para usar na legenda (se necessário)
  // Método compatível com Deno para arrays grandes
  let base64String = "";
  const chunkSize = 8192; // Processar em chunks para evitar problemas com arrays grandes
  for (let i = 0; i < imageBytes.length; i += chunkSize) {
    const chunk = imageBytes.slice(i, i + chunkSize);
    base64String += btoa(String.fromCharCode(...chunk));
  }
  
  // Salvar no Supabase Storage
  let imageUrl: string | null = null;
  
  if (payload.userId) {
    try {
      const fileName = `posts/${payload.userId}-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, imageBytes, {
          contentType: 'image/png',
          upsert: false,
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      } else {
        console.error('Erro ao fazer upload da imagem:', uploadError);
      }
    } catch (storageError) {
      console.error('Erro ao salvar imagem no storage:', storageError);
    }
  }

  // Retornar URL e base64 para legenda
  return { imageUrl, imageBase64: base64String };
}

/**
 * Gera a legenda do post usando Gemini
 */
async function generateCaption(
  payload: any,
  postText: string,
  imageBase64: string | null
): Promise<string> {
  if (!imageBase64) {
    return postText; // Fallback para texto original
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const captionModel = Deno.env.get("GEMINI_CAPTION_MODEL") || "gemini-2.5-flash";
  
  if (!geminiApiKey) {
    return postText;
  }

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
4. Seja envolvente e completo (mínimo 50 palavras, idealmente 80-150 palavras)
5. Português do Brasil
6. NÃO inclua hashtags
7. NÃO invente informações de contato, sites ou perfis

Crie uma legenda autêntica, envolvente e completa para este post do Instagram.
`.trim();

    const response = await fetch(
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
                    mimeType: "image/png",
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

    if (response.ok) {
      const data = await response.json();
      const candidate = data?.candidates?.[0];
      
      if (candidate?.finishReason !== 'PROHIBITED_CONTENT' && candidate?.finishReason !== 'SAFETY') {
        const generatedCaption = candidate?.content?.parts?.[0]?.text?.trim();
        if (generatedCaption) {
          return generatedCaption;
        }
      }
    }
  } catch (error) {
    console.warn("Erro ao gerar legenda:", error);
  }

  return postText; // Fallback
}

/**
 * Função principal para gerar post completo
 */
async function generatePost(payload: any, supabase: any): Promise<any> {
  console.log("📝 Iniciando geração de post...");
  
  // 1. Gerar texto
  const postText = await generateText(payload);
  console.log("✅ Texto gerado");
  
  // 2. Gerar imagem
  const { imageUrl, imageBase64 } = await generateImage(payload, postText, supabase);
  console.log("✅ Imagem gerada");
  
  // 3. Gerar legenda (opcional - pode pular se demorar muito)
  let caption = postText;
  try {
    // Só gerar legenda se a imagem não for muito grande
    if (imageBase64 && imageBase64.length < 2000000) {
      caption = await generateCaption(payload, postText, imageBase64);
      console.log("✅ Legenda gerada");
    }
  } catch (error) {
    console.warn("Erro ao gerar legenda, usando texto original:", error);
  }
  
  // 4. Salvar post na galeria (se houver userId)
  if (payload.userId) {
    try {
      await supabase
        .from("generated_posts")
        .insert({
          user_id: payload.userId,
          post_text: caption,
          post_image_url: imageUrl,
          objective: payload.objective,
          main_theme: payload.mainTheme,
          extra_info: payload.extraInfo || null,
          palette_name: payload.palette?.name || null,
          palette_colors: payload.palette?.colors || null,
        });
      console.log("✅ Post salvo na galeria");
    } catch (error) {
      console.warn("Erro ao salvar post na galeria:", error);
    }
  }
  
  return {
    post: caption,
    originalPost: postText,
    imageUrl: imageUrl,
    palette: payload.palette,
    businessName: payload.onboarding.business_name,
  };
}

/**
 * Processa um job individual
 */
async function processJob(
  supabase: any,
  job: Job
): Promise<ProcessResult> {
  const startTime = Date.now();
  console.log(`🔄 Processando job ${job.id}...`);

  try {
    // Gerar post usando a função de geração
    const result = await generatePost(job.payload, supabase);

    // Atualizar job como completed
    const { error: updateError } = await supabase
      .from("generation_jobs")
      .update({
        status: "completed",
        result: result,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar job: ${updateError.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Job ${job.id} processado com sucesso em ${duration}ms`);

    return {
      jobId: job.id,
      status: "completed",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`❌ Erro ao processar job ${job.id}:`, errorMessage);

    // Atualizar job como failed
    try {
      await supabase
        .from("generation_jobs")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    } catch (updateError) {
      console.error(`❌ Erro ao atualizar job ${job.id} para failed:`, updateError);
    }

    return {
      jobId: job.id,
      status: "failed",
      error: errorMessage,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Obter variáveis de ambiente
    // No Supabase Edge Functions, estas variáveis são injetadas automaticamente
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas. Verifique se a função está sendo executada no Supabase.");
    }

    // Criar cliente Supabase com service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("🔍 Buscando jobs pendentes...");

    // Buscar até 3 jobs pendentes
    // Nota: A tabela se chama 'generation_jobs', não 'jobs'
    const { data: jobs, error: fetchError } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(3);

    if (fetchError) {
      throw new Error(`Erro ao buscar jobs: ${fetchError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log("ℹ️ Nenhum job pendente encontrado");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum job pendente",
          processed: 0,
          results: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`📋 Encontrados ${jobs.length} job(s) pendente(s)`);

    // Atualizar todos os jobs para "processing" de forma atômica
    // Isso previne que múltiplas instâncias processem o mesmo job
    const jobIds = jobs.map((j: Job) => j.id);
    
    const { error: updateError } = await supabase
      .from("generation_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", jobIds)
      .eq("status", "pending"); // Só atualiza se ainda estiver pending

    if (updateError) {
      throw new Error(`Erro ao atualizar jobs para processing: ${updateError.message}`);
    }

    console.log(`🔄 ${jobIds.length} job(s) marcado(s) como processing`);

    // Processar cada job em paralelo
    const processPromises = jobs.map((job: Job) => processJob(supabase, job));
    const results = await Promise.allSettled(processPromises);

    // Processar resultados
    const processedResults: ProcessResult[] = [];
    let completed = 0;
    let failed = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        processedResults.push(result.value);
        if (result.value.status === "completed") {
          completed++;
        } else {
          failed++;
        }
      } else {
        // Se o processamento falhou completamente (não conseguiu nem atualizar o job)
        const jobId = jobs[index].id;
        processedResults.push({
          jobId,
          status: "failed",
          error: result.reason?.message || "Erro desconhecido no processamento",
        });
        failed++;
      }
    });

    console.log(`✅ Processamento concluído: ${completed} sucesso, ${failed} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${jobs.length} job(s)`,
        processed: jobs.length,
        completed,
        failed,
        results: processedResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("💥 Erro fatal:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

