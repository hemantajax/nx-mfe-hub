import { Injectable, inject, signal } from '@angular/core';
import { GistService, CommunityRecord, CommunitySummary } from './gist.service';
import { TreeService } from './tree.service';
import { FootprintService } from './footprint.service';
import { calcNetImpact } from './co2-calc';

export interface CommunityUser extends CommunityRecord {
  readonly uid: string;
  readonly isAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly gistService = inject(GistService);
  private readonly treeService = inject(TreeService);
  private readonly footprintService = inject(FootprintService);

  private readonly _users = signal<CommunityUser[]>([]);
  readonly users = this._users.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  /** Fetch all user records from the shared gist. */
  async loadUsers(): Promise<void> {
    this._loading.set(true);
    try {
      const data = await this.gistService.fetchAllRecords();
      const entries = Object.entries(data)
        .map(([uid, record]) => ({ ...record, uid, isAdmin: false as boolean }))
        .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      if (entries.length) entries[0].isAdmin = true;
      entries.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      this._users.set(entries);
    } catch {
      this._users.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  /** Build the current user's summary and publish it into the shared gist. */
  async publishMyData(): Promise<string> {
    const username = this.gistService.getUsername();
    if (!username) throw new Error('Set your display name first');

    const offset = this.treeService.totalOffset();
    const emissions = this.footprintService.totalEmissions();
    const net = calcNetImpact(offset, emissions);

    const summary: CommunitySummary = {
      treeCount: this.treeService.treeCount(),
      totalOffset: Math.round(offset * 10) / 10,
      totalEmissions: Math.round(emissions * 10) / 10,
      netImpact: Math.round(net * 10) / 10,
      isNetPositive: net >= 0,
    };

    const record: CommunityRecord = {
      username,
      summary,
      publishedAt: new Date().toISOString(),
    };

    const gistId = await this.gistService.publishUser(record);
    await this.loadUsers();
    return gistId;
  }

  /** Delete a user from the shared gist. */
  async removeUser(uid: string): Promise<void> {
    await this.gistService.removeUser(uid);
    this._users.update((prev) => prev.filter((u) => u.uid !== uid));
  }
}
