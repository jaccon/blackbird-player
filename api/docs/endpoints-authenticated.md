# Endpoints — Rotas Autenticadas

Todas as rotas abaixo requerem autenticação via `client_id` e `client_secret`. Consulte [Autenticação](./authentication.md) para detalhes.

---

## `POST /api/files/publish`

Upload e publicação de um arquivo. O arquivo é enviado via `multipart/form-data`.

### Headers

```http
x-client-id: blackbird_client_2024
x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
Content-Type: multipart/form-data
```

### Body (multipart/form-data)

| Campo | Tipo | Obrigatório | Default | Descrição |
|-------|------|:-----------:|---------|-----------|
| `file` | file | **Sim** | — | O arquivo a ser enviado |
| `title` | string | **Sim** | — | Título do arquivo |
| `category` | string | Não | `general` | Categoria do arquivo |
| `status` | string | Não | `published` | Status inicial: `draft`, `published`, `archived` |

### Exemplo de Requisição

```bash
curl -X POST http://localhost:3000/api/files/publish \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -F "title=Relatório Financeiro Q1" \
  -F "category=reports" \
  -F "status=published" \
  -F "file=@/caminho/relatorio-q1.pdf"
```

### Resposta `201`

```json
{
  "message": "File published successfully",
  "file": {
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Relatório Financeiro Q1",
    "original_name": "relatorio-q1.pdf",
    "mimetype": "application/pdf",
    "size": 1048576,
    "size_formatted": "1.00 MB",
    "status": "published",
    "category": "reports",
    "download_url": "http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download"
  }
}
```

### Erros Possíveis

| Código | Causa | Resposta |
|--------|-------|----------|
| `400` | Arquivo não enviado | `{ "error": "No file uploaded" }` |
| `400` | Título ausente | `{ "error": "Title is required" }` |
| `400` | Status inválido | `{ "error": "Invalid status. Must be one of: draft, published, archived" }` |
| `401` | Credenciais ausentes | `{ "error": "Authentication required" }` |
| `403` | Credenciais inválidas | `{ "error": "Forbidden" }` |
| `413` | Arquivo excede limite | `{ "error": "File too large" }` |

### Comportamento de Upload

- O arquivo é salvo em `uploads/<category>/<uuid>.<extensão>`
- O UUID do arquivo é gerado automaticamente
- A extensão original é preservada
- Se o upload falhar na validação, o arquivo é removido do disco automaticamente

---

## `PUT /api/files/:uuid`

Atualiza os metadados de um arquivo existente. Não substitui o arquivo físico.

### Headers

```http
x-client-id: blackbird_client_2024
x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
Content-Type: application/json
```

### Parâmetros de URL

| Param | Tipo | Descrição |
|-------|------|-----------|
| `uuid` | string | UUID do arquivo |

### Body (JSON)

Todos os campos são opcionais. Apenas os campos enviados serão atualizados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `title` | string | Novo título |
| `status` | string | Novo status: `draft`, `published`, `archived` |
| `category` | string | Nova categoria |

### Exemplo de Requisição

```bash
# Atualizar título e status
curl -X PUT http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -H "Content-Type: application/json" \
  -d '{"title": "Relatório Atualizado", "status": "archived"}'
```

### Resposta `200`

```json
{
  "message": "File updated successfully",
  "file": {
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Relatório Atualizado",
    "filepath": "uploads/reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "original_name": "relatorio-q1.pdf",
    "mimetype": "application/pdf",
    "size": 1048576,
    "status": "archived",
    "category": "reports",
    "created_at": "2024-01-15 10:30:00",
    "updated_at": "2024-01-15 14:22:00"
  }
}
```

### Erros Possíveis

| Código | Causa | Resposta |
|--------|-------|----------|
| `400` | Status inválido | `{ "error": "Invalid status..." }` |
| `401` | Credenciais ausentes | `{ "error": "Authentication required" }` |
| `403` | Credenciais inválidas | `{ "error": "Forbidden" }` |
| `404` | Arquivo não encontrado | `{ "error": "File not found" }` |

---

## `DELETE /api/files/:uuid`

Remove um arquivo do banco de dados **e** do disco.

### Headers

```http
x-client-id: blackbird_client_2024
x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
```

### Parâmetros de URL

| Param | Tipo | Descrição |
|-------|------|-----------|
| `uuid` | string | UUID do arquivo |

### Exemplo de Requisição

```bash
curl -X DELETE http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"
```

### Resposta `200`

```json
{
  "message": "File deleted successfully",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Erros Possíveis

| Código | Causa | Resposta |
|--------|-------|----------|
| `401` | Credenciais ausentes | `{ "error": "Authentication required" }` |
| `403` | Credenciais inválidas | `{ "error": "Forbidden" }` |
| `404` | Arquivo não encontrado | `{ "error": "File not found" }` |

> ⚠️ **Atenção:** Esta ação é irreversível. O arquivo é removido permanentemente do disco e do banco de dados.
