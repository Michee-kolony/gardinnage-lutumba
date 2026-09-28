import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { Commentaire, Gardien, GardiensService, StatutGardien } from '../../../core/gardiens.service';

const LOGO_URL = '/images/logo.png';

@Component({
  selector: 'app-gardien-detail',
  templateUrl: './gardien-detail.component.html',
  styleUrl: './gardien-detail.component.css'
})
export class GardienDetailComponent implements OnInit, OnDestroy {
  gardien?: Gardien;
  loading = true;
  loadError = '';

  isGeneratingCarte = false;
  dateEmission = '';
  commentSearchTerm = '';

  updatingStatut = false;

  deleting = false;

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  private gardienId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gardiensService: GardiensService
  ) {}

  ngOnInit(): void {
    this.gardienId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.gardienId) {
      this.router.navigate(['/admin/gardiens']);
      return;
    }

    this.dateEmission = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());

    this.fetchGardien();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  fetchGardien(): void {
    this.loading = true;
    this.loadError = '';

    this.gardiensService.getById(this.gardienId).subscribe({
      next: (res) => {
        this.gardien = res.gardien;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger ce gardien.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/gardiens']);
  }

  onLogoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
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

  get filteredCommentaires(): Commentaire[] {
    const commentaires = this.gardien?.commentaires ?? [];
    const term = this.commentSearchTerm.trim().toLowerCase();
    if (!term) {
      return commentaires;
    }
    return commentaires.filter((c) =>
      c.nomProprietaire.toLowerCase().includes(term) ||
      c.contenu.toLowerCase().includes(term)
    );
  }

  statutBadgeClass(statut: StatutGardien): string {
    return statut === 'en service'
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-neutral-100 text-black border border-neutral-300';
  }

  toggleStatut(): void {
    if (!this.gardien || this.updatingStatut) {
      return;
    }

    const nouveauStatut: StatutGardien = this.gardien.statut === 'en service' ? 'non en service' : 'en service';
    this.updatingStatut = true;

    this.gardiensService.updateStatut(this.gardien._id, nouveauStatut).subscribe({
      next: (res) => {
        this.updatingStatut = false;
        if (this.gardien) {
          this.gardien.statut = res.gardien.statut;
        }
        this.showToast('success', 'Statut mis à jour.');
      },
      error: (err: HttpErrorResponse) => {
        this.updatingStatut = false;
        this.showToast('error', err.error?.message || 'Impossible de mettre à jour le statut.');
      }
    });
  }

  deleteGardien(): void {
    if (!this.gardien || this.deleting) {
      return;
    }

    const confirmed = window.confirm(`Supprimer définitivement ${this.gardien.nom} ${this.gardien.postnom} ?`);
    if (!confirmed) {
      return;
    }

    this.deleting = true;

    this.gardiensService.remove(this.gardien._id).subscribe({
      next: () => {
        this.router.navigate(['/admin/gardiens']);
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.showToast('error', err.error?.message || 'Impossible de supprimer ce gardien.');
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

  async genererCarteService(): Promise<void> {
    if (!this.gardien || this.isGeneratingCarte) {
      return;
    }
    const gardien = this.gardien;
    this.isGeneratingCarte = true;

    try {
      const [photoDataUrl, logoDataUrl] = await Promise.all([
        this.loadImageAsDataUrl(gardien.photoProfil),
        this.loadImageAsDataUrl(LOGO_URL),
      ]);

      const width = 85.6;
      const height = 54;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [width, height] });

      // Fond blanc
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, 'F');

      // Texture de fond décorative (fines diagonales + filigrane), dessinée en
      // premier avec des tons très clairs pour rester en arrière-plan, sans
      // affecter l'opacité de la photo ni du texte dessinés ensuite par-dessus.
      doc.setDrawColor(244, 244, 244);
      doc.setLineWidth(0.15);
      for (let offset = -height; offset < width; offset += 3.5) {
        doc.line(offset, height, offset + height, 0);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(246, 246, 246);
      doc.text('GARDINNAGE', width / 2, height / 2 + 4, { align: 'center', angle: 20 });

      // Bandeau d'en-tête
      doc.setFillColor(17, 17, 17);
      doc.rect(0, 0, width, 11, 'F');

      // Liseré doré sous le bandeau, pour un rendu carte officielle
      doc.setFillColor(197, 160, 89);
      doc.rect(0, 11, width, 0.8, 'F');

      // Emplacement du logo (image si disponible, sinon un cadre réservé)
      const logoX = 3;
      const logoY = 2;
      const logoSize = 7;
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
      } else {
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.15);
        doc.setLineDashPattern([0.6, 0.5], 0);
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 1, 1);
        doc.setLineDashPattern([], 0);
      }

      const titleX = logoX + logoSize + 3;
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('GARDINNAGE', titleX, 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('CARTE DE SERVICE', width - 4, 7.5, { align: 'right' });

      // Photo
      const photoX = 4;
      const photoY = 15;
      const photoSize = 20;
      if (photoDataUrl) {
        doc.addImage(photoDataUrl, 'PNG', photoX, photoY, photoSize, photoSize);
      }
      doc.setDrawColor(210, 210, 210);
      doc.rect(photoX, photoY, photoSize, photoSize);

      // Informations d'identité
      const textX = photoX + photoSize + 4;
      let cursorY = photoY + 3;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${gardien.nom.toUpperCase()} ${gardien.postnom}`, textX, cursorY);

      cursorY += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Prénom : ${gardien.prenom}`, textX, cursorY);

      cursorY += 4.5;
      doc.setTextColor(0, 0, 0);
      doc.text(`Matricule : ${gardien.matricule}`, textX, cursorY);

      cursorY += 4;
      doc.text(`Né(e) le : ${this.formatDate(gardien.dateNaissance)}`, textX, cursorY);

      // Adresse / téléphone
      doc.setFontSize(7);
      doc.text(`Zone : ${gardien.commune} — ${gardien.quartier}`, photoX, photoY + photoSize + 4);
      doc.text(`Tél : ${gardien.telephonePrincipal}`, photoX, photoY + photoSize + 8);

      // Bande de pied de carte
      doc.setFillColor(240, 240, 240);
      doc.rect(0, height - 9, width, 9, 'F');
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text(`Émise le ${this.dateEmission}`, 4, height - 3.5);
      doc.text("Valable avec pièce d'identité", width - 4, height - 3.5, { align: 'right' });

      doc.save(`carte-service-${gardien.matricule}.pdf`);

      if (!photoDataUrl) {
        this.showToast('error', "La carte a été générée mais la photo n'a pas pu être chargée. Réessayez.");
      }
    } finally {
      this.isGeneratingCarte = false;
    }
  }

  private loadImageAsDataUrl(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
      if (url.startsWith('data:')) {
        resolve(url);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);

      // Ce même visuel est déjà affiché ailleurs sur la page via de simples
      // balises <img> sans crossOrigin. Le navigateur (ou le cache Cloudflare)
      // peut alors resservir cette copie non taguée CORS et laisser le canvas
      // "tainted" même quand le bucket autorise bien CORS. On force donc une
      // requête réseau fraîche, correctement taguée, via un paramètre unique.
      const isCrossOrigin = /^https?:\/\//i.test(url) && !url.startsWith(window.location.origin);
      if (isCrossOrigin) {
        const separator = url.includes('?') ? '&' : '?';
        img.src = `${url}${separator}cors=${Date.now()}`;
      } else {
        img.src = url;
      }
    });
  }
}
