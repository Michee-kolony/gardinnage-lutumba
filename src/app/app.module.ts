import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './auth/login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StatCardComponent } from './dashboard/stat-card/stat-card.component';
import { BarChartComponent } from './dashboard/bar-chart/bar-chart.component';
import { DonutChartComponent } from './dashboard/donut-chart/donut-chart.component';
import { GardiensComponent } from './pages/gardiens/gardiens.component';
import { GardienDetailComponent } from './pages/gardiens/gardien-detail/gardien-detail.component';
import { ProprietairesComponent } from './pages/proprietaires/proprietaires.component';
import { MaisonsComponent } from './pages/maisons/maisons.component';
import { ContratsComponent } from './pages/contrats/contrats.component';
import { IncidentsComponent } from './pages/incidents/incidents.component';
import { PaiementsComponent } from './pages/paiements/paiements.component';
import { ParametresComponent } from './pages/parametres/parametres.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    LayoutComponent,
    SidebarComponent,
    TopbarComponent,
    DashboardComponent,
    StatCardComponent,
    BarChartComponent,
    DonutChartComponent,
    GardiensComponent,
    GardienDetailComponent,
    ProprietairesComponent,
    MaisonsComponent,
    ContratsComponent,
    IncidentsComponent,
    PaiementsComponent,
    ParametresComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
