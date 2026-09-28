import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnDestroy {
  email = '';
  password = '';
  loading = false;

  toastVisible = false;
  toastMessage = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.email || !this.password || this.loading) {
      return;
    }

    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.showErrorToast(err.error?.message || 'Impossible de se connecter. Vérifiez vos identifiants.');
      }
    });
  }

  closeToast(): void {
    this.toastVisible = false;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  private showErrorToast(message: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    // Repasse par "caché" un instant pour rejouer l'animation d'entrée
    // même si un toast précédent était encore affiché.
    this.toastVisible = false;

    setTimeout(() => {
      this.toastMessage = message;
      this.toastVisible = true;
      this.toastTimer = setTimeout(() => this.closeToast(), 5000);
    });
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }
}
