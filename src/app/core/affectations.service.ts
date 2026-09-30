import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { StatutAbonnement } from './proprietes.service';

// Calculé par le serveur : ne jamais le recalculer côté frontend
export type StatutAffectation = 'en cours' | 'expiree' | 'a venir';
export const STATUTS_AFFECTATION: StatutAffectation[] = ['en cours', 'a venir', 'expiree'];

export type RoleAffectation = 'principal' | 'remplacant';
export const ROLES_AFFECTATION: RoleAffectation[] = ['principal', 'remplacant'];

export type UniteDuree = 'jours' | 'semaines' | 'mois';
export const UNITES_DUREE: UniteDuree[] = ['jours', 'semaines', 'mois'];

export type JourService = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
export const JOURS_SERVICE: JourService[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Personne affichée avec sa photo (gardien, propriétaire)
export interface GardienCourt {
  _id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  photoProfil: string;
}

export interface GardienAffecte extends GardienCourt {
  sexe: 'M' | 'F';
  telephonePrincipal: string;
  telephoneSecondaire: string;
  statut: string;
}

export interface ProprietaireAffectation {
  _id: string;
  nom: string;
  postnom: string;
  prenom: string;
  telephone: string;
  email: string;
  photo: string;
}

export interface ProprieteAffectee {
  _id: string;
  nomReference: string;
  typePropriete: string;
  commune: string;
  quartier: string;
  avenue: string;
  numero: string;
  photos: string[];
  proprietaire: ProprietaireAffectation | null;
  dateDebutAbonnement: string | null;
  dateExpirationAbonnement: string | null;
  statutAbonnement?: StatutAbonnement;
}

// Affectation liée par un remplacement (remplace / remplacePar)
export interface AffectationLiee {
  _id: string;
  role: RoleAffectation;
  dateDebut: string;
  dateFin: string;
  gardien: GardienCourt | null;
}

export interface AdminCourt {
  _id: string;
  nom: string;
  email?: string;
}

export interface Affectation {
  _id: string;
  statut: StatutAffectation;
  role: RoleAffectation;
  // 'HH:mm' ; heureFin < heureDebut = le service passe minuit. null pour d'anciennes affectations
  heureDebut: string | null;
  heureFin: string | null;
  // Jours où le service COMMENCE, dans l'ordre de la semaine
  joursService: JourService[];
  duree: number;
  uniteDuree: UniteDuree;
  dateDebut: string;
  // Calculée par le serveur
  dateFin: string;
  retireLe: string | null;
  motifRetrait: string;
  retirePar: AdminCourt | null;
  remplace: AffectationLiee | null;
  remplacePar: AffectationLiee | null;
  description: string;
  // null si le gardien ou la propriété n'existe plus
  gardien: GardienAffecte | null;
  propriete: ProprieteAffectee | null;
  adminEnregistreur?: AdminCourt | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AffectationFiltres {
  propriete?: string;
  gardien?: string;
  statut?: StatutAffectation;
  role?: RoleAffectation;
  // 'recent' : ordre chronologique inverse (historique)
  tri?: 'recent';
}

// Création : ne jamais envoyer dateFin, statut, retireLe, remplace, remplacePar.
// role absent = principal s'il n'y en a pas encore sur la période, sinon remplaçant.
export interface CreateAffectationPayload {
  propriete: string;
  gardien: string;
  duree: number;
  heureDebut: string;
  heureFin: string;
  uniteDuree: UniteDuree;
  joursService: JourService[];
  dateDebut?: string;
  role?: RoleAffectation;
  description?: string;
}

// Modification : le gardien et la propriété ne sont pas modifiables
export interface UpdateAffectationPayload {
  role?: RoleAffectation;
  heureDebut?: string;
  heureFin?: string;
  joursService?: JourService[];
  duree?: number;
  uniteDuree?: UniteDuree;
  dateDebut?: string;
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

interface RemplacementResponse {
  success: boolean;
  message?: string;
  affectation: Affectation;
  ancienneAffectation: string;
}

// Nom complet : prénom + nom + postnom
export function nomComplet(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined, defaut = 'Gardien supprimé'): string {
  if (!personne) {
    return defaut;
  }
  return [personne.prenom, personne.nom, personne.postnom].filter(Boolean).join(' ') || defaut;
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

export function roleLabel(role: RoleAffectation): string {
  return role === 'principal' ? 'Principal' : 'Remplaçant';
}

export function roleBadgeClass(role: RoleAffectation): string {
  return role === 'principal'
    ? 'bg-amber-100 text-amber-800 border border-amber-300'
    : 'bg-neutral-100 text-neutral-700 border border-neutral-300';
}

export function dureeLabel(duree: number, unite: UniteDuree): string {
  const singulier: Record<UniteDuree, string> = { jours: 'jour', semaines: 'semaine', mois: 'mois' };
  return `${duree} ${duree > 1 ? unite : singulier[unite]}`;
}

// '18:00' -> '18h00'
export function heureLabel(heure: string | null): string {
  return heure ? heure.replace(':', 'h') : '';
}

// Le service finit le lendemain (18:00 -> 06:00). Même heure = service de 24 h.
export function passeMinuit(heureDebut: string | null, heureFin: string | null): boolean {
  return !!heureDebut && !!heureFin && heureFin <= heureDebut;
}

// « 18h00 → 06h00 (+1 jour) »
export function horaireLabel(heureDebut: string | null, heureFin: string | null): string {
  if (!heureDebut || !heureFin) {
    return 'Horaire non défini';
  }
  if (heureDebut === heureFin) {
    return `24 h à partir de ${heureLabel(heureDebut)}`;
  }
  return `${heureLabel(heureDebut)} → ${heureLabel(heureFin)}${passeMinuit(heureDebut, heureFin) ? ' (+1 jour)' : ''}`;
}

export function joursLabel(jours: JourService[]): string {
  if (!jours?.length || jours.length === 7) {
    return 'Tous les jours';
  }
  return JOURS_SERVICE.filter((j) => jours.includes(j)).map((j) => j.charAt(0).toUpperCase() + j.slice(1)).join(', ');
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
    if (filtres.role) params = params.set('role', filtres.role);
    if (filtres.tri) params = params.set('tri', filtres.tri);
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

  // Départ du gardien : l'affectation passe en "expiree" et reste dans l'historique
  retirer(id: string, motif: string): Observable<AffectationResponse> {
    return this.http.patch<AffectationResponse>(`${this.baseUrl}/${id}/retirer`, motif ? { motif } : {});
  }

  remplacer(id: string, gardien: string, motif: string): Observable<RemplacementResponse> {
    return this.http.post<RemplacementResponse>(`${this.baseUrl}/${id}/remplacer`, motif ? { gardien, motif } : { gardien });
  }

  // Correction d'une erreur de saisie uniquement : l'affectation disparaît de l'historique
  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
