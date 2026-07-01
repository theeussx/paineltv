# wardcontroll - TV Management System

Um painel profissional e seguro para gerenciar e controlar TVs Samsung em sua rede local.

## Visao Geral

**wardcontroll** eh um sistema completo de controle remoto e gestao de TVs Samsung. Fornece uma interface intuitiva para:

- ✅ Gerenciar multiplas TVs
- ✅ Controlar remoto interativo
- ✅ Escanear rede para descobrir TVs
- ✅ Controle em massa (ligar/desligar todas)
- ✅ Autenticacao segura
- ✅ Dashboard com estatisticas

## Arquitetura

### Frontend (Este Projeto)
- **React 19** com TypeScript
- **Tailwind CSS 4** para estilizacao
- **shadcn/ui** para componentes
- **Wouter** para roteamento
- **Sonner** para notificacoes

### Backend (Seu Projeto)
- API REST para controle de TVs
- Endpoints para gerenciamento
- Descoberta de TVs na rede

## Instalacao

### Prerequisitos
- Node.js 18+
- npm ou pnpm

### Setup

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Build para producao
pnpm build

# Preview da build
pnpm preview
```

## Estrutura do Projeto

```
client/
├── src/
│   ├── pages/           # Paginas da aplicacao
│   │   ├── Login.tsx    # Pagina de autenticacao
│   │   ├── Dashboard.tsx # Dashboard principal
│   │   ├── TVs.tsx      # Gerenciamento de TVs
│   │   └── Settings.tsx # Configuracoes
│   ├── components/      # Componentes reutilizaveis
│   │   ├── DashboardLayout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ui/          # shadcn/ui components
│   ├── contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/           # Custom hooks
│   │   └── useAPI.ts
│   ├── lib/             # Utilidades
│   │   ├── api-client.ts
│   │   ├── security.ts
│   │   └── auth-middleware.ts
│   ├── App.tsx          # Componente raiz
│   ├── main.tsx         # Entry point
│   └── index.css        # Estilos globais
└── public/              # Arquivos estaticos
```

## Uso

### Fazer Login

1. Acesse a pagina de login
2. Digite seu email e senha
3. Clique em "Entrar"

**Credenciais de teste:**
- Email: `teste@email.com`
- Senha: `qualquer senha com 6+ caracteres`

### Adicionar TV

1. Vá para "Minhas TVs"
2. Clique em "Adicionar TV"
3. Preencha os dados:
   - Nome: Nome descritivo (ex: "Sala de Estar")
   - IP: Endereco IP da TV na rede (ex: 192.168.1.100)
   - MAC: Endereco MAC (opcional)
4. Clique em "Adicionar"

### Escanear Rede

1. Vá para "Minhas TVs"
2. Clique em "Escanear rede"
3. Aguarde o escaneamento
4. Clique em um resultado para adicionar

### Controlar TV

1. Selecione uma TV no dashboard
2. Use o painel de controle para:
   - Ligar/desligar
   - Ajustar volume
   - Navegar
   - Abrir aplicativos

## Configuracao da API

Configure a URL da API no arquivo `.env`:

```env
VITE_API_URL=http://localhost:3001
```

## Endpoints Esperados

O backend deve fornecer os seguintes endpoints:

### TVs
- `GET /api/tvs` - Listar TVs
- `POST /api/tvs` - Adicionar TV
- `DELETE /api/tvs/:id` - Remover TV
- `GET /api/tvs/:id/status` - Status da TV

### Controle
- `POST /api/tvs/:id/power/on` - Ligar
- `POST /api/tvs/:id/power/off` - Desligar
- `POST /api/tvs/:id/power/toggle` - Alternar
- `POST /api/tvs/:id/volume/up` - Volume +
- `POST /api/tvs/:id/volume/down` - Volume -
- `POST /api/tvs/:id/volume/mute` - Mute
- `POST /api/tvs/:id/nav/:action` - Navegacao
- `POST /api/tvs/:id/app/:appName` - Abrir app

### Descoberta
- `GET /api/discovery/scan` - Escanear rede

## Seguranca

O projeto implementa multiplas camadas de seguranca:

- ✅ Autenticacao com validacao
- ✅ Sanitizacao de dados (XSS prevention)
- ✅ Protecao de rotas
- ✅ Timeout de sessao
- ✅ Validacao de entrada
- ✅ Headers seguros

Veja [SECURITY.md](./SECURITY.md) para detalhes completos.

## Desenvolvimento

### Adicionar Nova Pagina

1. Crie o arquivo em `client/src/pages/`
2. Importe em `App.tsx`
3. Adicione a rota

```typescript
// App.tsx
<Route path="/minha-pagina" component={MinhaPageina} />
```

### Adicionar Novo Componente

1. Crie em `client/src/components/`
2. Exporte e importe onde necessario

```typescript
// components/MeuComponente.tsx
export function MeuComponente() {
  return <div>Meu componente</div>;
}
```

### Usar API

```typescript
import { apiClient } from '@/lib/api-client';

const tvs = await apiClient.listTvs();
await apiClient.powerOn(tvId);
```

## Performance

- **Code Splitting**: Rotas sao carregadas sob demanda
- **Lazy Loading**: Componentes sao carregados quando necessario
- **Caching**: Dados sao cacheados quando possivel
- **Minificacao**: Build eh minificado e otimizado

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Troubleshooting

### "Nao consigo fazer login"
- Verifique se o email eh valido
- Senha deve ter pelo menos 6 caracteres
- Limpe cache do navegador

### "API nao responde"
- Verifique se o backend esta rodando
- Confirme a URL da API em `.env`
- Verifique CORS no backend

### "TVs nao aparecem"
- Verifique se as TVs estao ligadas
- Confirme que estao na mesma rede
- Tente escanear a rede novamente

## Contribuindo

Para contribuir com melhorias:

1. Crie uma branch para sua feature
2. Implemente as mudancas
3. Teste completamente
4. Envie um pull request

## Licenca

MIT

## Suporte

Para problemas ou duvidas:

1. Verifique a documentacao
2. Consulte [SECURITY.md](./SECURITY.md)
3. Entre em contato com o time de desenvolvimento

---

**Desenvolvido com ❤️ para controlar suas TVs com seguranca e elegancia.**
