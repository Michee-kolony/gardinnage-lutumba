import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import {
  DUREES_ABONNEMENT,
  DevisePaiement,
  MODES_PAIEMENT,
  ModePaiement,
  Paiement,
  PaiementUpdatePayload,
  PaiementsService,
  ajouterMois,
  dureeAbonnementLabel,
  erreurAbonnementEnCours
} from '../../../core/paiements.service';
import {
  Propriete,
  formatDateCourte,
  statutAbonnement,
  statutAbonnementLabel
} from '../../../core/proprietes.service';

interface PaiementFormModel {
  propriete: string;
  dureeMois: number | null;
  montant: number | null;
  devise: DevisePaiement;
  modePaiement: ModePaiement;
  description: string;
  // 'AAAA-MM-JJ' ou '' (= date du jour côté serveur)
  periodeDebut: string;
}

// Modal d'enregistrement (paiement = null) ou de modification d'un paiement.
// La période d'abonnement est toujours calculée par le serveur : ce composant
// n'envoie jamais periodeFin ni les dates d'abonnement de la propriété.
@Component({
  selector: 'app-paiement-form',
  templateUrl: './paiement-form.component.html'
})
export class PaiementFormComponent implements OnInit {
  // Propriétés proposées dans le sélecteur (création uniquement)
  @Input() proprietes: Propriete[] = [];
  // Propriété présélectionnée (création depuis la fiche d'une propriété)
  @Input() proprieteId = '';
  // Paiement à modifier ; null = création
  @Input() paiement: Paiement | null = null;
  // Propriété à jour du paiement modifié (sinon celle peuplée dans le paiement)
  @Input() proprieteContexte: Propriete | null = null;

  @Output() saved = new EventEmitter<Paiement>();
  // Le serveur a répondu 409 : les statuts affichés par le parent sont périmés
  @Output() abonnementEnCours = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  readonly modes = MODES_PAIEMENT;
  formModel: PaiementFormModel = this.emptyForm();
  optionsAvancees = false;
  submitting = false;
  formError = '';
  conflitMessage = '';
  // Paiement créé : affiche la référence du reçu à la place du formulaire
  created: Paiement | null = null;

  constructor(private paiementsService: PaiementsService) {}

  ngOnInit(): void {
    if (this.paiement) {
      const p = this.paiement;
      this.formModel = {
        propriete: this.proprieteIdOf(p),
        dureeMois: p.dureeMois,
        montant: p.montant,
        devise: p.devise,
        modePaiement: p.modePaiement,
        description: p.description || '',
        periodeDebut: this.toDateInputValue(p.periodeDebut)
      };
    } else {
      this.formModel = { ...this.emptyForm(), propriete: this.proprieteId };
    }
  }

  get isEdit(): boolean {
    return !!this.paiement;
  }

  // Seul le paiement le plus récent de la propriété (propriete.dernierPaiement) peut changer de période
  get periodeModifiable(): boolean {
    if (!this.paiement) {
      return true;
    }
    const propriete = this.proprieteContexte ?? (typeof this.paiement.propriete === 'object' ? this.paiement.propriete : null);
    const dernier = propriete?.dernierPaiement as string | { _id: string } | null | undefined;
    const dernierId = dernier && typeof dernier === 'object' ? dernier._id : dernier;
    return !!dernierId && dernierId === this.paiement._id;
  }

  get selectedPropriete(): Propriete | undefined {
    return this.proprietes.find((p) => p._id === this.formModel.propriete);
  }

  // Confort uniquement : le serveur reste l'autorité (réponse 409)
  get selectedProprieteActive(): boolean {
    const propriete = this.selectedPropriete;
    return !this.isEdit && !!propriete && statutAbonnement(propriete) === 'actif';
  }

  // Mensuel / trimestriel / annuel ; un ancien paiement d'une autre durée garde sa valeur dans la liste
  get dureesProposees(): { mois: number; label: string }[] {
    const actuelle = this.paiement?.dureeMois;
    if (actuelle && !DUREES_ABONNEMENT.some((d) => d.mois === actuelle)) {
      return [...DUREES_ABONNEMENT, { mois: actuelle, label: dureeAbonnementLabel(actuelle) }];
    }
    return DUREES_ABONNEMENT;
  }

  dureeLabel(mois: number | null): string {
    return dureeAbonnementLabel(mois);
  }

  get dureeValide(): boolean {
    const duree = this.formModel.dureeMois;
    return duree !== null && Number.isInteger(Number(duree)) && Number(duree) >= 1;
  }

  // Aperçu « du <début> au <début + durée> », même calcul que le serveur
  get apercuPeriode(): string {
    if (!this.dureeValide || (this.isEdit && !this.periodeModifiable)) {
      return '';
    }
    const debut = this.formModel.periodeDebut
      ? new Date(this.formModel.periodeDebut)
      : this.paiement?.periodeDebut ? new Date(this.paiement.periodeDebut) : this.defaultDebut();
    if (Number.isNaN(debut.getTime())) {
      return '';
    }
    const fin = ajouterMois(debut, Number(this.formModel.dureeMois));
    return `du ${formatDateCourte(debut)} au ${formatDateCourte(fin)}`;
  }

