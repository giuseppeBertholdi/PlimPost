# ✅ Edge Function - Setup Completo

## 🎉 Status Atual

✅ **Função deployada**: `process-jobs`  
✅ **Projeto linkado**: `tawyxrwvffjumhdrshdd`  
✅ **GEMINI_API_KEY**: Configurada  
⚠️ **OPENAI_API_KEY**: Precisa configurar  
⚠️ **Cron Job**: Precisa configurar  

## 📋 Próximos Passos

### 1. Configurar OPENAI_API_KEY

```bash
supabase secrets set OPENAI_API_KEY="sua-openai-key-aqui"
```

### 2. Configurar Cron Job

Execute o script SQL no **SQL Editor do Supabase**:

1. Acesse: https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/sql/new
2. Cole o conteúdo de `supabase/cron_setup.sql`
3. Execute o script

Ou execute diretamente:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

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

```bash
# Testar função manualmente
supabase functions invoke process-jobs

# Ou via curl
curl -X POST https://tawyxrwvffjumhdrshdd.supabase.co/functions/v1/process-jobs \
  -H "Authorization: Bearer sua-anon-key" \
  -H "Content-Type: application/json"
```

### 4. Verificar Logs

```bash
supabase functions logs process-jobs --tail
```

## 🔍 Verificar se Está Funcionando

1. **Criar um post** no frontend
2. **Verificar no banco**:
   ```sql
   SELECT id, status, created_at, started_at, completed_at 
   FROM generation_jobs 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. **Ver logs** da função para ver o processamento

## ✅ Checklist Final

- [ ] OPENAI_API_KEY configurada
- [ ] Cron job configurado
- [ ] Função testada manualmente
- [ ] Job criado e processado com sucesso
- [ ] Frontend recebendo resultado via polling

---

**Parabéns! Seu sistema está quase completo! 🚀**

Falta apenas configurar o cron job e testar.

