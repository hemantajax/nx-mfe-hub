import {
  ChangeDetectionStrategy, Component, inject, signal, computed, OnInit,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  TreeService, GeoService, TREE_SPECIES
} from '@ng-mfe-hub/eco-tracker-data-access';
import type { GeoCoords } from '@ng-mfe-hub/eco-tracker-data-access';
import { MiniMapComponent } from '@ng-mfe-hub/eco-tracker-ui';

@Component({
  selector: 'eco-tree-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MiniMapComponent, TitleCasePipe],
  template: `
    <div class="container py-4 px-3 px-md-4" style="max-width:720px">
      <div class="d-flex align-items-center gap-2 mb-4">
        <button class="btn btn-link p-0 text-muted" (click)="router.navigate(['/eco-tracker/trees'])">
          <i class="icon-arrow-left"></i>
        </button>
        <h2 class="fw-bold text-eco mb-0">🌱 Plant a New Tree</h2>
      </div>

      <form (ngSubmit)="onSubmit()" #form="ngForm">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white fw-semibold border-bottom">Tree Details</div>
          <div class="card-body">

            <!-- Species -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Species <span class="text-danger">*</span></label>
              <select class="form-select" [(ngModel)]="speciesId" name="speciesId" required>
                <option value="">Select a tree species…</option>
                @for (group of speciesGroups(); track group.category) {
                  <optgroup [label]="group.category | titlecase">
                    @for (sp of group.species; track sp.id) {
                      <option [value]="sp.id">{{ sp.icon }} {{ sp.commonName }} ({{ sp.scientificName }})</option>
                    }
                  </optgroup>
                }
              </select>
              @if (selectedSpecies()) {
                <div class="mt-2 p-2 rounded-3 bg-eco-light small text-eco">
                  <strong>CO₂ absorbed:</strong> {{ selectedSpecies()!.co2PerYear }} kg/year (mature) ·
                  <strong>Growth:</strong> {{ selectedSpecies()!.growthRate }} ·
                  <strong>Max height:</strong> {{ selectedSpecies()!.maxHeightM }}m
                </div>
              }
            </div>

            <!-- Date Planted -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Date Planted <span class="text-danger">*</span></label>
              <input type="date" class="form-control" [(ngModel)]="datePlanted" name="datePlanted"
                     required [max]="today" />
            </div>

            <!-- Age at Planting -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Age at Planting</label>
              <div class="input-group" style="max-width:280px">
                <input type="number" class="form-control" [(ngModel)]="ageAtPlantingMonths"
                       name="ageAtPlantingMonths" min="0" max="1200" placeholder="0" />
                <span class="input-group-text">months</span>
              </div>
              <div class="form-text">
                Leave at 0 for seedlings. Set the tree's age if planting a grafted or nursery-grown sapling.
              </div>
            </div>

            <!-- Notes -->
            <div class="mb-0">
              <label class="form-label fw-semibold">Notes (optional)</label>
              <textarea class="form-control" rows="2" [(ngModel)]="notes" name="notes"
                        placeholder="e.g. Planted in the front garden…"></textarea>
            </div>
          </div>
        </div>

        <!-- Geo-tagging Card -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white fw-semibold border-bottom d-flex justify-content-between align-items-center">
            <span>📍 Location</span>
            @if (coords()) {
              <span class="badge badge-offset small">Geo-tagged</span>
            }
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label fw-semibold">Location Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" [(ngModel)]="location" name="location"
                     required placeholder="e.g. Backyard, City Park, School..." />
            </div>

            <div class="mb-3 d-flex gap-2 flex-wrap align-items-center">
              <button type="button" class="btn btn-outline-success btn-sm"
                      (click)="detectLocation()"
                      [disabled]="geoService.loading()">
                @if (geoService.loading()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                } @else {
                  <i class="icon-location-arrow me-1"></i>
                }
                Use My Location
              </button>
              @if (coords()) {
                <span class="text-muted small">
                  📍 {{ geoService.formatCoords(coords()!) }}
                </span>
                <button type="button" class="btn btn-link btn-sm text-danger p-0" (click)="clearCoords()">
                  Remove
                </button>
              }
            </div>

            @if (geoService.error()) {
              <div class="alert alert-warning small py-2">{{ geoService.error() }}</div>
            }

            <p class="text-muted small mb-2">Or tap on the map to place a pin:</p>

            @defer (on viewport) {
              <eco-mini-map
                [markers]="mapMarkers()"
                [center]="coords()"
                [interactive]="true"
                [height]="240"
                [zoom]="coords() ? 14 : 4"
                (markerPlaced)="onMapClick($event)" />
            } @placeholder {
              <div class="eco-skeleton" style="height:240px;border-radius:0.5rem"></div>
            }
          </div>
        </div>

        <!-- Actions -->
        <div class="d-flex gap-2 justify-content-end">
          <button type="button" class="btn btn-outline-secondary"
                  (click)="router.navigate(['/eco-tracker/trees'])">
            Cancel
          </button>
          <button type="submit" class="btn btn-success" [disabled]="saving() || !isValid()">
            @if (saving()) {
              <span class="spinner-border spinner-border-sm me-1"></span>Saving…
            } @else {
              <i class="icon-plus me-1"></i>Plant Tree
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class TreeFormComponent implements OnInit {
  protected readonly treeService = inject(TreeService);
  protected readonly geoService = inject(GeoService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const sp = this.route.snapshot.queryParamMap.get('species');
    if (sp) this.speciesId = sp;
  }

  protected speciesId = '';
  protected datePlanted = new Date().toISOString().slice(0, 10);
  protected ageAtPlantingMonths = 0;
  protected location = '';
  protected notes = '';
  protected coords = signal<GeoCoords | null>(null);
  protected saving = signal(false);

  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly selectedSpecies = computed(() =>
    TREE_SPECIES.find((s) => s.id === this.speciesId),
  );

  protected readonly speciesGroups = computed(() => {
    const groups = new Map<string, typeof TREE_SPECIES>();
    for (const sp of TREE_SPECIES) {
      const arr = groups.get(sp.category) ?? [];
      arr.push(sp);
      groups.set(sp.category, arr);
    }
    return Array.from(groups.entries()).map(([category, species]) => ({ category, species }));
  });

  protected readonly mapMarkers = computed(() => {
    const c = this.coords();
    if (!c) return [];
    return [{ id: 'new', coords: c, label: this.location || 'New tree' }];
  });

  protected isValid(): boolean {
    return !!this.speciesId && !!this.datePlanted && !!this.location;
  }

  async detectLocation(): Promise<void> {
    this.geoService.getCurrentPosition();
    // Poll for coords
    const check = setInterval(() => {
      const c = this.geoService.currentCoords();
      if (c) {
        this.coords.set(c);
        if (!this.location) {
          this.geoService.reverseGeocode(c).then((addr) => {
            if (!this.location) this.location = addr.split(',').slice(0, 2).join(',').trim();
          });
        }
        clearInterval(check);
      }
      if (!this.geoService.loading()) clearInterval(check);
    }, 300);
  }

  protected onMapClick(coords: GeoCoords): void {
    this.coords.set(coords);
    if (!this.location) {
      this.geoService.reverseGeocode(coords).then((addr) => {
        if (!this.location) this.location = addr.split(',').slice(0, 2).join(',').trim();
      });
    }
  }

  protected clearCoords(): void {
    this.coords.set(null);
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    const tree = await this.treeService.addTree({
      speciesId: this.speciesId,
      datePlanted: this.datePlanted,
      ageAtPlantingMonths: this.ageAtPlantingMonths || undefined,
      location: this.location,
      coords: this.coords() ?? undefined,
      notes: this.notes || undefined,
    });
    this.saving.set(false);
    await this.router.navigate(['/eco-tracker/trees', tree.id]);
  }
}
