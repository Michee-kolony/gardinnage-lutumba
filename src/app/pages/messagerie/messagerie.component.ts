import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, merge, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { nomComplet } from '../../core/affectations.service';
import { AuthService } from '../../core/auth.service';
import {
  CONTENU_MAX, ChatService, Conversation, MessageChat, ModeleChat, PHOTOS_MAX, PersonneChat, roleChat
} from '../../core/chat.service';
import { GardiensService } from '../../core/gardiens.service';
import { FORMATS_IMAGE_ACCEPT, verifierImage } from '../../core/images';
import { ProprietairesService } from '../../core/proprietaires.service';

type Onglet = 'conversations' | 'supervision';
type FiltreType = '' | 'propriete' | 'directe';

type Ligne =
  | { type: 'jour'; cle: string; libelle: string }
  | { type: 'message'; cle: string; message: MessageChat; moi: boolean; suite: boolean };

interface Destinataire {
  id: string;
  modele: ModeleChat;
  nom: string;
  detail: string;
  photo: string;
}

interface PhotoJointe {
  fichier: File;
  url: string;
}

const ECART_SUITE_MS = 5 * 60 * 1000;
const DUREE_ECRITURE_MS = 4000;
const INTERVALLE_SIGNAL_MS = 3000;
const LIMITE_SUPERVISION = 30;

const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const FORMAT_DATE_HEURE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const hier = () => new Date(Date.now() - 86400000);

// Messagerie de l'espace admin (GET/POST /api/chat/...) :
// - discussions des propriétés et discussions privées, en temps réel (Socket.IO)
// - supervision (super admin) : toutes les conversations, messages modifiés et supprimés compris
@Component({
  selector: 'app-messagerie',
  templateUrl: './messagerie.component.html'
})
export class MessagerieComponent implements OnInit, OnDestroy {
  @ViewChild('fil') fil?: ElementRef<HTMLElement>;

  readonly role = roleChat;
  readonly contenuMax = CONTENU_MAX;
  readonly photosMax = PHOTOS_MAX;
  readonly formatsImage = FORMATS_IMAGE_ACCEPT;
  readonly superAdmin: boolean;

  onglet: Onglet = 'conversations';

  // --- Mes conversations
  conversations: Conversation[] = [];
  chargementListe = false;
  erreurListe = '';
  recherche = '';
  filtreType: FiltreType = '';

  // --- Supervision
  supConversations: Conversation[] = [];
  supTotal = 0;
  supPage = 1;
  supType: FiltreType = '';
  supChargement = false;
  supErreur = '';
  supRecherche = '';
  supModifies = false;
  supSupprimes = false;
  supMessages: MessageChat[] | null = null;
  supMessagesTotal = 0;

  // --- Discussion ouverte
  selection: Conversation | null = null;
  messages: MessageChat[] = [];
  lignes: Ligne[] = [];
  plusAnciens = false;
  chargementFil = false;
  chargementAnciens = false;
  erreurFil = '';
  historiqueOuvert = new Set<string>();
  photoOuverte: string | null = null;
  ecrivains = new Map<string, { nom: string; minuteur: ReturnType<typeof setTimeout> }>();

  // --- Saisie
  texte = '';
  photos: PhotoJointe[] = [];
  envoi = false;
  erreurEnvoi = '';
  editionId: string | null = null;
  texteEdition = '';
  suppression: string | null = null;
  private dernierSignal = 0;

  // --- Nouvelle discussion
  choixOuvert = false;
  choixOnglet: ModeleChat = 'Gardien';
  choixRecherche = '';
  destinataires: Destinataire[] = [];
  destinatairesCharges = false;
  choixErreur = '';
  ouverture = '';

