import {
  ChangeDetectionStrategy, Component, inject, computed, signal
} from '@angular/core';
import { Router } from '@angular/router';
import {
  TreeService, FootprintService, InsightsService,
  formatCo2, getMonthLabel, getLast6Months
} from '@ng-mfe-hub/eco-tracker-data-access';
import {
  StatCardComponent, TrendChartComponent,
  TreeCardComponent, ActivityCardComponent, EmptyStateComponent, MiniMapComponent
} from '@ng-mfe-hub/eco-tracker-ui';
import type { ChartDataset } from '@ng-mfe-hub/eco-tracker-ui';
import type { MapMarker } from '@ng-mfe-hub/eco-tracker-data-access';

@Component({
  selector: 'eco-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StatCardComponent, TrendChartComponent,
    TreeCardComponent, ActivityCardComponent, EmptyStateComponent, MiniMapComponent
  ],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:1400px">

      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="fw-bold text-eco mb-0">🌍 Net Impact Dashboard</h2>
          <p class="text-muted mb-0 small">Your carbon offset vs. emissions at a glance</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" (click)="router.navigate(['/eco-tracker/trees/new'])">
            <i class="icon-plus me-1"></i>Plant Tree
          </button>
          <button class="btn btn-outline-danger btn-sm" (click)="router.navigate(['/eco-tracker/footprint/log'])">
            <i class="icon-plus me-1"></i>Log Activity
          </button>
        </div>
      </div>

      <!-- Carbon Balance Hero Card -->
      <div class="card border-0 shadow-sm mb-4 overflow-hidden">
        <div class="card-body p-0">
          <div class="row g-0">
            <div class="col-md-4 p-4 d-flex flex-column justify-content-center"
                 [class.bg-eco-primary]="isNetPositive()"
                 [style.background]="!isNetPositive() ? 'var(--eco-warning-color)' : null"
                 style="color:#fff">
              <div class="small mb-1 opacity-75">Net Carbon Status</div>
              <div class="fw-bold mb-1" style="font-size:2rem">
                {{ isNetPositive() ? '🌿 Net Positive' : '⚠️ Net Negative' }}
              </div>
              <div class="fs-4 fw-bold">{{ formatCo2Fn(Math.abs(netImpact())) }}</div>
              <div class="small opacity-75">
                {{ isNetPositive() ? 'more offset than emitted' : 'more emitted than offset' }}
              </div>
            </div>
            <div class="col-md-8 p-4">
              <div class="row g-3">
                <div class="col-6">
                  <eco-stat-card
                    label="Total CO₂ Offset"
                    [value]="formatCo2Fn(treeService.totalOffset())"
                    icon="icon-leaf"
                    iconColor="var(--eco-primary)"
                    iconBg="var(--eco-accent)"
                    [sub]="treeService.treeCount() + ' trees planted'" />
                </div>
                <div class="col-6">
                  <eco-stat-card
                    label="Total Emissions"
                    [value]="formatCo2Fn(footprintService.totalEmissions())"
                    icon="icon-bolt"
                    iconColor="#e76f51"
                    iconBg="#e76f5122"
                    [sub]="'This month: ' + formatCo2Fn(footprintService.thisMonthEmissions())" />
                </div>
                <div class="col-6">
                  <eco-stat-card
                    label="Trees Planted"
                    [value]="treeService.treeCount() + ''"
                    icon="icon-layers"
                    iconColor="var(--eco-success)"
                    iconBg="#40916c22"
                    sub="Across all species" />
                </div>
                <div class="col-6">
                  <eco-stat-card
                    label="Logging Streak"
                    [value]="footprintService.streak() + ' days'"
                    icon="icon-star"
                    iconColor="#f59e0b"
                    iconBg="#f59e0b22"
                    sub="Keep it up!" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="row g-4 mb-4">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white border-0 pb-0">
              <h6 class="fw-semibold mb-0">Monthly Trend (last 6 months)</h6>
            </div>
            <div class="card-body">
              @defer (on viewport) {
                <eco-trend-chart
                  type="bar"
                  [labels]="monthLabels()"
                  [datasets]="trendDatasets()" />
              } @placeholder {
                <div class="eco-skeleton" style="height:220px"></div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white border-0 pb-0">
              <h6 class="fw-semibold mb-0">Category Breakdown</h6>
            </div>
            <div class="card-body">
              @defer (on viewport) {
                @if (categoryChartDatasets().length > 0) {
                  <eco-trend-chart
                    type="doughnut"
                    [labels]="['Transport','Food','Energy','Shopping']"
                    [datasets]="categoryChartDatasets()"
                    [showLegend]="true" />
                } @else {
                  <eco-empty-state
                    icon="👣"
                    title="No activities yet"
                    message="Log carbon activities to see breakdown"
                    ctaLabel="Log Activity"
                    (ctaClick)="router.navigate(['/eco-tracker/footprint/log'])" />
                }
              } @placeholder {
                <div class="eco-skeleton" style="height:220px"></div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Tree Map + Recent Activity -->
      <div class="row g-4 mb-4">
        <!-- Mini Map -->
        <div class="col-lg-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
              <h6 class="fw-semibold mb-0">🗺️ Tree Map</h6>
              <a class="btn btn-link btn-sm p-0 text-success" (click)="router.navigate(['/eco-tracker/trees'])">
                View all <i class="icon-arrow-right"></i>
              </a>
            </div>
            <div class="card-body p-0">
              @defer (on viewport) {
                @if (mapMarkers().length > 0) {
                  <eco-mini-map
                    [markers]="mapMarkers()"
                    [interactive]="false"
                    [height]="280"
                    [zoom]="5" />
                } @else {
                  <eco-empty-state
                    icon="📍"
                    title="No geo-tagged trees"
                    message="Add location when planting a tree to see it on the map"
                    ctaLabel="Plant a Tree"
                    (ctaClick)="router.navigate(['/eco-tracker/trees/new'])" />
                }
              } @placeholder {
                <div class="eco-skeleton mx-3 mb-3" style="height:280px"></div>
              }
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
              <h6 class="fw-semibold mb-0">Recent Activity</h6>
              <a class="btn btn-link btn-sm p-0 text-success" (click)="router.navigate(['/eco-tracker/footprint'])">
                View all <i class="icon-arrow-right"></i>
              </a>
            </div>
            <div class="card-body py-2">
              @if (recentActivities().length === 0) {
                <eco-empty-state
                  icon="👣"
                  title="No activities yet"
                  message="Start logging your daily carbon activities"
                  ctaLabel="Log Activity"
                  (ctaClick)="router.navigate(['/eco-tracker/footprint/log'])" />
              } @else {
                @for (activity of recentActivities(); track activity.id) {
                  <eco-activity-card [activity]="activity" />
                }
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Trees -->
      @if (recentTrees().length > 0) {
        <div class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-semibold mb-0">🌳 Recently Planted</h6>
            <a class="btn btn-link btn-sm p-0 text-success" (click)="router.navigate(['/eco-tracker/trees'])">
              View all <i class="icon-arrow-right"></i>
            </a>
          </div>
          <div class="row g-3">
            @for (tree of recentTrees(); track tree.id) {
              <div class="col-sm-6 col-md-4 col-xl-3">
                <eco-tree-card
                  [tree]="tree"
                  [species]="treeService.getSpecies(tree.speciesId)"
                  [co2Offset]="treeService.getCo2Offset(tree)"
                  (cardClick)="router.navigate(['/eco-tracker/trees', $event])" />
              </div>
            }
          </div>
        </div>
      }

      <!-- Quick Actions FAB area (mobile) -->
      <div class="d-md-none">
        <div class="eco-fab" (click)="toggleFab()">
          <i class="icon-plus"></i>
        </div>
        @if (fabOpen()) {
          <div class="position-fixed bottom-0 end-0 mb-5 me-3 d-flex flex-column gap-2" style="z-index:999">
            <button class="btn btn-success btn-sm rounded-pill px-3 shadow"
                    (click)="fabOpen.set(false); router.navigate(['/eco-tracker/trees/new'])">
              🌱 Plant Tree
            </button>
            <button class="btn btn-danger btn-sm rounded-pill px-3 shadow"
                    (click)="fabOpen.set(false); router.navigate(['/eco-tracker/footprint/log'])">
              📊 Log Activity
            </button>
            <button class="btn btn-info btn-sm rounded-pill px-3 shadow"
                    (click)="fabOpen.set(false); router.navigate(['/eco-tracker/insights'])">
              💡 Insights
            </button>
          </div>
        }
      </div>

    </div>
  `,
})
export class DashboardPageComponent {
  protected readonly treeService = inject(TreeService);
  protected readonly footprintService = inject(FootprintService);
  protected readonly insightsService = inject(InsightsService);
  protected readonly router = inject(Router);

  protected readonly fabOpen = signal(false);
  protected readonly formatCo2Fn = formatCo2;
  protected readonly Math = Math;

  protected readonly netImpact = this.insightsService.netImpact;
  protected readonly isNetPositive = this.insightsService.isNetPositive;

  protected readonly recentTrees = computed(() => this.treeService.trees().slice(0, 4));
  protected readonly recentActivities = computed(() => this.footprintService.activities().slice(0, 5));

  protected readonly mapMarkers = computed<MapMarker[]>(() =>
    this.treeService.trees()
      .filter((t) => t.coords)
      .map((t) => ({
        id: t.id,
        coords: t.coords!,
        label: this.treeService.getSpecies(t.speciesId)?.commonName ?? 'Tree',
      })),
  );

  protected readonly monthLabels = computed(() =>
    getLast6Months().map(getMonthLabel),
  );

  protected readonly trendDatasets = computed<ChartDataset[]>(() => {
    const netData = this.insightsService.monthlyNetData();
    return [
      { label: 'Emissions (kg CO₂)', data: netData.map((d) => d.emissions), color: '#e76f51' },
      { label: 'Offset (kg CO₂)',    data: netData.map((d) => Math.round(d.offset * 10) / 10), color: '#2d6a4f' },
    ];
  });

  protected readonly categoryChartDatasets = computed<ChartDataset[]>(() => {
    const bd = this.footprintService.categoryBreakdown();
    const vals = [bd.transport, bd.food, bd.energy, bd.shopping];
    if (vals.every((v) => v === 0)) return [];
    return [{
      label: 'CO₂e by Category',
      data: vals,
      color: '#e76f51',
    }];
  });

  protected toggleFab(): void {
    this.fabOpen.update((v) => !v);
  }
}
