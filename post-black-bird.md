# BlackBird Media Player: A Ascensão de um Novo Player Desktop 🎵🎧

Você lembra da época de ouro em que tínhamos nossos Media Players locais perfeitamente organizados, com temas customizáveis e performance absurda sem depender de uma aba pesada no navegador?

Apresento a vocês o **BlackBird**. Um reprodutor de mídia moderno, elegante e focado em entregar a melhor experiência local para o seu Desktop, construído sobre um stack robusto usando **Electron**, **Vite** e banco de dados ultrarrápido com **better-sqlite3**. Mais do que apenas tocar arquivos locais, ele foi engenheirado para unir os mundos offline e online em uma só interface maravilhosa.

---

## 🚀 Por Que o BlackBird? (Principais Funcionalidades)

O BlackBird não é só mais um reprodutor; ele resolve problemas modernos de quem tem grandes bibliotecas e quer manter tudo centralizado.

### 📁 1. Gerenciamento Inteligente de Mídia e Metadados
Sabe aquela dor de cabeça organizando álbuns e artistas em pastas perdidas?
- **Importação de Pasta Inteligente:** Escolha qualquer diretório na sua máquina. O BlackBird vai varrer tudo recursivamente, extrair automaticamente tags ID3 das músicas, buscar a Capa do Álbum (*Cover Art*) e salvar as durações no banco de dados.
- **YouTube Integrado 📹:** Isso mesmo! Além de arquivos locais, você pode colar um link do YouTube que o Player imediatamente fará o fetch dos metadados através do oEmbed e jogará na sua biblioteca. Você assiste ao vídeo fluído lábios sincronizados diretamente pela interface do BlackBird através do modo *overlay*.

### 🗂️ 2. Organização e Biblioteca Eficiente
- As mídias importadas caem num funil inteligente que categoriza toda a sua biblioteca em: `Todas as Músicas`, `Álbuns`, `Artistas` e `Vídeos`.
- **Playlists e Favoritos:** Crie suas playlists e arraste/solte (Drag & Drop) suas tracks nelas de modo contínuo. Marcou uma música com `❤️`? Ela já está aba de seus Favoritos instantaneamente.
- **Busca Deep-Search:** Precisa achar um som que você importou ano passado? A barra de busca no topo filtra de forma massiva sobre títulos, artistas, gêneros e até por descrições customizadas simultaneamente!
- **Editor Embutido:** Clicando no botão `✏️` (Editar), você abre um modal que permite sobrescrever na hora o Título, Álbum, Gênero e ainda fazer *upload* de uma nova imagem `.JPG` para atuar como capa (Artwork) exclusiva usando dados locais.

### 🎛️ 3. Controle Fluído
Se você é fã da velha guarda de manipulação em massa, você vai se sentir em casa.
- O BlackBird possui um **Universal Player Queue**, que suporta tanto o toque de músicas nativas em MP3/FLAC quanto a conversão em tempo real da mesma fila para um vídeo importado do YouTube!
- Controle puro com atalhos de **Shuffle** e **Repeat** (All / One).
- **Multi-Seleção Nativa:** Segure o `Cmd/Ctrl` ou o `Shift` e selecione dezenas de músicas alternadas ou em bloco, seja para tocar tudo de forma contínua ou para limpar itens do seu banco de dados de uma vez só!

### 🎨 4. Customização Dinâmica e "Data Safe"
- **Temas Modulares:** Cansou da paleta dark clássica? Através da barra lateral de **Theme Options**, é possível importar arquivos JSON criados por você mesmo ditando novas cores. (Exemplo disso é tema *"Cyberpunk"* criado pela comunidade, modificando todo gradiente e neon da aplicação instantaneamente sem reload).
- **Exportação Total de Configurações (Backup de Dados):** Trocou de PC? Vá até o menu superior do seu OS (`File > Export Settings`). O BlackBird vai bundlar todas as suas Listas de Reprodução, índicadores de tags, quantas vezes suas músicas foram tocadas, bibliotecas inteiras e seus Temas customizados dentro de **um único arquivo super leve JSON**. Para restaurar na máquina nova, apenas importe esse arquivo!

---

## 🛠️ Arquitetura e Engenharia de Peso

Tudo isso não adiantaria se o App "engasgasse" pra rodar.
O **BlackBird** foi desenhado com processos totalmente apartados:
- Base core usando **Electron** empacotando o projeto desktop com a velocidade do construtor **Vite** com Hot Module Replacement para agilidade de desenvolvimento.
- **SQLite nativo no próprio C++ (`better-sqlite3`)** evitando gargalos do Node.js, aguentando scale-up de leituras maciças instantâneas (sem callback-hell asíncrono travando a tela).
- Uma **UI hiper engenhosa Vanilla em TS/JS nativo e CSS**. Isso garante manipulação exímia do DOM e uma renderização das listas que bate de frente com qualquer framework complexo pesando o Electron sem necessidade.

Se o mercado de aplicativos desktop com alto nível de customização sentia falta de um ambiente premium moderno para as suítes de áudio/vídeo...
**O BlackBird chegou para tocar essa música em alto volume!** 💿🚀
