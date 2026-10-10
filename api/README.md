# 🐦‍⬛ BlackBird File API

API REST em Node.js com SQLite para upload e gerenciamento de arquivos.

## Instalação

```bash
npm install
```

## Configuração

Edite o arquivo `.env`:

```env
PORT=3000
CLIENT_ID=blackbird_client_2024
CLIENT_SECRET=sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
DB_PATH=./data/blackbird.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

## Executar

```bash
# Produção
npm start

# Desenvolvimento (auto-reload)
npm run dev
```

> **Nota:** Requer Node.js >= 22. Use `nvm use` para ativar a versão correta.

---

## Endpoints

### 🔓 Rotas Públicas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Informações da API |
| `GET` | `/health` | Health check |
| `GET` | `/api/files` | Listar arquivos publicados |
| `GET` | `/api/files/:uuid` | Detalhes de um arquivo |
| `GET` | `/api/files/:uuid/download` | Download de um arquivo |
| `GET` | `/api/categories` | Listar categorias |

#### Query Parameters (`GET /api/files`)

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `category` | string | — | Filtrar por categoria |
| `status` | string | `published` | Filtrar por status |
| `search` | string | — | Busca por título |
| `page` | number | `1` | Página |
| `limit` | number | `20` | Itens por página (max: 100) |

### 🔒 Rotas Autenticadas

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/files/publish` | Upload e publicação de arquivo |
| `PUT` | `/api/files/:uuid` | Atualizar metadados |
| `DELETE` | `/api/files/:uuid` | Excluir arquivo |

---

## Autenticação

Envie as credenciais via **headers** (recomendado):

```
x-client-id: blackbird_client_2024
x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c
```

Também aceita via body (`client_id`, `client_secret`) ou query params.

---

## Exemplos (cURL)

### Publicar um arquivo

```bash
curl -X POST http://localhost:3000/api/files/publish \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -F "title=Meu Documento" \
  -F "category=documents" \
  -F "status=published" \
  -F "file=@/caminho/do/arquivo.pdf"
```

### Listar arquivos

```bash
curl http://localhost:3000/api/files
curl http://localhost:3000/api/files?category=documents&search=doc
```

### Atualizar metadados

```bash
curl -X PUT http://localhost:3000/api/files/{uuid} \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -H "Content-Type: application/json" \
  -d '{"title": "Novo Título", "status": "archived"}'
```

### Excluir arquivo

```bash
curl -X DELETE http://localhost:3000/api/files/{uuid} \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"
```

---

## Estrutura

```
api/
├── server.js              # Entry point
├── .env                   # Configuração
├── .nvmrc                 # Versão do Node
├── src/
│   ├── database/
│   │   └── db.js          # SQLite setup + schema
│   ├── middleware/
│   │   └── auth.js        # Autenticação client_id/secret
│   └── routes/
│       └── files.js       # Rotas de arquivos
├── uploads/               # Arquivos enviados
└── data/                  # Banco SQLite
```

## Status válidos

- `draft` — Rascunho (não disponível para download)
- `published` — Publicado (disponível)
- `archived` — Arquivado
