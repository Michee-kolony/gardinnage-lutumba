import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnChanges } from '@angular/core';

import {
  Affectation,
  AffectationsService,
  StatutAffectation,
  nomComplet,
  roleBadgeClass,
  roleLabel,
  statutAffectationBadgeClass,
  statutAffectationLabel
} from '../../../core/affectations.service';
import { formatDateCourte } from '../../../core/proprietes.service';

// Historique chronologique (tri=recent) des affectations d'une propriété ou d'un gardien,
// avec la traçabilité des retraits et des remplacements. Lecture seule.
// Changer `rafraichir` recharge depuis le serveur (après une action du parent).
@Component({
  selector: 'app-affectations-historique',
  template: `
    @if (loading) {
      <div class="flex items-center gap-2 py-4 text-sm text-neutral-500">
        <span class="h-4 w-4 rounded-full border-2 border-neutral-200 border-t-black animate-spin"></span>
        Chargement de l’historique...
      </div>
    } @else if (error) {
      <div class="flex items-center gap-3 py-4">
        <p class="text-sm text-red-600">{{ error }}</p>
        <button type="button" (click)="charger()" class="text-xs font-medium text-black underline">Réessayer</button>
      </div>
    } @else if (affectations.length === 0) {
      <p class="py-4 text-sm text-neutral-500">{{ messageVide }}</p>
    } @else {
      <ol class="relative ml-2 border-l border-neutral-200">
        @for (affectation of affectations; track affectation._id) {
          <li class="relative pb-5 pl-5 last:pb-1">
            <span class="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white"
              [ngClass]="affectation.statut === 'en cours' ? 'bg-green-500' : affectation.statut === 'a venir' ? 'bg-blue-500' : 'bg-neutral-400'"></span>
            <p class="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{{ date(affectation.dateDebut) }} → {{ date(affectation.dateFin) }}</p>
            <div class="mt-1.5 flex items-center gap-3">
              @if (gardien) {
                <app-affectation-avatar [src]="affectation.propriete?.photos?.[0]" [nom]="affectation.propriete?.nomReference || ''" [avecInitiales]="false" taille="h-10 w-10" forme="rounded-lg"></app-affectation-avatar>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-black">{{ affectation.propriete?.nomReference || 'Propriété supprimée' }}</p>
                  <p class="truncate text-xs text-neutral-500">{{ affectation.propriete?.commune }} — {{ affectation.propriete?.quartier }}</p>
                </div>
              } @else {
                <app-affectation-avatar [src]="affectation.gardien?.photoProfil" [nom]="nom(affectation.gardien)" taille="h-10 w-10"></app-affectation-avatar>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-black">{{ nom(affectation.gardien) }}</p>
                  <p class="truncate text-xs text-neutral-500">{{ affectation.gardien?.matricule }}</p>
                </div>
              }
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" [ngClass]="statutBadge(affectation.statut)">{{ statutLabel(affectation.statut) }}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" [ngClass]="roleBadge(affectation)">{{ role(affectation) }}</span>
            </div>
            <div class="mt-1.5"><app-affectation-horaire [heureDebut]="affectation.heureDebut" [heureFin]="affectation.heureFin" [joursService]="affectation.joursService"></app-affectation-horaire></div>
            <div class="mt-1.5"><app-affectation-suivi [affectation]="affectation"></app-affectation-suivi></div>
          </li>
        }
      </ol>
    }
  `
})
export class AffectationsHistoriqueComponent implements OnChanges {
  @Input() propriete = '';
  @Input() gardien = '';
  // Limiter à un statut (ex. 'expiree' sur la fiche gardien)
  @Input() statut: StatutAffectation | '' = '';
  @Input() messageVide = 'Aucune affectation dans l’historique.';
  // Incrémenté par le parent pour recharger
  @Input() rafraichir = 0;

  affectations: Affectation[] = [];
  loading = false;
  error = '';

  constructor(private affectationsService: AffectationsService) {}

  ngOnChanges(): void {
    this.charger();
  }

  charger(): void {
    if (!this.propriete && !this.gardien) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.affectationsService.list({
      tri: 'recent',
      ...(this.propriete ? { propriete: this.propriete } : {}),
      ...(this.gardien ? { gardien: this.gardien } : {}),
      ...(this.statut ? { statut: this.statut } : {})
    }).subscribe({
      next: (res) => {
        this.affectations = res.affectations;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.error?.message || 'Impossible de charger l’historique.';
        this.loading = false;
      }
    });
  }

  date(value: string | null): string {
    return formatDateCourte(value);
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null): string {
    return nomComplet(personne);
  }

  statutLabel(statut: StatutAffectation): string {
    return statutAffectationLabel(statut);
  }

  statutBadge(statut: StatutAffectation): string {
    return statutAffectationBadgeClass(statut);
  }

  role(affectation: Affectation): string {
    return roleLabel(affectation.role);
  }

  roleBadge(affectation: Affectation): string {
    return roleBadgeClass(affectation.role);
  }
}
