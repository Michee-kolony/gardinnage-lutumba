import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './public/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { GardiensComponent } from './pages/gardiens/gardiens.component';
import { GardienDetailComponent } from './pages/gardiens/gardien-detail/gardien-detail.component';
import { ProprietairesComponent } from './pages/proprietaires/proprietaires.component';
import { ProprietaireDetailComponent } from './pages/proprietaires/proprietaire-detail/proprietaire-detail.component';
import { ProprietesComponent } from './pages/proprietes/proprietes.component';
import { ProprieteDetailComponent } from './pages/proprietes/propriete-detail/propriete-detail.component';
import { IncidentsComponent } from './pages/incidents/incidents.component';
import { IncidentDetailComponent } from './pages/incidents/incident-detail/incident-detail.component';
import { PaiementsComponent } from './pages/paiements/paiements.component';
import { AffectationsComponent } from './pages/affectations/affectations.component';
import { PresencesComponent } from './pages/presences/presences.component';
import { RapportsComponent } from './pages/rapports/rapports.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { AdministrateursComponent } from './pages/administrateurs/administrateurs.component';
import { MessagerieComponent } from './pages/messagerie/messagerie.component';
import { authGuard } from './core/auth.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'gardiens', component: GardiensComponent },
      { path: 'gardiens/:id', component: GardienDetailComponent },
      { path: 'proprietaires', component: ProprietairesComponent },
      { path: 'proprietaires/:id', component: ProprietaireDetailComponent },
      { path: 'proprietes', component: ProprietesComponent },
      { path: 'proprietes/:id', component: ProprieteDetailComponent },
      { path: 'incidents', component: IncidentsComponent },
      { path: 'incidents/:id', component: IncidentDetailComponent },
      { path: 'messagerie', component: MessagerieComponent },
      { path: 'paiements', component: PaiementsComponent },
      { path: 'affectations', component: AffectationsComponent },
      { path: 'presences', component: PresencesComponent },
      { path: 'rapports', component: RapportsComponent },
      { path: 'administrateurs', component: AdministrateursComponent },
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
