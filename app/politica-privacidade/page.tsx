export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
          <a
            href="/"
            className="font-display text-base font-semibold text-zinc-900 sm:text-lg"
          >
            PlimPost
          </a>
          <a
            href="/"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:px-4 sm:py-2 sm:text-sm"
          >
            Voltar
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-zinc-900 sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Última atualização: {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-zinc max-w-none space-y-6 text-sm leading-7 text-zinc-700 sm:text-base">
          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              1. Informações que Coletamos
            </h2>
            <p>
              Coletamos informações que você nos fornece diretamente, incluindo:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Dados de cadastro (nome, e-mail) através do login com Google</li>
              <li>Informações sobre sua marca e negócio fornecidas durante o onboarding</li>
              <li>Conteúdo gerado (posts, imagens) que você cria na plataforma</li>
              <li>Informações de pagamento processadas através do Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              2. Como Usamos suas Informações
            </h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Fornecer e melhorar nossos serviços de geração de posts</li>
              <li>Processar pagamentos e gerenciar créditos</li>
              <li>Personalizar sua experiência na plataforma</li>
              <li>Enviar comunicações relacionadas ao serviço (quando necessário)</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              3. Compartilhamento de Informações
            </h2>
            <p>
              Não vendemos suas informações pessoais. Podemos compartilhar suas informações apenas nas seguintes situações:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>
                <strong>Prestadores de serviços:</strong> Utilizamos serviços de terceiros como Supabase (armazenamento de dados), Stripe (pagamentos) e Google Gemini (geração de conteúdo via IA)
              </li>
              <li>
                <strong>Obrigações legais:</strong> Quando exigido por lei ou para proteger nossos direitos
              </li>
              <li>
                <strong>Com seu consentimento:</strong> Em outras situações, apenas com sua autorização explícita
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              4. Segurança dos Dados
            </h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. No entanto, nenhum método de transmissão pela internet é 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              5. Seus Direitos
            </h2>
            <p>Você tem o direito de:</p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir informações incorretas</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar consentimentos quando aplicável</li>
              <li>Exportar seus dados</li>
            </ul>
            <p className="mt-4">
              Para exercer esses direitos, entre em contato conosco em{" "}
              <a href="mailto:giuseppe.bertholdi@gmail.com" className="text-orange-600 hover:underline">
                giuseppe.bertholdi@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              6. Cookies e Tecnologias Similares
            </h2>
            <p>
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma e personalizar conteúdo. Você pode gerenciar preferências de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              7. Retenção de Dados
            </h2>
            <p>
              Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos nesta política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              8. Alterações nesta Política
            </h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas publicando a nova política nesta página e atualizando a data de "Última atualização".
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              9. Contato
            </h2>
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco:
            </p>
            <p className="mt-2">
              <strong>E-mail:</strong>{" "}
              <a href="mailto:giuseppe.bertholdi@gmail.com" className="text-orange-600 hover:underline">
                giuseppe.bertholdi@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

