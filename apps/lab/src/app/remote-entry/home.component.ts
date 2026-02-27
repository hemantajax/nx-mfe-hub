import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center py-5 mt-4">
      <span class="badge rounded-pill bg-warning text-dark px-3 py-2 fs-6 mb-3">Remote</span>
      <h1 class="display-4 fw-light mb-1">Lab</h1>
      <p class="text-muted mb-0">Micro-frontend remote · Port 4204</p>
    </div>
  `,
})
export class HomeComponent {}
