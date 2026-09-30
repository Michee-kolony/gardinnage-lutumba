import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { heureLabel, nomComplet, roleLabel } from '../../core/affectations.service';
import { Gardien, GardiensService } from '../../core/gardiens.service';
import {
  Absence,
  FiltresPeriode,
  LigneRapportGardien,
  Presence,
  PresencesService,
  RapportPresences,
  STATUTS_PRESENCE,
  StatutPresence,
  dateIso,
  dureeMinutesLabel,
  heureLocale,
  jourLabel,
  statutPresenceLabel
} from '../../core/presences.service';
import { Propriete, ProprietesService } from '../../core/proprietes.service';

type Onglet = 'tableau' | 'direct' | 'historique' | 'absences' | 'retards';
type ColonneTri = 'nom' | 'presences' | 'absences' | 'retards' | 'heuresTravaillees' | 'tauxPresence';

const RAFRAICHISSEMENT_DIRECT_MS = 60000;

@Component({
  selector: 'app-presences',
  templateUrl: './presences.component.html'
})
export class PresencesComponent implements OnInit, OnDestroy {
  readonly onglets: { id: Onglet; label: string }[] = [
    { id: 'tableau', label: 'Tableau de bord' },
    { id: 'direct', label: 'En direct' },
    { id: 'historique', label: 'Présences' },
    { id: 'absences', label: 'Absences' },
    { id: 'retards', label: 'Retards' }
  ];
  readonly statuts = STATUTS_PRESENCE;
  onglet: Onglet = 'tableau';

  // Période commune (AAAA-MM-JJ, jours inclus) et filtres
  du = '';
  au = '';
  filtreGardien = '';
  filtrePropriete = '';
  // Filtres de l'onglet Présences
  filtreStatut: StatutPresence | '' = '';
  filtreEnRetard = false;
  filtreHorsZone = false;

  gardiens: Gardien[] = [];
  proprietes: Propriete[] = [];

  loading = false;
  error = '';
  rapport: RapportPresences | null = null;
  presences: Presence[] = [];
  absences: Absence[] = [];
  enService: Presence[] = [];
  pasEncoreArrives: Absence[] = [];
  derniereMiseAJour: Date | null = null;

  tri: ColonneTri = 'heuresTravaillees';
  triDesc = true;

  private minuteur?: ReturnType<typeof setInterval>;
  private requete = 0;

  constructor(
    private presencesService: PresencesService,
    private gardiensService: GardiensService,
    private proprietesService: ProprietesService
  ) {}

  ngOnInit(): void {
    this.raccourci('30j', false);
    this.gardiensService.list().subscribe({ next: (res) => (this.gardiens = res.gardiens), error: () => (this.gardiens = []) });
    this.proprietesService.list().subscribe({ next: (res) => (this.proprietes = res.proprietes), error: () => (this.proprietes = []) });
    this.charger();
  }

  ngOnDestroy(): void {
    this.arreterMinuteur();
  }

  changerOnglet(onglet: Onglet): void {
    this.onglet = onglet;
    this.charger();
  }

  // Raccourcis de période (dates locales)
  raccourci(type: 'jour' | '7j' | '30j' | 'mois' | 'moisDernier', recharger = true): void {
    const plage = this.plage(type);
    this.du = plage.du;
    this.au = plage.au;
    if (recharger) this.charger();
  }

  raccourciActif(type: 'jour' | '7j' | '30j' | 'mois' | 'moisDernier'): boolean {
    const plage = this.plage(type);
    return this.du === plage.du && this.au === plage.au;
  }

  private plage(type: 'jour' | '7j' | '30j' | 'mois' | 'moisDernier'): { du: string; au: string } {
    const auj = new Date();
    let debut = new Date(auj);
    let fin = new Date(auj);
    if (type === '7j') debut.setDate(auj.getDate() - 6);
    if (type === '30j') debut.setDate(auj.getDate() - 29);
    if (type === 'mois') debut = new Date(auj.getFullYear(), auj.getMonth(), 1);
    if (type === 'moisDernier') {
      debut = new Date(auj.getFullYear(), auj.getMonth() - 1, 1);
      fin = new Date(auj.getFullYear(), auj.getMonth(), 0);
    }
    return { du: dateIso(debut), au: dateIso(fin) };
  }

  reinitialiserFiltres(): void {
    this.filtreGardien = '';
    this.filtrePropriete = '';
    this.filtreStatut = '';
    this.filtreEnRetard = false;
    this.filtreHorsZone = false;
    this.charger();
  }

  get filtresActifs(): boolean {
    return !!(this.filtreGardien || this.filtrePropriete || this.filtreStatut || this.filtreEnRetard || this.filtreHorsZone);
  }

  // Tableau de bord : clic sur un gardien -> historique filtré sur lui
  voirHistoriqueGardien(ligne: LigneRapportGardien): void {
    if (!ligne.gardien) return;
    this.filtreGardien = ligne.gardien._id;
    this.changerOnglet('historique');
  }

