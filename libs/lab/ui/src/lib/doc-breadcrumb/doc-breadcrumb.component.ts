import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'lib-doc-breadcrumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0 small">
        <li class="breadcrumb-item">
          <a routerLink="/lab" class="text-decoration-none">Docs</a>
        </li>
        @if (bookTitle()) {
          <li class="breadcrumb-item">
            <a [routerLink]="['/lab', bookSlug()]" class="text-decoration-none">
              {{ bookTitle() }}
            </a>
          </li>
        }
        @if (chapterTitle()) {
          <li class="breadcrumb-item active" aria-current="page">
            {{ chapterTitle() }}
          </li>
        }
      </ol>
    </nav>
  `,
})
export class DocBreadcrumbComponent {
  readonly bookSlug = input<string>('');
  readonly bookTitle = input<string>('');
  readonly chapterTitle = input<string>('');
}