  private abonnements: Subscription[] = [];
  private requeteFil = 0;
  private rechargement: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private chat: ChatService,
    private authService: AuthService,
    private gardiensService: GardiensService,
    private proprietairesService: ProprietairesService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.superAdmin = this.authService.isSuperAdmin();
  }

  ngOnInit(): void {
    this.chargerConversations();
    this.ecouter();

    // Ouverture directe : /admin/messagerie?conversation=<id>
    const id = this.route.snapshot.queryParamMap.get('conversation');
    if (id) this.ouvrirParId(id);
  }

  ngOnDestroy(): void {
    this.chat.conversationOuverte = null;
    this.abonnements.forEach((a) => a.unsubscribe());
    this.ecrivains.forEach((e) => clearTimeout(e.minuteur));
    this.photos.forEach((p) => URL.revokeObjectURL(p.url));
    if (this.rechargement) clearTimeout(this.rechargement);
  }

  // =====================================================
  // LISTES
  // =====================================================

  changerOnglet(onglet: Onglet): void {
    this.onglet = onglet;
    if (onglet === 'supervision' && !this.supConversations.length && !this.supChargement) this.chargerSupervision();
  }

  chargerConversations(): void {
    this.chargementListe = true;
    this.erreurListe = '';
    this.chat.conversations().subscribe({
      next: (res) => {
        this.conversations = res.conversations;
        this.chargementListe = false;
        // Garde à jour le titre et les droits de la discussion ouverte
        const ouverte = this.selection && this.conversations.find((c) => c._id === this.selection!._id);
        if (ouverte && this.selection) {
          this.selection = { ...this.selection, peutEcrire: ouverte.peutEcrire, titre: ouverte.titre };
        }
      },
      error: (err) => {
        this.erreurListe = this.message(err);
        this.chargementListe = false;
      }
    });
  }

  get conversationsFiltrees(): Conversation[] {
    const q = this.normaliser(this.recherche);
    return this.conversations.filter((c) =>
      (!this.filtreType || c.type === this.filtreType) &&
      (!q || this.normaliser(`${c.titre} ${c.dernierMessage?.contenu ?? ''}`).includes(q))
    );
  }

  get nonLusTotal(): number {
    return this.conversations.reduce((t, c) => t + (c.nonLus || 0), 0);
  }

  chargerSupervision(suite = false): void {
    this.supChargement = true;
    this.supErreur = '';
    const page = suite ? this.supPage + 1 : 1;
    this.chat.supervisionConversations({ type: this.supType, page, limite: LIMITE_SUPERVISION }).subscribe({
      next: (res) => {
        this.supConversations = suite ? [...this.supConversations, ...res.conversations] : res.conversations;
        this.supTotal = res.total;
        this.supPage = res.page;
        this.supChargement = false;
      },
      error: (err) => {
        this.supErreur = this.message(err);
        this.supChargement = false;
      }
    });
  }

  // Recherche dans tous les messages (texte, anciennes versions, modifiés, supprimés)
  rechercherSupervision(suite = false): void {
    if (!this.supRecherche.trim() && !this.supModifies && !this.supSupprimes) {
      this.supMessages = null;
      return;
    }
    this.supChargement = true;
    this.supErreur = '';
    const page = suite ? this.supPage + 1 : 1;
    this.chat.supervisionMessages({
      q: this.supRecherche.trim(), modifie: this.supModifies, supprime: this.supSupprimes, page, limite: LIMITE_SUPERVISION
    }).subscribe({
      next: (res) => {
        this.supMessages = suite && this.supMessages ? [...this.supMessages, ...res.messages] : res.messages;
        this.supMessagesTotal = res.total;
        this.supPage = res.page;
        this.supChargement = false;
      },
      error: (err) => {
        this.supErreur = this.message(err);
        this.supChargement = false;
      }
    });
  }

  effacerRechercheSupervision(): void {
    this.supRecherche = '';
    this.supModifies = false;
    this.supSupprimes = false;
    this.supMessages = null;
    this.chargerSupervision();
  }

  conversationDuResultat(m: MessageChat): string {
    const c = m.conversation;
    if (typeof c === 'string') return '';
    return c.type === 'propriete' ? (c.propriete?.nomReference ?? 'Propriété') : 'Discussion privée';
  }

  ouvrirResultat(m: MessageChat): void {
    const id = typeof m.conversation === 'string' ? m.conversation : m.conversation._id;
    this.ouvrirParId(id);
  }

  // =====================================================
  // DISCUSSION
  // =====================================================

  ouvrir(c: Conversation): void {
    this.ouvrirParId(c._id, c);
  }

  fermer(): void {
    this.selection = null;
    this.chat.conversationOuverte = null;
    this.router.navigate([], { queryParams: { conversation: null }, replaceUrl: true });
  }

  private ouvrirParId(id: string, apercu?: Conversation): void {
    const requete = ++this.requeteFil;
    this.selection = apercu ?? this.selection;
    this.chat.conversationOuverte = id;
    this.messages = [];
    this.lignes = [];
    this.erreurFil = '';
    this.texte = '';
    this.editionId = null;
    this.suppression = null;
    this.historiqueOuvert.clear();
    this.photos.forEach((p) => URL.revokeObjectURL(p.url));
    this.photos = [];
    this.ecrivains.forEach((e) => clearTimeout(e.minuteur));
    this.ecrivains.clear();
    this.chargementFil = true;

    this.router.navigate([], { queryParams: { conversation: id }, replaceUrl: true });

    forkJoin({ conversation: this.chat.conversation(id), page: this.chat.messages(id) }).subscribe({
      next: ({ conversation, page }) => {
        if (requete !== this.requeteFil) return;
        this.selection = conversation;
        this.messages = page.messages;
        this.plusAnciens = page.plusAnciens;
        this.majLignes();
        this.chargementFil = false;
        this.defilerEnBas();
        // Les non lus de la liste tombent à 0
        this.conversations = this.conversations.map((c) => (c._id === id ? { ...c, nonLus: 0 } : c));
      },
      error: (err) => {
        if (requete !== this.requeteFil) return;
        this.erreurFil = this.message(err);
        this.chargementFil = false;
      }
    });
  }

  chargerPlusAnciens(): void {
    if (!this.selection || this.chargementAnciens || !this.messages.length) return;
    this.chargementAnciens = true;
    const zone = this.fil?.nativeElement;
    const hauteurAvant = zone?.scrollHeight ?? 0;
    this.chat.messages(this.selection._id, this.messages[0].createdAt).subscribe({
      next: (page) => {
        this.messages = [...page.messages, ...this.messages];
        this.plusAnciens = page.plusAnciens;
        this.majLignes();
        this.chargementAnciens = false;
        setTimeout(() => zone && (zone.scrollTop += zone.scrollHeight - hauteurAvant));
      },
      error: (err) => {
        this.erreurFil = this.message(err);
        this.chargementAnciens = false;
      }
    });
  }

  get sousTitre(): string {
    const c = this.selection;
    if (!c) return '';
    if (c.type === 'propriete') return 'Discussion de la propriété';
    if (c.acces === 'supervision') return 'Discussion privée';
    return this.role(c.interlocuteur?.role) || c.typeLibelle;
  }

  get ecrit(): string {
    const noms = [...this.ecrivains.values()].map((e) => e.nom.split(' ')[0]);
    if (!noms.length) return '';
    return noms.length === 1 ? `${noms[0]} écrit…` : `${noms.join(', ')} écrivent…`;
  }

  lu(message: MessageChat): boolean {
    const c = this.selection;
    if (c?.type !== 'directe' || c.acces !== 'membre' || !c.lectures) return false;
    return c.lectures.some((l) => l.utilisateur !== this.chat.monId && new Date(l.date) >= new Date(message.createdAt));
  }

  dernierDeMoi(message: MessageChat): boolean {
    const miens = this.messages.filter((m) => m.auteur === this.chat.monId && !m.supprime);
    return miens[miens.length - 1]?._id === message._id;
  }

  modifiable(message: MessageChat): boolean {
    return this.selection?.acces === 'membre' && this.chat.modifiable(message);
  }

  basculerHistorique(id: string): void {
    if (this.historiqueOuvert.has(id)) this.historiqueOuvert.delete(id);
    else this.historiqueOuvert.add(id);
  }

  private majLignes(): void {
    const lignes: Ligne[] = [];
    let jour = '';
    let precedent: MessageChat | null = null;
    for (const m of this.messages) {
      const d = new Date(m.createdAt);
      const cle = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (cle !== jour) {
        jour = cle;
        precedent = null;
        lignes.push({ type: 'jour', cle: `jour-${cle}`, libelle: this.jour(m.createdAt) });
      }
      const suite = !!precedent && precedent.auteur === m.auteur
        && d.getTime() - new Date(precedent.createdAt).getTime() < ECART_SUITE_MS;
      lignes.push({ type: 'message', cle: m._id, message: m, moi: m.auteur === this.chat.monId, suite });
      precedent = m;
    }
    this.lignes = lignes;
  }

  private defilerEnBas(): void {
    setTimeout(() => {
      const zone = this.fil?.nativeElement;
      if (zone) zone.scrollTop = zone.scrollHeight;
    }, 30);
  }

  // =====================================================
  // TEMPS REEL
  // =====================================================

  private ecouter(): void {
    const ici = (e: { conversation: string }) => e.conversation === this.selection?._id;

    this.abonnements.push(
      this.chat.nouveauMessage$.subscribe((e) => {
        if (ici(e)) {
          this.retirerEcrivain(e.message.auteur);
          if (this.ajouter(e.message) && e.message.auteur !== this.chat.monId && this.selection?.acces === 'membre') {
            this.chat.marquerLu(e.conversation);
          }
        }
      }),
      this.chat.messageModifie$.subscribe((e) => ici(e) && this.remplacer(e.message)),
      this.chat.messageSupprime$.subscribe((e) => ici(e) && this.remplacer(e.message)),
      this.chat.lu$.subscribe((e) => {
        if (!ici(e) || !this.selection) return;
        const autres = (this.selection.lectures ?? []).filter((l) => l.utilisateur !== e.utilisateur);
        this.selection = { ...this.selection, lectures: [...autres, { utilisateur: e.utilisateur, date: e.date }] };
      }),
      this.chat.ecrit$.subscribe((e) => {
        if (!ici(e) || e.utilisateur.id === this.chat.monId) return;
        this.retirerEcrivain(e.utilisateur.id);
        this.ecrivains.set(e.utilisateur.id, {
          nom: e.utilisateur.nom,
          minuteur: setTimeout(() => this.retirerEcrivain(e.utilisateur.id), DUREE_ECRITURE_MS)
        });
      }),
      // Aperçus et non lus de la liste
      merge(this.chat.nouveauMessage$, this.chat.messageModifie$, this.chat.messageSupprime$).subscribe(() => this.rechargerBientot())
    );
  }

  private ajouter(message: MessageChat): boolean {
    if (this.messages.some((m) => m._id === message._id)) return false;
    this.messages = [...this.messages, message];
    this.majLignes();
    this.defilerEnBas();
    return true;
  }

  private remplacer(message: MessageChat): void {
    this.messages = this.messages.map((m) => (m._id === message._id ? message : m));
    this.majLignes();
  }

  private retirerEcrivain(id: string): void {
    const ecrivain = this.ecrivains.get(id);
    if (!ecrivain) return;
    clearTimeout(ecrivain.minuteur);
    this.ecrivains.delete(id);
  }

  private rechargerBientot(): void {
    if (this.rechargement) clearTimeout(this.rechargement);
    this.rechargement = setTimeout(() => this.chargerConversations(), 400);
  }

  // =====================================================
  // ENVOI
  // =====================================================

  get peutEnvoyer(): boolean {
    return !this.envoi && (this.texte.trim().length > 0 || this.photos.length > 0) && this.texte.length <= CONTENU_MAX;
  }

  saisie(): void {
    this.erreurEnvoi = '';
    if (this.selection && Date.now() - this.dernierSignal > INTERVALLE_SIGNAL_MS && this.texte.trim()) {
      this.dernierSignal = Date.now();
      this.chat.signalerEcriture(this.selection._id);
    }
  }

  touche(event: KeyboardEvent): void {
    // Entrée envoie, Maj + Entrée passe à la ligne
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.envoyer();
    }
  }

  onPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichiers = Array.from(input.files ?? []);
    input.value = '';
    this.erreurEnvoi = '';
    for (const fichier of fichiers) {
      if (this.photos.length >= PHOTOS_MAX) {
        this.erreurEnvoi = `${PHOTOS_MAX} photos maximum par message.`;
        break;
      }
      const erreur = verifierImage(fichier);
      if (erreur) {
        this.erreurEnvoi = erreur;
        continue;
      }
      this.photos.push({ fichier, url: URL.createObjectURL(fichier) });
    }
  }

  retirerPhoto(photo: PhotoJointe): void {
    URL.revokeObjectURL(photo.url);
    this.photos = this.photos.filter((p) => p !== photo);
  }

  envoyer(): void {
    if (!this.selection || !this.peutEnvoyer) return;
    const id = this.selection._id;
    this.envoi = true;
    this.erreurEnvoi = '';
    this.chat.envoyer(id, this.texte, this.photos.map((p) => p.fichier)).subscribe({
      next: (message) => {
        this.texte = '';
        this.photos.forEach((p) => URL.revokeObjectURL(p.url));
        this.photos = [];
        this.envoi = false;
        if (this.selection?._id === id) this.ajouter(message);
      },
      error: (err) => {
        this.erreurEnvoi = this.message(err);
        this.envoi = false;
      }
    });
  }

  // =====================================================
  // CORRECTION / SUPPRESSION
  // =====================================================

  commencerEdition(m: MessageChat): void {
    this.suppression = null;
    this.editionId = m._id;
    this.texteEdition = m.contenu;
  }

  enregistrerEdition(m: MessageChat): void {
    const contenu = this.texteEdition.trim();
    if (contenu === m.contenu) {
      this.editionId = null;
      return;
    }
    this.chat.modifier(m._id, contenu).subscribe({
      next: (message) => {
        this.editionId = null;
        this.remplacer(message);
      },
      error: (err) => (this.erreurFil = this.message(err))
    });
  }

  confirmerSuppression(m: MessageChat): void {
    this.chat.supprimer(m._id).subscribe({
      next: () => {
        this.suppression = null;
        // Le super admin garde le contenu (supervision), les autres le voient disparaître
        this.remplacer(this.superAdmin ? { ...m, supprime: true, supprimeLe: new Date().toISOString() } : { ...m, supprime: true, contenu: '', photos: [] });
      },
      error: (err) => {
        this.suppression = null;
        this.erreurFil = this.message(err);
      }
    });
  }

  // =====================================================
  // NOUVELLE DISCUSSION PRIVEE
  // =====================================================

  nouvelleDiscussion(): void {
    this.choixOuvert = true;
    this.choixErreur = '';
    this.choixRecherche = '';
    if (this.destinatairesCharges) return;

    forkJoin({
      gardiens: this.gardiensService.list().pipe(catchError(() => of({ gardiens: [] }))),
      proprietaires: this.proprietairesService.list().pipe(catchError(() => of({ proprietaires: [] }))),
      admins: this.chat.contacts().pipe(catchError(() => of([] as PersonneChat[])))
    }).subscribe(({ gardiens, proprietaires, admins }) => {
      this.destinataires = [
        ...gardiens.gardiens.map((g) => ({
          id: g._id, modele: 'Gardien' as ModeleChat, nom: nomComplet(g), detail: g.matricule, photo: g.photoProfil || ''
        })),
        ...proprietaires.proprietaires.filter((p) => p.actif !== false).map((p) => ({
          id: p._id, modele: 'Proprietaire' as ModeleChat, nom: nomComplet(p, 'Propriétaire'), detail: this.role(p.role), photo: p.photo || ''
        })),
        ...admins.filter((a) => a.modele === 'Administrateur' && a.id).map((a) => ({
          id: a.id as string, modele: 'Administrateur' as ModeleChat, nom: a.nom, detail: this.role(a.role), photo: ''
        }))
      ];
      this.destinatairesCharges = true;
    });
  }

  get destinatairesFiltres(): Destinataire[] {
    const q = this.normaliser(this.choixRecherche);
    return this.destinataires.filter((d) =>
      d.modele === this.choixOnglet && (!q || this.normaliser(`${d.nom} ${d.detail}`).includes(q))
    );
  }

  ouvrirDestinataire(d: Destinataire): void {
    if (this.ouverture) return;
    this.ouverture = d.id;
    this.choixErreur = '';
    this.chat.ouvrirDirecte(d.id, d.modele).subscribe({
      next: (conversation) => {
        this.ouverture = '';
        this.choixOuvert = false;
        this.onglet = 'conversations';
        if (!this.conversations.some((c) => c._id === conversation._id)) this.conversations = [conversation, ...this.conversations];
        this.ouvrir(conversation);
      },
      error: (err) => {
        this.ouverture = '';
        this.choixErreur = this.message(err);
      }
    });
  }

  // =====================================================
  // OUTILS D'AFFICHAGE
  // =====================================================

  dateListe(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (memeJour(d, new Date())) return FORMAT_HEURE.format(d);
    if (memeJour(d, hier())) return 'Hier';
    return FORMAT_DATE.format(d);
  }

  heure(iso: string): string {
    return FORMAT_HEURE.format(new Date(iso));
  }

  dateHeure(iso: string | null | undefined): string {
    return iso ? FORMAT_DATE_HEURE.format(new Date(iso)) : '';
  }

  private jour(iso: string): string {
    const d = new Date(iso);
    if (memeJour(d, new Date())) return 'Aujourd’hui';
    if (memeJour(d, hier())) return 'Hier';
    return FORMAT_JOUR.format(d);
  }

  initiales(nom: string): string {
    return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]?.toUpperCase()).join('') || '?';
  }

  apercu(c: Conversation): string {
    if (!c.dernierMessage?.date) return 'Aucun message';
    return c.dernierMessage.auteurNom ? `${c.dernierMessage.auteurNom} : ${c.dernierMessage.contenu}` : c.dernierMessage.contenu;
  }

  private normaliser(texte: string): string {
    return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  private message(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) return 'Serveur injoignable, vérifiez votre connexion.';
      return err.error?.message || 'Une erreur est survenue.';
    }
    return 'Une erreur est survenue.';
  }
}
