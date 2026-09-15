import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
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

interface FaqItem {
  key: string;
}

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

interface ChatIntent {
  keywords: string[];
  answerKey: string;
  smallTalk?: boolean;
}

interface GalleryPhoto {
  src: string;
  captionKey: string;
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

  faqItems: FaqItem[] = [
    { key: 'q1' },
    { key: 'q2' },
    { key: 'q3' },
    { key: 'q4' },
    { key: 'q5' },
    { key: 'q6' },
    { key: 'q7' },
    { key: 'q8' },
    { key: 'q9' },
    { key: 'q10' }
  ];
  galleryPhotos: GalleryPhoto[] = [
    { src: '/images/gallery/gallery-1.jpg', captionKey: 'gallery.photo1' },
    { src: '/images/gallery/gallery-2.jpg', captionKey: 'gallery.photo2' },
    { src: '/images/gallery/gallery-3.jpg', captionKey: 'gallery.photo3' },
    { src: '/images/gallery/gallery-4.jpg', captionKey: 'gallery.photo4' },
    { src: '/images/gallery/gallery-5.jpg', captionKey: 'gallery.photo5' },
    { src: '/images/gallery/gallery-6.jpg', captionKey: 'gallery.photo6' },
    { src: '/images/gallery/gallery-7.jpg', captionKey: 'gallery.photo7' },
    { src: '/images/gallery/gallery-8.jpg', captionKey: 'gallery.photo8' }
  ];
  galleryIndex: number | null = null;

  openGallery(index: number): void {
    this.galleryIndex = index;
    document.body.classList.add('overflow-hidden');
  }

  closeGallery(): void {
    this.galleryIndex = null;
    document.body.classList.remove('overflow-hidden');
  }

  nextGalleryPhoto(event: Event): void {
    event.stopPropagation();
    if (this.galleryIndex === null) {
      return;
    }
    this.galleryIndex = (this.galleryIndex + 1) % this.galleryPhotos.length;
  }

  prevGalleryPhoto(event: Event): void {
    event.stopPropagation();
    if (this.galleryIndex === null) {
      return;
    }
    this.galleryIndex = (this.galleryIndex - 1 + this.galleryPhotos.length) % this.galleryPhotos.length;
  }

  chatOpen = false;
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  chatUnread = false;

  @ViewChild('chatScroll') private chatScrollRef?: ElementRef<HTMLDivElement>;

  // Base de connaissance du chatbot : chaque intention a une liste de mots-clés
  // (déclencheurs) et une clé de traduction pour la réponse. Pour ajouter une
  // nouvelle question/réponse : ajoute une entrée ici avec ses mots-clés, et la
  // traduction correspondante dans public/i18n/*.json (sous "chatbot.intents.<clé>").
  chatIntents: ChatIntent[] = [
    { keywords: ['bonjour', 'bonsoir', 'salut', 'coucou', 'hello', 'hi', 'hey', 'mbote'], answerKey: 'chatbot.intents.greeting.answer', smallTalk: true },
    { keywords: ['merci', 'thanks', 'thank you', 'matondi', 'melesi'], answerKey: 'chatbot.intents.thanks.answer', smallTalk: true },
    { keywords: ['au revoir', 'bye', 'goodbye', 'a bientot', 'tikala malamu'], answerKey: 'chatbot.intents.goodbye.answer', smallTalk: true },
    { keywords: ['humain', 'conseiller', 'quelquun', 'representant', 'agent reel', 'human', 'someone', 'moto'], answerKey: 'chatbot.intents.human.answer' },
    { keywords: ['prix', 'cout', 'tarif', 'tarifs', 'montant', 'price', 'cost', 'combien coute', 'talo'], answerKey: 'chatbot.intents.pricing.answer' },

    { keywords: ['zone', 'zones', 'quartier', 'quartiers', 'commune', 'ville', 'couvrez', 'intervenez', 'kinshasa', 'rdc', 'congo', 'localisation', 'endroit', 'area', 'where'], answerKey: 'faq.q1.answer' },
    { keywords: ['contrat', 'mise en place', 'comment ca marche', 'etapes', 'signer', 'signature', 'demarrage', 'contract'], answerKey: 'faq.q2.answer' },
    { keywords: ['forme', 'formes', 'formation', 'verifie', 'verifies', 'fiable', 'fiables', 'recrutement', 'selection', 'trained', 'vetted'], answerKey: 'faq.q3.answer' },
    { keywords: ['incident', 'urgence', 'probleme', 'vol', 'intrusion', 'agression', 'alerte', 'danger', 'emergency'], answerKey: 'faq.q4.answer' },
    { keywords: ['entreprise', 'entreprises', 'societe', 'bureau', 'commerce', 'professionnel', 'business', 'company'], answerKey: 'faq.q5.answer' },
    { keywords: ['devis', 'delai devis', 'combien de temps', 'rapidite', 'quand', 'quote', 'how long'], answerKey: 'faq.q6.answer' },
    { keywords: ['paiement', 'payer', 'payement', 'mobile money', 'virement', 'especes', 'cash', 'banque', 'payment'], answerKey: 'faq.q7.answer' },
    { keywords: ['annuler', 'resilier', 'modifier', 'changer', 'arreter', 'stopper', 'fin de contrat', 'cancel', 'modify'], answerKey: 'faq.q8.answer' },
    { keywords: ['arme', 'armes', 'armee', 'pistolet', 'fusil', 'arme a feu', 'armed', 'weapon'], answerKey: 'faq.q9.answer' },
    { keywords: ['en ligne', 'portail', 'rapport', 'rapports', 'suivre', 'suivi', 'espace client', 'application', 'online', 'track'], answerKey: 'faq.q10.answer' }
  ];

