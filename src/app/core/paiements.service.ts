import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Propriete } from './proprietes.service';
import { Proprietaire } from './proprietaires.service';

export type ModePaiement = 'especes' | 'mobile_money' | 'virement' | 'carte' | 'cheque' | 'autre';
export type DevisePaiement = 'CDF' | 'USD';
export const MODES_PAIEMENT: ModePaiement[] = ['especes', 'mobile_money', 'virement', 'carte', 'cheque', 'autre'];

// Formules d'abonnement proposées : la durée est envoyée en mois (dureeMois)
export const DUREES_ABONNEMENT: { mois: number; label: string }[] = [
  { mois: 1, label: 'Mensuel (1 mois)' },
  { mois: 3, label: 'Trimestriel (3 mois)' },
  { mois: 12, label: 'Annuel (12 mois)' }
];

export function dureeAbonnementLabel(mois: number | null): string {
  if (!mois) return '—';
  return DUREES_ABONNEMENT.find((d) => d.mois === mois)?.label ?? `${mois} mois`;
}

// Abonnement de la propriété juste avant ce paiement (lecture seule, géré par le serveur ;
// null pour les paiements enregistrés avant son introduction). Ne jamais l'envoyer.
export interface AbonnementPrecedent {
  dateDebut: string | null;
  dateExpiration: string | null;
  paiement: string | null;
}

export interface Paiement {
  _id: string;
  propriete: Propriete | string;
  proprietaire: Proprietaire | string;
  montant: number;
  devise: DevisePaiement;
  modePaiement: ModePaiement;
  referenceTransaction: string;
  // Période fixée par le serveur : periodeFin = periodeDebut + dureeMois
  dureeMois: number | null;
  abonnementPrecedent?: AbonnementPrecedent | null;
  periodeDebut: string | null;
  periodeFin: string | null;
  description: string;
  adminEnregistreur?: { _id: string; nom: string; email: string } | string;
  createdAt: string;
  updatedAt: string;
}

// Création : le propriétaire et periodeFin sont déduits par le serveur, ne jamais les envoyer.
// periodeDebut absent = date du jour (utile seulement pour un paiement saisi en retard).
export interface PaiementPayload {
  propriete: string;
  dureeMois: number;
  montant: number;
  devise?: DevisePaiement;
  modePaiement: ModePaiement;
  periodeDebut?: string;
  description: string;
}

// Modification : dureeMois / periodeDebut acceptés seulement pour le paiement le plus
// récent de la propriété (propriete.dernierPaiement). La propriété n'est pas modifiable.
export interface PaiementUpdatePayload {
  montant: number;
  devise: DevisePaiement;
  modePaiement: ModePaiement;
  description: string;
  dureeMois?: number;
  periodeDebut?: string;
}

interface PaiementsResponse {
  success: boolean;
  total: number;
  paiements: Paiement[];
}

interface PaiementResponse {
  success: boolean;
  message: string;
  paiement: Paiement;
}

// Même calcul que le serveur (en UTC) : même jour du mois, ramené au dernier jour
// du mois si besoin (le 31 janvier + 1 mois donne le 28/29 février). Sert uniquement
// à l'aperçu : la période réelle est toujours celle renvoyée par le serveur.
export function ajouterMois(date: Date, mois: number): Date {
  const resultat = new Date(date);
  const jour = resultat.getUTCDate();
  resultat.setUTCDate(1);
  resultat.setUTCMonth(resultat.getUTCMonth() + mois);
  const dernierJour = new Date(Date.UTC(resultat.getUTCFullYear(), resultat.getUTCMonth() + 1, 0)).getUTCDate();
  resultat.setUTCDate(Math.min(jour, dernierJour));
  return resultat;
}

// Réponse 409 du serveur : un abonnement est déjà en cours pour la propriété
export interface ErreurAbonnementEnCours {
  success: false;
  message: string;
  abonnementEnCours: true;
  dateDebutAbonnement: string | null;
  dateExpirationAbonnement: string | null;
}

export function erreurAbonnementEnCours(err: HttpErrorResponse): ErreurAbonnementEnCours | null {
  return err.status === 409 && err.error?.abonnementEnCours ? (err.error as ErreurAbonnementEnCours) : null;
}

@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private readonly baseUrl = `${environment.apiUrl}/api/paiements`;

  constructor(private http: HttpClient) {}

  list(filtres: { propriete?: string; proprietaire?: string } = {}): Observable<PaiementsResponse> {
    let params = new HttpParams();
    if (filtres.propriete) params = params.set('propriete', filtres.propriete);
    if (filtres.proprietaire) params = params.set('proprietaire', filtres.proprietaire);
    return this.http.get<PaiementsResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<{ success: boolean; paiement: Paiement }> {
    return this.http.get<{ success: boolean; paiement: Paiement }>(`${this.baseUrl}/${id}`);
  }

  create(payload: PaiementPayload): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: PaiementUpdatePayload): Observable<PaiementResponse> {
    return this.http.put<PaiementResponse>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}