import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SidebarChapter {
  slug: string;
  title: string;
  file: string;
}

export interface SidebarBook {
  slug: string;
  title: string;
  icon: string;
  chapters: SidebarChapter[];
}

@Component({
  selector: 'lib-doc-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="doc-sidebar d-flex flex-column h-100">
      <div class="sidebar-header px-3 py-3 border-bottom">
        <span class="fw-semibold text-uppercase text-muted small letter-spacing-wide">
          Learning Hub
        </span>
      </div>

      <div class="sidebar-body overflow-auto flex-grow-1 py-2">
        @for (book of books(); track book.slug) {
          <div class="book-section mb-1">
            <button
              class="book-toggle btn btn-link w-100 text-start d-flex align-items-center gap-2 px-3 py-2 text-decoration-none"
              [class.text-primary]="activeBook() === book.slug"
              (click)="toggleBook(book.slug)"
              type="button"
            >
              <i [class]="book.icon + ' fs-6'"></i>
              <span class="fw-medium small">{{ book.title }}</span>
              <i
                class="icon-angle-down ms-auto small"
                [class.rotate-180]="expandedBook() === book.slug"
                style="transition: transform 0.2s ease"
              ></i>
            </button>

            @if (expandedBook() === book.slug) {
              <ul class="chapter-list list-unstyled mb-0 ps-2">
                @for (chapter of book.chapters; track chapter.slug) {
                  <li>
                    <a
                      class="chapter-link d-block px-3 py-1 small text-decoration-none rounded mx-2"
                      [routerLink]="['/lab', book.slug, chapter.slug]"
                      routerLinkActive="chapter-active"
                      (click)="chapterSelected.emit()"
                    >
                      {{ chapter.title }}
                    </a>
                  </li>
                }
              </ul>
            }
          </div>
        }
      </div>
    </nav>
  `,
  styles: `
    :host { display: block; height: 100%; }

    .doc-sidebar {
      background: var(--bs-body-bg);
      border-right: 1px solid var(--bs-border-color);
    }

    .book-toggle {
      color: var(--bs-body-color);
      border-radius: 0;
      border: none;
      &:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
    }

    .rotate-180 { transform: rotate(180deg); }

    .chapter-link {
      color: var(--bs-secondary-color);
      &:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
    }

    .chapter-active {
      background: var(--bs-primary-bg-subtle) !important;
      color: var(--bs-primary) !important;
      font-weight: 500;
    }

    .letter-spacing-wide { letter-spacing: 0.08em; }
  `,
})
export class DocSidebarComponent {
  readonly books = input.required<SidebarBook[]>();
  readonly activeBook = input<string>('');
  readonly chapterSelected = output<void>();

  protected readonly expandedBook = signal<string>('');

  constructor() {
    effect(() => {
      const active = this.activeBook();
      if (active) this.expandedBook.set(active);
    });
  }

  protected toggleBook(slug: string): void {
    this.expandedBook.update((current) => (current === slug ? '' : slug));
  }
}
