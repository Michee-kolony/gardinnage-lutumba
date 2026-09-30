import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Proprietaire } from './proprietaires.service';

export type TypePropriete = 'maison' | 'villa' | 'appartement' | 'immeuble' | 'bureau' | 'commerce' | 'autre';
export const TYPES_PROPRIETE: TypePropriete[] = ['maison', 'villa', 'appartement', 'immeuble', 'bureau', 'commerce', 'autre'];

export type NiveauSecurite = 'standard' | 'renforce' | 'haute surveillance';

// Calculé par le serveur à partir de dateExpirationAbonnement
export type StatutAbonnement = 'actif' | 'expire' | 'aucun';
export const NIVEAUX_SECURITE: NiveauSecurite[] = ['standard', 'renforce', 'haute surveillance'];

export interface Propriete {
  _id: string;
  // Vraie relation côté backend (populate sur toutes les routes de lecture/
  // écriture) : objet Proprietaire complet, sans mot de passe. Peut être
  // `null` si le compte propriétaire référencé a été supprimé depuis.
  proprietaire: Proprietaire | null;
  nomReference: string;
  typePropriete: TypePropriete;
  typeAutre: string;
  numeroParcelle: string;
  nombreBatiments: number | null;
  nombreNiveaux: number | null;
  commune: string;
  quartier: string;
  avenue: string;
  numero: string;
  referenceComplementaire: string;
  coordonnees: { lat: number | null; lng: number | null };
  lienCarte: string;
  nombreChambres: number | null;
  nombrePortesAcces: number | null;
  cloture: boolean;
  portail: boolean;
  garage: boolean;
  nombreVehicules: number | null;
  autresInformations: string;
  niveauSecurite: NiveauSecurite;
  cameras: boolean;
  nombreCameras: number;
  alarme: boolean;
  eclairageSecurite: boolean;
  interphone: boolean;
  autresEquipementsSecurite: string;
  // Lecture seule : fixées uniquement par l'enregistrement d'un paiement
  dateDebutAbonnement: string | null;
  dateExpirationAbonnement: string | null;
  // Id du paiement qui porte l'abonnement actuel (seul paiement dont la période est modifiable)
  dernierPaiement: string | null;
  statutAbonnement: StatutAbonnement;
  photos: string[];
  documentPropriete: string | null;
  autresDocuments: string[];
  createdAt: string;
  updatedAt: string;
}

// Utilisé à la fois pour l'ajout et la modification : les deux envoient les
// mêmes champs en multipart/form-data, seul le backend décide (à l'ajout,
// tous les champs obligatoires doivent être présents ; à la modification,
// seuls les champs envoyés sont appliqués).
export interface ProprietePayload {
  // Id du propriétaire sélectionné (relation réelle côté backend).
  proprietaire: string;
  nomReference: string;
  typePropriete: TypePropriete;
  typeAutre: string;
  numeroParcelle: string;
  nombreBatiments: number | null;
  nombreNiveaux: number | null;
  commune: string;
  quartier: string;
  avenue: string;
  numero: string;
  referenceComplementaire: string;
  lat: number | null;
  lng: number | null;
  lienCarte: string;
  nombreChambres: number | null;
  nombrePortesAcces: number | null;
  cloture: boolean;
  portail: boolean;
  garage: boolean;
  nombreVehicules: number | null;
  autresInformations: string;
  niveauSecurite: NiveauSecurite;
  cameras: boolean;
  nombreCameras: number;
  alarme: boolean;
  eclairageSecurite: boolean;
  interphone: boolean;
  autresEquipementsSecurite: string;
  photos: File[];
  documentPropriete: File | null;
  autresDocuments: File[];
}

const CHAMPS_BOOLEENS: (keyof ProprietePayload)[] = ['cloture', 'portail', 'garage', 'cameras', 'alarme', 'eclairageSecurite', 'interphone'];
const CHAMPS_FICHIERS_MULTIPLES: (keyof ProprietePayload)[] = ['photos', 'autresDocuments'];

// Mêmes limites que le backend (middleware/upload.js)
const TAILLE_MAX_PHOTO = 5 * 1024 * 1024;
const TAILLE_MAX_DOCUMENT = 10 * 1024 * 1024;

