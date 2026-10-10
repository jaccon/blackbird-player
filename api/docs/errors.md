# Códigos de Erro

## Visão Geral

A API retorna erros no formato JSON com os campos `error` (código/categoria) e `message` (detalhes, quando disponível).

```json
{
  "error": "Código do erro",
  "message": "Detalhes adicionais (quando disponível)"
}
```

---

## Erros HTTP

### `400` — Bad Request

Requisição inválida. Verifique os campos obrigatórios e valores.

| Cenário | Resposta |
|---------|----------|
| Arquivo não enviado no upload | `{ "error": "No file uploaded" }` |
| Título ausente no upload | `{ "error": "Title is required" }` |
| Status inválido | `{ "error": "Invalid status. Must be one of: draft, published, archived" }` |

---

### `401` — Unauthorized

Credenciais de autenticação não enviadas.

```json
{
  "error": "Authentication required",
  "message": "Missing client_id or client_secret"
}
```

**Solução:** Envie `x-client-id` e `x-client-secret` nos headers.

---

### `403` — Forbidden

Credenciais inválidas ou arquivo não disponível para download.

| Cenário | Resposta |
|---------|----------|
| Credenciais erradas | `{ "error": "Forbidden", "message": "Invalid client_id or client_secret" }` |
| Download de arquivo não publicado | `{ "error": "File is not available for download" }` |

---

### `404` — Not Found

Recurso não encontrado.

| Cenário | Resposta |
|---------|----------|
| UUID não existe | `{ "error": "File not found" }` |
| Arquivo removido do disco | `{ "error": "File not found on disk" }` |
| Rota inexistente | `{ "error": "Route not found" }` |

---

### `413` — Payload Too Large

Arquivo excede o tamanho máximo permitido.

```json
{
  "error": "File too large",
  "message": "Maximum file size is 52428800 bytes"
}
```

**Solução:** Reduza o tamanho do arquivo ou aumente `MAX_FILE_SIZE` no `.env`.

---

### `500` — Internal Server Error

Erro inesperado no servidor.

```json
{
  "error": "Internal server error"
}
```

**Solução:** Verifique os logs do servidor para detalhes.

---

## Tabela Resumo

| Código | Status | Descrição |
|:------:|--------|-----------|
| `200` | OK | Requisição bem-sucedida |
| `201` | Created | Arquivo publicado com sucesso |
| `400` | Bad Request | Campos obrigatórios ausentes ou valores inválidos |
| `401` | Unauthorized | Credenciais não enviadas |
| `403` | Forbidden | Credenciais inválidas ou acesso negado |
| `404` | Not Found | Recurso não encontrado |
| `413` | Payload Too Large | Arquivo excede o limite de tamanho |
| `500` | Internal Server Error | Erro interno do servidor |
