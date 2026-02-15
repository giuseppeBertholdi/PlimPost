export default function TermosUso() {
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
            Termos de Uso
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Última atualização: {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-zinc max-w-none space-y-6 text-sm leading-7 text-zinc-700 sm:text-base">
          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar e usar o PlimPost, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve usar nosso serviço.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              2. Descrição do Serviço
            </h2>
            <p>
              O PlimPost é uma plataforma que utiliza inteligência artificial para gerar posts profissionais para redes sociais, incluindo imagens e legendas personalizadas. O serviço é fornecido "como está" e está sujeito a alterações ou descontinuação a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              3. Cadastro e Conta de Usuário
            </h2>
            <p>Para usar o PlimPost, você deve:</p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Ter pelo menos 18 anos de idade ou ter autorização de um responsável legal</li>
              <li>Fornecer informações precisas e atualizadas durante o cadastro</li>
              <li>Manter a segurança de sua conta e senha</li>
              <li>Ser responsável por todas as atividades que ocorrem em sua conta</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              4. Uso Aceitável
            </h2>
            <p>Você concorda em NÃO:</p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Usar o serviço para qualquer propósito ilegal ou não autorizado</li>
              <li>Gerar conteúdo que viole direitos de terceiros, incluindo direitos autorais, marcas registradas ou privacidade</li>
              <li>Gerar conteúdo ofensivo, difamatório, discriminatório ou que promova violência</li>
              <li>Tentar acessar áreas restritas do serviço ou interferir em sua operação</li>
              <li>Reproduzir, duplicar ou revender o serviço sem autorização</li>
              <li>Usar bots, scripts ou métodos automatizados para acessar o serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              5. Propriedade Intelectual
            </h2>
            <p>
              O conteúdo gerado através do PlimPost, incluindo imagens e textos, pertence a você após a geração. No entanto, você é responsável por garantir que o conteúdo gerado não viole direitos de terceiros.
            </p>
            <p className="mt-4">
              A plataforma PlimPost, incluindo seu design, funcionalidades e tecnologia, é propriedade do PlimPost e protegida por leis de propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              6. Pagamentos e Créditos
            </h2>
            <p>
              O PlimPost opera com um sistema de créditos. Cada post gerado consome 1 crédito. Os créditos:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>São adquiridos através de pacotes pré-pagos</li>
              <li>Não expiram</li>
              <li>Não são reembolsáveis, exceto conforme exigido por lei</li>
              <li>Não podem ser transferidos entre contas</li>
            </ul>
            <p className="mt-4">
              Todos os pagamentos são processados através do Stripe e estão sujeitos aos termos e condições do Stripe.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              7. Limitação de Responsabilidade
            </h2>
            <p>
              O PlimPost é fornecido "como está" e "conforme disponível". Não garantimos que:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>O serviço será ininterrupto, seguro ou livre de erros</li>
              <li>Os resultados gerados atenderão às suas expectativas específicas</li>
              <li>Os erros serão corrigidos</li>
            </ul>
            <p className="mt-4">
              Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais ou consequenciais resultantes do uso ou incapacidade de usar o serviço.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              8. Modificações do Serviço
            </h2>
            <p>
              Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspecto do serviço a qualquer momento, com ou sem aviso prévio. Não seremos responsáveis perante você ou terceiros por qualquer modificação, suspensão ou descontinuação.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              9. Rescisão
            </h2>
            <p>
              Podemos encerrar ou suspender sua conta e acesso ao serviço imediatamente, sem aviso prévio, por qualquer motivo, incluindo se você violar estes Termos de Uso.
            </p>
            <p className="mt-4">
              Você pode encerrar sua conta a qualquer momento através das configurações da conta ou entrando em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              10. Lei Aplicável
            </h2>
            <p>
              Estes Termos de Uso são regidos pelas leis do Brasil. Qualquer disputa relacionada a estes termos será resolvida nos tribunais competentes do Brasil.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              11. Alterações nos Termos
            </h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. Alterações significativas serão notificadas através da plataforma ou por e-mail. O uso continuado do serviço após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-xl font-semibold text-zinc-900">
              12. Contato
            </h2>
            <p>
              Para questões sobre estes Termos de Uso, entre em contato conosco:
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

