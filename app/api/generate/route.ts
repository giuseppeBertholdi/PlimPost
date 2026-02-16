import { NextResponse } from "next/server";
import { supabaseAdmin, GeneratePayload } from "@/lib/generation-utils";

// Configurações para Netlify Functions
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 26; // Netlify permite até 26 segundos no plano gratuito

// Limite de tamanho do payload (em bytes) - Netlify tem limite de ~6MB
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    console.log("[generate] Iniciando requisição de geração de post (modo assíncrono)");
    
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

    // Criar job no banco de dados
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from("generation_jobs")
      .insert({
        user_id: payload.userId,
        status: "pending",
        payload: payload as any,
      })
      .select("id")
      .single();

    if (jobError || !jobData) {
      console.error("[generate] Erro ao criar job:", jobError);
      // Reverter crédito se falhar ao criar job
      await supabaseAdmin.rpc("add_user_credits", {
        p_user_id: payload.userId,
        p_amount: 1,
        p_description: "Reembolso - falha ao criar job",
      });
      return NextResponse.json(
        { error: "Erro ao criar job de geração. Tente novamente." },
        { status: 500 }
      );
    }

    console.log("[generate] Job criado com sucesso:", jobData.id);

    // Retornar jobId para o frontend fazer polling
    return NextResponse.json({
      jobId: jobData.id,
      status: "pending",
      message: "Job criado com sucesso. O processamento será iniciado em breve.",
    });
  } catch (error) {
    console.error("[generate] Erro na API de geração:", error);
    
    // Log detalhado do erro para debug
    if (error instanceof Error) {
      console.error("[generate] Detalhes do erro:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 1000), // Primeiros 1000 chars do stack
      });
      
      // Verificar se é erro de timeout ou conexão
      if (error.message.includes('timeout') || error.message.includes('aborted') || error.name === 'AbortError') {
        return NextResponse.json(
          {
            error: "A requisição demorou muito para ser processada. Tente novamente com um tema mais simples ou sem imagem de inspiração.",
            timeout: true,
          },
          { status: 504 }
        );
      }
      
      // Verificar se é erro de rede
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          {
            error: "Erro de conexão com o servidor. Verifique sua conexão e tente novamente.",
            networkError: true,
          },
          { status: 502 }
        );
      }
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
