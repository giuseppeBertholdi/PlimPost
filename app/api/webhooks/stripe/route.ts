import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Inicializar Stripe de forma lazy para evitar erros durante o build
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Configurar para não fazer parsing do body (Stripe precisa do body raw)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    console.log("[Webhook] Recebido evento do Stripe");
    console.log("[Webhook] Signature presente:", !!signature);
    console.log("[Webhook] Webhook secret configurado:", !!webhookSecret);

    if (!signature || !webhookSecret) {
      console.error("[Webhook] Webhook secret ou signature não configurado");
      return NextResponse.json(
        { error: "Webhook secret não configurado" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("[Webhook] Evento verificado:", event.type, event.id);
    } catch (err) {
      console.error("[Webhook] Erro ao verificar webhook:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    // Processar evento de pagamento bem-sucedido
    if (event.type === "checkout.session.completed") {
      console.log("[Webhook] Processando checkout.session.completed");
      const session = event.data.object as Stripe.Checkout.Session;

      // Buscar a sessão completa para garantir que temos os metadados
      const stripe = getStripe();
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['payment_intent'],
      });

      const userId = fullSession.metadata?.userId || session.metadata?.userId;
      const credits = fullSession.metadata?.credits || session.metadata?.credits
        ? parseInt(fullSession.metadata?.credits || session.metadata?.credits || "0", 10)
        : 0;
      const paymentIntentId = typeof fullSession.payment_intent === 'string' 
        ? fullSession.payment_intent 
        : fullSession.payment_intent?.id || session.payment_intent as string;

      console.log("[Webhook] Dados extraídos:", {
        userId,
        credits,
        paymentIntentId,
        hasSupabaseAdmin: !!supabaseAdmin,
        metadata: fullSession.metadata,
      });

      if (!userId) {
        console.error("[Webhook] userId não encontrado nos metadados");
        return NextResponse.json(
          { error: "userId não encontrado nos metadados" },
          { status: 400 }
        );
      }

      if (!credits || credits <= 0) {
        console.error("[Webhook] Créditos inválidos:", credits);
        return NextResponse.json(
          { error: "Créditos inválidos" },
          { status: 400 }
        );
      }

      if (!supabaseAdmin) {
        console.error("[Webhook] Supabase admin não configurado");
        return NextResponse.json(
          { error: "Supabase não configurado" },
          { status: 500 }
        );
      }

      // Adicionar créditos usando a função do banco
      console.log("[Webhook] Chamando add_user_credits com:", {
        p_user_id: userId,
        p_amount: credits,
        p_description: `Compra de ${credits} crédito(s) via Stripe`,
        p_stripe_payment_intent_id: paymentIntentId,
      });

      const { data: rpcData, error: functionError } = await supabaseAdmin.rpc("add_user_credits", {
        p_user_id: userId,
        p_amount: credits,
        p_description: `Compra de ${credits} crédito(s) via Stripe`,
        p_stripe_payment_intent_id: paymentIntentId,
      });

      if (functionError) {
        console.error("[Webhook] Erro ao adicionar créditos:", functionError);
        return NextResponse.json(
          { error: "Erro ao adicionar créditos", details: functionError.message },
          { status: 500 }
        );
      }

      console.log(`[Webhook] ✅ Créditos adicionados com sucesso: ${credits} para usuário ${userId}`);
      
      // Verificar se os créditos foram realmente adicionados
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .single();

      if (verifyError) {
        console.error("[Webhook] Erro ao verificar créditos:", verifyError);
      } else {
        console.log(`[Webhook] Créditos verificados: ${verifyData?.credits} créditos totais`);
      }
    } else {
      console.log(`[Webhook] Evento ignorado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Erro no webhook do Stripe:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao processar webhook.",
      },
      { status: 500 }
    );
  }
}


