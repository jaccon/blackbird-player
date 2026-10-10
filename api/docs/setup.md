# Instalação e Configuração

## Pré-requisitos

- **Node.js** >= 22 (recomendado usar [nvm](https://github.com/nvm-sh/nvm))
- **npm** >= 10

## Instalação

```bash
# Clonar o repositório
git clone <repo-url>
cd api

# Usar a versão correta do Node
nvm use

# Instalar dependências
npm install
```

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou edite o existente):

```env
# Porta do servidor
PORT=3000

# Credenciais de autenticação
CLIENT_ID=blackbird_client_2024
CLIENT_SECRET=sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c

# Caminho do banco de dados SQLite
DB_PATH=./data/blackbird.db

# Diretório de uploads
UPLOAD_DIR=./uploads

# Tamanho máximo de arquivo em bytes (50MB)
MAX_FILE_SIZE=52428800
```

### Detalhes das variáveis

| Variável | Obrigatória | Default | Descrição |
|----------|:-----------:|---------|-----------|
| `PORT` | Não | `3000` | Porta HTTP do servidor |
| `CLIENT_ID` | **Sim** | — | Identificador do cliente para autenticação |
| `CLIENT_SECRET` | **Sim** | — | Chave secreta do cliente |
| `DB_PATH` | Não | `./data/blackbird.db` | Caminho do banco SQLite |
| `UPLOAD_DIR` | Não | `./uploads` | Diretório para arquivos enviados |
| `MAX_FILE_SIZE` | Não | `52428800` (50MB) | Limite de tamanho por arquivo |

> ⚠️ **Importante:** Altere `CLIENT_ID` e `CLIENT_SECRET` antes de usar em produção.

## Execução

### Desenvolvimento

```bash
npm run dev
```

Inicia o servidor com auto-reload (usa `node --watch`). Ideal para desenvolvimento.

### Produção

```bash
npm start
```

Inicia o servidor sem auto-reload.

### Verificação

Ao iniciar, o servidor exibe:

```
🐦‍⬛ BlackBird File API running on http://localhost:3000
📁 Uploads directory: /caminho/absoluto/uploads
🗄️  Database: /caminho/absoluto/data/blackbird.db
```

Teste com:

```bash
curl http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "BlackBird File API",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Estrutura do Projeto

```
api/
├── server.js                 # Entry point do servidor
├── package.json              # Dependências e scripts
├── .env                      # Variáveis de ambiente
├── .nvmrc                    # Versão do Node.js
├── .gitignore                # Arquivos ignorados pelo Git
├── docs/                     # Documentação
│   ├── README.md             # Índice da documentação
│   ├── setup.md              # Este arquivo
│   ├── authentication.md     # Guia de autenticação
│   ├── endpoints-public.md   # Rotas públicas
│   ├── endpoints-authenticated.md  # Rotas autenticadas
│   ├── database.md           # Schema do banco
│   ├── errors.md             # Códigos de erro
│   └── examples.md           # Exemplos de uso
├── src/
│   ├── database/
│   │   └── db.js             # Configuração SQLite e schema
│   ├── middleware/
│   │   └── auth.js           # Middleware de autenticação
│   └── routes/
│       └── files.js          # Rotas de arquivos
├── uploads/                  # Arquivos enviados (por categoria)
│   ├── documents/
│   ├── images/
│   └── general/
└── data/
    └── blackbird.db          # Banco de dados SQLite
```

## Diretórios Automáticos

Os seguintes diretórios são criados automaticamente na primeira execução:

- `data/` — Contém o banco de dados SQLite
- `uploads/` — Diretório raiz para arquivos enviados
- `uploads/<category>/` — Subdiretórios por categoria (criados no upload)
