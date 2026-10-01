import * as L from 'leaflet';
import 'leaflet.markercluster';

import {
  Incident,
  adresseProprieteIncident,
  auteurIncidentLabel,
  dateHeureIncident,
  iconeTypeIncident,
  nomPersonne,
  styleGravite
} from './incidents.service';

// Construction des marqueurs / popups Leaflet des incidents, partagée entre la
// carte du dashboard et la mini-carte du détail (mêmes couleurs, mêmes icônes).

export function echapperHtml(valeur: string | null | undefined): string {
  return (valeur ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function svgType(type: string, taille: number, couleur = '#ffffff'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="${couleur}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${iconeTypeIncident(type)}"/></svg>`;
}

// Pastille colorée selon la gravité, icône selon le type ; pulsation pour les "nouveau"
export function iconeIncident(incident: Incident): L.DivIcon {
  const couleur = styleGravite(incident.gravite).couleur;
  const pulse = incident.statut === 'nouveau'
    ? `<span class="incident-pulse${incident.gravite === 'critique' ? ' incident-pulse--fort' : ''}" style="--incident-couleur:${couleur}"></span>`
    : '';
  const attenue = incident.statut === 'resolu' || incident.statut === 'classe' ? ' incident-marker--traite' : '';
  return L.divIcon({
    className: '',
    html: `<div class="incident-marker${attenue}">${pulse}<span class="incident-marker__pastille" style="background:${couleur}">${svgType(incident.type, 16)}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16]
  });
}

// Marqueur discret de la propriété (mini-carte du détail)
export function iconePropriete(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="incident-marker__propriete"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

// Cluster coloré selon la gravité la plus haute de ses incidents
export function iconeCluster(nombre: number, graviteMax: string): L.DivIcon {
  const couleur = styleGravite(graviteMax).couleur;
  const taille = nombre < 10 ? 36 : nombre < 50 ? 42 : 48;
  return L.divIcon({
    className: '',
    html: `<div class="incident-cluster" style="--incident-couleur:${couleur};width:${taille}px;height:${taille}px">${nombre}</div>`,
    iconSize: [taille, taille]
  });
}

// Classes Tailwind -> styles en ligne pour le HTML des popups (hors compilation Angular)
function badgeEnLigne(couleur: string): string {
  return `display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;color:#fff;background:${couleur};`;
}

const COULEURS_STATUT: Record<string, string> = { nouveau: '#2563eb', en_cours: '#d97706', resolu: '#16a34a', classe: '#737373' };

// Boutons repérés par data-incident-action : le composant branche les clics à l'ouverture du popup
export function popupIncidentHtml(incident: Incident): string {
  const p = incident.propriete;
  const photo = incident.photos?.[0];
  const auteur = `${nomPersonne(incident.signalePar, 'Inconnu')} (${auteurIncidentLabel(incident.signaleParModele)})`;
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;min-width:220px;max-width:260px;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        ${photo ? `<img src="${echapperHtml(photo)}" alt="" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid #e5e5e5;" />` : ''}
        <div style="min-width:0;">
          <p style="margin:0;font-weight:600;font-size:13px;color:#000;">${echapperHtml(incident.typeLibelle)}</p>
          <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">
            <span style="${badgeEnLigne(styleGravite(incident.gravite).couleur)}">${echapperHtml(incident.graviteLibelle)}</span>
            <span style="${badgeEnLigne(COULEURS_STATUT[incident.statut] ?? '#737373')}">${echapperHtml(incident.statutLibelle)}</span>
          </div>
        </div>
      </div>
      <div style="font-size:12px;color:#404040;line-height:1.6;border-top:1px solid #e5e5e5;margin-top:8px;padding-top:8px;">
        <div><strong style="color:#000;">${echapperHtml(p?.nomReference || 'Propriété supprimée')}</strong></div>
        ${p ? `<div>${echapperHtml(adresseProprieteIncident(p))}</div>` : ''}
        <div>${echapperHtml(dateHeureIncident(incident.dateIncident))}</div>
        <div>Signalé par ${echapperHtml(auteur)}</div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;">
        <button type="button" data-incident-action="detail" style="flex:1;border:1px solid #d4d4d4;background:#fff;color:#000;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:500;cursor:pointer;">Voir le détail</button>
        ${incident.statut === 'nouveau' ? `<button type="button" data-incident-action="prendre" style="flex:1;border:0;background:#000;color:#fff;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:500;cursor:pointer;">Prendre en charge</button>` : ''}
      </div>
    </div>
  `;
}

// leaflet.markercluster s'accroche au L global (window.L) : on passe par lui pour
// ne pas dépendre de l'ordre d'évaluation des imports dans le bundle.
export function creerClusterIncidents(options: L.MarkerClusterGroupOptions): L.MarkerClusterGroup {
  const global = (window as unknown as { L?: typeof L }).L;
  const fabrique = (L as typeof L & { markerClusterGroup?: typeof L.markerClusterGroup }).markerClusterGroup ?? global?.markerClusterGroup;
  return fabrique!(options);
}
