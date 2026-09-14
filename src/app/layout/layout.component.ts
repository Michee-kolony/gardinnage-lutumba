import { Component } from '@angular/core';
import { LayoutService } from '../core/layout.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  constructor(public layout: LayoutService) {}
}
