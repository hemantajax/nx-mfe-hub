import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent, SidebarComponent, NavItem } from '@ng-mfe-hub/ui';

@Component({
  imports: [RouterModule, HeaderComponent, SidebarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected sidebarOpen = signal(false);

  protected readonly headerNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'icon-dashboard' },
    { label: 'Profile', route: '/profile', icon: 'icon-user' },
    { label: 'Lab', route: '/lab', icon: 'icon-pulse' },
    { label: 'Theme', route: '/theme', icon: 'icon-palette' },
    { label: 'Demos', route: '/demos', icon: 'icon-layers' },
  ];

  protected readonly sidebarNavItems: NavItem[] = [
    { label: 'Home', route: '/', icon: 'icon-home', exact: true },
    { label: 'Dashboard', route: '/dashboard', icon: 'icon-dashboard' },
    { label: 'Profile', route: '/profile', icon: 'icon-user' },
    { label: 'Lab', route: '/lab', icon: 'icon-pulse' },
    { label: 'Theme', route: '/theme', icon: 'icon-palette' },
    { label: 'Demos', route: '/demos', icon: 'icon-layers' },
  ];

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
