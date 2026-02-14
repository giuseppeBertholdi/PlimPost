import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Inicializar Supabase Admin de forma lazy para evitar erros durante o build
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase não configurado" },
        { status: 500 }
      );
    }

    // Buscar créditos do usuário
    const { data, error } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar créditos:", error);
      return NextResponse.json(
        { error: "Erro ao buscar créditos" },
        { status: 500 }
      );
    }

    // Se não existir registro, retornar 0
    const credits = data?.credits ?? 0;

    return NextResponse.json({ credits });
  } catch (error) {
    console.error("Erro na API de créditos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao buscar créditos.",
      },
      { status: 500 }
    );
  }
}



