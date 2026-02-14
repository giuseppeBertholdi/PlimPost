"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type SessionUser = {
  id: string;
  email?: string;
};

type Post = {
  id: string;
  post_text: string;
  post_image_url: string | null;
  objective: string;
  main_theme: string;
  created_at: string;
};

export default function GaleriaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async (userId: string) => {
      try {
        const { data: postsData, error } = await supabase
          .from("generated_posts")
          .select("id, post_text, post_image_url, objective, main_theme, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (error) {
          console.error("Failed to load posts:", error);
          setLoadError(error.message || "Não foi possível carregar os posts.");
          return;
        }
        setLoadError(null);

        setPosts(postsData || []);
      } catch (err) {
        console.error("Error loading posts:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Esperar o estado inicial da autenticação (evita redirecionar usuário logado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        if (event !== "INITIAL_SESSION") return;

        const sessionUser = session?.user;
        if (!sessionUser) {
          router.replace("/");
          setIsLoading(false);
          return;
        }

        setUser({ id: sessionUser.id, email: sessionUser.email });
        await loadPosts(sessionUser.id);
      }
    );

    const timeoutId = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 10000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange-500"></div>
          </div>
          <h2 className="font-display text-xl font-semibold text-zinc-900">Carregando...</h2>
          <p className="mt-2 text-sm text-zinc-600">Carregando sua galeria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plimpost-dotted relative min-h-screen bg-zinc-50">
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-32 h-80 w-80 rounded-full bg-orange-100/50 blur-3xl" />
      
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
          <a
            href="/home"
            className="font-display text-base font-semibold text-zinc-900 sm:text-lg"
          >
            PlimPost
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/home"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span className="hidden sm:inline">Criar Post</span>
              <span className="sm:hidden">Criar</span>
            </a>
            <a
              href="/marca"
              className="hidden rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:block sm:px-4 sm:py-2 sm:text-sm"
            >
              Minha Marca
            </a>
            <details className="relative">
              <summary className="list-none cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:px-3 sm:py-2 sm:text-sm">
                <span className="hidden sm:inline">Perfil</span>
                <span className="sm:hidden">⋯</span>
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-48 rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full rounded-xl px-3 py-2 text-left text-red-500 transition hover:bg-zinc-50"
                >
                  Sair
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl md:text-4xl">
            Galeria de Posts
          </h1>
          <p className="mt-2 text-xs text-zinc-600 sm:text-sm md:text-base">
            Todos os seus posts gerados
          </p>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <p className="text-sm font-medium text-amber-800">{loadError}</p>
            <p className="mt-2 text-xs text-amber-700">
              Verifique se você está logado e tente novamente.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center text-2xl">
              📭
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhum post ainda</h3>
            <p className="text-sm text-zinc-600 mb-6">
              Comece criando seu primeiro post!
            </p>
            <a
              href="/home"
              className="inline-block rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600 sm:px-6 sm:py-3 sm:text-sm"
            >
              Criar Primeiro Post
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg"
              >
                {post.post_image_url ? (
                  <div className="aspect-square w-full overflow-hidden bg-zinc-100">
                    <img
                      src={post.post_image_url}
                      alt={post.main_theme}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
                    <p className="text-sm text-zinc-400">Sem imagem</p>
                  </div>
                )}
                
                <div className="p-4">
                  <div className="mb-2">
                    <span className="inline-block rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">
                      {post.objective}
                    </span>
                  </div>
                  <p className="mb-2 line-clamp-2 text-sm font-semibold text-zinc-900">
                    {post.main_theme}
                  </p>
                  <p className="mb-3 line-clamp-3 text-xs text-zinc-600">
                    {post.post_text}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {new Date(post.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {post.post_image_url && (
                      <a
                        href={post.post_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Ver imagem
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