// Vérifie la taille des fichiers avant l'envoi : renvoie un message d'erreur, ou null si tout est bon
export function verifierTailleFichiers(payload: ProprietePayload): string | null {
  const photoTropLourde = payload.photos.find((f) => f.size > TAILLE_MAX_PHOTO);
  if (photoTropLourde) {
    return `La photo "${photoTropLourde.name}" dépasse 5 Mo.`;
  }
  const documents = [...(payload.documentPropriete ? [payload.documentPropriete] : []), ...payload.autresDocuments];
  const documentTropLourd = documents.find((f) => f.size > TAILLE_MAX_DOCUMENT);
  if (documentTropLourd) {
    return `Le document "${documentTropLourd.name}" dépasse 10 Mo.`;
  }
  return null;
}

// Statut d'abonnement tel que renvoyé par le serveur (jamais recalculé côté frontend)
export function statutAbonnement(propriete: Propriete): StatutAbonnement {
  return propriete.statutAbonnement ?? 'aucun';
}

export function statutAbonnementLabel(statut: StatutAbonnement): string {
  const labels: Record<StatutAbonnement, string> = { actif: 'Actif', expire: 'Expiré', aucun: 'Aucun abonnement' };
  return labels[statut];
}

export function statutAbonnementBadgeClass(statut: StatutAbonnement): string {
  const classes: Record<StatutAbonnement, string> = {
    actif: 'bg-green-100 text-green-700 border border-green-200',
    expire: 'bg-red-100 text-red-700 border border-red-200',
    aucun: 'bg-neutral-100 text-neutral-600 border border-neutral-200'
  };
  return classes[statut];
}

// Date au format JJ/MM/AAAA (les dates d'abonnement sont calculées en UTC par le serveur)
export function formatDateCourte(date: string | Date | null): string {
  if (!date) {
    return '';
  }
  return new Date(date).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}

// « Abonnement du JJ/MM/AAAA au JJ/MM/AAAA », ou '' si les dates ne sont pas connues
export function periodeAbonnementLabel(propriete: Propriete): string {
  if (!propriete.dateDebutAbonnement || !propriete.dateExpirationAbonnement) {
    return '';
  }
  return `Abonnement du ${formatDateCourte(propriete.dateDebutAbonnement)} au ${formatDateCourte(propriete.dateExpirationAbonnement)}`;
}

// Message lisible pour une erreur d'envoi. Le serveur (nginx) répond 413 sans en-têtes CORS
// quand l'ensemble des fichiers est trop lourd : le navigateur voit alors un statut 0.
export function messageErreurEnvoi(err: HttpErrorResponse, defaut: string): string {
  if (err.status === 413 || err.status === 0) {
    return "Envoi refusé par le serveur : les fichiers sont trop volumineux ou la connexion a échoué. Réduisez la taille ou le nombre de fichiers.";
  }
  return err.error?.message || defaut;
}

@Injectable({ providedIn: 'root' })
export class ProprietesService {
  private readonly baseUrl = `${environment.apiUrl}/api/proprietes`;

  constructor(private http: HttpClient) {}

  list(): Observable<{ success: boolean; total: number; proprietes: Propriete[] }> {
    return this.http.get<{ success: boolean; total: number; proprietes: Propriete[] }>(this.baseUrl);
  }

  getById(id: string): Observable<{ success: boolean; propriete: Propriete }> {
    return this.http.get<{ success: boolean; propriete: Propriete }>(`${this.baseUrl}/${id}`);
  }

  create(payload: ProprietePayload): Observable<{ success: boolean; message: string; propriete: Propriete }> {
    return this.http.post<{ success: boolean; message: string; propriete: Propriete }>(this.baseUrl, this.buildFormData(payload));
  }

  update(id: string, payload: ProprietePayload): Observable<{ success: boolean; message: string; propriete: Propriete }> {
    return this.http.put<{ success: boolean; message: string; propriete: Propriete }>(`${this.baseUrl}/${id}`, this.buildFormData(payload));
  }

  remove(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  private buildFormData(payload: ProprietePayload): FormData {
    const formData = new FormData();

    (Object.keys(payload) as (keyof ProprietePayload)[]).forEach((key) => {
      const value = payload[key];

      if (key === 'documentPropriete') {
        if (value instanceof File) {
          formData.append('documentPropriete', value);
        }
        return;
      }
      if (CHAMPS_FICHIERS_MULTIPLES.includes(key)) {
        (value as File[]).forEach((file) => formData.append(key, file));
        return;
      }
      if (CHAMPS_BOOLEENS.includes(key)) {
        formData.append(key, String(value));
        return;
      }
      if (value === null) {
        formData.append(key, '');
        return;
      }
      formData.append(key, value as string);
    });

    return formData;
  }
}
