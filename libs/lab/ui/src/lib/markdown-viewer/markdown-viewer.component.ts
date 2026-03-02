import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'lib-markdown-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent],
  template: `
    @if (src()) {
      <div class="markdown-body">
        <markdown
          [src]="src()"
          lineNumbers
          (load)="onLoad()"
          (error)="onError()"
        />
      </div>
    } @else {
      <div class="d-flex align-items-center justify-content-center py-5 text-muted">
        <div class="text-center">
          <i class="icon-book fs-1 d-block mb-3 opacity-25"></i>
          <p class="mb-0">Select a chapter from the sidebar to start reading.</p>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }

    .markdown-body {
      ::ng-deep {
        h1, h2, h3, h4 { font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        h1 { font-size: 2rem; border-bottom: 1px solid var(--bs-border-color); padding-bottom: 0.5rem; }
        h2 { font-size: 1.5rem; border-bottom: 1px solid var(--bs-border-color-translucent); padding-bottom: 0.3rem; }
        h3 { font-size: 1.2rem; }

        p { line-height: 1.8; margin-bottom: 1rem; }

        code:not(pre code) {
          background: var(--bs-tertiary-bg);
          color: var(--bs-danger);
          padding: 0.15em 0.4em;
          border-radius: 4px;
          font-size: 0.875em;
        }

        pre {
          border-radius: 8px;
          overflow-x: auto;
          font-size: 0.875rem;
          margin-bottom: 1rem;

          code { font-size: inherit; }
        }

        blockquote {
          position: relative;
          border: 1.5px solid var(--bs-warning-border-subtle);
          border-left: 4px solid var(--bs-warning);
          border-radius: 0 8px 8px 0;
          padding: 1rem 1.1rem 1rem 3rem;
          margin: 1.5rem 0;
          background: var(--bs-warning-bg-subtle);
          color: var(--bs-body-color);

          &::before {
            content: "💡";
            position: absolute;
            left: 0.9rem;
            top: 1rem;
            font-size: 0.95rem;
            line-height: 1.5;
          }

          p { margin-bottom: 0; line-height: 1.75; }
          p:not(:last-child) { margin-bottom: 0.4rem; }

          strong:first-child { color: var(--bs-warning-text-emphasis); }
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          th {
            background: var(--bs-tertiary-bg);
            font-weight: 600;
            text-align: left;
            padding: 0.6rem 0.8rem;
            border: 1px solid var(--bs-border-color);
          }
          td {
            padding: 0.5rem 0.8rem;
            border: 1px solid var(--bs-border-color);
            vertical-align: top;
          }
          tr:nth-child(even) td { background: var(--bs-tertiary-bg); }
        }

        img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5rem 0; }

        a { color: var(--bs-primary); }

        ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; li { margin-bottom: 0.25rem; } }

        hr { border-color: var(--bs-border-color); margin: 2rem 0; }
      }
    }
  `,
})
export class MarkdownViewerComponent {
  readonly src = input<string>('');

  protected onLoad(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected onError(): void {
    console.error('Failed to load markdown:', this.src());
  }
}
