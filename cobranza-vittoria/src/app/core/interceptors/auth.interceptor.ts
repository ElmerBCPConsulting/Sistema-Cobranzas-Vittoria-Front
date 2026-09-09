import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../config/environment';
import { Session } from '../auth/session.models';
import { AuthService } from '../services/auth.service';

const RETRIED_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);
const AUTH_ENDPOINTS = [
  '/api/seguridad/auth/login',
  '/api/seguridad/auth/refresh',
  '/api/seguridad/auth/logout'
];

let refreshInFlight$: Observable<Session> | null = null;

function isProtectedApiRequest(request: HttpRequest<unknown>): boolean {
  // Limitar el Bearer a la API configurada evita filtrarlo a servicios externos.
  const apiBase = environment.apiUrl.replace(/\/+$/, '');
  if (request.url !== apiBase && !request.url.startsWith(`${apiBase}/`)) return false;
  return !AUTH_ENDPOINTS.some(endpoint => request.url.includes(endpoint));
}

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function sharedRefresh(auth: AuthService): Observable<Session> {
  if (!refreshInFlight$) {
    // shareReplay hace que todos los 401 concurrentes consuman la misma rotación de token.
    refreshInFlight$ = auth.refresh().pipe(
      finalize(() => { refreshInFlight$ = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }
  return refreshInFlight$;
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  if (!isProtectedApiRequest(request)) return next(request);

  const session = auth.session;
  if (!session) return next(request);

  const send = (token: string, retried = false): Observable<HttpEvent<unknown>> => {
    const authenticated = withBearer(request, token).clone({
      context: request.context.set(RETRIED_AFTER_REFRESH, retried)
    });

    return next(authenticated).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || authenticated.context.get(RETRIED_AFTER_REFRESH)) {
          return throwError(() => error);
        }

        return sharedRefresh(auth).pipe(
          catchError(refreshError => {
            auth.clearLocalSession();
            return throwError(() => refreshError);
          }),
          map(refreshed => refreshed.accessToken),
          switchMap(accessToken => send(accessToken, true))
        );
      })
    );
  };

  // Se renueva también de forma preventiva para no enviar un JWT que ya sabemos vencido.
  if (auth.isAccessTokenExpired(10)) {
    return sharedRefresh(auth).pipe(
      catchError(error => {
        auth.clearLocalSession();
        return throwError(() => error);
      }),
      switchMap(refreshed => send(refreshed.accessToken, true))
    );
  }

  return send(session.accessToken);
};
