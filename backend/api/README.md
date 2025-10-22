# Backend API (Symfony 7) - Tutorial Manager

Este documento explica como instalar, configurar e executar a API e o banco de dados em ambiente de desenvolvimento (Windows).

## Requisitos
- PHP 8.2 ou superior
- Composer
- (Opcional) Symfony CLI
- (Opcional) Docker Desktop (para PostgreSQL)

## Estrutura
- Código da API: `backend/api`
- Entrypoint HTTP: `backend/api/public/index.php`
- Console: `backend/api/bin/console`
- Configurações: `backend/api/config/*`
- Banco (dev por padrão): `backend/api/var/app.db` (SQLite)

## Instalação
1. Abra um terminal na pasta `backend/api`:
   - `cd tutorial-manager/backend/api`
2. Instale dependências:
   - `composer install`

## Configuração de Ambiente
- Arquivo `.env` (padrão dev) já define:
  - `DATABASE_URL="sqlite:///%kernel.project_dir%/var/app.db"`
  - `CORS_ALLOW_ORIGIN` permitindo `localhost`.
  - Variáveis do Lexik JWT (`JWT_SECRET_KEY`, `JWT_PUBLIC_KEY`, `JWT_PASSPHRASE`).
- Ajustes locais podem ser feitos em `.env.local`.

### Gerar chaves JWT (desenvolvimento)
Há um script simples para gerar o par RSA:
- `php scripts/generate_jwt.php`
Isso cria `config/jwt/private.pem` e `config/jwt/public.pem` usando a `JWT_PASSPHRASE` do `.env`.

### Banco de Dados
Você pode usar SQLite (mais simples) ou PostgreSQL via Docker.

#### Opção A — SQLite (recomendada para dev rápido)
1. Migrations:
   - `php bin/console doctrine:migrations:migrate`
2. O arquivo do banco será criado/em `var/app.db`.

#### Opção B — PostgreSQL (Docker)
1. Suba o banco:
   - `docker compose up -d` (na pasta `backend/api`)
2. Configure `DATABASE_URL` em `.env.local`:
   - `DATABASE_URL="postgresql://app:!ChangeMe!@localhost:5432/app?serverVersion=16&charset=utf8"`
3. Rode migrations:
   - `php bin/console doctrine:migrations:migrate`

## Executando o Servidor
Há 2 formas comuns:

- Symfony CLI (recomendado):
  - `symfony server:start --port=4000 -d`
  - API estará em `http://localhost:4000/`

- PHP embutido:
  - `php -S localhost:4000 -t public`

Observação: O frontend (Angular) está configurado para chamar `environment.apiUrl = http://localhost:4000/api`. Por isso, prefira o backend na porta 4000 ou ajuste o `environment.ts` do frontend.

## Endpoints Principais
- Autenticação:
  - `POST /api/users/authenticate` — login com `{ email|username, password }`
  - `POST /api/users/register` — registro com `{ email|username, password, firstName, lastName }`
  - `POST /api/users/password/change` — alterar senha autenticado `{ currentPassword, newPassword }` (Authorization: Bearer)
  - `POST /api/token/refresh` — refresh token (bundle Gesdinet)
- Tutoriais:
  - `GET /api/tutorials?title=...` — listar (filtro opcional)
  - `POST /api/tutorials` — criar
  - `GET /api/tutorials/{id}` — obter
  - `PUT /api/tutorials/{id}` — atualizar
  - `DELETE /api/tutorials/{id}` — remover
  - `DELETE /api/tutorials` — remover todos
- Reset de senha:
  - `POST /api/users/password-reset/request` — solicitar link
  - `POST /api/users/password-reset/confirm` — confirmar com `{ token, password }`

## Dicas e Problemas Comuns
- Se o backend estiver em outra porta, ajuste `frontend/src/environments/environment.ts` (`apiUrl`).
- Erros de dependência: rode `composer install` novamente e limpe cache: `php bin/console cache:clear`.
- Geração de chaves JWT: garanta que a `JWT_PASSPHRASE` está definida e o OpenSSL disponível no PHP.
- CORS: o `.env` já permite `localhost`; se necessário, ajuste `CORS_ALLOW_ORIGIN`.