# O Setup Definitivo de IA e Arquitetura para Projetos Desktop (Electron) 🚀

Com a ascensão dos agentes de IA nos ecossistemas de desenvolvimento (como Cursor, Windsurf, Copilot e Antigravity), garantir que a inteligência artificial entenda a **sua** arquitetura é tão importante quanto configurar seu linter. 

Neste post, documento a estrutura escalável e limpa que adotamos para projetos pesados Desktop (como Media Players em Electron), unindo **Clean Code**, **Design Patterns** e **AI Context Rules** em uma única árvore limpa.

---

## 🏗️ A Estrutura Organizacional

Abandonamos o conceito de "over-engineering" de Cloud Web (como Ports/Adapters) e focamos na realidade de aplicações Desktop (IPC, Repositórios SQLite Síncronos, Performance de Thread).

A árvore principal do repositório foi reestruturada para suportar um ecossistema amigável não apenas a desenvolvedores humanos, mas também a IAs. Ela se resume nisso:

```text
├─ README.md
├─ docs/
│  ├─ architecture.md
│  ├─ decisions/
│  │  └─ 0001-use-better-sqlite3.md 
│  └─ runbooks/
│     └─ local-dev.md               
│
└─ .agent-instructions/
   ├─ project-rules.md
   ├─ architecture.mdc
   ├─ clean-code.mdc
   │
   ├─ skills/
   │  ├─ electron-ipc-builder/      
   │  │  └─ SKILL.md
   │  └─ sqlite-dao-generator/
   │     └─ SKILL.md
   │
   └─ prompts/
      ├─ generate_feature.md
      └─ css_guidelines.md
```

### O que significa cada pedaço dessa estrutura?

#### A Camada Humana e Histórica (`docs/`)
A documentação clássica foi adaptada para ser enxuta e ir direto ao ponto sobre como construir o projeto e como a aplicação se comporta macro-arquiteturalmente.
- **`architecture.md`**: Serve como o grande mapa do projeto. Ele descreve as responsabilidades isoladas de cada processo do Electron: O Main (Back-end), Preload (Ponte de segurança para evitar APIs indesejadas), e o Renderer (Front-end Vanilla).
- **`decisions/` (Architecture Decision Records - ADR)**: Um arquivo histórico para justificar escolhas de tecnologia. Um grande exemplo é o `0001-use-better-sqlite3.md`. Graças a ele, se uma IA resolver "melhorar" a performance com uma lib de SQL asíncrona sem contexto, ela lerá ali que o projeto exige síncronismo devido ao gargalo de parsing em processos locais do Electron.
- **`runbooks/`**: O `local-dev.md` serve como manual de sobrevivência, orientando, por exemplo, como realizar um build cruzado entre o Mac Apple Silicon para computadores Mac Intel, e documentando fixes de problemas de bibliotecas nativas de C++.

#### A Fonte da Verdade de IA (`.agent-instructions/`)
Esse é o cérebro escondido que pauta todo comportamento do assistente (usando links simbólicos na raiz como `.cursorrules` ou `copilot-instructions.md` que apontam para cá).
- **`project-rules.md`**: O guia universal em inglês ditando a Tech Stack oficial. É ele quem garante que a IA jamais tente implementar *"React"* sabendo que sua UI é estritamente *Vanilla DOM/CSS*.
- **`.mdc` rules (`architecture.mdc`, `clean-code.mdc`)**: Diretrizes granulares modulares. Onde a IA constrói consciência do isolamento de IPCs complexos, sobre como aplicar *camelCase*, o princípio rígido da Responsabilidade Única (SRP) em funções grandes, e a abolição do uso de tipos `any` no TypeScript.

#### Treinando e Educando o Agente (`skills/` & `prompts/`)
Ferramentas de IA autônomas (e em IDE) são capazes de consumir e aprender metodologias se forem bem escritas em formato `.md`.
- **`skills/*/SKILL.md`**: São habilidades mastigadas e prontas. O `electron-ipc-builder` proíbe o agente de enviar eventos desordenados, forçando com que qualquer rota passe mapeada e com checagem de tipos através do pre-load script, até chegar ao backend e retornar via promessas limpas e com `try-catch`. O `sqlite-dao-generator` treina a IA a sempre empacotar consultas ao SQLite com statements `.prepare()`, rejeitando concatenações de variáveis de SQL diretas e protegendo a segurança!
- **`prompts/`**: São meros formulários rápidos (cheat-sheets) onde o Dev pode colar pedaços e mandar diretamente para o chat da IA na hora de criar componentes para a interface com CSS padronizado, de forma coerente ao design do software.

## 🧠 Como isso empodera a Inteligência Artificial?

### 1. Instruções Centralizadas com Links Simbólicos
Ao invés de ficar copiando o `system prompt` para o `.cursorrules`, para o `.github/copilot-instructions.md` ou `.windsurfrules`, deixamos todos os arquivos na raiz vazios, servindo apenas como **Symbolic Links** apontando para o `.agent-instructions/project-rules.md`. Mudou uma regra? Reflete em **todas** as IDEs instantaneamente.

### 2. O Conceito de Skills para IA (`skills/*/SKILL.md`)
Ferramentas maduras de agenciamento de código varrem seu Workspace procurando por `.md`. Ao isolarmos tarefas hiperespecíficas como `electron-ipc-builder`, a IA não vai "adivinhar" ou "alucinar" como fazer a ponte IPC no Electron. Ela lerá a *Skill* instruindo-a a usar rigorosamente o `contextBridge` limitante antes de seguir.

### 3. Architecture Decision Records (ADR)
As decisões passadas não importam só para humanos. Quando um dev júnior entrar no time, ou quando a IA sugerir trocar o banco síncrono `better-sqlite3` por outro componente `async`, o documento em `docs/decisions/` freará a IA, garantindo que o contexto de performance do C++ permaneça respeitado.

---

### Conclusão
Implementar esse padrão consome apenas cinco minutos do seu setup inicial, mas **blinda** seu projeto (e suas futuras refatorações baseadas em IA) de código "espaguete" e alucinações. É uma engenharia de Software orientada não apenas para humanos, mas treinada para Assistentes Sintéticos!
