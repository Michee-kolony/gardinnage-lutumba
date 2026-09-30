import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

import {
  Affectation,
  AffectationsService,
  CreateAffectationPayload,
  JOURS_SERVICE,
  JourService,
  RoleAffectation,
  UNITES_DUREE,
  UniteDuree,
  UpdateAffectationPayload,
  ajouterDuree,
  nomComplet,
  passeMinuit,
  roleLabel
} from '../../../core/affectations.service';
import { Gardien, GardiensService } from '../../../core/gardiens.service';
import { Propriete, ProprietesService, formatDateCourte } from '../../../core/proprietes.service';

interface AffectationFormModel {
  propriete: string;
  gardien: string;
  // '' = Automatique (role non envoyé)
  role: RoleAffectation | '';
  heureDebut: string;
  heureFin: string;
  joursService: JourService[];
  duree: number | null;
  uniteDuree: UniteDuree;
  // 'AAAA-MM-JJ' ou '' (= aujourd'hui côté serveur)
  dateDebut: string;
  description: string;
}

const FORMAT_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Modal « Affecter un gardien » (affectation = null) ou « Modifier l'affectation ».
// Le statut, la date de fin et les rôles des autres affectations sont gérés par
// le serveur : ils ne sont jamais envoyés ni modifiés ici.
@Component({
  selector: 'app-affectation-form',
  templateUrl: './affectation-form.component.html'
})
export class AffectationFormComponent implements OnInit {
  // Préselection (depuis la fiche propriété ou la fiche gardien)
  @Input() proprieteId = '';
  @Input() gardienId = '';
  // Affectation à modifier ; null = création
  @Input() affectation: Affectation | null = null;

  @Output() saved = new EventEmitter<Affectation>();
  @Output() closed = new EventEmitter<void>();

  readonly unites = UNITES_DUREE;
  readonly semaine = JOURS_SERVICE;
  readonly raccourcis = [
    { label: 'Nuit', debut: '18:00', fin: '06:00' },
    { label: 'Jour', debut: '06:00', fin: '18:00' },
    { label: '24 h', debut: '06:00', fin: '06:00' }
  ];
  formModel: AffectationFormModel = this.emptyForm();

  proprietes: Propriete[] = [];
  gardiens: Gardien[] = [];
  // Affectations en cours : aide pour le principal actuel et les gardiens déjà en service
  enCours: Affectation[] = [];
  chargement = false;
  chargementErreur = '';

  submitting = false;
  formError = '';

  constructor(
    private affectationsService: AffectationsService,
    private proprietesService: ProprietesService,
    private gardiensService: GardiensService
  ) {}

