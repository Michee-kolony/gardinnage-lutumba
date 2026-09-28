import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {
  CreateGardienPayload,
  ETATS_CIVILS,
  EtatCivil,
  Gardien,
  GardiensService,
  SEXES,
  STATUTS_GARDIEN,
  Sexe,
  StatutGardien
} from '../../core/gardiens.service';

@Component({
  selector: 'app-gardiens',
  templateUrl: './gardiens.component.html',
  styleUrl: './gardiens.component.css'
})
export class GardiensComponent implements OnInit, OnDestroy {
  gardiens: Gardien[] = [];
  loading = true;
  loadError = '';

  searchTerm = '';

  isModalOpen = false;
  submitting = false;
  selectedFileName = '';
  photoPreview = '';

  sexesDisponibles = SEXES;
  etatsCivilsDisponibles = ETATS_CIVILS;
  statutsDisponibles = STATUTS_GARDIEN;

  formModel: CreateGardienPayload = this.buildEmptyForm();

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private gardiensService: GardiensService, private router: Router) {}

  ngOnInit(): void {
    this.fetchGardiens();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  get filteredGardiens(): Gardien[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.gardiens;
    }
    return this.gardiens.filter((g) =>
      g.nom.toLowerCase().includes(term) ||
      g.postnom.toLowerCase().includes(term) ||
      g.prenom.toLowerCase().includes(term) ||
      g.matricule.toLowerCase().includes(term) ||
      g.commune.toLowerCase().includes(term) ||
      g.quartier.toLowerCase().includes(term) ||
      g.telephonePrincipal.toLowerCase().includes(term) ||
      g.statut.toLowerCase().includes(term)
    );
  }

  fetchGardiens(): void {
    this.loading = true;
    this.loadError = '';

    this.gardiensService.list().subscribe({
      next: (res) => {
        this.gardiens = res.gardiens;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger la liste des gardiens.';
        this.loading = false;
      }
    });
  }

  statutBadgeClass(statut: StatutGardien): string {
    return statut === 'en service'
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-neutral-100 text-black border border-neutral-300';
  }

  openGardien(gardien: Gardien): void {
    this.router.navigate(['/admin/gardiens', gardien._id]);
  }

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

  submitGardien(): void {
    if (this.submitting || !this.formModel.photo) {
      return;
    }

    this.submitting = true;

    this.gardiensService.create(this.formModel).subscribe({
      next: (res) => {
        this.submitting = false;
        this.gardiens = [res.gardien, ...this.gardiens];
        this.isModalOpen = false;
        this.showToast('success', 'Gardien ajouté avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.showToast('error', err.error?.message || "Impossible d'ajouter ce gardien.");
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

  private buildEmptyForm(): CreateGardienPayload {
    return {
      nom: '',
      postnom: '',
      prenom: '',
      sexe: 'M' as Sexe,
      dateNaissance: '',
      lieuNaissance: '',
      nationalite: '',
      etatCivil: 'celibataire' as EtatCivil,
      telephonePrincipal: '',
      telephoneSecondaire: '',
      email: '',
      password: '',
      adresseActuelle: '',
      commune: '',
      quartier: '',
      avenue: '',
      statut: 'non en service' as StatutGardien,
      photo: null
    };
  }
}
