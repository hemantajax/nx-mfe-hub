import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import type { Activity } from '@ng-mfe-hub/eco-tracker-data-access';
import { formatCo2 } from '@ng-mfe-hub/eco-tracker-data-access';
import { CategoryIconComponent } from '../category-icon/category-icon.component';

function toTitleCase(s: string): string {
  return s.replace(/[-_]/g, ' ').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

@Component({
  selector: 'eco-activity-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CategoryIconComponent],
  template: `
    <div class="d-flex align-items-center gap-3 p-3 rounded-3 border bg-white mb-2">
      <eco-category-icon [category]="activity().category" [size]="40" />
      <div class="flex-grow-1 min-width-0">
        <div class="fw-semibold text-truncate small">{{ typeLabel() }}</div>
        <div class="text-muted" style="font-size:0.7rem">
          {{ activity().value }} {{ activity().unit }}
          @if (activity().notes) { · {{ activity().notes }} }
        </div>
      </div>
      <div class="text-end flex-shrink-0">
        <div class="badge badge-emission">{{ formatCo2Fn(activity().co2e) }} CO₂</div>
        <div class="text-muted mt-1" style="font-size:0.65rem">{{ activity().date }}</div>
      </div>
      @if (showDelete()) {
        <button class="btn btn-link text-danger p-0 ms-1" (click)="deleteClick.emit(activity().id)" title="Delete">
          <i class="icon-trash"></i>
        </button>
      }
    </div>
  `,
})
export class ActivityCardComponent {
  readonly activity = input.required<Activity>();
  readonly showDelete = input<boolean>(false);
  readonly deleteClick = output<string>();

  protected readonly typeLabel = computed(() => toTitleCase(this.activity().type));
  protected readonly formatCo2Fn = formatCo2;
}
