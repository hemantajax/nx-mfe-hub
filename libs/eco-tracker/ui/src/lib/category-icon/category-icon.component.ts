import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import type { ActivityCategory } from '@ng-mfe-hub/eco-tracker-data-access';

const CATEGORY_ICONS: Record<ActivityCategory, string> = {
  transport: 'icon-car',
  food:      'icon-cup',
  energy:    'icon-bolt',
  shopping:  'icon-bag',
};

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  transport: '#e76f51',
  food:      '#2a9d8f',
  energy:    '#e9c46a',
  shopping:  '#264653',
};

@Component({
  selector: 'eco-category-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="d-inline-flex align-items-center justify-content-center rounded-circle"
          [style.width]="size() + 'px'"
          [style.height]="size() + 'px'"
          [style.background]="bg()"
          [title]="category()">
      <i [class]="iconClass()" [style.color]="color()" [style.font-size]="(size() * 0.45) + 'px'"></i>
    </span>
  `,
})
export class CategoryIconComponent {
  readonly category = input.required<ActivityCategory>();
  readonly size = input<number>(36);

  protected readonly iconClass = computed(() => CATEGORY_ICONS[this.category()] ?? 'icon-star');
  protected readonly color = computed(() => CATEGORY_COLORS[this.category()] ?? '#666');
  protected readonly bg = computed(() => CATEGORY_COLORS[this.category()] + '22');
}
