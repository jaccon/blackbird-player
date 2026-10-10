# Schema do Banco de Dados

A BlackBird API utiliza **SQLite** (via `better-sqlite3`) como banco de dados. O arquivo é armazenado em `data/blackbird.db` (configurável via `DB_PATH`).

## Configuração

- **WAL Mode** habilitado para melhor performance em leituras concorrentes
- **Foreign Keys** habilitado
- Banco criado automaticamente na primeira execução

## Tabela: `files`

```sql
CREATE TABLE IF NOT EXISTS files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid        TEXT    UNIQUE NOT NULL,
  title       TEXT    NOT NULL,
  filepath    TEXT    NOT NULL,
  original_name TEXT  NOT NULL,
  mimetype    TEXT,
  size        INTEGER,
  status      TEXT    NOT NULL DEFAULT 'draft',
  category    TEXT    NOT NULL DEFAULT 'general',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

## Campos

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|:--------:|---------|-----------|
| `id` | INTEGER | Não | AUTO | Chave primária auto-incremento |
| `uuid` | TEXT | Não | — | Identificador único (UUIDv4), usado nas URLs |
| `title` | TEXT | Não | — | Título do arquivo definido pelo usuário |
| `filepath` | TEXT | Não | — | Caminho relativo do arquivo no disco |
| `original_name` | TEXT | Não | — | Nome original do arquivo enviado |
| `mimetype` | TEXT | Sim | `NULL` | Tipo MIME detectado (ex: `application/pdf`) |
| `size` | INTEGER | Sim | `NULL` | Tamanho do arquivo em bytes |
| `status` | TEXT | Não | `draft` | Status: `draft`, `published`, `archived` |
| `category` | TEXT | Não | `general` | Categoria do arquivo |
| `created_at` | TEXT | Não | `datetime('now')` | Data de criação (UTC) |
| `updated_at` | TEXT | Não | `datetime('now')` | Data da última atualização (UTC) |

## Índices

```sql
CREATE INDEX IF NOT EXISTS idx_files_uuid     ON files(uuid);
CREATE INDEX IF NOT EXISTS idx_files_status   ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
```

| Índice | Campo | Propósito |
|--------|-------|-----------|
| `idx_files_uuid` | `uuid` | Busca rápida por UUID (endpoints de detalhe e download) |
| `idx_files_status` | `status` | Filtragem eficiente por status na listagem |
| `idx_files_category` | `category` | Filtragem eficiente por categoria |

## Status do Arquivo

O campo `status` controla a visibilidade e disponibilidade do arquivo:

```
  ┌─────────┐    publicar    ┌───────────┐    arquivar    ┌───────────┐
  │  draft  │───────────────▶│ published │───────────────▶│ archived  │
  └─────────┘                └───────────┘                └───────────┘
       │                          │                            │
       │         ◀────────────────┘                            │
       │          voltar p/ draft                              │
       │                                                       │
       └──────────────────◀────────────────────────────────────┘
                           restaurar
```

| Status | Download | Visível na Listagem Padrão | Descrição |
|--------|:--------:|:--------------------------:|-----------|
| `draft` | ❌ | Não (filtrar por `?status=draft`) | Rascunho, não acessível publicamente |
| `published` | ✅ | Sim | Publicado e disponível para download |
| `archived` | ❌ | Não (filtrar por `?status=archived`) | Arquivado, preservado mas não acessível |

## Organização de Arquivos no Disco

Os arquivos são armazenados seguindo a estrutura:

```
uploads/
├── general/
│   ├── uuid1.txt
│   └── uuid2.doc
├── documents/
│   ├── uuid3.pdf
│   └── uuid4.xlsx
├── images/
│   ├── uuid5.png
│   └── uuid6.jpg
└── reports/
    └── uuid7.pdf
```

- O diretório de categoria é criado automaticamente no primeiro upload
- O nome do arquivo no disco é o UUID + extensão original
- O nome original do arquivo é preservado no campo `original_name` e usado no download
