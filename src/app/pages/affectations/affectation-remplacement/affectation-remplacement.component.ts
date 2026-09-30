import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

import {
  Affectation,
  AffectationsService,
  heureLabel,
  nomComplet,
  roleLabel
} from '../../../core/affectations.service';
import { Gardien, GardiensService } from '../../../core/gardiens.service';
import { formatDateCourte } from '../../../core/proprietes.service';

// Remplacer le gardien d'une affectation : l'ancien est retiré immédiatement,
// le nouveau reprend le même rôle, les mêmes horaires et jours jusqu'à la fin prévue.
@Component({
  selector: 'app-affectation-remplacement',
  template: `
    <div class="fixed inset-0 z-[60] grid items-end bg-black/55 p-0 sm:items-center sm:p-5 animate-[fade-in_0.15s_ease-out]" (click)="close()">
      <section class="mx-auto max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:rounded-xl animate-[modal-pop_0.2s_ease-out]" role="dialog" aria-modal="true" aria-labelledby="remplacement-title" (click)="$event.stopPropagation()">
        <div class="px-5 pt-6 sm:px-6">
          <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">{{ proprieteNom }}</p>
          <h2 id="remplacement-title" class="font-serif text-xl font-medium text-black">Remplacer le gardien</h2>

          <!-- Gardien actuel -->
          <div class="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p class="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Gardien actuel</p>
            <div class="flex items-center gap-3">
              <app-affectation-avatar [src]="affectation.gardien?.photoProfil" [nom]="gardienNom" taille="h-12 w-12"></app-affectation-avatar>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-black truncate">{{ gardienNom }} <span class="font-normal text-neutral-500">· {{ role }}</span></p>
                <div class="mt-1"><app-affectation-horaire [heureDebut]="affectation.heureDebut" [heureFin]="affectation.heureFin" [joursService]="affectation.joursService"></app-affectation-horaire></div>
                <p class="mt-1 text-xs text-neutral-500">Fin prévue le {{ finPrevue }}</p>
              </div>
            </div>
          </div>

          <p class="mt-4 mb-1.5 text-xs font-semibold text-neutral-700">Nouveau gardien <b class="text-red-700">*</b></p>
          @if (chargement) {
            <p class="flex items-center gap-2 text-sm text-neutral-500"><span class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-black"></span> Chargement des gardiens...</p>
          } @else {
            <app-gardien-picker [gardiens]="gardiens" [(selectedId)]="nouveauGardienId" [enCours]="enCours" [exclureId]="affectation.gardien?._id || ''"></app-gardien-picker>
          }

          <label class="mt-4 grid gap-1.5">
            <span class="text-xs font-semibold text-neutral-700">Motif <span class="font-normal text-neutral-400">(facultatif — par défaut « Remplacé par … »)</span></span>
            <input type="text" [value]="motif" (input)="motif = $any($event.target).value" placeholder="Ex. congé, maladie..."
              class="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10" />
          </label>

          @if (nouveauGardien; as gardien) {
            <p class="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800">
              <span class="font-semibold">{{ nom(gardien) }}</span> reprendra le rôle <span class="font-semibold">{{ role | lowercase }}</span>,
              de {{ heureDebut }} à {{ heureFin }}, jusqu’au {{ finPrevue }}.
            </p>
          }
          @if (error) { <p class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">{{ error }}</p> }
        </div>
        <footer class="mt-6 flex flex-col-reverse gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end sm:rounded-b-xl sm:px-6">
          <button type="button" (click)="close()" [disabled]="running" class="min-h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50">Annuler</button>
          <button type="button" (click)="confirm()" [disabled]="running || !nouveauGardienId" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">
            @if (running) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> Remplacement... } @else { Remplacer }
          </button>
        </footer>
      </section>
    </div>
  `
})
export class AffectationRemplacementComponent implements OnInit {
  @Input({ required: true }) affectation!: Affectation;
  @Output() done = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  gardiens: Gardien[] = [];
  enCours: Affectation[] = [];
  chargement = true;
  nouveauGardienId = '';
  motif = '';
  running = false;
  error = '';

  constructor(private affectationsService: AffectationsService, private gardiensService: GardiensService) {}

  ngOnInit(): void {
    this.gardiensService.list().subscribe({
      next: (res) => { this.gardiens = res.gardiens; this.chargement = false; },
      error: (err: HttpErrorResponse) => { this.error = err.error?.message || 'Impossible de charger les gardiens.'; this.chargement = false; }
    });
    this.affectationsService.list({ statut: 'en cours' }).subscribe({
      next: (res) => (this.enCours = res.affectations),
      error: () => (this.enCours = [])
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  get gardienNom(): string {
    return nomComplet(this.affectation.gardien);
  }

  get proprieteNom(): string {
    return this.affectation.propriete?.nomReference || 'Propriété';
  }

  get role(): string {
    return roleLabel(this.affectation.role);
  }

  get heureDebut(): string {
    return heureLabel(this.affectation.heureDebut) || '—';
  }

  get heureFin(): string {
    return heureLabel(this.affectation.heureFin) || '—';
  }

  get finPrevue(): string {
    return formatDateCourte(this.affectation.dateFin);
  }

  get nouveauGardien(): Gardien | undefined {
    return this.gardiens.find((g) => g._id === this.nouveauGardienId);
  }

  nom(gardien: Gardien): string {
    return nomComplet(gardien);
  }

  close(): void {
    if (!this.running) {
      this.closed.emit();
    }
  }

  confirm(): void {
    if (this.running || !this.nouveauGardienId) {
      return;
    }
    this.running = true;
    this.error = '';
    this.affectationsService.remplacer(this.affectation._id, this.nouveauGardienId, this.motif.trim()).subscribe({
      next: () => {
        this.running = false;
        this.done.emit();
        this.closed.emit();
      },
      // 409 : le nouveau gardien a déjà un service qui se croise → message du serveur, choix conservé
      error: (err: HttpErrorResponse) => {
        this.running = false;
        this.error = err.error?.message || 'Impossible de remplacer ce gardien.';
      }
    });
  }
}
