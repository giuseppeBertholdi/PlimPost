# 📦 Instalar Supabase CLI (Métodos Oficiais)

O Supabase CLI não pode ser instalado via `npm install -g`. Use um dos métodos abaixo:

## Método 1: Via Homebrew (Linux/Mac)

```bash
brew install supabase/tap/supabase
```

## Método 2: Via Script de Instalação

```bash
curl -fsSL https://supabase.com/install.sh | sh
```

## Método 3: Via Binário Direto

```bash
# Linux
wget https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.deb
sudo dpkg -i supabase_linux_amd64.deb

# Ou baixar binário
wget https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64
chmod +x supabase_linux_amd64
sudo mv supabase_linux_amd64 /usr/local/bin/supabase
```

## ⚠️ Mas... Você Precisa Mesmo do CLI?

**Recomendação**: Use o **Worker Externo (Railway)** que é muito mais simples:

1. ✅ Não precisa instalar nada
2. ✅ Não precisa resolver permissões
3. ✅ Funciona imediatamente
4. ✅ Mais fácil de debugar

Veja `WORKER_SETUP.md` - é a solução mais rápida!

---

## Se Quiser Usar Edge Function Sem CLI

Você pode fazer deploy manual via Dashboard:

1. Acesse: https://supabase.com/dashboard/project/tawyxrwvffjumhdrshdd/functions
2. Create function → Cole o código
3. Configure secrets
4. Configure cron

Veja `EDGE_FUNCTION_DEPLOY_ALTERNATIVE.md` para detalhes.

