import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, merge, timer } from 'rxjs';
import { catchError, finalize, map, share, shareReplay, switchMap, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

// Les listes (types, gravités, statuts) viennent toujours de GET /incidents/options :
// seules les valeurs "techniques" utilisées par la logique sont typées ici.
export type GraviteIncident = 'faible' | 'moyenne' | 'elevee' | 'critique';
export type StatutIncident = 'nouveau' | 'en_cours' | 'resolu' | 'classe';
export type AuteurIncident = 'Gardien' | 'Proprietaire' | 'Administrateur';

export interface OptionIncident {
  valeur: string;
  libelle: string;
}

export interface IncidentOptions {
  types: OptionIncident[];
  gravites: OptionIncident[];
  statuts: OptionIncident[];
  graviteParDefaut: Record<string, string>;
}

export interface PersonneIncident {
  _id: string;
  nom?: string;
  postnom?: string;
  prenom?: string;
  telephone?: string;
  telephonePrincipal?: string;
  photo?: string;
  photoProfil?: string;
  matricule?: string;
}

export interface ProprieteIncident {
  _id: string;
  nomReference: string;
  commune: string;
  quartier: string;
  avenue: string;
  numero: string;
  coordonnees: { lat: number | null; lng: number | null } | null;
  photos: string[];
  proprietaire: { nom?: string; postnom?: string; prenom?: string; telephone?: string } | null;
}

export interface Incident {
  _id: string;
  type: string;
  typeLibelle: string;
  description: string;
  dateIncident: string;
  createdAt: string;
  updatedAt: string;
  position: { lat: number | null; lng: number | null; precision: number | null } | null;
  photos: string[];
  videos: string[];
  gravite: GraviteIncident;
  graviteLibelle: string;
  statut: StatutIncident;
  statutLibelle: string;
  commentaireAdmin: string;
  traiteLe: string | null;
  traitePar: { _id: string; nom: string } | null;
  signaleParModele: AuteurIncident;
  signalePar: PersonneIncident | null;
  gardien: PersonneIncident | null;
  propriete: ProprieteIncident | null;
}

// du / au au format AAAA-MM-JJ, sur la date de l'incident
export interface FiltresIncidents {
  type?: string;
  gravite?: string;
  statut?: string;
  propriete?: string;
  gardien?: string;
  du?: string;
  au?: string;
}

export interface IncidentPatch {
  statut?: StatutIncident;
  gravite?: string;
  commentaireAdmin?: string;
}

export interface IncidentPayload {
  type: string;
  description: string;
  propriete: string;
  gardien: string;
  // ISO ; '' = maintenant côté serveur
  dateIncident: string;
  gravite: string;
  lat: number | null;
  lng: number | null;
  precision: number | null;
  photos: File[];
  videos: File[];
}

interface ListeIncidentsResponse {
  success: boolean;
  total: number;
  nonTraites: number;
  incidents: Incident[];
}

interface IncidentResponse {
  success: boolean;
  message?: string;
  incident: Incident;
}

// État partagé entre le menu, les alertes, le dashboard et la page Incidents
export interface EtatIncidents {
  // Incidents au statut "nouveau" (non encore pris en charge)
  nouveaux: Incident[];
  // Total des incidents "nouveau", indépendant des filtres (badge du menu)
  nonTraites: number;
  charge: boolean;
}

// Changement fait depuis cette interface : chaque écran met à jour ses données sans recharger
export type ModificationIncident =
  | { type: 'maj'; incident: Incident }
  | { type: 'creation'; incident: Incident }
  | { type: 'suppression'; id: string };

// --- Apparence : définie une seule fois, réutilisée par la carte, les badges et la liste ---

export interface StyleGravite {
  couleur: string;
  badge: string;
  bordure: string;
  ordre: number;
}

export const STYLES_GRAVITE: Record<GraviteIncident, StyleGravite> = {
  faible: { couleur: '#16a34a', badge: 'bg-green-100 text-green-700 border border-green-200', bordure: 'border-l-green-600', ordre: 0 },
  moyenne: { couleur: '#eab308', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-300', bordure: 'border-l-yellow-400', ordre: 1 },
  elevee: { couleur: '#f97316', badge: 'bg-orange-100 text-orange-700 border border-orange-200', bordure: 'border-l-orange-500', ordre: 2 },
  critique: { couleur: '#dc2626', badge: 'bg-red-100 text-red-700 border border-red-200', bordure: 'border-l-red-600', ordre: 3 }
};

const STYLE_GRAVITE_INCONNUE: StyleGravite = {
  couleur: '#737373', badge: 'bg-neutral-100 text-neutral-700 border border-neutral-200', bordure: 'border-l-neutral-300', ordre: -1
};

export function styleGravite(gravite: string | null | undefined): StyleGravite {
  return STYLES_GRAVITE[gravite as GraviteIncident] ?? STYLE_GRAVITE_INCONNUE;
}

export const BADGES_STATUT_INCIDENT: Record<StatutIncident, string> = {
  nouveau: 'bg-blue-100 text-blue-700 border border-blue-200',
  en_cours: 'bg-amber-100 text-amber-800 border border-amber-200',
  resolu: 'bg-green-100 text-green-700 border border-green-200',
  classe: 'bg-neutral-100 text-neutral-600 border border-neutral-200'
};

export function statutIncidentBadgeClass(statut: string): string {
  return BADGES_STATUT_INCIDENT[statut as StatutIncident] ?? BADGES_STATUT_INCIDENT.classe;
}

// Tracés SVG (viewBox 24, trait) par type d'incident ; un type inconnu prend l'icône « autre »
export const ICONES_TYPE_INCIDENT: Record<string, string> = {
  tentative_intrusion: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5V11zm7 4v2',
  intrusion: 'M12 3l7 3v5c0 4.2-3 8-7 9-4-1-7-4.8-7-9V6l7-3zm0 5v4m0 3h.01',
  vol: 'M6 8h12l-1 13H7L6 8zm3 0V6a3 3 0 0 1 6 0v2',
  incendie: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z',
  accident: 'M3 13l2-6h14l2 6v5H3v-5zm0 0h18M7 18v2m10-2v2M7 15.5h.01M17 15.5h.01',
  personne_suspecte: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10a7 7 0 0 1 14 0',
  probleme_technique: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z',
  urgence_medicale: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z',
  autre: 'M12 9v4m0 4h.01M10.3 3.9 2.7 17.3A1.5 1.5 0 0 0 4 19.5h16a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z'
};

export function iconeTypeIncident(type: string | null | undefined): string {
  return ICONES_TYPE_INCIDENT[type ?? ''] ?? ICONES_TYPE_INCIDENT['autre'];
}

// --- Fonctions d'affichage communes ---

export interface PositionIncident {
  lat: number;
  lng: number;
  // 'gps' = position réelle du signalement ; 'propriete' = coordonnées de la propriété
  source: 'gps' | 'propriete';
  precision: number | null;
}

// 1. position GPS du signalement, 2. coordonnées de la propriété, 3. aucune
export function positionIncident(incident: Incident): PositionIncident | null {
  const gps = incident.position;
  if (gps && gps.lat !== null && gps.lat !== undefined && gps.lng !== null && gps.lng !== undefined) {
    return { lat: gps.lat, lng: gps.lng, source: 'gps', precision: gps.precision ?? null };
  }
  const coords = incident.propriete?.coordonnees;
  if (coords && coords.lat !== null && coords.lat !== undefined && coords.lng !== null && coords.lng !== undefined) {
    return { lat: coords.lat, lng: coords.lng, source: 'propriete', precision: null };
  }
  return null;
}

// JJ/MM/AAAA HH:mm (heure locale)
export function dateHeureIncident(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()} ${deux(d.getHours())}:${deux(d.getMinutes())}`;
}

export function nomPersonne(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined, defaut = '—'): string {
  if (!personne) return defaut;
  return [personne.prenom, personne.nom, personne.postnom].filter(Boolean).join(' ') || defaut;
}

export function telephonePersonne(personne: PersonneIncident | null | undefined): string {
  return personne?.telephonePrincipal || personne?.telephone || '';
}

export function photoPersonne(personne: PersonneIncident | null | undefined): string {
  return personne?.photoProfil || personne?.photo || '';
}

export function adresseProprieteIncident(p: ProprieteIncident | null | undefined): string {
  if (!p) return '';
  return [p.avenue && `${p.avenue}${p.numero ? ' n° ' + p.numero : ''}`, p.quartier, p.commune].filter(Boolean).join(', ');
}

export function auteurIncidentLabel(modele: AuteurIncident | string): string {
  const labels: Record<string, string> = { Gardien: 'Gardien', Proprietaire: 'Propriétaire', Administrateur: 'Administrateur' };
  return labels[modele] ?? modele;
}

// Tri par défaut : "nouveau" d'abord, puis gravité (critique → faible), puis date décroissante
export function trierIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) =>
    Number(b.statut === 'nouveau') - Number(a.statut === 'nouveau') ||
    styleGravite(b.gravite).ordre - styleGravite(a.gravite).ordre ||
    new Date(b.dateIncident).getTime() - new Date(a.dateIncident).getTime()
  );
}

// Mêmes limites que le backend
export const MAX_PHOTOS_INCIDENT = 5;
export const MAX_VIDEOS_INCIDENT = 2;
export const TAILLE_MAX_PHOTO_INCIDENT = 20 * 1024 * 1024;
export const TAILLE_MAX_VIDEO_INCIDENT = 30 * 1024 * 1024;
export const FORMATS_VIDEO_INCIDENT = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'];

const INTERVALLE_SUIVI_MS = 30000;

@Injectable({ providedIn: 'root' })
export class IncidentsService {
  private readonly baseUrl = `${environment.apiUrl}/api/incidents`;

  private readonly etatSubject = new BehaviorSubject<EtatIncidents>({ nouveaux: [], nonTraites: 0, charge: false });
  private readonly nouvelIncidentSubject = new Subject<Incident>();
  private readonly modificationSubject = new Subject<ModificationIncident>();
  private readonly rafraichissementSubject = new Subject<void>();
  private readonly forcerSubject = new Subject<void>();
  private readonly filtresSubject = new BehaviorSubject<FiltresIncidents>({});

  // Ids déjà vus : un _id inconnu après le premier chargement = nouvel incident
  private idsConnus = new Set<string>();
  private premierChargement = true;
  private options$?: Observable<IncidentOptions>;

  readonly etat$ = this.etatSubject.asObservable();
  readonly nouvelIncident$ = this.nouvelIncidentSubject.asObservable();
  readonly modification$ = this.modificationSubject.asObservable();
  // Émis après chaque cycle de suivi : les écrans rechargent alors leur propre vue filtrée
  readonly rafraichissement$ = this.rafraichissementSubject.asObservable();
  // Filtres partagés entre la carte du dashboard et la page Incidents
  readonly filtres$ = this.filtresSubject.asObservable();

  // Suivi des incidents (polling toutes les 30 s). Il tourne tant qu'au moins un
  // abonné existe et s'arrête dès que le dernier se désabonne. Pour passer à
  // Socket.IO, il suffira de remplacer ce flux : les composants ne changent pas.
  readonly suivi$: Observable<EtatIncidents> = merge(timer(0, INTERVALLE_SUIVI_MS), this.forcerSubject).pipe(
    switchMap(() => this.list({ statut: 'nouveau' }).pipe(catchError(() => EMPTY))),
    map((res) => this.appliquerSuivi(res)),
    // Plus aucun abonné (déconnexion) : le prochain suivi repartira sans notifier l'existant
    finalize(() => (this.premierChargement = true)),
    share({ resetOnRefCountZero: true })
  );

  constructor(private http: HttpClient) {}

  get filtres(): FiltresIncidents {
    return this.filtresSubject.value;
  }

  setFiltres(filtres: FiltresIncidents): void {
    this.filtresSubject.next({ ...filtres });
  }

  rafraichirMaintenant(): void {
    this.forcerSubject.next();
  }

  // --- HTTP ---

  options(): Observable<IncidentOptions> {
    if (!this.options$) {
      this.options$ = this.http.get<{ success: boolean } & IncidentOptions>(`${this.baseUrl}/options`).pipe(
        map((res) => ({ types: res.types, gravites: res.gravites, statuts: res.statuts, graviteParDefaut: res.graviteParDefaut ?? {} })),
        // En cas d'échec, la prochaine demande retentera l'appel
        catchError((err) => {
          this.options$ = undefined;
          throw err;
        }),
        shareReplay(1)
      );
    }
    return this.options$;
  }

  list(filtres: FiltresIncidents = {}): Observable<ListeIncidentsResponse> {
    let params = new HttpParams();
    (Object.keys(filtres) as (keyof FiltresIncidents)[]).forEach((cle) => {
      const valeur = filtres[cle];
      if (valeur) params = params.set(cle, valeur);
    });
    return this.http.get<ListeIncidentsResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<IncidentResponse> {
    return this.http.get<IncidentResponse>(`${this.baseUrl}/${id}`);
  }

  update(id: string, patch: IncidentPatch): Observable<IncidentResponse> {
    return this.http.patch<IncidentResponse>(`${this.baseUrl}/${id}`, patch).pipe(
      tap((res) => {
        this.majEtatLocal(res.incident);
        this.modificationSubject.next({ type: 'maj', incident: res.incident });
      })
    );
  }

  create(payload: IncidentPayload): Observable<IncidentResponse> {
    return this.http.post<IncidentResponse>(this.baseUrl, this.buildFormData(payload)).pipe(
      tap((res) => {
        // Saisi par l'admin lui-même : pas de notification « nouvel incident »
        this.idsConnus.add(res.incident._id);
        this.majEtatLocal(res.incident);
        this.modificationSubject.next({ type: 'creation', incident: res.incident });
      })
    );
  }

  // SUPER_ADMIN uniquement
  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        const etat = this.etatSubject.value;
        const etaitNouveau = etat.nouveaux.some((i) => i._id === id);
        this.etatSubject.next({
          ...etat,
          nouveaux: etat.nouveaux.filter((i) => i._id !== id),
          nonTraites: etaitNouveau ? Math.max(0, etat.nonTraites - 1) : etat.nonTraites
        });
        this.modificationSubject.next({ type: 'suppression', id });
      })
    );
  }

  // --- Suivi ---

  private appliquerSuivi(res: ListeIncidentsResponse): EtatIncidents {
    res.incidents.forEach((incident) => {
      if (!this.premierChargement && !this.idsConnus.has(incident._id)) {
        this.nouvelIncidentSubject.next(incident);
      }
      this.idsConnus.add(incident._id);
    });
    this.premierChargement = false;
    const etat: EtatIncidents = { nouveaux: res.incidents, nonTraites: res.nonTraites, charge: true };
    this.etatSubject.next(etat);
    this.rafraichissementSubject.next();
    return etat;
  }

  // Après un PATCH / POST : le badge et la bannière critique suivent sans attendre le prochain cycle
  private majEtatLocal(incident: Incident): void {
    const etat = this.etatSubject.value;
    const etaitNouveau = etat.nouveaux.some((i) => i._id === incident._id);
    const estNouveau = incident.statut === 'nouveau';
    let nouveaux = etat.nouveaux.filter((i) => i._id !== incident._id);
    if (estNouveau) nouveaux = [incident, ...nouveaux];
    const delta = Number(estNouveau) - Number(etaitNouveau);
    this.etatSubject.next({ ...etat, nouveaux, nonTraites: Math.max(0, etat.nonTraites + delta) });
  }

  private buildFormData(payload: IncidentPayload): FormData {
    const formData = new FormData();
    formData.append('type', payload.type);
    formData.append('description', payload.description);
    formData.append('propriete', payload.propriete);
    if (payload.gardien) formData.append('gardien', payload.gardien);
    if (payload.dateIncident) formData.append('dateIncident', payload.dateIncident);
    if (payload.gravite) formData.append('gravite', payload.gravite);
    if (payload.lat !== null && payload.lng !== null) {
      formData.append('lat', String(payload.lat));
      formData.append('lng', String(payload.lng));
      if (payload.precision !== null) formData.append('precision', String(payload.precision));
    }
    payload.photos.forEach((f) => formData.append('photos', f));
    payload.videos.forEach((f) => formData.append('videos', f));
    // Pas de Content-Type manuel : le navigateur ajoute la boundary multipart
    return formData;
  }
}
