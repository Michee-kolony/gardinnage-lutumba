import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../environments/environment';

export type CompteursTelechargements = Partial<Record<string, number>>;

// Compteurs de téléchargements des applications du store (endpoints publics du backend).
@Injectable({ providedIn: 'root' })
export class TelechargementsService {
  private readonly baseUrl = `${environment.apiUrl}/api/telechargements`;

  constructor(private http: HttpClient) {}

  // En cas d'erreur réseau, le store reste utilisable : les compteurs ne s'affichent simplement pas.
  compteurs(): Observable<CompteursTelechargements> {
    return this.http
      .get<{ success: boolean; compteurs: CompteursTelechargements }>(this.baseUrl)
      .pipe(map((res) => res.compteurs), catchError(() => of({})));
  }

  // Appelé au clic sur « Installer ». Renvoie le nouveau total (ou null si le serveur est injoignable).
  enregistrer(application: string): Observable<number | null> {
    return this.http
      .post<{ success: boolean; total: number }>(`${this.baseUrl}/${application}`, {})
      .pipe(map((res) => res.total), catchError(() => of(null)));
  }
}
