import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type ProprietaireRole = 'PROPRIETAIRE' | 'GESTIONNAIRE' | 'MANDATAIRE' | 'LOCATAIRE';
export const PROPRIETAIRE_ROLES: ProprietaireRole[] = ['PROPRIETAIRE', 'GESTIONNAIRE', 'MANDATAIRE', 'LOCATAIRE'];

export type ProprietaireSexe = 'M' | 'F';
export const PROPRIETAIRE_SEXES: ProprietaireSexe[] = ['M', 'F'];

export interface Proprietaire {
  _id: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: ProprietaireSexe | null;
  profession: string;
  telephone: string;
  email: string;
  photo: string | null;
  adresse: string;
  role: ProprietaireRole;
  actif: boolean;
  dateInscription: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProprietairePayload {
  nom: string;
  postnom: string;
  prenom: string;
  sexe: ProprietaireSexe | null;
  profession: string;
  telephone: string;
  password: string;
  email: string;
  adresse: string;
  photo: File | null;
}

export interface UpdateProprietairePayload {
  nom: string;
  postnom: string;
  prenom: string;
  sexe: ProprietaireSexe | null;
  profession: string;
  telephone: string;
  email: string;
  adresse: string;
  password: string;
  role: ProprietaireRole;
  actif: boolean;
  photo: File | null;
}

@Injectable({ providedIn: 'root' })
export class ProprietairesService {
  private readonly baseUrl = `${environment.apiUrl}/api/proprietaires`;

  constructor(private http: HttpClient) {}

  list(): Observable<{ success: boolean; total: number; proprietaires: Proprietaire[] }> {
    return this.http.get<{ success: boolean; total: number; proprietaires: Proprietaire[] }>(this.baseUrl);
  }

  getById(id: string): Observable<{ success: boolean; proprietaire: Proprietaire }> {
    return this.http.get<{ success: boolean; proprietaire: Proprietaire }>(`${this.baseUrl}/${id}`);
  }

  // Endpoint public côté backend (pas de garde de rôle) : utilisé ici depuis
  // l'admin pour créer un compte propriétaire.
  create(payload: CreateProprietairePayload): Observable<{ success: boolean; message: string; proprietaire: Proprietaire }> {
    const formData = this.buildFormData(payload);
    return this.http.post<{ success: boolean; message: string; proprietaire: Proprietaire }>(
      `${this.baseUrl}/inscription`,
      formData
    );
  }

  update(id: string, payload: UpdateProprietairePayload): Observable<{ success: boolean; message: string; proprietaire: Proprietaire }> {
    const formData = this.buildFormData(payload);
    return this.http.put<{ success: boolean; message: string; proprietaire: Proprietaire }>(`${this.baseUrl}/${id}`, formData);
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  private buildFormData(payload: CreateProprietairePayload | UpdateProprietairePayload): FormData {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'photo') {
        if (value instanceof File) {
          formData.append('photo', value);
        }
        return;
      }
      // Le mot de passe vide (édition) ne doit pas écraser l'existant côté backend.
      if (key === 'password' && !value) {
        return;
      }
      // sexe est optionnel côté backend (enum M/F, pas de valeur '') : on
      // n'envoie rien tant que l'utilisateur n'a pas fait de choix.
      if (key === 'sexe' && !value) {
        return;
      }
      if (key === 'actif') {
        formData.append('actif', String(value));
        return;
      }
      formData.append(key, value as string);
    });

    return formData;
  }
}
