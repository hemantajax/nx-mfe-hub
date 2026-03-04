import {
  ChangeDetectionStrategy, Component, inject, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { FootprintService, formatCo2 } from '@ng-mfe-hub/eco-tracker-data-access';
import type { ActivityCategory } from '@ng-mfe-hub/eco-tracker-data-access';
import { ActivityCardComponent, EmptyStateComponent } from '@ng-mfe-hub/eco-tracker-ui';

@Component({
  selector: 'eco-activity-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActivityCardComponent, EmptyStateComponent],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:900px">
      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="fw-bold text-eco mb-0">👣 Carbon Footprint</h2>
          <p class="text-muted mb-0 small">
            Total: {{ formatCo2Fn(footprintService.totalEmissions()) }} CO₂ ·
            This month: {{ formatCo2Fn(footprintService.thisMonthEmissions()) }}
          </p>
        </div>
        <div class="d-flex gap-2">
          <a class="btn btn-outline-secondary btn-sm" (click)="router.navigate(['/eco-tracker/footprint/breakdown'])">
            <i class="icon-bar-chart me-1"></i>Breakdown
          </a>
          <button class="btn btn-danger btn-sm" (click)="router.navigate(['/eco-tracker/footprint/log'])">
            <i class="icon-plus me-1"></i>Log Activity
          </button>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="d-flex gap-2 mb-4 flex-wrap align-items-center">
        <button class="btn btn-sm"
                [class.btn-danger]="filterCat() === ''"
                [class.btn-outline-secondary]="filterCat() !== ''"
                (click)="filterCat.set('')">All</button>
        @for (cat of categories; track cat) {
          <button class="btn btn-sm"
                  [class.btn-danger]="filterCat() === cat"
                  [class.btn-outline-secondary]="filterCat() !== cat"
                  (click)="filterCat.set(cat)">
            {{ catLabel(cat) }}
          </button>
        }
        @if (filterCat()) {
          <span class="text-muted small ms-2">
            {{ formatCo2Fn(filteredTotal()) }} CO₂ in selected category
          </span>
        }
      </div>

      @if (footprintService.loading()) {
        @for (i of [1,2,3]; track i) {
          <div class="eco-skeleton mb-2" style="height:60px;border-radius:0.5rem"></div>
        }
      } @else if (filteredActivities().length === 0) {
        <eco-empty-state
          [icon]="footprintService.activities().length === 0 ? '🌿' : '🔍'"
          [title]="footprintService.activities().length === 0 ? 'No activities logged' : 'No activities in this category'"
          [message]="footprintService.activities().length === 0 ? 'Start tracking your daily carbon footprint.' : 'Try a different category filter.'"
          [ctaLabel]="footprintService.activities().length === 0 ? 'Log Activity' : ''"
          (ctaClick)="router.navigate(['/eco-tracker/footprint/log'])" />
      } @else {
        @for (activity of filteredActivities(); track activity.id) {
          <eco-activity-card
            [activity]="activity"
            [showDelete]="true"
            (deleteClick)="deleteActivity($event)" />
        }
      }
    </div>
  `,
})
export class ActivityLogComponent {
  protected readonly footprintService = inject(FootprintService);
  protected readonly router = inject(Router);
  protected readonly formatCo2Fn = formatCo2;

  protected readonly filterCat = signal<ActivityCategory | ''>('');
  protected readonly categories: ActivityCategory[] = ['transport', 'food', 'energy', 'shopping'];

  protected readonly filteredActivities = computed(() => {
    const cat = this.filterCat();
    return cat
      ? this.footprintService.activities().filter((a) => a.category === cat)
      : this.footprintService.activities();
  });

  protected readonly filteredTotal = computed(() =>
    this.filteredActivities().reduce((s, a) => s + a.co2e, 0),
  );

  protected catLabel(cat: ActivityCategory): string {
    return { transport: '🚗 Transport', food: '🍽️ Food', energy: '⚡ Energy', shopping: '🛍️ Shopping' }[cat];
  }

  async deleteActivity(id: string): Promise<void> {
    if (confirm('Delete this activity?')) {
      await this.footprintService.deleteActivity(id);
    }
  }
}
