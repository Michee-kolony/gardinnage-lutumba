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
  // 'AAAA-MM-JJ' (aujourd'hui par défaut) ; '' = aujourd'hui côté serveur
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
    const debut = this.dateDebutChoisie;
    if (Number.isNaN(debut.getTime())) {
      return '';
    }
    const fin = ajouterDuree(debut, Number(this.formModel.duree), this.formModel.uniteDuree);
    return `Du ${formatDateCourte(debut)} au ${formatDateCourte(fin)}`;
  }

  // Info sur une date de début future ou passée (en modification : seulement si elle a été changée)
  get infoDateDebut(): string {
    const date = this.formModel.dateDebut;
    if (!date || (this.affectation && date === this.toDateInputValue(this.affectation.dateDebut))) {
      return '';
    }
    const aujourdhui = this.dateDuJour();
    if (date > aujourdhui) {
      return `L’affectation sera « à venir » jusqu’au ${formatDateCourte(new Date(date))}.`;
    }
    if (date < aujourdhui) {
      return 'Début rétroactif : les services déjà passés depuis cette date apparaîtront comme absences s’ils n’ont pas été pointés.';
    }
    if (this.serviceDuJourTermine) {
      return `Le service d’aujourd’hui (${this.formModel.heureDebut} → ${this.formModel.heureFin}) est déjà terminé : le premier service sera le prochain jour coché. Utilisez « Maintenant » pour que le gardien commence tout de suite.`;
    }
    return '';
  }

  // Service d'aujourd'hui déjà fini (le jour du service est celui où il commence)
  private get serviceDuJourTermine(): boolean {
    if (!this.heuresValides || this.finLendemain) {
      return false;
    }
    const jour = JOURS_SERVICE[(new Date().getDay() + 6) % 7];
    return this.formModel.joursService.includes(jour) && this.formModel.heureFin <= this.heureActuelle();
  }

  // 'AAAA-MM-JJ' → minuit UTC de ce jour, comme le serveur
  private get dateDebutChoisie(): Date {
    if (this.formModel.dateDebut) {
      return new Date(this.formModel.dateDebut);
    }
    return this.affectation ? new Date(this.affectation.dateDebut) : new Date(this.dateDuJour());
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

  // Service qui commence à l'heure actuelle, en gardant la durée choisie (12 h par défaut)
  commencerMaintenant(): void {
    const debut = this.heureActuelle();
    const duree = this.heuresValides ? this.minutes(this.formModel.heureFin) - this.minutes(this.formModel.heureDebut) : 12 * 60;
    const fin = (this.minutes(debut) + (duree > 0 ? duree : duree + 24 * 60)) % (24 * 60);
    this.formModel.heureDebut = debut;
    this.formModel.heureFin = `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
    if (!this.isEdit) {
      this.formModel.dateDebut = this.dateDuJour();
    }
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

  // Date du jour (AAAA-MM-JJ, heure locale) : valeur par défaut, modifiable par l'admin.
  // Le serveur prend aussi le jour local quand dateDebut est absente.
  private dateDuJour(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  // Heure locale actuelle « HH:mm »
  private heureActuelle(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  private minutes(heure: string): number {
    const [h, m] = heure.split(':').map(Number);
    return h * 60 + m;
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
      dateDebut: this.dateDuJour(),
      description: ''
    };
  }
}
