import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { Chart, ChartOptions, registerables } from 'chart.js';
import { DevisePaiement, Paiement } from '../../core/paiements.service';

Chart.register(...registerables);

@Component({
  selector: 'app-paiements-chart',
  templateUrl: './paiements-chart.component.html',
  styleUrl: './paiements-chart.component.css'
})
export class PaiementsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() paiements: Paiement[] = [];
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly devises: DevisePaiement[] = ['CDF', 'USD'];
  readonly mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  deviseSelectionnee: DevisePaiement = 'CDF';
  anneeSelectionnee = new Date().getFullYear();

  private chart?: Chart<'bar'>;

  get anneesDisponibles(): number[] {
    const annees = new Set(this.paiements.map((paiement) => new Date(paiement.createdAt).getFullYear()));
    if (annees.size === 0) {
      annees.add(new Date().getFullYear());
    }
    return [...annees].sort((a, b) => b - a);
  }

  get totauxMensuels(): number[] {
    const totaux = Array.from({ length: 12 }, () => 0);
    this.paiements.forEach((paiement) => {
      const date = new Date(paiement.createdAt);
      if (date.getFullYear() === this.anneeSelectionnee && paiement.devise === this.deviseSelectionnee) {
        totaux[date.getMonth()] += paiement.montant;
      }
    });
    return totaux;
  }

  get meilleurMois(): { label: string; montant: number } | null {
    const totaux = this.totauxMensuels;
    const montant = Math.max(...totaux);
    if (montant <= 0) {
      return null;
    }
    return { label: this.mois[totaux.indexOf(montant)], montant };
  }

  private readonly options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => this.formatMontant(Number(context.raw))
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#737373' }
      },
      y: {
        beginAtZero: true,
        border: { display: false, dash: [3, 4] },
        grid: { color: '#e5e5e5' },
        ticks: {
          color: '#737373',
          callback: (value) => this.formatCompact(Number(value))
        }
      }
    }
  };

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(): void {
    const anneesPaiements = this.paiements.map((paiement) => new Date(paiement.createdAt).getFullYear());
    if (anneesPaiements.length > 0 && !anneesPaiements.includes(this.anneeSelectionnee)) {
      this.anneeSelectionnee = Math.max(...anneesPaiements);
    }
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  changerAnnee(annee: string): void {
    this.anneeSelectionnee = Number(annee);
    this.renderChart();
  }

  changerDevise(devise: DevisePaiement): void {
    this.deviseSelectionnee = devise;
    this.renderChart();
  }

  formatMontant(montant: number): string {
    const valeur = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(montant);
    return this.deviseSelectionnee === 'USD' ? `$ ${valeur}` : `${valeur} CDF`;
  }

  private formatCompact(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(montant);
  }

  private renderChart(): void {
    if (!this.chartCanvas) {
      return;
    }

    const totaux = this.totauxMensuels;
    const maximum = Math.max(...totaux);
    const colors = totaux.map((montant) => montant > 0 && montant === maximum ? '#15803d' : '#a3a3a3');

    if (!this.chart) {
      this.chart = new Chart(this.chartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.mois,
          datasets: [{
            data: totaux,
            backgroundColor: colors,
            borderRadius: 4,
            maxBarThickness: 32
          }]
        },
        options: this.options
      });
      return;
    }

    this.chart.data.datasets[0].data = totaux;
    this.chart.data.datasets[0].backgroundColor = colors;
    this.chart.update();
  }
}