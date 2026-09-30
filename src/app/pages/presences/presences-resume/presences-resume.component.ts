import { Component, Input } from '@angular/core';

import { TotauxPresence } from '../../../core/presences.service';

// Cartes du rapport de présence (valeurs calculées par le serveur)
@Component({
  selector: 'app-presences-resume',
  template: `
    <div class="grid grid-cols-2 gap-3" [ngClass]="compact ? 'lg:grid-cols-4' : 'sm:grid-cols-3 xl:grid-cols-7'">
      <article class="rounded-lg border border-neutral-200 border-l-[3px] border-l-black bg-white p-3.5 shadow-sm">
        <span class="text-xs font-semibold text-neutral-600">Présences</span>
        <strong class="mt-1.5 block text-xl font-bold tabular-nums text-black">{{ totaux.presences }}</strong>
      </article>
      <article class="rounded-lg border border-neutral-200 border-l-[3px] border-l-red-500 bg-white p-3.5 shadow-sm">
        <span class="text-xs font-semibold text-neutral-600">Absences</span>
        <strong class="mt-1.5 block text-xl font-bold tabular-nums text-black">{{ totaux.absences }}</strong>
        @if (totaux.pasEncoreArrives) { <span class="text-[11px] text-orange-700">+ {{ totaux.pasEncoreArrives }} pas encore arrivé(s)</span> }
      </article>
      <article class="rounded-lg border border-neutral-200 border-l-[3px] border-l-orange-400 bg-white p-3.5 shadow-sm">
        <span class="text-xs font-semibold text-neutral-600">Retards</span>
        <strong class="mt-1.5 block text-xl font-bold tabular-nums text-black">{{ totaux.retards }}</strong>
        <span class="text-[11px] text-neutral-500">{{ totaux.minutesRetard }} min cumulées</span>
      </article>
      <article class="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-sm">
        <span class="text-xs font-semibold text-neutral-600">Heures travaillées</span>
        <strong class="mt-1.5 block text-xl font-bold tabular-nums text-black">{{ heures }}</strong>
      </article>
      <article class="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-sm">
        <span class="text-xs font-semibold text-neutral-600">Taux de présence</span>
        <strong class="mt-1.5 block text-xl font-bold tabular-nums text-black">{{ totaux.tauxPresence === null ? '—' : totaux.tauxPresence + ' %' }}</strong>
      </article>
      <article class="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-sm">
        <span class="text-xs font-semibold text-neutral-600">Non clôturés</span>
        <strong class="mt-1.5 block text-xl font-bold tabular-nums text-black">{{ totaux.nonClotures }}</strong>
      </article>
      <article class="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-sm">
        <span class="text-xs font-semibold text-neutral-600">Hors zone</span>
        <strong class="mt-1.5 block text-xl font-bold tabular-nums text-black">{{ totaux.horsZone }}</strong>
      </article>
    </div>
  `
})
export class PresencesResumeComponent {
  @Input({ required: true }) totaux!: TotauxPresence;
  @Input() compact = false;

  get heures(): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(this.totaux.heuresTravaillees)} h`;
  }
}