  ngOnInit(): void {
    if (this.affectation) {
      const a = this.affectation;
      this.formModel = {
        propriete: a.propriete?._id || '',
        gardien: a.gardien?._id || '',
        role: a.role,
        heureDebut: a.heureDebut || '',
        heureFin: a.heureFin || '',
        joursService: a.joursService?.length ? [...a.joursService] : [...JOURS_SERVICE],
        duree: a.duree,
        uniteDuree: a.uniteDuree,
        dateDebut: this.toDateInputValue(a.dateDebut),
        description: a.description || ''
      };
    } else {
      this.formModel = { ...this.emptyForm(), propriete: this.proprieteId, gardien: this.gardienId };
      this.chargerListes();
    }
    this.affectationsService.list({ statut: 'en cours' }).subscribe({
      next: (res) => (this.enCours = res.affectations),
      error: () => (this.enCours = [])
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  get isEdit(): boolean {
    return !!this.affectation;
  }

  get dureeValide(): boolean {
    const duree = this.formModel.duree;
    return duree !== null && Number.isInteger(Number(duree)) && Number(duree) >= 1;
  }

  get heuresValides(): boolean {
    return FORMAT_HEURE.test(this.formModel.heureDebut) && FORMAT_HEURE.test(this.formModel.heureFin);
  }

  get formValide(): boolean {
    return this.dureeValide && this.heuresValides && this.formModel.joursService.length > 0
      && !!this.formModel.propriete && !!this.formModel.gardien;
  }

  get selectedPropriete(): Propriete | undefined {
    return this.proprietes.find((p) => p._id === this.formModel.propriete);
  }

  get proprietaireNom(): string {
    const proprietaire = this.affectation ? this.affectation.propriete?.proprietaire : this.selectedPropriete?.proprietaire;
    return proprietaire ? nomComplet(proprietaire) : '';
  }

  get proprietairePhoto(): string {
    const proprietaire = this.affectation ? this.affectation.propriete?.proprietaire : this.selectedPropriete?.proprietaire;
    return proprietaire?.photo || '';
  }

  get finLendemain(): boolean {
    return this.heuresValides && passeMinuit(this.formModel.heureDebut, this.formModel.heureFin);
  }

  // Principal en cours sur la propriété (autre que cette affectation)
  get principalActuel(): Affectation | undefined {
    return this.enCours.find((a) =>
      a.role === 'principal' && a.propriete?._id === this.formModel.propriete && a._id !== this.affectation?._id
    );
  }

  get avertissementPrincipal(): string {
    const principal = this.principalActuel;
    if (this.formModel.role !== 'principal' || !principal || principal.gardien?._id === this.formModel.gardien) {
      return '';
    }
    return `${nomComplet(principal.gardien)} est le gardien principal actuel ; il deviendra remplaçant.`;
  }

  // Aperçu « Du <début> au <fin estimée> », même calcul que le serveur
  get apercuPeriode(): string {
    if (!this.dureeValide) {
      return '';
    }
    const debut = this.formModel.dateDebut
      ? new Date(this.formModel.dateDebut)
      : this.affectation ? new Date(this.affectation.dateDebut) : this.aujourdhui();
    if (Number.isNaN(debut.getTime())) {
      return '';
    }
    const fin = ajouterDuree(debut, Number(this.formModel.duree), this.formModel.uniteDuree);
    return `Du ${formatDateCourte(debut)} au ${formatDateCourte(fin)}`;
  }

  nom(personne: { prenom?: string; nom?: string; postnom?: string } | null | undefined): string {
    return nomComplet(personne);
  }

  roleLabel(role: RoleAffectation): string {
    return roleLabel(role);
  }

  uniteLabel(unite: UniteDuree): string {
    const labels: Record<UniteDuree, string> = { jours: 'Jours', semaines: 'Semaines', mois: 'Mois' };
    return labels[unite];
  }

  appliquerRaccourci(raccourci: { debut: string; fin: string }): void {
    this.formModel.heureDebut = raccourci.debut;
    this.formModel.heureFin = raccourci.fin;
  }

  raccourciActif(raccourci: { debut: string; fin: string }): boolean {
    return this.formModel.heureDebut === raccourci.debut && this.formModel.heureFin === raccourci.fin;
  }

  jourActif(jour: JourService): boolean {
    return this.formModel.joursService.includes(jour);
  }

  // Les jours restent dans l'ordre de la semaine
  basculerJour(jour: JourService): void {
    const jours = this.jourActif(jour)
      ? this.formModel.joursService.filter((j) => j !== jour)
      : [...this.formModel.joursService, jour];
    this.formModel.joursService = JOURS_SERVICE.filter((j) => jours.includes(j));
  }

  toutesLesJournees(): void {
    this.formModel.joursService = [...JOURS_SERVICE];
  }

  chargerListes(): void {
    this.chargement = true;
    this.chargementErreur = '';
    let restant = 2;
    const fin = () => {
      restant -= 1;
      if (restant === 0) this.chargement = false;
    };
    this.proprietesService.list().subscribe({
      next: (res) => { this.proprietes = res.proprietes; fin(); },
      error: (err: HttpErrorResponse) => { this.chargementErreur = err.error?.message || 'Impossible de charger les propriétés.'; fin(); }
    });
    this.gardiensService.list().subscribe({
      next: (res) => { this.gardiens = res.gardiens; fin(); },
      error: (err: HttpErrorResponse) => { this.chargementErreur = err.error?.message || 'Impossible de charger les gardiens.'; fin(); }
    });
  }

  close(): void {
    if (!this.submitting) {
      this.closed.emit();
    }
  }

  submit(): void {
    if (this.submitting || !this.formValide) {
      return;
    }
    this.submitting = true;
    this.formError = '';
    const requete = this.affectation
      ? this.affectationsService.update(this.affectation._id, this.buildUpdatePayload(this.affectation))
      : this.affectationsService.create(this.buildCreatePayload());

    requete.subscribe({
      next: (res) => {
        this.submitting = false;
        this.saved.emit(res.affectation);
        this.closed.emit();
      },
      // 409 (service qui se croise), 400, 404… : message du serveur, formulaire conservé
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.formError = err.error?.message || 'Impossible d’enregistrer cette affectation.';
      }
    });
  }

  private buildCreatePayload(): CreateAffectationPayload {
    const form = this.formModel;
    return {
      propriete: form.propriete,
      gardien: form.gardien,
      duree: Number(form.duree),
      uniteDuree: form.uniteDuree,
      heureDebut: form.heureDebut,
      heureFin: form.heureFin,
      joursService: form.joursService,
      ...(form.dateDebut ? { dateDebut: form.dateDebut } : {}),
      // Automatique : le serveur choisit principal ou remplaçant
      ...(form.role ? { role: form.role } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {})
    };
  }

  // Seuls les champs réellement modifiés sont envoyés (le serveur recalcule la date de fin)
  private buildUpdatePayload(a: Affectation): UpdateAffectationPayload {
    const form = this.formModel;
    const payload: UpdateAffectationPayload = {};
    if (form.role && form.role !== a.role) payload.role = form.role;
    if (form.heureDebut !== (a.heureDebut || '')) payload.heureDebut = form.heureDebut;
    if (form.heureFin !== (a.heureFin || '')) payload.heureFin = form.heureFin;
    if (form.joursService.join(',') !== (a.joursService || []).join(',')) payload.joursService = form.joursService;
    if (Number(form.duree) !== a.duree) payload.duree = Number(form.duree);
    if (form.uniteDuree !== a.uniteDuree) payload.uniteDuree = form.uniteDuree;
    if (form.dateDebut && form.dateDebut !== this.toDateInputValue(a.dateDebut)) payload.dateDebut = form.dateDebut;
    if (form.description !== (a.description || '')) payload.description = form.description;
    return payload;
  }

  // Le serveur prend la date du jour (UTC) quand dateDebut est absente
  private aujourdhui(): Date {
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

  private emptyForm(): AffectationFormModel {
    return {
      propriete: '',
      gardien: '',
      role: '',
      heureDebut: '',
      heureFin: '',
      joursService: [...JOURS_SERVICE],
      duree: 1,
      uniteDuree: 'mois',
      dateDebut: '',
      description: ''
    };
  }
}
