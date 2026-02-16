# ⚡ Solução Rápida - Problema de Permissão Supabase

## 🔍 Problema

Você está recebendo erro de permissão ao fazer `supabase link`. Isso acontece quando:
- O projeto está em outra organização
- Você não tem permissão de admin no projeto
- O CLI está desatualizado

## ✅ Solução Mais Rápida: Worker Externo

**Recomendação**: Use o worker externo (Railway) que já está pronto e não depende de permissões do Supabase.

### Setup em 3 Passos:

1. **Railway**: https://railway.app → New Project → GitHub
2. **Configure**: Start Command = `npm run worker`
3. **Adicione variáveis de ambiente** (copie do seu `.env.local`)

**Pronto!** O worker vai processar jobs automaticamente.

---

## 🔧 Se Quiser Usar Edge Function

### Tentar Atualizar CLI e Relogar:

```bash
# Atualizar CLI
npm install -g supabase@latest

# Fazer logout e login novamente
supabase logout
supabase login

# Tentar link novamente
supabase link --project-ref tawyxrwvffjumhdrshdd
```

### Ou Deploy Manual:

1. Dashboard: https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/functions
2. Create function → Cole código de `supabase/functions/process-jobs/index.ts`
3. Configure secrets no dashboard
4. Configure cron (SQL Editor)

---

## 🎯 Minha Recomendação

**Use Railway Worker** - É mais simples, funciona imediatamente e você tem mais controle.

Veja `WORKER_SETUP.md` para instruções detalhadas.

