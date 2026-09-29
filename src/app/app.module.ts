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
import { PaiementsComponent } from './pages/paiements/paiements.component';
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
    PaiementsComponent,
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
