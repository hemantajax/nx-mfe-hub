import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  GistService, CommunityService, formatCo2,
} from '@ng-mfe-hub/eco-tracker-data-access';

@Component({
  selector: 'eco-community-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:800px">
      <a class="text-decoration-none small d-inline-block mb-3" style="cursor:pointer"
         (click)="router.navigate(['/eco-tracker/community'])">
        ← All Members
      </a>

      @if (user(); as u) {
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <!-- User Header -->
            <div class="d-flex align-items-center gap-3 mb-4">
              <span class="avatar-lg bg-success text-white fw-bold">
                {{ u.username.charAt(0).toUpperCase() }}
              </span>
              <div>
                <h3 class="fw-bold mb-0">
                  {{ u.username }}
                  @if (u.uid === gistService.getUserId()) {
                    <span class="badge bg-success bg-opacity-10 text-success ms-1" style="font-size:0.65rem">You</span>
                  }
                </h3>
                <div class="text-muted small">Published {{ u.publishedAt | date:'medium' }}</div>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="row g-3 mb-4">
              <div class="col-6 col-md-3">
                <div class="p-3 rounded-3 bg-light text-center h-100">
                  <div class="text-success fw-bold fs-4">{{ u.summary.treeCount }}</div>
                  <div class="text-muted small">Trees Planted</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="p-3 rounded-3 bg-light text-center h-100">
                  <div class="text-success fw-bold fs-4">{{ fmt(u.summary.totalOffset) }}</div>
                  <div class="text-muted small">CO₂ Offset</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="p-3 rounded-3 bg-light text-center h-100">
                  <div class="text-danger fw-bold fs-4">{{ fmt(u.summary.totalEmissions) }}</div>
                  <div class="text-muted small">CO₂ Emissions</div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="p-3 rounded-3 text-center h-100"
                     [class.bg-success]="u.summary.isNetPositive"
                     [class.bg-danger]="!u.summary.isNetPositive"
                     [class.bg-opacity-10]="true">
                  <div class="fw-bold fs-4"
                       [class.text-success]="u.summary.isNetPositive"
                       [class.text-danger]="!u.summary.isNetPositive">
                    {{ fmt(Math.abs(u.summary.netImpact)) }}
                  </div>
                  <div class="small"
                       [class.text-success]="u.summary.isNetPositive"
                       [class.text-danger]="!u.summary.isNetPositive">
                    {{ u.summary.isNetPositive ? 'Net Positive' : 'Net Negative' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Net Impact Banner -->
            <div class="p-3 rounded-3 text-center"
                 [style.background]="u.summary.isNetPositive ? 'var(--eco-primary, #40916c)' : 'var(--eco-warning-color, #e76f51)'"
                 style="color:#fff">
              <div class="fw-bold fs-5">
                {{ u.summary.isNetPositive ? '🌍 This user is NET POSITIVE' : '⚠️ This user is NET NEGATIVE' }}
              </div>
              <div class="opacity-90 small">
                {{ fmt(Math.abs(u.summary.netImpact)) }}
                {{ u.summary.isNetPositive ? 'more absorbed than emitted' : 'more emitted than absorbed' }}
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="text-center py-5 text-muted">
          <p>User not found. They may not have published yet.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .avatar-lg {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
  `],
})
export class CommunityDetailComponent {
  protected readonly router = inject(Router);
  protected readonly gistService = inject(GistService);
  private readonly communityService = inject(CommunityService);
  private readonly route = inject(ActivatedRoute);
  protected readonly fmt = formatCo2;
  protected readonly Math = Math;

  protected readonly user = computed(() => {
    const uid = this.route.snapshot.paramMap.get('uid') ?? '';
    return this.communityService.users().find((u) => u.uid === uid);
  });
}
