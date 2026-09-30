import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import { nomComplet, roleLabel } from '../../../core/affectations.service';
import {
  PositionPointage,
  Presence,
  clotureLabel,
  dateLocale,
  dureeMinutesLabel,
  heureLocale,
  jourLabel,
  lienGoogleMaps,
  statutPresenceBadgeClass,
  statutPresenceLabel
} from '../../../core/presences.service';

// Détail d'un service pointé : horaires prévus / réels, retard, durée, positions GPS
// (liens Google Maps) et distance à la propriété — toutes valeurs calculées par le serveur.
@Component({
  selector: 'app-presence-detail',
  template: `
    <div class="fixed inset-0 z-50 grid items-end bg-black/55 p-0 sm:items-center sm:p-5 animate-[fade-in_0.15s_ease-out]" (click)="closed.emit()">
      <section class="mx-auto max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:rounded-xl animate-[modal-pop_0.2s_ease-out]" role="dialog" aria-modal="true" aria-labelledby="presence-detail-title" (click)="$event.stopPropagation()">
        <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Service du {{ jour(presence.jourService) }}</p>
            <h2 id="presence-detail-title" class="font-serif text-xl font-medium text-black">Détail du service</h2>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" [ngClass]="statutBadge">{{ statut }}</span>
              @if (presence.enRetard) {
                <span class="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">Retard {{ presence.retardMinutes }} min</span>
              }
              @if (horsZone) {
                <span class="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Hors zone</span>
              }
            </div>
          </div>
          <button type="button" (click)="closed.emit()" aria-label="Fermer" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 hover:text-black">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 fill-none stroke-current stroke-2"><path stroke-linecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div class="space-y-4 px-5 py-5 sm:px-6">
          <div class="flex items-center gap-3">
            <app-affectation-avatar [src]="presence.gardien?.photoProfil" [nom]="nom(presence.gardien)" taille="h-12 w-12"></app-affectation-avatar>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-black">{{ nom(presence.gardien) }}</p>
              <p class="text-xs text-neutral-500">{{ presence.gardien?.matricule }}@if (presence.gardien?.telephonePrincipal) { · {{ presence.gardien?.telephonePrincipal }}}</p>
              @if (presence.affectation) { <p class="text-xs text-neutral-500">{{ role }}</p> }
            </div>
          </div>
          <div class="flex items-center gap-3">
            <app-affectation-avatar [src]="presence.propriete?.photos?.[0]" [nom]="presence.propriete?.nomReference || ''" [avecInitiales]="false" taille="h-12 w-12" forme="rounded-lg"></app-affectation-avatar>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-black">{{ presence.propriete?.nomReference || 'Propriété supprimée' }}</p>
              <p class="text-xs text-neutral-500">{{ adresse }}</p>
              @if (presence.propriete?.proprietaire) {
                <p class="text-xs text-neutral-500">Propriétaire : {{ nom(presence.propriete?.proprietaire, '') }}@if (presence.propriete?.proprietaire?.telephone) { · {{ presence.propriete?.proprietaire?.telephone }}}</p>
              }
            </div>
          </div>

          <dl class="divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-3">
            <div class="flex justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Horaire prévu</dt><dd class="text-right text-xs font-semibold text-neutral-800">{{ date(presence.debutPrevu) }} {{ heure(presence.debutPrevu) }} → {{ date(presence.finPrevue) }} {{ heure(presence.finPrevue) }}</dd></div>
            <div class="flex justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Arrivée</dt><dd class="text-right text-xs font-semibold text-neutral-800">{{ date(presence.heureArrivee) }} {{ heure(presence.heureArrivee) }}@if (presence.retardMinutes > 0) { <span class="font-normal text-neutral-500"> ({{ presence.retardMinutes }} min de retard)</span>}</dd></div>
            <div class="flex justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Départ</dt><dd class="text-right text-xs font-semibold text-neutral-800">@if (presence.heureDepart) { {{ date(presence.heureDepart) }} {{ heure(presence.heureDepart) }}@if (presence.departAnticipeMinutes) { <span class="font-normal text-neutral-500"> ({{ presence.departAnticipeMinutes }} min avant la fin)</span>} } @else { — }</dd></div>
            <div class="flex justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Durée</dt><dd class="text-right text-xs font-semibold text-neutral-800">{{ duree }}</dd></div>
            <div class="flex justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Clôture</dt><dd class="text-right text-xs font-semibold text-neutral-800">{{ cloture }}@if (cloturePar) { <span class="font-normal text-neutral-500"> par {{ cloturePar }}</span>}</dd></div>
            @if (presence.commentaire) {
              <div class="flex justify-between gap-4 py-2.5"><dt class="text-xs text-neutral-500">Commentaire</dt><dd class="max-w-[65%] whitespace-pre-wrap text-right text-xs text-neutral-800">{{ presence.commentaire }}</dd></div>
            }
          </dl>

          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Positions</p>
            @for (ligne of positions; track ligne.label) {
              <div class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5" [ngClass]="ligne.position?.horsZone ? 'border-red-200 bg-red-50' : 'border-neutral-200'">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-black">{{ ligne.label }}</p>
                  <p class="text-xs text-neutral-500">
                    @if (ligne.position) {
                      @if (ligne.position.distanceMetres !== null) { À {{ ligne.position.distanceMetres }} m de la propriété } @else { Distance inconnue (propriété sans GPS) }
                      @if (ligne.position.precision !== null) { · précision {{ ligne.position.precision }} m }
                      @if (ligne.position.horsZone) { · <span class="font-medium text-red-700">hors zone</span> }
                    } @else if (ligne.lien) {
                      Coordonnées de la propriété
                    } @else {
                      Non disponible
                    }
                  </p>
                </div>
                @if (ligne.lien) {
                  <a [href]="ligne.lien" target="_blank" rel="noopener" class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-black transition hover:border-black">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    Carte
                  </a>
                }
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `
})
export class PresenceDetailComponent {
  @Input({ required: true }) presence!: Presence;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closed.emit();
  }

  get statut(): string {
    return statutPresenceLabel(this.presence.statut);
  }

  get statutBadge(): string {
    return statutPresenceBadgeClass(this.presence.statut);
  }

  get horsZone(): boolean {
    return !!(this.presence.positionArrivee?.horsZone || this.presence.positionDepart?.horsZone);
  }

  get role(): string {
    return this.presence.affectation ? roleLabel(this.presence.affectation.role) : '';
  }

  get duree(): string {
    return dureeMinutesLabel(this.presence.dureeMinutes);
  }

  get cloture(): string {
    return clotureLabel(this.presence.cloture);
  }

  get cloturePar(): string {
    const par = this.presence.cloturePar;
    return par && typeof par === 'object' ? par.nom : '';
  }

  get adresse(): string {
    const p = this.presence.propriete;
    if (!p) return '';
    return [[p.avenue, p.numero].filter(Boolean).join(' '), p.quartier, p.commune].filter(Boolean).join(', ');
  }

  get positions(): { label: string; position: PositionPointage | null; lien: string }[] {
    const coord = this.presence.propriete?.coordonnees;
    return [
      { label: 'Arrivée', position: this.presence.positionArrivee, lien: lienGoogleMaps(this.presence.positionArrivee?.lat, this.presence.positionArrivee?.lng) },
      { label: 'Départ', position: this.presence.positionDepart, lien: lienGoogleMaps(this.presence.positionDepart?.lat, this.presence.positionDepart?.lng) },
      { label: 'Propriété', position: null, lien: lienGoogleMaps(coord?.lat, coord?.lng) }
    ];
  }

  jour(value: string): string {
    return jourLabel(value);
  }

  date(value: string | null): string {
    return dateLocale(value);
  }

  heure(value: string | null): string {
    return heureLocale(value);
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined, defaut = 'Gardien supprimé'): string {
    return nomComplet(personne, defaut);
  }
}
