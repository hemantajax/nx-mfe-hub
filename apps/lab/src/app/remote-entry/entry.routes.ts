// Prism JS — imported here so they're bundled into the MFE chunk,
// not in a scripts.js that the shell never loads.
import 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/plugins/line-numbers/prism-line-numbers';

import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { DOCS_ASSET_BASE, DocService } from '@ng-mfe-hub/lab-data-access';

// Webpack Module Federation sets __webpack_public_path__ to the remote's
// base URL (e.g. http://localhost:4204/) at runtime, so all asset requests
// resolve against the lab remote, not the shell host.
declare const __webpack_public_path__: string;

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    providers: [
      provideHttpClient(),
      provideMarkdown({
        loader: HttpClient,
        markedOptions: {
          provide: MARKED_OPTIONS,
          useValue: { gfm: true, breaks: false },
        },
      }),
      {
        provide: DOCS_ASSET_BASE,
        useFactory: () =>
          typeof __webpack_public_path__ !== 'undefined'
            ? __webpack_public_path__
            : '/',
      },
      DocService,
    ],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@ng-mfe-hub/lab-feature-docs').then((m) => m.DocsHomeComponent),
      },
      {
        path: ':book',
        loadComponent: () =>
          import('@ng-mfe-hub/lab-feature-docs').then(
            (m) => m.DocViewerPageComponent
          ),
      },
      {
        path: ':book/:chapter',
        loadComponent: () =>
          import('@ng-mfe-hub/lab-feature-docs').then(
            (m) => m.DocViewerPageComponent
          ),
      },
    ],
  },
];
