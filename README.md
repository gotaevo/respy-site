# Respy Site

Website institucional da Respy desenvolvido com [Astro](https://astro.build).

## 🚀 Tecnologias

- **Framework:** Astro 5
- **Linguagem:** TypeScript
- **Node.js:** >= 22.12.0

## 📁 Estrutura do Projeto

```text
/
├── public/              # Arquivos estáticos (favicon, etc.)
├── src/
│   ├── layouts/         # Layouts base da aplicação (BaseLayout.astro)
│   └── pages/           # Rotas do site (index.astro, etc.)
├── astro.config.mjs     # Configuração do Astro
└── package.json         # Dependências e scripts
```

> **Nota:** Arquivos e materiais de referência locais ficam na pasta `referencia/`, que é ignorada pelo Git (`.gitignore`) para manter o repositório leve.

## 🧞 Comandos

Todos os comandos são executados a partir da raiz do projeto:

| Comando           | Ação                                              |
| :---------------- | :------------------------------------------------ |
| `npm install`     | Instala as dependências                           |
| `npm run dev`     | Inicia o servidor de desenvolvimento em `localhost:4321` |
| `npm run build`   | Compila o site para produção na pasta `./dist/`   |
| `npm run preview` | Pré-visualiza o build de produção localmente      |
