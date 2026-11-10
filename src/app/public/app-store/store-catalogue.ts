// Catalogue de l'« Empire Store » : applications mobiles distribuées hors Google Play.
//
// Publier une nouvelle version d'une appli :
//   1. remplacer l'APK dans public/app/<id>/ (même nom de fichier) ;
//   2. mettre à jour `version`, `taille` et `miseAJour` ci-dessous ;
//   3. relancer `ng build`.
// L'`id` doit correspondre à une application connue du backend (/api/telechargements/:id).

export type IdApplication = 'gardien' | 'proprietaire';

export interface Fonctionnalite {
  icone: 'clock' | 'map' | 'alert' | 'sos' | 'chat' | 'users' | 'home' | 'card' | 'report';
  titre: string;
  texte: string;
}

export interface Capture {
  src: string;
  legende: string;
}

export interface FicheApplication {
  id: IdApplication;
  nom: string;
  accroche: string;
  public: string;
  editeur: string;
  icone: string;
  apk: string;
  nomFichier: string;
  identifiant: string;
  version: string;
  taille: string;
  android: string;
  miseAJour: string;
  categories: string[];
  description: string;
  fonctionnalites: Fonctionnalite[];
  captures: Capture[];
}

// Recherche insensible à la casse et aux accents
export function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export const CATALOGUE: FicheApplication[] = [
  {
    id: 'gardien',
    nom: 'Empire Security Gardien',
    accroche: 'Pointage, missions, incidents et alerte SOS',
    public: 'Gardiens',
    editeur: 'Empire Security',
    icone: '/app/gardien/icon.webp',
    apk: '/app/gardien/empire-security-gardien.apk',
    nomFichier: 'empire-security-gardien.apk',
    identifiant: 'com.empiresecurity.gardien',
    version: '1.0',
    taille: '13,1 Mo',
    android: 'Android 7.0 et +',
    miseAJour: '26 oct. 2026',
    categories: ['Productivité', 'Sécurité', 'Usage interne'],
    description:
      'L\'application officielle des gardiens d\'Empire Security. Elle permet de prendre son service, consulter ses '
      + 'affectations, signaler des incidents, déclencher une alerte d\'urgence et communiquer en temps réel avec '
      + 'l\'administration. L\'accès est réservé aux gardiens disposant d\'un compte créé par l\'entreprise.',
    fonctionnalites: [
      { icone: 'clock', titre: 'Prise de service', texte: 'Pointez votre arrivée et votre départ sur votre site d\'affectation.' },
      { icone: 'map', titre: 'Mes affectations', texte: 'Consultez vos sites, vos horaires et l\'historique de vos missions.' },
      { icone: 'alert', titre: 'Incidents', texte: 'Signalez un incident avec photos et suivez son traitement.' },
      { icone: 'sos', titre: 'Bouton d\'urgence', texte: 'Alertez immédiatement le centre de contrôle en cas de danger.' },
      { icone: 'chat', titre: 'Messagerie', texte: 'Échangez en direct avec l\'administration, notifications sonores incluses.' },
      { icone: 'users', titre: 'Visiteurs & rapports', texte: 'Enregistrez les visiteurs et rédigez vos rapports de service.' },
    ],
    captures: [
      { src: '/app/gardien/captures/1-login.webp', legende: 'Connexion sécurisée' },
      { src: '/app/gardien/captures/2-service.webp', legende: 'Mon service' },
      { src: '/app/gardien/captures/3-affectations.webp', legende: 'Mes affectations' },
      { src: '/app/gardien/captures/4-incidents.webp', legende: 'Incidents' },
      { src: '/app/gardien/captures/5-messages.webp', legende: 'Messages' },
      { src: '/app/gardien/captures/6-conversation.webp', legende: 'Discussion' },
      { src: '/app/gardien/captures/7-urgence.webp', legende: 'Bouton SOS' },
    ],
  },
  {
    id: 'proprietaire',
    nom: 'Empire Security Propriétaire',
    accroche: 'Vos biens, vos gardiens et vos incidents en temps réel',
    public: 'Propriétaires & locataires',
    editeur: 'Empire Security',
    icone: '/app/proprietaire/icon.webp',
    apk: '/app/proprietaire/empire-security-proprietaire.apk',
    nomFichier: 'empire-security-proprietaire.apk',
    identifiant: 'com.empiresecurity.proprietaire',
    version: '1.0',
    taille: '10,9 Mo',
    android: 'Android 7.0 et +',
    miseAJour: '26 oct. 2026',
    categories: ['Maison', 'Sécurité', 'Clients'],
    description:
      'L\'application des clients d\'Empire Security. Suivez vos propriétés, voyez vos gardiens en poste sur la carte, '
      + 'recevez une alarme dès qu\'un incident est signalé, lisez les rapports de service et discutez avec vos gardiens '
      + 'et l\'administration. Vos locataires disposent aussi de leur propre espace. Le compte est créé par Empire Security.',
    fonctionnalites: [
      { icone: 'home', titre: 'Mes propriétés', texte: 'Toutes vos propriétés, leurs équipements et leurs documents au même endroit.' },
      { icone: 'map', titre: 'Carte des gardiens', texte: 'Voyez en direct où se trouvent vos gardiens en service.' },
      { icone: 'alert', titre: 'Alarme incidents', texte: 'Une alerte sonore vous prévient dès qu\'un incident est signalé.' },
      { icone: 'report', titre: 'Rapports de service', texte: 'Lisez les rondes, visites et observations de vos gardiens.' },
      { icone: 'chat', titre: 'Messagerie', texte: 'Discutez avec vos gardiens et l\'administration, propriété par propriété.' },
      { icone: 'card', titre: 'Abonnements', texte: 'Suivez vos abonnements et l\'historique de vos paiements.' },
    ],
    captures: [
      { src: '/app/proprietaire/captures/1-login.webp', legende: 'Connexion' },
      { src: '/app/proprietaire/captures/2-accueil.webp', legende: 'Tableau de bord' },
      { src: '/app/proprietaire/captures/3-carte.webp', legende: 'Carte des gardiens' },
      { src: '/app/proprietaire/captures/4-proprietes.webp', legende: 'Mes propriétés' },
      { src: '/app/proprietaire/captures/5-propriete-detail.webp', legende: 'Fiche propriété' },
      { src: '/app/proprietaire/captures/6-incidents.webp', legende: 'Incidents' },
      { src: '/app/proprietaire/captures/7-conversation.webp', legende: 'Discussion' },
      { src: '/app/proprietaire/captures/8-abonnements.webp', legende: 'Abonnements' },
    ],
  },
];

export function trouverApplication(id: string | null): FicheApplication | undefined {
  return CATALOGUE.find((a) => a.id === id);
}


// Texte de recherche de chaque appli, normalisé une seule fois au chargement
const INDEX_RECHERCHE = new Map<IdApplication, string>(
  CATALOGUE.map((app) => [app.id, normaliser([
    app.nom, app.accroche, app.public, app.description, ...app.categories,
    ...app.fonctionnalites.map((f) => `${f.titre} ${f.texte}`),
  ].join(' '))])
);

export function correspond(app: FicheApplication, recherche: string): boolean {
  const termes = normaliser(recherche).split(/\s+/).filter(Boolean);
  if (!termes.length) return true;
  const texte = INDEX_RECHERCHE.get(app.id) ?? '';
  return termes.every((t) => texte.includes(t));
}

export function formatTelechargements(n: number | undefined): string {
  if (n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR').format(n);
}
