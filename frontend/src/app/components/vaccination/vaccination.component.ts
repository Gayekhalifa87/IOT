import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { VaccineService, Vaccine, VaccineScheduleParams } from '../../services/vaccine.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-vaccination',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    SidebarComponent,
    MatSnackBarModule,
    MatProgressBarModule,
    MatDialogModule,
    ConfirmDialogComponent
  ],
  templateUrl: './vaccination.component.html',
  styleUrls: ['./vaccination.component.css']
})
export class VaccinationComponent implements OnInit, AfterViewInit {
  // Formulaires
  scheduleForm: FormGroup;
  notificationForm: FormGroup;

  showNotificationBar = false; // Pour afficher ou masquer la barre de notification
  notificationMessage = '';    // Message à afficher
  notificationType = '';       // Type de notification (success, error, info)

  // Données
  upcomingVaccines: Vaccine[] = [];
  administeredVaccines: Vaccine[] = [];
  loading = false;

  minDate: string;

  // Pagination pour les vaccins à venir
  dataSource = new MatTableDataSource<Vaccine>([]);
  displayedColumns: string[] = ['name', 'scheduledDate', 'weekNumber', 'numberOfChickens', 'actions'];

  // Descriptions des vaccins
  vaccineDescriptions: { [key: string]: string } = {
    'Marek': 'Protège contre la maladie de Marek, une infection virale affectant le système nerveux des volailles.',
    'Newcastle + Bronchite': 'Vaccin combiné contre la maladie de Newcastle (virale) et la bronchite infectieuse.',
    'Gumboro': 'Protège contre la maladie de Gumboro, qui affecte le système immunitaire des volailles.',
    'Newcastle': 'Protège contre la maladie de Newcastle, une infection respiratoire virale.',
    'Newcastle + Bronchite (rappel)': 'Rappel combiné pour renforcer l’immunité contre Newcastle et la bronchite.',
    'Encéphalomyélite': 'Protège contre l’encéphalomyélite aviaire, une maladie neurologique.',
    'Gumboro (rappel)': 'Rappel pour renforcer la protection contre la maladie de Gumboro.',
    'Bronchite': 'Protège contre la bronchite infectieuse aviaire.',
    'Newcastle (final)': 'Dernier rappel contre la maladie de Newcastle pour une immunité durable.'
  };
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Types de volaille disponibles
  chickenTypes = [
    { value: 'pondeuse', label: 'Poule pondeuse' },
    { value: 'chair', label: 'Poulet de chair' },
    { value: 'mixte', label: 'Volaille mixte' }
  ];

  constructor(
    private fb: FormBuilder,
    private vaccineService: VaccineService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {

    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    // Initialisation du formulaire de génération de calendrier
    this.scheduleForm = this.fb.group({
      startDate: [today, [Validators.required, this.dateValidator()]],
      chickenType: ['pondeuse', Validators.required],
      numberOfChickens: [10, [Validators.required, Validators.min(1)]],
      scheduleType: ['standard']
    });

    // Initialisation du formulaire de préférences de notification
    this.notificationForm = this.fb.group({
      enableEmailReminders: [true],
      reminderDays: [2, [Validators.min(1), Validators.max(7)]],
      dailySummary: [false]
    });
  }


  dateValidator() {
    return (control: { value: any; }) => {
      const inputDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Réinitialiser l'heure à minuit pour comparer juste les dates
      
      if (inputDate < today) {
        return { 'pastDate': true };
      }
      return null;
    };
  }

  ngOnInit(): void {
    this.loadUpcomingVaccines();
    this.loadAdministeredVaccines();

    // Testez le formatage de la date
  const testDate = new Date();
  console.log('Date formatée:', this.formatDate(testDate));
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  // Charger les vaccins à venir
  loadUpcomingVaccines(): void {
    this.loading = true;
    this.vaccineService.getUpcomingVaccines().subscribe({
      next: (response) => {
        this.upcomingVaccines = response.vaccines;
        this.dataSource.data = this.upcomingVaccines;
        this.loading = false;
        console.log('Vaccins à venir:', this.upcomingVaccines); // Inspectez les données
        this.showNotification('Vaccins à venir chargés avec succès', 'success');
      },
      error: (error) => {
        this.showNotification('Erreur lors du chargement des vaccins à venir', 'error');
        this.loading = false;
      }
    });
  }

  // Charger les vaccins administrés
  loadAdministeredVaccines(): void {
    this.vaccineService.getAdministeredVaccines().subscribe({
      next: (response) => {
        this.administeredVaccines = response.vaccines;
      },
      error: (error) => {
        this.showNotification('Erreur lors du chargement des vaccins administrés', 'error');
      }
    });
  }

  // Générer un calendrier de vaccination
  generateSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.showNotification('Veuillez remplir correctement le formulaire', 'error');
      return;
    }
  
    const params: VaccineScheduleParams = this.scheduleForm.value;
    this.loading = true;
  
    this.vaccineService.generateVaccinationSchedule(params).subscribe({
      next: (response) => {
        this.showNotification(`${response.message}`, 'success');
        this.loadUpcomingVaccines();
        this.loading = false;
      },
      error: (error) => {
        this.showNotification(`Erreur: ${error.error.message || 'Erreur lors de la génération du calendrier'}`, 'error');
        this.loading = false;
      }
    });
  }

