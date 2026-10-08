import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';

import { AffectationsService, GardienAffecte } from '../../../core/affectations.service';
import {
  FORMATS_VIDEO_INCIDENT,
  Incident,
  IncidentOptions,
  IncidentsService,
  MAX_PHOTOS_INCIDENT,
  MAX_VIDEOS_INCIDENT,
  TAILLE_MAX_VIDEO_INCIDENT,
  nomPersonne
} from '../../../core/incidents.service';
import { FORMATS_IMAGE_ACCEPT, verifierImage } from '../../../core/images';
import { Propriete, messageErreurEnvoi } from '../../../core/proprietes.service';

interface IncidentFormModel {
  type: string;
  description: string;
  propriete: string;
  gardien: string;
  // 'AAAA-MM-JJTHH:mm' (heure locale) ; '' = maintenant
  dateIncident: string;
  gravite: string;
  lat: number | null;
  lng: number | null;
  precision: number | null;
}

interface Apercu {
  fichier: File;
  url: string;
}

// Saisie par l'admin d'un incident reçu par téléphone (POST /incidents en multipart)
@Component({
  selector: 'app-incident-form',
  templateUrl: './incident-form.component.html'
})
export class IncidentFormComponent implements OnDestroy {
  @Input({ required: true }) options!: IncidentOptions;
  @Input() proprietes: Propriete[] = [];

  @Output() cree = new EventEmitter<Incident>();
  @Output() closed = new EventEmitter<void>();

  readonly maxPhotos = MAX_PHOTOS_INCIDENT;
  readonly formatsImage = FORMATS_IMAGE_ACCEPT;
  readonly maxVideos = MAX_VIDEOS_INCIDENT;

  form: IncidentFormModel = {
    type: '', description: '', propriete: '', gardien: '', dateIncident: '', gravite: '', lat: null, lng: null, precision: null
  };
  // La gravité suit le type choisi tant que l'admin ne l'a pas modifiée lui-même
  graviteModifiee = false;

  gardiens: GardienAffecte[] = [];
  gardiensLoading = false;
  gardiensErreur = '';

  photos: Apercu[] = [];
  videos: Apercu[] = [];

  submitting = false;
  formError = '';

  constructor(private incidentsService: IncidentsService, private affectationsService: AffectationsService) {}

  ngOnDestroy(): void {
    [...this.photos, ...this.videos].forEach((a) => URL.revokeObjectURL(a.url));
  }

