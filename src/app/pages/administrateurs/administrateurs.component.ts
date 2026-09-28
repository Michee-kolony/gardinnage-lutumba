import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { AdminRole, AdminsService, CreateAdminPayload } from '../../core/admins.service';
import { AdminData } from '../../core/auth.service';

@Component({
  selector: 'app-administrateurs',
  templateUrl: './administrateurs.component.html',
  styleUrl: './administrateurs.component.css'
})
export class AdministrateursComponent implements OnInit, OnDestroy {
  admins: AdminData[] = [];
  loading = true;
  loadError = '';

  searchTerm = '';

  isModalOpen = false;
  submitting = false;
  formModel: CreateAdminPayload = this.buildEmptyForm();

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private adminsService: AdminsService) {}

  ngOnInit(): void {
    this.fetchAdmins();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  get filteredAdmins(): AdminData[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.admins;
    }
    return this.admins.filter((admin) =>
      admin.nom.toLowerCase().includes(term) ||
      admin.email.toLowerCase().includes(term) ||
      admin.role.toLowerCase().includes(term)
    );
  }

  fetchAdmins(): void {
    this.loading = true;
    this.loadError = '';

    this.adminsService.list().subscribe({
      next: (res) => {
        this.admins = res.admins;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger la liste des administrateurs.';
        this.loading = false;
      }
    });
  }

  roleBadgeClass(role: string): string {
    return role === 'SUPER_ADMIN'
      ? 'bg-black text-white border border-black'
      : 'bg-neutral-100 text-black border border-neutral-300';
  }

  statusBadgeClass(actif: boolean): string {
    return actif
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-red-100 text-red-700 border border-red-200';
  }

  openModal(): void {
    this.formModel = this.buildEmptyForm();
    this.isModalOpen = true;
  }

  closeModal(): void {
    if (this.submitting) {
      return;
    }
    this.isModalOpen = false;
  }

  submitAdmin(): void {
    if (this.submitting || !this.formModel.nom || !this.formModel.email || !this.formModel.password) {
      return;
    }

    this.submitting = true;

    this.adminsService.create(this.formModel).subscribe({
      next: (res) => {
        this.submitting = false;
        this.admins = [res.admin, ...this.admins];
        this.isModalOpen = false;
        this.showToast('success', 'Administrateur ajouté avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.showToast('error', err.error?.message || "Impossible d'ajouter cet administrateur.");
      }
    });
  }

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

  private buildEmptyForm(): CreateAdminPayload {
    return {
      nom: '',
      email: '',
      password: '',
      role: 'ADMIN' as AdminRole
    };
  }
}
