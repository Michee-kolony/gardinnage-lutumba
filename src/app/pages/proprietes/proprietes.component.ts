import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {
  NIVEAUX_SECURITE,
  NiveauSecurite,
  Propriete,
  ProprietePayload,
  ProprietesService,
  StatutAbonnement,
  TYPES_PROPRIETE,
  TypePropriete,
  messageErreurEnvoi,
  periodeAbonnementLabel,
  statutAbonnement,
  statutAbonnementBadgeClass,
  statutAbonnementLabel,
  verifierTailleFichiers
} from '../../core/proprietes.service';
import { Proprietaire, ProprietairesService } from '../../core/proprietaires.service';

@Component({
  selector: 'app-proprietes',
  templateUrl: './proprietes.component.html',
  styleUrl: './proprietes.component.css'
})
export class ProprietesComponent implements OnInit, OnDestroy {
  proprietes: Propriete[] = [];
  loading = true;
  loadError = '';

  searchTerm = '';
  abonnementFilter: 'tous' | StatutAbonnement = 'tous';

  typesDisponibles = TYPES_PROPRIETE;
  niveauxDisponibles = NIVEAUX_SECURITE;

  // Liste des vrais propriétaires (chargée une fois), utilisée par le
  // sélecteur "propriétaire" du formulaire d'ajout (nom + photo).
  proprietairesDisponibles: Proprietaire[] = [];
  ownerPickerOpen = false;
  ownerSearchTerm = '';

  isModalOpen = false;
  submitting = false;
  photosPreviews: string[] = [];
  documentSelectedName = '';
  autresDocumentsNames: string[] = [];
  formModel: ProprietePayload = this.buildEmptyForm();

