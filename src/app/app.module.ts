import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { TranslatePipe, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/auth.interceptor';
import { HomeComponent } from './public/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StatCardComponent } from './dashboard/stat-card/stat-card.component';
import { BarChartComponent } from './dashboard/bar-chart/bar-chart.component';
import { DonutChartComponent } from './dashboard/donut-chart/donut-chart.component';
import { PaiementsChartComponent } from './dashboard/paiements-chart/paiements-chart.component';
import { GardiensComponent } from './pages/gardiens/gardiens.component';
import { GardienDetailComponent } from './pages/gardiens/gardien-detail/gardien-detail.component';
import { ProprietairesComponent } from './pages/proprietaires/proprietaires.component';
import { ProprietaireDetailComponent } from './pages/proprietaires/proprietaire-detail/proprietaire-detail.component';
import { ProprietesComponent } from './pages/proprietes/proprietes.component';
import { ProprieteDetailComponent } from './pages/proprietes/propriete-detail/propriete-detail.component';
import { IncidentsComponent } from './pages/incidents/incidents.component';
import { IncidentDetailComponent } from './pages/incidents/incident-detail/incident-detail.component';
import { IncidentFormComponent } from './pages/incidents/incident-form/incident-form.component';
import { IncidentIconeComponent } from './pages/incidents/incident-icone/incident-icone.component';
import { IncidentsAlertesComponent } from './layout/incidents-alertes/incidents-alertes.component';
import { PaiementsComponent } from './pages/paiements/paiements.component';
import { PaiementFormComponent } from './pages/paiements/paiement-form/paiement-form.component';
import { PaiementSuppressionComponent } from './pages/paiements/paiement-suppression/paiement-suppression.component';
import { AffectationsComponent } from './pages/affectations/affectations.component';
import { AffectationsListeComponent } from './pages/affectations/affectations-liste/affectations-liste.component';
import { AffectationFormComponent } from './pages/affectations/affectation-form/affectation-form.component';
import { AffectationConfirmationComponent } from './pages/affectations/affectation-confirmation/affectation-confirmation.component';
import { AffectationAvatarComponent } from './pages/affectations/affectation-avatar/affectation-avatar.component';
import { AffectationHoraireComponent } from './pages/affectations/affectation-horaire/affectation-horaire.component';
import { AffectationSuiviComponent } from './pages/affectations/affectation-suivi/affectation-suivi.component';
import { AffectationDetailComponent } from './pages/affectations/affectation-detail/affectation-detail.component';
import { AffectationRetraitComponent } from './pages/affectations/affectation-retrait/affectation-retrait.component';
import { AffectationRemplacementComponent } from './pages/affectations/affectation-remplacement/affectation-remplacement.component';
import { AffectationsHistoriqueComponent } from './pages/affectations/affectations-historique/affectations-historique.component';
import { GardienPickerComponent } from './pages/affectations/gardien-picker/gardien-picker.component';
import { PresencesComponent } from './pages/presences/presences.component';
import { PresencesTableComponent } from './pages/presences/presences-table/presences-table.component';
import { PresencesResumeComponent } from './pages/presences/presences-resume/presences-resume.component';
import { PresenceDetailComponent } from './pages/presences/presence-detail/presence-detail.component';
import { PresenceClotureComponent } from './pages/presences/presence-cloture/presence-cloture.component';
import { RapportsComponent } from './pages/rapports/rapports.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { AdministrateursComponent } from './pages/administrateurs/administrateurs.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    LayoutComponent,
    SidebarComponent,
    TopbarComponent,
    DashboardComponent,
    StatCardComponent,
    BarChartComponent,
    DonutChartComponent,
    PaiementsChartComponent,
    GardiensComponent,
    GardienDetailComponent,
    ProprietairesComponent,
    ProprietaireDetailComponent,
    ProprietesComponent,
    ProprieteDetailComponent,
    IncidentsComponent,
    IncidentDetailComponent,
    IncidentFormComponent,
    IncidentIconeComponent,
    IncidentsAlertesComponent,
    PaiementsComponent,
    PaiementFormComponent,
    PaiementSuppressionComponent,
    AffectationsComponent,
    AffectationsListeComponent,
    AffectationFormComponent,
    AffectationConfirmationComponent,
    AffectationAvatarComponent,
    AffectationHoraireComponent,
    AffectationSuiviComponent,
    AffectationDetailComponent,
    AffectationRetraitComponent,
    AffectationRemplacementComponent,
    AffectationsHistoriqueComponent,
    GardienPickerComponent,
    PresencesComponent,
    PresencesTableComponent,
    PresencesResumeComponent,
    PresenceDetailComponent,
    PresenceClotureComponent,
    RapportsComponent,
    ParametresComponent,
    AdministrateursComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    TranslatePipe
  ],
  providers: [
    provideTranslateService({
      lang: 'fr',
      fallbackLang: 'fr',
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json'
      })
    }),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
