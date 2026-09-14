import { Component } from '@angular/core';

type Civilite = 'M.' | 'Mme';

interface Proprietaire {
  id: number;
  civilite: Civilite;
  nom: string;
  prenom: string;
  photoUrl: string;
  email: string;
  telephone: string;
  nombreMaisons: number;
}

interface NewProprietaireForm {
  civilite: Civilite;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  nombreMaisons: number;
  photoUrl: string;
}

const CIVILITES: Civilite[] = ['M.', 'Mme'];

@Component({
  selector: 'app-proprietaires',
  templateUrl: './proprietaires.component.html',
  styleUrl: './proprietaires.component.css'
})
export class ProprietairesComponent {
  searchTerm = '';
  isModalOpen = false;
  selectedFileName = '';
  civilitesDisponibles = CIVILITES;

  proprietaires: Proprietaire[] = [
    { id: 1, civilite: 'M.', nom: 'Dubois', prenom: 'Bernard', photoUrl: 'https://i.pravatar.cc/150?img=60', email: 'bernard.dubois@email.fr', telephone: '06 11 22 33 44', nombreMaisons: 1 },
    { id: 2, civilite: 'Mme', nom: 'Lambert', prenom: 'Sophie', photoUrl: 'https://i.pravatar.cc/150?img=47', email: 'sophie.lambert@email.fr', telephone: '06 22 33 44 55', nombreMaisons: 2 },
    { id: 3, civilite: 'M.', nom: 'Haddad', prenom: 'Karim', photoUrl: 'https://i.pravatar.cc/150?img=52', email: 'karim.haddad@email.fr', telephone: '06 33 44 55 66', nombreMaisons: 1 },
    { id: 4, civilite: 'Mme', nom: 'Fontaine', prenom: 'Julie', photoUrl: 'https://i.pravatar.cc/150?img=45', email: 'julie.fontaine@email.fr', telephone: '06 44 55 66 77', nombreMaisons: 1 },
    { id: 5, civilite: 'M.', nom: 'Moulin', prenom: 'Alain', photoUrl: 'https://i.pravatar.cc/150?img=53', email: 'alain.moulin@email.fr', telephone: '06 55 66 77 88', nombreMaisons: 3 },
    { id: 6, civilite: 'Mme', nom: 'Perrin', prenom: 'Nathalie', photoUrl: 'https://i.pravatar.cc/150?img=48', email: 'nathalie.perrin@email.fr', telephone: '06 66 77 88 99', nombreMaisons: 1 },
    { id: 7, civilite: 'M.', nom: 'Roche', prenom: 'Vincent', photoUrl: 'https://i.pravatar.cc/150?img=57', email: 'vincent.roche@email.fr', telephone: '06 77 88 99 00', nombreMaisons: 2 },
    { id: 8, civilite: 'Mme', nom: 'Gauthier', prenom: 'Isabelle', photoUrl: 'https://i.pravatar.cc/150?img=49', email: 'isabelle.gauthier@email.fr', telephone: '06 88 99 00 11', nombreMaisons: 1 },
  ];

  formModel: NewProprietaireForm = this.buildEmptyForm();

  get filteredProprietaires(): Proprietaire[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.proprietaires;
    }
    return this.proprietaires.filter((p) =>
      p.nom.toLowerCase().includes(term) ||
      p.prenom.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.telephone.toLowerCase().includes(term)
    );
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

  onSubmitProprietaire(): void {
    const nextId = Math.max(0, ...this.proprietaires.map((p) => p.id)) + 1;

    const proprietaire: Proprietaire = {
      id: nextId,
      civilite: this.formModel.civilite,
      nom: this.formModel.nom.trim(),
      prenom: this.formModel.prenom.trim(),
      photoUrl: this.formModel.photoUrl.trim() || `https://i.pravatar.cc/150?img=${(nextId % 70) + 1}`,
      email: this.formModel.email.trim(),
      telephone: this.formModel.telephone.trim(),
      nombreMaisons: Number(this.formModel.nombreMaisons) || 0,
    };

    this.proprietaires = [proprietaire, ...this.proprietaires];
    this.closeModal();
  }

  private buildEmptyForm(): NewProprietaireForm {
    return {
      civilite: 'M.',
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      nombreMaisons: 1,
      photoUrl: '',
    };
  }
}
