# Core 4 ERP

Sistema de gestão financeira pessoal com autenticação JWT, multi-tenancy por usuário e módulos de contas, cartões, investimentos e dashboard.

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|------------|--------------|
| Java | 21 |
| Maven | 3.9+ |
| Node.js | 20+ |
| PostgreSQL | 15+ |

---

## Variáveis de Ambiente

### Backend (`core4erp/.env` ou variáveis de sistema)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_URL` | JDBC URL do PostgreSQL | — |
| `DB_USERNAME` | Usuário do banco | — |
| `DB_PASSWORD` | Senha do banco | — |
| `SECRET_KEY` | Chave HMAC-SHA256 para JWT (mínimo 64 chars) | — |
| `TOKEN_EXPIRATION` | Expiração do token em ms | `604800000` (7 dias) |
| `CORS_ORIGINS` | Origens permitidas (vírgula) | `http://localhost:5173` |

Copie `core4erp/.env.example` e preencha os valores.

### Frontend (`front-end/.env.local`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL base do backend | `http://localhost:8080` |

Copie `front-end/.env.example`.

---

## Como executar

### 1. Banco de dados

```bash
# Crie o banco (o schema é gerenciado pelo SchemaPatch na inicialização)
createdb core4erp
```

### 2. Backend

```bash
cd core4erp
cp .env.example .env   # preencha as variáveis
./mvnw spring-boot:run
# API disponível em http://localhost:8080
# Swagger UI em http://localhost:8080/swagger-ui.html
```

### 3. Frontend

```bash
cd front-end
cp .env.example .env.local   # ajuste VITE_API_URL se necessário
npm install
npm run dev
# App disponível em http://localhost:5173
```

---

## Arquitetura

```
FrontEnd/
├── core4erp/          # Backend Spring Boot 3.3 + Java 21
│   └── src/main/java/br/com/core4erp/
│       ├── auth/          # Registro, login, JWT (HS256, 7 dias)
│       ├── usuario/       # Entidade central de usuário
│       ├── categoria/     # Categorias de receita/despesa
│       ├── parceiro/      # Fornecedores e clientes
│       ├── conta/         # Contas a pagar e a receber
│       ├── contaCorrente/ # Contas bancárias com transferências
│       ├── cartaoCredito/ # Cartões, lançamentos e faturas
│       ├── investimento/  # Carteiras de investimento
│       ├── notificacao/   # Alertas de vencimento
│       ├── dashboard/     # Agregação financeira consolidada
│       └── config/        # Segurança, CORS, schema patch
└── front-end/         # React 18 + Vite + Tailwind CSS
    └── src/
        ├── views/         # Páginas por módulo
        ├── components/    # Componentes reutilizáveis (layout, ui)
        ├── hooks/         # useAuth, custom hooks
        ├── context/       # AuthContext
        └── lib/api.js     # Fetch com Bearer token automático
```

### Segurança

- Autenticação via JWT; token enviado como `Authorization: Bearer <token>`.
- Todas as queries filtram por `usuarioId` — isolamento completo entre usuários.
- `GlobalExceptionHandler` centralizado retorna erros padronizados.

---

## Endpoints principais

| Módulo | Método | Path |
|--------|--------|------|
| Auth | POST | `/api/auth/registrar` |
| Auth | POST | `/api/auth/login` |
| Auth | GET | `/api/auth/me` |
| Categorias | GET/POST/PUT/DELETE | `/api/categorias` |
| Parceiros | GET/POST/PUT/DELETE | `/api/parceiros` |
| Contas financeiras | GET/POST/PUT/DELETE | `/api/contas` |
| Contas financeiras | PATCH | `/api/contas/{id}/baixa` |
| Contas correntes | GET/POST/PUT/DELETE | `/api/contas-correntes` |
| Contas correntes | POST | `/api/contas-correntes/transferir` |
| Cartões | GET/POST/PUT/DELETE | `/api/cartoes` |
| Lançamentos | GET/POST/PUT/DELETE | `/api/cartoes/{id}/lancamentos` |
| Faturas | POST | `/api/cartoes/{id}/fechar-fatura` |
| Investimentos | GET/POST/PUT/DELETE | `/api/investimentos` |
| Transações | GET/POST | `/api/investimentos/{id}/transacoes` |
| Notificações | GET | `/api/notificacoes` |
| Notificações | PATCH | `/api/notificacoes/{id}/lida` |
| Dashboard | GET | `/api/dashboard` |

Documentação interativa completa em `/swagger-ui.html` com o backend rodando.

---

## Decisões de arquitetura notáveis

- **Flyway desabilitado / SchemaPatch manual** — o schema é evoluído via `SchemaPatch.java` na inicialização. Isso mantém flexibilidade durante desenvolvimento mas exige cuidado em produção.
- **Fotos de perfil em Base64** — armazenadas diretamente no banco para simplificar o deploy (sem bucket S3). Não recomendado para volume alto de usuários.
- **Multi-tenancy por coluna** — `usuarioId` em todas as entidades, sem schemas separados. Simples e eficaz para o escopo do projeto.
