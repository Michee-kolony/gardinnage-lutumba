import { Component, Input, OnChanges } from '@angular/core';

// Photo d'un gardien ou d'une propriété (URL publique) ; initiales ou icône
// par défaut quand l'URL est vide ou que l'image ne charge pas.
@Component({
  selector: 'app-affectation-avatar',
  template: `
    @if (src && !erreur) {
      <img [src]="src" [alt]="nom" (error)="erreur = true" [class]="'object-cover border border-neutral-200 shrink-0 ' + taille + ' ' + forme" />
    } @else {
      <span [class]="'flex items-center justify-center bg-neutral-100 border border-neutral-200 text-neutral-500 font-semibold uppercase shrink-0 ' + taille + ' ' + forme" [attr.aria-label]="nom">
        @if (initiales) {
          <span class="text-xs">{{ initiales }}</span>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" style="width:45%;height:45%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
          </svg>
        }
      </span>
    }
  `
})
export class AffectationAvatarComponent implements OnChanges {
  @Input() src: string | null | undefined = '';
  @Input() nom = '';
  // Initiales affichées par défaut (gardien) ; sinon icône maison (propriété)
  @Input() avecInitiales = true;
  @Input() taille = 'h-10 w-10';
  @Input() forme = 'rounded-full';

  erreur = false;

  ngOnChanges(): void {
    this.erreur = false;
  }

  get initiales(): string {
    if (!this.avecInitiales) {
      return '';
    }
    return this.nom
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((mot) => mot.charAt(0))
      .join('');
  }
}
