import GoogleLoginButton from "@/components/GoogleLoginButton";
import AuthRedirectToHome from "@/components/AuthRedirectToHome";

export default function Home() {
  return (
    <div className="plimpost-dotted relative min-h-screen overflow-hidden bg-gradient-to-b from-orange-50 via-white to-white text-zinc-900">
      <AuthRedirectToHome />
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-40 h-80 w-80 rounded-full bg-orange-100/60 blur-3xl" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="font-display text-xl font-semibold tracking-tight text-zinc-900">
          PlimPost
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
          <a href="#recursos" className="hover:text-zinc-900">
            Recursos
          </a>
          <a href="#como-funciona" className="hover:text-zinc-900">
            Como funciona
          </a>
          <a href="#precos" className="hover:text-zinc-900">
            Preços
          </a>
          <a href="mailto:contato@plimpost.com" className="hover:text-zinc-900">
            Contato
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden md:inline-flex">
            <GoogleLoginButton />
          </div>
          <a
            href="/"
            className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            Começar agora
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-20">
        <section className="relative mt-6 py-16 md:mt-10 md:py-20">
          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="rounded-full bg-orange-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
              PlimPost para redes sociais
            </span>
            <h1 className="font-display mt-6 text-4xl font-semibold leading-tight text-zinc-900 md:text-6xl">
              Gere posts profissionais para Instagram com IA
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-600 md:text-lg">
              Crie imagens e legendas prontas para Instagram em segundos. 
              Design profissional, texto autêntico e pronto para publicar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/"
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
              >
                Começar agora
              </a>
              <a
                href="#como-funciona"
                className="rounded-full border border-orange-200 px-6 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50"
              >
                Ver como funciona
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
              <span>Imagem + Legenda geradas</span>
              <span className="h-1 w-1 rounded-full bg-orange-300" />
              <span>Design personalizado</span>
              <span className="h-1 w-1 rounded-full bg-orange-300" />
              <span>Pronto em segundos</span>
            </div>
          </div>

          <div className="pointer-events-none absolute -left-32 top-12 hidden flex-col gap-12 md:flex">
            <div className="relative h-64 w-52 -rotate-6 overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="/Design%20sem%20nome%20(2).png"
                alt="Exemplo de post 1"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="relative h-64 w-52 rotate-3 overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="/Design%20sem%20nome%20(3).png"
                alt="Exemplo de post 2"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="pointer-events-none absolute -right-32 top-12 hidden flex-col gap-12 md:flex">
            <div className="relative h-64 w-52 rotate-6 overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="/Design%20sem%20nome%20(4).png"
                alt="Exemplo de post 3"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="relative h-62 w-52 -rotate-3 overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="/Design%20sem%20nome%20(5).png"
                alt="Exemplo de post 4"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className="mt-20 grid gap-6 md:grid-cols-3"
        >
          {[
            {
              title: "Imagem profissional",
              text: "Gere imagens 1080x1080 pixels com design personalizado para sua marca.",
            },
            {
              title: "Legenda autêntica",
              text: "Texto humano e envolvente, adaptado ao tom de voz da sua marca.",
            },
            {
              title: "Pronto para publicar",
              text: "Imagem e legenda prontas em segundos. Baixe e publique direto no Instagram.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 h-10 w-10 rounded-2xl bg-orange-100" />
              <h3 className="font-display text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {feature.text}
              </p>
            </div>
          ))}
        </section>

        <section
          id="como-funciona"
          className="mt-20 rounded-3xl border border-orange-100 bg-white p-10 shadow-sm"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center rounded-full bg-orange-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                Como funciona
              </span>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Do tema ao post pronto em 3 passos
              </h2>
              <p className="mt-3 text-base text-zinc-600">
                Um fluxo simples para criar posts completos com imagem e legenda,
                personalizados para sua marca.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
              <span className="rounded-full bg-orange-50 px-4 py-2">
                Rapido de usar
              </span>
              <span className="rounded-full bg-orange-50 px-4 py-2">
                Resultado consistente
              </span>
              <span className="rounded-full bg-orange-50 px-4 py-2">
                Pronto para publicar
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Defina o tema",
                text: "Descreva o tema central do post, objetivo e informações adicionais.",
              },
              {
                step: "02",
                title: "Personalize o design",
                text: "Escolha paleta de cores, fontes e estilo visual que combinam com sua marca.",
              },
              {
                step: "03",
                title: "Receba imagem + legenda",
                text: "Baixe a imagem gerada e copie a legenda pronta para publicar no Instagram.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-orange-100 bg-orange-50/40 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                    Passo {item.step}
                  </span>
                  <span className="h-8 w-8 rounded-full bg-orange-500/10" />
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="precos" className="mt-20">
          <div className="flex flex-col items-start gap-4">
            <span className="inline-flex items-center rounded-full bg-orange-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
              Precos simples
            </span>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Escolha quantos posts você precisa
            </h2>
            <p className="text-base text-zinc-600">
              Sistema de créditos: 1 crédito = 1 post gerado. 
              Compre quando precisar, sem assinatura obrigatória.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-[28px] border border-orange-100 bg-white p-8 shadow-lg shadow-orange-100/60">
              <h3 className="font-display text-lg font-semibold">1 crédito</h3>
              <p className="mt-2 text-4xl font-semibold text-zinc-900">
                R$ 3,99
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Perfeito para testar o PlimPost.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-600">
                <li>1 imagem gerada (1080x1080)</li>
                <li>1 legenda personalizada</li>
                <li>Design personalizado</li>
                <li>Entrega instantânea</li>
              </ul>
              <a
                href="/"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                Comprar 1 crédito
              </a>
            </div>

            <div className="relative rounded-[32px] border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-8 shadow-xl shadow-orange-200/60">
              <div className="absolute -top-5 left-6 rounded-full bg-orange-500 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                Mais popular
              </div>
              <h3 className="font-display mt-4 text-lg font-semibold">
                20 créditos
              </h3>
              <p className="mt-2 text-4xl font-semibold text-zinc-900">
                R$ 69,99
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Economize R$ 9,81. Ideal para manter seu perfil ativo.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-600">
                <li>20 imagens geradas</li>
                <li>20 legendas personalizadas</li>
                <li>Paleta e fontes personalizáveis</li>
                <li>Créditos não expiram</li>
              </ul>
              <a
                href="/"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Comprar 20 créditos
              </a>
            </div>

            <div className="rounded-[28px] border border-orange-100 bg-white p-8 shadow-lg shadow-orange-100/60">
              <h3 className="font-display text-lg font-semibold">Créditos ilimitados</h3>
              <p className="mt-2 text-4xl font-semibold text-zinc-900">
                Sob consulta
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Para equipes e agências com grande volume.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-600">
                <li>Posts ilimitados</li>
                <li>Atendimento dedicado</li>
                <li>Onboarding personalizado</li>
                <li>Suporte prioritário</li>
              </ul>
              <a
                href="mailto:contato@plimpost.com"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                Falar com vendas
              </a>
            </div>
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-orange-100 bg-white p-10 shadow-sm">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                Pronto para acelerar seus posts?
              </h2>
              <p className="mt-3 text-base text-zinc-600">
                Comece agora e ganhe tempo no planejamento do seu conteúdo.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <a
                href="/"
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Começar agora
              </a>
              <a
                href="mailto:contato@plimpost.com"
                className="rounded-full border border-orange-200 px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                Falar com a equipe
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-orange-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">PlimPost</div>
            <p className="mt-2 text-sm text-zinc-500">
              Gerador de posts para Instagram, Facebook e LinkedIn.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#recursos" className="hover:text-zinc-900">
              Recursos
            </a>
            <a href="#precos" className="hover:text-zinc-900">
              Preços
            </a>
            <a href="mailto:contato@plimpost.com" className="hover:text-zinc-900">
              contato@plimpost.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
