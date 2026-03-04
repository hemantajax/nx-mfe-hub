import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { GeoCoords } from './models';

interface NominatimResult {
  display_name: string;
}

@Injectable({ providedIn: 'root' })
export class GeoService {
  private readonly http = inject(HttpClient);

  private readonly _currentCoords = signal<GeoCoords | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _loading = signal(false);

  readonly currentCoords = this._currentCoords.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loading = this._loading.asReadonly();

  getCurrentPosition(): void {
    if (!navigator.geolocation) {
      this._error.set('Geolocation is not supported by this browser.');
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this._currentCoords.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this._loading.set(false);
      },
      (err) => {
        this._error.set(this._geoErrorMessage(err.code));
        this._loading.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  reverseGeocode(coords: GeoCoords): Promise<string> {
    return new Promise((resolve) => {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`;
      this.http.get<NominatimResult>(url, {
        headers: { 'Accept-Language': 'en' },
      }).subscribe({
        next: (res) => resolve(res.display_name ?? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`),
        error: () => resolve(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`),
      });
    });
  }

  formatCoords(coords: GeoCoords): string {
    return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }

  private _geoErrorMessage(code: number): string {
    switch (code) {
      case 1: return 'Location permission denied. Please allow access in your browser.';
      case 2: return 'Location unavailable. Try again.';
      case 3: return 'Location request timed out. Try again.';
      default: return 'Failed to get location.';
    }
  }
}
