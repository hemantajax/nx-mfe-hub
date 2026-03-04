import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import type { Tree, TreeSpecies } from '@ng-mfe-hub/eco-tracker-data-access';
import { calcTreeAgeYears, formatCo2 } from '@ng-mfe-hub/eco-tracker-data-access';
import { CO2BadgeComponent } from '../co2-badge/co2-badge.component';

@Component({
  selector: 'eco-tree-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CO2BadgeComponent],
  template: `
    <div class="card eco-card h-100 border position-relative" style="cursor:pointer" (click)="cardClick.emit(tree().id)">
      <div class="card-body p-3">
        <div class="d-flex align-items-start gap-2 mb-2">
          <span style="font-size:2rem;line-height:1">{{ species()?.icon ?? '🌱' }}</span>
          <div class="flex-grow-1 min-width-0">
            <h6 class="mb-0 fw-semibold text-truncate">{{ species()?.commonName ?? 'Unknown' }}</h6>
            <small class="text-muted fst-italic">{{ species()?.scientificName }}</small>
          </div>
          @if (tree().coords) {
            <span class="text-success" title="Geo-tagged"><i class="icon-location-pin"></i></span>
          }
        </div>

        <div class="d-flex flex-wrap gap-2 mb-2">
          <eco-co2-badge [value]="co2Offset()" type="offset" />
        </div>

        <div class="row g-1 text-muted" style="font-size:0.72rem">
          <div class="col-6">
            <i class="icon-calendar me-1"></i>{{ ageLabel() }}
          </div>
          <div class="col-6 text-truncate">
            <i class="icon-location-pin me-1"></i>{{ tree().location || 'No location' }}
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TreeCardComponent {
  readonly tree = input.required<Tree>();
  readonly species = input<TreeSpecies | undefined>(undefined);
  readonly co2Offset = input<number>(0);
  readonly cardClick = output<string>();

  protected readonly ageLabel = computed(() => {
    const age = calcTreeAgeYears(this.tree().datePlanted);
    if (age < 0.1) return 'Just planted';
    if (age < 1) return `${Math.round(age * 12)}mo old`;
    return `${Math.floor(age)}yr old`;
  });
}
