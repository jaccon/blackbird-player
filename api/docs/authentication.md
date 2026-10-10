# Autenticação

## Visão Geral

A BlackBird API utiliza autenticação baseada em **Client Credentials** (client_id + client_secret). Apenas rotas de escrita (publicar, atualizar, excluir) requerem autenticação. Rotas de leitura (listar, buscar, download) são públicas.

## Rotas que Requerem Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/files/publish` | Upload e publicação de arquivo |
| `PUT` | `/api/files/:uuid` | Atualizar metadados de arquivo |
| `DELETE` | `/api/files/:uuid` | Excluir arquivo |

## Como Enviar Credenciais

As credenciais podem ser enviadas de **3 formas** (em ordem de preferência):

### 1. Via Headers (Recomendado) ✅

```http
POST /api/files/publish HTTP/1.1
Host: localhost:3000
x-client-id: blackbird_client_2024
x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
Content-Type: multipart/form-data
```

```bash
curl -X POST http://localhost:3000/api/files/publish \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -F "title=Meu Arquivo" \
  -F "file=@arquivo.pdf"
```

### 2. Via Body (Form / JSON)

```bash
# Form data
curl -X POST http://localhost:3000/api/files/publish \
  -F "client_id=blackbird_client_2024" \
  -F "client_secret=sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -F "title=Meu Arquivo" \
  -F "file=@arquivo.pdf"
```

```bash
# JSON (para rotas sem upload)
curl -X PUT http://localhost:3000/api/files/{uuid} \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "blackbird_client_2024",
    "client_secret": "sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c",
    "title": "Novo Título"
  }'
```

### 3. Via Query Parameters

```bash
curl -X DELETE "http://localhost:3000/api/files/{uuid}?client_id=blackbird_client_2024&client_secret=sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"
```

> ⚠️ **Atenção:** Query parameters expõem as credenciais na URL e em logs de servidor. Use apenas para testes.

## Respostas de Erro

### 401 — Credenciais Ausentes

Retornado quando `client_id` ou `client_secret` não são enviados.

```json
{
  "error": "Authentication required",
  "message": "Missing client_id or client_secret"
}
```

### 403 — Credenciais Inválidas

Retornado quando `client_id` ou `client_secret` estão incorretos.

```json
{
  "error": "Forbidden",
  "message": "Invalid client_id or client_secret"
}
```

## Segurança

### Timing-Safe Comparison

O middleware de autenticação utiliza `crypto.timingSafeEqual()` para comparar credenciais, prevenindo **timing attacks** que poderiam deduzir o valor correto medindo o tempo de resposta.

### Boas Práticas

| Prática | Descrição |
|---------|-----------|
| Altere as credenciais padrão | Nunca use os valores do `.env.example` em produção |
| Use HTTPS | Em produção, sempre use HTTPS para proteger as credenciais em trânsito |
| Headers sobre Query Params | Prefira enviar via headers para evitar exposição em logs |
| Rotação de chaves | Altere periodicamente o `CLIENT_SECRET` |
| `.env` no `.gitignore` | Nunca commite o arquivo `.env` |

## Configuração das Credenciais

As credenciais são definidas no arquivo `.env`:

```env
CLIENT_ID=seu_client_id_aqui
CLIENT_SECRET=sua_chave_secreta_aqui
```

Para gerar uma chave secreta segura:

```bash
node -e "console.log('sk_bb_' + require('crypto').randomBytes(24).toString('hex'))"
```
