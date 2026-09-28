import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {
  CreateProprietairePayload,
  PROPRIETAIRE_ROLES,
  PROPRIETAIRE_SEXES,
  Proprietaire,
  ProprietaireRole,
  ProprietairesService,
  UpdateProprietairePayload
} from '../../core/proprietaires.service';

@Component({
  selector: 'app-proprietaires',
  templateUrl: './proprietaires.component.html',
  styleUrl: './proprietaires.component.css'
})
export class ProprietairesComponent implements OnInit, OnDestroy {
  proprietaires: Proprietaire[] = [];
  loading = true;
  loadError = '';

  searchTerm = '';

  rolesDisponibles = PROPRIETAIRE_ROLES;
  sexesDisponibles = PROPRIETAIRE_SEXES;

  isModalOpen = false;
  submitting = false;
  selectedFileName = '';
  photoPreview = '';
  formModel: CreateProprietairePayload = this.buildEmptyForm();

  editModalOpen = false;
  submittingEdit = false;
  editSelectedFileName = '';
  editPhotoPreview = '';
  editFormModel: UpdateProprietairePayload = this.buildEmptyEditForm();
  private editingId = '';

  deleteModalOpen = false;
  deleting = false;
  private deletingTarget?: Proprietaire;

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private proprietairesService: ProprietairesService, private router: Router) {}

  ngOnInit(): void {
    this.fetchProprietaires();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeDeleteModal();
    this.closeEditModal();
  }

  get filteredProprietaires(): Proprietaire[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.proprietaires;
    }
    return this.proprietaires.filter((p) =>
      p.nom.toLowerCase().includes(term) ||
      p.postnom.toLowerCase().includes(term) ||
      p.prenom.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.telephone.toLowerCase().includes(term) ||
      p.adresse.toLowerCase().includes(term) ||
      p.profession.toLowerCase().includes(term)
    );
  }

  fetchProprietaires(): void {
    this.loading = true;
    this.loadError = '';

    this.proprietairesService.list().subscribe({
      next: (res) => {
        this.proprietaires = res.proprietaires;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger la liste des propriétaires.';
        this.loading = false;
      }
    });
  }

  private static readonly ROLE_LABELS: Record<ProprietaireRole, string> = {
    PROPRIETAIRE: 'Propriétaire',
    GESTIONNAIRE: 'Gestionnaire',
    MANDATAIRE: 'Mandataire',
    LOCATAIRE: 'Locataire'
  };

  private static readonly ROLE_BADGE_CLASSES: Record<ProprietaireRole, string> = {
    PROPRIETAIRE: 'bg-neutral-100 text-black border border-neutral-300',
    GESTIONNAIRE: 'bg-black text-white border border-black',
    MANDATAIRE: 'bg-blue-100 text-blue-700 border border-blue-200',
    LOCATAIRE: 'bg-amber-100 text-amber-800 border border-amber-300'
  };

  roleLabel(role: ProprietaireRole): string {
    return ProprietairesComponent.ROLE_LABELS[role];
  }

  roleBadgeClass(role: ProprietaireRole): string {
    return ProprietairesComponent.ROLE_BADGE_CLASSES[role];
  }

  statusBadgeClass(actif: boolean): string {
    return actif
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-red-100 text-red-700 border border-red-200';
  }

  openProprietaire(proprietaire: Proprietaire): void {
    this.router.navigate(['/admin/proprietaires', proprietaire._id]);
  }

  // --- Ajout ---

  openModal(): void {
    this.formModel = this.buildEmptyForm();
    this.selectedFileName = '';
    this.photoPreview = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    if (this.submitting) {
      return;
    }
    this.isModalOpen = false;
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.formModel.photo = file;
    this.selectedFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitProprietaire(): void {
    if (this.submitting || !this.formModel.nom || !this.formModel.telephone || !this.formModel.password) {
      return;
    }

    this.submitting = true;

    this.proprietairesService.create(this.formModel).subscribe({
      next: (res) => {
        this.submitting = false;
        this.proprietaires = [res.proprietaire, ...this.proprietaires];
        this.isModalOpen = false;
        this.showToast('success', 'Propriétaire ajouté avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.showToast('error', err.error?.message || "Impossible d'ajouter ce propriétaire.");
      }
    });
  }

  // --- Modification ---

  openEditModal(proprietaire: Proprietaire): void {
    this.editingId = proprietaire._id;
    this.editFormModel = {
      nom: proprietaire.nom,
      postnom: proprietaire.postnom,
      prenom: proprietaire.prenom,
      sexe: proprietaire.sexe,
      profession: proprietaire.profession,
      telephone: proprietaire.telephone,
      email: proprietaire.email,
      adresse: proprietaire.adresse,
      password: '',
      role: proprietaire.role,
      actif: proprietaire.actif,
      photo: null
    };
    this.editSelectedFileName = '';
    this.editPhotoPreview = proprietaire.photo || '';
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    if (this.submittingEdit) {
      return;
    }
    this.editModalOpen = false;
  }

  onEditPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.editFormModel.photo = file;
    this.editSelectedFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.editPhotoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitEdit(): void {
    if (!this.editingId || this.submittingEdit) {
      return;
    }

    this.submittingEdit = true;

    this.proprietairesService.update(this.editingId, this.editFormModel).subscribe({
      next: (res) => {
        this.submittingEdit = false;
        this.proprietaires = this.proprietaires.map((p) => (p._id === res.proprietaire._id ? res.proprietaire : p));
        this.editModalOpen = false;
        this.showToast('success', 'Propriétaire modifié avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.submittingEdit = false;
        this.showToast('error', err.error?.message || 'Impossible de modifier ce propriétaire.');
      }
    });
  }

  // --- Suppression ---

  openDeleteModal(proprietaire: Proprietaire): void {
    if (this.deleting) {
      return;
    }
    this.deletingTarget = proprietaire;
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) {
      return;
    }
    this.deleteModalOpen = false;
  }

  get deletingTargetName(): string {
    return this.deletingTarget ? `${this.deletingTarget.prenom} ${this.deletingTarget.nom}` : '';
  }

  confirmDeleteProprietaire(): void {
    if (!this.deletingTarget || this.deleting) {
      return;
    }

    const id = this.deletingTarget._id;
    this.deleting = true;

    this.proprietairesService.remove(id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteModalOpen = false;
        this.proprietaires = this.proprietaires.filter((p) => p._id !== id);
        this.showToast('success', 'Propriétaire supprimé avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.deleteModalOpen = false;
        this.showToast('error', err.error?.message || 'Impossible de supprimer ce propriétaire.');
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

  private buildEmptyForm(): CreateProprietairePayload {
    return {
      nom: '',
      postnom: '',
      prenom: '',
      sexe: null,
      profession: '',
      telephone: '',
      password: '',
      email: '',
      adresse: '',
      photo: null
    };
  }

  private buildEmptyEditForm(): UpdateProprietairePayload {
    return {
      nom: '',
      postnom: '',
      prenom: '',
      sexe: null,
      profession: '',
      telephone: '',
      email: '',
      adresse: '',
      password: '',
      role: 'PROPRIETAIRE',
      actif: true,
      photo: null
    };
  }
}
