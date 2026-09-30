import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { jsPDF } from 'jspdf';

import {
  NIVEAUX_SECURITE,
  NiveauSecurite,
  Propriete,
  ProprietePayload,
  ProprietesService,
  StatutAbonnement,
  TYPES_PROPRIETE,
  TypePropriete,
  formatDateCourte,
  messageErreurEnvoi,
  periodeAbonnementLabel,
  statutAbonnement,
  statutAbonnementBadgeClass,
  statutAbonnementLabel,
  verifierTailleFichiers
} from '../../../core/proprietes.service';
import { DevisePaiement, ModePaiement, Paiement, PaiementsService, dureeAbonnementLabel } from '../../../core/paiements.service';
import { Proprietaire, ProprietairesService } from '../../../core/proprietaires.service';
import { AuthService } from '../../../core/auth.service';
import { Affectation, AffectationsService, StatutAffectation } from '../../../core/affectations.service';

const LOGO_URL = '/images/logo.png';

@Component({
  selector: 'app-propriete-detail',
  templateUrl: './propriete-detail.component.html',
  styleUrl: './propriete-detail.component.css'
})
export class ProprieteDetailComponent implements OnInit, OnDestroy {
  propriete?: Propriete;
  loading = true;
  loadError = '';

  typesDisponibles = TYPES_PROPRIETE;
  niveauxDisponibles = NIVEAUX_SECURITE;
  // Chargée pour le sélecteur "propriétaire" de la modal de modification
  // (nom + photo) ; l'affichage du propriétaire actuel utilise directement
  // propriete.proprietaire, peuplé par le backend.
  proprietairesDisponibles: Proprietaire[] = [];
  ownerPickerOpen = false;
  ownerSearchTerm = '';

  deleting = false;
  deleteModalOpen = false;

  editModalOpen = false;
  submittingEdit = false;
  photosPreviews: string[] = [];
  documentSelectedName = '';
  autresDocumentsNames: string[] = [];
  editFormModel: ProprietePayload = this.buildEmptyForm();

  activePhotoIndex = 0;

  // Historique des paiements de la propriété (ils fixent son abonnement)
  paiements: Paiement[] = [];
  paiementsLoading = false;
  paiementsError = '';
  paiementModalOpen = false;
  paiementEnModification: Paiement | null = null;
  paiementEnSuppression: Paiement | null = null;

  // Gardiens affectés (filtrés par le serveur selon l'onglet)
  readonly ongletsAffectations: { statut: StatutAffectation; label: string }[] = [
    { statut: 'en cours', label: 'En cours' },
    { statut: 'a venir', label: 'À venir' },
    { statut: 'expiree', label: 'Historique' }
  ];
  affectations: Affectation[] = [];
  affectationsOnglet: StatutAffectation = 'en cours';
  affectationsLoading = false;
  affectationsError = '';
  affectationFormOpen = false;

