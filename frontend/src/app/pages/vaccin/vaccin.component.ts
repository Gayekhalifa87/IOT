

// import { Component, inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { HttpClientModule } from '@angular/common/http';
// import { VaccineService } from '../../services/vaccine.service';
// import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// @Component({
//   selector: 'app-vaccin',
//   standalone: true,
//   imports: [CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule], // Ajout de ReactiveFormsModule
//   templateUrl: './vaccin.component.html',
//   styleUrls: ['./vaccin.component.css']
// })
// export class VaccinComponent {
//   days: string[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
//   dates: { date: number, day: string, index: number }[] = [];
//   selectedDate: { date: number, day: string } | null = null;
//   showDates: boolean = false;
//   vaccines: any[] = []; // Stocke les vaccins récupérés depuis l'API

//   //pour les vaccinations a venir
//   upcomingVaccines: any[] = []; // Stocke les vaccins à venir

//   vaccineForm: FormGroup; // Déclaration du formulaire réactif

//   private vaccinService = inject(VaccineService);
//   private fb = inject(FormBuilder); // Injection du FormBuilder

//   /* constructor() {
//     this.generateCalendar();
//     this.loadVaccines();

//     // Initialisation du formulaire avec FormBuilder
//     this.vaccineForm = this.fb.group({
//       name: ['', Validators.required],
//       dateAdministered: ['', Validators.required],
//       nextDueDate: ['', Validators.required]
//     });
//   } */

//     constructor() {
//       this.generateCalendar();
//       this.loadVaccines();
//       this.loadUpcomingVaccines(); // 🔥 Ajout ici pour bien charger les vaccins à venir
//       // Initialisation du formulaire
//       this.vaccineForm = this.fb.group({
//         name: ['', Validators.required],
//         dateAdministered: ['', Validators.required],
//         nextDueDate: ['', Validators.required]
//       });
//     }
    
//   // Génère un calendrier sur 45 jours
//   generateCalendar() {
//     const now = new Date();
//     for (let i = 0; i < 45; i++) {
//       const futureDate = new Date(now);
//       futureDate.setDate(now.getDate() + i);
//       const dayName = this.days[futureDate.getDay() === 0 ? 6 : futureDate.getDay() - 1];
//       this.dates.push({ date: futureDate.getDate(), day: dayName, index: i + 1 });
//     }
//   }

//   // Sélectionne une date
//   selectDate(dateObj: { date: number; day: string }) {
//     this.selectedDate = dateObj;
//   }

//   // Affiche ou cache le calendrier
//   toggleDates() {
//     this.showDates = !this.showDates;
//   }

//   // Récupérer la liste des vaccins depuis l'API
//   loadVaccines() {
//     this.vaccinService.getVaccines().subscribe({
//       next: (data) => {
//         this.vaccines = data;
//       },
//       error: (err) => {
//         console.error('Erreur lors du chargement des vaccins', err);
//       }
//     });
//   }

//     // Récupérer les vaccins à venir
//     loadUpcomingVaccines() {
//       this.vaccinService.getUpcomingVaccines().subscribe({
//         next: (data) => {
//           console.log('Vaccins à venir récupérés :', data); // Vérifier la réponse API
//           this.upcomingVaccines = data;
//         },
//         error: (err) => {
//           console.error('Erreur lors du chargement des vaccins à venir', err);
//         }
//       });
//     }
    

//   // Ajouter un vaccin via le formulaire réactif
//    // Ajouter un vaccin via le formulaire réactif
//    onSubmit() {
//     if (this.vaccineForm.valid) {
//       this.vaccinService.addVaccine(this.vaccineForm.value).subscribe({
//         next: () => {
//           console.log('Vaccin ajouté avec succès');
//           this.vaccineForm.reset(); // Réinitialisation du formulaire
//           this.loadVaccines(); // Rafraîchir la liste des vaccins
//           this.loadUpcomingVaccines(); // Mettre à jour les vaccins à venir
//         },
//         error: (err) => {
//           console.error('Erreur lors de l’ajout du vaccin', err);
//         }
//       });
//     }
//   }

//   // Supprimer un vaccin
//   deleteVaccine(id: string) {
//     this.vaccinService.deleteVaccine(id).subscribe({
//       next: () => {
//         console.log('Vaccin supprimé avec succès');
//         this.loadVaccines(); // Recharger la liste
//       },
//       error: (err) => {
//         console.error('Erreur lors de la suppression du vaccin', err);
//       }
//     });
//   }
// }
