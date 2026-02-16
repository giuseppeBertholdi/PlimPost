# ✅ Edge Function - Passos Finais

## 🎉 Status: Função Deployada!

A função `process-jobs` foi deployada com sucesso.

## 📋 Próximos Passos (2 minutos)

### 1. Configurar OPENAI_API_KEY

```bash
supabase secrets set OPENAI_API_KEY="sua-chave-openai"
```

**Onde encontrar**: Dashboard do Supabase → Project Settings → Edge Functions → Secrets

### 2. Configurar Cron Job (SQL Editor)

1. Acesse: https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/sql/new
2. Execute este SQL:

```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar cron job (executa a cada minuto)
SELECT cron.schedule(
  'process-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tawyxrwvffjumhdrshdd.supabase.co/functions/v1/process-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 3. Testar

1. **Criar um post** no frontend
2. **Aguardar 1-2 minutos** (cron executa a cada minuto)
3. **Verificar** se o job foi processado:
   ```sql
   SELECT id, status, created_at, completed_at 
   FROM generation_jobs 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

### 4. Ver Logs

```bash
supabase functions logs process-jobs --tail
```

Ou no Dashboard: https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/functions/process-jobs

## ✅ Pronto!

Agora o sistema está completo:
- ✅ Frontend cria jobs
- ✅ Frontend faz polling
- ✅ Edge Function processa jobs (via cron)
- ✅ Frontend recebe resultados

**Teste criando um post! 🚀**

