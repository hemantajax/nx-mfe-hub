import {
  ChangeDetectionStrategy, Component, input, output, OnInit, OnDestroy,
  OnChanges, SimpleChanges, ElementRef, viewChild, effect, inject, PLATFORM_ID, NgZone
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { GeoCoords, MapMarker } from '@ng-mfe-hub/eco-tracker-data-access';

@Component({
  selector: 'eco-mini-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #mapContainer class="eco-map w-100"
         [style.height]="height() + 'px'">
    </div>
  `,
})
export class MiniMapComponent implements OnInit, OnDestroy, OnChanges {
  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  readonly markers = input<MapMarker[]>([]);
  readonly center = input<GeoCoords | null>(null);
  readonly zoom = input<number>(13);
  readonly height = input<number>(250);
  readonly interactive = input<boolean>(true);

  readonly markerPlaced = output<GeoCoords>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapInstance: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private L: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private markerRefs: any[] = [];

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this._initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapInstance || !this.L) return;
    if (changes['markers']) this._updateMarkers();
    if (changes['center']) this._updateCenter();
  }

  ngOnDestroy(): void {
    this.mapInstance?.remove();
  }

  private async _initMap(): Promise<void> {
    this.L = await import('leaflet');
    const L = this.L;

    // Fix default icon paths for Webpack
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const defaultCenter: [number, number] = this.center()
      ? [this.center()!.lat, this.center()!.lng]
      : [20, 0];

    this.zone.runOutsideAngular(() => {
      this.mapInstance = L.map(this.mapContainer().nativeElement, {
        zoomControl: this.interactive(),
        scrollWheelZoom: this.interactive(),
        dragging: this.interactive(),
        doubleClickZoom: this.interactive(),
      }).setView(defaultCenter, this.zoom());

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(this.mapInstance);

      if (this.interactive()) {
        this.mapInstance.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          this.zone.run(() => {
            this.markerPlaced.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
          });
        });
      }
    });

    this._updateMarkers();
  }

  private _updateMarkers(): void {
    if (!this.mapInstance || !this.L) return;
    this.markerRefs.forEach((m) => m.remove());
    this.markerRefs = [];

    for (const marker of this.markers()) {
      const m = this.L.marker([marker.coords.lat, marker.coords.lng])
        .addTo(this.mapInstance);
      if (marker.label) m.bindPopup(marker.label);
      this.markerRefs.push(m);
    }

    if (this.markerRefs.length > 1) {
      const group = this.L.featureGroup(this.markerRefs);
      this.mapInstance.fitBounds(group.getBounds().pad(0.2));
    } else if (this.markerRefs.length === 1 && this.markers()[0]) {
      const c = this.markers()[0].coords;
      this.mapInstance.setView([c.lat, c.lng], this.zoom());
    }
  }

  private _updateCenter(): void {
    const c = this.center();
    if (c && this.mapInstance) {
      this.mapInstance.setView([c.lat, c.lng], this.zoom());
    }
  }
}
