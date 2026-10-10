# 🐦‍⬛ BlackBird File API

**Versão:** 1.0.0  
**Base URL:** `http://localhost:3000`

---

## Visão Geral

A BlackBird File API é uma API REST para upload, gerenciamento e distribuição de arquivos. Construída com **Node.js**, **Express** e **SQLite**, oferece uma solução leve e performática para servir arquivos via endpoints HTTP.

### Principais Funcionalidades

- ✅ Upload de arquivos com metadados (título, categoria, status)
- ✅ Listagem pública com paginação, filtros e busca
- ✅ Download de arquivos publicados
- ✅ Autenticação via `client_id` / `client_secret`
- ✅ Gerenciamento de status (draft → published → archived)
- ✅ Organização por categorias

---

## Índice

| Documento | Descrição |
|-----------|-----------|
| [Instalação e Configuração](./setup.md) | Como instalar, configurar e rodar a API |
| [Autenticação](./authentication.md) | Como autenticar nas rotas protegidas |
| [Endpoints — Rotas Públicas](./endpoints-public.md) | Listar, buscar e baixar arquivos |
| [Endpoints — Rotas Autenticadas](./endpoints-authenticated.md) | Publicar, atualizar e excluir arquivos |
| [Schema do Banco de Dados](./database.md) | Estrutura da tabela e campos |
| [Códigos de Erro](./errors.md) | Referência de erros HTTP e mensagens |
| [Exemplos](./examples.md) | Exemplos completos com cURL, JavaScript e Python |

---

## Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Cliente    │────▶│  Express API │────▶│  SQLite   │
│  (cURL/App) │◀────│   (Node.js)  │◀────│  (DB)     │
└─────────────┘     └──────┬───────┘     └───────────┘
                           │
                    ┌──────▼───────┐
                    │   uploads/   │
                    │  (Arquivos)  │
                    └──────────────┘
```

---

## Quick Start

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Iniciar em desenvolvimento
npm run dev

# Testar
curl http://localhost:3000/health
```

---

## Tecnologias

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Node.js | >= 22 | Runtime |
| Express | 5.x | Framework HTTP |
| better-sqlite3 | 13.x | Banco de dados SQLite |
| multer | 2.x | Upload de arquivos |
| uuid | 14.x | Geração de UUIDs |
| cors | 2.x | Cross-Origin Resource Sharing |
| dotenv | 17.x | Variáveis de ambiente |
