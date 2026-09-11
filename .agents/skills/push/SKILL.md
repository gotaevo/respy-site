---
name: push
description: Push seguro e autônomo ao GitHub — CI local (Build Astro + validação estática), verificação de secrets/arquivos sensíveis, staging inteligente, commit Conventional com escopos Astro e push com rebase automático. Adaptado para Astro 7+ · TypeScript · Vite · CSS · respy-site.
license: MIT
---

# Workflow: Push Seguro (Respy Site)

**Gatilho:** `/push`

**Stack deste projeto:** Astro 7+ · TypeScript · Vite · CSS · Node.js >=22.12.0

Este workflow é ativado pelo comando `/push` e executa um processo **100% autônomo** de commit e push para o GitHub. Nenhuma pergunta é feita ao usuário — tudo é decidido e executado automaticamente.

**IMPORTANTE:** Sempre responda em **português**.

## 🚨 REGRAS ABSOLUTAS QUE NUNCA DEVEM SER VIOLADAS

- **NUNCA** executar `git push --force` ou `git push -f`.
- **NUNCA** ignorar erros de hooks — sempre reportar o `stderr` completo.
- **NUNCA** modificar o `.gitconfig` global.
- **NUNCA** fazer staging de arquivos sensíveis ou pastas de build (`dist/`, `.astro/`) — bloquear o fluxo se detectados.
- **SEMPRE** executar tudo automaticamente sem perguntar nada ao usuário.
- **SEMPRE** ler o `stderr` completo de qualquer comando que falhar.
- **SEMPRE** garantir idempotência — executar múltiplas vezes não deve criar efeitos colaterais.
- **NUNCA** pular a FASE 0 (CI Local) se houver scripts de validação no `package.json` — um push que quebra o build do site é prejudicial.

---

## FASE 0 — Validação CI Local (GATE OBRIGATÓRIO)

> **Por quê esta fase existe:** O Astro compila e valida tipos TypeScript, componentes Astro (`.astro`), rotas estáticas e assets Vite. Esta fase replica essas validações localmente antes de qualquer staging ou commit, assegurando que o deploy estático ou SSR não seja quebrado no remote.

Esta fase é executada **sempre**, exceto se o usuário usou `/push --skip-ci-check` (ver seção de Uso).

### 0.1 — Detectar se é projeto Node.js
Verificar a existência do arquivo `package.json` no diretório raiz.
- Se **não existir**: Pular esta fase e avançar para FASE 1.
- Se **existir**: Executar obrigatoriamente os passos abaixo.

### 0.2 — Verificar dependências instaladas
Verificar a existência do diretório `node_modules/`.
- Se não existir: Executar `npm install` automaticamente. Se falhar: PARAR e reportar o erro completo.

### 0.3 — Executar Lint (se configurado)
- **Verificar se há script de lint no `package.json`**:
  - Se houver `npm run lint`:
    ```bash
    npm run lint 2>&1
    ```
    - Capturar **stdout e stderr completos**.
    - **Se exit code for 0**: ✅ Lint passou. Continuar.
    - **Se exit code for diferente de 0**:
      - Tentar auto-fix se disponível (`npm run lint -- --fix`). Máximo 1 retry.
      - Se persistirem erros: PARAR imediatamente e exibir os erros formatados. Não avançar para staging.
  - Se **não existir** script de lint configurado: Avançar diretamente para FASE 0.4.

### 0.4 — Executar Build / Validação Astro
Executar o build de verificação da aplicação Astro para validar tipos, importações, sintaxe de componentes e roteamento:
```bash
npm run build 2>&1
```
- Capturar **stdout e stderr completos**.
- **Se exit code for 0**: ✅ Build e tipos do Astro passaram. Continuar para FASE 1.
- **Se exit code for diferente de 0**:
  - PARAR imediatamente.
  - Exibir os erros apontando arquivos, linhas e descrições das falhas encontradas.
  - Não avançar para staging.

### 0.5 — Confirmação da FASE 0
Se todas as verificações passarem, exibir antes de prosseguir:
```
✅ CI LOCAL PASSOU
   Astro Build:  OK
   Rotas/Tipos:  OK
   Avançando para staging e push...
```

