import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-eco-entry',
  styleUrls: ['./entry.scss'],
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
          <li class="nav-item">
            <a class="nav-link" routerLink="/eco-tracker/community" routerLinkActive="active">
              🌐 Community
            </a>
          </li>
        </ul>
      </div>
    </div>
    <router-outlet />
  `,
})
export class RemoteEntry {}
