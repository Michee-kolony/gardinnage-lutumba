import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminData, AuthService } from '../../core/auth.service';
import { IncidentsService } from '../../core/incidents.service';
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
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;

  // Incidents au statut "nouveau" (badge du menu Incidents)
  incidentsNonTraites = 0;
  private subscription?: Subscription;

  navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/admin/dashboard', icon: 'grid' },
    { label: 'Gardiens', route: '/admin/gardiens', icon: 'shield' },
    { label: 'Propriétaires', route: '/admin/proprietaires', icon: 'users' },
    { label: 'Propriétés', route: '/admin/proprietes', icon: 'home' },
    { label: 'Affectations', route: '/admin/affectations', icon: 'assign' },
    { label: 'Présences', route: '/admin/presences', icon: 'clock' },
    { label: 'Rapports', route: '/admin/rapports', icon: 'report' },
    { label: 'Incidents', route: '/admin/incidents', icon: 'alert' },
    { label: 'Paiements', route: '/admin/paiements', icon: 'card' },
    { label: 'Administrateurs', route: '/admin/administrateurs', icon: 'badge' },
    { label: 'Paramètres', route: '/admin/parametres', icon: 'settings' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    public layout: LayoutService,
    private incidentsService: IncidentsService
  ) {}

  ngOnInit(): void {
    this.subscription = this.incidentsService.etat$.subscribe((etat) => (this.incidentsNonTraites = etat.nonTraites));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  badge(item: NavItem): number {
    return item.route === '/admin/incidents' ? this.incidentsNonTraites : 0;
  }

  get admin(): AdminData | null {
    return this.authService.getAdmin();
  }

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
