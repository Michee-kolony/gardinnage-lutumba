import { Component } from '@angular/core';

type NiveauUrgenceIncident = 'faible' | 'moyenne' | 'haute' | 'critique';

interface IncidentGardien {
  nom: string;
  postnom: string;
  prenom: string;
  matricule: string;
}

interface IncidentHistorique {
  _id: string;
  gardien: IncidentGardien;
  propriete: string;
  adresse: string;
  type: string;
  description: string;
  photo: string;
  video: string;
  gps: { lat: number; lng: number };
  urgence: NiveauUrgenceIncident;
  createdAt: string;
}

@Component({
  selector: 'app-incidents',
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css'
})
export class IncidentsComponent {
  incidents: IncidentHistorique[] = [
    {
      _id: 'incident-demo-001',
      gardien: { prenom: 'Patrick', nom: 'Ilunga', postnom: 'Mbuyi', matricule: 'empire-10428' },
      propriete: 'Résidence Bellevue',
      adresse: 'Gombe, avenue des Batetela',
      type: 'Intrusion suspecte',
      description: 'Deux personnes ont tenté d’entrer par le portail secondaire. Elles ont quitté les lieux après déclenchement de l’alarme.',
      photo: '', video: '', gps: { lat: -4.3021, lng: 15.3087 }, urgence: 'critique',
      createdAt: '2026-09-29T06:12:00+01:00'
    },
    {
      _id: 'incident-demo-002',
      gardien: { prenom: 'Grâce', nom: 'Kabeya', postnom: 'Tshilombo', matricule: 'empire-21857' },
      propriete: 'Immeuble La Paix',
      adresse: 'Lingwala, avenue de la Justice',
      type: 'Panne matérielle',
      description: 'Le projecteur de sécurité côté parking ne s’allume plus. Zone surveillée pendant toute la ronde.',
      photo: '', video: '', gps: { lat: -4.3218, lng: 15.3094 }, urgence: 'moyenne',
      createdAt: '2026-09-28T22:47:00+01:00'
    },
    {
      _id: 'incident-demo-003',
      gardien: { prenom: 'Jean', nom: 'Mukendi', postnom: 'Lukusa', matricule: 'empire-39014' },
      propriete: 'Villa des Palmiers',
      adresse: 'Ngaliema, avenue des Palmiers',
      type: 'Dégât matériel',
      description: 'Une branche tombée pendant la pluie a endommagé une partie de la clôture près de l’entrée.',
      photo: '', video: '', gps: { lat: -4.3382, lng: 15.2761 }, urgence: 'haute',
      createdAt: '2026-09-27T18:35:00+01:00'
    },
    {
      _id: 'incident-demo-004',
      gardien: { prenom: 'Sarah', nom: 'Mwamba', postnom: 'Kanku', matricule: 'empire-50763' },
      propriete: 'Résidence du Fleuve',
      adresse: 'Gombe, boulevard du 30 Juin',
      type: 'Comportement suspect',
      description: 'Un véhicule est resté stationné devant l’accès de service. Le conducteur est parti après vérification.',
      photo: '', video: '', gps: { lat: -4.3096, lng: 15.3151 }, urgence: 'faible',
      createdAt: '2026-09-25T09:18:00+01:00'
    },
    {
      _id: 'incident-demo-005',
      gardien: { prenom: 'David', nom: 'Nsimba', postnom: 'Luyindula', matricule: 'empire-68320' },
      propriete: 'Centre Météo',
      adresse: 'Binza, route de Matadi',
      type: 'Départ de fumée',
      description: 'Une odeur de brûlé a été signalée dans le local technique. La source a été identifiée et les responsables prévenus.',
      photo: '', video: '', gps: { lat: -4.3513, lng: 15.2498 }, urgence: 'haute',
      createdAt: '2026-09-21T14:06:00+01:00'
    }
  ];
  searchTerm = '';
  urgenceFilter: 'tous' | NiveauUrgenceIncident = 'tous';

  get filteredIncidents(): IncidentHistorique[] {
    const term = this.searchTerm.trim().toLocaleLowerCase('fr');
    return this.incidents.filter((incident) => {
      const gardien = this.gardienName(incident.gardien).toLocaleLowerCase('fr');
      const matchesSearch = !term || [incident.type, incident.description, incident.propriete, incident.adresse, gardien]
        .some((value) => value?.toLocaleLowerCase('fr').includes(term));
      return matchesSearch && (this.urgenceFilter === 'tous' || incident.urgence === this.urgenceFilter);
    });
  }

  get incidentsAujourdhui(): number {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    return this.incidents.filter((incident) => new Date(incident.createdAt) >= debutJour).length;
  }

  get incidentsCritiques(): number {
    return this.incidents.filter((incident) => incident.urgence === 'critique').length;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.urgenceFilter = 'tous';
  }

  gardienName(gardien: IncidentHistorique['gardien']): string {
    return `${gardien.prenom} ${gardien.nom} ${gardien.postnom}`.trim();
  }

  gardienMatricule(gardien: IncidentHistorique['gardien']): string { return gardien.matricule; }

  gardienPhoto(_gardien: IncidentHistorique['gardien']): string { return ''; }

  urgenceLabel(urgence: NiveauUrgenceIncident): string {
    return urgence.charAt(0).toLocaleUpperCase('fr') + urgence.slice(1);
  }

  urgenceClass(urgence: NiveauUrgenceIncident): string {
    const classes: Record<NiveauUrgenceIncident, string> = {
      faible: 'border-neutral-200 bg-neutral-100 text-neutral-700',
      moyenne: 'border-amber-200 bg-amber-50 text-amber-800',
      haute: 'border-orange-200 bg-orange-50 text-orange-800',
      critique: 'border-red-200 bg-red-50 text-red-800'
    };
    return classes[urgence];
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  }
}
