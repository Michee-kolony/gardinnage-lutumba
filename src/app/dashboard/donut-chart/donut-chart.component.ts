import { Component, Input, OnChanges } from '@angular/core';

export interface DonutSegment {
  label: string;
  value: number;
  strokeColor: string;
}

interface RenderedSegment extends DonutSegment {
  dashArray: string;
  dashOffset: number;
  percent: number;
}

const CIRCUMFERENCE = 2 * Math.PI * 40;

@Component({
  selector: 'app-donut-chart',
  templateUrl: './donut-chart.component.html',
  styleUrl: './donut-chart.component.css'
})
export class DonutChartComponent implements OnChanges {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() segments: DonutSegment[] = [];

  renderedSegments: RenderedSegment[] = [];
  total = 0;

  ngOnChanges(): void {
    this.total = this.segments.reduce((sum, s) => sum + s.value, 0) || 1;

    let offsetAccumulated = 0;
    this.renderedSegments = this.segments.map((segment) => {
      const percent = segment.value / this.total;
      const segmentLength = percent * CIRCUMFERENCE;
      const rendered: RenderedSegment = {
        ...segment,
        percent: Math.round(percent * 100),
        dashArray: `${segmentLength} ${CIRCUMFERENCE - segmentLength}`,
        dashOffset: -offsetAccumulated,
      };
      offsetAccumulated += segmentLength;
      return rendered;
    });
  }
}
