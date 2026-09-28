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
  toastType: 'success' | 'error' | 'info' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  // Surveillance automatique du passage en service : on retient le dernier
  // statut connu de chaque gardien pour détecter les transitions à chaque
  // sondage périodique, et signaler uniquement les nouvelles prises de service.
  private knownStatuts = new Map<string, StatutGardien>();
  private pollTimer?: ReturnType<typeof setInterval>;
  private static readonly POLL_INTERVAL_MS = 15000;

  constructor(private gardiensService: GardiensService, private router: Router) {}

  ngOnInit(): void {
    this.fetchGardiens();
    this.pollTimer = setInterval(() => this.pollForStatusChanges(), GardiensComponent.POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
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

        // Prise de référence : les statuts déjà présents au chargement ne
        // doivent pas déclencher de notification, seules les prochaines
        // transitions détectées par le sondage automatique le doivent.
        this.knownStatuts.clear();
        res.gardiens.forEach((g) => this.knownStatuts.set(g._id, g.statut));
      },
      error: () => {
        this.loadError = 'Impossible de charger la liste des gardiens.';
        this.loading = false;
      }
    });
  }

  // Sondage périodique et silencieux : détecte les gardiens qui viennent de
  // passer "en service" depuis le dernier sondage et le signale directement,
  // sans perturber l'utilisateur en cas d'échec réseau ponctuel.
  private pollForStatusChanges(): void {
    this.gardiensService.list().subscribe({
      next: (res) => {
        const nouveauxEnService: Gardien[] = [];

        res.gardiens.forEach((g) => {
          const ancienStatut = this.knownStatuts.get(g._id);
          if (ancienStatut && ancienStatut !== 'en service' && g.statut === 'en service') {
            nouveauxEnService.push(g);
          }
          this.knownStatuts.set(g._id, g.statut);
        });

        this.gardiens = res.gardiens;

        if (nouveauxEnService.length === 1) {
          const g = nouveauxEnService[0];
          this.showToast('info', `${g.nom} ${g.postnom} vient de se mettre en service.`);
        } else if (nouveauxEnService.length > 1) {
          this.showToast('info', `${nouveauxEnService.length} gardiens viennent de se mettre en service.`);
        }
      },
      error: () => {
        // Échec silencieux : on retentera au prochain cycle, inutile
        // d'interrompre l'utilisateur pour un sondage de fond.
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

  private showToast(type: 'success' | 'error' | 'info', message: string): void {
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
      taille: null,
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
