import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  Affectation,
  dureeLabel,
  nomCompletGardien,
  statutAffectationBadgeClass,
  statutAffectationLabel
} from '../../../core/affectations.service';
import { AuthService } from '../../../core/auth.service';
import { formatDateCourte } from '../../../core/proprietes.service';
import { ActionAffectation } from '../affectation-confirmation/affectation-confirmation.component';

// Liste d'affectations avec les actions selon le statut (admins uniquement).
// Après chaque action, `changed` est émis : le parent recharge depuis le serveur.
@Component({
  selector: 'app-affectations-liste',
  templateUrl: './affectations-liste.component.html'
})
export class AffectationsListeComponent {
  @Input() affectations: Affectation[] = [];
  // Colonne inutile sur une fiche (ex. le gardien sur la fiche gardien)
  @Input() masquer: 'gardien' | 'propriete' | '' = '';
  @Input() afficherTelephone = false;
  @Input() messageVide = 'Aucune affectation.';
  @Output() changed = new EventEmitter<void>();

  enModification: Affectation | null = null;
  confirmation: { affectation: Affectation; action: ActionAffectation } | null = null;

  constructor(private authService: AuthService) {}

  get estAdmin(): boolean {
    return this.authService.isAdmin();
  }

  nomGardien(affectation: Affectation): string {
    return nomCompletGardien(affectation.gardien);
  }

  periode(affectation: Affectation): string {
    return `du ${formatDateCourte(affectation.dateDebut)} au ${formatDateCourte(affectation.dateFin)}`;
  }

  duree(affectation: Affectation): string {
    return dureeLabel(affectation.duree, affectation.uniteDuree);
  }

  dateCourte(date: string | null): string {
    return formatDateCourte(date);
  }

  statutLabel(affectation: Affectation): string {
    return statutAffectationLabel(affectation.statut);
  }

  statutBadgeClass(affectation: Affectation): string {
    return statutAffectationBadgeClass(affectation.statut);
  }

  // Actions proposées selon le statut renvoyé par le serveur
  peutModifier(a: Affectation): boolean {
    return a.statut !== 'expiree';
  }

  peutDefinirPrincipal(a: Affectation): boolean {
    return a.statut !== 'expiree' && !a.estPrincipal;
  }

  peutTerminer(a: Affectation): boolean {
    return a.statut === 'en cours';
  }

  confirmer(affectation: Affectation, action: ActionAffectation): void {
    this.confirmation = { affectation, action };
  }
}
