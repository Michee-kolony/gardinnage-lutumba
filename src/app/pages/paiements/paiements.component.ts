import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { jsPDF } from 'jspdf';

import {
  DevisePaiement,
  ModePaiement,
  Paiement,
  PaiementPayload,
  PaiementsService
} from '../../core/paiements.service';
import { Propriete, ProprietesService } from '../../core/proprietes.service';
import { Proprietaire } from '../../core/proprietaires.service';

@Component({
  selector: 'app-paiements',
  templateUrl: './paiements.component.html'
})
export class PaiementsComponent implements OnInit {
  readonly currentDateIso = new Date().toISOString();
  paiements: Paiement[] = [];
  proprietes: Propriete[] = [];
  loading = true;
  loadError = '';
  searchTerm = '';
  isModalOpen = false;
  receiptPreview: Paiement | null = null;
  submitting = false;
  formError = '';
  formModel: PaiementPayload = this.emptyForm();
  private logoDataUrl?: Promise<string | null>;

  constructor(private paiementsService: PaiementsService, private proprietesService: ProprietesService) {}

  ngOnInit(): void {
    this.fetchPaiements();
    this.proprietesService.list().subscribe({
      next: (response) => (this.proprietes = response.proprietes),
      error: () => (this.loadError = 'Impossible de charger les propriétés disponibles.')
    });
  }

  get filteredPaiements(): Paiement[] {
    const term = this.searchTerm.trim().toLocaleLowerCase('fr');
    return this.paiements.filter((paiement) => {
      const propriete = this.propertyOf(paiement);
      const matchesSearch = !term || [propriete?.nomReference, propriete?.commune, this.ownerName(paiement.proprietaire), paiement.referenceTransaction, paiement._id]
        .some((value) => value?.toLocaleLowerCase('fr').includes(term));
      return matchesSearch;
    });
  }

  get totalCDF(): number { return this.totalByCurrency('CDF'); }
  get totalUSD(): number { return this.totalByCurrency('USD'); }
  get nombrePaiements(): number { return this.paiements.length; }
  get proprietesCouvertes(): number {
    return new Set(this.paiements.map((paiement) => this.propertyId(paiement))).size;
  }

  fetchPaiements(): void {
    this.loading = true;
    this.loadError = '';
    this.paiementsService.list().subscribe({
      next: (response) => { this.paiements = response.paiements; this.loading = false; },
      error: (error: HttpErrorResponse) => { this.loadError = error.error?.message || 'Impossible de charger les paiements.'; this.loading = false; }
    });
  }

  openModal(): void { this.formModel = this.emptyForm(); this.formError = ''; this.isModalOpen = true; }
  closeModal(): void { if (!this.submitting) this.isModalOpen = false; }
  openReceiptPreview(paiement: Paiement): void { this.receiptPreview = paiement; }
  closeReceiptPreview(): void { this.receiptPreview = null; }

  submitPaiement(): void {
    const form = this.formModel;
    if (this.submitting || !form.propriete || !form.montant || form.montant <= 0 || !form.modePaiement) return;
    this.submitting = true;
    this.formError = '';
    this.paiementsService.create(form).subscribe({
      next: (response) => { this.paiements = [response.paiement, ...this.paiements]; this.submitting = false; this.isModalOpen = false; },
      error: (error: HttpErrorResponse) => { this.formError = error.error?.message || 'Impossible d’enregistrer ce paiement.'; this.submitting = false; }
    });
  }

  propertyOf(paiement: Paiement): Propriete | null { return typeof paiement.propriete === 'object' ? paiement.propriete : null; }
  propertyName(paiement: Paiement): string { return this.propertyOf(paiement)?.nomReference || 'Propriété'; }
  propertyId(paiement: Paiement): string { return typeof paiement.propriete === 'string' ? paiement.propriete : paiement.propriete._id; }
  ownerName(owner: Proprietaire | string | null): string {
    if (!owner || typeof owner === 'string') return 'Propriétaire indisponible';
    return `${owner.prenom} ${owner.nom}`.trim();
  }

