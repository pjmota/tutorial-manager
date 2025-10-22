import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthenticationService } from '@app/_services/authentication.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class BasicAuthInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthenticationService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const user = this.authService.userValue;
    const isApiUrl = request.url.startsWith(environment.apiUrl);
    if (user && isApiUrl) {
      const authHeader = 'Basic ' + btoa(`${user.username}:${user.password}`);
      request = request.clone({
        setHeaders: { Authorization: authHeader }
      });
    }
    return next.handle(request);
  }
}
