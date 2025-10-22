# Tutorial Manager — Visão Geral

Aplicação completa para gerenciamento de tutoriais, com autenticação, administração e CRUD de conteúdos. Composta por um backend em Symfony (API REST) e um frontend em Angular.

## O que a aplicação faz
- Autenticação de usuários com JWT e refresh token.
- Registro de novos usuários.
- Listagem de usuários (restrita a `ROLE_ADMIN`).
- CRUD de tutoriais: criar, listar (com filtro por título), buscar por id, atualizar e excluir.
- Recuperação de senha por e-mail (dev: Mailpit) e confirmação por token.
- Alteração de senha autenticado.

## Tecnologias

![Symfony](https://img.shields.io/badge/Symfony-7.3-000000?logo=symfony&logoColor=white) 
![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white) 
![Angular](https://img.shields.io/badge/Angular-14-DD0031?logo=angular&logoColor=white) 
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white) 
![RxJS](https://img.shields.io/badge/RxJS-7-B7178C?logo=reactivex&logoColor=white) 
![Doctrine](https://img.shields.io/badge/Doctrine-ORM%2FDBAL-FF6A00) 
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) 
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white) 
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) 
![Node.js](https://img.shields.io/badge/Node.js-16%2B-339933?logo=node.js&logoColor=white)

- Backend: Symfony 7.3, Doctrine ORM/DBAL, LexikJWT, Gesdinet Refresh Token, Nelmio CORS, Symfony Mailer.
- Banco de dados: SQLite (dev por padrão) ou PostgreSQL via Docker Compose.
- Frontend: Angular 14, Bootstrap 5, RxJS.

## Estrutura de Pastas
- `backend/api` — API Symfony
- `frontend` — Aplicação Angular

## Pré-requisitos
- PHP 8.2+
- Composer
- Node.js 16/18 + npm
- (Opcional) Symfony CLI
- (Opcional) Docker Desktop

## Passo a passo (Dev)
1. Backend
   - `cd tutorial-manager/backend/api`
   - `composer install`
   - Gerar chaves JWT: `php scripts/generate_jwt.php`
   - Banco: usar SQLite (padrão) ou Postgres (ver README do backend)
   - Migrations: `php bin/console doctrine:migrations:migrate`
   - Iniciar servidor na porta 4000:
     - `symfony server:start --port=4000 -d`
     - ou `php -S localhost:4000 -t public`
2. Frontend
   - `cd tutorial-manager/frontend`
   - `npm install`
   - `npm start` (porta 4200)

Com isso: Frontend em `http://localhost:4200/` e API em `http://localhost:4000/`. O `environment.apiUrl` já aponta para `http://localhost:4000/api`.

## Endpoints (resumo)
- `POST /api/users/authenticate`
- `POST /api/users/register`
- `GET  /api/users` (admin)
- `POST /api/users/password/change`
- `POST /api/users/password-reset/request`
- `POST /api/users/password-reset/confirm`
- `GET  /api/tutorials?title=...`
- `POST /api/tutorials`
- `GET  /api/tutorials/{id}`
- `PUT  /api/tutorials/{id}`
- `DELETE /api/tutorials/{id}`
- `DELETE /api/tutorials`

## Produção (notas breves)
- Ajuste `environment.prod.ts` (frontend) com o `apiUrl` real.
- Configure `DATABASE_URL` para o banco de produção e rode migrations.
- Gere chaves JWT seguras; mantenha a passphrase fora do código.
- Configure CORS adequadamente.
- Ative cache e otimizações (Symfony/Angular).

Para detalhes de execução e configuração, consulte:
- `backend/api/README.md`
- `frontend/README.md`