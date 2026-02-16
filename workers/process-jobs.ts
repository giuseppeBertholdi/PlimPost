#!/usr/bin/env node
/**
 * Worker para processar jobs de geração de posts
 * 
 * Este worker roda continuamente, buscando jobs pendentes e processando-os.
 * 
 * Como rodar:
 *   - Local: npm run worker
 *   - Railway/Render/VPS: Configure para rodar este script
 * 
 * Variáveis de ambiente necessárias:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - GEMINI_API_KEY
 *   - OPENAI_API_KEY
 *   - GEMINI_MODEL (opcional)
 *   - OPENAI_IMAGE_MODEL (opcional)
 *   - GEMINI_CAPTION_MODEL (opcional)
 */

import { createClient } from "@supabase/supabase-js";
import { processJob } from "../lib/process-job";
import type { GeneratePayload } from "../lib/generation-utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis de ambiente não configuradas:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("   - SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const POLL_INTERVAL = 5000; // 5 segundos entre verificações
const MAX_CONCURRENT_JOBS = 1; // Processar 1 job por vez

let isProcessing = false;
let shouldStop = false;

// Handler para parar o worker graciosamente
process.on("SIGINT", () => {
  console.log("\n🛑 Parando worker...");
  shouldStop = true;
  if (!isProcessing) {
    process.exit(0);
  }
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Parando worker...");
  shouldStop = true;
  if (!isProcessing) {
    process.exit(0);
  }
});

async function processNextJob() {
  if (isProcessing || shouldStop) {
    return;
  }

  try {
    // Buscar um job pendente
    const { data: jobs, error } = await supabaseAdmin
      .from("generation_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      console.error("❌ Erro ao buscar jobs:", error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      // Nenhum job pendente, aguardar antes de verificar novamente
      return;
    }

    const job = jobs[0];
    const payload = job.payload as GeneratePayload;

    isProcessing = true;
    console.log(`\n🔄 Processando job ${job.id}...`);
    console.log(`   Criado em: ${new Date(job.created_at).toLocaleString()}`);

    try {
      await processJob(job.id, payload);
      console.log(`✅ Job ${job.id} processado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao processar job ${job.id}:`, error);
      // O processJob já atualiza o status para failed
    } finally {
      isProcessing = false;
    }
  } catch (error) {
    console.error("❌ Erro inesperado no worker:", error);
    isProcessing = false;
  }
}

async function main() {
  console.log("🚀 Worker de processamento de jobs iniciado");
  console.log(`   Intervalo de verificação: ${POLL_INTERVAL / 1000}s`);
  console.log(`   Máximo de jobs simultâneos: ${MAX_CONCURRENT_JOBS}`);
  console.log("   Pressione Ctrl+C para parar\n");

  while (!shouldStop) {
    await processNextJob();
    
    if (!shouldStop) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  console.log("👋 Worker parado");
  process.exit(0);
}

// Iniciar o worker
main().catch(error => {
  console.error("💥 Erro fatal no worker:", error);
  process.exit(1);
});

