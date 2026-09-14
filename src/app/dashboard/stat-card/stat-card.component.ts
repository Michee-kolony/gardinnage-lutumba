import { Component, Input } from '@angular/core';

export type TrendDirection = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css'
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = 0;
  @Input() hint = '';
  @Input() icon = 'grid';
  @Input() emphasis: 'default' | 'dark' = 'default';
  @Input() trend: TrendDirection = 'neutral';
  @Input() trendValue = '';
}
