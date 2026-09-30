import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { StatutAbonnement } from './proprietes.service';

// Calculé par le serveur : ne jamais le recalculer côté frontend
export type StatutAffectation = 'en cours' | 'expiree' | 'a venir';
export const STATUTS_AFFECTATION: StatutAffectation[] = ['en cours', 'a venir', 'expiree'];

export type UniteDuree = 'jours' | 'semaines' | 'mois';
export const UNITES_DUREE: UniteDuree[] = ['jours', 'semaines', 'mois'];

// Champs du gardien renvoyés dans une affectation
export interface GardienAffecte {
  _id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: 'M' | 'F';
  photoProfil: string;
  telephonePrincipal: string;
  telephoneSecondaire: string;
  statut: string;
}

// Champs de la propriété renvoyés dans une affectation
export interface ProprieteAffectee {
  _id: string;
  nomReference: string;
  typePropriete: string;
  commune: string;
  quartier: string;
  avenue: string;
  numero: string;
  photos: string[];
  proprietaire: string | null;
  dateDebutAbonnement: string | null;
  dateExpirationAbonnement: string | null;
  statutAbonnement?: StatutAbonnement;
}

export interface Affectation {
  _id: string;
  statut: StatutAffectation;
  estPrincipal: boolean;
  duree: number;
  uniteDuree: UniteDuree;
  dateDebut: string;
  // Calculée par le serveur
  dateFin: string;
  termineeLe: string | null;
  description: string;
  // null si le gardien ou la propriété n'existe plus
  gardien: GardienAffecte | null;
  propriete: ProprieteAffectee | null;
  adminEnregistreur?: { _id: string; nom: string; email: string } | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AffectationFiltres {
  propriete?: string;
  gardien?: string;
  statut?: StatutAffectation;
  estPrincipal?: boolean;
}

// Création : ne jamais envoyer dateFin ni statut (calculés par le serveur).
// estPrincipal absent = le premier gardien de la propriété sur la période devient principal.
export interface CreateAffectationPayload {
  propriete: string;
  gardien: string;
  duree: number;
  uniteDuree: UniteDuree;
  dateDebut?: string;
  estPrincipal?: boolean;
  description?: string;
}

// Modification : la propriété et le gardien ne sont pas modifiables
export interface UpdateAffectationPayload {
  duree?: number;
  uniteDuree?: UniteDuree;
  dateDebut?: string;
  estPrincipal?: boolean;
  description?: string;
}

interface AffectationsResponse {
  success: boolean;
  total: number;
  affectations: Affectation[];
}

interface AffectationResponse {
  success: boolean;
  message?: string;
  affectation: Affectation;
}

export function nomCompletGardien(gardien: Pick<GardienAffecte, 'prenom' | 'nom' | 'postnom'> | null): string {
  if (!gardien) {
    return 'Gardien supprimé';
  }
  return [gardien.prenom, gardien.nom, gardien.postnom].filter(Boolean).join(' ');
}

export function statutAffectationLabel(statut: StatutAffectation): string {
  const labels: Record<StatutAffectation, string> = { 'en cours': 'En cours', expiree: 'Expirée', 'a venir': 'À venir' };
  return labels[statut];
}

export function statutAffectationBadgeClass(statut: StatutAffectation): string {
  const classes: Record<StatutAffectation, string> = {
    'en cours': 'bg-green-100 text-green-700 border border-green-200',
    expiree: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    'a venir': 'bg-blue-100 text-blue-700 border border-blue-200'
  };
  return classes[statut];
}

export function dureeLabel(duree: number, unite: UniteDuree): string {
  const singulier: Record<UniteDuree, string> = { jours: 'jour', semaines: 'semaine', mois: 'mois' };
  return `${duree} ${duree > 1 ? unite : singulier[unite]}`;
}

// Même calcul que le serveur (utils/dates.js), en UTC. Sert uniquement à l'aperçu :
// la date de fin affichée ensuite est toujours celle renvoyée par le serveur.
export function ajouterDuree(date: Date, duree: number, unite: UniteDuree): Date {
  if (unite === 'jours' || unite === 'semaines') {
    const jours = unite === 'jours' ? duree : duree * 7;
    return new Date(date.getTime() + jours * 24 * 60 * 60 * 1000);
  }
  const resultat = new Date(date);
  const jour = resultat.getUTCDate();
  resultat.setUTCDate(1);
  resultat.setUTCMonth(resultat.getUTCMonth() + duree);
  const dernierJour = new Date(Date.UTC(resultat.getUTCFullYear(), resultat.getUTCMonth() + 1, 0)).getUTCDate();
  resultat.setUTCDate(Math.min(jour, dernierJour));
  return resultat;
}

@Injectable({ providedIn: 'root' })
export class AffectationsService {
  private readonly baseUrl = `${environment.apiUrl}/api/affectations`;

  constructor(private http: HttpClient) {}

  list(filtres: AffectationFiltres = {}): Observable<AffectationsResponse> {
    let params = new HttpParams();
    if (filtres.propriete) params = params.set('propriete', filtres.propriete);
    if (filtres.gardien) params = params.set('gardien', filtres.gardien);
    if (filtres.statut) params = params.set('statut', filtres.statut);
    if (filtres.estPrincipal !== undefined) params = params.set('estPrincipal', String(filtres.estPrincipal));
    return this.http.get<AffectationsResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<AffectationResponse> {
    return this.http.get<AffectationResponse>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateAffectationPayload): Observable<AffectationResponse> {
    return this.http.post<AffectationResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateAffectationPayload): Observable<AffectationResponse> {
    return this.http.put<AffectationResponse>(`${this.baseUrl}/${id}`, payload);
  }

  definirPrincipal(id: string): Observable<AffectationResponse> {
    return this.http.patch<AffectationResponse>(`${this.baseUrl}/${id}/principal`, {});
  }

  terminer(id: string): Observable<AffectationResponse> {
    return this.http.patch<AffectationResponse>(`${this.baseUrl}/${id}/terminer`, {});
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