  // Marquer un vaccin comme administré
  markAsAdministered(vaccine: Vaccine): void {
    const data = {
      administeredDate: new Date(),
      notes: vaccine.notes
    };
  
    this.vaccineService.markVaccineAsAdministered(vaccine._id as string, data).subscribe({
      next: (response) => {
        this.showNotification('Vaccin marqué comme administré', 'success');
        this.loadUpcomingVaccines();
        this.loadAdministeredVaccines();
      },
      error: (error) => {
        this.showNotification('Erreur lors du marquage du vaccin', 'error');
      }
    });
  }

  // Supprimer un vaccin
  deleteVaccine(vaccineId: string | undefined): void {
    if (!vaccineId) {
        this.showNotification('ID du vaccin invalide', 'error');
        return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px', // Définit la largeur de la modale
        data: {
            title: 'Confirmation de suppression',
            message: 'Êtes-vous sûr de vouloir supprimer ce vaccin ?',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        }
    });

    dialogRef.afterClosed().subscribe(result => {
        if (result) {  // L'utilisateur a cliqué sur "Supprimer"
            this.vaccineService.deleteVaccine(vaccineId).subscribe({
                next: () => {
                    this.showNotification('Vaccin supprimé avec succès', 'success');
                    this.loadUpcomingVaccines();
                    this.loadAdministeredVaccines();
                },
                error: (error) => {
                    this.showNotification('Erreur lors de la suppression du vaccin', 'error');
                }
            });
        }
        // Si result est false ou undefined, l'utilisateur a annulé, ne rien faire
    });
}

  // Mettre à jour les préférences de notification
  updateNotificationSettings(): void {
    if (this.notificationForm.invalid) {
      this.showCustomNotification('Veuillez remplir correctement le formulaire', 'error');
      return;
    }
  
    this.vaccineService.updateNotificationPreferences(this.notificationForm.value).subscribe({
      next: (response) => {
        this.showCustomNotification('Préférences de notification mises à jour', 'success');
      },
      error: (error) => {
        this.showCustomNotification('Erreur lors de la mise à jour des préférences', 'error');
      }
    });
  }

  // Envoyer un résumé hebdomadaire
  sendWeeklySummary(): void {
    this.vaccineService.sendWeeklySummary().subscribe({
      next: (response) => {
        this.showCustomNotification(`${response.message}`, 'success');
      },
      error: (error) => {
        this.showCustomNotification('Erreur lors de l\'envoi du résumé hebdomadaire', 'error');
      }
    });
  }


  // Formater une date pour l'affichage
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'Date non définie';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Méthode pour afficher une notification
showCustomNotification(message: string, type: 'success' | 'error' | 'info') {
  this.notificationMessage = message;
  this.notificationType = type;
  this.showNotificationBar = true;

  // Fermer automatiquement la notification après 3 secondes
  setTimeout(() => {
    this.showNotificationBar = false;
  }, 3000);
}

// Afficher une notification en bas à droite
private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  this.snackBar.open(message, 'Fermer', {
    duration: 5000, // Durée d'affichage du message (5 secondes)
    panelClass: [`notification-${type}`], // Classe CSS pour le style
    verticalPosition: 'bottom', // Position verticale en bas
    horizontalPosition: 'right', // Position horizontale à droite
  });
}
}