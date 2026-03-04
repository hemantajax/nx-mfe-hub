import {
  ChangeDetectionStrategy, Component, inject, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { TreeService } from '@ng-mfe-hub/eco-tracker-data-access';
import {
  TreeCardComponent, EmptyStateComponent, MiniMapComponent
} from '@ng-mfe-hub/eco-tracker-ui';
import type { MapMarker } from '@ng-mfe-hub/eco-tracker-data-access';

@Component({
  selector: 'eco-tree-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TreeCardComponent, EmptyStateComponent, MiniMapComponent],
  template: `
    <div class="container-fluid py-4 px-3 px-md-4" style="max-width:1400px">
      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 class="fw-bold text-eco mb-0">🌳 My Trees</h2>
          <p class="text-muted mb-0 small">
            {{ treeService.treeCount() }} trees · {{ formatOffset() }} CO₂ offset
          </p>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-secondary btn-sm"
                  (click)="viewMode.set(viewMode() === 'grid' ? 'map' : 'grid')">
            <i [class]="viewMode() === 'grid' ? 'icon-location-pin' : 'icon-layout-grid2'"></i>
            {{ viewMode() === 'grid' ? 'Map View' : 'Grid View' }}
          </button>
          <button class="btn btn-link btn-sm text-muted" (click)="router.navigate(['/eco-tracker/trees/species'])">
            <i class="icon-book-open me-1"></i>Species Guide
          </button>
          <button class="btn btn-success btn-sm" (click)="router.navigate(['/eco-tracker/trees/new'])">
            <i class="icon-plus me-1"></i>Plant Tree
          </button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="d-flex gap-2 mb-4 flex-wrap align-items-center">
        <input class="form-control form-control-sm" style="max-width:220px"
               placeholder="Search by species or location..."
               [value]="searchQuery()"
               (input)="searchQuery.set($any($event.target).value)" />
        <select class="form-select form-select-sm" style="max-width:160px"
                [value]="filterCategory()"
                (change)="filterCategory.set($any($event.target).value)">
          <option value="">All categories</option>
          <option value="deciduous">Deciduous</option>
          <option value="evergreen">Evergreen</option>
          <option value="fruit">Fruit</option>
          <option value="palm">Palm</option>
          <option value="flowering">Flowering</option>
        </select>
        @if (searchQuery() || filterCategory()) {
          <button class="btn btn-link btn-sm text-muted p-0" (click)="clearFilters()">
            <i class="icon-close me-1"></i>Clear
          </button>
        }
        <span class="ms-auto text-muted small">{{ filteredTrees().length }} results</span>
      </div>

      @if (treeService.loading()) {
        <div class="row g-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="col-sm-6 col-md-4 col-xl-3">
              <div class="eco-skeleton" style="height:140px;border-radius:0.5rem"></div>
            </div>
          }
        </div>
      } @else if (filteredTrees().length === 0) {
        <eco-empty-state
          [icon]="treeService.treeCount() === 0 ? '🌱' : '🔍'"
          [title]="treeService.treeCount() === 0 ? 'Plant your first tree' : 'No trees match your filters'"
          [message]="treeService.treeCount() === 0 ? 'Start your green journey by planting a tree and tracking its CO₂ offset.' : 'Try different search terms or clear filters.'"
          [ctaLabel]="treeService.treeCount() === 0 ? 'Plant a Tree' : ''"
          (ctaClick)="router.navigate(['/eco-tracker/trees/new'])" />
      } @else if (viewMode() === 'map') {
        @defer (on viewport) {
          <eco-mini-map
            [markers]="mapMarkers()"
            [interactive]="true"
            [height]="500"
            [zoom]="4" />
        } @placeholder {
          <div class="eco-skeleton" style="height:500px;border-radius:0.5rem"></div>
        }
      } @else {
        <div class="row g-3">
          @for (tree of filteredTrees(); track tree.id) {
            <div class="col-sm-6 col-md-4 col-xl-3">
              <eco-tree-card
                [tree]="tree"
                [species]="treeService.getSpecies(tree.speciesId)"
                [co2Offset]="treeService.getCo2Offset(tree)"
                (cardClick)="router.navigate(['/eco-tracker/trees', $event])" />
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TreeListComponent {
  protected readonly treeService = inject(TreeService);
  protected readonly router = inject(Router);

  protected readonly viewMode = signal<'grid' | 'map'>('grid');
  protected readonly searchQuery = signal('');
  protected readonly filterCategory = signal('');

  protected readonly filteredTrees = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const cat = this.filterCategory();
    return this.treeService.trees().filter((t) => {
      const sp = this.treeService.getSpecies(t.speciesId);
      const matchesSearch = !q || (sp?.commonName ?? '').toLowerCase().includes(q)
        || t.location.toLowerCase().includes(q);
      const matchesCat = !cat || sp?.category === cat;
      return matchesSearch && matchesCat;
    });
  });

  protected readonly mapMarkers = computed<MapMarker[]>(() =>
    this.filteredTrees()
      .filter((t) => t.coords)
      .map((t) => ({
        id: t.id,
        coords: t.coords!,
        label: `${this.treeService.getSpecies(t.speciesId)?.icon ?? '🌳'} ${this.treeService.getSpecies(t.speciesId)?.commonName} — ${t.location}`,
      })),
  );

  protected formatOffset(): string {
    const offset = this.treeService.totalOffset();
    return offset >= 1000 ? `${(offset / 1000).toFixed(2)}t` : `${offset.toFixed(1)} kg`;
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.filterCategory.set('');
  }
}
