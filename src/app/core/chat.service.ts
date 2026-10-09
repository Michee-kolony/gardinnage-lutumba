import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject, debounceTime, map, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// =====================================================
// MODELES (renvoyés par /api/chat, voir backend controllers/chat.js)
// =====================================================

export type ModeleChat = 'Gardien' | 'Proprietaire' | 'Administrateur';

export interface PersonneChat {
  id: string | null;
  modele: ModeleChat;
  nom: string;
  role: string;
  photo: string;
  matricule?: string;
  roleAffectation?: string;
}

export interface Conversation {
  _id: string;
  type: 'propriete' | 'directe';
  typeLibelle: string;
  propriete: { _id: string; nomReference: string; commune?: string; quartier?: string; photos?: string[] } | null;
  // Rempli pour une discussion privée uniquement
  participants: PersonneChat[];
  interlocuteur?: PersonneChat | null;
  // Détail d'une discussion de propriété : propriétaire, gardiens en service, administration
  membres?: PersonneChat[];
  dernierMessage: { contenu: string; auteurNom: string; date: string | null };
  titre: string;
  photo: string;
  // "supervision" : super admin qui lit sans participer
  acces: 'membre' | 'supervision';
  peutEcrire: boolean;
  nonLus: number;
  lectures?: { utilisateur: string; date: string }[];
  // Supervision uniquement
  statistiques?: { messages: number; modifies: number; supprimes: number };
  createdAt: string;
  updatedAt: string;
}

export interface MessageChat {
  _id: string;
  // Recherche de la supervision : conversation peuplée
  conversation: string | { _id: string; type: 'propriete' | 'directe'; propriete?: { _id: string; nomReference: string } | null };
  auteur: string;
  auteurModele: ModeleChat;
  auteurNom: string;
  auteurRole: string;
  auteurPhoto: string;
  contenu: string;
  photos: string[];
  modifie: boolean;
  modifieLe: string | null;
  // Super admin uniquement : versions précédentes
  historique?: { contenu: string; remplaceLe: string }[];
  supprime: boolean;
  supprimeLe: string | null;
  modifiableJusqua: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageMessages {
  acces: 'membre' | 'supervision';
  messages: MessageChat[];
  plusAnciens: boolean;
  delaiModificationMinutes: number;
}

export interface EvenementMessage {
  conversation: string;
  message: MessageChat;
}

export interface EvenementLu {
  conversation: string;
  utilisateur: string;
  date: string;
}

export interface EvenementEcrit {
  conversation: string;
  utilisateur: { id: string; nom: string; modele: ModeleChat };
}

export interface FiltresSupervision {
  type?: 'propriete' | 'directe' | '';
  propriete?: string;
  participant?: string;
  page?: number;
  limite?: number;
}

export interface RechercheSupervision {
  q?: string;
  auteur?: string;
  conversation?: string;
  modifie?: boolean;
  supprime?: boolean;
  du?: string;
  au?: string;
  page?: number;
  limite?: number;
}

// Limites du backend (models/message.js)
export const CONTENU_MAX = 4000;
export const PHOTOS_MAX = 5;

const ROLES: Record<string, string> = {
  GARDIEN: 'Gardien',
  PROPRIETAIRE: 'Propriétaire',
  GESTIONNAIRE: 'Gestionnaire',
  MANDATAIRE: 'Mandataire',
  LOCATAIRE: 'Locataire',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super admin'
};

export function roleChat(role: string | null | undefined): string {
  return ROLES[role ?? ''] ?? '';
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly baseUrl = `${environment.apiUrl}/api/chat`;

  private socket: Socket | null = null;
  private readonly nonLusSubject = new BehaviorSubject<number>(0);
  private readonly recalculNonLus = new Subject<void>();

  readonly nonLus$ = this.nonLusSubject.asObservable();
  readonly nouveauMessage$ = new Subject<EvenementMessage>();
  readonly messageModifie$ = new Subject<EvenementMessage>();
  readonly messageSupprime$ = new Subject<EvenementMessage>();
  readonly lu$ = new Subject<EvenementLu>();
  readonly ecrit$ = new Subject<EvenementEcrit>();

  // Conversation affichée : ses nouveaux messages ne comptent pas comme non lus
  conversationOuverte: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService, private zone: NgZone) {
    this.recalculNonLus.pipe(debounceTime(500)).subscribe(() => this.rafraichirNonLus());
  }

  get monId(): string {
    return this.authService.getAdmin()?._id ?? '';
  }

  // =====================================================
  // TEMPS REEL : démarré par le layout de l'espace admin, arrêté à sa fermeture
  // =====================================================

  demarrer(): void {
    const token = this.authService.getToken();
    if (!token || this.socket) return;

    // Hors zone Angular : les relances de connexion ne déclenchent pas la détection de changements
    const socket = this.zone.runOutsideAngular(() =>
      io(environment.apiUrl, { auth: { token }, transports: ['websocket', 'polling'] })
    );
    this.socket = socket;

    const relayer = <T>(evenement: string, sujet: Subject<T>, apres?: (donnees: T) => void) => {
      socket.on(evenement, (donnees: T) => this.zone.run(() => {
        sujet.next(donnees);
        apres?.(donnees);
      }));
    };

    relayer<EvenementMessage>('message:nouveau', this.nouveauMessage$, (e) => {
      if (e.message.auteur !== this.monId && e.conversation !== this.conversationOuverte) this.recalculNonLus.next();
    });
    relayer<EvenementMessage>('message:modifie', this.messageModifie$);
    relayer<EvenementMessage>('message:supprime', this.messageSupprime$, () => this.recalculNonLus.next());
    relayer<EvenementLu>('conversation:lu', this.lu$);
    relayer<EvenementEcrit>('chat:ecrit', this.ecrit$);

    // Connexion (ou reconnexion après une coupure) : messages reçus entre-temps
    socket.on('connect', () => this.recalculNonLus.next());
  }