  get periodeActuelleLabel(): string {
    if (!this.paiement?.periodeDebut || !this.paiement.periodeFin) {
      return '—';
    }
    return `du ${formatDateCourte(this.paiement.periodeDebut)} au ${formatDateCourte(this.paiement.periodeFin)}`;
  }

  proprieteOptionLabel(propriete: Propriete): string {
    const owner = propriete.proprietaire ? `${propriete.proprietaire.prenom} ${propriete.proprietaire.nom}` : 'Sans propriétaire';
    const statut = statutAbonnement(propriete);
    const abonnement = statut === 'actif'
      ? `Abonnement en cours jusqu'au ${formatDateCourte(propriete.dateExpirationAbonnement)}`
      : statutAbonnementLabel(statut);
    return `${propriete.nomReference} · ${owner} · ${propriete.commune} — ${abonnement}`;
  }

  isProprieteActive(propriete: Propriete): boolean {
    return statutAbonnement(propriete) === 'actif';
  }

  dateCourte(date: string | null): string {
    return formatDateCourte(date);
  }

  expirationLabel(propriete: Propriete): string {
    return formatDateCourte(propriete.dateExpirationAbonnement);
  }

  modeLabel(mode: ModePaiement): string {
    const labels: Record<ModePaiement, string> = { especes: 'Espèces', mobile_money: 'Mobile Money', virement: 'Virement', carte: 'Carte bancaire', cheque: 'Chèque', autre: 'Autre' };
    return labels[mode];
  }

  close(): void {
    if (!this.submitting) {
      this.closed.emit();
    }
  }

  submit(): void {
    const form = this.formModel;
    if (this.submitting || !form.montant || form.montant <= 0 || !form.modePaiement) {
      return;
    }
    if (this.isEdit) {
      this.submitUpdate();
      return;
    }
    if (!form.propriete || !this.dureeValide) {
      return;
    }

    this.submitting = true;
    this.formError = '';
    this.conflitMessage = '';
    this.paiementsService.create({
      propriete: form.propriete,
      dureeMois: Number(form.dureeMois),
      montant: Number(form.montant),
      devise: form.devise,
      modePaiement: form.modePaiement,
      description: form.description,
      ...(form.periodeDebut ? { periodeDebut: form.periodeDebut } : {})
    }).subscribe({
      next: (response) => {
        this.submitting = false;
        this.created = response.paiement;
        this.saved.emit(response.paiement);
      },
      error: (error: HttpErrorResponse) => this.handleError(error, 'Impossible d’enregistrer ce paiement.')
    });
  }

  private submitUpdate(): void {
    const paiement = this.paiement as Paiement;
    const form = this.formModel;
    const payload: PaiementUpdatePayload = {
      montant: Number(form.montant),
      devise: form.devise,
      modePaiement: form.modePaiement,
      description: form.description
    };
    // La période n'est envoyée que si elle a réellement changé (le serveur la recalcule)
    if (this.periodeModifiable) {
      if (!this.dureeValide) {
        return;
      }
      if (Number(form.dureeMois) !== paiement.dureeMois) {
        payload.dureeMois = Number(form.dureeMois);
      }
      if (form.periodeDebut && form.periodeDebut !== this.toDateInputValue(paiement.periodeDebut)) {
        payload.periodeDebut = form.periodeDebut;
      }
    }

    this.submitting = true;
    this.formError = '';
    this.conflitMessage = '';
    this.paiementsService.update(paiement._id, payload).subscribe({
      next: (response) => {
        this.submitting = false;
        this.saved.emit(response.paiement);
        this.closed.emit();
      },
      error: (error: HttpErrorResponse) => this.handleError(error, 'Impossible de modifier ce paiement.')
    });
  }

  // 409 : abonnement en cours (pas de nouvelle tentative, le formulaire est conservé) ;
  // 400 / 404 et autres : message renvoyé par le serveur
  private handleError(error: HttpErrorResponse, defaut: string): void {
    this.submitting = false;
    const conflit = erreurAbonnementEnCours(error);
    if (conflit) {
      this.conflitMessage = conflit.dateExpirationAbonnement
        ? `Un abonnement est déjà en cours jusqu'au ${formatDateCourte(conflit.dateExpirationAbonnement)}.`
        : conflit.message;
      this.abonnementEnCours.emit(this.formModel.propriete);
      return;
    }
    this.formError = error.error?.message || defaut;
  }

  private proprieteIdOf(paiement: Paiement): string {
    return typeof paiement.propriete === 'string' ? paiement.propriete : paiement.propriete?._id || '';
  }

  // Le serveur prend la date du jour (UTC) quand periodeDebut est absent
  private defaultDebut(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private toDateInputValue(value: string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private emptyForm(): PaiementFormModel {
    return { propriete: '', dureeMois: 1, montant: null, devise: 'CDF', modePaiement: 'especes', description: '', periodeDebut: '' };
  }
}
