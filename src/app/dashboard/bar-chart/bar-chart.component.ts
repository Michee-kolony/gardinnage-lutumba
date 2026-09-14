import { Component, Input } from '@angular/core';

export interface BarChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.css'
})
export class BarChartComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() data: BarChartPoint[] = [];

  get maxValue(): number {
    return Math.max(...this.data.map((d) => d.value), 1);
  }

  heightPercent(value: number): number {
    return Math.round((value / this.maxValue) * 100);
  }
}
