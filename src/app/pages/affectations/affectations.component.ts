import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import {
  Affectation,
  AffectationFiltres,
  AffectationsService,
  ROLES_AFFECTATION,
  RoleAffectation,
  STATUTS_AFFECTATION,
  StatutAffectation,
  nomComplet,
  roleLabel,
  statutAffectationLabel
} from '../../core/affectations.service';
import { AuthService } from '../../core/auth.service';
import { Gardien, GardiensService } from '../../core/gardiens.service';
import { Propriete, ProprietesService } from '../../core/proprietes.service';

@Component({
  selector: 'app-affectations',
  templateUrl: './affectations.component.html'
})
export class AffectationsComponent implements OnInit {
  readonly statuts = STATUTS_AFFECTATION;
  readonly roles = ROLES_AFFECTATION;

  affectations: Affectation[] = [];
  loading = true;
  loadError = '';

  // Filtres envoyés au serveur (query)
  filtreStatut: StatutAffectation | '' = '';
  filtrePropriete = '';
  filtreGardien = '';
  filtreRole: RoleAffectation | '' = '';

  proprietes: Propriete[] = [];
  gardiens: Gardien[] = [];

  formOpen = false;

  constructor(
    private affectationsService: AffectationsService,
    private proprietesService: ProprietesService,
    private gardiensService: GardiensService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Les statuts évoluent avec le temps : toujours recharger à l'ouverture
    this.fetchAffectations();
    this.proprietesService.list().subscribe({
      next: (res) => (this.proprietes = res.proprietes),
      error: () => (this.proprietes = [])
    });
    this.gardiensService.list().subscribe({
      next: (res) => (this.gardiens = res.gardiens),
      error: () => (this.gardiens = [])
    });
  }

  get estAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get filtresActifs(): boolean {
    return !!(this.filtreStatut || this.filtrePropriete || this.filtreGardien || this.filtreRole);
  }

  fetchAffectations(): void {
    this.loading = true;
    this.loadError = '';
    const filtres: AffectationFiltres = {
      ...(this.filtreStatut ? { statut: this.filtreStatut } : {}),
      ...(this.filtrePropriete ? { propriete: this.filtrePropriete } : {}),
      ...(this.filtreGardien ? { gardien: this.filtreGardien } : {}),
      ...(this.filtreRole ? { role: this.filtreRole } : {})
    };
    this.affectationsService.list(filtres).subscribe({
      next: (res) => {
        this.affectations = res.affectations;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loadError = err.error?.message || 'Impossible de charger les affectations.';
        this.loading = false;
      }
    });
  }

  setStatut(statut: StatutAffectation | ''): void {
    this.filtreStatut = statut;
    this.fetchAffectations();
  }

  reinitialiserFiltres(): void {
    this.filtreStatut = '';
    this.filtrePropriete = '';
    this.filtreGardien = '';
    this.filtreRole = '';
    this.fetchAffectations();
  }

  statutLabel(statut: StatutAffectation): string {
    return statutAffectationLabel(statut);
  }

  nomGardien(gardien: Gardien): string {
    return nomComplet(gardien);
  }

  roleLabel(role: RoleAffectation): string {
    return roleLabel(role);
  }
}
