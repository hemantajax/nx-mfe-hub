# 07 — Security & Authentication

> **TL;DR:** Use JWT with HTTP-only cookies when possible, functional route guards, and HTTP interceptors for token injection and refresh. Understand XSS and CSRF threats — Angular provides built-in protection that you must not bypass.

---

## 1. JWT Authentication Flow

### Full Flow Diagram

```
1. User submits credentials
         ↓
2. POST /api/auth/login
         ↓
3. Server validates → issues:
   - Access Token (short-lived: 15min)
   - Refresh Token (long-lived: 7 days)
         ↓
4. Client stores tokens
         ↓
5. Each API request → attach Access Token in Authorization header
         ↓
6. If 401 → use Refresh Token to get new Access Token
         ↓
7. If Refresh Token expired → logout, redirect to login
```

### Token Storage — Security Considerations

| Storage | XSS Risk | CSRF Risk | Recommended |
|---------|----------|-----------|-------------|
| `localStorage` | High | None | Only for non-sensitive tokens |
| `sessionStorage` | High | None | Better than localStorage |
| Memory (JS variable) | Low | None | Best for access tokens |
| HTTP-only cookie | None | Medium (mitigated) | Best for refresh tokens |

**Best Practice:**
- Access token: in memory (JS variable via service)
- Refresh token: HTTP-only cookie (server sets it — JS cannot read it)

---

## 2. Auth Service

```typescript
// core/services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/auth';

  // Access token in memory — not in localStorage
  private accessToken = signal<string | null>(null);
  private currentUser = signal<User | null>(null);

  // Public read-only
  isAuthenticated = computed(() => this.accessToken() !== null);
  user = this.currentUser.asReadonly();

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginCredentials): Observable<void> {
    return this.http.post<AuthResponse>(`${this.API}/login`, credentials).pipe(
      tap(response => {
        this.accessToken.set(response.accessToken);
        this.currentUser.set(response.user);
        // Refresh token is set as HTTP-only cookie by server
      }),
      map(() => void 0)
    );
  }

  refreshToken(): Observable<string> {
    // Server reads refresh token from HTTP-only cookie automatically
    return this.http.post<{ accessToken: string }>(
      `${this.API}/refresh`,
      {},
      { withCredentials: true }  // Send cookies
    ).pipe(
      tap(res => this.accessToken.set(res.accessToken)),
      map(res => res.accessToken)
    );
  }

  logout(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.http.post(`${this.API}/logout`, {}, { withCredentials: true })
      .subscribe();  // Server clears HTTP-only cookie
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }
}
```

---

## 3. HTTP Interceptors (Functional Style — Angular 15+)

### Auth Interceptor — Token Injection

```typescript
// core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(authReq);
};
```

### Refresh Token Interceptor — Handle 401

```typescript
// core/interceptors/token-refresh.interceptor.ts
export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError(error => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Skip refresh for auth endpoints (avoid infinite loop)
      if (req.url.includes('/auth/')) {
        authService.logout();
        return throwError(() => error);
      }

      // Attempt refresh
      return authService.refreshToken().pipe(
        switchMap(newToken => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` }
          });
          return next(retryReq);
        }),
        catchError(refreshError => {
          // Refresh failed — session expired
          authService.logout();
          router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
```

### Error Interceptor — Global Error Handling

```typescript
// core/interceptors/error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 400:
          toastService.error('Bad request');
          break;
        case 403:
          toastService.error('Access denied');
          break;
        case 404:
          toastService.warning('Resource not found');
          break;
        case 500:
          toastService.error('Server error. Please try again.');
          break;
      }
      return throwError(() => error);
    })
  );
};
```

### Register Interceptors

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        authInterceptor,          // Add auth header
        tokenRefreshInterceptor,  // Handle 401 and refresh
        errorInterceptor          // Global error handling
      ])
    )
  ]
};
```

**Order matters:** interceptors run in order for requests, reverse order for responses.

---

## 4. Route Guards (Functional Style — Angular 15+)

### Auth Guard

```typescript
// core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Save intended URL for post-login redirect
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
```

### Role Guard

```typescript
// core/guards/role.guard.ts
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn =>
  (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.user();

    if (!user) {
      return router.createUrlTree(['/auth/login']);
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
```

### Using Guards in Routes

```typescript
export const appRoutes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes')
      .then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],  // Must be authenticated
    loadChildren: () => import('./features/dashboard/dashboard.routes')
      .then(m => m.dashboardRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin', 'superadmin'])],
    loadChildren: () => import('./features/admin/admin.routes')
      .then(m => m.adminRoutes)
  }
];
```

### `CanDeactivate` Guard (Unsaved Changes)

```typescript
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> =
  (component) => {
    if (!component.hasUnsavedChanges()) {
      return true;
    }

    return confirm('You have unsaved changes. Leave anyway?');
    // Or use a modal dialog for better UX
  };

// Component implements this interface
export interface HasUnsavedChanges {
  hasUnsavedChanges: () => boolean;
}
```

---

## 5. XSS — Cross-Site Scripting Prevention

### Angular's Built-in Protection

