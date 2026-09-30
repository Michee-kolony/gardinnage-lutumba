import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Paiement, PaiementsService } from '../../../core/paiements.service';
import { Propriete, formatDateCourte } from '../../../core/proprietes.service';

// Confirmation de suppression d'un paiement : l'abonnement de la propriété est
// recalculé par le serveur, le parent doit recharger la propriété et ses paiements.
@Component({
  selector: 'app-paiement-suppression',
  templateUrl: './paiement-suppression.component.html'
})
export class PaiementSuppressionComponent {
  @Input({ required: true }) paiement!: Paiement;
  // Propriété à jour (dernierPaiement) ; à défaut, celle peuplée dans le paiement
  @Input() propriete: Propriete | null = null;
  @Output() deleted = new EventEmitter<Paiement>();
  @Output() closed = new EventEmitter<void>();

  deleting = false;
  error = '';

  constructor(private paiementsService: PaiementsService) {}

  get proprieteNom(): string {
    const propriete = this.propriete ?? (typeof this.paiement.propriete === 'object' ? this.paiement.propriete : null);
    return propriete?.nomReference || 'La propriété';
  }

  // Aperçu seulement : l'écran final vient toujours de la propriété rechargée après la suppression
  get consequence(): string {
    const generique = 'L’abonnement de la propriété sera recalculé.';
    const propriete = this.propriete ?? (typeof this.paiement.propriete === 'object' ? this.paiement.propriete : null);
    const precedent = this.paiement.abonnementPrecedent;
    if (!precedent || !propriete?.dernierPaiement || propriete.dernierPaiement !== this.paiement._id) {
      return generique;
    }
    if (!precedent.dateExpiration) {
      return 'La propriété n’aura plus d’abonnement.';
    }
    if (new Date(precedent.dateExpiration) <= new Date()) {
      return `L’abonnement redeviendra expiré (fin le ${formatDateCourte(precedent.dateExpiration)}).`;
    }
    return `L’abonnement reviendra à la période du ${formatDateCourte(precedent.dateDebut)} au ${formatDateCourte(precedent.dateExpiration)}.`;
  }

  close(): void {
    if (!this.deleting) {
      this.closed.emit();
    }
  }

  confirm(): void {
    if (this.deleting) {
      return;
    }
    this.deleting = true;
    this.error = '';
    this.paiementsService.remove(this.paiement._id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleted.emit(this.paiement);
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.error = err.error?.message || 'Impossible de supprimer ce paiement.';
      }
    });
  }
}
