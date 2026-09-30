import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import { Affectation, AffectationsService, nomComplet, roleLabel } from '../../../core/affectations.service';

// Retirer un gardien : l'affectation passe en "expiree" et reste dans l'historique
// (pour une affectation à venir, cela revient à l'annuler).
@Component({
  selector: 'app-affectation-retrait',
  template: `
    <div class="fixed inset-0 z-[60] grid items-end bg-black/55 p-0 sm:items-center sm:p-5 animate-[fade-in_0.15s_ease-out]" (click)="close()">
      <section class="mx-auto w-full max-w-md rounded-t-xl bg-white shadow-2xl sm:rounded-xl animate-[modal-pop_0.2s_ease-out]" role="alertdialog" aria-modal="true" aria-labelledby="retrait-title" (click)="$event.stopPropagation()">
        <div class="px-5 pt-6 sm:px-6">
          <div class="mb-4 flex items-center gap-3">
            <app-affectation-avatar [src]="affectation.gardien?.photoProfil" [nom]="gardienNom" taille="h-11 w-11"></app-affectation-avatar>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-black truncate">{{ gardienNom }} <span class="font-normal text-neutral-500">· {{ role }}</span></p>
              <p class="text-xs text-neutral-500 truncate">{{ proprieteNom }}</p>
            </div>
          </div>
          <h2 id="retrait-title" class="font-serif text-xl font-medium text-black">{{ aVenir ? 'Annuler l’affectation' : 'Retirer le gardien' }}</h2>
          <p class="mt-2 text-sm text-neutral-600">
            @if (aVenir) {
              L’affectation de {{ gardienNom }} sur {{ proprieteNom }} sera annulée avant d’avoir commencé.
            } @else {
              {{ gardienNom }} sera retiré de {{ proprieteNom }} maintenant.
            }
            Elle restera visible dans l’historique.
          </p>

          <p class="mt-4 text-xs font-semibold text-neutral-700">Motif <span class="font-normal text-neutral-400">(facultatif)</span></p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            @for (choix of motifsRapides; track choix) {
              <button type="button" (click)="choisir(choix)"
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
                [ngClass]="motifChoisi === choix ? 'border-black bg-black text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-black'">{{ choix }}</button>
            }
          </div>
          @if (motifChoisi === 'Autre') {
            <textarea [value]="motifLibre" (input)="motifLibre = $any($event.target).value" rows="2" placeholder="Précisez le motif"
              class="mt-2 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10"></textarea>
          }
          @if (error) { <p class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">{{ error }}</p> }
        </div>
        <footer class="mt-6 flex flex-col-reverse gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end sm:rounded-b-xl sm:px-6">
          <button type="button" (click)="close()" [disabled]="running" class="min-h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50">Fermer</button>
          <button type="button" (click)="confirm()" [disabled]="running" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
            @if (running) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> En cours... } @else { {{ aVenir ? 'Annuler l’affectation' : 'Retirer le gardien' }} }
          </button>
        </footer>
      </section>
    </div>
  `
})
export class AffectationRetraitComponent {
  @Input({ required: true }) affectation!: Affectation;
  @Output() done = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  readonly motifsRapides = ['Fin de contrat', 'Démission', 'Faute', 'Autre'];
  motifChoisi = '';
  motifLibre = '';
  running = false;
  error = '';

  constructor(private affectationsService: AffectationsService) {}

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  get aVenir(): boolean {
    return this.affectation.statut === 'a venir';
  }

  get gardienNom(): string {
    return nomComplet(this.affectation.gardien);
  }

  get proprieteNom(): string {
    return this.affectation.propriete?.nomReference || 'la propriété';
  }

  get role(): string {
    return roleLabel(this.affectation.role);
  }

  get motif(): string {
    if (this.motifChoisi === 'Autre') {
      return this.motifLibre.trim() || 'Autre';
    }
    return this.motifChoisi;
  }

  choisir(choix: string): void {
    this.motifChoisi = this.motifChoisi === choix ? '' : choix;
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
    this.running = true;
    this.error = '';
    this.affectationsService.retirer(this.affectation._id, this.motif).subscribe({
      next: () => {
        this.running = false;
        this.done.emit();
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.running = false;
        this.error = err.error?.message || 'Impossible de retirer ce gardien.';
      }
    });
  }
}