  formatAmount(amount: number, currency: DevisePaiement): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount) + ` ${currency}`;
  }
  formatDate(date: string | null): string {
    if (!date) return 'Non renseignée';
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
  }
  modeLabel(mode: ModePaiement): string {
    const labels: Record<ModePaiement, string> = { especes: 'Espèces', mobile_money: 'Mobile Money', virement: 'Virement', carte: 'Carte bancaire', cheque: 'Chèque', autre: 'Autre' };
    return labels[mode];
  }

  receiptReference(paiement: Paiement): string {
    return paiement.referenceTransaction || `REC-${paiement._id.slice(-8).toUpperCase()}`;
  }

  periodLabel(paiement: Paiement): string {
    if (!paiement.periodeDebut && !paiement.periodeFin) return '—';
    if (!paiement.periodeDebut) return `Jusqu’au ${this.formatDate(paiement.periodeFin)}`;
    if (!paiement.periodeFin) return `Depuis le ${this.formatDate(paiement.periodeDebut)}`;
    return `${this.formatDate(paiement.periodeDebut)} au ${this.formatDate(paiement.periodeFin)}`;
  }

  async generateReceipt(paiement: Paiement): Promise<void> {
    const logo = await this.loadLogoDataUrl();
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const width = pdf.internal.pageSize.getWidth();
    const owner = this.ownerName(paiement.proprietaire);
    const property = this.propertyOf(paiement);
    const receiptNumber = this.receiptReference(paiement);
    const darkGreen: [number, number, number] = [20, 20, 20];
    const accent: [number, number, number] = [212, 169, 74];

    pdf.setFillColor(...darkGreen); pdf.rect(0, 0, width, 69, 'F');
    pdf.setFillColor(...accent); pdf.rect(17, 17, 2, 31, 'F');
    pdf.setFillColor(255, 255, 255); pdf.roundedRect(23, 17, 28, 28, 2, 2, 'F');
    if (logo) {
      const image = pdf.getImageProperties(logo);
      const scale = Math.min(24 / image.width, 24 / image.height);
      const logoWidth = image.width * scale;
      const logoHeight = image.height * scale;
      pdf.addImage(logo, 'PNG', 37 - logoWidth / 2, 31 - logoHeight / 2, logoWidth, logoHeight);
    }
    pdf.setTextColor(246, 241, 229); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text('GARDINNAGE', 58, 23);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(205, 218, 209); pdf.text('GESTION ET SECURITE IMMOBILIERE', 58, 29);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(25); pdf.setTextColor(255, 255, 255); pdf.text('RECU DE PAIEMENT', 58, 45);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(205, 218, 209); pdf.text(`N° ${receiptNumber}`, 58, 54);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(242, 205, 135);
    pdf.text('PAIEMENT ENREGISTRE', width - 18, 24, { align: 'right' });

    pdf.setTextColor(119, 128, 121); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text('MONTANT ENREGISTRE', 18, 86);
    pdf.setFillColor(245, 245, 245); pdf.roundedRect(18, 92, width - 36, 31, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(24); pdf.setTextColor(...darkGreen);
    pdf.text(this.formatAmount(paiement.montant, paiement.devise), 25, 112);

    pdf.setDrawColor(224, 228, 222); pdf.line(18, 139, width - 18, 139);
    pdf.setFontSize(8); pdf.setTextColor(119, 128, 121); pdf.text('PAYE PAR', 18, 151); pdf.text('PROPRIETE CONCERNEE', width / 2 + 5, 151);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(35, 43, 38);
    pdf.text(pdf.splitTextToSize(owner, width / 2 - 35), 18, 159);
    pdf.text(pdf.splitTextToSize(property?.nomReference || 'Propriété', width / 2 - 30), width / 2 + 5, 159);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(93, 101, 95);
    pdf.text(pdf.splitTextToSize(property ? `${property.commune}, ${property.quartier}` : 'Adresse non disponible', width / 2 - 30), width / 2 + 5, 166);

    pdf.setDrawColor(224, 228, 222); pdf.line(18, 183, width - 18, 183);
    const details: Array<[string, string]> = [
      ["Date d'enregistrement", this.formatDate(paiement.createdAt)],
      ['Mode de paiement', this.modeLabel(paiement.modePaiement)],
      ['Reference transaction', this.receiptReference(paiement)],
      ['Periode couverte', this.periodLabel(paiement)]
    ];
    if (paiement.description) details.push(['Note', paiement.description]);
    details.forEach(([label, value], index) => {
      const y = 197 + index * 13;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(119, 128, 121); pdf.text(label, 18, y);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(35, 43, 38); pdf.text(pdf.splitTextToSize(value, 95), width - 18, y, { align: 'right' });
    });
    pdf.setFillColor(...darkGreen); pdf.rect(0, 267, width, 30, 'F');
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(220, 229, 221);
    pdf.text('Merci pour votre confiance.', 18, 280);
    pdf.text(`Emis le ${this.formatDate(new Date().toISOString())}`, width - 18, 280, { align: 'right' });
    pdf.save(`recu-paiement-${receiptNumber.replace(/[^A-Z0-9-]/g, '')}.pdf`);
  }

  private loadLogoDataUrl(): Promise<string | null> {
    if (!this.logoDataUrl) {
      this.logoDataUrl = fetch('/images/logo.png')
        .then((response) => response.ok ? response.blob() : null)
        .then((blob) => new Promise<string | null>((resolve) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        }))
        .catch(() => null);
    }
    return this.logoDataUrl;
  }

  private totalByCurrency(currency: DevisePaiement): number {
    return this.paiements.filter((paiement) => paiement.devise === currency)
      .reduce((total, paiement) => total + paiement.montant, 0);
  }

  private emptyForm(): PaiementPayload {
    return { propriete: '', montant: 0, devise: 'CDF', modePaiement: 'especes', periodeDebut: null, periodeFin: null, description: '' };
  }
}
