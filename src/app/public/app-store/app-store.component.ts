import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { TelechargementsService } from '../../core/telechargements.service';
import { CATALOGUE, FicheApplication, formatTelechargements, trouverApplication } from './store-catalogue';

interface EtapeInstallation {
  titre: string;
  texte: string;
}

/**
 * Fiche d'une application de l'« Empire Store » (/application/:id) :
 * téléchargement direct de l'APK, captures, fonctionnalités et compteur de téléchargements.
 */
@Component({
  selector: 'app-app-store',
  templateUrl: './app-store.component.html',
})
export class AppStoreComponent implements OnInit, OnDestroy {

  app!: FicheApplication;
  autres: FicheApplication[] = [];
  telechargements: number | undefined;

  isAndroid = false;
  downloadStarted = false;
  captureOuverte: number | null = null;

  private abonnement?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private compteurs: TelechargementsService,
  ) {}

  get etapes(): EtapeInstallation[] {
    return [
      { titre: 'Téléchargez le fichier', texte: 'Appuyez sur « Installer » depuis votre téléphone Android. Le fichier APK se télécharge.' },
      { titre: 'Ouvrez le fichier', texte: 'Ouvrez la notification de téléchargement ou le dossier « Téléchargements ».' },
      { titre: 'Autorisez l\'installation', texte: 'Si Android le demande, activez « Autoriser depuis cette source » pour votre navigateur.' },
      { titre: 'Installez et connectez-vous', texte: 'Appuyez sur « Installer », puis connectez-vous avec les identifiants fournis par Empire Security.' },
    ];
  }

  get nbTelechargements(): string {
    return formatTelechargements(this.telechargements);
  }

  ngOnInit(): void {
    this.isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

    // Même composant pour chaque appli : on réagit au changement d'id sans recharger la page
    this.abonnement = this.route.paramMap.subscribe((params) => {
      const app = trouverApplication(params.get('id'));
      if (!app) {
        void this.router.navigate(['/application'], { replaceUrl: true });
        return;
      }
      this.app = app;
      this.autres = CATALOGUE.filter((a) => a.id !== app.id);
      this.downloadStarted = false;
      this.captureOuverte = null;
      this.telechargements = undefined;
      this.compteurs.compteurs().subscribe((c) => {
        // Ne pas écraser un total plus récent reçu après un clic sur « Installer »
        if (this.app.id === app.id && this.telechargements === undefined) this.telechargements = c[app.id];
      });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    });
  }

  ngOnDestroy(): void {
    this.abonnement?.unsubscribe();
  }

  // Le lien <a download> lance le téléchargement ; on compte en parallèle sans bloquer.
  onDownload(): void {
    this.downloadStarted = true;
    const id = this.app.id;
    this.compteurs.enregistrer(id).subscribe((total) => {
      if (total !== null && this.app.id === id) this.telechargements = total;
    });
  }

  ouvrirCapture(index: number): void {
    this.captureOuverte = index;
  }

  fermerCapture(): void {
    this.captureOuverte = null;
  }

  captureSuivante(pas: number, event?: Event): void {
    event?.stopPropagation();
    if (this.captureOuverte === null) return;
    const n = this.app.captures.length;
    this.captureOuverte = (this.captureOuverte + pas + n) % n;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.captureOuverte === null) return;
    if (event.key === 'Escape') this.fermerCapture();
    if (event.key === 'ArrowRight') this.captureSuivante(1);
    if (event.key === 'ArrowLeft') this.captureSuivante(-1);
  }
}
