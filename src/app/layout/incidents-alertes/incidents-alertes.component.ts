import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Incident, IncidentsService, adresseProprieteIncident, dateHeureIncident } from '../../core/incidents.service';

interface Toast {
  id: number;
  incident: Incident;
}

const DUREE_TOAST_MS = 8000;

// Notifications globales de l'espace admin : toast + son à chaque nouvel incident,
// bannière rouge tant qu'un incident critique n'est pas pris en charge.
// Son abonnement à suivi$ maintient le suivi actif tant que l'admin est connecté.
@Component({
  selector: 'app-incidents-alertes',
  template: `
    @if (critiques.length > 0) {
      <div class="flex flex-col gap-2 border-b border-red-700 bg-red-600 px-4 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6" role="alert">
        <div class="flex min-w-0 items-center gap-3">
          <span class="relative flex h-3 w-3 shrink-0">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span class="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
          </span>
          <p class="min-w-0 truncate text-sm font-semibold">
            @if (critiques.length === 1) {
              Incident critique : {{ critiques[0].typeLibelle }} – {{ critiques[0].propriete?.nomReference || 'Propriété supprimée' }}
              <span class="font-normal opacity-90">· {{ dateHeure(critiques[0].dateIncident) }}</span>
            } @else {
              {{ critiques.length }} incidents critiques non pris en charge
            }
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          @if (erreur) { <span class="text-xs opacity-90">{{ erreur }}</span> }
          @if (critiques.length === 1) {
            <button type="button" (click)="voir(critiques[0])" class="h-8 rounded-md border border-white/60 px-3 text-xs font-semibold transition hover:bg-white/10">Voir</button>
            <button type="button" (click)="prendreEnCharge(critiques[0])" [disabled]="enCours" class="h-8 rounded-md bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60">Prendre en charge</button>
          } @else {
            <button type="button" (click)="voirCritiques()" class="h-8 rounded-md bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50">Voir les incidents</button>
          }
        </div>
      </div>
    }

    <div class="pointer-events-none fixed right-4 top-20 z-[1200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      @for (toast of toasts; track toast.id) {
        <div class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3 shadow-xl animate-[toast-in_0.2s_ease-out]"
          [ngClass]="toast.incident.gravite === 'critique' ? 'border-red-300 ring-2 ring-red-500/40' : 'border-neutral-200'">
          <button type="button" (click)="ouvrirToast(toast)" class="flex min-w-0 flex-1 items-start gap-3 text-left">
            <app-incident-icone [type]="toast.incident.type" [gravite]="toast.incident.gravite"></app-incident-icone>
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-black">Nouvel incident : {{ toast.incident.typeLibelle }}</span>
              <span class="block truncate text-xs text-neutral-600">{{ toast.incident.propriete?.nomReference || 'Propriété supprimée' }}@if (adresse(toast.incident)) { · {{ adresse(toast.incident) }}}</span>
              <span class="mt-0.5 block text-[11px] text-neutral-400">{{ toast.incident.graviteLibelle }} · {{ dateHeure(toast.incident.dateIncident) }}</span>
            </span>
          </button>
          <button type="button" (click)="fermerToast(toast.id)" aria-label="Fermer la notification" class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-black">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 fill-none stroke-current stroke-2"><path stroke-linecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      }
    </div>
  `
})
export class IncidentsAlertesComponent implements OnInit, OnDestroy {
  critiques: Incident[] = [];
  toasts: Toast[] = [];
  enCours = false;
  erreur = '';

  private compteur = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private subscriptions = new Subscription();
  private audioContext?: AudioContext;

  constructor(private incidentsService: IncidentsService, private router: Router) {}

  ngOnInit(): void {
    this.subscriptions.add(this.incidentsService.suivi$.subscribe());
    this.subscriptions.add(this.incidentsService.etat$.subscribe((etat) => {
      this.critiques = etat.nouveaux.filter((i) => i.gravite === 'critique');
    }));
    this.subscriptions.add(this.incidentsService.nouvelIncident$.subscribe((incident) => this.notifier(incident)));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.timers.forEach((t) => clearTimeout(t));
    this.audioContext?.close();
  }

  voir(incident: Incident): void {
    this.router.navigate(['/admin/incidents', incident._id]);
  }

  voirCritiques(): void {
    this.incidentsService.setFiltres({ ...this.incidentsService.filtres, gravite: 'critique', statut: 'nouveau' });
    this.router.navigate(['/admin/incidents']);
  }

  prendreEnCharge(incident: Incident): void {
    this.enCours = true;
    this.erreur = '';
    this.incidentsService.update(incident._id, { statut: 'en_cours' }).subscribe({
      next: () => (this.enCours = false),
      error: (err: HttpErrorResponse) => {
        this.erreur = err.error?.message || 'Échec de la prise en charge.';
        this.enCours = false;
      }
    });
  }

  ouvrirToast(toast: Toast): void {
    this.fermerToast(toast.id);
    this.voir(toast.incident);
  }

  fermerToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  dateHeure(iso: string): string {
    return dateHeureIncident(iso);
  }

  adresse(incident: Incident): string {
    return adresseProprieteIncident(incident.propriete);
  }

  private notifier(incident: Incident): void {
    const id = ++this.compteur;
    this.toasts = [{ id, incident }, ...this.toasts].slice(0, 4);
    this.timers.set(id, setTimeout(() => this.fermerToast(id), DUREE_TOAST_MS));
    this.jouerSon(incident.gravite === 'critique');
  }

  // Son discret généré par Web Audio (aucun fichier) ; trois bips pour un critique
  private jouerSon(critique: boolean): void {
    try {
      this.audioContext ??= new AudioContext();
      const ctx = this.audioContext;
      const frequences = critique ? [988, 740, 988] : [660, 880];
      frequences.forEach((frequence, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const debut = ctx.currentTime + index * 0.16;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequence, debut);
        gain.gain.setValueAtTime(0, debut);
        gain.gain.linearRampToValueAtTime(critique ? 0.22 : 0.12, debut + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, debut + 0.15);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(debut);
        oscillator.stop(debut + 0.17);
      });
    } catch {
      // Audio indisponible (autorisation navigateur) : la notification visuelle suffit
    }
  }
}
