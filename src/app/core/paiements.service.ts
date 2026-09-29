import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Propriete } from './proprietes.service';
import { Proprietaire } from './proprietaires.service';

export type ModePaiement = 'especes' | 'mobile_money' | 'virement' | 'carte' | 'cheque' | 'autre';
export type DevisePaiement = 'CDF' | 'USD';

export interface Paiement {
  _id: string;
  propriete: Propriete | string;
  proprietaire: Proprietaire | string;
  montant: number;
  devise: DevisePaiement;
  modePaiement: ModePaiement;
  referenceTransaction: string;
  periodeDebut: string | null;
  periodeFin: string | null;
  description: string;
  adminEnregistreur?: { _id: string; nom: string; email: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface PaiementPayload {
  propriete: string;
  montant: number;
  devise?: DevisePaiement;
  modePaiement: ModePaiement;
  periodeDebut: string | null;
  periodeFin: string | null;
  description: string;
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

@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private readonly baseUrl = `${environment.apiUrl}/api/paiements`;

  constructor(private http: HttpClient) {}

  list(): Observable<PaiementsResponse> {
    return this.http.get<PaiementsResponse>(this.baseUrl);
  }

  create(payload: PaiementPayload): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(this.baseUrl, payload);
  }
}