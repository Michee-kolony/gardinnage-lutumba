import { Injectable } from '@angular/core';

export type StatutGardien = 'En service' | 'Disponible' | 'Absent';

export const STATUTS_GARDIEN: StatutGardien[] = ['En service', 'Disponible', 'Absent'];

export interface MaisonAffectee {
  id: number;
  nom: string;
  adresse: string;
  proprietaire: string;
  photoUrl: string;
}

export type TypeCommentaire = 'positif' | 'negatif';

export interface CommentaireGardien {
  id: number;
  proprietaire: string;
  message: string;
  date: string;
  type: TypeCommentaire;
}

export interface Gardien {
  id: number;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  pseudo: string;
  photoUrl: string;
  statut: StatutGardien;
  zone: string;
  telephone: string;
  dateNaissance: string;
  lieuNaissance: string;
  adresse: string;
  dateEmbauche: string;
  numeroCni: string;
  groupeSanguin: string;
  contactUrgenceNom: string;
  contactUrgenceTelephone: string;
  maisons: MaisonAffectee[];
  commentaires: CommentaireGardien[];
}

@Injectable({ providedIn: 'root' })
export class GardiensService {
  private gardiens: Gardien[] = [
    {
      id: 1, matricule: 'GRD-2024-001', nom: 'Benali', postnom: 'Karim', prenom: 'Mohamed', pseudo: 'Faucon',
      photoUrl: 'https://i.pravatar.cc/300?img=12', statut: 'En service', zone: 'Cannes — Secteur Nord', telephone: '06 12 34 56 78',
      dateNaissance: '14/03/1990', lieuNaissance: 'Marseille', adresse: '12 rue des Oliviers, Cannes',
      dateEmbauche: '02/01/2022', numeroCni: 'CNI-041290', groupeSanguin: 'O+',
      contactUrgenceNom: 'Amina Benali (épouse)', contactUrgenceTelephone: '06 98 76 54 32',
      maisons: [
        { id: 1, nom: 'Villa Les Pins', adresse: '8 avenue des Pins, Cannes', proprietaire: 'M. Bernard Dubois', photoUrl: 'https://picsum.photos/seed/villa-les-pins/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'M. Bernard Dubois', message: 'Gardien très sérieux, je recommande vivement.', date: 'Il y a 1h', type: 'positif' },
        { id: 2, proprietaire: 'M. Bernard Dubois', message: 'Est arrivé en retard à deux reprises ce mois-ci.', date: 'Il y a 2j', type: 'negatif' },
        { id: 3, proprietaire: 'Mme Corinne Faye (voisine)', message: 'Toujours courtois avec les visiteurs.', date: 'Il y a 5j', type: 'positif' },
      ],
    },
    {
      id: 2, matricule: 'GRD-2024-002', nom: 'Moreau', postnom: 'Julien', prenom: 'Jean', pseudo: 'Loup',
      photoUrl: 'https://i.pravatar.cc/300?img=13', statut: 'En service', zone: 'Nice — Bellevue', telephone: '06 23 45 67 89',
      dateNaissance: '22/07/1988', lieuNaissance: 'Nice', adresse: '5 boulevard Bellevue, Nice',
      dateEmbauche: '15/09/2021', numeroCni: 'CNI-058821', groupeSanguin: 'A+',
      contactUrgenceNom: 'Claire Moreau (sœur)', contactUrgenceTelephone: '06 87 65 43 21',
      maisons: [
        { id: 2, nom: 'Résidence Bellevue', adresse: '17 boulevard Bellevue, Nice', proprietaire: 'Mme Sophie Lambert', photoUrl: 'https://picsum.photos/seed/residence-bellevue/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'Mme Sophie Lambert', message: 'Rassurant, il connaît très bien le quartier.', date: 'Il y a 3h', type: 'positif' },
        { id: 2, proprietaire: 'Mme Sophie Lambert', message: "N'a pas signalé un colis suspect à temps.", date: 'Il y a 1 sem', type: 'negatif' },
        { id: 3, proprietaire: 'M. Régis Portal (voisin)', message: 'Réactif lors d\'une alarme incendie.', date: 'Hier', type: 'positif' },
      ],
    },
    {
      id: 3, matricule: 'GRD-2024-003', nom: 'Girard', postnom: 'Sophie', prenom: 'Marie', pseudo: 'Lynx',
      photoUrl: 'https://i.pravatar.cc/300?img=45', statut: 'Disponible', zone: 'Antibes — Domaine du Lac', telephone: '06 34 56 78 90',
      dateNaissance: '05/11/1993', lieuNaissance: 'Antibes', adresse: '3 chemin du Lac, Antibes',
      dateEmbauche: '10/04/2023', numeroCni: 'CNI-069345', groupeSanguin: 'B+',
      contactUrgenceNom: 'Marc Girard (père)', contactUrgenceTelephone: '06 76 54 32 10',
      maisons: [
        { id: 3, nom: 'Domaine du Lac', adresse: '2 chemin du Lac, Antibes', proprietaire: 'M. Karim Haddad', photoUrl: 'https://picsum.photos/seed/domaine-du-lac/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'M. Karim Haddad', message: 'Excellente communication, rapports clairs chaque jour.', date: 'Il y a 2h', type: 'positif' },
        { id: 2, proprietaire: 'M. Karim Haddad', message: 'Ronde de nuit écourtée à plusieurs reprises.', date: 'Il y a 4j', type: 'negatif' },
        { id: 3, proprietaire: 'Mme Odile Marchand', message: 'Très attentive, je me sens rassurée.', date: 'Il y a 30 min', type: 'positif' },
      ],
    },
    {
      id: 4, matricule: 'GRD-2024-004', nom: 'Cherif', postnom: 'Mehdi', prenom: 'Ali', pseudo: 'Aigle',
      photoUrl: 'https://i.pravatar.cc/300?img=14', statut: 'En service', zone: 'Grasse — Maison Rosier', telephone: '06 45 67 89 01',
      dateNaissance: '30/01/1991', lieuNaissance: 'Grasse', adresse: '9 rue des Roses, Grasse',
      dateEmbauche: '01/06/2022', numeroCni: 'CNI-074512', groupeSanguin: 'AB+',
      contactUrgenceNom: 'Leïla Cherif (épouse)', contactUrgenceTelephone: '06 65 43 21 09',
      maisons: [
        { id: 4, nom: 'Maison Rosier', adresse: '14 rue des Roses, Grasse', proprietaire: 'Mme Julie Fontaine', photoUrl: 'https://picsum.photos/seed/maison-rosier/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'Mme Julie Fontaine', message: 'Un gardien exemplaire, toujours à l\'heure.', date: 'Il y a 1h', type: 'positif' },
        { id: 2, proprietaire: 'Mme Julie Fontaine', message: 'A oublié de fermer le portail une fois.', date: 'Il y a 6j', type: 'negatif' },
        { id: 3, proprietaire: 'M. Serge Blanchard', message: 'Bonne présence dissuasive dans le quartier.', date: 'Il y a 2j', type: 'positif' },
      ],
    },
    {
      id: 5, matricule: 'GRD-2024-005', nom: 'Lefevre', postnom: 'Thomas', prenom: 'Pierre', pseudo: 'Ours',
      photoUrl: 'https://i.pravatar.cc/300?img=15', statut: 'Absent', zone: 'Cannes — Secteur Sud', telephone: '06 56 78 90 12',
      dateNaissance: '18/09/1985', lieuNaissance: 'Cannes', adresse: '21 rue du Port, Cannes',
      dateEmbauche: '12/02/2020', numeroCni: 'CNI-082156', groupeSanguin: 'O-',
      contactUrgenceNom: 'Nathalie Lefevre (épouse)', contactUrgenceTelephone: '06 54 32 10 98',
      maisons: [
        { id: 5, nom: 'Villa Azur', adresse: '6 avenue du Sud, Cannes', proprietaire: 'M. Antoine Vasseur', photoUrl: 'https://picsum.photos/seed/villa-azur/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'M. Antoine Vasseur', message: 'Absences répétées non justifiées ce mois-ci.', date: 'Il y a 1j', type: 'negatif' },
        { id: 2, proprietaire: 'M. Antoine Vasseur', message: 'Quand il est présent, le travail est irréprochable.', date: 'Il y a 3 sem', type: 'positif' },
        { id: 3, proprietaire: 'Mme Francine Petit', message: 'Ne répond pas toujours au téléphone.', date: 'Il y a 5j', type: 'negatif' },
      ],
    },
    {
      id: 6, matricule: 'GRD-2024-006', nom: 'Ouazzani', postnom: 'Nadia', prenom: 'Fatima', pseudo: 'Panthère',
      photoUrl: 'https://i.pravatar.cc/300?img=47', statut: 'Disponible', zone: 'Nice — Port', telephone: '06 67 89 01 23',
      dateNaissance: '27/05/1994', lieuNaissance: 'Nice', adresse: '4 quai des Docks, Nice',
      dateEmbauche: '19/08/2023', numeroCni: 'CNI-091267', groupeSanguin: 'A-',
      contactUrgenceNom: 'Youssef Ouazzani (frère)', contactUrgenceTelephone: '06 43 21 09 87',
      maisons: [
        { id: 6, nom: 'Villa du Port', adresse: '10 quai des Docks, Nice', proprietaire: 'Mme Isabelle Roche', photoUrl: 'https://picsum.photos/seed/villa-du-port/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'Mme Isabelle Roche', message: 'Très professionnelle et discrète.', date: 'Il y a 4h', type: 'positif' },
        { id: 2, proprietaire: 'Mme Isabelle Roche', message: 'A mal renseigné un livreur, confusion évitable.', date: 'Il y a 3j', type: 'negatif' },
        { id: 3, proprietaire: 'M. Julien Roy', message: 'Bonne vigilance sur le parking.', date: 'Hier', type: 'positif' },
      ],
    },
    {
      id: 7, matricule: 'GRD-2024-007', nom: 'Petit', postnom: 'Alexandre', prenom: 'Paul', pseudo: 'Cobra',
      photoUrl: 'https://i.pravatar.cc/300?img=16', statut: 'En service', zone: 'Antibes — Cap', telephone: '06 78 90 12 34',
      dateNaissance: '09/12/1987', lieuNaissance: 'Antibes', adresse: '2 chemin du Cap, Antibes',
      dateEmbauche: '05/03/2021', numeroCni: 'CNI-103478', groupeSanguin: 'B-',
      contactUrgenceNom: 'Valérie Petit (épouse)', contactUrgenceTelephone: '06 32 10 98 76',
      maisons: [
        { id: 7, nom: 'Villa Cap Vert', adresse: '3 chemin du Cap, Antibes', proprietaire: 'M. Laurent Simon', photoUrl: 'https://picsum.photos/seed/villa-cap-vert/300/200' },
        { id: 8, nom: 'Bastide du Phare', adresse: '11 chemin du Phare, Antibes', proprietaire: 'Mme Céline Roy', photoUrl: 'https://picsum.photos/seed/bastide-du-phare/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'M. Laurent Simon', message: 'Gardien fiable depuis le début du contrat.', date: 'Il y a 2h', type: 'positif' },
        { id: 2, proprietaire: 'M. Laurent Simon', message: 'A mal orienté un prestataire, petite perte de temps.', date: 'Il y a 5j', type: 'negatif' },
        { id: 3, proprietaire: 'Mme Céline Roy', message: 'Très sympathique et sérieux dans son travail.', date: 'Il y a 1j', type: 'positif' },
      ],
    },
    {
      id: 8, matricule: 'GRD-2024-008', nom: 'Bernard', postnom: 'Camille', prenom: 'Anne', pseudo: 'Tigre',
      photoUrl: 'https://i.pravatar.cc/300?img=48', statut: 'En service', zone: 'Cannes — Croisette', telephone: '06 89 01 23 45',
      dateNaissance: '02/02/1992', lieuNaissance: 'Cannes', adresse: '18 rue Croisette, Cannes',
      dateEmbauche: '23/11/2022', numeroCni: 'CNI-114589', groupeSanguin: 'O+',
      contactUrgenceNom: 'Julien Bernard (frère)', contactUrgenceTelephone: '06 21 09 87 65',
      maisons: [
        { id: 9, nom: 'Appartement Croisette Prestige', adresse: '25 boulevard Croisette, Cannes', proprietaire: 'Mme Nathalie Perrin', photoUrl: 'https://picsum.photos/seed/croisette-prestige/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'Mme Nathalie Perrin', message: 'Rondes régulières et rassurantes.', date: 'Il y a 1h', type: 'positif' },
        { id: 2, proprietaire: 'Mme Nathalie Perrin', message: 'Un peu trop bavarde avec les autres gardiens pendant le service.', date: 'Il y a 4j', type: 'negatif' },
        { id: 3, proprietaire: 'M. Hugo Lacroix', message: 'Bon contact avec les résidents.', date: 'Il y a 6h', type: 'positif' },
      ],
    },
    {
      id: 9, matricule: 'GRD-2024-009', nom: 'El Amrani', postnom: 'Yassine', prenom: 'Omar', pseudo: 'Faucon 2',
      photoUrl: 'https://i.pravatar.cc/300?img=17', statut: 'Disponible', zone: 'Grasse — Centre', telephone: '06 90 12 34 56',
      dateNaissance: '16/06/1996', lieuNaissance: 'Grasse', adresse: '7 place du Cours, Grasse',
      dateEmbauche: '08/07/2023', numeroCni: 'CNI-125690', groupeSanguin: 'A+',
      contactUrgenceNom: 'Sara El Amrani (mère)', contactUrgenceTelephone: '06 10 98 76 54',
      maisons: [
        { id: 10, nom: 'Maison des Parfums', adresse: '13 place du Cours, Grasse', proprietaire: 'M. Michel Roussel', photoUrl: 'https://picsum.photos/seed/maison-des-parfums/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'M. Michel Roussel', message: 'Ponctuel et très respectueux.', date: 'Il y a 3h', type: 'positif' },
        { id: 2, proprietaire: 'M. Michel Roussel', message: 'A confondu deux badges d\'accès.', date: 'Il y a 1 sem', type: 'negatif' },
        { id: 3, proprietaire: 'Mme Nadège Simon', message: 'Toujours de bonne humeur, rassurant.', date: 'Il y a 2j', type: 'positif' },
      ],
    },
    {
      id: 10, matricule: 'GRD-2024-010', nom: 'Simon', postnom: 'Laura', prenom: 'Elise', pseudo: 'Renarde',
      photoUrl: 'https://i.pravatar.cc/300?img=49', statut: 'Absent', zone: 'Nice — Cimiez', telephone: '06 01 23 45 67',
      dateNaissance: '11/04/1990', lieuNaissance: 'Nice', adresse: '9 avenue Cimiez, Nice',
      dateEmbauche: '14/01/2020', numeroCni: 'CNI-136701', groupeSanguin: 'AB-',
      contactUrgenceNom: 'Paul Simon (époux)', contactUrgenceTelephone: '06 09 87 65 43',
      maisons: [
        { id: 11, nom: 'Villa Cimiez', adresse: '15 avenue Cimiez, Nice', proprietaire: 'Mme Claire Dumont', photoUrl: 'https://picsum.photos/seed/villa-cimiez/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'Mme Claire Dumont', message: 'Plusieurs absences non signalées ce trimestre.', date: 'Il y a 2j', type: 'negatif' },
        { id: 2, proprietaire: 'Mme Claire Dumont', message: 'Quand elle est présente, le travail est très professionnel.', date: 'Il y a 3 sem', type: 'positif' },
        { id: 3, proprietaire: 'M. Thierry Aubert', message: 'Manque de suivi sur les rondes de nuit.', date: 'Il y a 5j', type: 'negatif' },
      ],
    },
    {
      id: 11, matricule: 'GRD-2024-011', nom: 'Faure', postnom: 'Nicolas', prenom: 'Marc', pseudo: 'Requin',
      photoUrl: 'https://i.pravatar.cc/300?img=18', statut: 'En service', zone: 'Antibes — Juan-les-Pins', telephone: '06 11 22 33 44',
      dateNaissance: '25/08/1989', lieuNaissance: 'Juan-les-Pins', adresse: '6 avenue des Pins, Juan-les-Pins',
      dateEmbauche: '17/05/2021', numeroCni: 'CNI-147812', groupeSanguin: 'O+',
      contactUrgenceNom: 'Emilie Faure (épouse)', contactUrgenceTelephone: '06 08 76 54 32',
      maisons: [
        { id: 12, nom: 'Villa Pins Bleus', adresse: '20 avenue des Pins, Juan-les-Pins', proprietaire: 'M. Patrick Lemoine', photoUrl: 'https://picsum.photos/seed/villa-pins-bleus/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'M. Patrick Lemoine', message: 'Excellent relationnel avec les prestataires.', date: 'Il y a 1h', type: 'positif' },
        { id: 2, proprietaire: 'M. Patrick Lemoine', message: 'A laissé la lumière du portail allumée toute la nuit.', date: 'Il y a 3j', type: 'negatif' },
        { id: 3, proprietaire: 'Mme Elodie Garnier', message: 'Très vigilant, je recommande.', date: 'Il y a 30 min', type: 'positif' },
      ],
    },
    {
      id: 12, matricule: 'GRD-2024-012', nom: 'Rousseau', postnom: 'Emma', prenom: 'Claire', pseudo: 'Épervier',
      photoUrl: 'https://i.pravatar.cc/300?img=44', statut: 'Disponible', zone: 'Cannes — La Bocca', telephone: '06 22 33 44 55',
      dateNaissance: '03/10/1995', lieuNaissance: 'Cannes', adresse: '31 rue de la Bocca, Cannes',
      dateEmbauche: '29/09/2023', numeroCni: 'CNI-158923', groupeSanguin: 'A+',
      contactUrgenceNom: 'Denis Rousseau (père)', contactUrgenceTelephone: '06 07 65 43 21',
      maisons: [
        { id: 13, nom: 'Résidence La Bocca', adresse: '40 rue de la Bocca, Cannes', proprietaire: 'Mme Sandrine Blanc', photoUrl: 'https://picsum.photos/seed/residence-la-bocca/300/200' },
      ],
      commentaires: [
        { id: 1, proprietaire: 'Mme Sandrine Blanc', message: 'Toujours souriante et efficace.', date: 'Il y a 2h', type: 'positif' },
        { id: 2, proprietaire: 'Mme Sandrine Blanc', message: 'A mis du temps à répondre lors d\'une urgence.', date: 'Il y a 4j', type: 'negatif' },
        { id: 3, proprietaire: 'M. Damien Faure', message: 'Bonne coordination avec le voisinage.', date: 'Hier', type: 'positif' },
      ],
    },
  ];

  getGardiens(): Gardien[] {
    return this.gardiens;
  }

  getGardienById(id: number): Gardien | undefined {
    return this.gardiens.find((g) => g.id === id);
  }

  get nextId(): number {
    return Math.max(0, ...this.gardiens.map((g) => g.id)) + 1;
  }

  addGardien(gardien: Gardien): void {
    this.gardiens = [gardien, ...this.gardiens];
  }
}
