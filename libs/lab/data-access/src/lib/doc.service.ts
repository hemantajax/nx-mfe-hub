import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { DocBook, DocsManifest } from './doc.model';
import { DOCS_ASSET_BASE } from './docs-asset-base.token';

@Injectable()
export class DocService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(DOCS_ASSET_BASE);

  readonly manifest = signal<DocsManifest | null>(null);

  loadManifest(): Observable<DocsManifest> {
    const cached = this.manifest();
    if (cached) return of(cached);

    return this.http.get<DocsManifest>(`${this.base}docs-manifest.json`).pipe(
      tap((m) => this.manifest.set(m)),
      catchError(() => {
        console.error('Failed to load docs-manifest.json');
        return of({ books: [] });
      })
    );
  }

  getBook(slug: string): DocBook | undefined {
    return this.manifest()?.books.find((b) => b.slug === slug);
  }

  getMarkdownUrl(bookSlug: string, file: string): string {
    return `${this.base}docs/${bookSlug}/${file}`;
  }
}
