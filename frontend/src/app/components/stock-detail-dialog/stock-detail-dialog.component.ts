import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { Stock } from '../../models/stock.model';

@Component({
  selector: 'app-stock-detail-dialog',
  templateUrl: './stock-detail-dialog.component.html',
  styleUrls: ['./stock-detail-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatDividerModule,
    RouterModule
  ]
})
export class StockDetailDialogComponent {
  
  stock: Stock;

  constructor(
    public dialogRef: MatDialogRef<StockDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { stock: Stock }
  ) {
    this.stock = data.stock;
  }

  // getStatusClass(status: string): string {
  //   switch (status) {
  //     case 'rupture': return 'status-out';
  //     case 'bas': return 'status-low';
  //     case 'normal': return 'status-normal';
  //     default: return '';
  //   }
  // }


  close(): void {
    this.dialogRef.close();
  }

  getStatusClass(stock: Stock): string {
    if (stock.quantity <= 0) {
      return 'status-out';
    } else if (stock.quantity < stock.minQuantity) {
      return 'status-low';
    } else {
      return 'status-normal';
    }
  }

  getStatusText(stock: Stock): string {
    if (stock.quantity <= 0) {
      return 'Rupture de stock';
    } else if (stock.quantity < stock.minQuantity) {
      return 'Stock bas';
    } else {
      return 'Stock normal';
    }
  }
}
