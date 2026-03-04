import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';

@Component({
  selector: 'eco-goal-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="eco-goal-progress">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small fw-semibold">{{ label() }}</span>
        <span class="small fw-bold" [class.text-success]="pct() >= 100" [class.text-warning]="pct() < 50">
          {{ pct() }}%
        </span>
      </div>
      <div class="progress" style="height:8px">
        <div class="progress-bar"
             role="progressbar"
             [style.width]="pct() + '%'"
             [class.bg-success]="pct() >= 100"
             [class.bg-warning]="pct() < 50 && pct() > 0"
             [class.bg-info]="pct() >= 50 && pct() < 100"
             [attr.aria-valuenow]="pct()"
             aria-valuemin="0"
             aria-valuemax="100">
        </div>
      </div>
      @if (sub()) {
        <div class="text-muted mt-1" style="font-size:0.7rem">{{ sub() }}</div>
      }
    </div>
  `,
})
export class GoalProgressComponent {
  readonly label = input.required<string>();
  readonly progress = input.required<number>();
  readonly sub = input<string>('');

  protected readonly pct = computed(() => Math.min(100, Math.max(0, Math.round(this.progress()))));
}
