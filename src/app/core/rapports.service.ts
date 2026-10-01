import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AffectationPresence, GardienPresence, ProprietePresence } from './presences.service';

// Rapports écrits par les gardiens pendant ou juste après leur service
export type ObjetRapport = 'simple' | 'incident' | 'maltraitance' | 'vol' | 'intrusion' | 'degat' | 'panne' | 'autre';
export type StatutRapport = 'nouveau' | 'lu' | 'traite';
export const STATUTS_RAPPORT: StatutRapport[] = ['nouveau', 'lu', 'traite'];

export const OBJETS_RAPPORT: { valeur: ObjetRapport; libelle: string }[] = [
  { valeur: 'simple', libelle: 'Rapport simple' },
  { valeur: 'incident', libelle: 'Incident' },
  { valeur: 'maltraitance', libelle: 'Maltraitance' },
  { valeur: 'vol', libelle: 'Vol' },
  { valeur: 'intrusion', libelle: 'Intrusion' },
  { valeur: 'degat', libelle: 'Dégât matériel' },
  { valeur: 'panne', libelle: 'Panne / problème technique' },
  { valeur: 'autre', libelle: 'Autre' }
];

export interface Rapport {
  _id: string;
  gardien: GardienPresence | null;
  propriete: ProprietePresence | null;
  affectation: Pick<AffectationPresence, '_id' | 'role' | 'heureDebut' | 'heureFin' | 'joursService'> | null;
  presence: { _id: string; jourService: string; debutPrevu: string; finPrevue: string; heureArrivee: string; heureDepart: string | null } | null;
  objet: ObjetRapport;
  objetLibelle: string;
  description: string;
  statut: StatutRapport;
  traitePar: { _id: string; nom: string } | null;
  traiteLe: string | null;
  commentaireAdmin: string;
  createdAt: string;
  updatedAt: string;
}

// du / au au format AAAA-MM-JJ (jours inclus)
export interface FiltresRapports {
  du?: string;
  au?: string;
  gardien?: string;
  propriete?: string;
  objet?: ObjetRapport;
  statut?: StatutRapport;
}

export function objetRapportLabel(objet: ObjetRapport): string {
  return OBJETS_RAPPORT.find((o) => o.valeur === objet)?.libelle ?? objet;
}

export function objetRapportBadgeClass(objet: ObjetRapport): string {
  if (objet === 'simple') return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
  if (objet === 'panne' || objet === 'autre') return 'bg-orange-100 text-orange-700 border border-orange-200';
  return 'bg-red-100 text-red-700 border border-red-200';
}

export function statutRapportLabel(statut: StatutRapport): string {
  const labels: Record<StatutRapport, string> = { nouveau: 'Nouveau', lu: 'Lu', traite: 'Traité' };
  return labels[statut];
}

export function statutRapportBadgeClass(statut: StatutRapport): string {
  const classes: Record<StatutRapport, string> = {
    nouveau: 'bg-blue-100 text-blue-700 border border-blue-200',
    lu: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    traite: 'bg-green-100 text-green-700 border border-green-200'
  };
  return classes[statut];
}

@Injectable({ providedIn: 'root' })
export class RapportsService {
  private readonly baseUrl = `${environment.apiUrl}/api/rapports`;

  constructor(private http: HttpClient) {}

  list(filtres: FiltresRapports = {}): Observable<{ success: boolean; total: number; nonLus: number; rapports: Rapport[] }> {
    let params = new HttpParams();
    (Object.keys(filtres) as (keyof FiltresRapports)[]).forEach((cle) => {
      const valeur = filtres[cle];
      if (valeur) params = params.set(cle, valeur);
    });
    return this.http.get<{ success: boolean; total: number; nonLus: number; rapports: Rapport[] }>(this.baseUrl, { params });
  }

  getById(id: string): Observable<{ success: boolean; rapport: Rapport }> {
    return this.http.get<{ success: boolean; rapport: Rapport }>(`${this.baseUrl}/${id}`);
  }

  changerStatut(id: string, statut: StatutRapport, commentaireAdmin?: string): Observable<{ success: boolean; message: string; rapport: Rapport }> {
    return this.http.patch<{ success: boolean; message: string; rapport: Rapport }>(`${this.baseUrl}/${id}/statut`, {
      statut,
      ...(commentaireAdmin !== undefined ? { commentaireAdmin } : {})
    });
  }

  // SUPER_ADMIN uniquement
  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
