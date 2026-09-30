import { Component, Input } from '@angular/core';

import { Affectation, nomComplet } from '../../../core/affectations.service';
import { formatDateCourte } from '../../../core/proprietes.service';

// Traçabilité d'une affectation : « Retiré le … par … — motif »,
// « Remplacé par <photo + nom> », « A remplacé <photo + nom> ».
@Component({
  selector: 'app-affectation-suivi',
  template: `
    @if (affectation.retireLe) {
      <p class="text-[11px] text-neutral-600">
        Retiré le {{ date(affectation.retireLe) }}@if (affectation.retirePar) { par {{ affectation.retirePar.nom }}}@if (affectation.motifRetrait) { — {{ affectation.motifRetrait }}}
      </p>
    }
    @if (affectation.remplacePar; as lien) {
      <p class="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-600">
        Remplacé par
        <app-affectation-avatar [src]="lien.gardien?.photoProfil" [nom]="nom(lien.gardien)" taille="h-5 w-5"></app-affectation-avatar>
        <span class="font-medium text-black">{{ nom(lien.gardien) }}</span>
      </p>
    }
    @if (affectation.remplace; as lien) {
      <p class="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-600">
        A remplacé
        <app-affectation-avatar [src]="lien.gardien?.photoProfil" [nom]="nom(lien.gardien)" taille="h-5 w-5"></app-affectation-avatar>
        <span class="font-medium text-black">{{ nom(lien.gardien) }}</span>
      </p>
    }
  `
})
export class AffectationSuiviComponent {
  @Input({ required: true }) affectation!: Affectation;

  date(value: string | null): string {
    return formatDateCourte(value);
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null): string {
    return nomComplet(personne);
  }
}
