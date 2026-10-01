import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { nomComplet } from '../../core/affectations.service';
import { AuthService } from '../../core/auth.service';
import { Gardien, GardiensService } from '../../core/gardiens.service';
import { dateIso, dateLocale, heureLocale } from '../../core/presences.service';
import { Propriete, ProprietesService } from '../../core/proprietes.service';
import {
  OBJETS_RAPPORT,
  ObjetRapport,
  Rapport,
  RapportsService,
  STATUTS_RAPPORT,
  StatutRapport,
  objetRapportBadgeClass,
  statutRapportBadgeClass,
  statutRapportLabel
} from '../../core/rapports.service';

type Raccourci = 'tout' | 'jour' | '7j' | '30j' | 'mois';

@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html'
})
export class RapportsComponent implements OnInit {
  readonly objets = OBJETS_RAPPORT;
  readonly statuts = STATUTS_RAPPORT;
  readonly raccourcis: { id: Raccourci; label: string }[] = [
    { id: 'tout', label: 'Tout' },
    { id: 'jour', label: 'Aujourd’hui' },
    { id: '7j', label: '7 jours' },
    { id: '30j', label: '30 jours' },
    { id: 'mois', label: 'Ce mois' }
  ];

  // Période (AAAA-MM-JJ, jours inclus) ; vide = tous les rapports
  du = '';
  au = '';
  filtreGardien = '';
  filtrePropriete = '';
  filtreObjet: ObjetRapport | '' = '';
  filtreStatut: StatutRapport | '' = '';
  recherche = '';

  gardiens: Gardien[] = [];
  proprietes: Propriete[] = [];

  loading = false;
  error = '';
  rapports: Rapport[] = [];
  nonLus = 0;
  private requete = 0;

  // Détail
  selection: Rapport | null = null;
  commentaire = '';
  enregistrement = false;
  erreurDetail = '';
  confirmationSuppression = false;

