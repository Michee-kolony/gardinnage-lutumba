import { Injectable, NgZone, OnDestroy } from '@angular/core';

export type SonNotification = 'rapport' | 'message';

// Son et notification native du système (Windows, macOS, Android...) pour l'espace admin.
// Les navigateurs exigent un premier geste de l'utilisateur pour jouer un son ou demander
// l'autorisation des notifications : on les débloque au premier clic / touche.
@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  private audioContext?: AudioContext;
  private readonly debloquer = () => this.surPremierGeste();

  constructor(private zone: NgZone) {
    document.addEventListener('pointerdown', this.debloquer, { once: true });
    document.addEventListener('keydown', this.debloquer, { once: true });
  }

  ngOnDestroy(): void {
    document.removeEventListener('pointerdown', this.debloquer);
    document.removeEventListener('keydown', this.debloquer);
    this.audioContext?.close();
  }

  // L'onglet est-il affiché à l'écran ?
  get pageVisible(): boolean {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  // Notification native du système, utile quand l'onglet est en arrière-plan.
  // Le son du système accompagne la notification selon les réglages de l'appareil.
  notifierSysteme(titre: string, corps: string, icone: string, tag: string, auClic: () => void): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const notification = new Notification(titre, {
        body: corps,
        icon: icone || '/images/logo.png',
        tag,
        silent: false
      });
      notification.onclick = () => this.zone.run(() => {
        window.focus();
        auClic();
        notification.close();
      });
    } catch {
      // Notifications indisponibles (ex : navigateur mobile sans service worker) : le pop-up suffit
    }
  }

  // Petit carillon généré par Web Audio (aucun fichier à charger)
  jouerSon(type: SonNotification): void {
    try {
      this.audioContext ??= new AudioContext();
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      const notes = type === 'rapport' ? [784, 1047, 1319] : [880, 1175];
      notes.forEach((frequence, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const debut = ctx.currentTime + index * 0.12;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequence, debut);
        gain.gain.setValueAtTime(0, debut);
        gain.gain.linearRampToValueAtTime(0.18, debut + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, debut + 0.35);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(debut);
        oscillator.stop(debut + 0.36);
      });
    } catch {
      // Audio indisponible : la notification visuelle suffit
    }
  }

  private surPremierGeste(): void {
    document.removeEventListener('pointerdown', this.debloquer);
    document.removeEventListener('keydown', this.debloquer);
    try {
      this.audioContext ??= new AudioContext();
      this.audioContext.resume().catch(() => undefined);
    } catch {
      // Audio indisponible
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }
}
