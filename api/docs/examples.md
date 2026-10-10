# Exemplos de Uso

Exemplos completos de integração com a BlackBird File API em diversas linguagens.

---

## cURL

### Publicar um arquivo

```bash
curl -X POST http://localhost:3000/api/files/publish \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -F "title=Manual do Usuário" \
  -F "category=documents" \
  -F "status=published" \
  -F "file=@./manual.pdf"
```

### Listar arquivos com filtros

```bash
# Todos os publicados
curl -s http://localhost:3000/api/files | jq .

# Por categoria
curl -s "http://localhost:3000/api/files?category=documents" | jq .

# Buscar por título
curl -s "http://localhost:3000/api/files?search=manual" | jq .

# Paginação
curl -s "http://localhost:3000/api/files?page=2&limit=5" | jq .

# Listar rascunhos
curl -s "http://localhost:3000/api/files?status=draft" | jq .
```

### Obter detalhes de um arquivo

```bash
curl -s http://localhost:3000/api/files/{uuid} | jq .
```

### Download de arquivo

```bash
# Salvar com nome original
curl -O -J http://localhost:3000/api/files/{uuid}/download

# Salvar com nome personalizado
curl -o meu-arquivo.pdf http://localhost:3000/api/files/{uuid}/download
```

### Atualizar metadados

```bash
curl -X PUT http://localhost:3000/api/files/{uuid} \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manual do Usuário v2",
    "status": "published",
    "category": "manuals"
  }'
```

### Arquivar um arquivo

```bash
curl -X PUT http://localhost:3000/api/files/{uuid} \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c" \
  -H "Content-Type: application/json" \
  -d '{"status": "archived"}'
```

### Excluir arquivo

```bash
curl -X DELETE http://localhost:3000/api/files/{uuid} \
  -H "x-client-id: blackbird_client_2024" \
  -H "x-client-secret: sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"
```

### Listar categorias

```bash
curl -s http://localhost:3000/api/categories | jq .
```

---

## JavaScript (Node.js)

### Publicar arquivo

```javascript
const fs = require('fs');
const path = require('path');

async function publishFile(filePath, title, category = 'general') {
  const formData = new FormData();
  
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  formData.append('file', blob, path.basename(filePath));
  formData.append('title', title);
  formData.append('category', category);
  formData.append('status', 'published');

  const response = await fetch('http://localhost:3000/api/files/publish', {
    method: 'POST',
    headers: {
      'x-client-id': 'blackbird_client_2024',
      'x-client-secret': 'sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c',
    },
    body: formData,
  });

  const data = await response.json();
  console.log('Arquivo publicado:', data);
  return data;
}

// Uso
publishFile('./relatorio.pdf', 'Relatório Mensal', 'reports');
```

### Listar arquivos

```javascript
async function listFiles({ category, search, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (category) params.set('category', category);
  if (search) params.set('search', search);

  const response = await fetch(`http://localhost:3000/api/files?${params}`);
  const data = await response.json();
  
  console.log(`Total: ${data.pagination.total} arquivos`);
  data.data.forEach(file => {
    console.log(`- ${file.title} (${file.size_formatted}) [${file.category}]`);
  });
  
  return data;
}

// Uso
listFiles({ category: 'reports', search: 'mensal' });
```

### Download de arquivo

```javascript
const fs = require('fs');

async function downloadFile(uuid, outputPath) {
  const response = await fetch(
    `http://localhost:3000/api/files/${uuid}/download`
  );

  if (!response.ok) {
    throw new Error(`Download falhou: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`Arquivo salvo em: ${outputPath}`);
}

// Uso
downloadFile('a1b2c3d4-e5f6-7890-abcd-ef1234567890', './download.pdf');
```

---

## Python

### Publicar arquivo

```python
import requests

API_URL = "http://localhost:3000"
HEADERS = {
    "x-client-id": "blackbird_client_2024",
    "x-client-secret": "sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c",
}

def publish_file(filepath, title, category="general"):
    with open(filepath, "rb") as f:
        files = {"file": (filepath.split("/")[-1], f)}
        data = {
            "title": title,
            "category": category,
            "status": "published",
        }
        response = requests.post(
            f"{API_URL}/api/files/publish",
            headers=HEADERS,
            files=files,
            data=data,
        )

    result = response.json()
    print(f"Publicado: {result['file']['uuid']}")
    return result

# Uso
publish_file("./relatorio.pdf", "Relatório Mensal", "reports")
```

### Listar arquivos

```python
import requests

def list_files(category=None, search=None, page=1, limit=20):
    params = {"page": page, "limit": limit}
    if category:
        params["category"] = category
    if search:
        params["search"] = search

    response = requests.get(f"{API_URL}/api/files", params=params)
    data = response.json()

    for file in data["data"]:
        print(f"- {file['title']} ({file['size_formatted']}) [{file['category']}]")

    print(f"\nTotal: {data['pagination']['total']} arquivo(s)")
    return data

# Uso
list_files(category="reports")
```

### Download de arquivo

```python
import requests

def download_file(uuid, output_path):
    response = requests.get(f"{API_URL}/api/files/{uuid}/download", stream=True)

    if response.status_code == 200:
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Salvo em: {output_path}")
    else:
        print(f"Erro: {response.json()}")

# Uso
download_file("a1b2c3d4-e5f6-7890-abcd-ef1234567890", "./download.pdf")
```

---

## Fluxo Completo (Bash Script)

```bash
#!/bin/bash

API="http://localhost:3000"
CLIENT_ID="blackbird_client_2024"
CLIENT_SECRET="sk_bb_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"

echo "=== 1. Health Check ==="
curl -s "$API/health" | jq .

echo -e "\n=== 2. Publicar arquivo ==="
RESULT=$(curl -s -X POST "$API/api/files/publish" \
  -H "x-client-id: $CLIENT_ID" \
  -H "x-client-secret: $CLIENT_SECRET" \
  -F "title=Script de Teste" \
  -F "category=scripts" \
  -F "status=published" \
  -F "file=@$0")

echo "$RESULT" | jq .
UUID=$(echo "$RESULT" | jq -r '.file.uuid')

echo -e "\n=== 3. Listar arquivos ==="
curl -s "$API/api/files" | jq .

echo -e "\n=== 4. Detalhes do arquivo ==="
curl -s "$API/api/files/$UUID" | jq .

echo -e "\n=== 5. Atualizar título ==="
curl -s -X PUT "$API/api/files/$UUID" \
  -H "x-client-id: $CLIENT_ID" \
  -H "x-client-secret: $CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title": "Script Atualizado"}' | jq .

echo -e "\n=== 6. Categorias ==="
curl -s "$API/api/categories" | jq .

echo -e "\n=== 7. Excluir arquivo ==="
curl -s -X DELETE "$API/api/files/$UUID" \
  -H "x-client-id: $CLIENT_ID" \
  -H "x-client-secret: $CLIENT_SECRET" | jq .

echo -e "\n=== Concluído! ==="
```
