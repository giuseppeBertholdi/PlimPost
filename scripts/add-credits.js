#!/usr/bin/env node

/**
 * Script para adicionar créditos a um usuário pelo email
 * Uso: node scripts/add-credits.js <email> <credits>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addCredits(email, credits) {
  try {
    console.log(`🔍 Buscando usuário com email: ${email}...`);
    
    // Buscar o user_id pelo email usando a API admin do Supabase
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Erro ao buscar usuários:', userError);
      return;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ Usuário com email ${email} não encontrado`);
      return;
    }

    const userId = user.id;
    console.log(`✅ Usuário encontrado: ${user.email} (ID: ${userId})`);

    // Verificar créditos atuais
    const { data: currentCreditsData, error: currentError } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();

    const currentCredits = currentCreditsData?.credits ?? 0;
    console.log(`📊 Créditos atuais: ${currentCredits}`);

    // Adicionar créditos usando a função do banco
    console.log(`➕ Adicionando ${credits} créditos...`);
    const { data: rpcData, error: functionError } = await supabaseAdmin.rpc("add_user_credits", {
      p_user_id: userId,
      p_amount: credits,
      p_description: `Créditos adicionados manualmente via script`,
      p_stripe_payment_intent_id: null,
    });

    if (functionError) {
      console.error('❌ Erro ao adicionar créditos:', functionError);
      return;
    }

    // Verificar os créditos atualizados
    const { data: newCreditsData, error: newCreditsError } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (newCreditsError) {
      console.error('⚠️  Erro ao verificar créditos atualizados:', newCreditsError);
    } else {
      console.log(`✅ Créditos atualizados com sucesso!`);
      console.log(`📊 Novo total de créditos: ${newCreditsData.credits}`);
      console.log(`📈 Adicionados: ${credits} créditos`);
    }
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar o script
const email = process.argv[2];
const credits = parseInt(process.argv[3], 10);

if (!email || isNaN(credits)) {
  console.error('❌ Uso: node scripts/add-credits.js <email> <credits>');
  console.error('   Exemplo: node scripts/add-credits.js user@example.com 100');
  process.exit(1);
}

addCredits(email, credits)
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

