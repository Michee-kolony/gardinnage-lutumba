import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Gardien, GardiensService, STATUTS_GARDIEN, StatutGardien } from '../../core/gardiens.service';

interface NewGardienForm {
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  pseudo: string;
  statut: StatutGardien;
  zone: string;
  telephone: string;
  photoUrl: string;
}

@Component({
  selector: 'app-gardiens',
  templateUrl: './gardiens.component.html',
  styleUrl: './gardiens.component.css'
})
export class GardiensComponent {
  searchTerm = '';
  isModalOpen = false;
  selectedFileName = '';
  statutsDisponibles = STATUTS_GARDIEN;

  constructor(private gardiensService: GardiensService, private router: Router) {}

  get gardiens(): Gardien[] {
    return this.gardiensService.getGardiens();
  }

  formModel: NewGardienForm = this.buildEmptyForm();

  get filteredGardiens(): Gardien[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.gardiens;
    }
    return this.gardiens.filter((g) =>
      g.nom.toLowerCase().includes(term) ||
      g.postnom.toLowerCase().includes(term) ||
      g.prenom.toLowerCase().includes(term) ||
      g.pseudo.toLowerCase().includes(term) ||
      g.matricule.toLowerCase().includes(term) ||
      g.zone.toLowerCase().includes(term) ||
      g.statut.toLowerCase().includes(term)
    );
  }

  statutBadgeClass(statut: StatutGardien): string {
    switch (statut) {
      case 'En service':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'Disponible':
        return 'bg-neutral-100 text-black border border-neutral-300';
      case 'Absent':
        return 'bg-red-100 text-red-700 border border-red-200';
    }
  }

  openGardien(gardien: Gardien): void {
    this.router.navigate(['/admin/gardiens', gardien.id]);
  }

  openModal(): void {
    this.formModel = this.buildEmptyForm();
    this.selectedFileName = '';
    this.isModalOpen = true;
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.selectedFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.formModel.photoUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmitGardien(): void {
    const nextId = this.gardiensService.nextId;

    const gardien: Gardien = {
      id: nextId,
      matricule: this.formModel.matricule.trim() || `GRD-2024-${String(nextId).padStart(3, '0')}`,
      nom: this.formModel.nom.trim(),
      postnom: this.formModel.postnom.trim(),
      prenom: this.formModel.prenom.trim() || '—',
      pseudo: this.formModel.pseudo.trim() || '—',
      photoUrl: this.formModel.photoUrl.trim() || `https://i.pravatar.cc/300?img=${(nextId % 70) + 1}`,
      statut: this.formModel.statut,
      zone: this.formModel.zone.trim(),
      telephone: this.formModel.telephone.trim(),
      dateNaissance: '—',
      lieuNaissance: '—',
      adresse: '—',
      dateEmbauche: '—',
      numeroCni: '—',
      groupeSanguin: '—',
      contactUrgenceNom: '—',
      contactUrgenceTelephone: '—',
      maisons: [],
      commentaires: [],
    };

    this.gardiensService.addGardien(gardien);
    this.closeModal();
  }

  private buildEmptyForm(): NewGardienForm {
    const nextId = this.gardiensService.nextId;
    return {
      matricule: `GRD-2024-${String(nextId).padStart(3, '0')}`,
      nom: '',
      postnom: '',
      prenom: '',
      pseudo: '',
      statut: 'Disponible',
      zone: '',
      telephone: '',
      photoUrl: '',
    };
  }
}
