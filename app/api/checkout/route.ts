import { NextResponse } from "next/server";
import Stripe from "stripe";

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

// ⚠️ PRODUÇÃO: Atualizar os price_id abaixo com os IDs de PRODUÇÃO do Stripe
// Os IDs atuais são de TESTE. Crie produtos no Stripe Dashboard (modo Live) e substitua.
const PRICE_MAP: Record<string, { priceId: string; credits: number; amount: number }> = {
  "1": {
    priceId: process.env.STRIPE_PRICE_ID_1_CREDIT || "price_1T0hkLIPOqSQAIzU71sTiTUK", // ⚠️ Atualizar para produção
    credits: 1,
    amount: 399, // R$ 3,99 em centavos
  },
  "20": {
    priceId: process.env.STRIPE_PRICE_ID_20_CREDITS || "price_1T0hoXIPOqSQAIzUvkZe5Qsl", // ⚠️ Atualizar para produção
    credits: 20,
    amount: 6999, // R$ 69,99 em centavos
  },
};

export async function POST(request: Request) {
  try {
    const { userId, packageType } = (await request.json()) as {
      userId?: string;
      packageType?: string;
    };

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      );
    }

    if (!packageType || !PRICE_MAP[packageType]) {
      return NextResponse.json(
        { error: "Tipo de pacote inválido" },
        { status: 400 }
      );
    }

    const packageInfo = PRICE_MAP[packageType];

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (error) {
      return NextResponse.json(
        { error: "Stripe não configurado" },
        { status: 500 }
      );
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: packageInfo.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://plimpost.com"}/creditos?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://plimpost.com"}/creditos?canceled=true`,
      metadata: {
        userId,
        credits: packageInfo.credits.toString(),
        packageType,
      },
      customer_email: undefined, // Será preenchido pelo Stripe se necessário
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao criar sessão de checkout.",
      },
      { status: 500 }
    );
  }
}



