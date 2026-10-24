import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { nomComplet } from '../../core/affectations.service';
import { AuthService } from '../../core/auth.service';
import { Gardien, GardiensService } from '../../core/gardiens.service';
import { dateLocale } from '../../core/presences.service';
import { Propriete, ProprietesService } from '../../core/proprietes.service';
import { Evaluation, EvaluationsService, moisLabel } from '../../core/evaluations.service';

// Une évaluation « des deux côtés » pour un (gardien, propriété, mois)
interface FicheEvaluation {
  cle: string;
  periode: string;
  gardien: Evaluation['gardien'];
  propriete: Evaluation['propriete'];
  proprietaire: Evaluation | null; // écrite par le propriétaire
  autoGardien: Evaluation | null;  // auto-évaluation du gardien
}

// Supervision des évaluations mensuelles des gardiens (propriétaire + auto-évaluation).
// L'administration voit tout ; le super admin peut supprimer une évaluation.
@Component({
  selector: 'app-evaluations',
  templateUrl: './evaluations.component.html'
})
export class EvaluationsComponent implements OnInit {
  readonly moisLabel = moisLabel;

  // Filtres
  filtreGardien = '';
  filtrePropriete = '';
  filtrePeriode = ''; // 'AAAA-MM'
  filtreAuteur: 'proprietaire' | 'gardien' | '' = '';
  recherche = '';

  gardiens: Gardien[] = [];
  proprietes: Propriete[] = [];

  loading = false;
  error = '';
  fiches: FicheEvaluation[] = [];
  periodeCourante = '';
  private requete = 0;

  // Suppression (super admin)
  suppression: Evaluation | null = null;
  enregistrement = false;
  erreurAction = '';

  constructor(
    private evaluationsService: EvaluationsService,
    private gardiensService: GardiensService,
    private proprietesService: ProprietesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.gardiensService.list().subscribe({ next: (res) => (this.gardiens = res.gardiens), error: () => (this.gardiens = []) });
    this.proprietesService.list().subscribe({ next: (res) => (this.proprietes = res.proprietes), error: () => (this.proprietes = []) });
    this.charger();
  }

  charger(): void {
    this.error = '';
    this.loading = true;
    const numero = ++this.requete;
    this.evaluationsService.list({
      gardien: this.filtreGardien || undefined,
      propriete: this.filtrePropriete || undefined,
      periode: this.filtrePeriode || undefined,
      auteur: this.filtreAuteur || undefined
    }).subscribe({
      next: (res) => {
        if (numero !== this.requete) return;
        this.periodeCourante = res.periodeCourante;
        this.fiches = this.grouper(res.evaluations);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (numero !== this.requete) return;
        this.error = err.error?.message || 'Impossible de charger les évaluations.';
        this.loading = false;
      }
    });
  }

  private grouper(evaluations: Evaluation[]): FicheEvaluation[] {
    const fiches = new Map<string, FicheEvaluation>();
    for (const e of evaluations) {
      if (!e.gardien || !e.propriete) continue;
      const cle = `${e.gardien._id}|${e.propriete._id}|${e.periode}`;
      let fiche = fiches.get(cle);
      if (!fiche) {
        fiche = { cle, periode: e.periode, gardien: e.gardien, propriete: e.propriete, proprietaire: null, autoGardien: null };
        fiches.set(cle, fiche);
      }
      if (e.auteurModele === 'Gardien') fiche.autoGardien = e;
      else fiche.proprietaire = e;
    }
    return [...fiches.values()].sort((a, b) => b.periode.localeCompare(a.periode));
  }

  get filtresActifs(): boolean {
    return !!(this.filtreGardien || this.filtrePropriete || this.filtrePeriode || this.filtreAuteur || this.recherche);
  }

  reinitialiserFiltres(): void {
    this.filtreGardien = '';
    this.filtrePropriete = '';
    this.filtrePeriode = '';
    this.filtreAuteur = '';
    this.recherche = '';
    this.charger();
  }

  // Recherche texte locale (nom du gardien, propriété, contenu)
  get fichesFiltrees(): FicheEvaluation[] {
    const terme = this.recherche.trim().toLowerCase();
    if (!terme) return this.fiches;
    return this.fiches.filter((f) =>
      this.nom(f.gardien).toLowerCase().includes(terme) ||
      (f.gardien?.matricule ?? '').toLowerCase().includes(terme) ||
      (f.propriete?.nomReference ?? '').toLowerCase().includes(terme) ||
      (f.proprietaire?.commentaire ?? '').toLowerCase().includes(terme) ||
      (f.autoGardien?.commentaire ?? '').toLowerCase().includes(terme)
    );
  }

  // --- Suppression (super admin) ---

  demanderSuppression(evaluation: Evaluation): void {
    this.suppression = evaluation;
    this.erreurAction = '';
  }

  annulerSuppression(): void {
    this.suppression = null;
  }

  confirmerSuppression(): void {
    if (!this.suppression) return;
    const id = this.suppression._id;
    this.enregistrement = true;
    this.erreurAction = '';
    this.evaluationsService.remove(id).subscribe({
      next: () => {
        this.enregistrement = false;
        this.suppression = null;
        this.charger();
      },
      error: (err: HttpErrorResponse) => {
        this.erreurAction = err.error?.message || 'Impossible de supprimer l’évaluation.';
        this.enregistrement = false;
      }
    });
  }

  // --- Affichage ---

  get estSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined, defaut?: string): string {
    return nomComplet(personne, defaut);
  }

  dateHeure(iso: string | null): string {
    return dateLocale(iso);
  }
}
