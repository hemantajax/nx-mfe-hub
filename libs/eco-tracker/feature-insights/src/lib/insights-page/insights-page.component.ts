import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  InsightsService, FootprintService, TreeService,
  formatCo2, getMonthLabel
} from '@ng-mfe-hub/eco-tracker-data-access';
import { TrendChartComponent } from '@ng-mfe-hub/eco-tracker-ui';
import type { ChartDataset } from '@ng-mfe-hub/eco-tracker-ui';

@Component({
  selector: 'eco-insights-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrendChartComponent],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:1100px">
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="fw-bold text-eco mb-0">💡 Insights</h2>
          <p class="text-muted mb-0 small">Trends, analysis, and personalized eco-tips</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" (click)="router.navigate(['/eco-tracker/insights/goals'])">
            <i class="icon-target me-1"></i>Goals
          </button>
          <button class="btn btn-outline-secondary btn-sm" (click)="router.navigate(['/eco-tracker/insights/achievements'])">
            🏆 Achievements
          </button>
          <button class="btn btn-success btn-sm" (click)="exportData()">
            <i class="icon-cloud-download me-1"></i>Export
          </button>
        </div>
      </div>

      <!-- Net Impact Banner -->
      <div class="card border-0 shadow-sm mb-4 p-4"
           [class.bg-eco-primary]="insightsService.isNetPositive()"
           [style.background]="!insightsService.isNetPositive() ? '#e76f51' : null"
           style="color:#fff">
        <div class="row align-items-center g-3">
          <div class="col-md-8">
            <div class="mb-1 opacity-75 small">Lifetime Net Carbon Impact</div>
            <div class="fw-bold" style="font-size:1.8rem">
              {{ insightsService.isNetPositive() ? '🌍 You are NET POSITIVE' : '⚠️ You are NET NEGATIVE' }}
            </div>
            <div class="opacity-90">
              {{ formatCo2Fn(Math.abs(insightsService.netImpact())) }}
              {{ insightsService.isNetPositive() ? 'more absorbed than emitted' : 'more emitted than absorbed' }}
            </div>
          </div>
          <div class="col-md-4 text-md-end">
            <div class="opacity-75 small">Offset</div>
            <div class="fw-bold fs-5">{{ formatCo2Fn(treeService.totalOffset()) }} ↑</div>
            <div class="opacity-75 small mt-1">Emissions</div>
            <div class="fw-bold fs-5">{{ formatCo2Fn(footprintService.totalEmissions()) }} ↓</div>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white border-0 fw-semibold">
          Monthly Offset vs. Emissions (last 6 months)
        </div>
        <div class="card-body">
          @defer (on viewport) {
            <eco-trend-chart
              type="line"
              [labels]="monthLabels()"
              [datasets]="trendDatasets()" />
          } @placeholder {
            <div class="eco-skeleton" style="height:220px"></div>
          }
        </div>
      </div>

      <!-- Month-over-Month -->
      <div class="row g-4 mb-4">
        @for (item of monthComparison(); track item.month) {
          <div class="col-md-4 col-lg-2">
            <div class="card border-0 shadow-sm text-center p-3 h-100">
              <div class="text-muted small mb-1">{{ item.label }}</div>
              <div class="fw-bold" [class.text-danger]="item.emissions > 0">
                {{ item.emissions > 0 ? formatCo2Fn(item.emissions) : '–' }}
              </div>
              <div class="text-muted" style="font-size:0.65rem">emissions</div>
              @if (item.prevEmissions !== null && item.prevEmissions > 0) {
                <div class="mt-1 small"
                     [class.text-success]="item.emissions <= item.prevEmissions"
                     [class.text-danger]="item.emissions > item.prevEmissions">
                  {{ item.emissions <= item.prevEmissions ? '↓' : '↑' }}
                  {{ Math.abs(Math.round(((item.emissions - item.prevEmissions) / item.prevEmissions) * 100)) }}%
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Eco Tips -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white border-bottom fw-semibold">
          🌿 Personalized Eco-Tips
        </div>
        <div class="card-body">
          <div class="row g-3">
            @for (tip of insightsService.contextualTips(); track tip.tip) {
              <div class="col-md-4">
                <div class="d-flex gap-3 p-3 rounded-3 border h-100">
                  <div class="flex-shrink-0">
                    <i [class]="'fs-4 text-eco ' + tip.icon"></i>
                  </div>
                  <p class="mb-0 small text-muted">{{ tip.tip }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class InsightsPageComponent {
  protected readonly insightsService = inject(InsightsService);
  protected readonly footprintService = inject(FootprintService);
  protected readonly treeService = inject(TreeService);
  protected readonly router = inject(Router);
  protected readonly formatCo2Fn = formatCo2;
  protected readonly Math = Math;

  protected readonly monthLabels = computed(() =>
    this.insightsService.monthlyNetData().map((d) => d.label),
  );

  protected readonly trendDatasets = computed<ChartDataset[]>(() => {
    const data = this.insightsService.monthlyNetData();
    return [
      { label: 'Offset (kg CO₂)',    data: data.map((d) => Math.round(d.offset * 10) / 10),    color: '#2d6a4f' },
      { label: 'Emissions (kg CO₂)', data: data.map((d) => Math.round(d.emissions * 10) / 10), color: '#e76f51' },
    ];
  });

  protected readonly monthComparison = computed(() => {
    const months = this.insightsService.monthlyNetData();
    return months.map((m, i) => ({
      month: m.month,
      label: m.label,
      emissions: m.emissions,
      prevEmissions: i > 0 ? months[i - 1].emissions : null,
    }));
  });

  protected exportData(): void {
    const json = this.insightsService.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eco-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
