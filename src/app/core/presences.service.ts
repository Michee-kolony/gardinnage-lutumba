import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { JourService, RoleAffectation } from './affectations.service';

// Tout est calculé par le serveur (statut, retard, durée, distance, absences, totaux) :
// le frontend se contente d'afficher.
export type StatutPresence = 'en cours' | 'termine' | 'non cloture';
export const STATUTS_PRESENCE: StatutPresence[] = ['en cours', 'termine', 'non cloture'];
export type ModeCloture = 'gardien' | 'admin' | 'automatique';
export type EtatAbsence = 'absent' | 'pas encore arrive';

export interface GardienPresence {
  _id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  photoProfil: string;
  telephonePrincipal?: string;
  statut?: string;
}

export interface ProprietePresence {
  _id: string;
  nomReference: string;
  commune: string;
  quartier: string;
  avenue: string;
  numero: string;
  photos: string[];
  coordonnees?: { lat: number | null; lng: number | null };
  proprietaire?: { nom: string; postnom: string; prenom: string; telephone: string } | null;
}

export interface AffectationPresence {
  _id: string;
  role: RoleAffectation;
  heureDebut: string | null;
  heureFin: string | null;
  joursService: JourService[];
  dateDebut: string;
  dateFin: string;
}

export interface PositionPointage {
  lat: number;
  lng: number;
  precision: number | null;
  // null si la propriété n'a pas de coordonnées GPS
  distanceMetres: number | null;
  horsZone: boolean;
}

export interface Presence {
  _id: string;
  statut: StatutPresence;
  gardien: GardienPresence | null;
  propriete: ProprietePresence | null;
  affectation: AffectationPresence | null;
  // 'AAAA-MM-JJ' : jour du service prévu (un service de nuit garde le jour de son début)
  jourService: string;
  debutPrevu: string;
  finPrevue: string;
  heureArrivee: string;
  positionArrivee: PositionPointage | null;
  retardMinutes: number;
  enRetard: boolean;
  heureDepart: string | null;
  positionDepart: PositionPointage | null;
  dureeMinutes: number | null;
  departAnticipeMinutes: number | null;
  cloture: ModeCloture | null;
  cloturePar?: { _id: string; nom: string } | string | null;
  commentaire: string;
  createdAt: string;
  updatedAt: string;
}

export interface Absence {
  etat: EtatAbsence;
  jourService: string;
  debutPrevu: string;
  finPrevue: string;
  role: RoleAffectation;
  affectation: AffectationPresence | string | null;
  gardien: GardienPresence | null;
  propriete: ProprietePresence | null;
}

export interface TotauxPresence {
  presences: number;
  absences: number;
  pasEncoreArrives: number;
  retards: number;
  minutesRetard: number;
  minutesTravaillees: number;
  heuresTravaillees: number;
  nonClotures: number;
  horsZone: number;
  // en %, null si aucun service
  tauxPresence: number | null;
}

export interface LigneRapportGardien extends TotauxPresence {
  gardien: GardienPresence | null;
}

export interface RapportPresences {
  success: boolean;
  du: string;
  au: string;
  reglages: { toleranceRetardMinutes: number; rayonZoneMetres: number };
  totaux: TotauxPresence;
  parGardien: LigneRapportGardien[];
}

// du / au au format AAAA-MM-JJ (jours inclus)
export interface FiltresPeriode {
  du?: string;
  au?: string;
  gardien?: string;
  propriete?: string;
}

export interface FiltresPresences extends FiltresPeriode {
  statut?: StatutPresence;
  enRetard?: boolean;
  horsZone?: boolean;
  affectation?: string;
}

// Date locale au format AAAA-MM-JJ (pour les filtres du / au)
export function dateIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

// Heure locale HH:mm d'une date ISO UTC
export function heureLocale(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

// Date locale JJ/MM/AAAA d'une date ISO
export function dateLocale(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

// 'AAAA-MM-JJ' (jourService) -> 'JJ/MM/AAAA', sans décalage de fuseau
export function jourLabel(jour: string | null | undefined): string {
  if (!jour) return '—';
  const [a, m, j] = jour.split('-');
  return `${j}/${m}/${a}`;
}

// 705 -> « 11 h 45 »
export function dureeMinutesLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export function statutPresenceLabel(statut: StatutPresence): string {
  const labels: Record<StatutPresence, string> = { 'en cours': 'En cours', termine: 'Terminé', 'non cloture': 'Non clôturé' };
  return labels[statut];
}

export function statutPresenceBadgeClass(statut: StatutPresence): string {
  const classes: Record<StatutPresence, string> = {
    'en cours': 'bg-green-100 text-green-700 border border-green-200',
    termine: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    'non cloture': 'bg-red-100 text-red-700 border border-red-200'
  };
  return classes[statut];
}

export function clotureLabel(cloture: ModeCloture | null): string {
  if (!cloture) return '—';
  const labels: Record<ModeCloture, string> = { gardien: 'Gardien', admin: 'Admin', automatique: 'Automatique' };
  return labels[cloture];
}

export function lienGoogleMaps(lat: number | null | undefined, lng: number | null | undefined): string {
  return lat !== null && lat !== undefined && lng !== null && lng !== undefined ? `https://www.google.com/maps?q=${lat},${lng}` : '';
}

@Injectable({ providedIn: 'root' })
export class PresencesService {
  private readonly baseUrl = `${environment.apiUrl}/api/presences`;

  constructor(private http: HttpClient) {}

  list(filtres: FiltresPresences = {}): Observable<{ success: boolean; du: string; au: string; total: number; presences: Presence[] }> {
    return this.http.get<{ success: boolean; du: string; au: string; total: number; presences: Presence[] }>(this.baseUrl, { params: this.params(filtres) });
  }

  absences(filtres: FiltresPeriode = {}): Observable<{ success: boolean; du: string; au: string; total: number; absences: Absence[] }> {
    return this.http.get<{ success: boolean; du: string; au: string; total: number; absences: Absence[] }>(`${this.baseUrl}/absences`, { params: this.params(filtres) });
  }

  rapport(filtres: FiltresPeriode = {}): Observable<RapportPresences> {
    return this.http.get<RapportPresences>(`${this.baseUrl}/rapport`, { params: this.params(filtres) });
  }

  getById(id: string): Observable<{ success: boolean; presence: Presence }> {
    return this.http.get<{ success: boolean; presence: Presence }>(`${this.baseUrl}/${id}`);
  }

  // Clôturer à la place du gardien (oubli). heureDepart absente = fin prévue ou maintenant
  cloturer(id: string, body: { heureDepart?: string; commentaire?: string }): Observable<{ success: boolean; message: string; presence: Presence }> {
    return this.http.patch<{ success: boolean; message: string; presence: Presence }>(`${this.baseUrl}/${id}/cloturer`, body);
  }

  // SUPER_ADMIN uniquement : pointage erroné
  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  private params(filtres: FiltresPresences): HttpParams {
    let params = new HttpParams();
    (Object.keys(filtres) as (keyof FiltresPresences)[]).forEach((cle) => {
      const valeur = filtres[cle];
      if (valeur !== undefined && valeur !== '' && valeur !== false) {
        params = params.set(cle, String(valeur));
      }
    });
    return params;
  }
}
