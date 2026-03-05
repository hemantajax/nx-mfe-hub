import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  GistService, CommunityService, formatCo2,
} from '@ng-mfe-hub/eco-tracker-data-access';
import { ToastService, ConfirmDialogService } from '@ng-mfe-hub/ui';

@Component({
  selector: 'eco-community-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:1100px">

      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="fw-bold text-eco mb-0">🌐 Community Board</h2>
          <p class="text-muted mb-0 small">Shared eco-tracker leaderboard</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm"
                  [disabled]="communityService.loading()"
                  (click)="refresh()">
            <i class="icon-reload me-1"></i>Refresh
          </button>
          <button class="btn btn-outline-secondary btn-sm"
                  (click)="router.navigate(['/eco-tracker/community/settings'])">
            <i class="icon-settings me-1"></i>Settings
          </button>
          <button class="btn btn-success btn-sm" [disabled]="publishing()" (click)="publish()">
            @if (publishing()) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            } @else {
              <i class="icon-share me-1"></i>
            }
            Publish
          </button>
        </div>
      </div>

      <!-- Gist ID Info -->
      @if (gistService.getGistId()) {
        <div class="alert alert-light border d-flex align-items-center gap-2 py-2 small">
          <i class="icon-link text-muted"></i>
          <span class="text-muted">Board ID:</span>
          <code class="flex-grow-1 text-truncate">{{ gistService.getGistId() }}</code>
          <button class="btn btn-sm btn-outline-secondary py-0 px-2" (click)="copyGistId()">
            <i class="icon-layers"></i>
          </button>
        </div>
      }

      <!-- Loading -->
      @if (communityService.loading()) {
        <div class="text-center py-5">
          <span class="spinner-border text-success"></span>
          <p class="text-muted mt-2 small">Loading community board...</p>
        </div>
      } @else if (communityService.users().length) {
        <!-- Table -->
        <div class="card border-0 shadow-sm">
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead>
                <tr class="border-bottom" style="background:#fafafa">
                  <th class="ps-3 fw-semibold small text-muted">User</th>
                  <th class="text-center fw-semibold small text-muted">Trees</th>
                  <th class="text-center fw-semibold small text-muted">Offset</th>
                  <th class="text-center fw-semibold small text-muted">Emissions</th>
                  <th class="text-center fw-semibold small text-muted">Net Impact</th>
                  <th class="text-center fw-semibold small text-muted">Published</th>
                  <th class="text-end pe-3 fw-semibold small text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of communityService.users(); track user.uid) {
                  <tr class="border-bottom">
                    <td class="ps-3">
                      <div class="d-flex align-items-center gap-2">
                        <span class="avatar-sm bg-success text-white fw-bold">
                          {{ user.username.charAt(0).toUpperCase() }}
                        </span>
                        <span class="fw-semibold">{{ user.username }}</span>
                        @if (user.uid === gistService.getUserId()) {
                          <span class="badge bg-success bg-opacity-10 text-success" style="font-size:0.6rem">You</span>
                        }
                      </div>
                    </td>
                    <td class="text-center">
                      <span class="fw-semibold text-success">{{ user.summary.treeCount }}</span>
                    </td>
                    <td class="text-center">
                      <span class="text-success">{{ fmt(user.summary.totalOffset) }}</span>
                    </td>
                    <td class="text-center">
                      <span class="text-danger">{{ fmt(user.summary.totalEmissions) }}</span>
                    </td>
                    <td class="text-center">
                      <span class="badge rounded-pill"
                            [class.bg-success]="user.summary.isNetPositive"
                            [class.bg-danger]="!user.summary.isNetPositive"
                            [class.bg-opacity-10]="true"
                            [class.text-success]="user.summary.isNetPositive"
                            [class.text-danger]="!user.summary.isNetPositive">
                        {{ user.summary.isNetPositive ? '+' : '' }}{{ fmt(user.summary.netImpact) }}
                      </span>
                    </td>
                    <td class="text-center small text-muted">
                      {{ user.publishedAt | date:'shortDate' }}
                    </td>
                    <td class="text-end pe-3">
                      <button class="btn btn-sm btn-link text-muted p-1"
                              title="View details"
                              (click)="router.navigate(['/eco-tracker/community', user.uid])">
                        <i class="icon-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-link text-muted p-1"
                              title="Remove"
                              (click)="deleteUser(user.uid, user.username)">
                        <i class="icon-trash"></i>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="text-center py-5">
          <div class="mb-2" style="font-size:2.5rem">🌐</div>
          <p class="text-muted mb-1">No one has published yet</p>
          <p class="text-muted small">Click Publish to add your data to the board</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }
    tbody tr:hover {
      background: #f8f9fa;
    }
  `],
})
export class CommunityListComponent {
  protected readonly router = inject(Router);
  protected readonly gistService = inject(GistService);
  protected readonly communityService = inject(CommunityService);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly fmt = formatCo2;

  protected readonly publishing = signal(false);

  constructor() {
    if (this.gistService.getGistId()) {
      void this.communityService.loadUsers();
    }
  }

  protected async publish(): Promise<void> {
    if (!this.gistService.getUsername()) {
      this.toastService.warning('Set your display name in Settings first.');
      this.router.navigate(['/eco-tracker/community/settings']);
      return;
    }
    this.publishing.set(true);
    try {
      await this.communityService.publishMyData();
      this.toastService.success('Published to community board!');
    } catch (e: unknown) {
      this.toastService.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      this.publishing.set(false);
    }
  }

  protected async refresh(): Promise<void> {
    await this.communityService.loadUsers();
    this.toastService.success('Board refreshed');
  }

  protected async deleteUser(uid: string, username: string): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: 'Remove Member',
      message: `Remove ${username} from the community board? This cannot be undone.`,
      confirmText: 'Remove',
      confirmClass: 'btn-danger',
    });
    if (!confirmed) return;

    try {
      await this.communityService.removeUser(uid);
      this.toastService.success(`${username} removed`);
    } catch (e: unknown) {
      this.toastService.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  protected copyGistId(): void {
    navigator.clipboard.writeText(this.gistService.getGistId());
    this.toastService.info('Board ID copied — share with others!');
  }
}
