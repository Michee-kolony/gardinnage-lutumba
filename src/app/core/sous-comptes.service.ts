import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { TypePropriete } from './proprietes.service';

export type StatutSousCompte = 'libre' | 'occupe';

// Sous-compte locataire : un par logement d'une propriété (créé et supprimé
// automatiquement par le serveur selon `nombreLogements` de la propriété).
// Le locataire est inscrit par le propriétaire (simple fiche, sans connexion) ;
// l'administration ne fait que consulter.
export interface SousCompte {
  _id: string;
  proprietaire: string;
  propriete: {
    _id: string;
    nomReference: string;
    typePropriete: TypePropriete;
    commune: string;
    quartier: string;
    avenue: string;
    numero: string;
    nombreLogements: number;
  } | null;
  numero: number;
  libelle: string;
  nom?: string;
  postnom?: string;
  prenom?: string;
  telephone?: string;
  dateEntree?: string;
  // Calculé par le serveur : 'occupe' dès qu'un locataire est inscrit
  statut: StatutSousCompte;
  createdAt: string;
  updatedAt: string;
}

export interface SousComptesListe {
  success: boolean;
  total: number;
  occupes: number;
  libres: number;
  sousComptes: SousCompte[];
}

export function nomLocataire(sousCompte: SousCompte): string {
  return [sousCompte.prenom, sousCompte.nom, sousCompte.postnom].filter(Boolean).join(' ');
}

@Injectable({ providedIn: 'root' })
export class SousComptesService {
  private readonly baseUrl = `${environment.apiUrl}/api/sous-comptes`;

  constructor(private http: HttpClient) {}

  list(filtres: { propriete?: string; proprietaire?: string; statut?: StatutSousCompte } = {}): Observable<SousComptesListe> {
    let params = new HttpParams();
    Object.entries(filtres).forEach(([cle, valeur]) => {
      if (valeur) params = params.set(cle, valeur);
    });
    return this.http.get<SousComptesListe>(this.baseUrl, { params });
  }
}
