# Frontend (Angular 14) - Tutorial Manager

Este documento explica como instalar e executar o frontend.

## Requisitos
- Node.js LTS (16 ou 18 recomendado)
- npm

## Instalação
1. Abra um terminal na pasta `tutorial-manager/frontend`.
2. Instale dependências:
   - `npm install`

## Executando em Desenvolvimento
- Inicie o servidor de desenvolvimento:
  - `npm start`
- Por padrão roda em `http://localhost:4200/`.
- Certifique-se de que o backend está rodando em `http://localhost:4000/` (ver README do backend) para evitar erros de CORS e de conexão.

## API URL (Integração com Backend)
- O frontend usa `environment.apiUrl` para prefixar chamadas HTTP.
- Arquivo: `src/environments/environment.ts`
  - Padrão: `apiUrl: 'http://localhost:4000/api'`
- Se o backend estiver em outra porta/host, ajuste o `environment.ts` (e opcionalmente o `environment.prod.ts`).

## Interceptores e Autenticação
- `JwtInterceptor`: adiciona o header `Authorization: Bearer` quando o usuário está logado.
- `ErrorInterceptor`: trata erros de API globalmente.
- Fluxos disponíveis:
  - Login: `POST /users/authenticate`
  - Registro: `POST /users/register`
  - Reset de senha: `POST /users/password-reset/request` e `POST /users/password-reset/confirm`
  - Alteração de senha: `POST /users/password/change` (requer login)

## Testes
- `npm test` — executa testes com Karma/Jasmine.

## Build de Produção
- `npm run build`
- Os artefatos saem em `dist/tutorial-manager`.
- Ajuste `src/environments/environment.prod.ts` para o `apiUrl` correto em produção.

## Problemas Comuns
- Erro de CORS: verifique se o backend permite `localhost:4200` (já configurado no `.env` do backend).
- Erro 401 com refresh: o interceptor tenta renovar token; se falhar, o usuário é deslogado.
- API indisponível: confirme se o backend está ativo na porta configurada.
