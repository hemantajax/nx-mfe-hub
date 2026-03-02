import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DocService } from '@ng-mfe-hub/lab-data-access';

@Component({
  selector: 'lib-docs-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-lg py-5">
      <div class="mb-5">
        <h1 class="display-5 fw-bold mb-2">Learning Hub</h1>
        <p class="text-muted lead">Browse the knowledge base. Select a book to start reading.</p>
      </div>

      @if (manifest()) {
        <div class="row g-4">
          @for (book of manifest()?.books ?? []; track book.slug) {
            <div class="col-md-6">
              <button
                class="card h-100 border shadow-sm w-100 text-start bg-body p-0"
                style="cursor: pointer"
                (click)="openBook(book.slug, book.chapters[0].slug)"
                type="button"
              >
                <div class="card-body p-4">
                  <div class="d-flex align-items-center gap-3 mb-3">
                    <div class="icon-circle d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle"
                      style="width: 3rem; height: 3rem;">
                      <i [class]="book.icon + ' text-primary fs-5'"></i>
                    </div>
                    <h2 class="h5 mb-0 fw-semibold">{{ book.title }}</h2>
                  </div>
                  <p class="text-muted small mb-3">{{ book.description }}</p>
                  <div class="d-flex align-items-center justify-content-between">
                    <span class="badge bg-secondary-subtle text-secondary rounded-pill">
                      {{ book.chapters.length }} chapters
                    </span>
                    <span class="text-primary small fw-medium">
                      Read now <i class="icon-arrow-right ms-1"></i>
                    </span>
                  </div>
                </div>
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class DocsHomeComponent {
  private readonly router = inject(Router);
  private readonly docService = inject(DocService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly manifest = this.docService.manifest;

  constructor() {
    if (!this.docService.manifest()) {
      this.docService.loadManifest().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  protected openBook(bookSlug: string, firstChapter: string): void {
    this.router.navigate(['/lab', bookSlug, firstChapter]);
  }
}
