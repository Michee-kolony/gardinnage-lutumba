import { Component, Input } from '@angular/core';

import { JOURS_SERVICE, JourService, horaireLabel, passeMinuit } from '../../../core/affectations.service';

// Horaire « 18h00 → 06h00 » (icône lune si le service passe minuit) et jours de
// service en abrégé (L M M J V S D, jours actifs mis en avant ; « Tous les jours » si 7).
@Component({
  selector: 'app-affectation-horaire',
  template: `
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span class="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-800 whitespace-nowrap">
        @if (nuit) {
          <svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5 fill-none stroke-current stroke-2 text-indigo-600"><path stroke-linecap="round" stroke-linejoin="round" d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>
        } @else {
          <svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5 fill-none stroke-current stroke-2 text-neutral-500"><circle cx="12" cy="12" r="8.5" /><path stroke-linecap="round" d="M12 7.5V12l3 2" /></svg>
        }
        {{ horaire }}
      </span>
      @if (tousLesJours) {
        <span class="text-xs text-neutral-600">Tous les jours</span>
      } @else {
        <span class="inline-flex items-center gap-0.5" [attr.aria-label]="'Jours : ' + (joursService || []).join(', ')">
          @for (jour of semaine; track $index) {
            <span
              class="grid h-5 w-5 place-items-center rounded text-[10px] font-semibold"
              [ngClass]="actif(jour) ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-400'"
              [title]="jour"
            >{{ jour.charAt(0).toUpperCase() }}</span>
          }
        </span>
      }
    </div>
  `
})
export class AffectationHoraireComponent {
  @Input() heureDebut: string | null = null;
  @Input() heureFin: string | null = null;
  @Input() joursService: JourService[] | null = [];

  readonly semaine = JOURS_SERVICE;

  get horaire(): string {
    return horaireLabel(this.heureDebut, this.heureFin);
  }

  get nuit(): boolean {
    return passeMinuit(this.heureDebut, this.heureFin) && this.heureDebut !== this.heureFin;
  }

  get tousLesJours(): boolean {
    return !this.joursService?.length || this.joursService.length === 7;
  }

  actif(jour: JourService): boolean {
    return !!this.joursService?.includes(jour);
  }
}
