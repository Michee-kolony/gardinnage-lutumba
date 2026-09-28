import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  PROPRIETAIRE_ROLES,
  PROPRIETAIRE_SEXES,
  Proprietaire,
  ProprietaireRole,
  ProprietairesService,
  UpdateProprietairePayload
} from '../../../core/proprietaires.service';

@Component({
  selector: 'app-proprietaire-detail',
  templateUrl: './proprietaire-detail.component.html',
  styleUrl: './proprietaire-detail.component.css'
})
export class ProprietaireDetailComponent implements OnInit, OnDestroy {
  proprietaire?: Proprietaire;
  loading = true;
  loadError = '';

  rolesDisponibles = PROPRIETAIRE_ROLES;
  sexesDisponibles = PROPRIETAIRE_SEXES;

  deleting = false;
  deleteModalOpen = false;

  editModalOpen = false;
  submittingEdit = false;
  editSelectedFileName = '';
  editPhotoPreview = '';
  editFormModel: UpdateProprietairePayload = this.buildEmptyEditForm();

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  private proprietaireId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proprietairesService: ProprietairesService
  ) {}

  ngOnInit(): void {
    this.proprietaireId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.proprietaireId) {
      this.router.navigate(['/admin/proprietaires']);
      return;
    }

    this.fetchProprietaire();
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

  fetchProprietaire(): void {
    this.loading = true;
    this.loadError = '';

    this.proprietairesService.getById(this.proprietaireId).subscribe({
      next: (res) => {
        this.proprietaire = res.proprietaire;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger ce propriétaire.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/proprietaires']);
  }

  formatDate(value: string): string {
    if (!value) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
    } catch {
      return value;
    }
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
    return ProprietaireDetailComponent.ROLE_LABELS[role];
  }

  roleBadgeClass(role: ProprietaireRole): string {
    return ProprietaireDetailComponent.ROLE_BADGE_CLASSES[role];
  }

  statusBadgeClass(actif: boolean): string {
    return actif
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-red-100 text-red-700 border border-red-200';
  }

  // --- Modification ---

  openEditModal(): void {
    if (!this.proprietaire) {
      return;
    }

    const p = this.proprietaire;
    this.editFormModel = {
      nom: p.nom,
      postnom: p.postnom,
      prenom: p.prenom,
      sexe: p.sexe,
      profession: p.profession,
      telephone: p.telephone,
      email: p.email,
      adresse: p.adresse,
      password: '',
      role: p.role,
      actif: p.actif,
      photo: null
    };
    this.editSelectedFileName = '';
    this.editPhotoPreview = p.photo || '';
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
    if (!this.proprietaire || this.submittingEdit) {
      return;
    }

    this.submittingEdit = true;

    this.proprietairesService.update(this.proprietaire._id, this.editFormModel).subscribe({
      next: (res) => {
        this.submittingEdit = false;
        this.proprietaire = res.proprietaire;
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

  openDeleteModal(): void {
    if (!this.proprietaire || this.deleting) {
      return;
    }
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) {
      return;
    }
    this.deleteModalOpen = false;
  }

  confirmDeleteProprietaire(): void {
    if (!this.proprietaire || this.deleting) {
      return;
    }

    this.deleting = true;

    this.proprietairesService.remove(this.proprietaire._id).subscribe({
      next: () => {
        this.router.navigate(['/admin/proprietaires']);
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
