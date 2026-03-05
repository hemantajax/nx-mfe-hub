import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import type { Goal, Achievement, ActivityCategory, Tree, TreeEvent, Activity } from './models';
import { StorageService, STORES } from './storage.service';
import { ACHIEVEMENTS } from './achievements-data';
import { TreeService } from './tree.service';
import { FootprintService } from './footprint.service';
import { calcNetImpact, getMonthKey, getLast6Months, getMonthLabel } from './co2-calc';

export interface EcoTip {
  readonly category: ActivityCategory | 'general';
  readonly tip: string;
  readonly icon: string;
}

const ECO_TIPS: EcoTip[] = [
  { category: 'transport',  tip: 'Switch to public transport or cycling for short trips to cut transport emissions.',     icon: 'icon-direction' },
  { category: 'transport',  tip: 'Combine errands into one trip to reduce car journeys.',                                 icon: 'icon-car' },
  { category: 'food',       tip: 'Reducing beef consumption by one meal a week saves ~170 kg CO₂ per year.',             icon: 'icon-cup' },
  { category: 'food',       tip: 'Plan meals to reduce food waste – wasted food has a large carbon footprint.',           icon: 'icon-trash' },
  { category: 'energy',     tip: 'Switch to LED bulbs and smart power strips to cut household electricity use.',          icon: 'icon-bolt' },
  { category: 'energy',     tip: 'Lowering your thermostat by 1°C can reduce heating emissions by up to 10%.',           icon: 'icon-bolt' },
  { category: 'shopping',   tip: 'Buy second-hand clothing and electronics to reduce manufacturing emissions.',           icon: 'icon-bag' },
  { category: 'shopping',   tip: 'Repair before replacing – extending a product\'s life is the most sustainable choice.', icon: 'icon-settings' },
  { category: 'general',    tip: 'Plant native tree species – they sequester carbon and support local biodiversity.',     icon: 'icon-world'},
  { category: 'general',    tip: 'Share your eco journey with friends to multiply your positive impact.',                 icon: 'icon-twitter' },
];

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly storage = inject(StorageService);
  private readonly treeService = inject(TreeService);
  private readonly footprintService = inject(FootprintService);

  private readonly _goals = signal<Goal[]>([]);
  private readonly _achievements = signal<Achievement[]>([...ACHIEVEMENTS]);
  private readonly _loading = signal(false);

  readonly goals = this._goals.asReadonly();
  readonly achievements = this._achievements.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly netImpact = computed(() =>
    calcNetImpact(
      this.treeService.totalOffset(),
      this.footprintService.totalEmissions(),
    ),
  );

  readonly isNetPositive = computed(() => this.netImpact() >= 0);

  readonly monthlyNetData = computed(() => {
    const months = getLast6Months();
    const monthlyEmissions = this.footprintService.monthlyEmissions();
    return months.map((month, i) => ({
      month,
      label: getMonthLabel(month),
      emissions: monthlyEmissions[i]?.total ?? 0,
      offset: this.treeService.totalOffset() / 6,
    }));
  });

  readonly contextualTips = computed(() => {
    const breakdown = this.footprintService.categoryBreakdown();
    const maxCategory = (Object.entries(breakdown) as [ActivityCategory, number][])
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const tips = maxCategory
      ? ECO_TIPS.filter((t) => t.category === maxCategory || t.category === 'general')
      : ECO_TIPS.filter((t) => t.category === 'general');
    return tips.slice(0, 3);
  });

  readonly unlockedCount = computed(
    () => this._achievements().filter((a) => a.unlockedAt).length,
  );

  constructor() {
    void this._loadAll();
    // allowSignalWrites: true is required to write _achievements inside the effect.
    // _achievements is read via untracked() so it does NOT become a reactive dependency,
    // preventing the write-then-retrigger infinite loop.
    effect(() => { this._checkAchievements(); }, { allowSignalWrites: true });
  }

  private _checkAchievements(): void {
    // Reactive signal reads — changes to any of these retrigger this effect
    const treeCount     = this.treeService.treeCount();
    const totalOffset   = this.treeService.totalOffset();
    const streak        = this.footprintService.streak();
    const activityCount = this.footprintService.activities().length;
    const goalCount     = this._goals().length;
    const speciesCount  = this.treeService.uniqueSpeciesCount();
    const eventsCount   = this.treeService.events().length;
    const treesWithGeo  = this.treeService.trees().filter((t) => t.coords).length;
    const netPositive   = this.isNetPositive();

    // Non-reactive read — _achievements must NOT be a tracked dependency or
    // writing it below would cause this effect to retrigger infinitely.
    const current = untracked(() => this._achievements());

    const updated = current.map((a) => {
      if (a.unlockedAt) return a;
      let unlocked = false;
      switch (a.key) {
        case 'first-tree':      unlocked = treeCount >= 1; break;
        case '5-trees':         unlocked = treeCount >= 5; break;
        case '10-trees':        unlocked = treeCount >= 10; break;
        case '25-trees':        unlocked = treeCount >= 25; break;
        case '50-trees':        unlocked = treeCount >= 50; break;
        case '100-trees':       unlocked = treeCount >= 100; break;
        case 'geo-first':       unlocked = treesWithGeo >= 1; break;
        case '100kg-offset':    unlocked = totalOffset >= 100; break;
        case '500kg-offset':    unlocked = totalOffset >= 500; break;
        case '1000kg-offset':   unlocked = totalOffset >= 1000; break;
        case 'first-activity':  unlocked = activityCount >= 1; break;
        case '7-day-streak':    unlocked = streak >= 7; break;
        case '30-day-streak':   unlocked = streak >= 30; break;
        case 'first-goal':      unlocked = goalCount >= 1; break;
        case 'net-positive':    unlocked = netPositive && totalOffset > 0; break;
        case 'all-species':     unlocked = speciesCount >= 5; break;
        case 'history-keeper':  unlocked = eventsCount >= 10; break;
      }
      if (unlocked) {
        const upd = { ...a, unlockedAt: new Date().toISOString() };
        void this.storage.save(STORES.ACHIEVEMENTS, upd);
        return upd;
      }
      return a;
    });

    this._achievements.set(updated);
  }

  private async _loadAll(): Promise<void> {
    this._loading.set(true);
    const [goals, savedAchievements] = await Promise.all([
      this.storage.getAll<Goal>(STORES.GOALS),
      this.storage.getAll<Achievement>(STORES.ACHIEVEMENTS),
    ]);
    this._goals.set(goals.sort((a, b) => b.month.localeCompare(a.month)));

    this._achievements.set(
      ACHIEVEMENTS.map((a) => {
        const saved = savedAchievements.find((s) => s.key === a.key);
        return saved ? { ...a, unlockedAt: saved.unlockedAt } : a;
      }),
    );
    this._loading.set(false);
  }

  async addGoal(data: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
    const goal: Goal = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await this.storage.save(STORES.GOALS, goal);
    this._goals.update((prev) => [goal, ...prev]);
    return goal;
  }

  async deleteGoal(id: string): Promise<void> {
    await this.storage.remove(STORES.GOALS, id);
    this._goals.update((prev) => prev.filter((g) => g.id !== id));
  }

  getGoalForMonth(month: string): Goal | undefined {
    return this._goals().find((g) => g.month === month);
  }

  getGoalProgress(goal: Goal): number {
    const month = getMonthKey(new Date(goal.month + '-01'));
    if (goal.type === 'emission-limit') {
      const actual = this.footprintService.getActivitiesForMonth(month)
        .reduce((sum, a) => sum + a.co2e, 0);
      return goal.targetCo2e > 0 ? Math.min(100, Math.round((1 - actual / goal.targetCo2e) * 100)) : 0;
    }
    if (goal.type === 'trees-planted') {
      const planted = this.treeService.trees()
        .filter((t) => getMonthKey(t.datePlanted) === month).length;
      return Math.min(100, Math.round((planted / goal.targetCo2e) * 100));
    }
    return Math.min(100, Math.round((this.treeService.totalOffset() / goal.targetCo2e) * 100));
  }

  exportData(): string {
    return JSON.stringify({
      trees: this.treeService.trees(),
      treeEvents: this.treeService.events(),
      activities: this.footprintService.activities(),
      goals: this._goals(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  async importData(json: string): Promise<{ trees: number; activities: number; goals: number }> {
    const data = JSON.parse(json);
    let trees = 0, activities = 0, goals = 0;

    if (Array.isArray(data.trees)) {
      for (const item of data.trees as Tree[]) {
        if (item.id) { await this.storage.save(STORES.TREES, item); trees++; }
      }
    }
    if (Array.isArray(data.treeEvents)) {
      for (const item of data.treeEvents as TreeEvent[]) {
        if (item.id) await this.storage.save(STORES.TREE_EVENTS, item);
      }
    }
    if (Array.isArray(data.activities)) {
      for (const item of data.activities as Activity[]) {
        if (item.id) { await this.storage.save(STORES.ACTIVITIES, item); activities++; }
      }
    }
    if (Array.isArray(data.goals)) {
      for (const item of data.goals as Goal[]) {
        if (item.id) { await this.storage.save(STORES.GOALS, item); goals++; }
      }
    }

    await Promise.all([
      this.treeService.reload(),
      this.footprintService.reload(),
      this._loadAll(),
    ]);

    return { trees, activities, goals };
  }
}
