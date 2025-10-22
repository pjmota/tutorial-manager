import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthenticationService } from '@app/_services/authentication.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthenticationService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const user = this.authService.userValue;
    const isApiUrl = request.url.startsWith(environment.apiUrl);

    let req = request;
    if (isApiUrl && user?.token) {
      req = request.clone({ setHeaders: { Authorization: `Bearer ${user.token}` } });
    }

    return next.handle(req).pipe(
      catchError(err => {
        const isApiError = req.url.startsWith(environment.apiUrl);
        const isUnauthorized = err.status === 401;
        const alreadyRetried = req.headers.has('X-Refresh-Attempt');
        const canRefresh = !!this.authService.userValue?.refreshToken;

        if (isApiError && isUnauthorized && !alreadyRetried && canRefresh) {
          return this.authService.refreshTokens().pipe(
            switchMap(updated => {
              const retry = request.clone({
                setHeaders: { Authorization: `Bearer ${updated.token || ''}`, 'X-Refresh-Attempt': '1' }
              });
              return next.handle(retry);
            }),
            catchError(refreshErr => {
              this.authService.logout();
              return throwError(() => refreshErr);
            })
          );
        }

        return throwError(() => err);
      })
    );
  }
}