# Workers

Este diretório contém workers para processar jobs em background.

## process-jobs.ts

Worker principal que processa jobs de geração de posts.

### Como rodar

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Rodar worker
npm run worker

# Rodar em modo watch (desenvolvimento)
npm run worker:watch
```

### Variáveis de ambiente necessárias

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_MODEL` (opcional)
- `OPENAI_IMAGE_MODEL` (opcional)
- `GEMINI_CAPTION_MODEL` (opcional)

### Como funciona

1. Busca jobs com status `pending` no banco
2. Marca como `processing`
3. Processa o job (texto + imagem + legenda)
4. Atualiza status para `completed` ou `failed`
5. Repete a cada 5 segundos

### Deploy

Veja `WORKER_SETUP.md` na raiz do projeto para instruções de deploy em Railway, Render ou VPS.

