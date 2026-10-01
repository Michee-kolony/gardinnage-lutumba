import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { BarChartPoint } from './bar-chart/bar-chart.component';
import { DonutSegment } from './donut-chart/donut-chart.component';
import { Gardien, GardiensService, StatutGardien } from '../core/gardiens.service';
import { DevisePaiement, Paiement, PaiementsService } from '../core/paiements.service';
import { ProprietairesService } from '../core/proprietaires.service';
import { ProprietesService } from '../core/proprietes.service';
import { dateIso, heureLocale } from '../core/presences.service';
import { nomComplet } from '../core/affectations.service';
import { Rapport, RapportsService, objetRapportBadgeClass } from '../core/rapports.service';
import { creerClusterIncidents, iconeCluster, iconeIncident, popupIncidentHtml } from '../core/incidents-carte';
import {
  FiltresIncidents,
  Incident,
  IncidentOptions,
  IncidentsService,
  StatutIncident,
  adresseProprieteIncident,
  dateHeureIncident,
  positionIncident,
  statutIncidentBadgeClass,
  styleGravite,
  trierIncidents
} from '../core/incidents.service';

interface StatDef {
  label: string;
  value: string | number;
  hint: string;
  icon: string;
  emphasis: 'default' | 'dark';
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
}

interface ContratExpirant {
  proprieteId: string;
  proprietaire: string;
  photoUrl: string;
  maison: string;
  finContrat: string;
  joursRestants: number;
}

type PeriodeRapport = 'aujourdhui' | 'hier';

// Le popover du dashboard n'affiche que les rapports récents ; la page
// /admin/rapports donne accès à l'historique complet.
const JOURS_RAPPORTS_RECENTS = 7;

// Statuts affichés sur la carte quand « Afficher aussi résolus/classés » est décoché
const STATUTS_ACTIFS: StatutIncident[] = ['nouveau', 'en_cours'];

