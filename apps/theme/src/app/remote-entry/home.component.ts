import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center py-5">
      <span class="badge rounded-pill bg-info px-3 py-2 fs-6 mb-3">Remote</span>
      <h1 class="display-4 fw-light mb-1">Theme</h1>
      <p class="text-muted mb-0">Micro-frontend remote · Port 4205</p>
    </div>
  `,
})
export class HomeComponent {}
