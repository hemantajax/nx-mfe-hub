import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TreeEvent } from '@ng-mfe-hub/eco-tracker-data-access';

const EVENT_ICONS: Record<string, string> = {
  planted:       '🌱',
  watered:       '💧',
  measured:      '📏',
  pruned:        '✂️',
  'health-check': '🩺',
  note:          '📝',
};

const EVENT_COLORS: Record<string, string> = {
  planted:       'var(--eco-success)',
  watered:       '#0ea5e9',
  measured:      '#f59e0b',
  pruned:        '#8b5cf6',
  'health-check': '#ec4899',
  note:          '#6b7280',
};

@Component({
  selector: 'eco-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (events().length === 0) {
      <p class="text-muted text-center py-3 small">No history recorded yet.</p>
    } @else {
      <div class="eco-timeline">
        @for (event of events(); track event.id) {
          <div class="eco-timeline-item">
            <div class="d-flex align-items-start gap-2">
              <span class="flex-shrink-0" style="font-size:1.1rem;line-height:1.4">
                {{ getIcon(event.type) }}
              </span>
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span class="badge rounded-pill small fw-semibold"
                        [style.background]="getColor(event.type)"
                        style="color:#fff;font-size:0.65rem">
                    {{ event.type.replace('-', ' ') }}
                  </span>
                  <span class="text-muted" style="font-size:0.7rem">{{ event.date }}</span>
                  @if (event.healthStatus) {
                    <span class="badge"
                          [class.bg-success]="event.healthStatus === 'healthy'"
                          [class.bg-warning]="event.healthStatus === 'fair'"
                          [class.bg-danger]="event.healthStatus === 'poor'"
                          style="font-size:0.6rem">
                      {{ event.healthStatus }}
                    </span>
                  }
                </div>
                @if (event.notes) {
                  <p class="mb-0 mt-1 small text-muted">{{ event.notes }}</p>
                }
                @if (event.heightCm) {
                  <p class="mb-0 mt-1 small text-success fw-semibold">Height: {{ event.heightCm }} cm</p>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class TimelineComponent {
  readonly events = input.required<TreeEvent[]>();

  protected getIcon(type: string): string {
    return EVENT_ICONS[type] ?? '📝';
  }

  protected getColor(type: string): string {
    return EVENT_COLORS[type] ?? '#6b7280';
  }
}
