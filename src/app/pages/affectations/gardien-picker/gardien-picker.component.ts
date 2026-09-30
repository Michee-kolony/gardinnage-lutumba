import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Affectation, horaireLabel, nomComplet } from '../../../core/affectations.service';
import { Gardien } from '../../../core/gardiens.service';

// Sélecteur de gardien avec photo et matricule. Les services en cours de chaque
// gardien sont indiqués pour information : un gardien peut travailler sur deux
// propriétés à des heures différentes, le serveur reste l'autorité (409).
@Component({
  selector: 'app-gardien-picker',
  template: `
    <div class="relative">
      <button type="button" (click)="toggle()" [attr.aria-expanded]="open"
        class="flex min-h-11 w-full items-center gap-3 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-left text-sm transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10">
        @if (selected; as gardien) {
          <app-affectation-avatar [src]="gardien.photoProfil" [nom]="nom(gardien)" taille="h-8 w-8"></app-affectation-avatar>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium text-black">{{ nom(gardien) }}</span>
            <span class="block truncate text-xs text-neutral-500">{{ gardien.matricule }}</span>
          </span>
        } @else {
          <span class="flex-1 text-neutral-400">{{ placeholder }}</span>
        }
        <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 shrink-0 fill-none stroke-current stroke-2 text-neutral-500"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" /></svg>
      </button>
      @if (selected && services(selected).length) {
        <p class="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Déjà en service : {{ servicesLabel(selected) }}. Possible seulement si les horaires ne se croisent pas.
        </p>
      }
      @if (open) {
        <div class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl">
          <div class="border-b border-neutral-100 p-2">
            <input type="search" [value]="term" (input)="term = $any($event.target).value" placeholder="Rechercher (nom, matricule)" class="h-9 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-black" />
          </div>
          <ul class="max-h-60 overflow-y-auto py-1">
            @for (gardien of filtered; track gardien._id) {
              <li>
                <button type="button" (click)="select(gardien)" class="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-neutral-50" [class.bg-neutral-100]="gardien._id === selectedId">
                  <app-affectation-avatar [src]="gardien.photoProfil" [nom]="nom(gardien)" taille="h-9 w-9"></app-affectation-avatar>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-black">{{ nom(gardien) }}</span>
                    <span class="block truncate text-xs text-neutral-500">{{ gardien.matricule }}</span>
                    @if (services(gardien).length) {
                      <span class="block truncate text-[11px] text-amber-700">{{ servicesLabel(gardien) }}</span>
                    }
                  </span>
                  @if (services(gardien).length) {
                    <span class="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">En service</span>
                  } @else {
                    <span class="shrink-0 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Libre</span>
                  }
                </button>
              </li>
            } @empty {
              <li class="px-3 py-4 text-center text-sm text-neutral-500">Aucun gardien trouvé.</li>
            }
          </ul>
        </div>
      }
    </div>
  `
})
export class GardienPickerComponent {
  @Input() gardiens: Gardien[] = [];
  @Input() selectedId = '';
  // Affectations en cours (information sur les services déjà occupés)
  @Input() enCours: Affectation[] = [];
  // Gardien à ne pas proposer (ex. le gardien remplacé)
  @Input() exclureId = '';
  @Input() placeholder = 'Sélectionner un gardien';
  @Output() selectedIdChange = new EventEmitter<string>();

  open = false;
  term = '';

  get selected(): Gardien | undefined {
    return this.gardiens.find((g) => g._id === this.selectedId);
  }

  get filtered(): Gardien[] {
    const term = this.term.trim().toLowerCase();
    return this.gardiens.filter((g) =>
      g._id !== this.exclureId && (!term || `${nomComplet(g)} ${g.matricule}`.toLowerCase().includes(term))
    );
  }

  nom(gardien: Gardien): string {
    return nomComplet(gardien);
  }

  services(gardien: Gardien): Affectation[] {
    return this.enCours.filter((a) => a.gardien?._id === gardien._id);
  }

  servicesLabel(gardien: Gardien): string {
    return this.services(gardien)
      .map((a) => `${a.propriete?.nomReference || 'une propriété'} (${horaireLabel(a.heureDebut, a.heureFin)})`)
      .join(', ');
  }

  toggle(): void {
    this.open = !this.open;
    this.term = '';
  }

  select(gardien: Gardien): void {
    this.selectedIdChange.emit(gardien._id);
    this.open = false;
  }
}