  arreter(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.nonLusSubject.next(0);
  }

  signalerEcriture(conversation: string): void {
    this.socket?.emit('chat:ecrit', { conversation });
  }

  // =====================================================
  // REST : /api/chat
  // =====================================================

  // Les administrateurs voient toutes les discussions de propriétés et leurs discussions privées
  conversations(): Observable<{ nonLus: number; conversations: Conversation[] }> {
    return this.http
      .get<{ success: boolean; nonLus: number; conversations: Conversation[] }>(`${this.baseUrl}/conversations`)
      .pipe(
        tap((res) => this.nonLusSubject.next(res.nonLus ?? 0)),
        map((res) => ({ nonLus: res.nonLus ?? 0, conversations: res.conversations }))
      );
  }

  // Autres administrateurs (les gardiens et propriétaires viennent de leurs propres listes)
  contacts(): Observable<PersonneChat[]> {
    return this.http
      .get<{ success: boolean; contacts: PersonneChat[] }>(`${this.baseUrl}/contacts`)
      .pipe(map((res) => res.contacts));
  }

  ouvrirPropriete(propriete: string): Observable<Conversation> {
    return this.ouvrir({ propriete });
  }

  ouvrirDirecte(destinataire: string, modele: ModeleChat): Observable<Conversation> {
    const destinataireModele = { Gardien: 'gardien', Proprietaire: 'proprietaire', Administrateur: 'admin' }[modele];
    return this.ouvrir({ destinataire, destinataireModele });
  }

  conversation(id: string): Observable<Conversation> {
    return this.http
      .get<{ success: boolean; conversation: Conversation }>(`${this.baseUrl}/conversations/${id}`)
      .pipe(map((res) => res.conversation));
  }

  // Sans "avant" : derniers messages, et la conversation est marquée comme lue (membre)
  messages(id: string, avant?: string): Observable<PageMessages> {
    let params = new HttpParams();
    if (avant) params = params.set('avant', avant);
    return this.http
      .get<{ success: boolean } & PageMessages>(`${this.baseUrl}/conversations/${id}/messages`, { params })
      .pipe(tap(() => !avant && this.recalculNonLus.next()));
  }

  envoyer(id: string, contenu: string, photos: File[]): Observable<MessageChat> {
    const form = new FormData();
    if (contenu.trim()) form.append('contenu', contenu.trim());
    photos.forEach((f) => form.append('photos', f, f.name));
    return this.http
      .post<{ success: boolean; message: MessageChat }>(`${this.baseUrl}/conversations/${id}/messages`, form)
      .pipe(map((res) => res.message));
  }

  marquerLu(id: string): void {
    this.http.post(`${this.baseUrl}/conversations/${id}/lu`, {}).subscribe({
      next: () => this.recalculNonLus.next(),
      error: () => undefined
    });
  }

  modifier(messageId: string, contenu: string): Observable<MessageChat> {
    return this.http
      .patch<{ success: boolean; message: MessageChat }>(`${this.baseUrl}/messages/${messageId}`, { contenu })
      .pipe(map((res) => res.message));
  }

  supprimer(messageId: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/messages/${messageId}`);
  }

  // Le message est-il encore modifiable par moi ?
  modifiable(message: MessageChat): boolean {
    return message.auteur === this.monId && !message.supprime && !!message.modifiableJusqua
      && Date.now() < new Date(message.modifiableJusqua).getTime();
  }

  // =====================================================
  // SUPERVISION (super admin)
  // =====================================================

  supervisionConversations(filtres: FiltresSupervision = {}): Observable<{ total: number; page: number; limite: number; conversations: Conversation[] }> {
    return this.http.get<{ success: boolean; total: number; page: number; limite: number; conversations: Conversation[] }>(
      `${this.baseUrl}/supervision/conversations`, { params: this.params(filtres) }
    );
  }

  supervisionMessages(recherche: RechercheSupervision = {}): Observable<{ total: number; page: number; limite: number; messages: MessageChat[] }> {
    return this.http.get<{ success: boolean; total: number; page: number; limite: number; messages: MessageChat[] }>(
      `${this.baseUrl}/supervision/messages`, { params: this.params(recherche) }
    );
  }

  private rafraichirNonLus(): void {
    if (!this.authService.getToken()) return;
    this.conversations().subscribe({ error: () => undefined });
  }

  private ouvrir(corps: Record<string, string>): Observable<Conversation> {
    return this.http
      .post<{ success: boolean; conversation: Conversation }>(`${this.baseUrl}/conversations`, corps)
      .pipe(map((res) => res.conversation));
  }

  private params(valeurs: object): HttpParams {
    let params = new HttpParams();
    for (const [cle, valeur] of Object.entries(valeurs)) {
      if (valeur !== undefined && valeur !== null && valeur !== '' && valeur !== false) params = params.set(cle, String(valeur));
    }
    return params;
  }
}
