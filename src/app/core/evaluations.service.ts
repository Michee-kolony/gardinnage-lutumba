import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { GardienPresence, ProprietePresence } from './presences.service';

// Évaluation mensuelle d'un gardien, rédigée par le propriétaire ou par le gardien (auto-évaluation).
// L'administration voit toutes les évaluations (les deux côtés).
export type AuteurEvaluation = 'Proprietaire' | 'Gardien';

export interface Evaluation {
  _id: string;
  // Mois évalué, au format 'AAAA-MM'
  periode: string;
  commentaire: string;
  auteurModele: AuteurEvaluation;
  auteurNom: string;
  modifie: boolean;
  modifieLe: string | null;
  createdAt: string;
  updatedAt: string;
  gardien: GardienPresence | null;
  propriete: ProprietePresence | null;
}

export interface FiltresEvaluations {
  gardien?: string;
  propriete?: string;
  proprietaire?: string;
  // 'AAAA-MM'
  periode?: string;
  // 'proprietaire' | 'gardien'
  auteur?: 'proprietaire' | 'gardien';
}

// 'AAAA-MM' -> « octobre 2026 »
const FORMAT_MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
export function moisLabel(periode: string | null | undefined): string {
  if (!periode) return '';
  const [a, m] = periode.split('-').map(Number);
  return a && m ? FORMAT_MOIS.format(new Date(a, m - 1, 1)) : periode;
}

@Injectable({ providedIn: 'root' })
export class EvaluationsService {
  private readonly baseUrl = `${environment.apiUrl}/api/evaluations`;

  constructor(private http: HttpClient) {}

  list(filtres: FiltresEvaluations = {}): Observable<{ success: boolean; total: number; periodeCourante: string; evaluations: Evaluation[] }> {
    let params = new HttpParams();
    (Object.keys(filtres) as (keyof FiltresEvaluations)[]).forEach((cle) => {
      const valeur = filtres[cle];
      if (valeur) params = params.set(cle, valeur);
    });
    return this.http.get<{ success: boolean; total: number; periodeCourante: string; evaluations: Evaluation[] }>(this.baseUrl, { params });
  }

  // SUPER_ADMIN uniquement
  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