  toggleChat(): void {
    this.chatOpen = !this.chatOpen;

    if (this.chatOpen) {
      this.chatUnread = false;

      if (this.chatMessages.length === 0) {
        this.botSay('chatbot.greeting');
      }
    }
  }

  askFaq(key: string): void {
    this.pushMessage('user', this.translate.instant(`faq.${key}.question`));

    setTimeout(() => {
      this.pushMessage('bot', this.translate.instant(`faq.${key}.answer`));
    }, 350);
  }

  sendChatMessage(): void {
    const text = this.chatInput.trim();

    if (!text) {
      return;
    }

    this.pushMessage('user', text);
    this.chatInput = '';

    const answerKey = this.findChatAnswer(text);

    setTimeout(() => {
      if (answerKey) {
        this.pushMessage('bot', this.translate.instant(answerKey));
      } else {
        this.botSay('chatbot.fallback');
      }
    }, 350);
  }

  private botSay(key: string): void {
    this.pushMessage('bot', this.translate.instant(key));
  }

  private pushMessage(from: 'bot' | 'user', text: string): void {
    this.chatMessages.push({ from, text });

    if (from === 'bot' && !this.chatOpen) {
      this.chatUnread = true;
    }

    requestAnimationFrame(() => {
      const el = this.chatScrollRef?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  private normalizeChatText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private scoreIntent(intent: ChatIntent, normalizedInput: string, inputTokens: Set<string>): number {
    let score = 0;

    for (const keyword of intent.keywords) {
      const normalizedKeyword = this.normalizeChatText(keyword);

      if (normalizedKeyword.includes(' ')) {
        // Mot-clé composé (ex. "mobile money") : on cherche la phrase entière.
        if (normalizedInput.includes(normalizedKeyword)) {
          score += 2;
        }
      } else if (inputTokens.has(normalizedKeyword)) {
        score += 1;
      }
    }

    return score;
  }

  private findChatAnswer(input: string): string | null {
    const normalizedInput = this.normalizeChatText(input);

    if (!normalizedInput) {
      return null;
    }

    const inputTokens = new Set(normalizedInput.split(' '));

    // Les vraies questions (sujets) passent avant les formules de politesse
    // (bonjour, merci...) pour qu'un message comme "bonjour, quel est le prix ?"
    // réponde bien sur le prix plutôt que de simplement dire bonjour.
    const topicIntents = this.chatIntents.filter((intent) => !intent.smallTalk);
    const smallTalkIntents = this.chatIntents.filter((intent) => intent.smallTalk);

    for (const intents of [topicIntents, smallTalkIntents]) {
      let bestKey: string | null = null;
      let bestScore = 0;

      for (const intent of intents) {
        const score = this.scoreIntent(intent, normalizedInput, inputTokens);

        if (score > bestScore) {
          bestScore = score;
          bestKey = intent.answerKey;
        }
      }

      if (bestKey) {
        return bestKey;
      }
    }

    return null;
  }

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
    if (this.galleryIndex !== null) {
      this.closeGallery();
    }
    this.langMenuOpen = false;
    this.chatOpen = false;
  }
}
