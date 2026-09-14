import { Injectable } from '@angular/core';

const SESSION_KEY = 'gardinnage_admin_session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  login(username: string, password: string): boolean {
    // TODO: remplacer par un appel API réel lorsque le backend sera disponible.
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username, loggedInAt: Date.now() }));
      return true;
    }
    return false;
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(SESSION_KEY);
  }

  getUsername(): string {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return '';
    }
    try {
      return JSON.parse(raw).username ?? '';
    } catch {
      return '';
    }
  }
}
