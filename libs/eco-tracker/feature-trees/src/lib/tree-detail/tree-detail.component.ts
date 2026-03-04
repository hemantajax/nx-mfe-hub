import {
  ChangeDetectionStrategy, Component, inject, computed, signal, effect
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  TreeService, formatCo2, calcTreeAgeYears
} from '@ng-mfe-hub/eco-tracker-data-access';
import type { TreeEventType, HealthStatus } from '@ng-mfe-hub/eco-tracker-data-access';
import {
  CO2BadgeComponent, TimelineComponent, MiniMapComponent
} from '@ng-mfe-hub/eco-tracker-ui';

@Component({
  selector: 'eco-tree-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CO2BadgeComponent, TimelineComponent, MiniMapComponent, FormsModule],
  template: `
    <div class="container py-4 px-3 px-md-4" style="max-width:860px">
      <!-- Back -->
      <button class="btn btn-link p-0 text-muted mb-3" (click)="router.navigate(['/eco-tracker/trees'])">
        <i class="icon-arrow-left me-1"></i>All Trees
      </button>

      @if (!tree()) {
        <div class="text-center py-5">
          <p class="text-muted">Tree not found.</p>
          <button class="btn btn-success" (click)="router.navigate(['/eco-tracker/trees'])">
            Go back
          </button>
        </div>
      } @else {
        <!-- Hero -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body p-4">
            <div class="d-flex align-items-start gap-3 flex-wrap">
              <span style="font-size:3.5rem;line-height:1">{{ species()?.icon ?? '🌳' }}</span>
              <div class="flex-grow-1">
                <h2 class="fw-bold text-eco mb-0">{{ species()?.commonName ?? 'Unknown' }}</h2>
                <p class="text-muted fst-italic mb-2">{{ species()?.scientificName }}</p>
                <div class="d-flex flex-wrap gap-2 align-items-center">
                  <eco-co2-badge [value]="co2Offset()" type="offset" />
                  <span class="badge bg-light text-dark">
                    <i class="icon-calendar me-1"></i>{{ ageLabel() }}
                  </span>
                  @if (tree()!.coords) {
                    <span class="badge bg-success">
                      <i class="icon-location-pin me-1"></i>Geo-tagged
                    </span>
                  }
                </div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-danger btn-sm" (click)="confirmDelete()">
                  <i class="icon-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fw-bold fs-4 text-eco">{{ formatCo2Fn(co2Offset()) }}</div>
              <div class="text-muted small">CO₂ Offset</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fw-bold fs-4">{{ ageLabel() }}</div>
              <div class="text-muted small">Tree Age</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fw-bold fs-4 text-eco">{{ species()?.co2PerYear ?? 0 }} kg</div>
              <div class="text-muted small">CO₂/year (mature)</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fw-bold fs-4">{{ species()?.lifespanYears ?? '?' }}yr</div>
              <div class="text-muted small">Expected Lifespan</div>
            </div>
          </div>
        </div>

        <!-- Details + Map -->
        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white fw-semibold border-bottom">📋 Details</div>
              <div class="card-body">
                <dl class="row mb-0 small">
                  <dt class="col-5 text-muted">Planted</dt>
                  <dd class="col-7">{{ tree()!.datePlanted }}</dd>
                  <dt class="col-5 text-muted">Location</dt>
                  <dd class="col-7">{{ tree()!.location }}</dd>
                  @if (tree()!.coords) {
                    <dt class="col-5 text-muted">Coordinates</dt>
                    <dd class="col-7 font-monospace">
                      {{ tree()!.coords!.lat.toFixed(5) }}, {{ tree()!.coords!.lng.toFixed(5) }}
                    </dd>
                  }
                  @if (tree()!.notes) {
                    <dt class="col-5 text-muted">Notes</dt>
                    <dd class="col-7">{{ tree()!.notes }}</dd>
                  }
                  <dt class="col-5 text-muted">Growth Rate</dt>
                  <dd class="col-7">
                    <span class="badge"
                          [class.bg-success]="species()?.growthRate === 'fast'"
                          [class.bg-warning]="species()?.growthRate === 'medium'"
                          [class.bg-secondary]="species()?.growthRate === 'slow'">
                      {{ species()?.growthRate }}
                    </span>
                  </dd>
                  <dt class="col-5 text-muted">Category</dt>
                  <dd class="col-7 text-capitalize">{{ species()?.category }}</dd>
                </dl>
                @if (species()?.careTips) {
                  <hr class="my-2" />
                  <p class="small mb-0 text-muted"><strong>Care tip:</strong> {{ species()!.careTips }}</p>
                }
              </div>
            </div>
          </div>
          @if (tree()!.coords) {
            <div class="col-md-6">
              @defer (on viewport) {
                <eco-mini-map
                  [markers]="mapMarkers()"
                  [center]="tree()!.coords!"
                  [interactive]="false"
                  [height]="240"
                  [zoom]="14" />
              } @placeholder {
                <div class="eco-skeleton" style="height:240px;border-radius:0.5rem"></div>
              }
            </div>
          }
        </div>

        <!-- Plant History Timeline -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
            <h6 class="fw-semibold mb-0">📔 Plant History</h6>
            <button class="btn btn-outline-success btn-sm"
                    (click)="showEventForm.set(!showEventForm())">
              <i class="icon-plus me-1"></i>Add Event
            </button>
          </div>
          <div class="card-body">
            <!-- Event Form -->
            @if (showEventForm()) {
              <div class="card bg-eco-light border-0 mb-3 p-3">
                <div class="row g-2">
                  <div class="col-md-3">
                    <select class="form-select form-select-sm" [(ngModel)]="eventType">
                      <option value="watered">💧 Watered</option>
                      <option value="measured">📏 Measured</option>
                      <option value="pruned">✂️ Pruned</option>
                      <option value="health-check">🩺 Health Check</option>
                      <option value="note">📝 Note</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <input type="date" class="form-control form-control-sm"
                           [(ngModel)]="eventDate" [max]="today" />
                  </div>
                  @if (eventType === 'measured') {
                    <div class="col-md-2">
                      <input type="number" class="form-control form-control-sm"
                             [(ngModel)]="eventHeight" placeholder="Height cm" min="1" />
                    </div>
                  }
                  @if (eventType === 'health-check') {
                    <div class="col-md-2">
                      <select class="form-select form-select-sm" [(ngModel)]="eventHealth">
                        <option value="healthy">✅ Healthy</option>
                        <option value="fair">⚠️ Fair</option>
                        <option value="poor">❌ Poor</option>
                      </select>
                    </div>
                  }
                  <div class="col">
                    <input type="text" class="form-control form-control-sm"
                           [(ngModel)]="eventNotes" placeholder="Notes…" />
                  </div>
                  <div class="col-auto d-flex gap-1">
                    <button class="btn btn-success btn-sm" (click)="addEvent()" [disabled]="savingEvent()">
                      @if (savingEvent()) { <span class="spinner-border spinner-border-sm"></span> }
                      @else { Save }
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" (click)="showEventForm.set(false)">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            }
            <eco-timeline [events]="treeEvents()" />
          </div>
        </div>
      }
    </div>
  `,
})
export class TreeDetailComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly treeService = inject(TreeService);
  protected readonly router = inject(Router);

  protected readonly formatCo2Fn = formatCo2;
  protected readonly today = new Date().toISOString().slice(0, 10);

  private readonly treeId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly tree = computed(() =>
    this.treeService.getTreeById(this.treeId()),
  );

  protected readonly species = computed(() =>
    this.tree() ? this.treeService.getSpecies(this.tree()!.speciesId) : undefined,
  );

  protected readonly co2Offset = computed(() =>
    this.tree() ? this.treeService.getCo2Offset(this.tree()!) : 0,
  );

  protected readonly treeEvents = computed(() =>
    this.treeService.getEventsForTree(this.treeId()),
  );

  protected readonly mapMarkers = computed(() => {
    const t = this.tree();
    if (!t?.coords) return [];
    return [{ id: t.id, coords: t.coords, label: this.species()?.commonName }];
  });

  protected readonly ageLabel = computed(() => {
    const t = this.tree();
    if (!t) return '';
    const age = calcTreeAgeYears(t.datePlanted);
    if (age < 0.1) return 'Just planted';
    if (age < 1) return `${Math.round(age * 12)} months`;
    return `${Math.floor(age)} year${Math.floor(age) !== 1 ? 's' : ''}`;
  });

  protected showEventForm = signal(false);
  protected savingEvent = signal(false);
  protected eventType: TreeEventType = 'watered';
  protected eventDate = new Date().toISOString().slice(0, 10);
  protected eventNotes = '';
  protected eventHeight = 0;
  protected eventHealth: HealthStatus = 'healthy';

  async addEvent(): Promise<void> {
    if (!this.treeId()) return;
    this.savingEvent.set(true);
    await this.treeService.addEvent({
      treeId: this.treeId(),
      type: this.eventType,
      date: this.eventDate,
      notes: this.eventNotes || undefined,
      heightCm: this.eventType === 'measured' ? this.eventHeight : undefined,
      healthStatus: this.eventType === 'health-check' ? this.eventHealth : undefined,
    });
    this.savingEvent.set(false);
    this.showEventForm.set(false);
    this.eventNotes = '';
    this.eventHeight = 0;
  }

  async confirmDelete(): Promise<void> {
    if (confirm('Delete this tree and all its history? This cannot be undone.')) {
      await this.treeService.deleteTree(this.treeId());
      await this.router.navigate(['/eco-tracker/trees']);
    }
  }
}
