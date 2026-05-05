# Projeto ChatCap-V21

Este projeto é uma aplicação baseada em TanStack Start e Supabase.

## Como Iniciar o Projeto

### 1. Configuração do Ambiente
O arquivo `.env` já foi configurado com as credenciais do Supabase fornecidas:
- **Supabase URL:** `https://kixyourshpjtrvpcukqd.supabase.co`
- **Projeto ID:** `kixyourshpjtrvpcukqd`

Certifique-se de que o arquivo `.env` na raiz do projeto contenha:
```env
VITE_SUPABASE_URL="https://kixyourshpjtrvpcukqd.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_CHAVE_ANON_AQUI"
```

### 2. Instalação de Dependências
Como você está no Windows, utilize o `npm.cmd` se o `npm` padrão falhar devido a políticas de execução:

```powershell
npm install
# OU, se houver erro de permissão:
npm.cmd install
```

### 3. Rodar o Aplicativo
Para iniciar o servidor de desenvolvimento:

```powershell
npm run dev
# OU
npm.cmd run dev
```

O aplicativo estará disponível em `http://localhost:3000` (ou na porta indicada no terminal).

## Estrutura do Projeto
- `src/integrations/supabase/`: Configuração do cliente Supabase.
- `src/routes/`: Definição das rotas com TanStack Router.
- `src/components/ui/`: Componentes de interface (Shadcn UI).
