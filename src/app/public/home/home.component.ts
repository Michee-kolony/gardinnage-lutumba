import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';

interface ServiceCard {
  icon: 'shield' | 'route' | 'home' | 'chat' | 'building' | 'lock';
  title: string;
  description: string;
}

interface HeroSlide {
  image: string;
  caption: string;
  eyebrow: string;
  titleStart: string;
  titleAccent: string;
  titleEnd: string;
  text: string;
}

@Component({
  selector: 'app-public-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  mobileMenuOpen = false;
  currentSlide = 0;
  private slideTimer?: ReturnType<typeof setInterval>;

  heroSlides: HeroSlide[] = [
    {
      image: '/images/Gemini_Generated_Image_3mb2oz3mb2oz3mb2.jpg',
      caption: 'Agents sur le terrain',
      eyebrow: 'EMPIRE SECURITY',
      titleStart: 'La',
      titleAccent: 'sécurité',
      titleEnd: 'au service de votre tranquillité',
      text: "Gardiennage de maisons, surveillance et protection rapprochée : nos agents veillent sur vos biens et vos proches, jour et nuit."
    },
    {
      image: '/images/Gemini_Generated_Image_kat1owkat1owkat1.jpg',
      caption: 'Patrouille mobile',
      eyebrow: 'RONDES & PATROUILLES',
      titleStart: 'Une',
      titleAccent: 'présence constante',
      titleEnd: 'autour de votre propriété',
      text: "Des patrouilles régulières et une équipe mobile réactive pour intervenir à tout moment, en cas de besoin."
    }
  ];

  aboutPoints = [
    'Gardiens sélectionnés et formés',
    'Rondes de surveillance 24h/24 et 7j/7',
    'Suivi et rapports réguliers aux propriétaires'
  ];

  services: ServiceCard[] = [
    {
      icon: 'home',
      title: 'Gardiennage de maison',
      description: "Surveillance quotidienne de votre propriété par des gardiens dédiés, formés et fiables."
    },
    {
      icon: 'route',
      title: 'Rondes de surveillance',
      description: "Passages réguliers et vérifications programmées pour dissuader toute intrusion."
    },
    {
      icon: 'shield',
      title: 'Sécurité résidentielle',
      description: "Protection de votre domicile pendant votre absence, avec la même exigence qu'au quotidien."
    },
    {
      icon: 'chat',
      title: 'Conseil en sécurité',
      description: "Une évaluation personnalisée de vos besoins et des recommandations adaptées à votre situation."
    },
    {
      icon: 'building',
      title: 'Sécurité pour entreprises',
      description: "Protection des locaux, du personnel et des biens professionnels, sur mesure."
    },
    {
      icon: 'lock',
      title: 'Espace propriétaire en ligne',
      description: "Suivez vos contrats, vos paiements et les rapports de vos gardiens depuis votre espace personnel."
    }
  ];

  navLinks = [
    { label: 'Accueil', href: '#accueil' },
    { label: 'À propos', href: '#apropos' },
    { label: 'Services', href: '#services' },
    { label: 'Devis', href: '#devis' },
    { label: 'Contact', href: '#contact' }
  ];

  quoteForm = {
    name: '',
    phone: '',
    email: '',
    service: '',
    address: '',
    message: ''
  };
  quoteSubmitted = false;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  private startAutoplay(): void {
    this.slideTimer = setInterval(() => this.next(), 6000);
  }

  private stopAutoplay(): void {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
    }
  }

  restartAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  next(): void {
    this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
  }

  prev(): void {
    this.currentSlide = (this.currentSlide - 1 + this.heroSlides.length) % this.heroSlides.length;
  }

  goTo(index: number): void {
    this.currentSlide = index;
    this.restartAutoplay();
  }

  onNext(): void {
    this.next();
    this.restartAutoplay();
  }

  onPrev(): void {
    this.prev();
    this.restartAutoplay();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  submitQuote(form: NgForm): void {
    if (form.invalid) {
      return;
    }
    this.quoteSubmitted = true;
    form.resetForm();
  }
}
