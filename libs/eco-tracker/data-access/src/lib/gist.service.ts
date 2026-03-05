import { Injectable } from '@angular/core';

declare const process: { env: { GH_GIST_TOKEN: string } };

const BUILD_TOKEN = (typeof process !== 'undefined' && process.env?.GH_GIST_TOKEN) || '';
const LS_TOKEN    = 'eco-tracker-gh-token';
const LS_USERNAME = 'eco-tracker-gh-username';
const LS_USER_ID  = 'eco-tracker-user-id';
const LS_GIST_ID  = 'eco-tracker-shared-gist-id';
const GIST_FILE   = 'eco-tracker-community.json';
const API         = 'https://api.github.com/gists';

export interface CommunitySummary {
  readonly treeCount: number;
  readonly totalOffset: number;
  readonly totalEmissions: number;
  readonly netImpact: number;
  readonly isNetPositive: boolean;
}

export interface CommunityRecord {
  readonly username: string;
  readonly summary: CommunitySummary;
  readonly publishedAt: string;
}

/** Shape of the JSON stored inside the shared gist file — keyed by unique user ID. */
export type SharedGistData = Record<string, CommunityRecord>;

@Injectable({ providedIn: 'root' })
export class GistService {

  /** Stable per-device identifier — auto-generated once, but can be overridden for multi-device sync. */
  getUserId(): string {
    let id = localStorage.getItem(LS_USER_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(LS_USER_ID, id);
    }
    return id;
  }

  setUserId(id: string): void {
    if (id.trim()) localStorage.setItem(LS_USER_ID, id.trim());
  }

  getToken(): string {
    return localStorage.getItem(LS_TOKEN) || BUILD_TOKEN;
  }

  setToken(pat: string): void {
    localStorage.setItem(LS_TOKEN, pat.trim());
  }

  getUsername(): string {
    return localStorage.getItem(LS_USERNAME) ?? '';
  }

  setUsername(name: string): void {
    localStorage.setItem(LS_USERNAME, name.trim());
  }

  getGistId(): string {
    return localStorage.getItem(LS_GIST_ID) ?? '';
  }

  setGistId(id: string): void {
    localStorage.setItem(LS_GIST_ID, id.trim());
  }

  /**
   * Publish the current user's record into the shared gist.
   * If no gist exists yet, creates one.
   * Uses fetch→merge→patch to preserve other users' records.
   */
  async publishUser(record: CommunityRecord): Promise<string> {
    if (!this.getToken()) throw new Error('GitHub token not set — go to Community → Settings');
    if (!record.username) throw new Error('Display name is required');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.getToken()}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    const existingId = this.getGistId();
    let existing: SharedGistData = {};

    if (existingId) {
      try {
        existing = await this.fetchAllRecords(existingId);
      } catch {
        existing = {};
      }
    }

    existing[this.getUserId()] = record;

    const body = JSON.stringify({
      description: 'Eco-Tracker Community Board',
      public: true,
      files: { [GIST_FILE]: { content: JSON.stringify(existing, null, 2) } },
    });

    const url = existingId ? `${API}/${existingId}` : API;
    const method = existingId ? 'PATCH' : 'POST';

    const res = await fetch(url, { method, headers, body });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `GitHub API error ${res.status}`);
    }

    const data = await res.json();
    if (!existingId) this.setGistId(data.id);
    return data.id;
  }

  /** Remove a user record from the shared gist by their uid. */
  async removeUser(uid: string): Promise<void> {
    const existing = await this.fetchAllRecords();
    delete existing[uid];

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.getToken()}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    const res = await fetch(`${API}/${this.getGistId()}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        files: { [GIST_FILE]: { content: JSON.stringify(existing, null, 2) } },
      }),
    });
    if (!res.ok) throw new Error(`Failed to delete user (${res.status})`);
  }

  /** Fetch every user record from the shared gist. */
  async fetchAllRecords(gistIdOrUrl?: string): Promise<SharedGistData> {
    const id = gistIdOrUrl
      ? this.extractGistId(gistIdOrUrl)
      : this.getGistId();
    if (!id) throw new Error('Shared Gist ID not configured');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.getToken()}`,
      Accept: 'application/vnd.github+json',
    };

    const res = await fetch(`${API}/${id}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch gist (${res.status})`);

    const data = await res.json();
    const file = data.files?.[GIST_FILE];
    if (!file?.content) return {};

    return JSON.parse(file.content) as SharedGistData;
  }

  private extractGistId(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i);
    if (match) return match[1];
    if (/^[a-f0-9]+$/i.test(trimmed)) return trimmed;
    throw new Error('Invalid gist URL or ID');
  }
}
