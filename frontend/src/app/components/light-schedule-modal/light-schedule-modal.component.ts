import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { EnvironmentalService } from '../../services/environmental.service';

interface LightSchedule {
  startTime: string;
  endTime: string;
  enabled: boolean;
  activeDays?: string[]; // Ajout des jours actifs
}

@Component({
  selector: 'app-light-schedule-modal',
  templateUrl: './light-schedule-modal.component.html',
  styleUrls: ['./light-schedule-modal.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LightScheduleModalComponent implements OnInit {
  @Input() title: string = 'Programmer l\'éclairage';
  @Input() lightSchedule: LightSchedule | null = null;
  @Input() location: string = '';

  scheduleForm: FormGroup;
  notifications: Notification[] = [];

  activeDays: string[] = [];

  showNotificationBar = false;
  notificationMessage = '';
  notificationType = '';

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder, private environmentalService: EnvironmentalService) {
    this.scheduleForm = this.fb.group({
      startTime: ['08:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]],
      endTime: ['20:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]],
      enabled: [true],
      Lundi: [true],
      Mardi: [true],
      Mercredi: [true],
      Jeudi: [true],
      Vendredi: [true],
      Samedi: [true],
      Dimanche: [true]
    }, { validators: this.timeValidator });
  }

  ngOnInit() {
    if (this.lightSchedule) {
      this.scheduleForm.patchValue(this.lightSchedule);
      if (this.lightSchedule.activeDays) {
        this.lightSchedule.activeDays.forEach(day => {
          this.scheduleForm.get(day)?.setValue(true);
        });
      }
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotificationBar = true;

    setTimeout(() => {
      this.showNotificationBar = false;
    }, 3000);
  }

  save() {
    if (this.scheduleForm.valid) {
      const schedule = this.scheduleForm.value;
      schedule.activeDays = Object.keys(schedule).filter(day => schedule[day] === true && ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].includes(day));
      this.activeModal.close(schedule);
    } else {
      console.error('Formulaire invalide');
      this.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
    }
  }


  toggleDay(day: string) {
    if (this.activeDays.includes(day)) {
      this.activeDays = this.activeDays.filter(d => d !== day);
    } else {
      this.activeDays.push(day);
    }
    this.updateLightPreferences(this.activeDays);
  }


  updateLightPreferences(activeDays: string[]) {
    this.environmentalService.updateLightPreferences(activeDays).subscribe(() => {
      this.activeDays = activeDays;
      this.showNotification('Préférences de jour mises à jour', 'success');
    }, error => {
      console.error('Erreur lors de la mise à jour des préférences de jour:', error);
      this.showNotification('Erreur lors de la mise à jour des préférences de jour', 'error');
    });
  }
  

  timeValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = control.get('startTime')?.value;
    const endTime = control.get('endTime')?.value;

    if (startTime && endTime && startTime >= endTime) {
      return { timeError: true };
    }
    return null;
  }

  get startTime() { return this.scheduleForm.get('startTime'); }
  get endTime() { return this.scheduleForm.get('endTime'); }
}
