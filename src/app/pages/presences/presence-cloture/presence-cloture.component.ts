import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

import { nomComplet } from '../../../core/affectations.service';
import { Presence, PresencesService, heureLocale, jourLabel } from '../../../core/presences.service';

// Clôturer un service à la place du gardien (oubli de pointage de fin).
// La durée et le statut sont recalculés par le serveur.
@Component({
  selector: 'app-presence-cloture',
  template: `
    <div class="fixed inset-0 z-[60] grid items-end bg-black/55 p-0 sm:items-center sm:p-5 animate-[fade-in_0.15s_ease-out]" (click)="close()">
      <section class="mx-auto w-full max-w-md rounded-t-xl bg-white shadow-2xl sm:rounded-xl animate-[modal-pop_0.2s_ease-out]" role="dialog" aria-modal="true" aria-labelledby="cloture-title" (click)="$event.stopPropagation()">
        <div class="px-5 pt-6 sm:px-6">
          <div class="mb-4 flex items-center gap-3">
            <app-affectation-avatar [src]="presence.gardien?.photoProfil" [nom]="gardienNom" taille="h-11 w-11"></app-affectation-avatar>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-black">{{ gardienNom }}</p>
              <p class="truncate text-xs text-neutral-500">{{ presence.propriete?.nomReference }} · service du {{ jour }}</p>
            </div>
          </div>
          <h2 id="cloture-title" class="font-serif text-xl font-medium text-black">Clôturer le service</h2>
          <p class="mt-2 text-sm text-neutral-600">Arrivée à {{ arrivee }}, fin prévue à {{ finPrevue }}. Indiquez l’heure de départ réelle si vous la connaissez.</p>

          <label class="mt-4 grid gap-1.5">
            <span class="text-xs font-semibold text-neutral-700">Heure de départ</span>
            <input type="datetime-local" [value]="heureDepart" (input)="heureDepart = $any($event.target).value"
              class="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
            <span class="text-[11px] text-neutral-500">Par défaut : l’heure de fin prévue.</span>
          </label>
          <label class="mt-3 grid gap-1.5">
            <span class="text-xs font-semibold text-neutral-700">Commentaire <span class="font-normal text-neutral-400">(facultatif)</span></span>
            <textarea [value]="commentaire" (input)="commentaire = $any($event.target).value" rows="2" placeholder="Ex. oubli de pointage, confirmé par téléphone"
              class="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10"></textarea>
          </label>
          @if (error) { <p class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">{{ error }}</p> }
        </div>
        <footer class="mt-6 flex flex-col-reverse gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end sm:rounded-b-xl sm:px-6">
          <button type="button" (click)="close()" [disabled]="running" class="min-h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50">Annuler</button>
          <button type="button" (click)="confirm()" [disabled]="running" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">
            @if (running) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> Clôture... } @else { Clôturer }
          </button>
        </footer>
      </section>
    </div>
  `
})
export class PresenceClotureComponent implements OnInit {
  @Input({ required: true }) presence!: Presence;
  @Output() done = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  // 'AAAA-MM-JJTHH:mm' en heure locale
  heureDepart = '';
  commentaire = '';
  running = false;
  error = '';

  constructor(private presencesService: PresencesService) {}

  ngOnInit(): void {
    this.heureDepart = this.toInputValue(this.presence.finPrevue);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  get gardienNom(): string {
    return nomComplet(this.presence.gardien);
  }

  get jour(): string {
    return jourLabel(this.presence.jourService);
  }

  get arrivee(): string {
    return heureLocale(this.presence.heureArrivee);
  }

  get finPrevue(): string {
    return heureLocale(this.presence.finPrevue);
  }

  close(): void {
    if (!this.running) {
      this.closed.emit();
    }
  }

  confirm(): void {
    if (this.running) {
      return;
    }
    const depart = this.heureDepart ? new Date(this.heureDepart) : null;
    this.running = true;
    this.error = '';
    this.presencesService.cloturer(this.presence._id, {
      ...(depart && !Number.isNaN(depart.getTime()) ? { heureDepart: depart.toISOString() } : {}),
      ...(this.commentaire.trim() ? { commentaire: this.commentaire.trim() } : {})
    }).subscribe({
      next: () => {
        this.running = false;
        this.done.emit();
        this.closed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.running = false;
        this.error = err.error?.message || 'Impossible de clôturer ce service.';
      }
    });
  }

  private toInputValue(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}
