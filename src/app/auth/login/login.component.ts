import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    // Mode démo statique : la vérification des identifiants sera activée
    // lorsque le backend d'authentification sera branché.
    this.authService.login('admin', 'admin123');
    this.router.navigate(['/admin/dashboard']);
  }
}
