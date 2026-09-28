import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

const TOKEN_KEY = 'gardinnage_admin_token';
const ADMIN_KEY = 'gardinnage_admin_data';

export interface AdminData {
  _id: string;
  nom: string;
  email: string;
  role: string;
  actif: boolean;
  createdAt?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  admin: AdminData;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/api/admins/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.success && res.token) {
            localStorage.setItem(TOKEN_KEY, res.token);
            localStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin));
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getAdmin(): AdminData | null {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getUsername(): string {
    return this.getAdmin()?.nom ?? '';
  }
}
