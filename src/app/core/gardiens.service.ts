import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type Sexe = 'M' | 'F';
export const SEXES: Sexe[] = ['M', 'F'];

export type EtatCivil = 'celibataire' | 'marie' | 'divorce' | 'veuf';
export const ETATS_CIVILS: EtatCivil[] = ['celibataire', 'marie', 'divorce', 'veuf'];

export type StatutGardien = 'en service' | 'non en service';
export const STATUTS_GARDIEN: StatutGardien[] = ['en service', 'non en service'];

export interface Coordonnees {
  lat: number | null;
  lng: number | null;
}

export interface Commentaire {
  _id: string;
  photoProprietaire: string;
  nomProprietaire: string;
  contenu: string;
  dateAjout: string;
}

export interface Gardien {
  _id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  etatCivil: EtatCivil;
  photoProfil: string;
  telephonePrincipal: string;
  telephoneSecondaire: string;
  email: string;
  adresseActuelle: string;
  commune: string;
  quartier: string;
  avenue: string;
  statut: StatutGardien;
  coordonnees: Coordonnees;
  commentaires: Commentaire[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGardienPayload {
  nom: string;
  postnom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  etatCivil: EtatCivil;
  telephonePrincipal: string;
  telephoneSecondaire: string;
  email: string;
  password: string;
  adresseActuelle: string;
  commune: string;
  quartier: string;
  avenue: string;
  statut: StatutGardien;
  photo: File | null;
}

interface ListGardiensResponse {
  success: boolean;
  total: number;
  gardiens: Gardien[];
}

interface GetGardienResponse {
  success: boolean;
  gardien: Gardien;
}

interface CreateGardienResponse {
  success: boolean;
  message: string;
  gardien: Gardien;
}

interface UpdateStatutResponse {
  success: boolean;
  message: string;
  gardien: Gardien;
}

interface AddCommentaireResponse {
  success: boolean;
  message: string;
  commentaires: Commentaire[];
}

interface DeleteGardienResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class GardiensService {

  constructor(private http: HttpClient) {}

  list(): Observable<ListGardiensResponse> {
    return this.http.get<ListGardiensResponse>(`${environment.apiUrl}/api/gardiens/`);
  }

  getById(id: string): Observable<GetGardienResponse> {
    return this.http.get<GetGardienResponse>(`${environment.apiUrl}/api/gardiens/${id}`);
  }

  create(payload: CreateGardienPayload): Observable<CreateGardienResponse> {
    const formData = new FormData();
    formData.append('nom', payload.nom);
    formData.append('postnom', payload.postnom);
    formData.append('prenom', payload.prenom);
    formData.append('sexe', payload.sexe);
    formData.append('dateNaissance', payload.dateNaissance);
    formData.append('lieuNaissance', payload.lieuNaissance);
    formData.append('nationalite', payload.nationalite);
    formData.append('etatCivil', payload.etatCivil);
    formData.append('telephonePrincipal', payload.telephonePrincipal);
    formData.append('telephoneSecondaire', payload.telephoneSecondaire);
    formData.append('email', payload.email);
    formData.append('password', payload.password);
    formData.append('adresseActuelle', payload.adresseActuelle);
    formData.append('commune', payload.commune);
    formData.append('quartier', payload.quartier);
    formData.append('avenue', payload.avenue);
    formData.append('statut', payload.statut);

    if (payload.photo) {
      formData.append('photoProfil', payload.photo, payload.photo.name);
    }

    return this.http.post<CreateGardienResponse>(`${environment.apiUrl}/api/gardiens/inscription`, formData);
  }

  updateStatut(id: string, statut: StatutGardien): Observable<UpdateStatutResponse> {
    return this.http.patch<UpdateStatutResponse>(`${environment.apiUrl}/api/gardiens/${id}/statut`, { statut });
  }

  addCommentaire(id: string, nomProprietaire: string, contenu: string, photo: File | null): Observable<AddCommentaireResponse> {
    const formData = new FormData();
    formData.append('nomProprietaire', nomProprietaire);
    formData.append('contenu', contenu);

    if (photo) {
      formData.append('photoProprietaire', photo, photo.name);
    }

    return this.http.post<AddCommentaireResponse>(`${environment.apiUrl}/api/gardiens/${id}/commentaires`, formData);
  }

  remove(id: string): Observable<DeleteGardienResponse> {
    return this.http.delete<DeleteGardienResponse>(`${environment.apiUrl}/api/gardiens/${id}`);
  }
}
