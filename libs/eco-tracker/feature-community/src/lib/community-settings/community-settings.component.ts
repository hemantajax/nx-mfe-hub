import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GistService, GistInfo } from '@ng-mfe-hub/eco-tracker-data-access';
import { ToastService, ConfirmDialogService } from '@ng-mfe-hub/ui';

@Component({
  selector: 'eco-community-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
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
              <span class="text-muted fw-normal small">(auto-discovered)</span>
            </label>
            <div class="input-group">
              <input class="form-control font-monospace" readonly
                     [value]="gistId() || '—'" />
              <button class="btn btn-outline-secondary" type="button"
                      [disabled]="!gistId()" (click)="copyGistId()">
                <i class="icon-layers me-1"></i>Copy
              </button>
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

      <!-- Admin: Gist Management -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h5 class="fw-bold mb-0"><i class="icon-panel me-2"></i>Gist Management</h5>
            <button class="btn btn-outline-secondary btn-sm" (click)="loadGists()" [disabled]="loadingGists()">
              @if (loadingGists()) {
                <span class="spinner-border spinner-border-sm me-1"></span>
              } @else {
                <i class="icon-reload me-1"></i>
              }
              Scan
            </button>
          </div>
          <p class="text-muted small mb-3">
            Lists all <code>eco-tracker-community.json</code> gists owned by the token account. Delete stale/duplicate boards.
          </p>

          @if (gists().length) {
            <div class="list-group">
              @for (g of gists(); track g.id) {
                <div class="list-group-item d-flex align-items-center gap-3 py-2">
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2">
                      <code class="small">{{ g.id.slice(0, 12) }}…</code>
                      @if (g.isActive) {
                        <span class="badge bg-success bg-opacity-10 text-success" style="font-size:.6rem">Active</span>
                      }
                      @if (!g.isPublic) {
                        <span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.6rem">Private</span>
                      }
                    </div>
                    <div class="text-muted small">Updated {{ g.updatedAt | date:'medium' }}</div>
                  </div>
                  <button class="btn btn-sm btn-outline-secondary py-0 px-2" title="Copy ID"
                          (click)="copyId(g.id)">
                    <i class="icon-layers"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger py-0 px-2" title="Delete gist"
                          [disabled]="g.isActive"
                          (click)="deleteGist(g.id)">
                    <i class="icon-trash"></i>
                  </button>
                </div>
              }
            </div>
          } @else if (!loadingGists()) {
            <p class="text-muted small mb-0">Click <strong>Scan</strong> to find community gists.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class CommunitySettingsComponent {
  protected readonly router = inject(Router);
  private readonly gistService = inject(GistService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly username = signal(this.gistService.getUsername());
  protected readonly token = signal(this.gistService.getToken());
  protected readonly gistId = signal(this.gistService.getGistId());
  protected readonly userId = signal(this.gistService.getUserId());

  protected readonly gists = signal<GistInfo[]>([]);
  protected readonly loadingGists = signal(false);

  protected save(): void {
    this.gistService.setUsername(this.username());
    if (this.token()) this.gistService.setToken(this.token());
    if (this.userId()) this.gistService.setUserId(this.userId());
    this.toastService.success('Settings saved');
    this.router.navigate(['/eco-tracker/community']);
  }

  protected copyUserId(): void {
    navigator.clipboard.writeText(this.gistService.getUserId());
    this.toastService.info('User ID copied');
  }

  protected copyGistId(): void {
    navigator.clipboard.writeText(this.gistService.getGistId());
    this.toastService.info('Board ID copied');
  }

  protected async loadGists(): Promise<void> {
    this.loadingGists.set(true);
    try {
      const list = await this.gistService.listCommunityGists();
      this.gists.set(list);
      this.toastService.info(`Found ${list.length} community gist(s)`);
    } catch {
      this.toastService.error('Failed to load gists');
    } finally {
      this.loadingGists.set(false);
    }
  }

  protected async deleteGist(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: 'Delete Gist',
      message: `Permanently delete gist ${id.slice(0, 12)}…? This cannot be undone.`,
      confirmText: 'Delete',
      confirmClass: 'btn-danger',
    });
    if (!confirmed) return;

    try {
      await this.gistService.deleteGist(id);
      this.gists.update(prev => prev.filter(g => g.id !== id));
      this.toastService.success('Gist deleted');
    } catch (e: unknown) {
      this.toastService.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  protected copyId(id: string): void {
    navigator.clipboard.writeText(id);
    this.toastService.info('Gist ID copied');
  }
}
