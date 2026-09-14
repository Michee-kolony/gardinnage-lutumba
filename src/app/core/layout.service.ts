import { Injectable, signal } from '@angular/core';

const DESKTOP_BREAKPOINT = 768;

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  sidebarOpen = signal(!this.isMobile());
  private wasMobile = this.isMobile();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.onResize());
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < DESKTOP_BREAKPOINT;
  }

  private onResize(): void {
    const isMobileNow = this.isMobile();
    if (isMobileNow === this.wasMobile) {
      return;
    }
    this.wasMobile = isMobileNow;
    // En entrant en mode mobile, le tiroir doit repartir fermé ;
    // en revenant en desktop, la sidebar doit repartir dépliée.
    this.sidebarOpen.set(!isMobileNow);
  }
}
