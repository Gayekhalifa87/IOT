import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { EnvironmentCardComponent } from '../environment-card/environment-card.component';
import { ControlPanelComponent } from '../control-panel/control-panel.component';
import { FeedingScheduleComponent } from '../feeding-schedule/feeding-schedule.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    EnvironmentCardComponent,
    ControlPanelComponent,
    FeedingScheduleComponent
  ],
  templateUrl: './dashboard.component.html', // Lien vers le template HTML
  styleUrls: ['./dashboard.component.css'] // Lien vers le fichier CSS
})
export class DashboardComponent {
  temperatureValue = 'N/A';
  humidityValue = 'N/A';
  lightValue = 'N/A';
  isLampActive = false;
}