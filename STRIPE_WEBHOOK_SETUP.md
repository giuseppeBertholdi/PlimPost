# Configuração do Webhook do Stripe

## Para desenvolvimento local (Stripe CLI)

1. **Instalar Stripe CLI** (se ainda não tiver):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Linux
   # Baixe de https://github.com/stripe/stripe-cli/releases
   ```

2. **Autenticar no Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Iniciar o encaminhamento de webhooks**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copiar o webhook secret** que aparece no terminal (começa com `whsec_`)

5. **Adicionar ao `.env.local`**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_... (o valor que você copiou)
   ```

6. **Reiniciar o servidor Next.js** para carregar a nova variável de ambiente

## Verificar se está funcionando

1. Faça uma compra de teste na página `/creditos`
2. Verifique os logs no terminal do Stripe CLI - você deve ver eventos sendo recebidos
3. Verifique os logs no terminal do Next.js - você deve ver logs começando com `[Webhook]`
4. Verifique se os créditos foram adicionados na página `/creditos`

## Troubleshooting

### Webhook não está recebendo eventos
- Certifique-se de que o Stripe CLI está rodando com `stripe listen`
- Verifique se a URL está correta: `localhost:3000/api/webhooks/stripe`
- Verifique se o servidor Next.js está rodando na porta 3000

### Erro "Webhook signature verification failed"
- Certifique-se de que o `STRIPE_WEBHOOK_SECRET` no `.env.local` está correto
- Use o webhook secret que aparece quando você roda `stripe listen`
- Reinicie o servidor Next.js após adicionar/alterar a variável

### Créditos não estão sendo adicionados
- Verifique os logs do webhook no terminal do Next.js
- Verifique se a função `add_user_credits` existe no Supabase
- Verifique se o SQL em `supabase/credits.sql` foi executado
- Verifique se o `SUPABASE_SERVICE_ROLE_KEY` está configurado no `.env.local`

### Verificar logs
Os logs do webhook começam com `[Webhook]` e mostram:
- Quando um evento é recebido
- Dados extraídos da sessão
- Se houve erros ao adicionar créditos
- Confirmação quando créditos são adicionados com sucesso


