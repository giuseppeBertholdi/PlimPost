import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 26;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

type Payload = {
  onboarding?: {
    business_name?: string;
    business_description?: string;
    logo_url?: string;
  };
  mainTheme?: string;
  objective?: string;
  inspirationImage?: string;
  userId?: string;
  // Aceitar também formato simples
  prompt?: string;
  logoUrl?: string;
  inspirationMessage?: string;
};

export async function POST(request: Request) {
  try {
    const payload: Payload = await request.json();
    
    // Construir prompt simples
    const prompt = payload.prompt || 
      `${payload.onboarding?.business_name ? `Marca: ${payload.onboarding.business_name}. ` : ''}${payload.mainTheme ? `Tema: ${payload.mainTheme}. ` : ''}${payload.objective ? `Objetivo: ${payload.objective}` : ''}`.trim();
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt ou tema é obrigatório." }, { status: 400 });
    }

    // Verificar créditos
    if (payload.userId && supabaseAdmin) {
      const { data: creditsData } = await supabaseAdmin
        .from("user_credits")
        .select("credits")
        .eq("user_id", payload.userId)
        .maybeSingle();

      if ((creditsData?.credits ?? 0) < 1) {
        return NextResponse.json(
          { error: "Créditos insuficientes." },
          { status: 402 }
        );
      }

      await supabaseAdmin.rpc("use_user_credits", {
        p_user_id: payload.userId,
        p_amount: 1,
        p_description: "Geração de post",
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!geminiApiKey || !openaiApiKey) {
      return NextResponse.json(
        { error: "APIs não configuradas." },
        { status: 500 }
      );
    }

    // 1. Gerar texto do post
    const textPrompt = `Crie um post curto e autêntico para Instagram (20-30 palavras) sobre: ${prompt}${payload.inspirationMessage || payload.inspirationImage ? `. Use como inspiração.` : ''}`;

    const textModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${geminiApiKey}`;
    
    console.log("[generate] Chamando Gemini:", { model: textModel, url: geminiUrl.replace(geminiApiKey, '***') });
    
    const textResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: textPrompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
      }),
    });

    if (!textResponse.ok) {
      const errorText = await textResponse.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error("[generate] Erro ao parsear resposta de erro:", errorText.substring(0, 500));
      }
      
      console.error("[generate] Erro na API do Gemini:", {
        status: textResponse.status,
        statusText: textResponse.statusText,
        error: errorData,
        model: textModel,
        hasApiKey: !!geminiApiKey,
        url: geminiUrl.replace(geminiApiKey, '***'),
      });
      
      // Se for 404, pode ser modelo inválido
      if (textResponse.status === 404) {
        return NextResponse.json(
          { 
            error: `Modelo "${textModel}" não encontrado. Verifique se o modelo está correto nas variáveis de ambiente.`,
            details: errorData,
            suggestion: "Tente usar 'gemini-1.5-flash' ou verifique GEMINI_MODEL no Netlify.",
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Erro ao gerar texto: ${errorData?.error?.message || textResponse.statusText || 'Erro desconhecido'}`,
          details: errorData,
        },
        { status: textResponse.status }
      );
    }

    const textData = await textResponse.json();
    const postText = textData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!postText) {
      return NextResponse.json({ error: "Falha ao gerar texto." }, { status: 500 });
    }

    // 2. Gerar imagem
    const logoUrl = payload.logoUrl || payload.onboarding?.logo_url;
    const imagePrompt = `Crie uma imagem 1080x1080px para Instagram com o texto: "${postText}".${logoUrl ? ` Inclua o logo da marca.` : ''}${payload.inspirationMessage ? ` Estilo inspirado em: ${payload.inspirationMessage}` : ''}`;

    const imageResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
          prompt: imagePrompt,
          size: "1024x1024",
          quality: "high",
          n: 1,
        }),
      }
    );

    if (!imageResponse.ok) {
      return NextResponse.json({
        post: postText,
        imageError: "Erro ao gerar imagem.",
      });
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData?.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({
        post: postText,
        imageError: "Imagem não gerada.",
      });
    }

    // Baixar e converter para base64
    const imageDownload = await fetch(imageUrl);
    const imageBuffer = await imageDownload.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // Salvar no Supabase Storage (opcional)
    let savedImageUrl: string | null = null;
    if (payload.userId && supabaseAdmin) {
      try {
        const fileName = `posts/${payload.userId}-${Date.now()}.png`;
        await supabaseAdmin.storage
          .from('posts')
          .upload(fileName, Buffer.from(imageBase64, 'base64'), {
            contentType: 'image/png',
          });
        
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('posts')
          .getPublicUrl(fileName);
        savedImageUrl = publicUrl;
      } catch (e) {
        console.error("Erro ao salvar imagem:", e);
      }
    }

    return NextResponse.json({
      post: postText,
      image: `data:image/png;base64,${imageBase64}`,
      imageUrl: savedImageUrl,
    });

  } catch (error) {
    console.error("[generate] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao gerar post." },
      { status: 500 }
    );
  }
}
