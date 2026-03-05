import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent, SidebarComponent, NavItem, ToastContainerComponent } from '@ng-mfe-hub/ui';

@Component({
  imports: [RouterModule, HeaderComponent, SidebarComponent, ToastContainerComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected sidebarOpen = signal(false);

  protected readonly headerNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'icon-dashboard', badge: 'remote' },
    { label: 'Profile',   route: '/profile',   icon: 'icon-user',      badge: 'remote' },
    { label: 'Lab',       route: '/lab',        icon: 'icon-pulse',     badge: 'remote' },
    { label: 'Theme',     route: '/theme',      icon: 'icon-palette',   badge: 'remote' },
    { label: 'Demos',     route: '/demos',      icon: 'icon-layers',    badge: 'remote' },
    { label: 'Jobs',      route: '/jobs',       icon: 'icon-briefcase', badge: 'remote' },
    { label: 'EcoTracker', route: '/eco-tracker', icon: 'icon-world',    badge: 'remote' },
  ];

  protected readonly sidebarNavItems: NavItem[] = [
    { label: 'Home',      route: '/',           icon: 'icon-home',      exact: true },
    { label: 'Dashboard', route: '/dashboard',  icon: 'icon-dashboard', badge: 'remote' },
    { label: 'Profile',   route: '/profile',    icon: 'icon-user',      badge: 'remote' },
    { label: 'Lab',       route: '/lab',         icon: 'icon-pulse',     badge: 'remote' },
    { label: 'Theme',     route: '/theme',       icon: 'icon-palette',   badge: 'remote' },
    { label: 'Demos',     route: '/demos',       icon: 'icon-layers',    badge: 'remote' },
    { label: 'Jobs',      route: '/jobs',         icon: 'icon-briefcase', badge: 'remote' },
    { label: 'EcoTracker', route: '/eco-tracker', icon: 'icon-world',     badge: 'remote' },
  ];

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
