import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocService } from '@ng-mfe-hub/lab-data-access';
import {
  DocBreadcrumbComponent,
  DocSidebarComponent,
  MarkdownViewerComponent,
} from '@ng-mfe-hub/lab-ui';

@Component({
  selector: 'lib-doc-viewer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocSidebarComponent, MarkdownViewerComponent, DocBreadcrumbComponent],
  template: `
    <div class="doc-layout d-flex" style="min-height: calc(100vh - 56px)">
      <!-- Mobile sidebar toggle -->
      <button
        class="btn btn-sm btn-outline-secondary sidebar-toggle d-md-none position-fixed"
        style="bottom: 1.5rem; right: 1.5rem; z-index: 1050; width: 3rem; height: 3rem; border-radius: 50%"
        (click)="sidebarOpen.set(!sidebarOpen())"
        type="button"
        aria-label="Toggle sidebar"
      >
        <i class="icon-menu"></i>
      </button>

      <!-- Sidebar -->
      <aside
        class="doc-sidebar-wrapper flex-shrink-0"
        [class.sidebar-open]="sidebarOpen()"
        [class.sidebar-collapsed]="sidebarCollapsed()"
      >
        @if (manifest()) {
          <lib-doc-sidebar
            [books]="manifest()?.books ?? []"
            [activeBook]="bookSlug()"
            (chapterSelected)="sidebarOpen.set(false)"
          />
        }
      </aside>

      <!-- Mobile overlay -->
      @if (sidebarOpen()) {
        <button
          class="sidebar-overlay d-md-none position-fixed top-0 start-0 w-100 h-100 border-0"
          style="background: rgba(0,0,0,0.4); z-index: 1040; cursor: default"
          (click)="sidebarOpen.set(false)"
          aria-label="Close sidebar"
          type="button"
        ></button>
      }

      <!-- Main content -->
      <main class="doc-main flex-grow-1 overflow-auto">
        <div class="container-lg py-4 px-3 px-md-4">

          <!-- Content header: breadcrumb + chapter jump dropdown -->
          <div class="d-flex align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom flex-wrap">
            <div class="d-flex align-items-center gap-2">
              <!-- Desktop sidebar toggle -->
              <button
                class="btn btn-sm btn-link text-secondary d-none d-md-flex align-items-center justify-content-center sidebar-desktop-toggle text-decoration-none"
                (click)="sidebarCollapsed.set(!sidebarCollapsed())"
                type="button"
                [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
                [title]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
              >
                <i [class]="sidebarCollapsed() ? 'icon-angle-right' : 'icon-angle-left'"></i>
              </button>
              <lib-doc-breadcrumb
                [bookSlug]="bookSlug()"
                [bookTitle]="currentBook()?.title ?? ''"
                [chapterTitle]="currentChapter()?.title ?? ''"
              />
            </div>

            @if (currentBook()) {
              <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <!-- Chapter progress -->
                <span class="text-muted small text-nowrap">
                  {{ chapterIndex() + 1 }} / {{ currentBook()!.chapters.length }}
                </span>
                <!-- Jump-to dropdown — scales to any number of chapters -->
                <select
                  class="form-select form-select-sm chapter-jump"
                  style="max-width: 220px"
                  [value]="chapterSlug()"
                  (change)="onChapterSelect($event)"
                  aria-label="Jump to chapter"
                >
                  @for (ch of currentBook()!.chapters; track ch.slug) {
                    <option [value]="ch.slug">{{ ch.title }}</option>
                  }
                </select>
              </div>
            }
          </div>

          <!-- Markdown content -->
          <lib-markdown-viewer [src]="markdownSrc()" />

          <!-- Prev / Next -->
          @if (currentBook()) {
            <div class="d-flex justify-content-between align-items-center mt-5 pt-4 border-top gap-2">
              @if (prevChapter()) {
                <button
                  class="btn btn-outline-primary d-flex align-items-center gap-2"
                  (click)="navigateTo(bookSlug(), prevChapter()!.slug)"
                >
                  <i class="icon-arrow-left"></i>
                  <span class="d-none d-sm-inline">{{ prevChapter()!.title }}</span>
                </button>
              } @else {
                <div></div>
              }
              @if (nextChapter()) {
                <button
                  class="btn btn-outline-primary d-flex align-items-center gap-2"
                  (click)="navigateTo(bookSlug(), nextChapter()!.slug)"
                >
                  <span class="d-none d-sm-inline">{{ nextChapter()!.title }}</span>
                  <i class="icon-arrow-right"></i>
                </button>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; }

    .doc-sidebar-wrapper {
      width: 280px;
      position: sticky;
      top: 0;
      height: calc(100vh - 56px);
      overflow: hidden;
      border-right: 1px solid var(--bs-border-color);
      transition: width 0.25s ease, border-color 0.25s ease;

      &.sidebar-collapsed {
        @media (min-width: 768px) {
          width: 0;
          border-right-color: transparent;
        }
      }

      @media (max-width: 767px) {
        position: fixed;
        top: 0;
        left: 0;
        width: 280px !important;
        height: 100vh;
        z-index: 1045;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        background: var(--bs-body-bg);
        &.sidebar-open { transform: translateX(0); }
      }
    }

    .sidebar-desktop-toggle {
      width: 1.85rem;
      height: 1.85rem;
      padding: 0;
      flex-shrink: 0;
      border-radius: 6px;
    }
  `,
})
export class DocViewerPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly docService = inject(DocService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sidebarOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly bookSlug = signal('');
  protected readonly chapterSlug = signal('');
  protected readonly manifest = this.docService.manifest;

  constructor() {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.bookSlug.set(params['book'] ?? '');
      this.chapterSlug.set(params['chapter'] ?? '');
    });

    if (!this.docService.manifest()) {
      this.docService.loadManifest().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  protected readonly currentBook = computed(() =>
    this.docService.getBook(this.bookSlug())
  );

  protected readonly currentChapter = computed(() =>
    this.currentBook()?.chapters.find((c) => c.slug === this.chapterSlug())
  );

  protected readonly markdownSrc = computed(() => {
    const book = this.currentBook();
    if (!book) return '';
    const file = this.currentChapter()?.file ?? 'README.md';
    return this.docService.getMarkdownUrl(book.slug, file);
  });

  protected readonly chapterIndex = computed(() => {
    const chapters = this.currentBook()?.chapters ?? [];
    return chapters.findIndex((c) => c.slug === this.chapterSlug());
  });

  protected readonly prevChapter = computed(() => {
    const idx = this.chapterIndex();
    const chapters = this.currentBook()?.chapters ?? [];
    return idx > 0 ? chapters[idx - 1] : null;
  });

  protected readonly nextChapter = computed(() => {
    const idx = this.chapterIndex();
    const chapters = this.currentBook()?.chapters ?? [];
    return idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;
  });

  protected navigateTo(book: string, chapter: string): void {
    this.router.navigate(['/lab', book, chapter]);
  }

  protected onChapterSelect(event: Event): void {
    const slug = (event.target as HTMLSelectElement).value;
    this.navigateTo(this.bookSlug(), slug);
  }
}
