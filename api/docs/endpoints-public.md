# Endpoints — Rotas Públicas

Rotas públicas não requerem autenticação.

---

## `GET /`

Retorna informações sobre a API e lista de endpoints disponíveis.

**Resposta `200`:**

```json
{
  "name": "BlackBird File API",
  "version": "1.0.0",
  "endpoints": {
    "GET /health": "Health check",
    "GET /api/files": "List published files",
    "GET /api/files/:uuid": "Get file details by UUID",
    "GET /api/files/:uuid/download": "Download a file by UUID",
    "GET /api/categories": "List file categories",
    "POST /api/files/publish": "Upload and publish a file (authenticated)",
    "PUT /api/files/:uuid": "Update file metadata (authenticated)",
    "DELETE /api/files/:uuid": "Delete a file (authenticated)"
  },
  "authentication": { ... }
}
```

---

## `GET /health`

Health check do serviço.

**Resposta `200`:**

```json
{
  "status": "ok",
  "service": "BlackBird File API",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## `GET /api/files`

Lista arquivos com paginação, filtros e busca.

### Query Parameters

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `status` | string | `published` | Filtrar por status: `draft`, `published`, `archived` |
| `category` | string | — | Filtrar por categoria |
| `search` | string | — | Busca parcial no título (case-insensitive) |
| `page` | number | `1` | Número da página |
| `limit` | number | `20` | Itens por página (min: 1, max: 100) |

### Exemplos de Requisição

```bash
# Listar todos os publicados
curl http://localhost:3000/api/files

# Filtrar por categoria
curl http://localhost:3000/api/files?category=documents

# Buscar por título
curl http://localhost:3000/api/files?search=relatorio

# Combinar filtros com paginação
curl "http://localhost:3000/api/files?category=images&page=2&limit=10"

# Listar rascunhos
curl http://localhost:3000/api/files?status=draft
```

### Resposta `200`

```json
{
  "data": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Relatório Mensal",
      "filepath": "uploads/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
      "original_name": "relatorio-janeiro.pdf",
      "mimetype": "application/pdf",
      "size": 245760,
      "status": "published",
      "category": "documents",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00",
      "download_url": "http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download",
      "size_formatted": "240.00 KB"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### Campos do Objeto File

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `uuid` | string | Identificador único do arquivo |
| `title` | string | Título definido pelo usuário |
| `filepath` | string | Caminho relativo no servidor |
| `original_name` | string | Nome original do arquivo enviado |
| `mimetype` | string | Tipo MIME do arquivo |
| `size` | number | Tamanho em bytes |
| `status` | string | Status atual: `draft`, `published`, `archived` |
| `category` | string | Categoria do arquivo |
| `created_at` | string | Data de criação (UTC) |
| `updated_at` | string | Data da última atualização (UTC) |
| `download_url` | string | URL completa para download |
| `size_formatted` | string | Tamanho formatado (ex: "240.00 KB") |

---

## `GET /api/files/:uuid`

Retorna os detalhes de um arquivo específico.

### Parâmetros de URL

| Param | Tipo | Descrição |
|-------|------|-----------|
| `uuid` | string | UUID do arquivo |

### Resposta `200`

```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Relatório Mensal",
  "filepath": "uploads/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
  "original_name": "relatorio-janeiro.pdf",
  "mimetype": "application/pdf",
  "size": 245760,
  "status": "published",
  "category": "documents",
  "created_at": "2024-01-15 10:30:00",
  "updated_at": "2024-01-15 10:30:00",
  "download_url": "http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download",
  "size_formatted": "240.00 KB"
}
```

### Resposta `404`

```json
{
  "error": "File not found"
}
```

---

## `GET /api/files/:uuid/download`

Faz o download de um arquivo. Somente arquivos com status `published` podem ser baixados.

### Parâmetros de URL

| Param | Tipo | Descrição |
|-------|------|-----------|
| `uuid` | string | UUID do arquivo |

### Respostas

| Código | Descrição |
|--------|-----------|
| `200` | Retorna o arquivo como download (Content-Disposition: attachment) |
| `403` | Arquivo não está publicado |
| `404` | Arquivo não encontrado |

### Exemplo

```bash
# Download via cURL
curl -O -J http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download

# Download via wget
wget http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download
```

---

## `GET /api/categories`

Lista todas as categorias que possuem arquivos publicados, com a contagem de arquivos em cada uma.

### Resposta `200`

```json
{
  "data": [
    { "category": "documents", "count": 15 },
    { "category": "images", "count": 42 },
    { "category": "videos", "count": 7 }
  ]
}
```
