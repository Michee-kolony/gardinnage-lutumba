import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/auth.service';
import { iconeIncident, iconePropriete } from '../../../core/incidents-carte';
import {
  Incident,
  IncidentOptions,
  IncidentsService,
  PersonneIncident,
  PositionIncident,
  StatutIncident,
  adresseProprieteIncident,
  auteurIncidentLabel,
  dateHeureIncident,
  nomPersonne,
  photoPersonne,
  positionIncident,
  statutIncidentBadgeClass,
  styleGravite,
  telephonePersonne
} from '../../../core/incidents.service';
import { lienGoogleMaps } from '../../../core/presences.service';

interface ActionStatut {
  statut: StatutIncident;
  label: string;
  // Demande une confirmation (commentaire conseillé)
  confirmer: boolean;
  principale: boolean;
}

const ACTIONS: ActionStatut[] = [
  { statut: 'en_cours', label: 'Prendre en charge', confirmer: false, principale: true },
  { statut: 'resolu', label: 'Marquer résolu', confirmer: true, principale: true },
  { statut: 'classe', label: 'Classer sans suite', confirmer: true, principale: false },
  { statut: 'nouveau', label: 'Remettre à nouveau', confirmer: false, principale: false }
];

@Component({
  selector: 'app-incident-detail',
  templateUrl: './incident-detail.component.html'
})
export class IncidentDetailComponent implements OnInit, OnDestroy {
  @ViewChild('miniCarte') set miniCarteRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.conteneurCarte = ref?.nativeElement;
    this.dessinerCarte();
  }

  incident: Incident | null = null;
  options: IncidentOptions | null = null;
  loading = true;
  error = '';

  commentaire = '';
  gravite = '';
  enregistrement = false;
  erreurTraitement = '';
  succes = '';
  // Action en attente de confirmation (résolu / classé)
  confirmation: ActionStatut | null = null;
  confirmationSuppression = false;

  // Galerie plein écran
  photoOuverte: number | null = null;

  private conteneurCarte?: HTMLDivElement;
  private carte?: L.Map;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentsService: IncidentsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.incidentsService.options().subscribe({ next: (o) => (this.options = o), error: () => (this.options = null) });
    this.subscriptions.add(this.route.paramMap.subscribe((params) => this.charger(params.get('id') ?? '')));
    // Mise à jour faite ailleurs (bannière critique, carte) pendant que le détail est ouvert
    this.subscriptions.add(this.incidentsService.modification$.subscribe((m) => {
      if (m.type === 'maj' && m.incident._id === this.incident?._id) this.appliquer(m.incident, false);
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.carte?.remove();
  }

  charger(id: string): void {
    this.loading = true;
    this.error = '';
    this.incidentsService.getById(id).subscribe({
      next: (res) => {
        this.appliquer(res.incident, true);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.error?.message || 'Impossible de charger l’incident.';
        this.loading = false;
      }
    });
  }

  private appliquer(incident: Incident, reinitialiserSaisie: boolean): void {
    const positionChangee = !this.incident || JSON.stringify(positionIncident(this.incident)) !== JSON.stringify(positionIncident(incident));
    this.incident = incident;
    this.gravite = incident.gravite;
    if (reinitialiserSaisie) this.commentaire = incident.commentaireAdmin ?? '';
    if (positionChangee) {
      this.carte?.remove();
      this.carte = undefined;
    }
    this.dessinerCarte();
  }

  // --- Traitement ---

  get actions(): ActionStatut[] {
    return ACTIONS.filter((a) => a.statut !== this.incident?.statut);
  }

  get estSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get graviteModifiee(): boolean {
    return !!this.incident && this.gravite !== this.incident.gravite;
  }

  get commentaireModifie(): boolean {
    return !!this.incident && this.commentaire.trim() !== (this.incident.commentaireAdmin ?? '').trim();
  }

  declencher(action: ActionStatut): void {
    if (action.confirmer) {
      this.confirmation = action;
      return;
    }
    this.enregistrer({ statut: action.statut });
  }

  confirmerAction(): void {
    if (!this.confirmation) return;
    const statut = this.confirmation.statut;
    this.enregistrer({ statut, ...(this.commentaireModifie ? { commentaireAdmin: this.commentaire.trim() } : {}) });
  }

  // Enregistre la gravité et/ou le commentaire sans changer le statut
  enregistrerSaisie(): void {
    if (!this.graviteModifiee && !this.commentaireModifie) return;
    this.enregistrer({
      ...(this.graviteModifiee ? { gravite: this.gravite } : {}),
      ...(this.commentaireModifie ? { commentaireAdmin: this.commentaire.trim() } : {})
    });
  }

  private enregistrer(patch: { statut?: StatutIncident; gravite?: string; commentaireAdmin?: string }): void {
    if (!this.incident) return;
    this.enregistrement = true;
    this.erreurTraitement = '';
    this.succes = '';
    this.incidentsService.update(this.incident._id, patch).subscribe({
      next: (res) => {
        this.appliquer(res.incident, true);
        this.succes = res.message || 'Incident mis à jour';
        this.confirmation = null;
        this.enregistrement = false;
      },
      error: (err: HttpErrorResponse) => {
        this.erreurTraitement = err.error?.message || 'Impossible de mettre à jour l’incident.';
        this.enregistrement = false;
      }
    });
  }

  supprimer(): void {
    if (!this.incident) return;
    this.enregistrement = true;
    this.erreurTraitement = '';
    this.incidentsService.remove(this.incident._id).subscribe({
      next: () => this.router.navigate(['/admin/incidents']),
      error: (err: HttpErrorResponse) => {
        this.erreurTraitement = err.error?.message || 'Impossible de supprimer l’incident.';
        this.enregistrement = false;
      }
    });
  }

  retour(): void {
    this.router.navigate(['/admin/incidents']);
  }

  voirSurCarte(): void {
    if (this.incident) this.router.navigate(['/admin/dashboard'], { queryParams: { incident: this.incident._id } });
  }

  // --- Galerie ---

  ouvrirPhoto(index: number): void {
    this.photoOuverte = index;
  }

  photoSuivante(sens: 1 | -1, event?: Event): void {
    event?.stopPropagation();
    if (this.photoOuverte === null || !this.incident) return;
    const n = this.incident.photos.length;
    this.photoOuverte = (this.photoOuverte + sens + n) % n;
  }

  // --- Mini-carte ---

  get position(): PositionIncident | null {
    return this.incident ? positionIncident(this.incident) : null;
  }

  get lienCarte(): string {
    return lienGoogleMaps(this.position?.lat, this.position?.lng);
  }

  private dessinerCarte(): void {
    const incident = this.incident;
    const position = this.position;
    if (!this.conteneurCarte || !incident || !position) return;

    if (!this.carte) {
      this.carte = L.map(this.conteneurCarte, { center: [position.lat, position.lng], zoom: 16, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: 'abc',
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.carte);
      this.carte.attributionControl.setPrefix(false);
    }

    this.carte.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) this.carte!.removeLayer(layer);
    });

    const points: L.LatLngExpression[] = [[position.lat, position.lng]];
    L.marker([position.lat, position.lng], { icon: iconeIncident(incident) }).addTo(this.carte);
    if (position.source === 'gps' && position.precision) {
      const couleur = styleGravite(incident.gravite).couleur;
      L.circle([position.lat, position.lng], { radius: position.precision, color: couleur, fillColor: couleur, fillOpacity: 0.15, weight: 1 }).addTo(this.carte);
    }

    // Marqueur de la propriété si elle n'est pas au même endroit que le signalement
    const c = incident.propriete?.coordonnees;
    if (position.source === 'gps' && c && c.lat !== null && c.lng !== null && (c.lat !== position.lat || c.lng !== position.lng)) {
      L.marker([c.lat, c.lng], { icon: iconePropriete() })
        .bindTooltip(incident.propriete?.nomReference ?? 'Propriété', { direction: 'top', offset: [0, -12] })
        .addTo(this.carte);
      points.push([c.lat, c.lng]);
    }

    const carte = this.carte;
    requestAnimationFrame(() => {
      carte.invalidateSize();
      if (points.length > 1) carte.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    });
  }

  // --- Affichage ---

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined, defaut = '—'): string {
    return nomPersonne(personne, defaut);
  }

  telephone(personne: PersonneIncident | null | undefined): string {
    return telephonePersonne(personne);
  }

  photo(personne: PersonneIncident | null | undefined): string {
    return photoPersonne(personne);
  }

  auteur(incident: Incident): string {
    return auteurIncidentLabel(incident.signaleParModele);
  }

  adresse(incident: Incident): string {
    return adresseProprieteIncident(incident.propriete);
  }

  dateHeure(iso: string | null): string {
    return dateHeureIncident(iso);
  }

  graviteBadge(gravite: string): string {
    return styleGravite(gravite).badge;
  }

  statutBadge(statut: string): string {
    return statutIncidentBadgeClass(statut);
  }
}