Angular automatically sanitizes all template bindings:

```html
<!-- Angular HTML-encodes this — safe -->
<div>{{ userInput }}</div>

<!-- Angular sanitizes HTML — strips dangerous tags/attrs -->
<div [innerHTML]="richContent"></div>
```

Angular's `DomSanitizer` sanitizes:
- `[innerHTML]` — strips `<script>`, event handlers
- `[src]` — validates URLs
- `[style]` — sanitizes CSS
- `[href]` — validates URLs

### When Developers Break XSS Protection

```typescript
// DANGEROUS — bypasses Angular security
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  template: `<div [innerHTML]="trustedHtml"></div>`
})
export class UnsafeComponent {
  constructor(private sanitizer: DomSanitizer) {}

  // ONLY use if you ABSOLUTELY trust the source
  trustedHtml = this.sanitizer.bypassSecurityTrustHtml(userProvidedHtml);
  // If userProvidedHtml contains <script> → XSS vulnerability!
}
```

**Rule:** Never use `bypassSecurityTrust*` with user-provided content.

### Content Security Policy (CSP)

Add CSP headers on your server to prevent inline script execution:

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
```

Angular supports nonce-based CSP in Angular 16+:

```typescript
// app.config.ts
bootstrapApplication(AppComponent, {
  providers: [
    // Angular 16+: use nonce from server for inline styles
  ]
});
```

---

## 6. CSRF — Cross-Site Request Forgery Prevention

### How CSRF Works

```
1. User logged into bank.com (cookie session)
2. User visits evil.com
3. evil.com has: <img src="bank.com/transfer?to=hacker&amount=1000">
4. Browser sends request WITH bank.com cookies automatically
5. Bank processes it thinking it's the user
```

### Angular's CSRF Token Support

Angular's `HttpClient` automatically reads the CSRF token from a cookie named `XSRF-TOKEN` and sends it in the `X-XSRF-TOKEN` header:

```typescript
// app.config.ts
provideHttpClient(
  withXsrfConfiguration({
    cookieName: 'XSRF-TOKEN',     // Cookie server sets
    headerName: 'X-XSRF-TOKEN'   // Header Angular sends
  })
)
```

Server (e.g., Express):
```javascript
// Server sets XSRF-TOKEN cookie (readable by JavaScript)
res.cookie('XSRF-TOKEN', csrfToken, { httpOnly: false });
// Server validates X-XSRF-TOKEN header on state-changing requests
```

### Why HTTP-only Cookies Don't Need CSRF Token

If using SameSite=Strict cookies:
```
Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict; Secure
```

`SameSite=Strict` prevents the browser from sending the cookie on cross-site requests — CSRF is impossible.

---

## 7. Route-Level Authentication Pattern

```typescript
// features/auth/auth.routes.ts
export const authRoutes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [noAuthGuard]  // Redirect logged-in users away from login
  },
  {
    path: 'register',
    component: RegisterPageComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordPageComponent
  }
];

// Redirect already-authenticated users away from login
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? router.createUrlTree(['/dashboard'])
    : true;
};
```

### Post-Login Redirect

```typescript
// login.component.ts
@Component({ standalone: true })
export class LoginPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  onLogin(credentials: LoginCredentials) {
    this.authService.login(credentials).subscribe(() => {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigateByUrl(returnUrl);
    });
  }
}
```

---

## 8. Sensitive Data Handling

```typescript
// WRONG — leaking sensitive data in URL
this.router.navigate(['/profile'], { queryParams: { token: sensitiveToken } });

// WRONG — storing sensitive data in localStorage
localStorage.setItem('creditCard', JSON.stringify(card));

// CORRECT — sensitive data in memory only
this.authService.setTemporaryData(data); // In-memory service signal

// CORRECT — mask sensitive data in templates
{{ cardNumber | maskCard }}  // Shows: **** **** **** 1234

// Pipe implementation
@Pipe({ name: 'maskCard', pure: true })
export class MaskCardPipe implements PipeTransform {
  transform(cardNumber: string): string {
    return cardNumber.replace(/\d(?=\d{4})/g, '*');
  }
}
```

---

## 9. Interview-Ready Answers

**"How do you handle JWT token refresh?"**

> I use an HTTP interceptor that catches 401 responses. When a 401 is received, the interceptor calls the refresh token endpoint (the refresh token is stored in an HTTP-only cookie, so JavaScript can't access it directly). On success, I retry the original request with the new access token. If refresh fails, I clear the in-memory access token and redirect to login. I also prevent refresh from looping on auth endpoint 401s by checking the request URL.

**"What is XSS and how does Angular protect against it?"**

> XSS (Cross-Site Scripting) is an attack where malicious scripts are injected into a page via user input. Angular protects against this by automatically sanitizing all template bindings — `{{ }}` interpolation HTML-encodes values, and `[innerHTML]` strips dangerous tags like `<script>` and inline event handlers. The `DomSanitizer` service should never be used to bypass these protections with user-provided content.

---

## Next Topic

→ [08-ssr-hydration.md](08-ssr-hydration.md) — Server-Side Rendering, Angular Universal, TransferState, and incremental hydration.
