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
import { FORMATS_IMAGE_ACCEPT, FORMATS_IMAGE_LIBELLE, verifierImage } from '../../core/images';

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
  formatsImage = FORMATS_IMAGE_ACCEPT;
  formatsImageLibelle = FORMATS_IMAGE_LIBELLE;
  photoPreview = '';

  sexesDisponibles = SEXES;
  etatsCivilsDisponibles = ETATS_CIVILS;
  statutsDisponibles = STATUTS_GARDIEN;

  formModel: CreateGardienPayload = this.buildEmptyForm();
  // Erreurs par champ (bordure rouge + message sous le champ) et erreur globale
  // affichée dans la modale, pour que l'utilisateur voie toujours pourquoi l'ajout échoue.
  erreurs: Partial<Record<keyof CreateGardienPayload, string>> = {};
  formError = '';

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
    this.erreurs = {};
    this.formError = '';
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
    const erreurImage = verifierImage(file);
    if (erreurImage) {
      (event.target as HTMLInputElement).value = '';
      this.showToast('error', erreurImage);
      return;
    }
    this.formModel.photo = file;
    this.selectedFileName = file.name;
    this.effacerErreur('photo');

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submitGardien(): void {
    if (this.submitting) {
      return;
    }

    this.formError = '';
    this.erreurs = this.validerFormulaire();
    const nbErreurs = Object.keys(this.erreurs).length;
    if (nbErreurs) {
      this.formError = nbErreurs === 1
        ? Object.values(this.erreurs)[0]!
        : `${nbErreurs} champs sont à corriger avant d'ajouter le gardien.`;
      return;
    }

    this.submitting = true;

    this.gardiensService.create(this.formModel).subscribe({
      next: (res) => {
        this.submitting = false;
        this.gardiens = [res.gardien, ...this.gardiens];
        this.knownStatuts.set(res.gardien._id, res.gardien.statut);
        this.isModalOpen = false;
        this.showToast('success', `${res.gardien.nom} ${res.gardien.postnom} a été ajouté (matricule ${res.gardien.matricule}).`);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.formError = this.messageErreurHttp(err);
        if (err.status === 409) {
          this.erreurs = { ...this.erreurs, email: this.formError };
        }
      }
    });
  }

  effacerErreur(champ: keyof CreateGardienPayload): void {
    if (this.erreurs[champ]) {
      const { [champ]: _, ...reste } = this.erreurs;
      this.erreurs = reste;
      if (!Object.keys(reste).length) {
        this.formError = '';
      }
    }
  }

  private validerFormulaire(): Partial<Record<keyof CreateGardienPayload, string>> {
    const f = this.formModel;
    const erreurs: Partial<Record<keyof CreateGardienPayload, string>> = {};
    const obligatoires: [keyof CreateGardienPayload, string][] = [
      ['nom', 'Le nom'], ['postnom', 'Le postnom'], ['prenom', 'Le prénom'],
      ['lieuNaissance', 'Le lieu de naissance'], ['nationalite', 'La nationalité'],
      ['telephonePrincipal', 'Le téléphone principal'], ['email', "L'email"],
      ['password', 'Le mot de passe'], ['adresseActuelle', "L'adresse actuelle"],
      ['commune', 'La commune'], ['quartier', 'Le quartier'], ['avenue', "L'avenue"]
    ];

    obligatoires.forEach(([champ, libelle]) => {
      if (!String(f[champ] ?? '').trim()) {
        erreurs[champ] = `${libelle} est obligatoire.`;
      }
    });

    if (!f.photo) {
      erreurs.photo = 'La photo de profil est obligatoire.';
    }

    if (!f.dateNaissance) {
      erreurs.dateNaissance = 'La date de naissance est obligatoire.';
    } else if (new Date(f.dateNaissance) > new Date()) {
      erreurs.dateNaissance = 'La date de naissance ne peut pas être dans le futur.';
    }

    if (f.taille === null || f.taille === undefined || String(f.taille) === '') {
      erreurs.taille = 'La taille est obligatoire.';
    } else if (f.taille < 100 || f.taille > 250) {
      erreurs.taille = 'La taille doit être comprise entre 100 et 250 cm.';
    }

    if (!erreurs.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      erreurs.email = 'Adresse email invalide.';
    }

    return erreurs;
  }

  private messageErreurHttp(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Serveur injoignable. Vérifiez votre connexion internet puis réessayez.';
    }
    if (err.status === 403) {
      return err.error?.message || "Vous n'avez pas les droits pour ajouter un gardien.";
    }
    if (err.status === 413) {
      return 'La photo est trop lourde pour le serveur. Choisissez une image plus légère.';
    }
    return err.error?.message || `Impossible d'ajouter ce gardien (erreur ${err.status}).`;
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