// Couleurs du donut « Statut des incidents » (sémantique : critique / en attente / bon / neutre)
const COULEURS_STATUT_DONUT: Record<string, string> = { nouveau: '#d03b3b', en_cours: '#fab219', resolu: '#0ca30c', classe: '#a3a3a3' };

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gardiensMap') mapContainer?: ElementRef<HTMLDivElement>;
  private map?: L.Map;

  constructor(
    private gardiensService: GardiensService,
    private paiementsService: PaiementsService,
    private proprietairesService: ProprietairesService,
    private proprietesService: ProprietesService,
    private rapportsService: RapportsService,
    private incidentsService: IncidentsService,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone
  ) {}

  // --- Incidents sur la carte ---
  incidentOptions: IncidentOptions | null = null;
  // Filtres partagés avec la page Incidents
  filtresIncidents: FiltresIncidents = {};
  afficherTraites = false;
  incidentsCarte: Incident[] = [];
  incidentsLoading = false;
  incidentsError = '';
  private incidentsRequete = 0;
  private incidentsSignature = '';
  private incidentsLayer?: L.LayerGroup;
  private incidentsCluster?: L.MarkerClusterGroup;
  private incidentsCercles?: L.LayerGroup;
  private marqueursIncidents = new Map<string, L.Marker>();
  private incidentParMarqueur = new WeakMap<L.Marker, Incident>();
  private popupIncidentId: string | null = null;
  private incidentAFocaliser: string | null = null;
  private gardiensCadres = false;
  private subscriptions = new Subscription();

  isRapportsModalOpen = false;
  rapportsSearchTerm = '';
  rapportsDateFilter: 'toutes' | PeriodeRapport = 'toutes';

  rapports: Rapport[] = [];
  rapportsNonLus = 0;
  rapportsLoading = false;
  rapportsError = '';

  // Gardiens réellement "en service" (chargés depuis le backend dans ngOnInit),
  // utilisés à la fois pour la rangée d'avatars et les marqueurs de la carte.
  gardiensEnService: Gardien[] = [];
  private mapInitialized = false;
  private markersLayer?: L.LayerGroup;

  gardiensStats: StatDef[] = [
    { label: 'Total gardiens', value: '—', hint: 'Effectif global', icon: 'shield', emphasis: 'dark', trend: 'neutral', trendValue: '' },
    { label: 'En service', value: '—', hint: 'Actuellement en poste', icon: 'check', emphasis: 'default', trend: 'neutral', trendValue: '' },
    { label: 'Gardiens masculins', value: '—', hint: 'Effectif masculin', icon: 'male', emphasis: 'default', trend: 'neutral', trendValue: '' },
    { label: 'Gardiens féminins', value: '—', hint: 'Effectif féminin', icon: 'female', emphasis: 'default', trend: 'neutral', trendValue: '' },
  ];

  activiteStats: StatDef[] = [
    { label: 'Propriétaires', value: '—', hint: 'Clients enregistrés', icon: 'users', emphasis: 'default', trend: 'neutral', trendValue: '' },
    { label: 'Propriétés sous surveillance', value: '—', hint: 'Sites actifs', icon: 'home', emphasis: 'default', trend: 'neutral', trendValue: '' },
    { label: 'Contrats actifs', value: 44, hint: 'En cours de validité', icon: 'file', emphasis: 'default', trend: 'neutral', trendValue: '' },
    { label: 'Contrats expirant bientôt', value: 6, hint: 'Sous 30 jours', icon: 'alert', emphasis: 'dark', trend: 'down', trendValue: 'À traiter' },
  ];

  financeStats: StatDef[] = [
    { label: 'Incidents signalés', value: '—', hint: 'Ce mois-ci', icon: 'alert', emphasis: 'default', trend: 'neutral', trendValue: '' },
    { label: 'Paiements reçus · CDF', value: '—', hint: 'Ce mois-ci', icon: 'cash', emphasis: 'dark', trend: 'neutral', trendValue: '' },
    { label: 'Paiements reçus · USD', value: '—', hint: 'Ce mois-ci', icon: 'cash', emphasis: 'default', trend: 'neutral', trendValue: '' },
  ];

  paiements: Paiement[] = [];

  // Calculés dans chargerStatsIncidents (6 derniers mois)
  incidentsData: BarChartPoint[] = [];

  // Répartition réelle des propriétés par statut de contrat (calculée dans
  // fetchProprietesCount, à partir de dateExpirationAbonnement).
  contratsSegments: DonutSegment[] = [
    { label: 'En cours', value: 0, strokeColor: '#16a34a' },
    { label: 'Arrive à expiration', value: 0, strokeColor: '#eab308' },
    { label: 'Expiré', value: 0, strokeColor: '#dc2626' },
  ];

  // Palette de statut (sémantique : bon / en attente / critique)
  incidentsSegments: DonutSegment[] = [];

  contratsExpirants: ContratExpirant[] = [];

  joursBadgeClass(jours: number): string {
    if (jours < 0) {
      return 'bg-red-100 text-red-700 border border-red-300';
    }
    if (jours <= 15) {
      return 'bg-orange-100 text-orange-700 border border-orange-300';
    }
    return 'bg-green-100 text-green-700 border border-green-300';
  }

  joursLabel(jours: number): string {
    if (jours < 0) {
      return `Expiré depuis ${Math.abs(jours)} j`;
    }
    return `${jours} j`;
  }

  get filteredRapports(): Rapport[] {
    const term = this.rapportsSearchTerm.trim().toLowerCase();
    const aujourdhui = dateIso(new Date());
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    const jourCible = this.rapportsDateFilter === 'aujourdhui' ? aujourdhui : this.rapportsDateFilter === 'hier' ? dateIso(hier) : '';

    return this.rapports.filter((r) => {
      const matchesTerm = !term ||
        this.nomGardien(r).toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.objetLibelle.toLowerCase().includes(term) ||
        (r.propriete?.nomReference ?? '').toLowerCase().includes(term);
      const matchesDate = !jourCible || dateIso(new Date(r.createdAt)) === jourCible;
      return matchesTerm && matchesDate;
    });
  }

  openRapportsModal(): void {
    this.rapportsSearchTerm = '';
    this.rapportsDateFilter = 'toutes';
    this.isRapportsModalOpen = true;
    this.fetchRapports();
  }

  closeRapportsModal(): void {
    this.isRapportsModalOpen = false;
  }

  voirTousLesRapports(): void {
    this.closeRapportsModal();
    this.router.navigate(['/admin/rapports']);
  }

  ouvrirRapport(rapport: Rapport): void {
    this.closeRapportsModal();
    this.router.navigate(['/admin/rapports'], { queryParams: { id: rapport._id } });
  }

  nomGardien(rapport: Rapport): string {
    return nomComplet(rapport.gardien);
  }

  dateRapport(iso: string): string {
    const jour = dateIso(new Date(iso));
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    const heure = heureLocale(iso);
    if (jour === dateIso(new Date())) return `Aujourd'hui, ${heure}`;
    if (jour === dateIso(hier)) return `Hier, ${heure}`;
    return `${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(iso))}, ${heure}`;
  }

  objetBadge(rapport: Rapport): string {
    return objetRapportBadgeClass(rapport.objet);
  }

  // Sondage périodique : permet de détecter automatiquement, sans rechargement
  // de page, qu'un gardien vient de se mettre en service (il apparaît alors
  // dans la rangée d'avatars et sur la carte) ou qu'il s'est déconnecté /
  // remis hors service (il en disparaît directement).
  private pollTimer?: ReturnType<typeof setInterval>;
  private static readonly POLL_INTERVAL_MS = 15000;
  private firstLoadDone = false;

  // Dernier statut connu de chaque gardien, pour détecter les transitions
  // vers "en service" d'un sondage à l'autre et jouer un son uniquement pour
  // ces nouvelles prises de service (pas au tout premier chargement).
  private knownStatuts = new Map<string, StatutGardien>();
  private audioContext?: AudioContext;

  ngOnInit(): void {
    this.fetchGardiens();
    this.fetchRapports();
    this.pollTimer = setInterval(() => {
      this.fetchGardiens();
      this.fetchRapports();
      this.fetchFinanceStats();
    }, DashboardComponent.POLL_INTERVAL_MS);
    this.fetchFinanceStats();
    this.fetchProprietairesCount();
    this.fetchProprietesCount();
    this.initIncidents();
  }

  ngAfterViewInit(): void {
    this.tryInitMap();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.financeAnimations.forEach((id) => cancelAnimationFrame(id));
    this.subscriptions.unsubscribe();
    this.map?.remove();
    this.audioContext?.close();
  }

  private fetchGardiens(): void {
    this.gardiensService.list().subscribe({
      next: (res) => {
        const enService = res.gardiens.filter((g) => g.statut === 'en service').length;
        const masculins = res.gardiens.filter((g) => g.sexe === 'M').length;
        const feminins = res.gardiens.filter((g) => g.sexe === 'F').length;

        this.gardiensStats[0].value = res.total;
        this.gardiensStats[1].value = enService;
        this.gardiensStats[1].trendValue = res.total > 0 ? `${Math.round((enService / res.total) * 100)}%` : '0%';
        this.gardiensStats[2].value = masculins;
        this.gardiensStats[2].trendValue = res.total > 0 ? `${Math.round((masculins / res.total) * 100)}%` : '0%';
        this.gardiensStats[3].value = feminins;
        this.gardiensStats[3].trendValue = res.total > 0 ? `${Math.round((feminins / res.total) * 100)}%` : '0%';

        // Remplace entièrement la liste à chaque sondage : un gardien qui n'est
        // plus "en service" (déconnexion, fin de service) disparaît donc
        // automatiquement de la rangée d'avatars et de la carte.
        this.gardiensEnService = res.gardiens.filter((g) => g.statut === 'en service');

        // Ne signale sonorement que les transitions détectées après le tout
        // premier chargement, pas les gardiens déjà en service à l'arrivée
        // sur le dashboard.
        let nouveauxEnService = false;
        res.gardiens.forEach((g) => {
          const ancienStatut = this.knownStatuts.get(g._id);
          if (this.firstLoadDone && ancienStatut && ancienStatut !== 'en service' && g.statut === 'en service') {
            nouveauxEnService = true;
          }
          this.knownStatuts.set(g._id, g.statut);
        });
        if (nouveauxEnService) {
          this.playServiceSound();
        }

        this.firstLoadDone = true;
        this.tryInitMap();
        this.renderMarkers();
      },
      error: () => {
        // Échec silencieux au-delà du tout premier chargement : on retentera
        // au prochain cycle de sondage plutôt que d'effacer les données déjà
        // affichées à l'écran pour un simple raté réseau ponctuel.
        if (!this.firstLoadDone) {
          this.gardiensStats[1].value = 0;
          this.gardiensStats[1].trendValue = '';
          this.gardiensStats[2].value = 0;
          this.gardiensStats[2].trendValue = '';
          this.gardiensStats[3].value = 0;
          this.gardiensStats[3].trendValue = '';
        }

        // La carte reste utilisable (vide) même si le chargement échoue.
        this.tryInitMap();
      }
    });
  }

  // Rapports des 7 derniers jours pour le popover, plus le nombre total de
  // rapports non lus (badge du bouton flottant), renvoyé par le serveur.
  private fetchRapports(): void {
    const debut = new Date();
    debut.setDate(debut.getDate() - (JOURS_RAPPORTS_RECENTS - 1));
    this.rapportsLoading = this.rapports.length === 0;
    this.rapportsService.list({ du: dateIso(debut), au: dateIso(new Date()) }).subscribe({
      next: (res) => {
        this.rapports = res.rapports;
        this.rapportsNonLus = res.nonLus;
        this.rapportsError = '';
        this.rapportsLoading = false;
      },
      error: () => {
        // Comme pour les gardiens : on garde les données déjà affichées en cas de raté ponctuel.
        if (this.rapports.length === 0) {
          this.rapportsError = 'Impossible de charger les rapports.';
        }
        this.rapportsLoading = false;
      }
    });
  }

  private fetchProprietairesCount(): void {
    this.proprietairesService.list().subscribe({
      next: (res) => {
        this.activiteStats[0].value = res.total;
      },
      error: () => {
        this.activiteStats[0].value = '—';
      }
    });
  }

  private fetchFinanceStats(): void {
    this.paiementsService.list().subscribe({
      next: (response) => {
        // Évite de redessiner le graphique des paiements à chaque sondage
        // quand rien n'a changé côté serveur.
        const signature = response.paiements.map((p) => `${p._id}:${p.updatedAt}`).join('|');
        if (signature !== this.paiementsSignature) {
          this.paiementsSignature = signature;
          this.paiements = response.paiements;
        }

        const maintenant = new Date();
        const moisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
        const duMois = (paiement: Paiement, reference: Date) => {
          const date = new Date(paiement.createdAt);
          return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
        };
        const paiementsDuMois = response.paiements.filter((p) => duMois(p, maintenant));
        const paiementsMoisPrecedent = response.paiements.filter((p) => duMois(p, moisPrecedent));

        (['CDF', 'USD'] as DevisePaiement[]).forEach((devise, index) => {
          const stat = this.financeStats[index + 1];
          const actuels = paiementsDuMois.filter((p) => p.devise === devise);
          const total = actuels.reduce((somme, p) => somme + p.montant, 0);
          const totalPrecedent = paiementsMoisPrecedent
            .filter((p) => p.devise === devise)
            .reduce((somme, p) => somme + p.montant, 0);

          this.animateFinanceAmount(index + 1, total, devise);

          const dernier = actuels.reduce<Paiement | null>(
            (plusRecent, p) => !plusRecent || p.createdAt > plusRecent.createdAt ? p : plusRecent,
            null
          );
          stat.hint = actuels.length === 0
            ? `Aucun paiement ce mois-ci · mois dernier : ${this.formatDashboardAmount(totalPrecedent, devise)}`
            : `${actuels.length} paiement(s) ce mois-ci · dernier ${this.dateRapport(dernier!.createdAt).toLowerCase()}`;

          if (totalPrecedent === 0) {
            stat.trend = total > 0 ? 'up' : 'neutral';
            stat.trendValue = total > 0 ? 'Nouveau' : '';
          } else {
            const variation = Math.round(((total - totalPrecedent) / totalPrecedent) * 100);
            stat.trend = variation > 0 ? 'up' : variation < 0 ? 'down' : 'neutral';
            stat.trendValue = `${variation > 0 ? '+' : ''}${variation}% vs mois dernier`;
          }
        });
      },
      error: () => {
        // Comme pour les gardiens : un raté ponctuel pendant le sondage ne
        // doit pas effacer les montants déjà affichés.
        if (this.financeLoaded) {
          return;
        }
        this.paiements = [];
        [1, 2].forEach((index) => {
          this.financeStats[index].value = '—';
          this.financeStats[index].hint = 'Données indisponibles';
          this.financeStats[index].trend = 'neutral';
          this.financeStats[index].trendValue = '';
        });
      }
    });
  }

  private paiementsSignature = '';
  private financeLoaded = false;
  private financeAmounts = new Map<number, number>();
  private financeAnimations = new Map<number, number>();

  // Fait défiler le montant affiché de l'ancienne valeur vers la nouvelle
  // (au premier chargement, puis à chaque nouveau paiement détecté par le sondage).
  private animateFinanceAmount(index: number, cible: number, devise: DevisePaiement): void {
    const depart = this.financeAmounts.get(index) ?? 0;
    this.financeAmounts.set(index, cible);
    const animationEnCours = this.financeAnimations.get(index);
    if (animationEnCours !== undefined) {
      cancelAnimationFrame(animationEnCours);
    }

    if (depart === cible) {
      this.financeStats[index].value = this.formatDashboardAmount(cible, devise);
      this.financeAnimations.delete(index);
      this.financeLoaded = true;
      return;
    }

    const duree = 900;
    const debut = performance.now();
    const etape = (instant: number) => {
      const progression = Math.min((instant - debut) / duree, 1);
      const adouci = 1 - Math.pow(1 - progression, 3);
      const valeur = progression < 1 ? Math.round(depart + (cible - depart) * adouci) : cible;
      this.financeStats[index].value = this.formatDashboardAmount(valeur, devise);
      if (progression < 1) {
        this.financeAnimations.set(index, requestAnimationFrame(etape));
      } else {
        this.financeAnimations.delete(index);
      }
    };
    this.financeAnimations.set(index, requestAnimationFrame(etape));
    this.financeLoaded = true;
  }

  private formatDashboardAmount(amount: number, devise: DevisePaiement): string {
    const valeur = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount);
    return devise === 'USD' ? `$ ${valeur}` : `${valeur} CDF`;
  }

  // Charge les propriétés une seule fois pour alimenter à la fois la stat
  // "Propriétés sous surveillance" et la liste des contrats arrivant à
  // expiration (les deux viennent du même endpoint).
  private fetchProprietesCount(): void {
    this.proprietesService.list().subscribe({
      next: (res) => {
        this.activiteStats[1].value = res.total;

        const maintenant = new Date();
        const echeances = res.proprietes
          .filter((p) => !!p.dateExpirationAbonnement)
          .map((p) => {
            const dateExpiration = new Date(p.dateExpirationAbonnement as string);
            const joursRestants = Math.ceil((dateExpiration.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24));
            const nomProprietaire = p.proprietaire ? `${p.proprietaire.prenom} ${p.proprietaire.nom}` : 'Propriétaire inconnu';

            return {
              proprieteId: p._id,
              proprietaire: nomProprietaire,
              photoUrl: p.proprietaire?.photo || `https://ui-avatars.com/api/?background=e5e5e5&color=737373&name=${encodeURIComponent(nomProprietaire)}`,
              maison: p.nomReference,
              finContrat: this.formatDate(p.dateExpirationAbonnement as string),
              joursRestants
            };
          })
          .sort((a, b) => a.joursRestants - b.joursRestants);

        this.contratsExpirants = echeances.slice(0, 8);

        // Nouvelle référence de tableau (et de chaque segment) : DonutChartComponent
        // ne recalcule son rendu que dans ngOnChanges, qui ne se déclenche que sur
        // un changement de référence de @Input(), pas sur une simple mutation.
        this.contratsSegments = [
          { label: 'En cours', value: echeances.filter((c) => c.joursRestants > 15).length, strokeColor: '#16a34a' },
          { label: 'Arrive à expiration', value: echeances.filter((c) => c.joursRestants >= 0 && c.joursRestants <= 15).length, strokeColor: '#eab308' },
          { label: 'Expiré', value: echeances.filter((c) => c.joursRestants < 0).length, strokeColor: '#dc2626' },
        ];
      },
      error: () => {
        this.activiteStats[1].value = '—';
        this.contratsExpirants = [];
        this.contratsSegments = this.contratsSegments.map((segment) => ({ ...segment, value: 0 }));
      }
    });
  }

  private formatDate(value: string): string {
    try {
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
    } catch {
      return value;
    }
  }

  openPropriete(proprieteId: string): void {
    this.router.navigate(['/admin/proprietes', proprieteId]);
  }

  // La vue (conteneur de la carte) et la réponse HTTP (gardiens en service)
  // arrivent chacune de façon asynchrone, dans un ordre non garanti : on ne
  // construit la carte qu'une fois que les deux sont disponibles.
  private tryInitMap(): void {
    if (this.mapInitialized || !this.mapContainer) {
      return;
    }
    this.mapInitialized = true;
    this.initMap();
  }

  private initMap(): void {
    if (!this.mapContainer) {
      return;
    }

    // Vraie carte de Kinshasa (tuiles CARTO Dark Matter, thème sombre assorti à
    // l'interface). Pas de clé API requise ; nécessite une connexion internet
    // côté navigateur pour charger les tuiles.
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [-4.3372, 15.3225],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Retire le logo/lien "Leaflet" du contrôle d'attribution ; on garde le
    // crédit OpenStreetMap, requis par leur licence.
    this.map.attributionControl.setPrefix(false);

    this.markersLayer = L.layerGroup().addTo(this.map);

    // Calque « Incidents » séparé des gardiens : marqueurs regroupés + cercles de précision GPS
    this.incidentsCercles = L.layerGroup();
    this.incidentsCluster = creerClusterIncidents({
      maxClusterRadius: 45,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const graviteMax = cluster.getAllChildMarkers()
          .map((m) => this.incidentParMarqueur.get(m)?.gravite ?? '')
          .reduce((max, g) => (styleGravite(g).ordre > styleGravite(max).ordre ? g : max), '');
        return iconeCluster(cluster.getChildCount(), graviteMax);
      }
    });
    this.incidentsLayer = L.layerGroup([this.incidentsCercles, this.incidentsCluster]).addTo(this.map);
    L.control.layers(undefined, {
      'Gardiens en service': this.markersLayer,
      'Incidents': this.incidentsLayer
    }, { collapsed: true, position: 'topright' }).addTo(this.map);

    this.map.on('popupclose', () => (this.popupIncidentId = null));
    window.addEventListener('resize', () => this.map?.invalidateSize());

    // Au cas où les données des gardiens étaient déjà arrivées avant que la
    // carte n'existe (ou inversement), on dessine les marqueurs tout de suite.
    this.renderMarkers();
    this.renderIncidents();
    // ?incident=<id> : si la liste est déjà arrivée avant la carte, on centre maintenant
    if (this.incidentAFocaliser && !this.incidentsLoading) {
      this.focaliserParId(this.incidentAFocaliser);
    }
  }

  // Reconstruit les marqueurs à partir de gardiensEnService. Appelée à chaque
  // fois que les données changent, indépendamment de la création de la carte
  // (les deux arrivent de façon asynchrone, dans un ordre non garanti).
  private renderMarkers(): void {
    if (!this.map || !this.markersLayer) {
      return;
    }

    this.markersLayer.clearLayers();

    // Seuls les gardiens en service ET ayant une position enregistrée peuvent
    // être placés sur la carte (coordonnees.lat/lng sont nullable côté backend).
    const gardiensLocalises = this.gardiensEnService.filter(
      (g): g is Gardien & { coordonnees: { lat: number; lng: number } } =>
        g.coordonnees.lat !== null && g.coordonnees.lng !== null
    );

    const markers: L.Marker[] = gardiensLocalises.map((gardien) => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:40px;height:40px;">
            <img src="${gardien.photoProfil}" alt="${gardien.nom}"
              style="width:40px;height:40px;border-radius:9999px;object-fit:cover;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.5);" />
            <span style="position:absolute;bottom:-1px;right:-1px;width:12px;height:12px;border-radius:9999px;background:#22c55e;border:2px solid #ffffff;"></span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      return L.marker([gardien.coordonnees.lat, gardien.coordonnees.lng], { icon })
        .addTo(this.markersLayer!)
        .bindPopup(this.buildAgentPopup(gardien), { minWidth: 220 })
        .bindTooltip(`${gardien.commune} — ${gardien.quartier}`, {
          permanent: true,
          direction: 'bottom',
          offset: [0, 4],
          className: 'zone-label',
        });
    });

    if (markers.length === 0 || this.gardiensCadres || this.incidentAFocaliser) {
      // Aucun gardien localisé pour le moment : on garde la vue par défaut
      // (centrée sur Kinshasa) plutôt que de cadrer sur des bornes vides.
      // Le cadrage automatique n'a lieu qu'une fois, pour ne pas annuler à
      // chaque sondage un zoom fait par l'admin (ex. sur un incident).
      return;
    }
    this.gardiensCadres = true;

    const bounds = L.featureGroup(markers).getBounds();

    // On NE cadre PAS la vue tant que le conteneur n'a pas sa taille finale : si le
    // calcul de zoom se fait sur un conteneur à 0x0 (layout Angular pas encore
    // stabilisé), Leaflet produit un zoom invalide et la carte reste mal affichée.
    // On attend donc explicitement une taille mesurable avant tout fitBounds.
    const fitWhenReady = (): void => {
      if (!this.map) {
        return;
      }
      const size = this.map.getSize();
      if (size.x === 0 || size.y === 0) {
        requestAnimationFrame(fitWhenReady);
        return;
      }
      this.map.invalidateSize();
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    };

    requestAnimationFrame(fitWhenReady);
  }

  // Bip natif à deux tons généré via l'API Web Audio (aucun fichier son requis),
  // joué lorsqu'un gardien vient de se mettre en service.
  private playServiceSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      [880, 1175].forEach((frequence, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const debut = now + index * 0.14;

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequence, debut);

        gain.gain.setValueAtTime(0, debut);
        gain.gain.linearRampToValueAtTime(0.2, debut + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, debut + 0.18);

        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(debut);
        oscillator.stop(debut + 0.2);
      });
    } catch {
      // Lecture audio indisponible (permissions navigateur, etc.) : on
      // n'interrompt pas l'affichage pour autant.
    }
  }

  // ===================== Incidents =====================

  private initIncidents(): void {
    this.filtresIncidents = { ...this.incidentsService.filtres };
    this.incidentAFocaliser = this.route.snapshot.queryParamMap.get('incident');
    this.incidentsService.options().subscribe({
      next: (options) => {
        this.incidentOptions = options;
        this.majDonutIncidents();
      },
      error: () => (this.incidentOptions = null)
    });
    this.chargerIncidentsCarte();
    this.chargerStatsIncidents();

    // Suivi (polling 30 s) tant que le dashboard est affiché
    this.subscriptions.add(this.incidentsService.suivi$.subscribe());
    this.subscriptions.add(this.incidentsService.rafraichissement$.subscribe(() => {
      this.chargerIncidentsCarte(true);
      this.chargerStatsIncidents();
    }));
    // Après un PATCH / DELETE / POST : carte (couleur, pulsation) mise à jour sans recharger
    this.subscriptions.add(this.incidentsService.modification$.subscribe((m) => {
      if (m.type === 'suppression') {
        this.incidentsCarte = this.incidentsCarte.filter((i) => i._id !== m.id);
      } else if (m.type === 'maj') {
        this.incidentsCarte = this.incidentsCarte.map((i) => (i._id === m.incident._id ? m.incident : i));
      } else {
        this.chargerIncidentsCarte(true);
        return;
      }
      this.renderIncidents();
      this.chargerStatsIncidents();
    }));
    // Filtres modifiés depuis la page Incidents
    this.subscriptions.add(this.incidentsService.filtres$.subscribe((f) => {
      if (JSON.stringify(f) !== JSON.stringify(this.filtresIncidents)) {
        this.filtresIncidents = { ...f };
        this.chargerIncidentsCarte();
      }
    }));
  }

  chargerIncidentsCarte(silencieux = false): void {
    if (!silencieux) {
      this.incidentsLoading = true;
      this.incidentsError = '';
    }
    const numero = ++this.incidentsRequete;
    this.incidentsService.list(this.filtresIncidents).subscribe({
      next: (res) => {
        if (numero !== this.incidentsRequete) return;
        this.incidentsCarte = res.incidents;
        this.incidentsError = '';
        this.incidentsLoading = false;
        this.renderIncidents();
        if (this.incidentAFocaliser) this.focaliserParId(this.incidentAFocaliser);
      },
      error: (err: HttpErrorResponse) => {
        if (numero !== this.incidentsRequete) return;
        if (!silencieux || this.incidentsCarte.length === 0) {
          this.incidentsError = err.error?.message || 'Impossible de charger les incidents.';
        }
        this.incidentsLoading = false;
      }
    });
  }

  appliquerFiltresIncidents(): void {
    this.incidentsService.setFiltres(this.filtresIncidents);
    this.chargerIncidentsCarte();
  }

  basculerTraites(): void {
    this.afficherTraites = !this.afficherTraites;
    this.renderIncidents();
  }

  get filtresIncidentsActifs(): boolean {
    return Object.values(this.filtresIncidents).some(Boolean);
  }

  reinitialiserFiltresIncidents(): void {
    this.filtresIncidents = {};
    this.appliquerFiltresIncidents();
  }

  // Incidents retenus pour la carte et la liste latérale (même tri que la page Incidents)
  get incidentsVisibles(): Incident[] {
    const tous = !!this.filtresIncidents.statut || this.afficherTraites;
    return trierIncidents(this.incidentsCarte.filter((i) => tous || STATUTS_ACTIFS.includes(i.statut)));
  }

  get incidentsSansPosition(): number {
    return this.incidentsVisibles.filter((i) => !positionIncident(i)).length;
  }

  voirIncidentsSansPosition(): void {
    this.router.navigate(['/admin/incidents'], { queryParams: { sansPosition: 1 } });
  }

  voirIncident(incident: Incident): void {
    this.router.navigate(['/admin/incidents', incident._id]);
  }

  private renderIncidents(): void {
    if (!this.map || !this.incidentsCluster || !this.incidentsCercles) {
      return;
    }
    const visibles = this.incidentsVisibles;
    // Rien n'a changé depuis le dernier sondage : on ne redessine pas (popup ouvert conservé)
    const signature = visibles.map((i) => `${i._id}:${i.updatedAt}`).join('|');
    if (signature === this.incidentsSignature) {
      return;
    }
    this.incidentsSignature = signature;

    // clearLayers ferme le popup (popupclose remet popupIncidentId à null) : on le mémorise avant
    const idPopupOuvert = this.popupIncidentId;
    this.incidentsCluster.clearLayers();
    this.incidentsCercles.clearLayers();
    this.marqueursIncidents.clear();

    const marqueurs: L.Marker[] = [];
    visibles.forEach((incident) => {
      const position = positionIncident(incident);
      if (!position) return;
      const marqueur = L.marker([position.lat, position.lng], {
        icon: iconeIncident(incident),
        zIndexOffset: incident.statut === 'nouveau' ? 1000 : 0
      }).bindPopup(popupIncidentHtml(incident), { minWidth: 230 });
      marqueur.on('popupopen', (e: L.PopupEvent) => this.brancherPopup(e.popup, incident));
      this.incidentParMarqueur.set(marqueur, incident);
      this.marqueursIncidents.set(incident._id, marqueur);
      marqueurs.push(marqueur);

      if (position.source === 'gps' && position.precision) {
        const couleur = styleGravite(incident.gravite).couleur;
        L.circle([position.lat, position.lng], {
          radius: position.precision, color: couleur, fillColor: couleur, fillOpacity: 0.12, weight: 1, interactive: false
        }).addTo(this.incidentsCercles!);
      }
    });
    this.incidentsCluster.addLayers(marqueurs);

    // Réouvre le popup de l'incident qui était consulté avant la mise à jour
    const ouvert = idPopupOuvert ? this.marqueursIncidents.get(idPopupOuvert) : undefined;
    if (ouvert && this.incidentsCluster.getVisibleParent(ouvert) === ouvert) {
      ouvert.openPopup();
    }
  }

  // Boutons du popup (HTML hors Angular) : branchés à chaque ouverture
  private brancherPopup(popup: L.Popup, incident: Incident): void {
    this.popupIncidentId = incident._id;
    const element = popup.getElement();
    if (!element) return;
    element.querySelector<HTMLButtonElement>('[data-incident-action="detail"]')?.addEventListener('click', () => {
      this.zone.run(() => this.voirIncident(incident));
    });
    const prendre = element.querySelector<HTMLButtonElement>('[data-incident-action="prendre"]');
    prendre?.addEventListener('click', () => {
      prendre.disabled = true;
      prendre.textContent = 'En cours...';
      this.zone.run(() => {
        this.incidentsService.update(incident._id, { statut: 'en_cours' }).subscribe({
          error: (err: HttpErrorResponse) => {
            prendre.disabled = false;
            prendre.textContent = 'Prendre en charge';
            this.incidentsError = err.error?.message || 'Impossible de prendre en charge cet incident.';
          }
        });
      });
    });
  }

  // Clic dans la liste : carte centrée / zoomée sur l'incident, popup ouvert
  focaliserIncident(incident: Incident): void {
    const marqueur = this.marqueursIncidents.get(incident._id);
    if (!this.map || !this.incidentsCluster || !this.incidentsLayer || !marqueur) {
      return;
    }
    if (!this.map.hasLayer(this.incidentsLayer)) {
      this.incidentsLayer.addTo(this.map);
    }
    // Le cadrage automatique sur les gardiens ne doit plus déplacer la vue
    this.gardiensCadres = true;
    this.mapContainer?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.incidentsCluster.zoomToShowLayer(marqueur, () => {
      this.map?.setView(marqueur.getLatLng(), Math.max(this.map.getZoom(), 16));
      marqueur.openPopup();
    });
  }

  // Arrivée depuis la page Incidents (?incident=<id>) : l'incident peut être hors des filtres actuels
  private focaliserParId(id: string): void {
    if (!this.map) return;
    this.incidentAFocaliser = null;
    const present = this.incidentsVisibles.find((i) => i._id === id);
    if (present) {
      setTimeout(() => this.focaliserIncident(present));
      return;
    }
    this.incidentsService.getById(id).subscribe({
      next: (res) => {
        this.incidentsCarte = [res.incident, ...this.incidentsCarte.filter((i) => i._id !== id)];
        if (!STATUTS_ACTIFS.includes(res.incident.statut)) this.afficherTraites = true;
        this.renderIncidents();
        setTimeout(() => this.focaliserIncident(res.incident));
      },
      error: (err: HttpErrorResponse) => (this.incidentsError = err.error?.message || 'Incident introuvable.')
    });
  }

  // Bouton « Recentrer » : cadre tous les marqueurs affichés (incidents et gardiens)
  recentrer(): void {
    if (!this.map) return;
    const points: L.LatLng[] = [];
    if (this.incidentsLayer && this.map.hasLayer(this.incidentsLayer)) {
      this.marqueursIncidents.forEach((m) => points.push(m.getLatLng()));
    }
    if (this.markersLayer && this.map.hasLayer(this.markersLayer)) {
      this.markersLayer.eachLayer((l) => {
        if (l instanceof L.Marker) points.push(l.getLatLng());
      });
    }
    if (points.length === 0) {
      this.map.setView([-4.3372, 15.3225], 12);
      return;
    }
    this.map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
  }

  // Stat « Incidents signalés », graphique mensuel et donut des statuts (6 derniers mois)
  private statsIncidents: Incident[] = [];
  private statsIncidentsChargees = false;

  private chargerStatsIncidents(): void {
    const debut = new Date();
    debut.setMonth(debut.getMonth() - 5, 1);
    this.incidentsService.list({ du: dateIso(debut) }).subscribe({
      next: (res) => {
        this.statsIncidents = res.incidents;
        this.statsIncidentsChargees = true;
        const maintenant = new Date();
        const memeMois = (iso: string, mois: Date) => {
          const d = new Date(iso);
          return d.getFullYear() === mois.getFullYear() && d.getMonth() === mois.getMonth();
        };
        this.financeStats[0].value = res.incidents.filter((i) => memeMois(i.dateIncident, maintenant)).length;
        this.financeStats[0].hint = `Ce mois-ci · ${res.nonTraites} non traité(s)`;
        this.financeStats[0].trend = res.nonTraites > 0 ? 'down' : 'neutral';
        this.financeStats[0].trendValue = res.nonTraites > 0 ? 'À traiter' : '';

        // Nouvelle référence de tableau : les graphiques ne se mettent à jour que dans ngOnChanges
        this.incidentsData = Array.from({ length: 6 }, (_, index) => {
          const mois = new Date(maintenant.getFullYear(), maintenant.getMonth() - 5 + index, 1);
          const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(mois).replace('.', '');
          return {
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value: res.incidents.filter((i) => memeMois(i.dateIncident, mois)).length
          };
        });
        this.majDonutIncidents();
      },
      error: () => {
        if (!this.statsIncidentsChargees) {
          this.financeStats[0].value = '—';
          this.financeStats[0].hint = 'Données indisponibles';
        }
      }
    });
  }

  private majDonutIncidents(): void {
    if (!this.incidentOptions || !this.statsIncidentsChargees) return;
    this.incidentsSegments = this.incidentOptions.statuts.map((s) => ({
      label: s.libelle,
      value: this.statsIncidents.filter((i) => i.statut === s.valeur).length,
      strokeColor: COULEURS_STATUT_DONUT[s.valeur] ?? '#737373'
    }));
  }

  // Affichage (liste à côté de la carte)
  dateHeureIncident(iso: string): string {
    return dateHeureIncident(iso);
  }

  adresseIncident(incident: Incident): string {
    return adresseProprieteIncident(incident.propriete);
  }

  graviteBadge(gravite: string): string {
    return styleGravite(gravite).badge;
  }

  statutIncidentBadge(statut: string): string {
    return statutIncidentBadgeClass(statut);
  }

  aPosition(incident: Incident): boolean {
    return !!positionIncident(incident);
  }

  private buildAgentPopup(gardien: Gardien): string {
    return `
      <div style="font-family:system-ui,-apple-system,sans-serif;min-width:200px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <img src="${gardien.photoProfil}" alt="${gardien.nom}"
            style="width:44px;height:44px;border-radius:9999px;object-fit:cover;border:2px solid #e5e5e5;flex-shrink:0;" />
          <div>
            <p style="margin:0;font-weight:600;font-size:13px;color:#000;">${gardien.nom} ${gardien.postnom}</p>
            <span style="display:inline-block;margin-top:3px;font-size:10px;font-weight:600;color:#15803d;background:#dcfce7;padding:2px 8px;border-radius:9999px;">
              En service
            </span>
          </div>
        </div>
        <div style="font-size:12px;color:#404040;line-height:1.7;border-top:1px solid #e5e5e5;padding-top:8px;">
          <div><strong style="color:#000;">Matricule :</strong> ${gardien.matricule}</div>
          <div><strong style="color:#000;">Zone :</strong> ${gardien.commune} — ${gardien.quartier}</div>
          <div><strong style="color:#000;">Téléphone :</strong> ${gardien.telephonePrincipal}</div>
        </div>
      </div>
    `;
  }
}
