# 🚀 Supabase Edge Function - Setup Completo

## 📋 Visão Geral

Esta é uma **alternativa ao worker externo** usando Supabase Edge Functions. A função roda no próprio Supabase e pode ser executada via cron job.

## ✅ Vantagens

- ✅ **Integrado ao Supabase** - Não precisa de serviço externo
- ✅ **Escala automaticamente** - Supabase gerencia infraestrutura
- ✅ **Grátis até certo limite** - Plano gratuito inclui edge functions
- ✅ **Fácil deploy** - Um comando e está no ar
- ✅ **Logs integrados** - Tudo no dashboard

## ⚠️ Limitações

- ⚠️ **Timeout**: 60s (gratuito) ou 300s (pago)
- ⚠️ **Concorrência**: Processa até 3 jobs por execução
- ⚠️ **Custo**: Pode ter custos em alta escala

## 🚀 Setup Rápido

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login

```bash
supabase login
```

### 3. Link ao Projeto

```bash
# Encontre o project-ref na URL do seu projeto Supabase
# Exemplo: https://abcdefghijklmnop.supabase.co
# O project-ref é: abcdefghijklmnop

supabase link --project-ref seu-project-ref
```

### 4. Deploy da Função

```bash
cd supabase/functions/process-jobs
supabase functions deploy process-jobs
```

### 5. Configurar Variáveis de Ambiente

```bash
supabase secrets set SUPABASE_URL=https://seu-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
supabase secrets set GEMINI_API_KEY=sua-gemini-key
supabase secrets set OPENAI_API_KEY=sua-openai-key

# Opcionais
supabase secrets set GEMINI_MODEL=gemini-1.5-flash
supabase secrets set OPENAI_IMAGE_MODEL=gpt-image-1
supabase secrets set GEMINI_CAPTION_MODEL=gemini-2.5-flash
```

### 6. Testar

```bash
supabase functions invoke process-jobs
```

## ⏰ Configurar Cron (Executar a Cada Minuto)

### Via SQL Editor

Execute no SQL Editor do Supabase:

```sql
-- Habilitar extensão pg_cron (se ainda não habilitou)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar cron job
SELECT cron.schedule(
  'process-jobs',           -- Nome do job
  '* * * * *',              -- A cada minuto (cron: minuto hora dia mês dia-semana)
  $$
  SELECT
    net.http_post(
      url := 'https://SEU-PROJECT-REF.supabase.co/functions/v1/process-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**⚠️ IMPORTANTE**: Substitua `SEU-PROJECT-REF` pelo seu project ref real!

### Verificar Cron Jobs

```sql
SELECT * FROM cron.job;
```

### Remover Cron Job

```sql
SELECT cron.unschedule('process-jobs');
```

## 🔧 Implementar Lógica Real

A função atual usa `generatePost()` como mock. Para implementar a lógica real:

1. **Copie o código** de `lib/process-job.ts`
2. **Adapte para Deno** (sem Node.js APIs como `Buffer`)
3. **Substitua a função `generatePost()`** em `supabase/functions/process-jobs/index.ts`

### Exemplo de Adaptação

**Node.js (process-job.ts)**:
```typescript
const imageBuffer = Buffer.from(imageBase64, 'base64');
```

**Deno (Edge Function)**:
```typescript
const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
```

## 📊 Monitoramento

### Ver Logs

```bash
supabase functions logs process-jobs --tail
```

### Ver no Dashboard

1. Acesse: https://supabase.com/dashboard/project/seu-project-ref/functions
2. Clique em `process-jobs`
3. Veja logs e métricas

### Verificar Jobs no Banco

```sql
-- Estatísticas gerais
SELECT 
  status,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM generation_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Jobs pendentes (deve estar baixo)
SELECT COUNT(*) FROM generation_jobs WHERE status = 'pending';

-- Jobs travados em processing (deve estar vazio)
SELECT COUNT(*) FROM generation_jobs 
WHERE status = 'processing' 
AND started_at < NOW() - INTERVAL '5 minutes';
```

## 🛠️ Troubleshooting

### Função não está sendo chamada

1. **Verificar cron**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-jobs';
   ```

2. **Verificar logs do cron**:
   - Dashboard → Database → Cron Jobs
   - Ver se há erros

3. **Testar manualmente**:
   ```bash
   supabase functions invoke process-jobs
   ```

### Jobs não estão sendo processados

1. **Verificar se há jobs pendentes**:
   ```sql
   SELECT COUNT(*) FROM generation_jobs WHERE status = 'pending';
   ```

2. **Verificar logs da função**:
   ```bash
   supabase functions logs process-jobs
   ```

3. **Verificar variáveis de ambiente**:
   ```bash
   supabase secrets list
   ```

### Erro de timeout

Se o processamento demorar mais de 60s (gratuito) ou 300s (pago):

1. **Dividir em etapas**: Processar texto e imagem separadamente
2. **Upgrade do plano**: Plano pago tem 300s de timeout
3. **Usar worker externo**: Para processamentos mais longos

### Erro de permissão

1. **Verificar service role key**:
   ```bash
   supabase secrets list
   ```

2. **Verificar RLS na tabela**:
   ```sql
   -- Service role deve poder atualizar
   SELECT * FROM pg_policies WHERE tablename = 'generation_jobs';
   ```

## 🔄 Comparação: Edge Function vs Worker Externo

| Aspecto | Edge Function | Worker Externo |
|---------|---------------|----------------|
| **Setup** | ✅ Mais fácil | ⚠️ Requer serviço externo |
| **Custo** | ✅ Grátis até limite | ⚠️ $5-10/mês |
| **Timeout** | ⚠️ 60s (gratuito) | ✅ Sem limite |
| **Escalabilidade** | ✅ Automática | ⚠️ Manual |
| **Logs** | ✅ Integrados | ⚠️ Separados |
| **Manutenção** | ✅ Zero | ⚠️ Precisa manter servidor |

## 📝 Próximos Passos

1. ✅ Deploy da função
2. ✅ Configurar cron job
3. ✅ Testar com um job real
4. ✅ Implementar lógica real de geração
5. ✅ Monitorar logs e métricas

## 🎯 Checklist

- [ ] Supabase CLI instalado
- [ ] Projeto linkado
- [ ] Função deployada
- [ ] Variáveis de ambiente configuradas
- [ ] Cron job configurado
- [ ] Testado manualmente
- [ ] Lógica real implementada
- [ ] Monitoramento configurado

---

**Parabéns! Seu sistema está completo com Edge Function! 🎉**

