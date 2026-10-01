import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Gardien, GardiensService } from '../../core/gardiens.service';
import {
  FiltresIncidents,
  Incident,
  IncidentOptions,
  IncidentsService,
  StatutIncident,
  adresseProprieteIncident,
  auteurIncidentLabel,
  dateHeureIncident,
  nomPersonne,
  photoPersonne,
  positionIncident,
  statutIncidentBadgeClass,
  styleGravite,
  trierIncidents
} from '../../core/incidents.service';
import { dateIso } from '../../core/presences.service';
import { Propriete, ProprietesService } from '../../core/proprietes.service';

type Raccourci = 'tout' | 'jour' | '7j' | '30j' | 'mois';

@Component({
  selector: 'app-incidents',
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css'
})
export class IncidentsComponent implements OnInit, OnDestroy {
  readonly raccourcis: { id: Raccourci; label: string }[] = [
    { id: 'tout', label: 'Tout' },
    { id: 'jour', label: 'Aujourd’hui' },
    { id: '7j', label: '7 jours' },
    { id: '30j', label: '30 jours' },
    { id: 'mois', label: 'Ce mois' }
  ];

  options: IncidentOptions | null = null;
  optionsErreur = '';
  gardiens: Gardien[] = [];
  proprietes: Propriete[] = [];

  // Filtres partagés avec la carte du dashboard (IncidentsService.filtres$)
  filtres: FiltresIncidents = {};
  recherche = '';
  // Depuis le bandeau « incidents sans position » de la carte
  sansPosition = false;

  loading = false;
  error = '';
  // Incidents filtrés côté serveur, sauf le statut (filtré ici pour garder les compteurs par statut)
  incidents: Incident[] = [];
  nonTraites = 0;
  formulaireOuvert = false;

  private requete = 0;
  private subscriptions = new Subscription();

