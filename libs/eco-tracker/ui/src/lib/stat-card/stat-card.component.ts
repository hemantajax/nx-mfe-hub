import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'eco-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card eco-stat-card h-100 border-0 shadow-sm">
      <div class="card-body d-flex align-items-start gap-3 p-3">
        <div class="flex-shrink-0 rounded-3 p-2 d-flex align-items-center justify-content-center"
             [style.background]="iconBg()" style="width:2.75rem;height:2.75rem">
          <i [class]="'fs-5 ' + icon()" [style.color]="iconColor()"></i>
        </div>
        <div class="flex-grow-1 min-width-0">
          <div class="text-muted small mb-1">{{ label() }}</div>
          <div class="fw-bold fs-5 lh-1">{{ value() }}</div>
          @if (sub()) {
            <div class="text-muted" style="font-size:0.7rem;margin-top:2px">{{ sub() }}</div>
          }
        </div>
        @if (trend() !== undefined) {
          <div class="flex-shrink-0 small fw-semibold"
               [class.text-success]="(trend() ?? 0) >= 0"
               [class.text-danger]="(trend() ?? 0) < 0">
            <i [class]="(trend() ?? 0) >= 0 ? 'icon-arrow-up' : 'icon-arrow-down'"></i>
            {{ Math.abs(trend() ?? 0) }}%
          </div>
        }
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input<string>('icon-star');
  readonly iconColor = input<string>('var(--eco-primary)');
  readonly iconBg = input<string>('var(--eco-accent)');
  readonly sub = input<string>('');
  readonly trend = input<number | undefined>(undefined);

  protected readonly Math = Math;
}