---

## FASE 1 — Diagnóstico do Ambiente

1. **⚠️ OBRIGATÓRIO — Garantir identidade Git correta antes de qualquer commit:**
   ```bash
   git config user.email "dev@taevo.com.br"
   git config user.name "devtaevo"
   ```
   > Executar **sempre**, no início, sem exceção, para conformidade de autoria do repositório.

2. Verificar se é repo Git válido: `git rev-parse --is-inside-work-tree`
3. Identificar branch atual: `git branch --show-current`
4. **Verificar existência do remote `origin`**: `git remote get-url origin`
   * *Se `origin` não existir*: PARAR e informar que nenhum remote está configurado.
5. Testar conectividade com remote sem transferir dados: `git ls-remote --exit-code origin HEAD`
6. **Verificar se a branch atual é protegida**: Checar contra lista comum (`main`, `master`, `production`, `release/*`).
7. *Se qualquer verificação acima falhar*: PARAR imediatamente o fluxo.

---

## FASE 2 — Análise e Validação do Estado

1. Capturar estado completo da árvore: `git status --porcelain -uall`
2. Capturar diagnósticos extras: `git stash list`
3. Verificar se há marcadores de conflito esquecidos: `git diff --check`
4. Classificar os arquivos em: Modificados, Staged, Novos, Deletados, Conflitos.
5. *Se houver conflitos*: PARAR imediatamente o processo.
6. *Se a working tree estiver totalmente limpa*: Informar ao usuário e PARAR.

### 🛡️ Validação de Segurança Pré-Staging (BLOQUEANTE)

Antes de qualquer staging, escanear **todos** os arquivos alterados/novos contra estas regras:

**Arquivos e pastas sensíveis/gerados** — Se algum bater, **ABORTAR o fluxo inteiro**:
- Padrões proibidos: `.env`, `.env.*`, `.env.local`, `.env.production`, `*.pem`, `*.key`, `*.secret`, `*.p12`, `*.pfx`, `credentials.*`, `*secret*`, `*.keystore`, `id_rsa*`, `*.cert`
- **Pastas geradas que NUNCA devem ir ao Git**:
  * `node_modules/`
  * `.astro/`
  * `dist/`
  * `build/`
  * `.cache/`
  * `secrets/`
- **Variáveis de ambiente / tokens críticos** — bloquear se detectados em texto plano em qualquer arquivo staged:
  * `RESEND_API_KEY`
  * `OPENAI_API_KEY`
  * `GEMINI_API_KEY`
  * `SUPABASE_SERVICE_ROLE_KEY`
  * `SUPABASE_ANON_KEY`
  * `UAZAPI_TOKEN`
  * `CRON_SECRET`
  * `GITHUB_TOKEN`
- *Se detectado*: Informar exatamente quais arquivos violam, sugerir adicionar ao `.gitignore`, e PARAR.

**Arquivos grandes (>50MB)** — **ABORTAR o fluxo**:
- Verificar tamanho dos arquivos alterados/novos (atenção especial a vídeos ou assets de alta resolução em `public/`).
- *Se detectado*: Listar os arquivos, sugerir compressão, `.gitignore` ou `Git LFS`, e PARAR.

---

## FASE 3 — Staging Inteligente

1. Executar `git add -A` para incluir todos os arquivos (novos, modificados, deletados).
2. Mostrar o diff do stage: `git diff --staged --stat`
3. Apresentar um resumo legível enumerando arquivos por categoria (adicionados, modificados, deletados) com contagem de linhas inseridas/removidas.

---

## FASE 4 — Commit Inteligente

### Geração da Mensagem (Conventional Commits)

