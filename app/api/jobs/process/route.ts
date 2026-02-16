import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/generation-utils";
import { processJob } from "@/lib/process-job";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 26; // Netlify limita a 26s, então retornamos imediatamente

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

    console.log(`[jobs/process] Iniciando processamento do job ${job.id}`);

    // Marcar job como processing ANTES de retornar
    // Isso garante que mesmo se a função for morta pelo Netlify, o job já está marcado
    await supabaseAdmin
      .from("generation_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Processar o job em background (não esperar resultado para evitar timeout)
    // Isso permite que o Netlify retorne antes dos 26s
    // O processamento continua mesmo após a função retornar (até o Netlify matar o processo)
    processJob(job.id, payload).catch(error => {
      console.error(`[jobs/process] Erro ao processar job ${job.id} em background:`, error);
      // O processJob já atualiza o status para failed, mas garantimos aqui também
      try {
        supabaseAdmin
          .from("generation_jobs")
          .select("status")
          .eq("id", job.id)
          .single()
          .then(({ data: currentJob }) => {
            if (currentJob?.status === "processing") {
              supabaseAdmin
                .from("generation_jobs")
                .update({
                  status: "failed",
                  error_message: error instanceof Error ? error.message : "Erro ao processar job",
                  completed_at: new Date().toISOString(),
                })
                .eq("id", job.id);
            }
          });
      } catch (updateError) {
        console.error(`[jobs/process] Erro ao atualizar job ${job.id} para failed:`, updateError);
      }
    });

    // Retornar imediatamente (antes dos 26s do Netlify)
    // O processamento continua em background
    return NextResponse.json({
      message: "Job iniciado para processamento em background.",
      jobId: job.id,
      processed: true,
    });
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

