# Process Jobs Edge Function

Supabase Edge Function para processar jobs de geração de posts em background.

## 🚀 Deploy

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

### 3. Link ao projeto

```bash
supabase link --project-ref seu-project-ref
```

Você encontra o `project-ref` na URL do seu projeto Supabase:
`https://seu-project-ref.supabase.co`

### 4. Deploy da função

```bash
supabase functions deploy process-jobs
```

### 5. Configurar variáveis de ambiente

```bash
supabase secrets set SUPABASE_URL=https://seu-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
supabase secrets set GEMINI_API_KEY=sua-gemini-key
supabase secrets set OPENAI_API_KEY=sua-openai-key
```

**Variáveis opcionais**:
```bash
supabase secrets set GEMINI_MODEL=gemini-1.5-flash
supabase secrets set OPENAI_IMAGE_MODEL=gpt-image-1
supabase secrets set GEMINI_CAPTION_MODEL=gemini-2.5-flash
```

### 6. Testar a função

```bash
# Via CLI
supabase functions invoke process-jobs

# Via curl
curl -X POST https://seu-project-ref.supabase.co/functions/v1/process-jobs \
  -H "Authorization: Bearer sua-anon-key" \
  -H "Content-Type: application/json"
```

## ⏰ Configurar Cron (Executar a cada minuto)

### Opção 1: Via Dashboard Supabase

1. Acesse: https://supabase.com/dashboard/project/seu-project-ref/database/cron
2. Clique em "New Cron Job"
3. Configure:
   - **Name**: `process-jobs`
   - **Schedule**: `* * * * *` (a cada minuto)
   - **SQL**:
   ```sql
   SELECT
     net.http_post(
       url := 'https://seu-project-ref.supabase.co/functions/v1/process-jobs',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
       ),
       body := '{}'::jsonb
     ) AS request_id;
   ```

### Opção 2: Via SQL Editor

Execute no SQL Editor do Supabase:

```sql
-- Criar extensão pg_cron (se ainda não criou)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar cron job
SELECT cron.schedule(
  'process-jobs',           -- Nome do job
  '* * * * *',              -- A cada minuto
  $$
  SELECT
    net.http_post(
      url := 'https://seu-project-ref.supabase.co/functions/v1/process-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Nota**: Substitua `seu-project-ref` pelo seu project ref real.

### Verificar cron jobs

```sql
SELECT * FROM cron.job;
```

### Remover cron job

```sql
SELECT cron.unschedule('process-jobs');
```

## 🔧 Implementar Lógica Real de Geração

Atualmente a função usa `generatePost()` como mock. Para implementar a lógica real:

1. **Copiar código de geração** de `lib/process-job.ts`
2. **Adaptar para Deno** (usar fetch nativo, sem Node.js APIs)
3. **Substituir a função `generatePost()`** no arquivo `index.ts`

Exemplo de estrutura:

```typescript
async function generatePost(payload: any): Promise<any> {
  // 1. Gerar texto
  const postText = await generateText(payload);
  
  // 2. Gerar imagem
  const imageUrl = await generateImage(payload, postText);
  
  // 3. Gerar legenda
  const caption = await generateCaption(payload, postText, imageUrl);
  
  return {
    post: caption,
    originalPost: postText,
    imageUrl: imageUrl,
    palette: payload.palette,
    businessName: payload.onboarding.business_name,
  };
}
```

## 📊 Monitoramento

### Ver logs

```bash
supabase functions logs process-jobs
```

### Ver jobs no banco

```sql
-- Jobs pendentes
SELECT COUNT(*) FROM generation_jobs WHERE status = 'pending';

-- Jobs em processamento
SELECT COUNT(*) FROM generation_jobs WHERE status = 'processing';

-- Jobs completados hoje
SELECT COUNT(*) FROM generation_jobs 
WHERE status = 'completed' 
AND completed_at::date = CURRENT_DATE;

-- Jobs falhos hoje
SELECT COUNT(*) FROM generation_jobs 
WHERE status = 'failed' 
AND completed_at::date = CURRENT_DATE;
```

## 🛠️ Troubleshooting

### Função não está sendo chamada

1. Verificar se o cron está configurado: `SELECT * FROM cron.job;`
2. Verificar logs do cron: Dashboard → Database → Cron Jobs
3. Testar função manualmente via CLI

### Jobs não estão sendo processados

1. Verificar se há jobs pendentes no banco
2. Verificar logs da função: `supabase functions logs process-jobs`
3. Verificar variáveis de ambiente: `supabase secrets list`

### Erro de permissão

1. Verificar se `SUPABASE_SERVICE_ROLE_KEY` está configurada
2. Verificar se a tabela `generation_jobs` permite updates com service role

## 💡 Vantagens do Edge Function vs Worker Externo

✅ **Integrado ao Supabase** - Não precisa de serviço externo  
✅ **Escala automaticamente** - Supabase gerencia a infraestrutura  
✅ **Grátis até certo limite** - Plano gratuito inclui edge functions  
✅ **Fácil deploy** - Um comando e está no ar  
✅ **Logs integrados** - Tudo no dashboard do Supabase  

## 📝 Notas

- Edge Functions têm timeout de 60 segundos (plano gratuito) ou 300 segundos (plano pago)
- Se o processamento demorar mais, considere dividir em múltiplas etapas
- Para processar mais de 3 jobs por vez, ajuste o `.limit(3)` no código

