import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Observable } from 'rxjs';

import { Affectation, AffectationsService, nomCompletGardien } from '../../../core/affectations.service';

export type ActionAffectation = 'terminer' | 'supprimer' | 'principal';

// Confirmation puis exécution d'une action sur une affectation. Le parent doit
// recharger ses données depuis le serveur (un changement de principal modifie
// aussi les autres affectations de la propriété).
@Component({
  selector: 'app-affectation-confirmation',
  templateUrl: './affectation-confirmation.component.html'
})
export class AffectationConfirmationComponent {
  @Input({ required: true }) affectation!: Affectation;
  @Input({ required: true }) action!: ActionAffectation;
  @Output() done = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  running = false;
  error = '';

  constructor(private affectationsService: AffectationsService) {}

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  get gardienNom(): string {
    return nomCompletGardien(this.affectation.gardien);
  }

  get proprieteNom(): string {
    return this.affectation.propriete?.nomReference || 'la propriété';
  }

  get titre(): string {
    const titres: Record<ActionAffectation, string> = {
      terminer: 'Terminer l’affectation',
      supprimer: 'Supprimer l’affectation',
      principal: 'Définir le gardien principal'
    };
    return titres[this.action];
  }

  get message(): string {
    if (this.action === 'terminer') {
      return `Mettre fin à l'affectation de ${this.gardienNom} sur ${this.proprieteNom} maintenant ?`;
    }
    if (this.action === 'principal') {
      return `${this.gardienNom} deviendra le gardien principal de ${this.proprieteNom}.`;
    }
    return 'Supprimer définitivement cette affectation ?';
  }

  get boutonLabel(): string {
    const labels: Record<ActionAffectation, string> = { terminer: 'Terminer', supprimer: 'Supprimer', principal: 'Confirmer' };
    return labels[this.action];
  }

  get danger(): boolean {
    return this.action !== 'principal';
  }

  close(): void {
    if (!this.running) {
      this.closed.emit();
    }
  }

  confirm(): void {
    if (this.running) {
      return;
    }
    const id = this.affectation._id;
    const requetes: Record<ActionAffectation, () => Observable<unknown>> = {
      terminer: () => this.affectationsService.terminer(id),
      supprimer: () => this.affectationsService.remove(id),
      principal: () => this.affectationsService.definirPrincipal(id)
    };
    this.running = true;
    this.error = '';
    requetes[this.action]().subscribe({
      next: () => {
        this.running = false;
        this.done.emit();
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.running = false;
        this.error = err.error?.message || 'Action impossible pour cette affectation.';
      }
    });
  }
}
