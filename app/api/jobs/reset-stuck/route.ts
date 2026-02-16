import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/generation-utils";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint para resetar jobs travados em "processing" há mais de 5 minutos
export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase não configurado." },
        { status: 500 }
      );
    }

    // Buscar jobs em "processing" há mais de 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error: fetchError } = await supabaseAdmin
      .from("generation_jobs")
      .select("id, started_at")
      .eq("status", "processing")
      .lt("started_at", fiveMinutesAgo);

    if (fetchError) {
      console.error("[jobs/reset-stuck] Erro ao buscar jobs travados:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar jobs travados." },
        { status: 500 }
      );
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      return NextResponse.json({
        message: "Nenhum job travado encontrado.",
        resetCount: 0,
      });
    }

    // Resetar jobs travados para "pending"
    const jobIds = stuckJobs.map(job => job.id);
    const { error: updateError } = await supabaseAdmin
      .from("generation_jobs")
      .update({
        status: "pending",
        started_at: null,
        error_message: "Job resetado: estava travado em processing por mais de 5 minutos",
      })
      .in("id", jobIds);

    if (updateError) {
      console.error("[jobs/reset-stuck] Erro ao resetar jobs:", updateError);
      return NextResponse.json(
        { error: "Erro ao resetar jobs." },
        { status: 500 }
      );
    }

    console.log(`[jobs/reset-stuck] ${jobIds.length} jobs resetados:`, jobIds);

    return NextResponse.json({
      message: `${jobIds.length} job(s) resetado(s) com sucesso.`,
      resetCount: jobIds.length,
      jobIds,
    });
  } catch (error) {
    console.error("[jobs/reset-stuck] Erro na API:", error);
    return NextResponse.json(
      {
        error: "Erro inesperado ao resetar jobs travados.",
      },
      { status: 500 }
    );
  }
}

// GET também funciona
export async function GET(request: Request) {
  return POST(request);
}

