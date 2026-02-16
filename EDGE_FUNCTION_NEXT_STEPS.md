# 🚀 Próximos Passos - Edge Function

## ✅ Status Atual

- ✅ Função `process-jobs` deployada
- ✅ `GEMINI_API_KEY` configurada como secret
- ⚠️ `OPENAI_API_KEY` precisa ser configurada
- ⚠️ Cron job precisa ser configurado

## 📋 Passo 1: Configurar OPENAI_API_KEY

Se você já tem a chave da OpenAI, configure assim:

```bash
supabase secrets set OPENAI_API_KEY="sua-chave-openai-aqui"
```

**Onde obter a chave:**
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova chave ou use uma existente
3. Cole no comando acima

## 📋 Passo 2: Configurar Cron Job

O cron job vai executar a função automaticamente a cada minuto.

### Opção A: Via SQL Editor (Recomendado)

1. Acesse o SQL Editor do Supabase:
   https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/sql/new

2. Cole e execute o seguinte SQL:

```sql
-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover cron job existente (se houver)
SELECT cron.unschedule('process-jobs-cron') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-jobs-cron'
);

-- Criar cron job para executar a função a cada minuto
SELECT cron.schedule(
  'process-jobs-cron',
  '* * * * *',  -- A cada 1 minuto
  $$
  SELECT net.http_post(
    url := 'https://tawyxrwvffjumhdrshdd.supabase.co/functions/v1/process-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'process-jobs-cron';
```

**⚠️ IMPORTANTE:** Se o `current_setting('app.settings.service_role_key')` não funcionar, você precisará:

1. Obter sua `SUPABASE_SERVICE_ROLE_KEY` do dashboard:
   https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/settings/api

2. Usar diretamente no SQL (substitua `SUA_SERVICE_ROLE_KEY`):

```sql
SELECT cron.schedule(
  'process-jobs-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tawyxrwvffjumhdrshdd.supabase.co/functions/v1/process-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY_AQUI'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Opção B: Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/database/cron
2. Clique em "New Cron Job"
3. Configure:
   - **Name**: `process-jobs-cron`
   - **Schedule**: `* * * * *` (a cada minuto)
   - **Command**: Use o SQL acima

## 🧪 Passo 3: Testar

### Testar a função manualmente:

```bash
# Via CLI
supabase functions invoke process-jobs

# Ou via curl (substitua SUA_SERVICE_ROLE_KEY)
curl -X POST https://tawyxrwvffjumhdrshdd.supabase.co/functions/v1/process-jobs \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Verificar logs:

```bash
supabase functions logs process-jobs --tail
```

### Verificar no banco:

```sql
SELECT id, status, created_at, started_at, completed_at, error_message
FROM generation_jobs 
ORDER BY created_at DESC 
LIMIT 5;
```

## ✅ Checklist Final

- [ ] `OPENAI_API_KEY` configurada como secret
- [ ] Cron job configurado e rodando
- [ ] Função testada manualmente (retorna 200 OK)
- [ ] Job criado no frontend e processado com sucesso
- [ ] Frontend recebendo resultado via polling

## 🔍 Troubleshooting

### Erro "Unauthorized" ao chamar a função
- Verifique se o `Authorization` header está usando a `SUPABASE_SERVICE_ROLE_KEY` correta
- A chave deve começar com `eyJ...`

### Cron job não está executando
- Verifique se a extensão `pg_cron` está habilitada
- Verifique os logs do cron: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-jobs-cron');`

### Jobs ficam em "pending"
- Verifique se o cron job está rodando
- Verifique os logs da função: `supabase functions logs process-jobs`
- Teste a função manualmente para ver se há erros

### Erro "GEMINI_API_KEY não configurada" ou "OPENAI_API_KEY não configurada"
- Verifique se os secrets estão configurados: `supabase secrets list`
- Se não estiverem, configure: `supabase secrets set NOME_DA_KEY="valor"`

---

**Pronto! Seu sistema de background jobs está configurado! 🎉**