  charger(): void {
    this.arreterMinuteur();
    this.error = '';
    this.loading = true;
    const numero = ++this.requete;
    const periode: FiltresPeriode = {
      du: this.du,
      au: this.au,
      ...(this.filtreGardien ? { gardien: this.filtreGardien } : {}),
      ...(this.filtrePropriete ? { propriete: this.filtrePropriete } : {})
    };
    const echec = (err: HttpErrorResponse) => {
      if (numero !== this.requete) return;
      this.error = err.error?.message || 'Impossible de charger les présences.';
      this.loading = false;
    };
    const ok = () => {
      if (numero !== this.requete) return false;
      this.loading = false;
      this.derniereMiseAJour = new Date();
      return true;
    };

    switch (this.onglet) {
      case 'tableau':
        this.presencesService.rapport(periode).subscribe({ next: (res) => { if (ok()) this.rapport = res; }, error: echec });
        break;
      case 'historique':
        this.presencesService.list({
          ...periode,
          ...(this.filtreStatut ? { statut: this.filtreStatut } : {}),
          enRetard: this.filtreEnRetard,
          horsZone: this.filtreHorsZone
        }).subscribe({ next: (res) => { if (ok()) this.presences = res.presences; }, error: echec });
        break;
      case 'retards':
        this.presencesService.list({ ...periode, enRetard: true }).subscribe({ next: (res) => { if (ok()) this.presences = res.presences; }, error: echec });
        break;
      case 'absences':
        this.presencesService.absences(periode).subscribe({ next: (res) => { if (ok()) this.absences = res.absences; }, error: echec });
        break;
      case 'direct':
        this.chargerDirect(numero);
        this.minuteur = setInterval(() => this.chargerDirect(this.requete), RAFRAICHISSEMENT_DIRECT_MS);
        break;
    }
  }

  // En direct : services en cours + services commencés sans pointage aujourd'hui
  private chargerDirect(numero: number): void {
    const filtres = {
      ...(this.filtreGardien ? { gardien: this.filtreGardien } : {}),
      ...(this.filtrePropriete ? { propriete: this.filtrePropriete } : {})
    };
    const aujourdhui = dateIso(new Date());
    let restant = 2;
    const fin = () => {
      restant -= 1;
      if (restant === 0 && numero === this.requete) {
        this.loading = false;
        this.derniereMiseAJour = new Date();
      }
    };
    const echec = (err: HttpErrorResponse) => {
      if (numero === this.requete) this.error = err.error?.message || 'Impossible de charger les présences.';
      fin();
    };
    this.presencesService.list({ ...filtres, statut: 'en cours' }).subscribe({
      next: (res) => { if (numero === this.requete) this.enService = res.presences; fin(); },
      error: echec
    });
    this.presencesService.absences({ ...filtres, du: aujourdhui, au: aujourdhui }).subscribe({
      next: (res) => {
        if (numero === this.requete) this.pasEncoreArrives = res.absences.filter((a) => a.etat === 'pas encore arrive');
        fin();
      },
      error: echec
    });
  }

  private arreterMinuteur(): void {
    if (this.minuteur) {
      clearInterval(this.minuteur);
      this.minuteur = undefined;
    }
  }

  // --- Tableau par gardien (tri local sur les valeurs du serveur) ---

  trier(colonne: ColonneTri): void {
    if (this.tri === colonne) {
      this.triDesc = !this.triDesc;
    } else {
      this.tri = colonne;
      this.triDesc = colonne !== 'nom';
    }
  }

  get lignesTriees(): LigneRapportGardien[] {
    const lignes = [...(this.rapport?.parGardien ?? [])];
    const valeur = (l: LigneRapportGardien): string | number =>
      this.tri === 'nom' ? nomComplet(l.gardien).toLowerCase() : (l[this.tri] ?? -1);
    lignes.sort((a, b) => {
      const va = valeur(a);
      const vb = valeur(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return this.triDesc ? -cmp : cmp;
    });
    return lignes;
  }

  // --- Affichage ---

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined): string {
    return nomComplet(personne);
  }

  heure(value: string | null): string {
    return heureLocale(value);
  }

  jour(value: string): string {
    return jourLabel(value);
  }

  duree(minutes: number | null): string {
    return dureeMinutesLabel(minutes);
  }

  role(role: Absence['role']): string {
    return role ? roleLabel(role) : '—';
  }

  horairePrevu(a: Absence): string {
    return `${heureLocale(a.debutPrevu)} → ${heureLocale(a.finPrevue)}`;
  }

  statutLabel(statut: StatutPresence): string {
    return statutPresenceLabel(statut);
  }

  heureLabel(heure: string | null): string {
    return heureLabel(heure);
  }

  heures(valeur: number): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(valeur)} h`;
  }
}