  deleteModalOpen = false;
  deleting = false;
  private deletingTarget?: Propriete;

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private proprietesService: ProprietesService,
    private proprietairesService: ProprietairesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchProprietes();
    this.proprietairesService.list().subscribe({
      next: (res) => (this.proprietairesDisponibles = res.proprietaires),
      error: () => (this.proprietairesDisponibles = [])
    });
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeDeleteModal();
    this.ownerPickerOpen = false;
  }

  get filteredProprietes(): Propriete[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.proprietes.filter((p) => {
      const matchesTerm = !term ||
        p.nomReference.toLowerCase().includes(term) ||
        this.ownerFullName(p.proprietaire).toLowerCase().includes(term) ||
        p.commune.toLowerCase().includes(term) ||
        p.quartier.toLowerCase().includes(term) ||
        p.typePropriete.toLowerCase().includes(term);

      const matchesFilter = this.abonnementFilter === 'tous' || statutAbonnement(p) === this.abonnementFilter;

      return matchesTerm && matchesFilter;
    });
  }

  // Statut calculé par le serveur (actif / expiré / aucun), les dates sont en lecture seule
  abonnementBadgeClass(propriete: Propriete): string {
    return statutAbonnementBadgeClass(statutAbonnement(propriete));
  }

  abonnementLabel(propriete: Propriete): string {
    return statutAbonnementLabel(statutAbonnement(propriete));
  }

  periodeAbonnement(propriete: Propriete): string {
    return periodeAbonnementLabel(propriete);
  }

  get filteredOwnersForPicker(): Proprietaire[] {
    const term = this.ownerSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.proprietairesDisponibles;
    }
    return this.proprietairesDisponibles.filter((p) =>
      `${p.prenom} ${p.nom}`.toLowerCase().includes(term)
    );
  }

  fetchProprietes(): void {
    this.loading = true;
    this.loadError = '';

    this.proprietesService.list().subscribe({
      next: (res) => {
        this.proprietes = res.proprietes;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger la liste des propriétés.';
        this.loading = false;
      }
    });
  }

  openPropriete(propriete: Propriete): void {
    this.router.navigate(['/admin/proprietes', propriete._id]);
  }

  typeLabel(type: TypePropriete): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  niveauBadgeClass(niveau: NiveauSecurite): string {
    if (niveau === 'haute surveillance') {
      return 'bg-red-100 text-red-700 border border-red-200';
    }
    if (niveau === 'renforce') {
      return 'bg-amber-100 text-amber-800 border border-amber-300';
    }
    return 'bg-neutral-100 text-black border border-neutral-300';
  }

  ownerAvatar(proprietaire: Proprietaire): string {
    return proprietaire.photo || `https://ui-avatars.com/api/?background=e5e5e5&color=737373&name=${proprietaire.prenom}+${proprietaire.nom}`;
  }

  ownerFullName(proprietaire: Proprietaire | null): string {
    return proprietaire ? `${proprietaire.prenom} ${proprietaire.nom}` : 'Propriétaire supprimé';
  }

  // --- Sélecteur de propriétaire (select personnalisé avec photo) ---

  toggleOwnerPicker(): void {
    this.ownerPickerOpen = !this.ownerPickerOpen;
    this.ownerSearchTerm = '';
  }

  selectOwner(proprietaire: Proprietaire): void {
    this.formModel.proprietaire = proprietaire._id;
    this.ownerPickerOpen = false;
  }

  selectedOwner(): Proprietaire | undefined {
    return this.proprietairesDisponibles.find((p) => p._id === this.formModel.proprietaire);
  }

  // --- Ajout ---

  openModal(): void {
    this.formModel = this.buildEmptyForm();
    this.photosPreviews = [];
    this.documentSelectedName = '';
    this.autresDocumentsNames = [];
    this.ownerPickerOpen = false;
    this.ownerSearchTerm = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    if (this.submitting) {
      return;
    }
    this.isModalOpen = false;
    this.ownerPickerOpen = false;
  }

  onPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files || []).slice(0, 5);
    this.formModel.photos = files;
    this.photosPreviews = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => this.photosPreviews.push(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  onDocumentSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.formModel.documentPropriete = file;
    this.documentSelectedName = file?.name || '';
  }

  onAutresDocumentsSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files || []).slice(0, 5);
    this.formModel.autresDocuments = files;
    this.autresDocumentsNames = files.map((f) => f.name);
  }

  submitPropriete(): void {
    const f = this.formModel;
    if (this.submitting || !f.proprietaire || !f.nomReference || !f.typePropriete || !f.commune || !f.quartier || !f.avenue) {
      return;
    }

    const erreurTaille = verifierTailleFichiers(f);
    if (erreurTaille) {
      this.showToast('error', erreurTaille);
      return;
    }

    this.submitting = true;

    this.proprietesService.create(f).subscribe({
      next: (res) => {
        this.submitting = false;
        this.proprietes = [res.propriete, ...this.proprietes];
        this.isModalOpen = false;
        this.showToast('success', 'Propriété ajoutée avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.showToast('error', messageErreurEnvoi(err, "Impossible d'ajouter cette propriété."));
      }
    });
  }

  // --- Suppression ---

  openDeleteModal(propriete: Propriete): void {
    if (this.deleting) {
      return;
    }
    this.deletingTarget = propriete;
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) {
      return;
    }
    this.deleteModalOpen = false;
  }

  get deletingTargetName(): string {
    return this.deletingTarget?.nomReference || '';
  }

  confirmDeletePropriete(): void {
    if (!this.deletingTarget || this.deleting) {
      return;
    }

    const id = this.deletingTarget._id;
    this.deleting = true;

    this.proprietesService.remove(id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteModalOpen = false;
        this.proprietes = this.proprietes.filter((p) => p._id !== id);
        this.showToast('success', 'Propriété supprimée avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.deleteModalOpen = false;
        this.showToast('error', err.error?.message || 'Impossible de supprimer cette propriété.');
      }
    });
  }

  // --- Toast ---

  closeToast(): void {
    this.toastVisible = false;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  private showToast(type: 'success' | 'error', message: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastVisible = false;

    setTimeout(() => {
      this.toastType = type;
      this.toastMessage = message;
      this.toastVisible = true;
      this.toastTimer = setTimeout(() => this.closeToast(), 5000);
    });
  }

  private buildEmptyForm(): ProprietePayload {
    return {
      proprietaire: '',
      nomReference: '',
      typePropriete: 'maison' as TypePropriete,
      typeAutre: '',
      numeroParcelle: '',
      nombreBatiments: null,
      nombreNiveaux: null,
      commune: '',
      quartier: '',
      avenue: '',
      numero: '',
      referenceComplementaire: '',
      lat: null,
      lng: null,
      lienCarte: '',
      nombreChambres: null,
      nombrePortesAcces: null,
      cloture: false,
      portail: false,
      garage: false,
      nombreVehicules: null,
      autresInformations: '',
      niveauSecurite: 'standard' as NiveauSecurite,
      cameras: false,
      nombreCameras: 0,
      alarme: false,
      eclairageSecurite: false,
      interphone: false,
      autresEquipementsSecurite: '',
      photos: [],
      documentPropriete: null,
      autresDocuments: []
    };
  }
}
