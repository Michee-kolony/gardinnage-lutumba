import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  Affectation,
  nomComplet,
  roleBadgeClass,
  roleLabel,
  statutAffectationBadgeClass,
  statutAffectationLabel
} from '../../../core/affectations.service';
import { AuthService } from '../../../core/auth.service';
import { formatDateCourte } from '../../../core/proprietes.service';
import { ActionAffectation } from '../affectation-confirmation/affectation-confirmation.component';

// Liste d'affectations avec les actions selon le statut (admins uniquement).
// Après chaque action, `changed` est émis : le parent recharge depuis le serveur
// (définir un principal ou remplacer modifie aussi d'autres affectations).
@Component({
  selector: 'app-affectations-liste',
  templateUrl: './affectations-liste.component.html'
})
export class AffectationsListeComponent {
  @Input() affectations: Affectation[] = [];
  // Colonne inutile sur une fiche (ex. le gardien sur la fiche gardien)
  @Input() masquer: 'gardien' | 'propriete' | '' = '';
  @Input() afficherTelephone = false;
  // Fiche propriété : le gardien principal en cours en grande carte
  @Input() mettreEnAvantPrincipal = false;
  @Input() messageVide = 'Aucune affectation.';
  @Output() changed = new EventEmitter<void>();

  enModification: Affectation | null = null;
  enRemplacement: Affectation | null = null;
  enRetrait: Affectation | null = null;
  enDetail: Affectation | null = null;
  confirmation: { affectation: Affectation; action: ActionAffectation } | null = null;

  constructor(private authService: AuthService) {}

  get estAdmin(): boolean {
    return this.authService.isAdmin();
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined, defaut = 'Gardien supprimé'): string {
    return nomComplet(personne, defaut);
  }

  periode(affectation: Affectation): string {
    return `du ${formatDateCourte(affectation.dateDebut)} au ${formatDateCourte(affectation.dateFin)}`;
  }

  statutLabel(affectation: Affectation): string {
    return statutAffectationLabel(affectation.statut);
  }

  statutBadgeClass(affectation: Affectation): string {
    return statutAffectationBadgeClass(affectation.statut);
  }

  roleLabel(affectation: Affectation): string {
    return roleLabel(affectation.role);
  }

  roleBadgeClass(affectation: Affectation): string {
    return roleBadgeClass(affectation.role);
  }

  enVedette(affectation: Affectation): boolean {
    return this.mettreEnAvantPrincipal && affectation.role === 'principal' && affectation.statut === 'en cours';
  }

  // Actions proposées selon le statut renvoyé par le serveur
  active(a: Affectation): boolean {
    return a.statut !== 'expiree';
  }

  confirmer(affectation: Affectation, action: ActionAffectation): void {
    this.confirmation = { affectation, action };
  }
}