  isGeneratingContrat = false;
  contratApercuModalOpen = false;
  private dateEmission = '';

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  private proprieteId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proprietesService: ProprietesService,
    private proprietairesService: ProprietairesService,
    private paiementsService: PaiementsService,
    private affectationsService: AffectationsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.proprieteId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.proprieteId) {
      this.router.navigate(['/admin/proprietes']);
      return;
    }

    this.proprietairesService.list().subscribe({
      next: (res) => (this.proprietairesDisponibles = res.proprietaires),
      error: () => (this.proprietairesDisponibles = [])
    });

    this.dateEmission = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());

    this.fetchPropriete();
    this.fetchPaiements();
    this.fetchAffectations();
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
    this.contratApercuModalOpen = false;
  }

  openContratApercuModal(): void {
    this.contratApercuModalOpen = true;
  }

  closeContratApercuModal(): void {
    this.contratApercuModalOpen = false;
  }

  fetchPropriete(): void {
    this.loading = true;
    this.loadError = '';

    this.proprietesService.getById(this.proprieteId).subscribe({
      next: (res) => {
        this.propriete = res.propriete;
        this.activePhotoIndex = 0;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger cette propriété.';
        this.loading = false;
      }
    });
  }

  // Rechargement sans écran de chargement : après un paiement, les dates et le
  // statut d'abonnement de la propriété ont été recalculés par le serveur.
  rechargerPropriete(): void {
    this.proprietesService.getById(this.proprieteId).subscribe({
      next: (res) => (this.propriete = res.propriete),
      error: () => this.showToast('error', 'Impossible de recharger cette propriété.')
    });
  }

  fetchPaiements(): void {
    this.paiementsLoading = true;
    this.paiementsError = '';
    this.paiementsService.list({ propriete: this.proprieteId }).subscribe({
      next: (res) => {
        this.paiements = res.paiements;
        this.paiementsLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.paiementsError = err.error?.message || 'Impossible de charger les paiements.';
        this.paiementsLoading = false;
      }
    });
  }

  // --- Gardiens affectés ---

  get estAdmin(): boolean {
    return this.authService.isAdmin();
  }

  fetchAffectations(): void {
    this.affectationsLoading = true;
    this.affectationsError = '';
    this.affectationsService.list({ propriete: this.proprieteId, statut: this.affectationsOnglet }).subscribe({
      next: (res) => {
        this.affectations = res.affectations;
        this.affectationsLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.affectationsError = err.error?.message || 'Impossible de charger les gardiens affectés.';
        this.affectationsLoading = false;
      }
    });
  }

  changerOngletAffectations(onglet: StatutAffectation): void {
    this.affectationsOnglet = onglet;
    this.fetchAffectations();
  }

  get messageAffectationsVide(): string {
    if (this.affectationsOnglet === 'en cours') return 'Aucun gardien affecté en ce moment.';
    if (this.affectationsOnglet === 'a venir') return 'Aucune affectation à venir.';
    return 'Aucune affectation passée.';
  }

  // --- Abonnement / paiements ---

  get statutAbonnementPropriete(): StatutAbonnement {
    return this.propriete ? statutAbonnement(this.propriete) : 'aucun';
  }

  get abonnementActif(): boolean {
    return this.statutAbonnementPropriete === 'actif';
  }

  get abonnementBadgeClass(): string {
    return statutAbonnementBadgeClass(this.statutAbonnementPropriete);
  }

  get abonnementLabel(): string {
    return statutAbonnementLabel(this.statutAbonnementPropriete);
  }

  get periodeAbonnement(): string {
    return this.propriete ? periodeAbonnementLabel(this.propriete) : '';
  }

  get expirationAbonnement(): string {
    return formatDateCourte(this.propriete?.dateExpirationAbonnement ?? null);
  }

  openPaiementModal(): void {
    // Confort uniquement : le serveur refuse aussi (409) tant que l'abonnement est en cours
    if (this.propriete && !this.abonnementActif) {
      this.paiementModalOpen = true;
    }
  }

  onPaiementEnregistre(): void {
    this.rechargerPropriete();
    this.fetchPaiements();
  }

  estDernierPaiement(paiement: Paiement): boolean {
    return !!this.propriete?.dernierPaiement && this.propriete.dernierPaiement === paiement._id;
  }

  paiementPeriode(paiement: Paiement): string {
    if (!paiement.periodeDebut || !paiement.periodeFin) {
      return '—';
    }
    return `du ${formatDateCourte(paiement.periodeDebut)} au ${formatDateCourte(paiement.periodeFin)}`;
  }

  paiementMontant(montant: number, devise: DevisePaiement): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(montant) + ` ${devise}`;
  }

  paiementDuree(mois: number | null): string {
    return dureeAbonnementLabel(mois);
  }

  paiementMode(mode: ModePaiement): string {
    const labels: Record<ModePaiement, string> = { especes: 'Espèces', mobile_money: 'Mobile Money', virement: 'Virement', carte: 'Carte bancaire', cheque: 'Chèque', autre: 'Autre' };
    return labels[mode];
  }

  goBack(): void {
    this.router.navigate(['/admin/proprietes']);
  }

  ownerAvatar(proprietaire: Proprietaire): string {
    return proprietaire.photo || `https://ui-avatars.com/api/?background=e5e5e5&color=737373&name=${proprietaire.prenom}+${proprietaire.nom}`;
  }

  ownerFullName(proprietaire: Proprietaire | null): string {
    return proprietaire ? `${proprietaire.prenom} ${proprietaire.nom}` : 'Propriétaire supprimé';
  }

  goToOwner(): void {
    if (this.propriete?.proprietaire) {
      this.router.navigate(['/admin/proprietaires', this.propriete.proprietaire._id]);
    }
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
    } catch {
      return value;
    }
  }

  typeLabel(type: TypePropriete): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  niveauBadgeClass(niveau: NiveauSecurite): string {
    if (niveau === 'haute surveillance') {
      return 'bg-red-100 text-red-700 border border-red-200';
    }
    if (niveau === 'renforce') {
      return 'bg-amber-100 text-amber-800 border border-amber-300';
    }
    return 'bg-neutral-100 text-black border border-neutral-300';
  }

  // Utilisées à la fois par le PDF du contrat et par son aperçu HTML.
  adresseComplete(propriete: Propriete): string {
    return [propriete.avenue, propriete.numero, propriete.quartier, propriete.commune]
      .filter((part) => !!part)
      .join(', ');
  }

  equipementsListe(propriete: Propriete): string {
    return [
      propriete.cloture && 'clôture',
      propriete.portail && 'portail',
      propriete.garage && 'garage',
      propriete.cameras && `caméras (${propriete.nombreCameras})`,
      propriete.alarme && 'alarme',
      propriete.eclairageSecurite && 'éclairage de sécurité',
      propriete.interphone && 'interphone',
    ].filter(Boolean).join(', ') || 'aucun équipement particulier déclaré';
  }

  get adminNom(): string {
    return this.authService.getAdmin()?.nom || 'Administrateur';
  }

  // --- Sélecteur de propriétaire (modification) ---

  toggleOwnerPicker(): void {
    this.ownerPickerOpen = !this.ownerPickerOpen;
    this.ownerSearchTerm = '';
  }

  get filteredOwnersForPicker(): Proprietaire[] {
    const term = this.ownerSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.proprietairesDisponibles;
    }
    return this.proprietairesDisponibles.filter((p) => this.ownerFullName(p).toLowerCase().includes(term));
  }

  selectOwner(proprietaire: Proprietaire): void {
    this.editFormModel.proprietaire = proprietaire._id;
    this.ownerPickerOpen = false;
  }

  selectedOwnerInForm(): Proprietaire | undefined {
    return this.proprietairesDisponibles.find((p) => p._id === this.editFormModel.proprietaire);
  }

  // --- Modification ---

  openEditModal(): void {
    if (!this.propriete) {
      return;
    }

    const p = this.propriete;
    this.editFormModel = {
      proprietaire: p.proprietaire?._id || '',
      nomReference: p.nomReference,
      typePropriete: p.typePropriete,
      typeAutre: p.typeAutre,
      numeroParcelle: p.numeroParcelle,
      nombreBatiments: p.nombreBatiments,
      nombreNiveaux: p.nombreNiveaux,
      commune: p.commune,
      quartier: p.quartier,
      avenue: p.avenue,
      numero: p.numero,
      referenceComplementaire: p.referenceComplementaire,
      lat: p.coordonnees.lat,
      lng: p.coordonnees.lng,
      lienCarte: p.lienCarte,
      nombreChambres: p.nombreChambres,
      nombrePortesAcces: p.nombrePortesAcces,
      cloture: p.cloture,
      portail: p.portail,
      garage: p.garage,
      nombreVehicules: p.nombreVehicules,
      autresInformations: p.autresInformations,
      niveauSecurite: p.niveauSecurite,
      cameras: p.cameras,
      nombreCameras: p.nombreCameras,
      alarme: p.alarme,
      eclairageSecurite: p.eclairageSecurite,
      interphone: p.interphone,
      autresEquipementsSecurite: p.autresEquipementsSecurite,
      photos: [],
      documentPropriete: null,
      autresDocuments: []
    };
    this.photosPreviews = [];
    this.documentSelectedName = '';
    this.autresDocumentsNames = [];
    this.ownerPickerOpen = false;
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    if (this.submittingEdit) {
      return;
    }
    this.editModalOpen = false;
    this.ownerPickerOpen = false;
  }

  onPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files || []).slice(0, 5);
    this.editFormModel.photos = files;
    this.photosPreviews = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => this.photosPreviews.push(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  onDocumentSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.editFormModel.documentPropriete = file;
    this.documentSelectedName = file?.name || '';
  }

  onAutresDocumentsSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files || []).slice(0, 5);
    this.editFormModel.autresDocuments = files;
    this.autresDocumentsNames = files.map((f) => f.name);
  }

  submitEdit(): void {
    if (!this.propriete || this.submittingEdit) {
      return;
    }

    const erreurTaille = verifierTailleFichiers(this.editFormModel);
    if (erreurTaille) {
      this.showToast('error', erreurTaille);
      return;
    }

    this.submittingEdit = true;

    this.proprietesService.update(this.propriete._id, this.editFormModel).subscribe({
      next: (res) => {
        this.submittingEdit = false;
        this.propriete = res.propriete;
        this.activePhotoIndex = 0;
        this.editModalOpen = false;
        this.showToast('success', 'Propriété modifiée avec succès.');
      },
      error: (err: HttpErrorResponse) => {
        this.submittingEdit = false;
        this.showToast('error', messageErreurEnvoi(err, 'Impossible de modifier cette propriété.'));
      }
    });
  }

  // --- Suppression ---

  openDeleteModal(): void {
    if (!this.propriete || this.deleting) {
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

  confirmDeletePropriete(): void {
    if (!this.propriete || this.deleting) {
      return;
    }

    this.deleting = true;

    this.proprietesService.remove(this.propriete._id).subscribe({
      next: () => {
        this.router.navigate(['/admin/proprietes']);
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.deleteModalOpen = false;
        this.showToast('error', err.error?.message || 'Impossible de supprimer cette propriété.');
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

  // Génère un contrat de prestation de surveillance en PDF (A4), avec le logo
  // de l'entreprise et deux emplacements de signature (administrateur +
  // propriétaire) en bas de page.
  async genererContrat(): Promise<void> {
    if (!this.propriete || this.isGeneratingContrat) {
      return;
    }
    const propriete = this.propriete;
    const owner = propriete.proprietaire;
    const admin = this.authService.getAdmin();
    this.isGeneratingContrat = true;

    try {
      const [logoDataUrl, ownerPhotoDataUrl, ...photosDataUrls] = await Promise.all([
        this.loadImageAsDataUrl(LOGO_URL),
        owner?.photo ? this.loadImageAsDataUrl(owner.photo) : Promise.resolve(null),
        ...propriete.photos.slice(0, 4).map((url) => this.loadImageAsDataUrl(url)),
      ]);
      const photosChargees = photosDataUrls.filter((url): url is string => !!url);

      const width = 210;
      const height = 297;
      const margin = 15;
      const contentWidth = width - margin * 2;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [width, height] });

      // --- En-tête ---
      doc.setFillColor(17, 17, 17);
      doc.rect(0, 0, width, 26, 'F');
      doc.setFillColor(197, 160, 89);
      doc.rect(0, 26, width, 1, 'F');

      const logoSize = 14;
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, 6, logoSize, logoSize);
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('GARDINNAGE', margin + logoSize + 4, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Contrat de prestation de surveillance', margin + logoSize + 4, 18);

      doc.setFontSize(8);
      doc.text(`Réf. propriété : ${propriete.nomReference}`, width - margin, 11, { align: 'right' });
      doc.text(`Émis le ${this.dateEmission}`, width - margin, 16, { align: 'right' });

      let cursorY = 36;
      const lineHeight = 5;

      const ensureSpace = (needed: number): void => {
        if (cursorY + needed > height - 45) {
          doc.addPage();
          cursorY = margin;
        }
      };

      const writeTitle = (titre: string): void => {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(17, 17, 17);
        doc.text(titre, margin, cursorY);
        cursorY += 1.5;
        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(0.5);
        doc.line(margin, cursorY, margin + 30, cursorY);
        cursorY += 6;
      };

      const writeParagraph = (texte: string): void => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        const lignes = doc.splitTextToSize(texte, contentWidth);
        ensureSpace(lignes.length * lineHeight);
        doc.text(lignes, margin, cursorY);
        cursorY += lignes.length * lineHeight + 3;
      };

      const proprietaireNom = owner ? `${owner.prenom} ${owner.nom}` : 'Propriétaire non renseigné';
      const proprietaireTel = owner?.telephone || '—';
      const proprietaireAdresse = owner?.adresse || '—';
      const adminNom = admin?.nom || 'Administrateur';

      // --- Parties ---
      writeTitle('Entre les soussignés');
      writeParagraph(
        `Le Prestataire : GARDINNAGE, société de gardiennage et de surveillance, représentée par ${adminNom}, en qualité d'administrateur, ci-après désigné « le Prestataire ».`
      );

      // La photo du Client est placée à droite du paragraphe, pour attester
      // visuellement de son identité (crédibilité du contrat).
      const clientPhotoSize = 18;
      const clientTexteWidth = ownerPhotoDataUrl ? contentWidth - clientPhotoSize - 4 : contentWidth;
      const clientTexte = `Le Client : ${proprietaireNom}, téléphone ${proprietaireTel}, domicilié(e) à ${proprietaireAdresse}, ci-après désigné « le Client ».`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      const lignesClient = doc.splitTextToSize(clientTexte, clientTexteWidth);
      const blocClientHauteur = Math.max(lignesClient.length * lineHeight, ownerPhotoDataUrl ? clientPhotoSize : 0);
      ensureSpace(blocClientHauteur);
      if (ownerPhotoDataUrl) {
        doc.addImage(ownerPhotoDataUrl, 'PNG', margin + clientTexteWidth + 4, cursorY - 4, clientPhotoSize, clientPhotoSize);
        doc.setDrawColor(210, 210, 210);
        doc.rect(margin + clientTexteWidth + 4, cursorY - 4, clientPhotoSize, clientPhotoSize);
      }
      doc.text(lignesClient, margin, cursorY);
      cursorY += blocClientHauteur + 3;

      // --- Objet ---
      writeTitle('Objet du contrat');
      writeParagraph(
        'Le présent contrat a pour objet la prestation, par le Prestataire au profit du Client, de services de surveillance et de sécurité portant sur la propriété désignée ci-après.'
      );

      // --- Désignation de la propriété ---
      writeTitle('Désignation de la propriété');
      writeParagraph(
        `Référence : ${propriete.nomReference} — Type : ${this.typeLabel(propriete.typePropriete)}. ` +
        `Adresse : ${this.adresseComplete(propriete)}. Niveau de sécurité convenu : ${propriete.niveauSecurite}. ` +
        `Équipements de sécurité présents : ${this.equipementsListe(propriete)}.`
      );

      // --- Photos de la propriété (preuve visuelle, pour plus de crédibilité) ---
      if (photosChargees.length > 0) {
        writeTitle('Photos de la propriété');
        const gap = 6;
        const photoWidth = (contentWidth - gap) / 2;
        const photoHeight = 42;
        const rangeeHauteur = photoHeight + gap;
        ensureSpace(Math.ceil(photosChargees.length / 2) * rangeeHauteur);

        photosChargees.forEach((photoUrl, index) => {
          const colonne = index % 2;
          const rangee = Math.floor(index / 2);
          const x = margin + colonne * (photoWidth + gap);
          const y = cursorY + rangee * rangeeHauteur;
          doc.addImage(photoUrl, 'PNG', x, y, photoWidth, photoHeight);
          doc.setDrawColor(210, 210, 210);
          doc.rect(x, y, photoWidth, photoHeight);
        });

        cursorY += Math.ceil(photosChargees.length / 2) * rangeeHauteur + 3;
      }

      // --- Durée ---
      writeTitle('Durée du contrat');
      if (propriete.dateDebutAbonnement && propriete.dateExpirationAbonnement) {
        writeParagraph(
          `Le présent contrat est conclu pour la période allant du ${this.formatDate(propriete.dateDebutAbonnement)} ` +
          `au ${this.formatDate(propriete.dateExpirationAbonnement)}, renouvelable par accord écrit des parties.`
        );
      } else {
        writeParagraph(
          "Le présent contrat est conclu pour une durée indéterminée à compter de sa signature, et peut être résilié conformément à l'article ci-dessous."
        );
      }

      // --- Obligations ---
      writeTitle('Obligations des parties');
      writeParagraph(
        "Le Prestataire s'engage à assurer une surveillance régulière de la propriété désignée, dans les conditions convenues avec le Client, et à signaler sans délai toute anomalie ou incident constaté."
      );
      writeParagraph(
        "Le Client s'engage à faciliter l'accès à la propriété pour l'exécution de la prestation, à fournir les informations nécessaires à la bonne réalisation du service, et à régler les sommes dues selon les modalités convenues entre les parties."
      );

      // --- Résiliation ---
      writeTitle('Résiliation');
      writeParagraph(
        "Le présent contrat peut être résilié par l'une ou l'autre des parties, à tout moment, sous réserve du respect d'un préavis écrit de trente (30) jours adressé à l'autre partie."
      );

      // --- Signatures ---
      ensureSpace(40);
      cursorY = Math.max(cursorY, height - 55);

      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.4);
      doc.line(margin, cursorY, width - margin, cursorY);
      cursorY += 8;

      const colWidth = contentWidth / 2;
      const signatureLineY = cursorY + 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(17, 17, 17);
      doc.text('Pour le Prestataire', margin, cursorY);
      doc.text('Pour le Client', margin + colWidth, cursorY);

      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(margin, signatureLineY, margin + colWidth - 15, signatureLineY);
      doc.line(margin + colWidth, signatureLineY, margin + colWidth * 2 - 15, signatureLineY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(adminNom, margin, signatureLineY + 5);
      doc.text('Administrateur — Nom et signature', margin, signatureLineY + 9.5);

      doc.text(proprietaireNom, margin + colWidth, signatureLineY + 5);
      doc.text('Propriétaire — Nom et signature', margin + colWidth, signatureLineY + 9.5);

      doc.save(`contrat-${propriete.nomReference.replace(/\s+/g, '-').toLowerCase()}.pdf`);

      const imagesManquantes = [
        !logoDataUrl && 'le logo',
        owner?.photo && !ownerPhotoDataUrl && 'la photo du client',
        propriete.photos.length > 0 && photosChargees.length === 0 && 'les photos de la propriété',
      ].filter(Boolean);
      if (imagesManquantes.length > 0) {
        this.showToast('error', `Le contrat a été généré mais ${imagesManquantes.join(', ')} n'a pas pu être chargé(e).`);
      }
    } finally {
      this.isGeneratingContrat = false;
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

      // Cf. gardien-detail : on force une requête réseau fraîche, taguée CORS,
      // pour éviter un canvas "tainted" par une copie mise en cache sans CORS.
      const isCrossOrigin = /^https?:\/\//i.test(url) && !url.startsWith(window.location.origin);
      if (isCrossOrigin) {
        const separator = url.includes('?') ? '&' : '?';
        img.src = `${url}${separator}cors=${Date.now()}`;
      } else {
        img.src = url;
      }
    });
  }

  private buildEmptyForm(): ProprietePayload {
    return {
      proprietaire: '',
      nomReference: '',
      typePropriete: 'maison' as TypePropriete,
      typeAutre: '',
      numeroParcelle: '',
      nombreBatiments: null,
      nombreNiveaux: null,
      commune: '',
      quartier: '',
      avenue: '',
      numero: '',
      referenceComplementaire: '',
      lat: null,
      lng: null,
      lienCarte: '',
      nombreChambres: null,
      nombrePortesAcces: null,
      cloture: false,
      portail: false,
      garage: false,
      nombreVehicules: null,
      autresInformations: '',
      niveauSecurite: 'standard' as NiveauSecurite,
      cameras: false,
      nombreCameras: 0,
      alarme: false,
      eclairageSecurite: false,
      interphone: false,
      autresEquipementsSecurite: '',
      photos: [],
      documentPropriete: null,
      autresDocuments: []
    };
  }
}
