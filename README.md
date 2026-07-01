# TV Manager — Fase 1 (backend)

Conecta na Samsung TU8000 via WebSocket e expõe uma API REST simples
pra testar os comandos básicos.

## Como rodar

```bash
cd backend
cp .env.example .env
```

Edite o `.env`:
- `TV_IP`: veja em **Configurações > Geral > Rede > Status da Rede** na TV.
- `TV_MAC`: mesmo menu, ou no roteador (lista de dispositivos conectados).

```bash
npm install
npm run dev
```

Na primeira execução, um popup vai aparecer na TV perguntando algo como
"Permitir que TV Manager controle esta TV?". Aceite. O console do backend
vai imprimir um `Token atual: ...` — copie esse valor e cole em
`TV_TOKEN=` no `.env`. Da próxima vez o popup não aparece mais.

## Testando a API

Com o servidor rodando (`http://localhost:3001`):

```bash
# Status
curl http://localhost:3001/api/tv/status

# Ligar/desligar
curl -X POST http://localhost:3001/api/tv/power/toggle

# Volume
curl -X POST http://localhost:3001/api/tv/volume/up
curl -X POST http://localhost:3001/api/tv/volume/down
curl -X POST http://localhost:3001/api/tv/volume/mute

# Tecla genérica (qualquer KEY_ do protocolo Tizen)
curl -X POST http://localhost:3001/api/tv/key/KEY_HOME
```

## Estrutura pensando no futuro

```
backend/src/
  drivers/
    BaseDriver.js       ← contrato que toda marca precisa seguir
    samsung/
      SamsungDriver.js  ← implementação Samsung (Tizen/WebSocket)
    lg/                 ← (Fase futura) LG webOS
    tcl/                ← (Fase futura) Android TV / TCL
  routes/
    tv.js               ← rotas REST, hoje conversam com 1 TV só
  index.js               ← servidor Express
```

Quando você quiser adicionar a próxima TV/marca, o único trabalho é criar
um novo arquivo em `drivers/<marca>/` que implemente os mesmos métodos
(`connect`, `powerOff`, `setVolume`, `sendKey`, `isOnline`). As rotas e o
futuro dashboard não mudam.

## Próximos passos (Fase 2+)

1. Trocar "1 TV fixa no .env" por uma lista de TVs num banco (SQLite serve bem).
2. Rotas viram `/api/tv/:id/...` em vez de uma TV só.
3. Frontend React consumindo essa API (botões de power/volume/setas).
4. Depois: descoberta automática de TVs na rede (SSDP/mDNS).

Não dá pra eu testar a conexão real com a sua TV daqui (não tenho acesso
à sua rede local), então o próximo passo é você rodar isso na sua máquina
Termux/Node e me mandar o log/erro que aparecer — daí eu ajusto.
