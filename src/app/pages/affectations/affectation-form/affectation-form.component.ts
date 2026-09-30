import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

import {
  Affectation,
  AffectationsService,
  CreateAffectationPayload,
  UNITES_DUREE,
  UniteDuree,
  UpdateAffectationPayload,
  ajouterDuree,
  nomCompletGardien
} from '../../../core/affectations.service';
import { Gardien, GardiensService } from '../../../core/gardiens.service';
import { Propriete, ProprietesService, formatDateCourte } from '../../../core/proprietes.service';

interface AffectationFormModel {
  propriete: string;
  gardien: string;
  duree: number | null;
  uniteDuree: UniteDuree;
  // 'AAAA-MM-JJ' ou '' (= aujourd'hui côté serveur)
  dateDebut: string;
  estPrincipal: boolean;
  description: string;
}

// Modal de création (affectation = null) ou de modification d'une affectation.
// Le statut et la date de fin sont toujours calculés par le serveur : ils ne
// sont jamais envoyés. La propriété et le gardien ne sont pas modifiables.
@Component({
  selector: 'app-affectation-form',
  templateUrl: './affectation-form.component.html'
})
export class AffectationFormComponent implements OnInit {
  // Préselection (création depuis la fiche propriété ou la fiche gardien)
  @Input() proprieteId = '';
  @Input() gardienId = '';
  // Affectation à modifier ; null = création
  @Input() affectation: Affectation | null = null;

  @Output() saved = new EventEmitter<Affectation>();
  @Output() closed = new EventEmitter<void>();

  readonly unites = UNITES_DUREE;
  formModel: AffectationFormModel = this.emptyForm();

  proprietes: Propriete[] = [];
  gardiens: Gardien[] = [];
  // Affectations en cours : aide pour signaler les gardiens occupés et le principal actuel
  // (le serveur reste l'autorité : réponse 409)
  enCours: Affectation[] = [];
  chargement = false;
  chargementErreur = '';

  gardienPickerOpen = false;
  gardienSearchTerm = '';

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
        duree: a.duree,
        uniteDuree: a.uniteDuree,
        dateDebut: this.toDateInputValue(a.dateDebut),
        estPrincipal: a.estPrincipal,
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
    if (this.gardienPickerOpen) {
      this.gardienPickerOpen = false;
      return;
    }
    this.close();
  }

  get isEdit(): boolean {
    return !!this.affectation;
  }

  get dureeValide(): boolean {
    const duree = this.formModel.duree;
    return duree !== null && Number.isInteger(Number(duree)) && Number(duree) >= 1;
  }

  get formValide(): boolean {
    return this.dureeValide && !!this.formModel.propriete && !!this.formModel.gardien;
  }

  get selectedGardien(): Gardien | undefined {
    return this.gardiens.find((g) => g._id === this.formModel.gardien);
  }

  get filteredGardiens(): Gardien[] {
    const term = this.gardienSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.gardiens;
    }
    return this.gardiens.filter((g) =>
      `${nomCompletGardien(g)} ${g.matricule}`.toLowerCase().includes(term)
    );
  }

  // Affectation en cours du gardien ailleurs (indication seulement)
  occupation(gardien: Gardien): Affectation | undefined {
    return this.enCours.find((a) => a.gardien?._id === gardien._id && a._id !== this.affectation?._id);
  }

  occupationLabel(gardien: Gardien): string {
    const a = this.occupation(gardien);
    return a ? `Occupé : ${a.propriete?.nomReference || 'une propriété'} jusqu'au ${formatDateCourte(a.dateFin)}` : '';
  }

  // Gardien principal actuel de la propriété choisie (autre que cette affectation)
  get principalActuel(): Affectation | undefined {
    return this.enCours.find((a) =>
      a.estPrincipal && a.propriete?._id === this.formModel.propriete && a._id !== this.affectation?._id
    );
  }

  get avertissementPrincipal(): string {
    const principal = this.principalActuel;
    if (!this.formModel.estPrincipal || !principal || principal.gardien?._id === this.formModel.gardien) {
      return '';
    }
    return `${nomCompletGardien(principal.gardien)} est actuellement le gardien principal ; il sera remplacé.`;
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

  nomGardien(gardien: Pick<Gardien, 'prenom' | 'nom' | 'postnom'> | null): string {
    return nomCompletGardien(gardien);
  }

  uniteLabel(unite: UniteDuree): string {
    const labels: Record<UniteDuree, string> = { jours: 'Jours', semaines: 'Semaines', mois: 'Mois' };
    return labels[unite];
  }

  toggleGardienPicker(): void {
    this.gardienPickerOpen = !this.gardienPickerOpen;
    this.gardienSearchTerm = '';
  }

  selectGardien(gardien: Gardien): void {
    this.formModel.gardien = gardien._id;
    this.gardienPickerOpen = false;
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
      // 409 (gardien déjà affecté ailleurs), 400, 404… : message du serveur, formulaire conservé
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
      ...(form.dateDebut ? { dateDebut: form.dateDebut } : {}),
      // Non coché : le serveur désigne le principal automatiquement s'il n'y en a pas
      ...(form.estPrincipal ? { estPrincipal: true } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {})
    };
  }

  // Seuls les champs réellement modifiés sont envoyés (le serveur recalcule la date de fin)
  private buildUpdatePayload(a: Affectation): UpdateAffectationPayload {
    const form = this.formModel;
    const payload: UpdateAffectationPayload = {};
    if (Number(form.duree) !== a.duree) payload.duree = Number(form.duree);
    if (form.uniteDuree !== a.uniteDuree) payload.uniteDuree = form.uniteDuree;
    if (form.dateDebut && form.dateDebut !== this.toDateInputValue(a.dateDebut)) payload.dateDebut = form.dateDebut;
    if (form.estPrincipal !== a.estPrincipal) payload.estPrincipal = form.estPrincipal;
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
    return { propriete: '', gardien: '', duree: 1, uniteDuree: 'mois', dateDebut: '', estPrincipal: false, description: '' };
  }
}
