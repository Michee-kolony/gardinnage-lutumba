import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { LayoutService } from '../../core/layout.service';

const TITLES: Record<string, string> = {
  dashboard: 'Tableau de bord',
  gardiens: 'Gestion des gardiens',
  proprietaires: 'Gestion des propriétaires',
  maisons: 'Maisons sous surveillance',
  contrats: 'Contrats',
  incidents: 'Incidents',
  paiements: 'Paiements',
  parametres: 'Paramètres',
};

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit {
  pageTitle = 'Tableau de bord';
  username = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    public layout: LayoutService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || 'Administrateur';

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        map(() => this.router.url.split('/').pop() ?? 'dashboard')
      )
      .subscribe((segment) => {
        this.pageTitle = TITLES[segment] ?? 'Tableau de bord';
      });
  }
}
