import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LayoutService } from '../../core/layout.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() collapsed = false;

  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/admin/dashboard', icon: 'grid' },
    { label: 'Gardiens', route: '/admin/gardiens', icon: 'shield' },
    { label: 'Propriétaires', route: '/admin/proprietaires', icon: 'users' },
    { label: 'Maisons', route: '/admin/maisons', icon: 'home' },
    { label: 'Contrats', route: '/admin/contrats', icon: 'file' },
    { label: 'Incidents', route: '/admin/incidents', icon: 'alert' },
    { label: 'Paiements', route: '/admin/paiements', icon: 'card' },
    { label: 'Paramètres', route: '/admin/parametres', icon: 'settings' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    public layout: LayoutService
  ) {}

  onNavClick(): void {
    if (this.layout.isMobile()) {
      this.layout.closeSidebar();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
