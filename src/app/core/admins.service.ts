import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AdminData } from './auth.service';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export interface CreateAdminPayload {
  nom: string;
  email: string;
  password: string;
  role: AdminRole;
}

interface ListAdminsResponse {
  success: boolean;
  total: number;
  admins: AdminData[];
}

interface CreateAdminResponse {
  success: boolean;
  message: string;
  admin: AdminData;
}

@Injectable({ providedIn: 'root' })
export class AdminsService {

  constructor(private http: HttpClient) {}

  list(): Observable<ListAdminsResponse> {
    return this.http.get<ListAdminsResponse>(`${environment.apiUrl}/api/admins/`);
  }

  create(payload: CreateAdminPayload): Observable<CreateAdminResponse> {
    return this.http.post<CreateAdminResponse>(`${environment.apiUrl}/api/admins/inscription`, payload);
  }
}
