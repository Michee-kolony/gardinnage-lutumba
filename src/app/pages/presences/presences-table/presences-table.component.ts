import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { nomComplet, roleLabel } from '../../../core/affectations.service';
import { AuthService } from '../../../core/auth.service';
import {
  Presence,
  PresencesService,
  clotureLabel,
  dureeMinutesLabel,
  heureLocale,
  jourLabel,
  statutPresenceBadgeClass,
  statutPresenceLabel
} from '../../../core/presences.service';

// Tableau des services pointés. `mode="retards"` n'affiche que les colonnes utiles aux retards.
// Actions : détail (tous), clôturer (admins, services en cours / non clôturés),
// supprimer (SUPER_ADMIN). Après une action, `changed` : le parent recharge depuis le serveur.
@Component({
  selector: 'app-presences-table',
  templateUrl: './presences-table.component.html'
})
export class PresencesTableComponent {
  @Input() presences: Presence[] = [];
  @Input() mode: 'complet' | 'retards' = 'complet';
  @Input() masquer: 'gardien' | 'propriete' | '' = '';
  @Input() messageVide = 'Aucun service sur cette période.';
  @Output() changed = new EventEmitter<void>();

  enDetail: Presence | null = null;
  enCloture: Presence | null = null;
  enSuppression: Presence | null = null;
  suppressionEnCours = false;
  suppressionErreur = '';

  constructor(private authService: AuthService, private presencesService: PresencesService) {}

  get estAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get estSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  peutCloturer(p: Presence): boolean {
    return this.estAdmin && (p.statut === 'en cours' || p.statut === 'non cloture');
  }

  horsZone(p: Presence): boolean {
    return !!(p.positionArrivee?.horsZone || p.positionDepart?.horsZone);
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined): string {
    return nomComplet(personne);
  }

  jour(value: string): string {
    return jourLabel(value);
  }

  heure(value: string | null): string {
    return heureLocale(value);
  }

  duree(p: Presence): string {
    return dureeMinutesLabel(p.dureeMinutes);
  }

  role(p: Presence): string {
    return p.affectation ? roleLabel(p.affectation.role) : '—';
  }

  statut(p: Presence): string {
    return statutPresenceLabel(p.statut);
  }

  statutBadge(p: Presence): string {
    return statutPresenceBadgeClass(p.statut);
  }

  cloture(p: Presence): string {
    return clotureLabel(p.cloture);
  }

  ouvrirSuppression(p: Presence): void {
    this.suppressionErreur = '';
    this.enSuppression = p;
  }

  fermerSuppression(): void {
    if (!this.suppressionEnCours) {
      this.enSuppression = null;
    }
  }

  confirmerSuppression(): void {
    const p = this.enSuppression;
    if (!p || this.suppressionEnCours) {
      return;
    }
    this.suppressionEnCours = true;
    this.suppressionErreur = '';
    this.presencesService.remove(p._id).subscribe({
      next: () => {
        this.suppressionEnCours = false;
        this.enSuppression = null;
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.suppressionEnCours = false;
        this.suppressionErreur = err.error?.message || 'Impossible de supprimer ce pointage.';
      }
    });
  }
}
