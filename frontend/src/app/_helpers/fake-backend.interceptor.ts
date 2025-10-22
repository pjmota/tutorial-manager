import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { User } from '@app/_models/user';
import { Tutorial } from '@app/_models/tutorial';

// Move helper functions to outer scope
function ok(body?: any) {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(500));
}
function created(body?: any) {
  return of(new HttpResponse({ status: 201, body })).pipe(delay(500));
}
function error(message: string, status: number = 400) {
  return throwError(() => ({ status, error: { message } }));
}

// Move forgotPasswordRequest to outer scope
function forgotPasswordRequest(): Observable<HttpEvent<any>> {
  const baseMsg = 'Se o e-mail existir, enviaremos um link de redefinição.';
  const response: any = { message: baseMsg };
  // For local dev visibility, include dispatched + transport hint
  response.dispatched = true;
  response.transport = 'log://';
  // no validation or user lookup to avoid leaking existence
  return ok(response);
}

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { url, method, headers, params, body } = request;

    // only handle our apiUrl
    if (!url.startsWith(environment.apiUrl)) {
      return next.handle(request);
    }

    // in-memory data stores
    const users: User[] = JSON.parse(localStorage.getItem('users') ?? 'null') ?? [
      { id: 1, username: 'test', password: 'test', firstName: 'Test', lastName: 'User' }
    ];
    const tutorials: Tutorial[] = JSON.parse(localStorage.getItem('tutorials') ?? 'null') ?? [];

    function saveUsers() { localStorage.setItem('users', JSON.stringify(users)); }
    function saveTutorials() { localStorage.setItem('tutorials', JSON.stringify(tutorials)); }

    // helper functions moved to outer scope

    function getAuthCredentials(): { username: string; password: string } | null {
      const authHeader = headers.get('Authorization');
      if (!authHeader?.startsWith('Basic ')) return null;
      try {
        const decoded = atob(authHeader.split(' ')[1] ?? '');
        const [username, password] = decoded.split(':');
        return { username, password };
      } catch {
        return null;
      }
    }

    function isLoggedIn(): boolean {
      const creds = getAuthCredentials();
      if (!creds) return false;
      return users.some(u => u.username === creds.username && u.password === creds.password);
    }

    // route handlers
    // removed useless assignment: const api = environment.apiUrl;
    switch (true) {
      // Auth endpoints
      case url.endsWith('/users/authenticate') && method === 'POST':
        return authenticate();
      case url.endsWith('/users/register') && method === 'POST':
        return register();

      // Password reset (simulate backend behavior for local testing)
      case url.endsWith('/users/password-reset/request') && method === 'POST':
        return forgotPasswordRequest();
      case url.endsWith('/users/password-reset/confirm') && method === 'POST':
        return resetPasswordConfirm();

      // Tutorials CRUD
      case url.endsWith('/tutorials') && method === 'GET':
        return getTutorials();
      case url.endsWith('/tutorials') && method === 'POST':
        return createTutorial();
      case url.endsWith('/tutorials') && method === 'DELETE':
        return deleteAllTutorials();
      case /\/tutorials\/\d+$/.test(url) && method === 'GET':
        return getTutorialById();
      case /\/tutorials\/\d+$/.test(url) && (method === 'PUT' || method === 'PATCH'):
        return updateTutorial();
      case /\/tutorials\/\d+$/.test(url) && method === 'DELETE':
        return deleteTutorial();
      default:
        return next.handle(request);
    }

    // implementations
    function authenticate() {
      const { username, password } = body;
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) return error('Username or password is incorrect', 401);
      // return user details (no token for Basic Auth)
      return ok({ id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName });
    }

    function register() {
      const newUser: User = body;
      if (users.some(u => u.username === newUser.username)) {
        return error('Username already exists', 400);
      }
      newUser.id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
      users.push(newUser);
      saveUsers();
      return created({ id: newUser.id, username: newUser.username, firstName: newUser.firstName, lastName: newUser.lastName });
    }

    // forgotPasswordRequest moved to outer scope

    function resetPasswordConfirm() {
      const token = body?.token?.toString() ?? '';
      const password = body?.password?.toString() ?? '';
      if (!token || !password) {
        return error('Token e nova senha são obrigatórios', 400);
      }
      // Simulate success
      return ok({ message: 'Senha redefinida com sucesso.' });
    }

    function getTutorials() {
      if (!isLoggedIn()) return error('Unauthorized', 401);
      const title = params.get('title');
      const data = title?.length ? tutorials.filter(t => t.title.toLowerCase().includes(title.toLowerCase())) : tutorials;
      return ok(data);
    }

    function getTutorialById() {
      if (!isLoggedIn()) return error('Unauthorized', 401);
      const id = idFromUrl();
      const tutorial = tutorials.find(t => t.id === id);
      return tutorial ? ok(tutorial) : error('Not found', 404);
    }

    function createTutorial() {
      if (!isLoggedIn()) return error('Unauthorized', 401);
      const newTut: Partial<Tutorial> = body;
      const tut: Tutorial = {
        id: tutorials.length ? Math.max(...tutorials.map(t => t.id)) + 1 : 1,
        title: newTut.title ?? '',
        description: newTut.description ?? '',
        published: Boolean(newTut.published)
      };
      tutorials.push(tut);
      saveTutorials();
      return created(tut);
    }

    function updateTutorial() {
      if (!isLoggedIn()) return error('Unauthorized', 401);
      const id = idFromUrl();
      const index = tutorials.findIndex(t => t.id === id);
      if (index === -1) return error('Not found', 404);
      tutorials[index] = { ...tutorials[index], ...body };
      saveTutorials();
      return ok(tutorials[index]);
    }

    function deleteTutorial() {
      if (!isLoggedIn()) return error('Unauthorized', 401);
      const id = idFromUrl();
      const index = tutorials.findIndex(t => t.id === id);
      if (index === -1) return error('Not found', 404);
      tutorials.splice(index, 1);
      saveTutorials();
      return ok();
    }

    function deleteAllTutorials() {
      if (!isLoggedIn()) return error('Unauthorized', 401);
      tutorials.splice(0, tutorials.length);
      saveTutorials();
      return ok();
    }

    function idFromUrl() {
      const urlParts = url.split('/');
      return Number.parseInt(urlParts.at(-1) ?? '', 10);
    }
  }
}
