import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

// Définir une interface pour les données du dialogue
interface DialogData {
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonIcon?: string;
  cancelButtonIcon?: string;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Annuler" [ngStyle]="{'color': data.cancelButtonColor}">
        <mat-icon *ngIf="data.cancelButtonIcon">{{ data.cancelButtonIcon }}</mat-icon>
        {{ data.cancelButtonText }}
      </button>
      <button mat-button [mat-dialog-close]="true" [ngStyle]="{'background-color': data.confirmButtonColor, 'color': 'white'}" aria-label="Confirmer">
        <mat-icon *ngIf="data.confirmButtonIcon">{{ data.confirmButtonIcon }}</mat-icon>
        {{ data.confirmButtonText }}
      </button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  styles: [
    `
      h2.mat-dialog-title {
        color: #333;
        font-size: 1.5rem;
        margin-bottom: 1rem;
      }

      .mat-dialog-content {
        color: #666;
        font-size: 1rem;
        margin-bottom: 1.5rem;
      }

      .mat-dialog-actions {
        justify-content: flex-end;
        padding: 1rem 0;

        button {
          margin-left: 0.5rem;
          transition: transform 0.3s ease;
        }

        button:hover {
          transform: scale(1.05);
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: DialogData
  ) {
    // Définir des valeurs par défaut si elles ne sont pas fournies
    this.data.confirmButtonText = this.data.confirmButtonText || 'Confirmer';
    this.data.cancelButtonText = this.data.cancelButtonText || 'Annuler';
    this.data.confirmButtonIcon = this.data.confirmButtonIcon || 'check_circle';
    this.data.cancelButtonIcon = this.data.cancelButtonIcon || 'cancel';
    this.data.confirmButtonColor = this.data.confirmButtonColor || '#09B462';
    this.data.cancelButtonColor = this.data.cancelButtonColor || '#666';
  }
}