  constructor(
    private incidentsService: IncidentsService,
    private gardiensService: GardiensService,
    private proprietesService: ProprietesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.filtres = { ...this.incidentsService.filtres };
    this.sansPosition = this.route.snapshot.queryParamMap.get('sansPosition') === '1';
    this.chargerOptions();
    this.gardiensService.list().subscribe({ next: (res) => (this.gardiens = res.gardiens), error: () => (this.gardiens = []) });
    this.proprietesService.list().subscribe({ next: (res) => (this.proprietes = res.proprietes), error: () => (this.proprietes = []) });
    this.charger();

    this.subscriptions.add(this.incidentsService.suivi$.subscribe());
    this.subscriptions.add(this.incidentsService.rafraichissement$.subscribe(() => this.charger(true)));
    this.subscriptions.add(this.incidentsService.etat$.subscribe((etat) => (this.nonTraites = etat.nonTraites)));
    this.subscriptions.add(this.incidentsService.modification$.subscribe((m) => {
      if (m.type === 'suppression') {
        this.incidents = this.incidents.filter((i) => i._id !== m.id);
      } else if (m.type === 'maj') {
        this.incidents = this.incidents.map((i) => (i._id === m.incident._id ? m.incident : i));
      } else {
        this.charger(true);
      }
    }));
    // La carte du dashboard peut modifier les mêmes filtres
    this.subscriptions.add(this.incidentsService.filtres$.subscribe((f) => {
      if (JSON.stringify(f) !== JSON.stringify(this.filtres)) {
        this.filtres = { ...f };
        this.charger();
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  chargerOptions(): void {
    this.optionsErreur = '';
    this.incidentsService.options().subscribe({
      next: (options) => (this.options = options),
      error: (err: HttpErrorResponse) => (this.optionsErreur = err.error?.message || 'Impossible de charger les listes (types, gravités, statuts).')
    });
  }

  // silencieux = rafraîchissement automatique : pas d'indicateur, on garde les données en cas d'échec
  charger(silencieux = false): void {
    if (!silencieux) {
      this.error = '';
      this.loading = true;
    }
    const numero = ++this.requete;
    this.incidentsService.list({ ...this.filtres, statut: undefined }).subscribe({
      next: (res) => {
        if (numero !== this.requete) return;
        this.incidents = res.incidents;
        this.nonTraites = res.nonTraites;
        this.error = '';
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (numero !== this.requete) return;
        if (!silencieux || this.incidents.length === 0) {
          this.error = err.error?.message || 'Impossible de charger les incidents.';
        }
        this.loading = false;
      }
    });
  }

  appliquerFiltres(): void {
    this.incidentsService.setFiltres(this.filtres);
    this.charger();
  }

  // Le statut est filtré localement : pas besoin de recharger
  choisirStatut(statut: string): void {
    this.filtres = { ...this.filtres, statut: this.filtres.statut === statut ? undefined : statut };
    this.incidentsService.setFiltres(this.filtres);
  }

  onStatutChange(): void {
    this.incidentsService.setFiltres(this.filtres);
  }

  raccourci(type: Raccourci): void {
    const plage = this.plage(type);
    this.filtres = { ...this.filtres, du: plage.du || undefined, au: plage.au || undefined };
    this.appliquerFiltres();
  }

  raccourciActif(type: Raccourci): boolean {
    const plage = this.plage(type);
    return (this.filtres.du ?? '') === plage.du && (this.filtres.au ?? '') === plage.au;
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
    return Object.values(this.filtres).some(Boolean) || !!this.recherche || this.sansPosition;
  }

  reinitialiserFiltres(): void {
    this.filtres = {};
    this.recherche = '';
    this.retirerSansPosition();
    this.appliquerFiltres();
  }

  retirerSansPosition(): void {
    if (!this.sansPosition) return;
    this.sansPosition = false;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  // --- Données affichées ---

  get incidentsAffiches(): Incident[] {
    const terme = this.recherche.trim().toLocaleLowerCase('fr');
    return trierIncidents(this.incidents.filter((i) =>
      (!this.filtres.statut || i.statut === this.filtres.statut) &&
      (!this.sansPosition || !positionIncident(i)) &&
      (!terme ||
        i.description.toLocaleLowerCase('fr').includes(terme) ||
        (i.propriete?.nomReference ?? '').toLocaleLowerCase('fr').includes(terme) ||
        this.adresse(i).toLocaleLowerCase('fr').includes(terme))
    ));
  }

  compte(statut: StatutIncident): number {
    return this.incidents.filter((i) => i.statut === statut).length;
  }

  get critiquesNonTraites(): number {
    return this.incidents.filter((i) => i.statut === 'nouveau' && i.gravite === 'critique').length;
  }

  libelleStatut(valeur: string): string {
    return this.options?.statuts.find((s) => s.valeur === valeur)?.libelle ?? valeur;
  }

  // --- Navigation ---

  ouvrir(incident: Incident): void {
    this.router.navigate(['/admin/incidents', incident._id]);
  }

  voirSurCarte(incident: Incident, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/dashboard'], { queryParams: { incident: incident._id } });
  }

  onCree(incident: Incident): void {
    this.formulaireOuvert = false;
    this.ouvrir(incident);
  }

  // --- Affichage ---

  nom(personne: Incident['gardien'], defaut = '—'): string {
    return nomPersonne(personne, defaut);
  }

  photo(personne: Incident['gardien']): string {
    return photoPersonne(personne);
  }

  auteur(incident: Incident): string {
    return auteurIncidentLabel(incident.signaleParModele);
  }

  adresse(incident: Incident): string {
    return adresseProprieteIncident(incident.propriete);
  }

  dateHeure(iso: string): string {
    return dateHeureIncident(iso);
  }

  graviteBadge(gravite: string): string {
    return styleGravite(gravite).badge;
  }

  graviteBordure(gravite: string): string {
    return styleGravite(gravite).bordure;
  }

  statutBadge(statut: string): string {
    return statutIncidentBadgeClass(statut);
  }

  aPosition(incident: Incident): boolean {
    return !!positionIncident(incident);
  }
}
