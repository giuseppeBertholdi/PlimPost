# Guia de Deploy - PlimPost

## ⚠️ IMPORTANTE: Atualizar Price IDs do Stripe

Os `price_id` atuais são de **TESTE**. Para produção:

1. Criar produtos no Stripe Dashboard (modo **Live**)
2. Obter os novos `price_id` de produção
3. Adicionar variáveis de ambiente:
   - `STRIPE_PRICE_ID_1_CREDIT` (ou atualizar diretamente no código)
   - `STRIPE_PRICE_ID_20_CREDITS` (ou atualizar diretamente no código)
4. Ou atualizar diretamente em `app/api/checkout/route.ts`

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` (ou configure no seu provedor de hospedagem) com as seguintes variáveis:

### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### Google Gemini API
```env
GEMINI_API_KEY=sua_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash
GEMINI_CAPTION_MODEL=gemini-2.5-flash
```

### Google Fonts API (opcional)
```env
NEXT_PUBLIC_GOOGLE_FONTS_API_KEY=sua_google_fonts_api_key
```

### Stripe (Produção)
```env
STRIPE_SECRET_KEY=sk_live_sua_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_sua_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret
# Opcional: Price IDs via variáveis de ambiente (ou atualizar no código)
STRIPE_PRICE_ID_1_CREDIT=price_XXXXX_producao
STRIPE_PRICE_ID_20_CREDITS=price_XXXXX_producao
```

### App URL
```env
NEXT_PUBLIC_APP_URL=https://plimpost.com
```

## Configurações do Supabase

### 1. Executar Migrações SQL

Execute os seguintes arquivos SQL no Supabase (na ordem):

1. `supabase/onboarding.sql`
2. `supabase/brand_font.sql`
3. `supabase/brand_fonts_title_text.sql`
4. `supabase/onboarding_update.sql`
5. `supabase/posts.sql`
6. `supabase/storage_buckets.sql`
7. `supabase/storage_policies.sql`
8. `supabase/credits.sql` ⚠️ **IMPORTANTE: Execute este para o sistema de créditos funcionar**

### 2. Configurar Storage Buckets

Os buckets `logos` e `posts` devem ser criados automaticamente pelo SQL, mas verifique:
- Bucket `logos`: público, limite de 5MB
- Bucket `posts`: público, limite de 10MB

## Configurações do Stripe

### 1. Criar Produtos e Preços

Os seguintes preços já estão configurados (teste):
- 1 crédito: `price_1T0hkLIPOqSQAIzU71sTiTUK` (R$ 3,99)
- 20 créditos: `price_1T0hoXIPOqSQAIzUvkZe5Qsl` (R$ 69,99)

**Para produção**, você precisará:
1. Criar novos produtos no Stripe Dashboard (modo Live)
2. Obter os novos `price_id` dos produtos de produção
3. Atualizar os `price_id` no arquivo `app/api/checkout/route.ts`

### 2. Configurar Webhook

1. Acesse o Stripe Dashboard → Developers → Webhooks
2. Clique em "Add endpoint"
3. URL do endpoint: `https://plimpost.com/api/webhooks/stripe`
4. Selecione os eventos:
   - `checkout.session.completed`
5. Copie o "Signing secret" e adicione como `STRIPE_WEBHOOK_SECRET`

## Configurações do Google Gemini

1. Obtenha uma API Key no [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Configure as variáveis de ambiente conforme acima
3. Verifique os limites de quota da sua conta

## Build e Deploy

### Build Local (teste)
```bash
npm run build
npm start
```

### Deploy no Vercel (recomendado)

1. Conecte seu repositório GitHub ao Vercel
2. Configure todas as variáveis de ambiente no painel do Vercel
3. Deploy automático será feito a cada push

### Deploy Manual

```bash
npm run build
npm start
```

## Checklist de Produção

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Migrações SQL executadas no Supabase
- [ ] Storage buckets configurados
- [ ] Stripe configurado com chaves de produção
- [ ] Webhook do Stripe configurado
- [ ] Preços de produção criados no Stripe
- [ ] `price_id` atualizados no código (se necessário)
- [ ] `NEXT_PUBLIC_APP_URL` configurado como `https://plimpost.com`
- [ ] Domínio configurado (DNS apontando para o servidor)
- [ ] SSL/HTTPS configurado
- [ ] Testar fluxo completo: login → gerar post → comprar créditos

## Troubleshooting

### Webhook não funciona
- Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- Verifique se a URL do webhook está acessível publicamente
- Verifique os logs do Stripe Dashboard

### Créditos não são adicionados
- Verifique se a função `add_user_credits` existe no Supabase
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada
- Verifique os logs do webhook

### Imagens não são geradas
- Verifique se `GEMINI_API_KEY` está configurada
- Verifique a quota da API do Gemini
- Verifique os logs da API `/api/generate`

