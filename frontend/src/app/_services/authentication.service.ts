import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { User } from '@app/_models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private readonly userSubject: BehaviorSubject<User | null>;
  public user: Observable<User | null>;

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    const stored = localStorage.getItem('user');
    this.userSubject = new BehaviorSubject<User | null>(stored ? JSON.parse(stored) : null);
    this.user = this.userSubject.asObservable();
  }

  public get userValue(): User | null {
    return this.userSubject.value;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users/authenticate`, { email, password })
      .pipe(map(user => {
        const tokenExpiresAt = Date.now() + ((user.expiresIn ?? 900) * 1000);
        const persisted: User = { ...user, token: user.token, refreshToken: user.refreshToken, tokenExpiresAt };
        localStorage.setItem('user', JSON.stringify(persisted));
        this.userSubject.next(persisted);
        return persisted;
      }));
  }

  refreshTokens(): Observable<User> {
    const refreshToken = this.userValue?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http.post<any>(`${environment.apiUrl}/token/refresh`, { refresh_token: refreshToken })
      .pipe(map(res => {
        const current = this.userValue;
        const newToken: string = res?.token ?? res?.accessToken ?? current?.token ?? '';
        const newRefresh: string = res?.refresh_token ?? refreshToken;
        const updated: User = { ...current!, token: newToken, refreshToken: newRefresh, tokenExpiresAt: Date.now() + (900 * 1000) };
        localStorage.setItem('user', JSON.stringify(updated));
        this.userSubject.next(updated);
        return updated;
      }));
  }

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`).pipe(
      map(list => list?.map(u => ({ id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName } as User)) ?? [])
    );
  }

  resetUserPassword(id: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}/users/${id}/reset-password`, {});
  }

  logout() {
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  register(payload: { firstName: string; lastName: string; email: string; password: string; }): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users/register`, payload)
      .pipe(map(user => {
        // Após registrar, não manter sessão automaticamente; redirecionar para login
        // Caso deseje autologin, poderíamos persistir como no login()
        return user;
      }));
  }


  // Solicitar link de redefinição de senha
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/users/password-reset/request`, { email });
  }

  // Confirmar redefinição com token e nova senha
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/users/password-reset/confirm`, { token, password });
  }

  // Alterar senha autenticado (usa JWT via interceptor)
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const payload = { currentPassword, newPassword };
    return this.http.post<any>(`${environment.apiUrl}/users/password/change`, payload);
  }

  // Configuração: obter e atualizar o e-mail remetente de recuperação
  getMailerFrom(): Observable<{ email: string }> {
    return this.http.get<{ email: string }>(`${environment.apiUrl}/settings/mailer-from`);
  }

  updateMailerFrom(email: string): Observable<{ email: string }> {
    return this.http.post<{ email: string }>(`${environment.apiUrl}/settings/mailer-from`, { email });
  }
}
