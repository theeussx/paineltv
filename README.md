# wardcontroll

Painel multi-tenant de controle remoto de TVs (Samsung, LG, Roku/TCL, Sony,
Android TV/Google TV, Vizio) em múltiplos locais físicos, com auditoria e
banco PostgreSQL.

## Arquitetura

```
frontend (React)  →  central (Postgres: users/locations/tvs/audit_logs)
                          │  WebSocket (saída, sem abrir porta)
                          ▼
                     agente (roda perto das TVs de um local)
                          │  fala o protocolo de cada marca
                          ▼
                         TV
```

- **central** (`src/`): única fonte de verdade (Postgres). Cuida de login,
  locais, usuários por local, e é quem sabe quais TVs existem. Nunca fala
  diretamente com uma TV.
- **agente** (`agent/`): roda uma instância por local físico, perto das
  TVs de lá. Não guarda nada — recebe a descrição completa da TV (marca,
  IP, dados de pareamento) junto com cada comando, executa, e devolve o
  resultado. Conecta no central via WebSocket de saída (funciona atrás de
  qualquer NAT/roteador doméstico, sem precisar abrir porta).
- **frontend** (`frontend/`): painel React. Owner gerencia locais; admin de
  cada local gerencia usuários/TVs/logs só do próprio local.

## Papéis

- **owner** — dono da plataforma. Cria locais, gera o token de cada
  agente. Só existe via `node src/scripts/create-owner.js`, nunca por HTTP.
- **admin** — administra um local: cria/remove usuários e TVs daquele
  local, vê os logs de auditoria.
- **user** — usa o painel de controle das TVs do próprio local.

## Marcas suportadas

| Marca | Protocolo | Pareamento | Testado aqui |
|---|---|---|---|
| Samsung | Tizen (WebSocket 8002) | Popup na TV | ✅ |
| Roku / TCL / Hisense (Roku OS) | ECP (HTTP 8060) | Nenhum | ✅ |
| Sony (Bravia) | REST + IRCC | Pre-Shared Key manual | ✅ |
| LG (webOS) | SSAP (WebSocket 3000) | Popup na TV | ⚠️ precisa validar com TV real |
| Android TV / Google TV | Android TV Remote v2 (TLS) | PIN de 6 dígitos | ⚠️ precisa validar com TV real |
| Vizio (SmartCast) | REST (HTTPS 9000) | PIN de 4 dígitos | ⚠️ precisa validar com TV real |

Os três marcados com ⚠️ seguem a documentação oficial/bibliotecas mais
usadas da comunidade, mas não há como confirmar 100% sem o aparelho físico
na mão — em especial os códigos de navegação da Vizio, que a própria Vizio
nunca documentou oficialmente (só reverse-engineered).

Se a sua TCL/Hisense roda **Google TV** em vez de Roku OS, cadastre ela
com a marca `androidtv`, não `tcl`.

## Setup

### 1. Banco de dados

```bash
createdb paineltv    # ou: psql -c "CREATE DATABASE paineltv;"
```

### 2. Central

```bash
cd wardcontroll
npm install
cp .env.example .env
# edite o .env: JWT_SECRET (gere com o comando no próprio arquivo) e DATABASE_URL
npm run migrate     # cria as tabelas
node src/scripts/create-owner.js   # cria você como owner
npm start
```

### 3. Agente (um por local físico)

Pelo painel, logado como owner: **Locais → Novo local**, copie o token.

```bash
cd wardcontroll/agent
npm install
cp .env.example .env
# cole CENTRAL_WS_URL e SITE_TOKEN
npm start
```

### 4. Frontend

```bash
cd wardcontroll/frontend
npm install --legacy-peer-deps
npm run dev
```

## Auditoria

Toda ação em TV (ligar, mudar canal, criar, remover, parear...) grava uma
linha em `audit_logs` — quem fez, quando, em qual TV, e se deu certo. A
tela **Logs** (menu do admin de cada local) mostra isso com filtro por
status e paginação.
