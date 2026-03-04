import {
  ChangeDetectionStrategy, Component, inject, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FootprintService, formatCo2, getMonthLabel, getLast6Months
} from '@ng-mfe-hub/eco-tracker-data-access';
import { TrendChartComponent, EmptyStateComponent } from '@ng-mfe-hub/eco-tracker-ui';
import type { ChartDataset } from '@ng-mfe-hub/eco-tracker-ui';

@Component({
  selector: 'eco-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrendChartComponent, EmptyStateComponent],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:1000px">
      <div class="d-flex align-items-center gap-2 mb-4 flex-wrap">
        <button class="btn btn-link p-0 text-muted" (click)="router.navigate(['/eco-tracker/footprint'])">
          <i class="icon-arrow-left"></i>
        </button>
        <div class="flex-grow-1">
          <h2 class="fw-bold text-eco mb-0">📈 Emission Breakdown</h2>
          <p class="text-muted mb-0 small">Visualize your carbon footprint patterns</p>
        </div>
        <!-- Timeframe toggle -->
        <div class="btn-group btn-group-sm">
          @for (tf of timeframes; track tf) {
            <button class="btn"
                    [class.btn-danger]="timeframe() === tf"
                    [class.btn-outline-secondary]="timeframe() !== tf"
                    (click)="timeframe.set(tf)">
              {{ tf }}
            </button>
          }
        </div>
      </div>

      @if (footprintService.activities().length === 0) {
        <eco-empty-state
          icon="📊"
          title="No emissions data yet"
          message="Log some activities to see your footprint breakdown"
          ctaLabel="Log Activity"
          (ctaClick)="router.navigate(['/eco-tracker/footprint/log'])" />
      } @else {
        <!-- Category Totals -->
        <div class="row g-3 mb-4">
          @for (cat of categoryStats(); track cat.category) {
            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm text-center p-3">
                <div class="mb-1" style="font-size:1.5rem">{{ cat.emoji }}</div>
                <div class="fw-bold">{{ formatCo2Fn(cat.total) }}</div>
                <div class="text-muted small">{{ cat.label }}</div>
                <div class="text-muted" style="font-size:0.68rem">{{ cat.pct }}% of total</div>
              </div>
            </div>
          }
        </div>

        <div class="row g-4">
          <!-- Doughnut -->
          <div class="col-md-5">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white border-0 fw-semibold">Category Distribution</div>
              <div class="card-body">
                @defer (on viewport) {
                  <eco-trend-chart
                    type="doughnut"
                    [labels]="doughnutLabels"
                    [datasets]="doughnutDatasets()"
                    [showLegend]="true" />
                } @placeholder {
                  <div class="eco-skeleton" style="height:220px"></div>
                }
              </div>
            </div>
          </div>

          <!-- Monthly Bar -->
          <div class="col-md-7">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white border-0 fw-semibold">Monthly Emissions (last 6 months)</div>
              <div class="card-body">
                @defer (on viewport) {
                  <eco-trend-chart
                    type="bar"
                    [labels]="monthlyLabels()"
                    [datasets]="monthlyDatasets()" />
                } @placeholder {
                  <div class="eco-skeleton" style="height:220px"></div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Best / Worst Month -->
        <div class="row g-3 mt-2">
          <div class="col-md-6">
            <div class="card border-0 shadow-sm p-3">
              <div class="text-muted small mb-1">🏆 Best Month (lowest emissions)</div>
              <div class="fw-bold">{{ bestMonth()?.label ?? 'N/A' }}</div>
              <div class="text-success">{{ formatCo2Fn(bestMonth()?.total ?? 0) }} CO₂e</div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card border-0 shadow-sm p-3">
              <div class="text-muted small mb-1">⚠️ Worst Month (highest emissions)</div>
              <div class="fw-bold">{{ worstMonth()?.label ?? 'N/A' }}</div>
              <div class="text-danger">{{ formatCo2Fn(worstMonth()?.total ?? 0) }} CO₂e</div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class BreakdownComponent {
  protected readonly footprintService = inject(FootprintService);
  protected readonly router = inject(Router);
  protected readonly formatCo2Fn = formatCo2;

  protected readonly timeframes = ['Monthly', 'Weekly', 'All Time'];
  protected readonly timeframe = signal('Monthly');

  protected readonly doughnutLabels = ['Transport', 'Food', 'Energy', 'Shopping'];
  protected readonly doughnutColors = ['#e76f51', '#2a9d8f', '#e9c46a', '#264653'];

  protected readonly categoryStats = computed(() => {
    const bd = this.footprintService.categoryBreakdown();
    const total = Object.values(bd).reduce((s, v) => s + v, 0);
    return [
      { category: 'transport', emoji: '🚗', label: 'Transport', total: bd.transport, pct: total ? Math.round((bd.transport / total) * 100) : 0 },
      { category: 'food',      emoji: '🍽️', label: 'Food',      total: bd.food,      pct: total ? Math.round((bd.food / total) * 100) : 0 },
      { category: 'energy',    emoji: '⚡', label: 'Energy',    total: bd.energy,    pct: total ? Math.round((bd.energy / total) * 100) : 0 },
      { category: 'shopping',  emoji: '🛍️', label: 'Shopping',  total: bd.shopping,  pct: total ? Math.round((bd.shopping / total) * 100) : 0 },
    ];
  });

  protected readonly doughnutDatasets = computed<ChartDataset[]>(() => {
    const bd = this.footprintService.categoryBreakdown();
    return [{
      label: 'CO₂e (kg)',
      data: [bd.transport, bd.food, bd.energy, bd.shopping],
      color: '#e76f51',
    }];
  });

  protected readonly monthlyLabels = computed(() =>
    getLast6Months().map(getMonthLabel),
  );

  protected readonly monthlyDatasets = computed<ChartDataset[]>(() => {
    const monthly = this.footprintService.monthlyEmissions();
    return [{
      label: 'Emissions (kg CO₂e)',
      data: monthly.map((m) => Math.round(m.total * 10) / 10),
      color: '#e76f51',
    }];
  });

  protected readonly bestMonth = computed(() => {
    const monthly = this.footprintService.monthlyEmissions();
    const withData = monthly.filter((m) => m.total > 0);
    if (!withData.length) return null;
    const best = withData.reduce((a, b) => a.total < b.total ? a : b);
    return { label: getMonthLabel(best.month), total: best.total };
  });

  protected readonly worstMonth = computed(() => {
    const monthly = this.footprintService.monthlyEmissions();
    const withData = monthly.filter((m) => m.total > 0);
    if (!withData.length) return null;
    const worst = withData.reduce((a, b) => a.total > b.total ? a : b);
    return { label: getMonthLabel(worst.month), total: worst.total };
  });
}
