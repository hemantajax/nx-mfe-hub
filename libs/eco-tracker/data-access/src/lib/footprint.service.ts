import { Injectable, inject, signal, computed } from '@angular/core';
import type { Activity, EmissionFactor, ActivityCategory } from './models';
import { StorageService, STORES } from './storage.service';
import { EMISSION_FACTORS } from './emission-factors-data';
import { calcActivityCo2e, getMonthKey, getLast6Months, calcLoggingStreak } from './co2-calc';

@Injectable({ providedIn: 'root' })
export class FootprintService {
  private readonly storage = inject(StorageService);

  private readonly _activities = signal<Activity[]>([]);
  private readonly _loading = signal(false);

  readonly activities = this._activities.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly emissionFactors = EMISSION_FACTORS;

  readonly totalEmissions = computed(() =>
    this._activities().reduce((sum, a) => sum + a.co2e, 0),
  );

  readonly thisMonthEmissions = computed(() => {
    const month = getMonthKey(new Date());
    return this._activities()
      .filter((a) => getMonthKey(a.date) === month)
      .reduce((sum, a) => sum + a.co2e, 0);
  });

  readonly categoryBreakdown = computed(() => {
    const breakdown: Record<ActivityCategory, number> = {
      transport: 0, food: 0, energy: 0, shopping: 0,
    };
    for (const a of this._activities()) {
      breakdown[a.category] += a.co2e;
    }
    return breakdown;
  });

  readonly monthlyEmissions = computed(() => {
    const months = getLast6Months();
    return months.map((month) => ({
      month,
      total: this._activities()
        .filter((a) => getMonthKey(a.date) === month)
        .reduce((sum, a) => sum + a.co2e, 0),
    }));
  });

  readonly streak = computed(() => calcLoggingStreak(this._activities()));

  constructor() {
    this._loadAll();
  }

  private async _loadAll(): Promise<void> {
    this._loading.set(true);
    const activities = await this.storage.getAll<Activity>(STORES.ACTIVITIES);
    this._activities.set(activities.sort((a, b) => b.date.localeCompare(a.date)));
    this._loading.set(false);
  }

  async logActivity(data: Omit<Activity, 'id' | 'co2e' | 'createdAt'>): Promise<Activity> {
    const factor = this.getFactorByType(data.type);
    const co2e = factor ? calcActivityCo2e(data.value, factor) : 0;
    const activity: Activity = {
      ...data,
      id: crypto.randomUUID(),
      co2e,
      createdAt: new Date().toISOString(),
    };
    await this.storage.save(STORES.ACTIVITIES, activity);
    this._activities.update((prev) => [activity, ...prev]);
    return activity;
  }

  async deleteActivity(id: string): Promise<void> {
    await this.storage.remove(STORES.ACTIVITIES, id);
    this._activities.update((prev) => prev.filter((a) => a.id !== id));
  }

  getFactorByType(type: string): EmissionFactor | undefined {
    return EMISSION_FACTORS.find((f) => f.type === type);
  }

  getFactorsByCategory(category: ActivityCategory): EmissionFactor[] {
    return EMISSION_FACTORS.filter((f) => f.category === category);
  }

  getActivitiesForMonth(month: string): Activity[] {
    return this._activities().filter((a) => getMonthKey(a.date) === month);
  }

  async reload(): Promise<void> {
    await this._loadAll();
  }
}
