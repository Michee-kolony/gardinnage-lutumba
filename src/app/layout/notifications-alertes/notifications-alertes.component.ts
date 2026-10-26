import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { ChatService, EvenementMessage, roleChat } from '../../core/chat.service';
import { NotificationsService } from '../../core/notifications.service';
import { Rapport } from '../../core/rapports.service';

interface Toast {
  id: number;
  type: 'rapport' | 'message';
  titre: string;
  sousTitre: string;
  contenu: string;
  photo: string;
  initiales: string;
  lien: { chemin: string; params: Record<string, string> };
}

const DUREE_TOAST_MS = 8000;

// Notifications globales de l'espace admin : son + pop-up (photo et message) à chaque nouveau
// rapport d'un gardien et à chaque nouveau message reçu. Si l'onglet est en arrière-plan,
// une notification native du système est aussi affichée.
@Component({
  selector: 'app-notifications-alertes',
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 z-[1200] flex w-[calc(100%-2rem)] max-w-sm flex-col-reverse gap-2">
      @for (toast of toasts; track toast.id) {
        <div class="pointer-events-auto flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl animate-[toast-in_0.2s_ease-out]">
          <button type="button" (click)="ouvrir(toast)" class="flex min-w-0 flex-1 items-start gap-3 text-left">
            @if (toast.photo) {
              <img [src]="toast.photo" alt="" class="h-11 w-11 shrink-0 rounded-full border border-neutral-200 object-cover" />
            } @else {
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-neutral-900 text-sm font-semibold text-white">{{ toast.initiales }}</span>
            }
            <span class="min-w-0">
              <span class="flex items-center gap-1.5">
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  [ngClass]="toast.type === 'rapport' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'">
                  {{ toast.type === 'rapport' ? 'Rapport' : 'Message' }}
                </span>
                <span class="truncate text-sm font-semibold text-black">{{ toast.titre }}</span>
              </span>
              @if (toast.sousTitre) {
                <span class="mt-0.5 block truncate text-xs text-neutral-500">{{ toast.sousTitre }}</span>
              }
              <span class="mt-1 block text-sm text-neutral-700 line-clamp-3 break-words">{{ toast.contenu }}</span>
            </span>
          </button>
          <button type="button" (click)="fermer(toast.id)" aria-label="Fermer la notification" class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-black">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 fill-none stroke-current stroke-2"><path stroke-linecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      }
    </div>
  `
})
export class NotificationsAlertesComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];

  private compteur = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private subscriptions = new Subscription();

  constructor(
    private chat: ChatService,
    private notifications: NotificationsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.chat.nouveauRapport$.subscribe((rapport) => this.surRapport(rapport)));
    this.subscriptions.add(this.chat.nouveauMessage$.subscribe((evenement) => this.surMessage(evenement)));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.timers.forEach((t) => clearTimeout(t));
  }

  ouvrir(toast: Toast): void {
    this.fermer(toast.id);
    this.router.navigate([toast.lien.chemin], { queryParams: toast.lien.params });
  }

  fermer(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  private surRapport(rapport: Rapport): void {
    const gardien = rapport.gardien;
    const nom = gardien ? [gardien.prenom, gardien.nom, gardien.postnom].filter(Boolean).join(' ') : 'Gardien supprimé';
    this.afficher({
      type: 'rapport',
      titre: nom,
      sousTitre: [rapport.objetLibelle, rapport.propriete?.nomReference].filter(Boolean).join(' · '),
      contenu: rapport.description,
      photo: gardien?.photoProfil ?? '',
      initiales: this.initiales(nom),
      lien: { chemin: '/admin/rapports', params: { id: rapport._id } }
    }, `rapport-${rapport._id}`, `Nouveau rapport de ${nom}`);
  }

  private surMessage(evenement: EvenementMessage): void {
    const message = evenement.message;
    const monId = this.chat.monId;
    if (message.auteur === monId || message.supprime) return;

    // Super admin : il reçoit aussi les discussions privées des autres au titre de la supervision.
    // On ne notifie que les discussions dont l'admin fait partie.
    if (evenement.type === 'directe' && evenement.participants && !evenement.participants.includes(monId)) return;

    // Discussion déjà affichée à l'écran : pas de notification
    if (evenement.conversation === this.chat.conversationOuverte && this.notifications.pageVisible) return;

    const contenu = message.contenu?.trim()
      || (message.photos.length > 1 ? `📷 ${message.photos.length} photos` : '📷 Photo');
    this.afficher({
      type: 'message',
      titre: message.auteurNom,
      sousTitre: roleChat(message.auteurRole),
      contenu,
      photo: message.auteurPhoto,
      initiales: this.initiales(message.auteurNom),
      lien: { chemin: '/admin/messagerie', params: { conversation: evenement.conversation } }
    }, `conversation-${evenement.conversation}`, `Nouveau message de ${message.auteurNom}`);
  }

  private afficher(donnees: Omit<Toast, 'id'>, tag: string, titreSysteme: string): void {
    if (!this.authService.getToken()) return;

    const id = ++this.compteur;
    const toast: Toast = { id, ...donnees };
    this.toasts = [toast, ...this.toasts].slice(0, 4);
    this.timers.set(id, setTimeout(() => this.fermer(id), DUREE_TOAST_MS));
    this.notifications.jouerSon(donnees.type);

    if (!this.notifications.pageVisible) {
      this.notifications.notifierSysteme(titreSysteme, donnees.contenu, donnees.photo, tag, () => this.ouvrir(toast));
    }
  }

  private initiales(nom: string): string {
    return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('') || '?';
  }
}
