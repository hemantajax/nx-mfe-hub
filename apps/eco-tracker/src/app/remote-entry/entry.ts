import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-eco-entry',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- In-app navigation tabs -->
    <div class="bg-white border-bottom sticky-top" style="z-index:100">
      <div class="container-fluid px-3 px-md-4" style="max-width:1400px">
        <ul class="nav nav-tabs border-0 flex-nowrap overflow-auto" style="white-space:nowrap">
          <li class="nav-item">
            <a class="nav-link" routerLink="/eco-tracker" routerLinkActive="active"
               [routerLinkActiveOptions]="{exact:true}">
              🌍 Dashboard
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/eco-tracker/trees" routerLinkActive="active">
              🌳 Trees
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/eco-tracker/footprint" routerLinkActive="active">
              👣 Footprint
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/eco-tracker/insights" routerLinkActive="active">
              💡 Insights
            </a>
          </li>
        </ul>
      </div>
    </div>
    <router-outlet />
  `,
  styles: [`
    .nav-tabs .nav-link.active {
      color: var(--eco-primary, #2d6a4f) !important;
      border-bottom: 2px solid var(--eco-primary, #2d6a4f) !important;
      font-weight: 600;
    }
    .nav-tabs .nav-link { color: #6c757d; border: none; }
    .nav-tabs { scrollbar-width: none; }
    .nav-tabs::-webkit-scrollbar { display: none; }
  `],
})
export class RemoteEntry {}
