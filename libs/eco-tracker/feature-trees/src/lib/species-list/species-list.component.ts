import {
  ChangeDetectionStrategy, Component, inject, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { TREE_SPECIES } from '@ng-mfe-hub/eco-tracker-data-access';
import type { TreeCategory } from '@ng-mfe-hub/eco-tracker-data-access';

const CATEGORY_LABELS: Record<TreeCategory, string> = {
  deciduous: '🍂 Deciduous',
  evergreen: '🌲 Evergreen',
  fruit: '🍎 Fruit Trees',
  palm: '🌴 Palms',
  flowering: '🌸 Flowering',
};

@Component({
  selector: 'eco-species-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-4 px-3 px-md-4" style="max-width:1100px">
      <div class="d-flex align-items-center gap-2 mb-4">
        <button class="btn btn-link p-0 text-muted" (click)="router.navigate(['/eco-tracker/trees'])">
          <i class="icon-arrow-left"></i>
        </button>
        <div>
          <h2 class="fw-bold text-eco mb-0">🌿 Species Encyclopedia</h2>
          <p class="text-muted mb-0 small">{{ species.length }} tree species with CO₂ absorption data</p>
        </div>
      </div>

      <!-- Search + Filter -->
      <div class="d-flex gap-2 mb-4 flex-wrap">
        <input class="form-control form-control-sm" style="max-width:240px"
               placeholder="Search species…"
               [value]="search()"
               (input)="search.set($any($event.target).value)" />
        <div class="btn-group btn-group-sm">
          <button class="btn"
                  [class.btn-success]="filterCat() === ''"
                  [class.btn-outline-secondary]="filterCat() !== ''"
                  (click)="filterCat.set('')">All</button>
          @for (cat of categories; track cat) {
            <button class="btn"
                    [class.btn-success]="filterCat() === cat"
                    [class.btn-outline-secondary]="filterCat() !== cat"
                    (click)="filterCat.set(cat)">
              {{ LABELS[cat] }}
            </button>
          }
        </div>
      </div>

      @defer (on viewport) {
        <div class="row g-3">
          @for (sp of filteredSpecies(); track sp.id) {
            <div class="col-sm-6 col-md-4 col-lg-3">
              <div class="card eco-card border h-100" style="cursor:default">
                <div class="card-body p-3">
                  <div class="d-flex align-items-start gap-2 mb-2">
                    <span style="font-size:2rem;line-height:1">{{ sp.icon }}</span>
                    <div>
                      <div class="fw-semibold">{{ sp.commonName }}</div>
                      <div class="text-muted fst-italic" style="font-size:0.7rem">{{ sp.scientificName }}</div>
                    </div>
                  </div>
                  <div class="d-flex flex-wrap gap-1 mb-2">
                    <span class="badge bg-success" style="font-size:0.65rem">
                      {{ sp.co2PerYear }} kg CO₂/yr
                    </span>
                    <span class="badge"
                          [class.bg-success]="sp.growthRate === 'fast'"
                          [class.bg-warning]="sp.growthRate === 'medium'"
                          [class.bg-secondary]="sp.growthRate === 'slow'"
                          style="font-size:0.65rem">
                      {{ sp.growthRate }} growth
                    </span>
                    <span class="badge bg-light text-dark" style="font-size:0.65rem">
                      {{ sp.category }}
                    </span>
                  </div>
                  <div class="small text-muted mb-2">
                    Max: {{ sp.maxHeightM }}m · Lifespan: {{ sp.lifespanYears }}yr<br>
                    {{ sp.nativeRegion }}
                  </div>
                  <p class="small text-muted mb-2" style="font-size:0.7rem;line-height:1.4">
                    {{ sp.careTips }}
                  </p>
                  <button class="btn btn-outline-success btn-sm w-100"
                          (click)="plantThisSpecies(sp.id)">
                    <i class="icon-plus me-1"></i>Plant This
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      } @placeholder {
        <div class="row g-3">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="col-sm-6 col-md-4 col-lg-3">
              <div class="eco-skeleton" style="height:200px;border-radius:0.5rem"></div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SpeciesListComponent {
  protected readonly router = inject(Router);

  protected readonly species = TREE_SPECIES;
  protected readonly LABELS = CATEGORY_LABELS;
  protected readonly categories: TreeCategory[] = ['deciduous', 'evergreen', 'fruit', 'palm', 'flowering'];

  protected readonly search = signal('');
  protected readonly filterCat = signal<TreeCategory | ''>('');

  protected readonly filteredSpecies = computed(() => {
    const q = this.search().toLowerCase();
    const cat = this.filterCat();
    return this.species.filter((s) => {
      const matchSearch = !q || s.commonName.toLowerCase().includes(q)
        || s.scientificName.toLowerCase().includes(q)
        || s.nativeRegion.toLowerCase().includes(q);
      const matchCat = !cat || s.category === cat;
      return matchSearch && matchCat;
    });
  });

  protected plantThisSpecies(id: string): void {
    this.router.navigate(['/eco-tracker/trees/new'], { queryParams: { species: id } });
  }
}
