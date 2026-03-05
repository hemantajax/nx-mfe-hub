import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GistService } from '@ng-mfe-hub/eco-tracker-data-access';
import { ToastService } from '@ng-mfe-hub/ui';

@Component({
  selector: 'eco-community-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:700px">
      <a class="text-decoration-none small d-inline-block mb-3" style="cursor:pointer"
         (click)="router.navigate(['/eco-tracker/community'])">
        ← Community Board
      </a>

      <h2 class="fw-bold text-eco mb-4"><i class="icon-settings me-2"></i>Community Settings</h2>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label fw-semibold">Display Name</label>
            <input class="form-control"
                   placeholder="Your name (visible on the board)"
                   [ngModel]="username()"
                   (ngModelChange)="username.set($event)" />
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">
              GitHub Token
              <span class="text-muted fw-normal small">(PAT with <code>gist</code> scope)</span>
            </label>
            <input class="form-control font-monospace" type="password"
                   placeholder="ghp_..."
                   [ngModel]="token()"
                   (ngModelChange)="token.set($event)" />
            <div class="form-text">
              Required to publish. Stored only in your browser — never sent to our code.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">
              Shared Board ID
              <span class="text-muted fw-normal small">(Gist ID — leave blank for first publish)</span>
            </label>
            <input class="form-control font-monospace"
                   placeholder="Paste Gist ID to join an existing board"
                   [ngModel]="gistId()"
                   (ngModelChange)="gistId.set($event)" />
            <div class="form-text">
              Share this ID with others so they publish to the same board.
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold">
              User ID
              <span class="text-muted fw-normal small">(auto-generated — copy to sync identity across devices)</span>
            </label>
            <div class="input-group">
              <input class="form-control font-monospace"
                     [ngModel]="userId()"
                     (ngModelChange)="userId.set($event)" />
              <button class="btn btn-outline-secondary" type="button" (click)="copyUserId()">
                <i class="icon-layers me-1"></i>Copy
              </button>
            </div>
            <div class="form-text">
              Paste this same ID on another device to keep the same identity on the board.
            </div>
          </div>

          <button class="btn btn-success" (click)="save()">
            <i class="icon-check me-1"></i>Save Settings
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CommunitySettingsComponent {
  protected readonly router = inject(Router);
  private readonly gistService = inject(GistService);
  private readonly toastService = inject(ToastService);

  protected readonly username = signal(this.gistService.getUsername());
  protected readonly token = signal(this.gistService.getToken());
  protected readonly gistId = signal(this.gistService.getGistId());
  protected readonly userId = signal(this.gistService.getUserId());

  protected save(): void {
    this.gistService.setUsername(this.username());
    if (this.token()) this.gistService.setToken(this.token());
    if (this.gistId()) this.gistService.setGistId(this.gistId());
    if (this.userId()) this.gistService.setUserId(this.userId());
    this.toastService.success('Settings saved');
    this.router.navigate(['/eco-tracker/community']);
  }

  protected copyUserId(): void {
    navigator.clipboard.writeText(this.gistService.getUserId());
    this.toastService.info('User ID copied');
  }
}
