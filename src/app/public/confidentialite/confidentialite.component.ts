import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Politique de confidentialité de l'application « Empire Security Propriétaire »
 * (/application/proprietaire/confidentialite).
 * URL publique à déclarer sur Google Play Console et App Store Connect.
 *
 * Si l'application change (nouvelle permission, nouveau service tiers, nouvelle donnée),
 * mettre à jour le texte ET la date `miseAJour`.
 */
@Component({
  selector: 'app-confidentialite',
  templateUrl: './confidentialite.component.html',
})
export class ConfidentialiteComponent implements OnInit {

  readonly miseAJour = '26 novembre 2026';
  readonly emailContact = 'contact@empire-security-drc.com';

  constructor(private titre: Title, private meta: Meta) {}

  ngOnInit(): void {
    this.titre.setTitle('Politique de confidentialité — Empire Security Propriétaire');
    this.meta.updateTag({
      name: 'description',
      content: 'Données collectées, utilisation, conservation et droits des utilisateurs de l\'application Empire Security Propriétaire.',
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }
}
