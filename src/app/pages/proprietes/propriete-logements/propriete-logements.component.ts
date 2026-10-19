import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';

import { SousCompte, SousComptesService, nomLocataire } from '../../../core/sous-comptes.service';
import { formatDateCourte } from '../../../core/proprietes.service';

interface Groupe {
  id: string;
  nom: string;
  occupes: number;
  logements: SousCompte[];
}

// Logements et leurs locataires (un sous-compte par logement, créé automatiquement
// par le serveur selon `nombreLogements`) : ceux d'une propriété (`propriete`),
// ou tous ceux d'un propriétaire regroupés par propriété (`proprietaire`).
// Consultation seule : les locataires sont inscrits par le propriétaire depuis son application.
// Changer `rafraichir` recharge depuis le serveur (ex. après modification du nombre de logements).
@Component({
  selector: 'app-propriete-logements',
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
      <h2 class="text-sm font-semibold text-black">{{ proprietaire ? 'Locataires' : 'Logements &amp; locataires' }}</h2>
      @if (!loading && !error) {
        <div class="flex flex-wrap gap-1.5 text-[11px] font-medium">
          <span class="rounded-full px-2 py-0.5 bg-neutral-100 text-black border border-neutral-300">{{ sousComptes.length }} logement(s)</span>
          <span class="rounded-full px-2 py-0.5 bg-green-100 text-green-700 border border-green-200">{{ occupes }} occupé(s)</span>
          <span class="rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">{{ sousComptes.length - occupes }} libre(s)</span>
        </div>
      }
    </div>

    @if (loading) {
      <div class="flex items-center gap-2 py-4 text-sm text-neutral-500">
        <span class="h-4 w-4 rounded-full border-2 border-neutral-200 border-t-black animate-spin"></span>
        Chargement des logements...
      </div>
    } @else if (error) {
      <div class="flex items-center gap-3 py-4">
        <p class="text-sm text-red-600">{{ error }}</p>
        <button type="button" (click)="charger()" class="text-xs font-medium text-black underline">Réessayer</button>
      </div>
    } @else if (sousComptes.length === 0) {
      <p class="py-4 text-sm text-neutral-500">{{ proprietaire ? 'Aucun logement pour ce propriétaire.' : 'Aucun logement pour cette propriété.' }}</p>
    } @else {
      <p class="mb-3 text-xs text-neutral-500">Les locataires sont inscrits par le propriétaire depuis son application. Modifiez « Logements » dans la fiche de la propriété pour ajouter ou retirer des logements.</p>
      @for (groupe of groupes; track groupe.id) {
        @if (proprietaire) {
          <button type="button" (click)="ouvrirPropriete(groupe.id)" class="mt-4 mb-2 flex w-full items-center justify-between gap-2 text-left first:mt-0">
            <span class="truncate text-xs font-semibold uppercase tracking-wide text-neutral-500">{{ groupe.nom }}</span>
            <span class="shrink-0 text-[11px] text-neutral-500">{{ groupe.occupes }} / {{ groupe.logements.length }} occupé(s) →</span>
          </button>
        }
        <ul class="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
          @for (sousCompte of groupe.logements; track sousCompte._id) {
            <li class="flex items-center gap-3 p-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                [ngClass]="sousCompte.statut === 'occupe' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'">{{ sousCompte.numero }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-black">{{ sousCompte.libelle }}</p>
                @if (sousCompte.statut === 'occupe') {
                  <p class="truncate text-xs text-neutral-600">{{ nom(sousCompte) }}@if (sousCompte.telephone) { · {{ sousCompte.telephone }} }</p>
                  @if (sousCompte.dateEntree) {
                    <p class="text-[11px] text-neutral-400">Depuis le {{ date(sousCompte.dateEntree) }}</p>
                  }
                } @else {
                  <p class="text-xs text-blue-700">Libre</p>
                }
              </div>
            </li>
          }
        </ul>
      }
    }
  `
})
export class ProprieteLogementsComponent implements OnChanges {
  @Input() propriete = '';
  // À la place de `propriete` : tous les logements de ce propriétaire, regroupés par propriété
  @Input() proprietaire = '';
  // Incrémenté par le parent pour recharger
  @Input() rafraichir = 0;

  sousComptes: SousCompte[] = [];
  loading = false;
  error = '';

  constructor(private sousComptesService: SousComptesService, private router: Router) {}

  get occupes(): number {
    return this.sousComptes.filter((s) => s.statut === 'occupe').length;
  }

  get groupes(): Groupe[] {
    const groupes = new Map<string, Groupe>();
    for (const sousCompte of this.sousComptes) {
      const id = sousCompte.propriete?._id ?? '';
      if (!groupes.has(id)) {
        groupes.set(id, { id, nom: sousCompte.propriete?.nomReference ?? 'Propriété', occupes: 0, logements: [] });
      }
      const groupe = groupes.get(id)!;
      groupe.logements.push(sousCompte);
      if (sousCompte.statut === 'occupe') groupe.occupes += 1;
    }
    return [...groupes.values()];
  }

  ngOnChanges(): void {
    this.charger();
  }

  charger(): void {
    if (!this.propriete && !this.proprietaire) {
      return;
    }
    this.loading = true;
    this.error = '';
    const filtre = this.propriete ? { propriete: this.propriete } : { proprietaire: this.proprietaire };
    this.sousComptesService.list(filtre).subscribe({
      next: (res) => {
        this.sousComptes = res.sousComptes;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.error?.message || 'Impossible de charger les logements.';
        this.loading = false;
      }
    });
  }

  ouvrirPropriete(id: string): void {
    if (id) this.router.navigate(['/admin/proprietes', id]);
  }

  nom(sousCompte: SousCompte): string {
    return nomLocataire(sousCompte);
  }

  date(value: string | undefined): string {
    return formatDateCourte(value ?? null);
  }
}
