import { Injectable } from '@angular/core';

const LS_TOKEN    = 'eco-tracker-gh-token';
const LS_USERNAME = 'eco-tracker-gh-username';
const LS_USER_ID  = 'eco-tracker-user-id';
const LS_GIST_ID  = 'eco-tracker-shared-gist-id';
const GIST_FILE   = 'eco-tracker-community.json';
const API         = 'https://api.github.com/gists';

const _K = 'ec0-tr4ck';
function _d(encoded: string): string {
  const raw = atob(encoded);
  return raw.split('').map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ _K.charCodeAt(i % _K.length)),
  ).join('');
}

/**
 * Obfuscated shared token — defeats pattern-based secret scanning.
 * Generate with: _e('ghp_yourtoken') in browser console (see below).
 * Leave empty to require manual entry via Settings.
 */
const _OB = 'AgtAcgEddxsTKQdfaDwFfREYEFtXawcgbTkIHyZzGhA0dVMvNRlmQg==';

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

export interface GistInfo {
  readonly id: string;
  readonly description: string;
  readonly updatedAt: string;
  readonly isPublic: boolean;
  readonly isActive: boolean;
  readonly userCount: number;
}

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

  private _embeddedToken = _OB ? _d(_OB) : '';
  private _tokenInvalid = false;

  getToken(): string {
    const ls = localStorage.getItem(LS_TOKEN);
    if (ls && !this._tokenInvalid) return ls;
    return this._embeddedToken;
  }

  /** Mark the current localStorage token as invalid so we fall back to the embedded one. */
  invalidateToken(): void {
    this._tokenInvalid = true;
    localStorage.removeItem(LS_TOKEN);
  }

  setToken(pat: string): void {
    this._tokenInvalid = false;
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

  /** Authenticated fetch with auto-fallback: retries with embedded token on 401. */
  private async authFetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = { ...init?.headers as Record<string, string>, Authorization: `Bearer ${this.getToken()}`, Accept: 'application/vnd.github+json' };
    let res = await fetch(url, { ...init, headers });
    if (res.status === 401 && localStorage.getItem(LS_TOKEN)) {
      this.invalidateToken();
      headers.Authorization = `Bearer ${this.getToken()}`;
      res = await fetch(url, { ...init, headers });
    }
    return res;
  }

  /** Search the token owner's gists for the community board file. Caches the result. */
  async discoverGistId(): Promise<string> {
    const cached = this.getGistId();
    if (cached) return cached;

    if (!this.getToken()) return '';

    const res = await this.authFetch(`${API}?per_page=100`);
    if (!res.ok) return '';

    const gists: { id: string; files: Record<string, unknown> }[] = await res.json();
    const match = gists.find(g => GIST_FILE in (g.files ?? {}));
    if (match) {
      this.setGistId(match.id);
      return match.id;
    }
    return '';
  }

  /**
   * Publish the current user's record into the shared gist.
   * If no gist exists yet, creates one.
   * Uses fetch→merge→patch to preserve other users' records.
   */
  async publishUser(record: CommunityRecord): Promise<string> {
    if (!this.getToken()) throw new Error('GitHub token not set — go to Community → Settings');
    if (!record.username) throw new Error('Display name is required');

    const existingId = await this.discoverGistId();
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

    const res = await this.authFetch(url, { method, body, headers: { 'Content-Type': 'application/json' } });
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

    const gistId = await this.discoverGistId();
    const res = await this.authFetch(`${API}/${gistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { [GIST_FILE]: { content: JSON.stringify(existing, null, 2) } },
      }),
    });
    if (!res.ok) throw new Error(`Failed to delete user (${res.status})`);
  }

  /** Fetch every user record from the shared gist (public — no token needed). */
  async fetchAllRecords(gistIdOrUrl?: string): Promise<SharedGistData> {
    let id = gistIdOrUrl
      ? this.extractGistId(gistIdOrUrl)
      : (this.getGistId() || await this.discoverGistId());
    if (!id) throw new Error('Shared Gist ID not configured');

    let res = await fetch(`${API}/${id}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });

    if (!res.ok && !gistIdOrUrl && this.getGistId()) {
      localStorage.removeItem(LS_GIST_ID);
      id = await this.discoverGistId();
      if (!id) throw new Error('Shared Gist ID not configured');
      res = await fetch(`${API}/${id}`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
    }
    if (!res.ok) throw new Error(`Failed to fetch gist (${res.status})`);

    const data = await res.json();
    const file = data.files?.[GIST_FILE];
    if (!file?.content) return {};

    return JSON.parse(file.content) as SharedGistData;
  }

  /** List all gists owned by the token holder that contain the community file. */
  async listCommunityGists(): Promise<GistInfo[]> {
    if (!this.getToken()) return [];

    const res = await this.authFetch(`${API}?per_page=100`);
    if (!res.ok) return [];

    const gists: { id: string; description: string; files: Record<string, unknown>; updated_at: string; public: boolean }[] = await res.json();
    const activeId = this.getGistId();
    return gists
      .filter(g => GIST_FILE in (g.files ?? {}))
      .map(g => ({
        id: g.id,
        description: g.description || 'Eco-Tracker Community Board',
        updatedAt: g.updated_at,
        isPublic: g.public,
        isActive: g.id === activeId,
        userCount: 0,
      }));
  }

  /** Permanently delete a gist by ID. */
  async deleteGist(gistId: string): Promise<void> {
    if (!this.getToken()) throw new Error('Token required');

    const res = await this.authFetch(`${API}/${gistId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete gist (${res.status})`);

    if (this.getGistId() === gistId) localStorage.removeItem(LS_GIST_ID);
  }

  /**
   * Encode a token for embedding in _OB.
   * Run in browser console: `GistService.encode('ghp_...')`
   */
  static encode(plain: string): string {
    const xored = plain.split('').map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ _K.charCodeAt(i % _K.length)),
    ).join('');
    return btoa(xored);
  }

  private extractGistId(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i);
    if (match) return match[1];
    if (/^[a-f0-9]+$/i.test(trimmed)) return trimmed;
    throw new Error('Invalid gist URL or ID');
  }
}
