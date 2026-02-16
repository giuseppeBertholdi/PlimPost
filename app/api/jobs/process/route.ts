import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/generation-utils";
import { processJob } from "@/lib/process-job";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para processar (pode ser maior que 26s)

export async function POST(request: Request) {
  try {
    // Verificar autenticação (pode usar um secret token para proteger o endpoint)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.WORKER_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase não configurado." },
        { status: 500 }
      );
    }

    // Buscar um job pendente
    const { data: jobs, error: fetchError } = await supabaseAdmin
      .from("generation_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error("[jobs/process] Erro ao buscar jobs:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar jobs." },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        message: "Nenhum job pendente.",
        processed: false,
      });
    }

    const job = jobs[0];
    const payload = job.payload as any;

    console.log(`[jobs/process] Processando job ${job.id}`);

    // Processar o job
    try {
      const result = await processJob(job.id, payload);
      console.log(`[jobs/process] Job ${job.id} processado com sucesso`);
      
      return NextResponse.json({
        message: "Job processado com sucesso.",
        jobId: job.id,
        result,
        processed: true,
      });
    } catch (error) {
      console.error(`[jobs/process] Erro ao processar job ${job.id}:`, error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Erro ao processar job.",
          jobId: job.id,
          processed: false,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[jobs/process] Erro na API:", error);
    return NextResponse.json(
      {
        error: "Erro inesperado ao processar jobs.",
      },
      { status: 500 }
    );
  }
}

// GET também funciona para facilitar chamadas de cron
export async function GET(request: Request) {
  return POST(request);
}

