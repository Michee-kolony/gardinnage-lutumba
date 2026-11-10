import { Component, OnInit } from '@angular/core';

import { CompteursTelechargements, TelechargementsService } from '../../../core/telechargements.service';
import { CATALOGUE, FicheApplication, correspond, formatTelechargements } from '../store-catalogue';

// Page d'accueil de l'« Empire Store » : liste des applications avec recherche.
@Component({
  selector: 'app-store-accueil',
  templateUrl: './store-accueil.component.html',
})
export class StoreAccueilComponent implements OnInit {
  readonly applications = CATALOGUE;
  readonly filtres = ['Toutes', ...new Set(CATALOGUE.map((a) => a.public))];

  recherche = '';
  filtre = 'Toutes';
  compteurs: CompteursTelechargements = {};

  constructor(private telechargements: TelechargementsService) {}

  ngOnInit(): void {
    this.telechargements.compteurs().subscribe((c) => (this.compteurs = c));
  }

  get resultats(): FicheApplication[] {
    return this.applications.filter(
      (a) => (this.filtre === 'Toutes' || a.public === this.filtre) && correspond(a, this.recherche)
    );
  }

  effacerRecherche(): void {
    this.recherche = '';
  }

  nbTelechargements(app: FicheApplication): string {
    return formatTelechargements(this.compteurs[app.id]);
  }
}
