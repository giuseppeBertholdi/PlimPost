import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Rota para processar manualmente uma sessão de checkout já completada
// Útil quando o webhook não foi chamado ou para reprocessar pagamentos
export async function POST(request: Request) {
  try {
    const { sessionId } = (await request.json()) as {
      sessionId?: string;
    };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId é obrigatório" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase não configurado" },
        { status: 500 }
      );
    }

    // Buscar a sessão do Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: "Sessão não foi paga" },
        { status: 400 }
      );
    }

    const userId = session.metadata?.userId;
    const credits = session.metadata?.credits
      ? parseInt(session.metadata.credits, 10)
      : 0;
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "userId não encontrado nos metadados" },
        { status: 400 }
      );
    }

    if (!credits || credits <= 0) {
      return NextResponse.json(
        { error: "Créditos inválidos" },
        { status: 400 }
      );
    }

    // Verificar se já foi processado (evitar duplicação)
    const { data: existingTransaction } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existingTransaction) {
      return NextResponse.json({
        message: "Pagamento já foi processado anteriormente",
        credits,
      });
    }

    // Adicionar créditos
    const { error: functionError } = await supabaseAdmin.rpc("add_user_credits", {
      p_user_id: userId,
      p_amount: credits,
      p_description: `Compra de ${credits} crédito(s) via Stripe (processado manualmente)`,
      p_stripe_payment_intent_id: paymentIntentId,
    });

    if (functionError) {
      console.error("Erro ao adicionar créditos:", functionError);
      return NextResponse.json(
        { error: "Erro ao adicionar créditos", details: functionError.message },
        { status: 500 }
      );
    }

    // Verificar créditos finais
    const { data: verifyData } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Créditos adicionados com sucesso`,
      creditsAdded: credits,
      totalCredits: verifyData?.credits ?? 0,
    });
  } catch (error) {
    console.error("Erro ao processar pagamento:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao processar pagamento.",
      },
      { status: 500 }
    );
  }
}


