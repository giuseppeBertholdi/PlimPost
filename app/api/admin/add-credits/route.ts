import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Cliente com service role key para operações server-side
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, credits, adminKey } = body;

    // Verificação básica de segurança (você pode melhorar isso)
    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || "change-me-in-production";
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    if (!email || !credits) {
      return NextResponse.json(
        { error: "email e credits são obrigatórios" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase não configurado" },
        { status: 500 }
      );
    }

    // Buscar o user_id pelo email
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error("Erro ao buscar usuários:", userError);
      return NextResponse.json(
        { error: "Erro ao buscar usuários" },
        { status: 500 }
      );
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: `Usuário com email ${email} não encontrado` },
        { status: 404 }
      );
    }

    const userId = user.id;

    // Adicionar créditos usando a função do banco
    const { data: rpcData, error: functionError } = await supabaseAdmin.rpc("add_user_credits", {
      p_user_id: userId,
      p_amount: credits,
      p_description: `Créditos adicionados manualmente via admin`,
      p_stripe_payment_intent_id: null,
    });

    if (functionError) {
      console.error("Erro ao adicionar créditos:", functionError);
      return NextResponse.json(
        { error: "Erro ao adicionar créditos", details: functionError.message },
        { status: 500 }
      );
    }

    // Verificar os créditos atualizados
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (creditsError) {
      console.error("Erro ao verificar créditos:", creditsError);
    }

    return NextResponse.json({
      success: true,
      message: `${credits} créditos adicionados com sucesso para ${email}`,
      userId,
      currentCredits: creditsData?.credits ?? 0,
    });
  } catch (error) {
    console.error("Erro na API de adicionar créditos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao adicionar créditos.",
      },
      { status: 500 }
    );
  }
}