  constructor(
    private rapportsService: RapportsService,
    private gardiensService: GardiensService,
    private proprietesService: ProprietesService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gardiensService.list().subscribe({ next: (res) => (this.gardiens = res.gardiens), error: () => (this.gardiens = []) });
    this.proprietesService.list().subscribe({ next: (res) => (this.proprietes = res.proprietes), error: () => (this.proprietes = []) });
    this.charger();

    // Ouverture directe d'un rapport depuis le dashboard (?id=...)
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) {
      this.rapportsService.getById(id).subscribe({
        next: (res) => this.ouvrir(res.rapport),
        error: (err: HttpErrorResponse) => (this.error = err.error?.message || 'Rapport introuvable.')
      });
    }
  }

  charger(): void {
    this.error = '';
    this.loading = true;
    const numero = ++this.requete;
    this.rapportsService.list({
      du: this.du || undefined,
      au: this.au || undefined,
      gardien: this.filtreGardien || undefined,
      propriete: this.filtrePropriete || undefined,
      objet: this.filtreObjet || undefined,
      statut: this.filtreStatut || undefined
    }).subscribe({
      next: (res) => {
        if (numero !== this.requete) return;
        this.rapports = res.rapports;
        this.nonLus = res.nonLus;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (numero !== this.requete) return;
        this.error = err.error?.message || 'Impossible de charger les rapports.';
        this.loading = false;
      }
    });
  }

  raccourci(type: Raccourci): void {
    const plage = this.plage(type);
    this.du = plage.du;
    this.au = plage.au;
    this.charger();
  }

  raccourciActif(type: Raccourci): boolean {
    const plage = this.plage(type);
    return this.du === plage.du && this.au === plage.au;
  }

  private plage(type: Raccourci): { du: string; au: string } {
    if (type === 'tout') return { du: '', au: '' };
    const auj = new Date();
    let debut = new Date(auj);
    if (type === '7j') debut.setDate(auj.getDate() - 6);
    if (type === '30j') debut.setDate(auj.getDate() - 29);
    if (type === 'mois') debut = new Date(auj.getFullYear(), auj.getMonth(), 1);
    return { du: dateIso(debut), au: dateIso(auj) };
  }

  get filtresActifs(): boolean {
    return !!(this.filtreGardien || this.filtrePropriete || this.filtreObjet || this.filtreStatut || this.recherche || this.du || this.au);
  }

  reinitialiserFiltres(): void {
    this.du = '';
    this.au = '';
    this.filtreGardien = '';
    this.filtrePropriete = '';
    this.filtreObjet = '';
    this.filtreStatut = '';
    this.recherche = '';
    this.charger();
  }

  // Recherche texte locale (le serveur filtre déjà le reste)
  get rapportsFiltres(): Rapport[] {
    const terme = this.recherche.trim().toLowerCase();
    if (!terme) return this.rapports;
    return this.rapports.filter((r) =>
      this.nom(r.gardien).toLowerCase().includes(terme) ||
      (r.gardien?.matricule ?? '').toLowerCase().includes(terme) ||
      (r.propriete?.nomReference ?? '').toLowerCase().includes(terme) ||
      r.description.toLowerCase().includes(terme)
    );
  }

  // --- Détail ---

  ouvrir(rapport: Rapport): void {
    this.selection = rapport;
    this.commentaire = rapport.commentaireAdmin ?? '';
    this.erreurDetail = '';
    this.confirmationSuppression = false;
    // Ouvrir un nouveau rapport le marque comme lu
    if (rapport.statut === 'nouveau') {
      this.enregistrer('lu', false);
    }
  }

  fermer(): void {
    this.selection = null;
    if (this.route.snapshot.queryParamMap.has('id')) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  enregistrer(statut: StatutRapport, avecCommentaire = true): void {
    if (!this.selection) return;
    this.enregistrement = true;
    this.erreurDetail = '';
    this.rapportsService.changerStatut(this.selection._id, statut, avecCommentaire ? this.commentaire : undefined).subscribe({
      next: (res) => {
        const ancien = this.selection?.statut;
        this.selection = res.rapport;
        this.rapports = this.rapports.map((r) => (r._id === res.rapport._id ? res.rapport : r));
        if (ancien === 'nouveau' && statut !== 'nouveau') this.nonLus = Math.max(0, this.nonLus - 1);
        if (ancien !== 'nouveau' && statut === 'nouveau') this.nonLus += 1;
        this.enregistrement = false;
      },
      error: (err: HttpErrorResponse) => {
        this.erreurDetail = err.error?.message || 'Impossible de mettre à jour le rapport.';
        this.enregistrement = false;
      }
    });
  }

  supprimer(): void {
    if (!this.selection) return;
    const id = this.selection._id;
    const etaitNouveau = this.selection.statut === 'nouveau';
    this.enregistrement = true;
    this.rapportsService.remove(id).subscribe({
      next: () => {
        this.rapports = this.rapports.filter((r) => r._id !== id);
        if (etaitNouveau) this.nonLus = Math.max(0, this.nonLus - 1);
        this.enregistrement = false;
        this.fermer();
      },
      error: (err: HttpErrorResponse) => {
        this.erreurDetail = err.error?.message || 'Impossible de supprimer le rapport.';
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

  date(iso: string | null): string {
    return dateLocale(iso);
  }

  heure(iso: string | null): string {
    return heureLocale(iso);
  }

  objetBadge(objet: ObjetRapport): string {
    return objetRapportBadgeClass(objet);
  }

  statutBadge(statut: StatutRapport): string {
    return statutRapportBadgeClass(statut);
  }

  statutLabel(statut: StatutRapport): string {
    return statutRapportLabel(statut);
  }

  adresse(p: Rapport['propriete']): string {
    if (!p) return '';
    return [p.avenue && `${p.avenue} n° ${p.numero}`, p.quartier, p.commune].filter(Boolean).join(', ');
  }
}
