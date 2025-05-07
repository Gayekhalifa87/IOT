import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlItemComponent } from '../control-item/control-item.component';
import { StockService } from '../../services/stock.service';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, ControlItemComponent],
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css']
})
export class ControlPanelComponent implements OnInit {
  feedTotal: number = 0;
  waterTotal: number = 0;
  feedUnit: string = 'Kg';
  waterUnit: string = 'L';
  dataLoaded: boolean = false;

  constructor(private stockService: StockService) {}

  ngOnInit(): void {
    console.log('ControlPanelComponent initialized');
    this.loadTotals();
  }

  loadTotals(): void {
    this.stockService.getTotals().subscribe({
      next: (data) => {
        console.log('Données récupérées dans le component:', data.totalsByType);
        
        // Extraire les valeurs avec des vérifications
        if (data && data.totalsByType) {
          // Pour l'aliment
          if (data.totalsByType['Aliment']) {
            this.feedTotal = data.totalsByType['Aliment'].totalQuantity;
            this.feedUnit = data.totalsByType['Aliment'].unit;
            console.log(`Feed: ${this.feedTotal} ${this.feedUnit}`);
          }
          
          // Pour l'eau
          if (data.totalsByType['Eau']) {
            this.waterTotal = data.totalsByType['Eau'].totalQuantity;
            this.waterUnit = data.totalsByType['Eau'].unit;
            console.log(`Water: ${this.waterTotal} ${this.waterUnit}`);
          }
          
          this.dataLoaded = true;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des totaux', err);
      }
    });
  }
}