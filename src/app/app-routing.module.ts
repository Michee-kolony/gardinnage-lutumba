import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './public/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GardiensComponent } from './pages/gardiens/gardiens.component';
import { GardienDetailComponent } from './pages/gardiens/gardien-detail/gardien-detail.component';
import { ProprietairesComponent } from './pages/proprietaires/proprietaires.component';
import { MaisonsComponent } from './pages/maisons/maisons.component';
import { ContratsComponent } from './pages/contrats/contrats.component';
import { IncidentsComponent } from './pages/incidents/incidents.component';
import { PaiementsComponent } from './pages/paiements/paiements.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { authGuard } from './core/auth.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'gardiens', component: GardiensComponent },
      { path: 'gardiens/:id', component: GardienDetailComponent },
      { path: 'proprietaires', component: ProprietairesComponent },
      { path: 'maisons', component: MaisonsComponent },
      { path: 'contrats', component: ContratsComponent },
      { path: 'incidents', component: IncidentsComponent },
      { path: 'paiements', component: PaiementsComponent },
      { path: 'parametres', component: ParametresComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
