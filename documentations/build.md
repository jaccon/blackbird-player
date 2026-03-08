# BlackBird Build Documentation

Este documento explica como compilar o BlackBird Media Player para produção, gerando executáveis finais (.app, .dmg, .exe) para distribuir aos usuários.

## Pré-requisitos

Certifique-se de que você possui o Node.js instalado e os pacotes npm do projeto já baixados.
Se ainda não baixou as dependências, rode na pasta principal:
```bash
npm install
```

## Modo de Desenvolvimento

Para testar o aplicativo enquanto programa (Hot-Reloading ativado):
```bash
npm run dev
```
*Nota: Quando rodar o aplicativo assim, ele pode aparecer no Dock ou Gerenciador de Tarefas com o nome genérico "Electron". Isso é normal em modo de desenvolvimento.*

## Compilando para Produção

O projeto utiliza o `electron-builder` para gerar os pacotes. Recomenda-se compilar na mesma plataforma que você deseja gerar (ex: usar um Mac para compilar para Mac).

### 1. Build para macOS
Gera os arquivos `.app` e `.dmg` otimizados para Mac.
```bash
npm run build:mac
```
**Onde encontrar os arquivos:** 
Após terminar, navegue até a pasta `/dist/`. Você encontrará o `blackbird-player-1.0.0.dmg` pronto para instalar e a pasta `mac-arm64` (ou `mac-x64`) contendo o arquivo `BlackBird.app` definitivo.

### 2. Build para Windows
Gera os arquivos `.exe` (Instalador Setup).
```bash
npm run build:win
```

### 3. Build para Linux
Gera pacotes como `.AppImage`, `.snap` ou `.deb`.
```bash
npm run build:linux
```

## Solução de Problemas Comuns

### 1. Crash de Inicialização no macOS ("Library missing: Library not loaded")
O BlackBird utiliza pacotes nativos em C/C++ como o `better-sqlite3`. Se o binário nativo não for compilado corretamente junto com o Electron, o app não abrirá na versão de produção.
*   **Solução:** Certifique-se de que a variável `npmRebuild: true` está perfeitamente configurada no arquivo `electron-builder.yml`. Isso garante que o builder compile o C++ compatível com a arquitetura do SO atual.

### 2. Nome de Aplicativo Errado (Aparecendo como "Electron")
Se a compilação final mostrar o nome de "electron-fallback" ou apenas "Electron":
*   Edite o `package.json` para ter certeza de que a propriedade `"productName": "BlackBird"` existe na raiz.
*   Verifique a propriedade `productName` e `appId` no `electron-builder.yml`.

### 3. Alterando o Ícone
Os ícones originais do aplicativo ficam localizados na pasta `build/` (tipicamente devem ser nomeados como `icon.icns` para Mac, e `icon.ico` para Windows). Para trocar o ícone, substitua esses arquivos e realize uma nova execução de build.
