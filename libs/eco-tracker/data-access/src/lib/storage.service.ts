import { Injectable } from '@angular/core';
import localforage from 'localforage';

const STORE_CONFIG: Record<string, LocalForage> = {};

function getStore(name: string): LocalForage {
  if (!STORE_CONFIG[name]) {
    STORE_CONFIG[name] = localforage.createInstance({
      name: 'eco-tracker',
      storeName: name,
      driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
    });
  }
  return STORE_CONFIG[name];
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  async getAll<T>(store: string): Promise<T[]> {
    const db = getStore(store);
    const items: T[] = [];
    await db.iterate<T, void>((value) => {
      items.push(value);
    });
    return items;
  }

  async getById<T>(store: string, id: string): Promise<T | null> {
    return (await getStore(store).getItem<T>(id)) ?? null;
  }

  async save<T extends { id: string }>(store: string, item: T): Promise<void> {
    await getStore(store).setItem(item.id, item);
  }

  async remove(store: string, id: string): Promise<void> {
    await getStore(store).removeItem(id);
  }

  async clear(store: string): Promise<void> {
    await getStore(store).clear();
  }

  async getByIndex<T>(store: string, keyFn: (item: T) => boolean): Promise<T[]> {
    const all = await this.getAll<T>(store);
    return all.filter(keyFn);
  }
}

export const STORES = {
  TREES: 'trees',
  TREE_EVENTS: 'tree-events',
  ACTIVITIES: 'activities',
  GOALS: 'goals',
  ACHIEVEMENTS: 'achievements',
} as const;
