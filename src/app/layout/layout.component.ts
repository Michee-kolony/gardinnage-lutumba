import { Component, OnDestroy } from '@angular/core';
import { ChatService } from '../core/chat.service';
import { LayoutService } from '../core/layout.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnDestroy {
  constructor(public layout: LayoutService, private chat: ChatService) {
    // Messagerie en temps réel tant que l'espace admin est ouvert (badge des messages non lus)
    this.chat.demarrer();
  }

  ngOnDestroy(): void {
    this.chat.arreter();
  }
}
