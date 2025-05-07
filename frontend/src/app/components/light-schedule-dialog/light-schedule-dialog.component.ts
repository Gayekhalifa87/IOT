import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

interface ScheduledTime {
  id: string;
  time: string;
  days: string[];
  active: boolean;
}

@Component({
  selector: 'app-light-schedule-dialog',
  template: `
    <h2 mat-dialog-title>Programmer la lampe {{data.title}}</h2>
    <mat-dialog-content>
      <div class="mb-4">
        <button mat-button color="primary" (click)="addSchedule()">
          Ajouter un horaire
        </button>
      </div>

      <div *ngIf="schedules.length === 0" class="text-center py-4">
        Aucun horaire programmé
      </div>

      <div *ngFor="let schedule of schedules; let i = index" class="schedule-item mb-3 p-3 border rounded">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4 class="m-0">Horaire #{{i + 1}}</h4>
          <button mat-icon-button color="warn" (click)="removeSchedule(i)">
            <fa-icon [icon]="faTrash"></fa-icon>
          </button>
        </div>

        <div class="form-group mb-2">
          <label>Heure d'allumage:</label>
          <input type="time" [(ngModel)]="schedule.time" class="form-control">
        </div>

        <div class="form-group mb-2">
          <label>Jours de la semaine:</label>
          <div class="d-flex flex-wrap">
            <div *ngFor="let day of daysOfWeek" class="me-2 mb-2">
              <label class="day-checkbox">
                <input type="checkbox"
                       [checked]="schedule.days.includes(day.value)"
                       (change)="toggleDay(schedule, day.value)">
                {{day.label}}
              </label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-check">
            <input type="checkbox" class="form-check-input" [(ngModel)]="schedule.active">
            Activer cet horaire
          </label>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-button color="primary" [mat-dialog-close]="schedules">Enregistrer</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule, FontAwesomeModule]
})
export class LightScheduleDialogComponent {
  schedules: ScheduledTime[] = [];
  daysOfWeek = [
    { value: 'monday', label: 'Lun' },
    { value: 'tuesday', label: 'Mar' },
    { value: 'wednesday', label: 'Mer' },
    { value: 'thursday', label: 'Jeu' },
    { value: 'friday', label: 'Ven' },
    { value: 'saturday', label: 'Sam' },
    { value: 'sunday', label: 'Dim' }
  ];

  faTrash = faTrash;

  constructor(@Inject(MAT_DIALOG_DATA) public data: {title: string, schedules: ScheduledTime[]}) {
    this.schedules = data.schedules || [];
  }

  addSchedule() {
    this.schedules.push({
      id: this.generateId(),
      time: '08:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      active: true
    });
  }

  removeSchedule(index: number) {
    this.schedules.splice(index, 1);
  }

  toggleDay(schedule: ScheduledTime, day: string) {
    const index = schedule.days.indexOf(day);
    if (index === -1) {
      schedule.days.push(day);
    } else {
      schedule.days.splice(index, 1);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}