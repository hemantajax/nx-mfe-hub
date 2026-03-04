import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { InsightsService } from '@ng-mfe-hub/eco-tracker-data-access';
import { AchievementBadgeComponent } from '@ng-mfe-hub/eco-tracker-ui';

@Component({
  selector: 'eco-achievements-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AchievementBadgeComponent],
  template: `
    <div class="container py-4 px-3 px-md-4" style="max-width:1000px">
      <div class="d-flex align-items-center gap-2 mb-4">
        <button class="btn btn-link p-0 text-muted" (click)="router.navigate(['/eco-tracker/insights'])">
          <i class="icon-arrow-left"></i>
        </button>
        <div>
          <h2 class="fw-bold text-eco mb-0">🏆 Achievements</h2>
          <p class="text-muted mb-0 small">
            {{ insightsService.unlockedCount() }} / {{ insightsService.achievements().length }} unlocked
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="mb-4">
        <div class="progress" style="height:8px">
          <div class="progress-bar bg-success"
               [style.width]="(insightsService.unlockedCount() / insightsService.achievements().length * 100) + '%'">
          </div>
        </div>
      </div>

      <!-- Unlocked first -->
      @if (unlocked().length > 0) {
        <h6 class="fw-semibold text-success mb-3">✅ Unlocked ({{ unlocked().length }})</h6>
        <div class="row g-3 mb-4">
          @for (achievement of unlocked(); track achievement.id) {
            <div class="col-6 col-sm-4 col-md-3 col-lg-2">
              <eco-achievement-badge [achievement]="achievement" />
            </div>
          }
        </div>
      }

      <!-- Locked -->
      @if (locked().length > 0) {
        <h6 class="fw-semibold text-muted mb-3">🔒 Locked ({{ locked().length }})</h6>
        <div class="row g-3">
          @for (achievement of locked(); track achievement.id) {
            <div class="col-6 col-sm-4 col-md-3 col-lg-2">
              <eco-achievement-badge [achievement]="achievement" />
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AchievementsPageComponent {
  protected readonly insightsService = inject(InsightsService);
  protected readonly router = inject(Router);

  protected readonly unlocked = computed(() =>
    this.insightsService.achievements().filter((a) => !!a.unlockedAt),
  );

  protected readonly locked = computed(() =>
    this.insightsService.achievements().filter((a) => !a.unlockedAt),
  );
}
