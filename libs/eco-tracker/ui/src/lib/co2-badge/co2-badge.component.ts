import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { formatCo2 } from '@ng-mfe-hub/eco-tracker-data-access';

@Component({
  selector: 'eco-co2-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge rounded-pill fw-semibold"
          [class.badge-offset]="type() === 'offset'"
          [class.badge-emission]="type() === 'emission'"
          [class.bg-secondary]="type() === 'neutral'">
      @if (type() === 'offset') { ↑ }
      @if (type() === 'emission') { ↓ }
      {{ formattedCo2() }} CO₂
    </span>
  `,
})
export class CO2BadgeComponent {
  readonly value = input.required<number>();
  readonly type = input<'offset' | 'emission' | 'neutral'>('neutral');

  protected readonly formattedCo2 = computed(() => formatCo2(this.value()));
}