  get maintenant(): string {
    const d = new Date();
    const deux = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}`;
  }

  get proprieteChoisie(): Propriete | undefined {
    return this.proprietes.find((p) => p._id === this.form.propriete);
  }

  onTypeChange(): void {
    if (!this.graviteModifiee) {
      this.form.gravite = this.options.graviteParDefaut[this.form.type] ?? '';
    }
  }

  onProprieteChange(): void {
    this.form.gardien = '';
    this.gardiens = [];
    this.gardiensErreur = '';
    if (!this.form.propriete) return;
    this.gardiensLoading = true;
    const propriete = this.form.propriete;
    this.affectationsService.list({ propriete, statut: 'en cours' }).subscribe({
      next: (res) => {
        if (propriete !== this.form.propriete) return;
        const parId = new Map<string, GardienAffecte>();
        res.affectations.forEach((a) => a.gardien && parId.set(a.gardien._id, a.gardien));
        this.gardiens = [...parId.values()];
        this.gardiensLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.gardiensErreur = err.error?.message || 'Impossible de charger les gardiens de cette propriété.';
        this.gardiensLoading = false;
      }
    });
  }

  utiliserPositionPropriete(): void {
    const c = this.proprieteChoisie?.coordonnees;
    if (c && c.lat !== null && c.lng !== null) {
      this.form.lat = c.lat;
      this.form.lng = c.lng;
      this.form.precision = null;
    }
  }

  get proprieteALocalisation(): boolean {
    const c = this.proprieteChoisie?.coordonnees;
    return !!c && c.lat !== null && c.lng !== null;
  }

  onPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichiers = Array.from(input.files ?? []);
    input.value = '';
    this.formError = '';
    for (const f of fichiers) {
      if (this.photos.length >= MAX_PHOTOS_INCIDENT) { this.formError = `${MAX_PHOTOS_INCIDENT} photos maximum.`; break; }
      const erreurImage = verifierImage(f);
      if (erreurImage) { this.formError = erreurImage; continue; }
      this.photos = [...this.photos, { fichier: f, url: URL.createObjectURL(f) }];
    }
  }

  onVideos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichiers = Array.from(input.files ?? []);
    input.value = '';
    this.formError = '';
    for (const f of fichiers) {
      if (this.videos.length >= MAX_VIDEOS_INCIDENT) { this.formError = `${MAX_VIDEOS_INCIDENT} vidéos maximum.`; break; }
      if (!FORMATS_VIDEO_INCIDENT.includes(f.type)) { this.formError = `« ${f.name} » : formats acceptés MP4, MOV, WEBM, 3GP.`; continue; }
      if (f.size > TAILLE_MAX_VIDEO_INCIDENT) { this.formError = `La vidéo « ${f.name} » dépasse 30 Mo.`; continue; }
      this.videos = [...this.videos, { fichier: f, url: URL.createObjectURL(f) }];
    }
  }

  retirerPhoto(index: number): void {
    URL.revokeObjectURL(this.photos[index].url);
    this.photos = this.photos.filter((_, i) => i !== index);
  }

  retirerVideo(index: number): void {
    URL.revokeObjectURL(this.videos[index].url);
    this.videos = this.videos.filter((_, i) => i !== index);
  }

  nom(g: GardienAffecte): string {
    return nomPersonne(g);
  }

  private valider(): string | null {
    if (!this.form.type) return 'Choisissez le type d’incident.';
    if (!this.form.propriete) return 'Choisissez la propriété concernée.';
    const longueur = this.form.description.trim().length;
    if (longueur < 5 || longueur > 5000) return 'La description doit contenir entre 5 et 5000 caractères.';
    if (this.form.dateIncident && new Date(this.form.dateIncident).getTime() > Date.now()) return 'La date de l’incident ne peut pas être dans le futur.';
    const aLat = this.form.lat !== null && this.form.lat !== undefined;
    const aLng = this.form.lng !== null && this.form.lng !== undefined;
    if (aLat !== aLng) return 'Renseignez la latitude et la longitude ensemble.';
    if (aLat && (Math.abs(this.form.lat!) > 90 || Math.abs(this.form.lng!) > 180)) return 'Coordonnées GPS invalides.';
    return null;
  }

  submit(): void {
    const erreur = this.valider();
    if (erreur) {
      this.formError = erreur;
      return;
    }
    this.submitting = true;
    this.formError = '';
    const aPosition = this.form.lat !== null && this.form.lng !== null;
    this.incidentsService.create({
      type: this.form.type,
      description: this.form.description.trim(),
      propriete: this.form.propriete,
      gardien: this.form.gardien,
      dateIncident: this.form.dateIncident ? new Date(this.form.dateIncident).toISOString() : '',
      gravite: this.form.gravite,
      lat: aPosition ? this.form.lat : null,
      lng: aPosition ? this.form.lng : null,
      precision: aPosition ? this.form.precision : null,
      photos: this.photos.map((a) => a.fichier),
      videos: this.videos.map((a) => a.fichier)
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        this.cree.emit(res.incident);
      },
      error: (err: HttpErrorResponse) => {
        this.formError = messageErreurEnvoi(err, 'Impossible d’enregistrer l’incident.');
        this.submitting = false;
      }
    });
  }

  close(): void {
    if (!this.submitting) this.closed.emit();
  }
}
