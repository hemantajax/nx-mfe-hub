import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions, ChartType } from 'chart.js';

export interface ChartDataset {
  readonly label: string;
  readonly data: number[];
  readonly color?: string;
}

const DEFAULT_COLORS = ['#2d6a4f', '#e76f51', '#52b788', '#e9c46a', '#264653', '#2a9d8f'];

@Component({
  selector: 'eco-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseChartDirective],
  template: `
    <div class="eco-chart-container position-relative">
      <canvas baseChart
              [datasets]="chartDatasets()"
              [labels]="labels()"
              [options]="chartOptions()"
              [type]="type()">
      </canvas>
    </div>
  `,
})
export class TrendChartComponent {
  readonly type = input<ChartType>('line');
  readonly labels = input<string[]>([]);
  readonly datasets = input<ChartDataset[]>([]);
  readonly showLegend = input<boolean>(true);

  protected readonly chartDatasets = computed(() =>
    this.datasets().map((ds, i) => {
      const color = ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      const isLine = this.type() === 'line';
      const isDoughnut = this.type() === 'doughnut';
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: isDoughnut
          ? DEFAULT_COLORS
          : isLine ? color + '33' : color,
        borderColor: isDoughnut ? DEFAULT_COLORS : color,
        borderWidth: isLine ? 2 : 0,
        fill: isLine,
        tension: 0.4,
        pointRadius: isLine ? 3 : 0,
        pointHoverRadius: 5,
        borderRadius: isLine ? 0 : 6,
      };
    }),
  );

  protected readonly chartOptions = computed<ChartOptions>(() => ({
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.2,
    plugins: {
      legend: {
        display: this.showLegend(),
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: this.type() !== 'doughnut' ? {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#e5e7eb' }, ticks: { font: { size: 11 } } },
    } : {},
  }));
}
