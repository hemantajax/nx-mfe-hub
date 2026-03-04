import { Injectable, inject, signal, computed } from '@angular/core';
import type { Tree, TreeEvent, TreeSpecies } from './models';
import { StorageService, STORES } from './storage.service';
import { TREE_SPECIES } from './species-data';
import { calcTreeCo2Offset } from './co2-calc';

@Injectable({ providedIn: 'root' })
export class TreeService {
  private readonly storage = inject(StorageService);

  private readonly _trees = signal<Tree[]>([]);
  private readonly _events = signal<TreeEvent[]>([]);
  private readonly _loading = signal(false);

  readonly trees = this._trees.asReadonly();
  readonly events = this._events.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly species = TREE_SPECIES;

  readonly totalOffset = computed(() =>
    this._trees().reduce((sum, tree) => {
      const sp = this.getSpecies(tree.speciesId);
      return sum + (sp ? calcTreeCo2Offset(tree, sp) : 0);
    }, 0),
  );

  readonly treeCount = computed(() => this._trees().length);

  readonly uniqueSpeciesCount = computed(
    () => new Set(this._trees().map((t) => t.speciesId)).size,
  );

  constructor() {
    this._loadAll();
  }

  private async _loadAll(): Promise<void> {
    this._loading.set(true);
    const [trees, events] = await Promise.all([
      this.storage.getAll<Tree>(STORES.TREES),
      this.storage.getAll<TreeEvent>(STORES.TREE_EVENTS),
    ]);
    this._trees.set(trees.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    this._events.set(events.sort((a, b) => b.date.localeCompare(a.date)));
    this._loading.set(false);
  }

  async addTree(data: Omit<Tree, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tree> {
    const now = new Date().toISOString();
    const tree: Tree = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await this.storage.save(STORES.TREES, tree);
    this._trees.update((prev) => [tree, ...prev]);
    // Auto-create 'planted' event
    await this.addEvent({
      treeId: tree.id,
      type: 'planted',
      date: tree.datePlanted,
      notes: data.notes ?? `Planted a ${this.getSpecies(data.speciesId)?.commonName ?? 'tree'}`,
    });
    return tree;
  }

  async updateTree(id: string, updates: Partial<Omit<Tree, 'id' | 'createdAt'>>): Promise<void> {
    const existing = this._trees().find((t) => t.id === id);
    if (!existing) return;
    const updated: Tree = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.storage.save(STORES.TREES, updated);
    this._trees.update((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async deleteTree(id: string): Promise<void> {
    await this.storage.remove(STORES.TREES, id);
    const treeEvents = this._events().filter((e) => e.treeId === id);
    await Promise.all(treeEvents.map((e) => this.storage.remove(STORES.TREE_EVENTS, e.id)));
    this._trees.update((prev) => prev.filter((t) => t.id !== id));
    this._events.update((prev) => prev.filter((e) => e.treeId !== id));
  }

  async addEvent(data: Omit<TreeEvent, 'id' | 'createdAt'>): Promise<TreeEvent> {
    const event: TreeEvent = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.storage.save(STORES.TREE_EVENTS, event);
    this._events.update((prev) => [event, ...prev]);
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.storage.remove(STORES.TREE_EVENTS, id);
    this._events.update((prev) => prev.filter((e) => e.id !== id));
  }

  getEventsForTree(treeId: string): TreeEvent[] {
    return this._events().filter((e) => e.treeId === treeId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  getSpecies(id: string): TreeSpecies | undefined {
    return TREE_SPECIES.find((s) => s.id === id);
  }

  getTreeById(id: string): Tree | undefined {
    return this._trees().find((t) => t.id === id);
  }

  getCo2Offset(tree: Tree): number {
    const sp = this.getSpecies(tree.speciesId);
    return sp ? calcTreeCo2Offset(tree, sp) : 0;
  }

  async reload(): Promise<void> {
    await this._loadAll();
  }
}
