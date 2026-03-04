import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TreeService } from '@ng-mfe-hub/eco-tracker-data-access';
import {
  EmptyStateComponent,
  MapMarker,
  MiniMapComponent,
  TreeCardComponent,
} from '@ng-mfe-hub/eco-tracker-ui';

type ViewMode = 'grid' | 'map';

@Component({
  selector: 'lib-tree-list-page',
  imports: [RouterLink, TreeCardComponent, EmptyStateComponent, MiniMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid px-3 px-md-4 py-4">

      <!-- Header -->
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h4 class="fw-bold text-eco mb-0">🌳 My Trees</h4>
          <p class="text-muted small mb-0">{{ treeService.totalCount() }} trees planted · {{ treeService.totalCo2Offset().toFixed(1) }} kg CO₂ offset</p>
        </div>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <!-- View toggle -->
          <div class="btn-group btn-group-sm">
            <button
              class="btn"
              [class]="view() === 'grid' ? 'btn-eco-primary text-white' : 'btn-outline-secondary'"
              [style.background]="view() === 'grid' ? 'var(--eco-primary)' : ''"
              [style.border-color]="view() === 'grid' ? 'var(--eco-primary)' : ''"
              (click)="view.set('grid')"
            >
              <i class="icon-layout-grid2"></i>
            </button>
            <button
              class="btn"
              [class]="view() === 'map' ? 'btn-eco-primary text-white' : 'btn-outline-secondary'"
              [style.background]="view() === 'map' ? 'var(--eco-primary)' : ''"
              [style.border-color]="view() === 'map' ? 'var(--eco-primary)' : ''"
              (click)="view.set('map')"
            >
              <i class="icon-map-alt"></i>
            </button>
          </div>

          <!-- Filter by category -->
          <select class="form-select form-select-sm" style="width:auto"
            (change)="filterCategory.set($any($event.target).value)">
            <option value="">All Categories</option>
            <option value="deciduous">Deciduous</option>
            <option value="evergreen">Evergreen</option>
            <option value="fruit">Fruit</option>
            <option value="palm">Palm</option>
            <option value="flowering">Flowering</option>
          </select>

          <a routerLink="../trees/new" class="btn btn-sm text-white" style="background:var(--eco-primary)">
            <i class="icon-plus me-1"></i>Plant Tree
          </a>
          <a routerLink="../trees/species" class="btn btn-sm btn-outline-secondary">
            <i class="icon-leaf me-1"></i>Species Guide
          </a>
        </div>
      </div>

      <!-- Grid view -->
      @if (view() === 'grid') {
        @if (filteredTrees().length === 0) {
          <lib-empty-state
            icon="🌱"
            title="No trees yet"
            message="Plant your first tree and start making a difference!"
            ctaLabel="Plant a Tree"
          />
        } @else {
          <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-3">
            @for (tree of filteredTrees(); track tree.id) {
              <div class="col">
                <lib-tree-card
                  [tree]="tree"
                  [species]="treeService.getSpeciesById(tree.speciesId)"
                  [co2Offset]="treeService.calcOffset(tree)"
                  (clicked)="navigate(tree.id)"
                />
              </div>
            }
          </div>
        }
      }

      <!-- Map view -->
      @if (view() === 'map') {
        @defer (on viewport) {
          @if (geoTaggedTrees().length === 0) {
            <div class="text-center py-5">
              <div class="display-4 mb-3">🗺️</div>
              <h5 class="text-eco">No geo-tagged trees yet</h5>
              <p class="text-muted">When you plant a tree with GPS coordinates, it will appear here.</p>
              <a routerLink="../trees/new" class="btn btn-sm text-white" style="background:var(--eco-primary)">
                <i class="icon-plus me-1"></i>Plant a Geo-Tagged Tree
              </a>
            </div>
          } @else {
            <div class="mb-3">
              <p class="text-muted small">Showing {{ geoTaggedTrees().length }} geo-tagged trees. Click a pin to see details.</p>
            </div>
            <lib-mini-map
              [markers]="mapMarkers()"
              [interactive]="true"
              [height]="500"
            />
          }
        } @placeholder {
          <div class="eco-skeleton rounded" style="height:500px"></div>
        }
      }
    </div>

    <!-- FAB -->
    <a class="eco-fab" routerLink="../trees/new" title="Plant a tree">
      <span>🌱</span>
    </a>
  `,
})
export class TreeListPageComponent implements OnInit {
  protected readonly treeService = inject(TreeService);
  protected readonly view = signal<ViewMode>('grid');
  protected readonly filterCategory = signal<string>('');

  protected readonly filteredTrees = computed(() => {
    const cat = this.filterCategory();
    const trees = this.treeService.trees();
    if (!cat) return trees;
    return trees.filter((t) => {
      const sp = this.treeService.getSpeciesById(t.speciesId);
      return sp?.category === cat;
    });
  });

  protected readonly geoTaggedTrees = computed(() =>
    this.treeService.trees().filter((t) => !!t.coords),
  );

  protected readonly mapMarkers = computed<MapMarker[]>(() =>
    this.geoTaggedTrees().map((t) => ({
      coords: t.coords!,
      label: this.treeService.getSpeciesById(t.speciesId)?.commonName ?? 'Tree',
      treeId: t.id,
    })),
  );

  async ngOnInit(): Promise<void> {
    await this.treeService.loadAll();
  }

  protected navigate(id: string): void {
    window.location.href = `/eco-tracker/trees/${id}`;
  }
}
