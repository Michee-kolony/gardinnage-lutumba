import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ServiceCard {
  icon: 'shield' | 'route' | 'home' | 'chat' | 'building' | 'lock';
  key: string;
}

interface Stat {
  value: number;
  suffix: string;
  key: string;
}

interface HeroSlide {
  image: string;
  key: string;
}

interface NavLink {
  key: string;
  href: string;
}

interface AppLanguage {
  code: string;
  flag: string;
  labelKey: string;
}

@Component({
  selector: 'app-public-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  currentYear = new Date().getFullYear();
  mobileMenuOpen = false;
  currentSlide = 0;
  private slideTimer?: ReturnType<typeof setInterval>;
  private statTweens: gsap.core.Tween[] = [];

  topBarVisible = true;
  private lastScrollY = 0;
  private scrollTicking = false;

  languages: AppLanguage[] = [
    { code: 'fr', flag: '🇫🇷', labelKey: 'lang.fr' },
    { code: 'en', flag: '🇬🇧', labelKey: 'lang.en' },
    { code: 'ln', flag: '🇨🇩', labelKey: 'lang.ln' }
  ];
  currentLang = 'fr';
  langMenuOpen = false;

  @ViewChildren('statValue') statValues!: QueryList<ElementRef<HTMLElement>>;

  stats: Stat[] = [
    { value: 400, suffix: '+', key: 'agents' },
    { value: 200, suffix: '+', key: 'properties' },
    { value: 15, suffix: '+', key: 'experience' },
    { value: 98, suffix: '%', key: 'satisfaction' }
  ];

  heroSlides: HeroSlide[] = [
    { image: '/images/Gemini_Generated_Image_3mb2oz3mb2oz3mb2.jpg', key: 'slide1' },
    { image: '/images/Gemini_Generated_Image_kat1owkat1owkat1.jpg', key: 'slide2' }
  ];

  aboutPoints = ['about.point1', 'about.point2', 'about.point3'];

  services: ServiceCard[] = [
    { icon: 'home', key: 'homeGuard' },
    { icon: 'route', key: 'patrols' },
    { icon: 'shield', key: 'residential' },
    { icon: 'chat', key: 'consulting' },
    { icon: 'building', key: 'corporate' },
    { icon: 'lock', key: 'ownerPortal' }
  ];

  navLinks: NavLink[] = [
    { key: 'home', href: '#accueil' },
    { key: 'about', href: '#apropos' },
    { key: 'services', href: '#services' },
    { key: 'quote', href: '#devis' },
    { key: 'contact', href: '#contact' }
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
  quoteModalOpen = false;

  constructor(private translate: TranslateService) {
    const supportedLangs = this.languages.map((lang) => lang.code);
    this.translate.addLangs(supportedLangs);

    const savedLang = localStorage.getItem('lang');
    this.currentLang = savedLang && supportedLangs.includes(savedLang) ? savedLang : 'fr';
    this.translate.use(this.currentLang);
  }

  get currentLanguage(): AppLanguage {
    return this.languages.find((lang) => lang.code === this.currentLang) ?? this.languages[0];
  }

  toggleLangMenu(event: Event): void {
    event.stopPropagation();
    this.langMenuOpen = !this.langMenuOpen;
  }

  selectLang(code: string): void {
    this.currentLang = code;
    this.translate.use(code);
    localStorage.setItem('lang', code);
    this.langMenuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.langMenuOpen = false;
  }

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngAfterViewInit(): void {
    this.statValues.forEach((elRef, i) => {
      const stat = this.stats[i];
      const target = elRef.nativeElement;
      const counter = { val: 0 };

      const tween = gsap.to(counter, {
        val: stat.value,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: target,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        onUpdate: () => {
          target.textContent = Math.floor(counter.val).toString();
        }
      });

      this.statTweens.push(tween);
    });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    this.statTweens.forEach((tween) => {
      tween.scrollTrigger?.kill();
      tween.kill();
    });
    document.body.classList.remove('overflow-hidden');
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

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.scrollTicking) {
      return;
    }
    this.scrollTicking = true;

    requestAnimationFrame(() => {
      const currentY = window.scrollY;

      if (currentY < 60) {
        this.topBarVisible = true;
      } else if (currentY > this.lastScrollY) {
        this.topBarVisible = false;
      } else {
        this.topBarVisible = true;
      }

      this.lastScrollY = currentY;
      this.scrollTicking = false;
    });
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

  openQuoteModal(): void {
    this.quoteModalOpen = true;
    document.body.classList.add('overflow-hidden');
  }

  closeQuoteModal(): void {
    this.quoteModalOpen = false;
    this.quoteSubmitted = false;
    document.body.classList.remove('overflow-hidden');
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.quoteModalOpen) {
      this.closeQuoteModal();
    }
    this.langMenuOpen = false;
  }
}
