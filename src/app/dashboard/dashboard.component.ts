import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { BarChartPoint } from './bar-chart/bar-chart.component';
import { DonutSegment } from './donut-chart/donut-chart.component';
import { Gardien, GardiensService, StatutGardien } from '../core/gardiens.service';
import { ProprietairesService } from '../core/proprietaires.service';
import { ProprietesService } from '../core/proprietes.service';

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
  proprietaire: string;
  photoUrl: string;
  maison: string;
  finContrat: string;
  joursRestants: number;
}

type PeriodeRapport = 'aujourdhui' | 'hier';

interface RapportGardien {
  nom: string;
  photoUrl: string;
  message: string;
  date: string;
  periode: PeriodeRapport;
}

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
    private proprietairesService: ProprietairesService,
    private proprietesService: ProprietesService
  ) {}

  isRapportsModalOpen = false;
  rapportsSearchTerm = '';
  rapportsDateFilter: 'toutes' | PeriodeRapport = 'toutes';

  rapports: RapportGardien[] = [
    { nom: 'Karim Benali', photoUrl: 'https://i.pravatar.cc/150?img=12', message: "Ronde de nuit effectuée sans incident sur le secteur Villa Les Pins. RAS.", date: "Aujourd'hui, 06:12", periode: 'aujourdhui' },
    { nom: 'Julien Moreau', photoUrl: 'https://i.pravatar.cc/150?img=13', message: "Portail d'accès de la Résidence Bellevue signalé difficile à fermer, à vérifier par la maintenance.", date: "Aujourd'hui, 05:47", periode: 'aujourdhui' },
    { nom: 'Sophie Girard', photoUrl: 'https://i.pravatar.cc/150?img=45', message: "Passage effectué au Domaine du Lac, tout est en ordre. Aucune anomalie constatée.", date: "Hier, 23:30", periode: 'hier' },
    { nom: 'Mehdi Cherif', photoUrl: 'https://i.pravatar.cc/150?img=14', message: "Alarme déclenchée par erreur à la Maison Rosier (animal domestique), fausse alerte confirmée.", date: 'Hier, 22:05', periode: 'hier' },
    { nom: 'Thomas Lefevre', photoUrl: 'https://i.pravatar.cc/150?img=15', message: "Absence justifiée aujourd'hui, remplacement assuré par Nicolas Faure.", date: 'Hier, 18:00', periode: 'hier' },
    { nom: 'Camille Bernard', photoUrl: 'https://i.pravatar.cc/150?img=48', message: "Ronde Croisette terminée. Un véhicule suspect stationné a été signalé aux autorités.", date: 'Hier, 21:15', periode: 'hier' },
  ];

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
    { label: 'Incidents signalés', value: 9, hint: 'Ce mois-ci', icon: 'alert', emphasis: 'default', trend: 'down', trendValue: '-2' },
    { label: 'Paiements reçus', value: '18 400 €', hint: 'Ce mois-ci', icon: 'cash', emphasis: 'dark', trend: 'up', trendValue: '+12%' },
    { label: 'Paiements en attente', value: '3 250 €', hint: '7 factures', icon: 'card', emphasis: 'default', trend: 'neutral', trendValue: '' },
  ];

  presenceData: BarChartPoint[] = [
    { label: 'Lun', value: 28 },
    { label: 'Mar', value: 31 },
    { label: 'Mer', value: 27 },
    { label: 'Jeu', value: 33 },
    { label: 'Ven', value: 30 },
    { label: 'Sam', value: 22 },
    { label: 'Dim', value: 18 },
  ];

  incidentsData: BarChartPoint[] = [
    { label: 'Avr', value: 4 },
    { label: 'Mai', value: 6 },
    { label: 'Juin', value: 3 },
    { label: 'Juil', value: 7 },
    { label: 'Août', value: 5 },
    { label: 'Sep', value: 9 },
  ];

  // Palette catégorielle (ordre fixe, sans signification particulière)
  prestationsSegments: DonutSegment[] = [
    { label: 'Surveillance de nuit', value: 22, strokeColor: '#2a78d6' },
    { label: 'Surveillance de jour', value: 15, strokeColor: '#eb6834' },
    { label: 'Rondes ponctuelles', value: 9, strokeColor: '#1baf7a' },
    { label: 'Intervention sur alarme', value: 6, strokeColor: '#eda100' },
  ];

  // Palette de statut (sémantique : bon / en attente / critique)
  incidentsSegments: DonutSegment[] = [
    { label: 'Résolus', value: 24, strokeColor: '#0ca30c' },
    { label: 'En cours', value: 7, strokeColor: '#fab219' },
    { label: 'Non traités', value: 3, strokeColor: '#d03b3b' },
  ];

  contratsExpirants: ContratExpirant[] = [
    { proprietaire: 'M. Bernard Dubois', photoUrl: 'https://i.pravatar.cc/150?img=60', maison: 'Villa Les Pins — Cannes', finContrat: '28/09/2026', joursRestants: 15 },
    { proprietaire: 'Mme Sophie Lambert', photoUrl: 'https://i.pravatar.cc/150?img=47', maison: 'Résidence Bellevue — Nice', finContrat: '03/10/2026', joursRestants: 20 },
    { proprietaire: 'M. Karim Haddad', photoUrl: 'https://i.pravatar.cc/150?img=52', maison: 'Domaine du Lac — Antibes', finContrat: '08/10/2026', joursRestants: 25 },
    { proprietaire: 'Mme Julie Fontaine', photoUrl: 'https://i.pravatar.cc/150?img=45', maison: 'Maison Rosier — Grasse', finContrat: '12/10/2026', joursRestants: 29 },
  ];

  joursBadgeClass(jours: number): string {
    return jours <= 15 ? 'bg-amber-500 text-black' : 'bg-amber-100 text-amber-800 border border-amber-300';
  }

  get filteredRapports(): RapportGardien[] {
    const term = this.rapportsSearchTerm.trim().toLowerCase();

    return this.rapports.filter((r) => {
      const matchesTerm = !term ||
        r.nom.toLowerCase().includes(term) ||
        r.message.toLowerCase().includes(term);
      const matchesDate = this.rapportsDateFilter === 'toutes' || r.periode === this.rapportsDateFilter;
      return matchesTerm && matchesDate;
    });
  }

  openRapportsModal(): void {
    this.rapportsSearchTerm = '';
    this.rapportsDateFilter = 'toutes';
    this.isRapportsModalOpen = true;
  }

  closeRapportsModal(): void {
    this.isRapportsModalOpen = false;
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
    this.pollTimer = setInterval(() => this.fetchGardiens(), DashboardComponent.POLL_INTERVAL_MS);
    this.fetchProprietairesCount();
    this.fetchProprietesCount();
  }

  ngAfterViewInit(): void {
    this.tryInitMap();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
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

  private fetchProprietesCount(): void {
    this.proprietesService.list().subscribe({
      next: (res) => {
        this.activiteStats[1].value = res.total;
      },
      error: () => {
        this.activiteStats[1].value = '—';
      }
    });
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
    window.addEventListener('resize', () => this.map?.invalidateSize());

    // Au cas où les données des gardiens étaient déjà arrivées avant que la
    // carte n'existe (ou inversement), on dessine les marqueurs tout de suite.
    this.renderMarkers();
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

    if (markers.length === 0) {
      // Aucun gardien localisé pour le moment : on garde la vue par défaut
      // (centrée sur Kinshasa) plutôt que de cadrer sur des bornes vides.
      return;
    }

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
