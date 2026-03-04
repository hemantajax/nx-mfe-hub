import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'eco-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center py-5 px-3">
      <div class="mb-3" style="font-size:3rem">{{ icon() }}</div>
      <h5 class="fw-semibold text-eco mb-2">{{ title() }}</h5>
      <p class="text-muted mb-4 mx-auto" style="max-width:320px">{{ message() }}</p>
      @if (ctaLabel()) {
        <button class="btn btn-success" (click)="ctaClick.emit()">
          <i class="icon-plus me-1"></i>{{ ctaLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>('🌱');
  readonly title = input<string>('Nothing here yet');
  readonly message = input<string>('Get started by adding your first entry.');
  readonly ctaLabel = input<string>('');
  readonly ctaClick = output<void>();
}
