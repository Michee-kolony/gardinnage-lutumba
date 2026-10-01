import { Component, Input } from '@angular/core';

import { iconeTypeIncident, styleGravite } from '../../../core/incidents.service';

// Pastille ronde : couleur = gravité, pictogramme = type (mêmes repères que les marqueurs de la carte)
@Component({
  selector: 'app-incident-icone',
  template: `
    <span [class]="'grid shrink-0 place-items-center rounded-full text-white shadow-sm ' + taille" [style.background]="couleur" [attr.aria-hidden]="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:55%;height:55%">
        <path [attr.d]="trace" />
      </svg>
    </span>
  `
})
export class IncidentIconeComponent {
  @Input() type = '';
  @Input() gravite = '';
  @Input() taille = 'h-9 w-9';

  get trace(): string {
    return iconeTypeIncident(this.type);
  }

  get couleur(): string {
    return styleGravite(this.gravite).couleur;
  }
}
