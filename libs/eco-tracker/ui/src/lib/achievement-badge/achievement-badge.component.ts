import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Achievement } from '@ng-mfe-hub/eco-tracker-data-access';

@Component({
  selector: 'eco-achievement-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card border-0 text-center h-100 p-3 eco-achievement"
         [class.opacity-50]="!achievement().unlockedAt"
         [class.eco-achievement--unlocked]="!!achievement().unlockedAt"
         style="transition: all 0.2s ease">
      <div class="mb-2" style="font-size:2.2rem">{{ achievement().icon }}</div>
      <div class="fw-semibold small lh-sm mb-1">{{ achievement().title }}</div>
      <div class="text-muted" style="font-size:0.68rem">{{ achievement().description }}</div>
      @if (achievement().unlockedAt) {
        <div class="mt-2">
          <span class="badge bg-success" style="font-size:0.6rem">
            <i class="icon-check me-1"></i>Unlocked
          </span>
        </div>
      } @else {
        <div class="mt-2">
          <span class="badge bg-secondary" style="font-size:0.6rem">
            <i class="icon-lock me-1"></i>Locked
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    .eco-achievement--unlocked {
      box-shadow: 0 0 0 2px var(--eco-secondary);
      animation: eco-badge-pulse 0.4s ease;
    }
    @keyframes eco-badge-pulse {
      0% { transform: scale(0.95); }
      50% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }
  `],
})
export class AchievementBadgeComponent {
  readonly achievement = input.required<Achievement>();
}
