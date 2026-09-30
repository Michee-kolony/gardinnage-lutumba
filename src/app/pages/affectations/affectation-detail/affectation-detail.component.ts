import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import {
  Affectation,
  dureeLabel,
  nomComplet,
  roleBadgeClass,
  roleLabel,
  statutAffectationBadgeClass,
  statutAffectationLabel
} from '../../../core/affectations.service';
import { formatDateCourte } from '../../../core/proprietes.service';

// Consultation d'une affectation (lecture seule), notamment pour les expirées
@Component({
  selector: 'app-affectation-detail',
  template: `
    <div class="fixed inset-0 z-50 grid items-end bg-black/55 p-0 sm:items-center sm:p-5 animate-[fade-in_0.15s_ease-out]" (click)="closed.emit()">
      <section class="mx-auto max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:rounded-xl animate-[modal-pop_0.2s_ease-out]" role="dialog" aria-modal="true" aria-labelledby="affectation-detail-title" (click)="$event.stopPropagation()">
        <header class="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="affectation-detail-title" class="font-serif text-xl font-medium text-black">Détail de l’affectation</h2>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" [ngClass]="statutBadge">{{ statut }}</span>
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" [ngClass]="roleBadge">{{ role }}</span>
            </div>
          </div>
          <button type="button" (click)="closed.emit()" aria-label="Fermer" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 hover:text-black">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 fill-none stroke-current stroke-2"><path stroke-linecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div class="space-y-4 px-5 py-5 sm:px-6">
          <div class="flex items-center gap-3">
            <app-affectation-avatar [src]="affectation.gardien?.photoProfil" [nom]="nom(affectation.gardien)" taille="h-14 w-14"></app-affectation-avatar>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Gardien</p>
              <p class="text-sm font-semibold text-black">{{ nom(affectation.gardien) }}</p>
              <p class="text-xs text-neutral-500">{{ affectation.gardien?.matricule }} @if (affectation.gardien?.telephonePrincipal) { · {{ affectation.gardien?.telephonePrincipal }} }</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <app-affectation-avatar [src]="affectation.propriete?.photos?.[0]" [nom]="affectation.propriete?.nomReference || ''" [avecInitiales]="false" taille="h-14 w-14" forme="rounded-lg"></app-affectation-avatar>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Propriété</p>
              <p class="text-sm font-semibold text-black">{{ affectation.propriete?.nomReference || 'Propriété supprimée' }}</p>
              <p class="text-xs text-neutral-500">{{ affectation.propriete?.commune }} — {{ affectation.propriete?.quartier }}</p>
              @if (affectation.propriete?.proprietaire) {
                <p class="text-xs text-neutral-500">Propriétaire : {{ nom(affectation.propriete?.proprietaire, '') }}</p>
              }
            </div>
          </div>
          <dl class="divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-3">
            <div class="flex items-start justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Horaire et jours</dt><dd><app-affectation-horaire [heureDebut]="affectation.heureDebut" [heureFin]="affectation.heureFin" [joursService]="affectation.joursService"></app-affectation-horaire></dd></div>
            <div class="flex items-start justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Période</dt><dd class="text-right text-xs font-semibold text-neutral-800">du {{ date(affectation.dateDebut) }} au {{ date(affectation.dateFin) }}</dd></div>
            <div class="flex items-start justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Durée prévue</dt><dd class="text-right text-xs font-semibold text-neutral-800">{{ duree }}</dd></div>
            @if (affectation.description) {
              <div class="flex items-start justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Description</dt><dd class="max-w-[65%] whitespace-pre-wrap text-right text-xs text-neutral-800">{{ affectation.description }}</dd></div>
            }
          </dl>
          @if (affectation.retireLe || affectation.remplace || affectation.remplacePar) {
            <div class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
              <app-affectation-suivi [affectation]="affectation"></app-affectation-suivi>
            </div>
          }
        </div>
      </section>
    </div>
  `
})
export class AffectationDetailComponent {
  @Input({ required: true }) affectation!: Affectation;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closed.emit();
  }

  get statut(): string {
    return statutAffectationLabel(this.affectation.statut);
  }

  get statutBadge(): string {
    return statutAffectationBadgeClass(this.affectation.statut);
  }

  get role(): string {
    return roleLabel(this.affectation.role);
  }

  get roleBadge(): string {
    return roleBadgeClass(this.affectation.role);
  }

  get duree(): string {
    return dureeLabel(this.affectation.duree, this.affectation.uniteDuree);
  }

  date(value: string | null): string {
    return formatDateCourte(value);
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined, defaut = 'Gardien supprimé'): string {
    return nomComplet(personne, defaut);
  }
}