1. Se o usuário passou uma mensagem via `/push <mensagem>`: usar essa mensagem diretamente.
2. Se não, gerar automaticamente seguindo Conventional Commits:
   * **Prefixo**: `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `ci:`, `build:`
   * **Escopo**: Inferir do caminho dos arquivos alterados usando o mapa específico do projeto Astro abaixo:

     | Caminho dos arquivos alterados | Escopo sugerido |
     | :--- | :--- |
     | `src/components/Header.astro` | `header` |
     | `src/components/Footer.astro` | `footer` |
     | `src/components/<nome>.astro` ou `src/components/<feature>/` | nome do componente (ex: `hero`, `pricing`, `faq`, `cta`) |
     | `src/layouts/` | `layout` (ex: `feat(layout): ...`) |
     | `src/pages/index.astro` | `home` |
     | `src/pages/<rota>.astro` ou subpastas | nome da rota (ex: `pages`, `blog`, `pricing`) |
     | `src/styles/` ou arquivos `*.css` | `styles` |
     | `public/` (imagens, logos, ícones, fontes) | `assets` |
     | `astro.config.mjs`, `tsconfig.json`, `package.json` | `config` |
     | `.agents/` | `agents` |
     | `.vscode/` | `tooling` |
     | `referencia/` ou arquivos Markdown (`*.md`) | `docs` |
     | Arquivos mistos ou raiz do projeto | omitir escopo |

   * **Descrição**: Resumo conciso e claro do que foi alterado, em inglês, no imperativo (ex: `feat(header): add responsive mobile menu toggle`).
   * **Mensagem fallback**: `chore: update files via /push workflow`.

### Execução do Commit

3. Executar o commit **imediatamente**: `git commit -m "..."`. NÃO perguntar ao usuário.

### Tratamento de Falhas (Hooks)
4. Se o commit falhar por hooks de pré-commit:
   * Ler o `stderr` completo.
   * **Se for ferramenta auto-fixável**: Executar o auto-fix, re-stage, e tentar o commit novamente (Máximo 1 retry).
   * **Se for erro de lógica/build**: PARAR imediatamente e reportar o erro.
   * **Se o usuário usou `/push --skip-hooks`**: Executar `git commit --no-verify -m "..."`.

---

## FASE 5 — Sincronização e Push

1. Sincronizar dados do remote: `git fetch origin`
2. Comparar com local: verificar se a branch atual está atrás do remote.
3. *Se estiver atrás*:
   * Executar `git pull --rebase --autostash` automaticamente.
   * **Se o rebase falhar (conflitos)**:
     * Executar `git rebase --abort` imediatamente.
     * PARAR e informar ao usuário os arquivos conflitados.
4. Executar o push: `git push origin <branch>`
5. *Tratamento de Falhas*:
   * **Rejected (non-fast-forward)**: Executar `git pull --rebase --autostash` e tentar push novamente (máximo 1 retry).
   * **Branch protegida**: Informar que a branch não aceita push direto.
   * **Outros**: Mostrar o `stderr` completo e PARAR.

---

## FASE 6 — Verificação e Confirmação Final

1. **Verificação pós-push real**: Confirmar que o push chegou ao remote:
   ```bash
   git fetch origin
   if [ "$(git rev-list origin/$(git branch --show-current)..HEAD | wc -l)" -ne 0 ]; then
     echo "ERRO: Push não sincronizado com o remote"
   fi
   ```
2. Verificar estado limpo: `git status`
3. Revisar os últimos commits: `git log --oneline -3`
4. Obter URL do repositório remoto: `git remote get-url origin`
5. Apresentar a **mensagem de sucesso** contendo:
   * ✅ Branch que recebeu o push
   * ✅ Mensagem de commit usada
   * ✅ Resumo de arquivos alterados (adicionados/modificados/deletados)
   * ✅ Hash do commit
   * ✅ URL do repositório remoto
   * ✅ Confirmação do CI local (Astro Build / Lint)

---

## ⚡ Uso

| Comando | Comportamento |
| :--- | :--- |
| `/push` | Executa tudo automaticamente (CI local Astro → validação → stage → commit → push). |
| `/push <mensagem>` | Usa a mensagem fornecida em vez de gerar automaticamente. |
| `/push --skip-hooks` | Pula hooks de pré-commit (`--no-verify`). |
| `/push --skip-ci-check` | Pula a FASE 0 (Astro build local). |
| `/push --dry-run` | Simula todo o processo sem executar staging, commit ou push. |

