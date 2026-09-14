import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { BarChartPoint } from './bar-chart/bar-chart.component';
import { DonutSegment } from './donut-chart/donut-chart.component';

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

interface AgentActif {
  nom: string;
  matricule: string;
  pseudo: string;
  photoUrl: string;
  zone: string;
  telephone: string;
  lat: number;
  lng: number;
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
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gardiensMap') mapContainer?: ElementRef<HTMLDivElement>;
  private map?: L.Map;

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

  // Coordonnées GPS réelles (lat, lng) des gardiens, positionnés sur les communes
  // de Kinshasa affichées avec de vraies rues (tuiles CARTO Dark Matter).
  agentsActifs: AgentActif[] = [
    { nom: 'Karim Benali', matricule: 'GRD-2024-001', pseudo: 'Faucon', photoUrl: 'https://i.pravatar.cc/150?img=12', zone: 'Gombe', telephone: '+243 810 123 456', lat: -4.3005, lng: 15.3081 },
    { nom: 'Julien Moreau', matricule: 'GRD-2024-002', pseudo: 'Loup', photoUrl: 'https://i.pravatar.cc/150?img=13', zone: 'Kintambo', telephone: '+243 820 234 567', lat: -4.3236, lng: 15.2747 },
    { nom: 'Mehdi Cherif', matricule: 'GRD-2024-004', pseudo: 'Aigle', photoUrl: 'https://i.pravatar.cc/150?img=14', zone: 'Kinshasa (centre)', telephone: '+243 830 345 678', lat: -4.3372, lng: 15.3225 },
    { nom: 'Alexandre Petit', matricule: 'GRD-2024-007', pseudo: 'Cobra', photoUrl: 'https://i.pravatar.cc/150?img=16', zone: 'Lemba', telephone: '+243 840 456 789', lat: -4.3906, lng: 15.3283 },
    { nom: 'Camille Bernard', matricule: 'GRD-2024-008', pseudo: 'Tigre', photoUrl: 'https://i.pravatar.cc/150?img=48', zone: 'Ngaliema / Binza', telephone: '+243 850 567 890', lat: -4.3800, lng: 15.2450 },
    { nom: 'Nicolas Faure', matricule: 'GRD-2024-011', pseudo: 'Requin', photoUrl: 'https://i.pravatar.cc/150?img=18', zone: 'Bandalungwa', telephone: '+243 860 678 901', lat: -4.3486, lng: 15.2967 },
    { nom: 'Sofia Marchetti', matricule: 'GRD-2024-013', pseudo: 'Panthère', photoUrl: 'https://i.pravatar.cc/150?img=25', zone: 'Limete', telephone: '+243 870 789 012', lat: -4.3556, lng: 15.3550 },
    { nom: 'Hugo Lemaire', matricule: 'GRD-2024-014', pseudo: 'Ours', photoUrl: 'https://i.pravatar.cc/150?img=33', zone: 'Ngaba', telephone: '+243 880 890 123', lat: -4.3808, lng: 15.3153 },
  ];

  gardiensStats: StatDef[] = [
    { label: 'Total gardiens', value: 48, hint: 'Effectif global', icon: 'shield', emphasis: 'dark', trend: 'up', trendValue: '+3 ce mois' },
    { label: 'En service', value: 31, hint: 'Actuellement en poste', icon: 'check', emphasis: 'default', trend: 'up', trendValue: '65%' },
    { label: 'Disponibles', value: 12, hint: 'Prêts à être affectés', icon: 'clock', emphasis: 'default', trend: 'neutral', trendValue: '25%' },
    { label: 'Absents', value: 5, hint: 'Congés / arrêts', icon: 'user-x', emphasis: 'default', trend: 'down', trendValue: '10%' },
  ];

  activiteStats: StatDef[] = [
    { label: 'Propriétaires', value: 36, hint: 'Clients enregistrés', icon: 'users', emphasis: 'default', trend: 'up', trendValue: '+2' },
    { label: 'Maisons sous surveillance', value: 52, hint: 'Sites actifs', icon: 'home', emphasis: 'default', trend: 'up', trendValue: '+4' },
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

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
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

    const markers: L.Marker[] = this.agentsActifs.map((agent) => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:40px;height:40px;">
            <img src="${agent.photoUrl}" alt="${agent.nom}"
              style="width:40px;height:40px;border-radius:9999px;object-fit:cover;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.5);" />
            <span style="position:absolute;bottom:-1px;right:-1px;width:12px;height:12px;border-radius:9999px;background:#22c55e;border:2px solid #ffffff;"></span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      return L.marker([agent.lat, agent.lng], { icon })
        .addTo(this.map!)
        .bindPopup(this.buildAgentPopup(agent), { minWidth: 220 })
        .bindTooltip(agent.zone, {
          permanent: true,
          direction: 'bottom',
          offset: [0, 4],
          className: 'zone-label',
        });
    });

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
    window.addEventListener('resize', () => this.map?.invalidateSize());
  }

  private buildAgentPopup(agent: AgentActif): string {
    return `
      <div style="font-family:system-ui,-apple-system,sans-serif;min-width:200px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <img src="${agent.photoUrl}" alt="${agent.nom}"
            style="width:44px;height:44px;border-radius:9999px;object-fit:cover;border:2px solid #e5e5e5;flex-shrink:0;" />
          <div>
            <p style="margin:0;font-weight:600;font-size:13px;color:#000;">${agent.nom}</p>
            <span style="display:inline-block;margin-top:3px;font-size:10px;font-weight:600;color:#15803d;background:#dcfce7;padding:2px 8px;border-radius:9999px;">
              En service
            </span>
          </div>
        </div>
        <div style="font-size:12px;color:#404040;line-height:1.7;border-top:1px solid #e5e5e5;padding-top:8px;">
          <div><strong style="color:#000;">Matricule :</strong> ${agent.matricule}</div>
          <div><strong style="color:#000;">Pseudo :</strong> ${agent.pseudo}</div>
          <div><strong style="color:#000;">Zone :</strong> ${agent.zone}</div>
          <div><strong style="color:#000;">Téléphone :</strong> ${agent.telephone}</div>
        </div>
      </div>
    `;
  }
}
