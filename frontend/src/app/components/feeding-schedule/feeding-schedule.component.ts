import { Component, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { AlimentationService, Feeding, Notification } from '../../services/alimentation.service';
import { StockService } from '../../services/stock.service';
import { Stock } from '../../models/stock.model';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-feeding-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './feeding-schedule.component.html',
  styleUrls: ['./feeding-schedule.component.css']
})
export class FeedingScheduleComponent implements OnInit, OnDestroy {
  @ViewChild('addFoodModal') addFoodModal!: TemplateRef<any>;
  @ViewChild('addWaterModal') addWaterModal!: TemplateRef<any>;

  nourritures: Feeding[] = [];
  eau: Feeding[] = [];
  stocks: Stock[] = [];
  notifications: Notification[] = [];

  filteredNourritureStocks: Stock[] = []; // Uniquement pour les aliments

  newQuantity: number = 0;
  newNotes: string = '';
  newAutomaticFeeding: boolean = true;
  newProgramStartTime: string = '';
  newProgramEndTime: string = '';
  newStockId: string | undefined = undefined; // Restaurer newStockId comme optionnel pour les aliments
  waterQuantity: number = 0; // Quantité mesurée par le capteur
  currentSection: string = '';
  editIndex: number | null = null;

  private subscriptions: Subscription = new Subscription();
  readonly CHECK_INTERVAL: number = 60000; // 1 minute
  readonly NOTIFICATION_CHECK_INTERVAL: number = 300000; // 5 minutes

  showNotificationBar = false;
  notificationMessage = '';
  notificationType = '';

  currentStockQuantity: number | null = null;
  currentStockUnit: string = '';
  isStockInsufficient: boolean = false;
  isWaterQuantityInsufficient: boolean = false; // Nouvelle propriété pour valider la quantité d’eau
  currentTimeString: string = '';
  timeErrors: { startTime: string | null; endTime: string | null } = { 
    startTime: null, 
    endTime: null 
  };

  constructor(
    private modalService: NgbModal,
    private router: Router,
    private alimentationService: AlimentationService,
    private stockService: StockService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.initializeData();
    this.setupIntervals();
    this.loadWaterQuantity(); // Charger la quantité d’eau au démarrage
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private initializeData() {
    this.loadFeedings();
    this.loadStocks();
    this.loadUnreadNotifications();
    this.updateCurrentTime();
  }

  private setupIntervals() {
    this.subscriptions.add(
      interval(60000).subscribe(() => this.updateCurrentTime())
    );
    this.subscriptions.add(
      interval(this.CHECK_INTERVAL).subscribe(() => this.checkExpiredPrograms())
    );
    this.subscriptions.add(
      interval(this.NOTIFICATION_CHECK_INTERVAL).subscribe(() => this.loadUnreadNotifications())
    );
    // Rafraîchir waterQuantity périodiquement
    this.subscriptions.add(
      interval(30000).subscribe(() => this.loadWaterQuantity())
    );
  }

  updateCurrentTime() {
    const now = new Date();
    this.currentTimeString = this.formatTimeString(now);
  }

  validateTimeInputs(): boolean {
    this.timeErrors = { startTime: null, endTime: null };
    const now = new Date();
    const currentTimeStr = this.formatTimeString(now);
  
    if (this.newAutomaticFeeding) {
      if (!this.newProgramStartTime) {
        this.timeErrors.startTime = "L'heure de début est requise";
      } else if (this.newProgramStartTime < currentTimeStr) {
        this.timeErrors.startTime = "L'heure de début doit être postérieure à l'heure actuelle";
      }
  
      if (!this.newProgramEndTime) {
        this.timeErrors.endTime = "L'heure de fin est requise";
      } else {
        // Convertir les heures en minutes depuis minuit pour une comparaison correcte
        const [startHour, startMinute] = this.newProgramStartTime.split(':').map(Number);
        const [endHour, endMinute] = this.newProgramEndTime.split(':').map(Number);
  
        const startMinutes = startHour * 60 + startMinute;
        let endMinutes = endHour * 60 + endMinute;
  
        // Si l'heure de fin est avant l'heure de début, considérer qu'elle appartient au jour suivant
        if (endMinutes <= startMinutes) {
          endMinutes += 24 * 60; // Ajouter 24 heures (1440 minutes) pour simuler le jour suivant
        }
  
        if (endMinutes <= startMinutes) {
          this.timeErrors.endTime = "L'heure de fin doit être postérieure à l'heure de début (y compris le jour suivant)";
        }
      }
    }
    return !this.timeErrors.startTime && !this.timeErrors.endTime;
  }

  // Charger la quantité d’eau via le capteur
  private loadWaterQuantity() {
    this.stockService.getWaterTankLevel().subscribe({
      next: (data) => {
        this.waterQuantity = data.waterQuantity;
        console.log('[FeedingScheduleComponent] Water quantity loaded:', this.waterQuantity);
        if (this.currentSection === 'Eau' && (this.editIndex === null || this.editIndex !== null)) {
          this.newQuantity = this.waterQuantity; // Initialiser newQuantity avec waterQuantity pour l’eau
          this.onQuantityChange(); // Mettre à jour isWaterQuantityInsufficient
        }
        this.isWaterQuantityInsufficient = this.newQuantity > this.waterQuantity;
      },
      error: (error) => {
        console.error('[FeedingScheduleComponent] Error loading water quantity:', error);
        this.showCustomNotification('Erreur lors du chargement de la quantité d\'eau', 'error');
        this.waterQuantity = 0; // Valeur par défaut en cas d’erreur
        this.isWaterQuantityInsufficient = this.newQuantity > this.waterQuantity;
      }
    });
  }

  onQuantityChange() {
    if (this.currentSection === 'Aliment') {
      if (!this.newStockId) {
        this.isStockInsufficient = false;
        this.currentStockQuantity = null;
        this.currentStockUnit = '';
        return;
      }
      const selectedStock = this.filteredNourritureStocks.find(stock => stock._id === this.newStockId);
      if (selectedStock) {
        this.isStockInsufficient = this.newQuantity > selectedStock.quantity;
        this.currentStockQuantity = selectedStock.quantity;
        this.currentStockUnit = selectedStock.unit;
      }
    } else if (this.currentSection === 'Eau') {
      // Pour l’eau, vérifier que newQuantity ne dépasse pas waterQuantity
      this.isWaterQuantityInsufficient = this.newQuantity > this.waterQuantity;
      this.currentStockQuantity = this.waterQuantity;
      this.currentStockUnit = 'L';
    }
  }

  loadUnreadNotifications() {
    this.subscriptions.add(
      this.alimentationService.getUnreadNotifications().subscribe({
        next: (notifications) => {
          this.notifications = notifications;
          if (notifications.length > 0) {
            this.showCustomNotification(notifications[0].message, notifications[0].type as 'success' | 'error' | 'info');
            this.alimentationService.markNotificationAsRead(notifications[0]._id).subscribe();
          }
        },
        error: (error) => console.error('Erreur notifications:', error)
      })
    );
  }

  checkExpiredPrograms() {
    const currentTimeString = this.formatTimeString(new Date());
    this.processExpiredPrograms(this.nourritures, 'Aliment', currentTimeString);
    this.processExpiredPrograms(this.eau, 'Eau', currentTimeString);
  }

  private processExpiredPrograms(programs: Feeding[], sectionName: string, currentTimeString: string) {
    programs
      .filter(p => p.programEndTime && p.programEndTime < currentTimeString && !p.isArchived)
      .forEach(program => {
        if (program._id) {
          this.subscriptions.add(
            this.alimentationService.archiveFeeding(program._id).subscribe({
              next: () => {
                program.isArchived = true;
                this.loadFeedings(); // Recharger pour exclure les archivés
                this.showCustomNotification(`Programme "${this.getStockType(program.stockId || '')}" archivé`, 'info');
              },
              error: (error) => console.error('Erreur archivage auto:', error)
            })
          );
        }
      });
  }

  checkUpcomingPrograms() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 3600000);
    const currentTimeString = this.formatTimeString(now);
    const oneHourLaterString = this.formatTimeString(oneHourLater);

    this.checkSectionPrograms(this.nourritures, 'Aliment', currentTimeString, oneHourLaterString);
    this.checkSectionPrograms(this.eau, 'Eau', currentTimeString, oneHourLaterString);
  }

  private checkSectionPrograms(programs: Feeding[], sectionName: string, current: string, oneHourLater: string) {
    programs.forEach(program => {
      if (program.programStartTime && 
          program.programStartTime > current && 
          program.programStartTime <= oneHourLater &&
          !program.reminderSent) {
        const timeRemaining = this.calculateTimeRemaining(program.programStartTime);
        this.showCustomNotification(
          `Programme ${sectionName === 'Aliment' ? this.getStockType(program.stockId || '') : 'Eau'} dans ${timeRemaining}`, 
          'info'
        );
        if (program._id) {
          this.alimentationService.updateFeeding(program._id, { reminderSent: true }).subscribe();
        }
      }
    });
  }

  formatTimeString(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  calculateTimeRemaining(targetTimeStr: string): string {
    const now = new Date();
    const [hours, minutes] = targetTimeStr.split(':').map(Number);
    const target = new Date(now.setHours(hours, minutes, 0, 0));
    if (target < now) target.setDate(target.getDate() + 1);
    
    const diffMs = target.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    return diffMin < 60 
      ? `${diffMin} minute${diffMin > 1 ? 's' : ''}`
      : `${Math.floor(diffMin / 60)}h${diffMin % 60}m`;
  }

  getStockUnit(stockId: string | undefined): string {
    if (this.currentSection === 'Eau') return 'L'; // Unité fixe pour l’eau
    return this.stocks.find(s => s._id === stockId)?.unit || '';
  }

  getStockType(stockId: string): string {
    return this.stocks.find(s => s._id === stockId)?.type || '';
  }

  isProgramExpiringSoon(program: Feeding): boolean {
    if (!program.programEndTime) return false;
    const endTime = new Date();
    const [hours, minutes] = program.programEndTime.split(':').map(Number);
    endTime.setHours(hours, minutes, 0, 0);
    const diffMin = Math.floor((endTime.getTime() - Date.now()) / 60000);
    return diffMin >= 0 && diffMin <= 30;
  }

  loadFeedings() {
    this.subscriptions.add(
      this.alimentationService.getAllFeedings().subscribe({
        next: (feedings) => {
          // Filtrer pour n'afficher que les programmes non archivés
          this.nourritures = feedings.filter(f => f.feedType.toLowerCase() !== 'eau' && !f.isArchived);
          this.eau = feedings.filter(f => f.feedType.toLowerCase() === 'eau' && !f.isArchived);
        },
        error: (error) => {
          console.error('Erreur chargement programmes:', error);
          this.showCustomNotification('Erreur chargement programmes', 'error');
        }
      })
    );
  }

  loadStocks() {
    this.subscriptions.add(
      this.stockService.getAllStocks().subscribe({
        next: (stocks) => {
          this.stocks = stocks;
          this.filteredNourritureStocks = stocks.filter(s => s.type.toLowerCase() !== 'eau');
          this.onStockChange();
        },
        error: (error) => {
          console.error('Erreur chargement stocks:', error);
          this.showCustomNotification('Erreur chargement stocks', 'error');
        }
      })
    );
  }

  showCustomNotification(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotificationBar = true;
    setTimeout(() => this.showNotificationBar = false, 3000);
  }

  openAddModal(section: string, content: TemplateRef<any>, index: number | null = null) {
    this.currentSection = section;
    this.editIndex = index;
    this.timeErrors = { startTime: null, endTime: null };
    this.updateCurrentTime();

    if (section === 'Aliment') {
      const programs = this.nourritures;
      if (index !== null) {
        const program = programs[index];
        Object.assign(this, {
          newQuantity: program.quantity,
          newNotes: program.notes || '',
          newAutomaticFeeding: program.automaticFeeding || false,
          newProgramStartTime: program.programStartTime || '',
          newProgramEndTime: program.programEndTime || '',
          newStockId: program.stockId || undefined // Peut être undefined
        });
        this.onStockChange();
      } else {
        this.resetForm();
      }
    } else if (section === 'Eau') {
      // Pour l’eau, charger waterQuantity et initialiser les autres champs
      this.loadWaterQuantity();
      if (index !== null) {
        const program = this.eau[index];
        Object.assign(this, {
          newQuantity: program.quantity || this.waterQuantity, // Utiliser la quantité du programme ou waterQuantity
          newNotes: program.notes || '',
          newAutomaticFeeding: program.automaticFeeding || false,
          newProgramStartTime: program.programStartTime || '',
          newProgramEndTime: program.programEndTime || ''
          // newStockId: undefined // Pas nécessaire pour l’eau
        });
      } else {
        this.resetFormForWater();
      }
    }

    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' })
      .result.finally(() => this.resetForm());
  }

  saveProgram() {
    if (this.newAutomaticFeeding && !this.validateTimeInputs()) {
      this.showCustomNotification("Corrigez les erreurs d'heure", 'error');
      return;
    }

    // Validation supplémentaire pour s'assurer que les heures sont au format HH:mm
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (this.newAutomaticFeeding && (
        !timeRegex.test(this.newProgramStartTime) || 
        !timeRegex.test(this.newProgramEndTime))) {
      this.showCustomNotification("Format d'heure invalide (HH:mm requis)", 'error');
      return;
    }

    const newProgram: Feeding = {
      quantity: this.currentSection === 'Eau' ? this.newQuantity : (this.newQuantity || 0), // Utiliser newQuantity pour l’eau
      feedType: this.currentSection === 'Eau' ? 'Eau' : this.stocks.find(s => s._id === this.newStockId)?.type || '',
      notes: this.newNotes,
      automaticFeeding: this.newAutomaticFeeding,
      programStartTime: this.newAutomaticFeeding ? this.newProgramStartTime : undefined,
      programEndTime: this.newAutomaticFeeding ? this.newProgramEndTime : undefined,
      stockId: this.currentSection === 'Eau' ? undefined : this.newStockId,
      reminderSent: false,
      isArchived: false
    };

    if (this.editIndex !== null) {
      const programs = this.currentSection === 'Aliment' ? this.nourritures : this.eau;
      const programId = programs[this.editIndex]._id;
      if (programId) {
        this.subscriptions.add(
          this.alimentationService.updateFeeding(programId, newProgram).subscribe({
            next: (updated) => {
              if (this.currentSection === 'Eau') {
                // Décrémenter virtuellement waterQuantity (simulé, car le capteur est physique)
                this.waterQuantity -= this.newQuantity;
                console.log('[FeedingScheduleComponent] Water quantity decremented:', this.waterQuantity);
                if (this.newAutomaticFeeding) {
                  this.alimentationService.updateWaterSupply(programId, {
                    startTime: this.newProgramStartTime,
                    endTime: this.newProgramEndTime,
                    enabled: true
                  }).subscribe({
                    next: () => {
                      this.showCustomNotification('Programme eau mis à jour', 'success');
                      // Vérifier si la quantité devient insuffisante (< 200L par défaut) et arrêter la pompe si nécessaire
                      if (this.waterQuantity < 200) { // Seuil minimum, ajustez selon vos besoins
                        this.alimentationService.stopWaterImmediate().subscribe({
                          next: () => this.showCustomNotification('Pompe arrêtée : niveau d’eau insuffisant', 'warning'),
                          error: (err) => this.showCustomNotification('Erreur lors de l’arrêt de la pompe', 'error')
                        });
                      }
                    },
                    error: () => this.showCustomNotification('Erreur mise à jour eau', 'error')
                  });
                } else {
                  this.showCustomNotification('Programme eau mis à jour', 'success');
                }
              } else {
                this.showCustomNotification('Programme mis à jour', 'success');
              }
              this.loadFeedings();
              this.modalService.dismissAll();
            },
            error: () => this.showCustomNotification('Erreur mise à jour', 'error')
          })
        );
      }
    } else {
      this.subscriptions.add(
        this.alimentationService.addFeeding(newProgram).subscribe({
          next: (added) => {
            if (this.currentSection === 'Eau' && added._id) {
              // Décrémenter virtuellement waterQuantity
              this.waterQuantity -= this.newQuantity;
              console.log('[FeedingScheduleComponent] Water quantity decremented after adding:', this.waterQuantity);
              if (this.newAutomaticFeeding) {
                this.alimentationService.updateWaterSupply(added._id, {
                  startTime: this.newProgramStartTime,
                  endTime: this.newProgramEndTime,
                  enabled: true
                }).subscribe({
                  next: () => {
                    this.showCustomNotification('Programme eau ajouté', 'success');
                    if (this.waterQuantity < 200) { // Seuil minimum, ajustez selon vos besoins
                      this.alimentationService.stopWaterImmediate().subscribe({
                        next: () => this.showCustomNotification('Pompe arrêtée : niveau d’eau insuffisant', 'warning'),
                        error: (err) => this.showCustomNotification('Erreur lors de l’arrêt de la pompe', 'error')
                      });
                    }
                  },
                  error: () => this.showCustomNotification('Erreur ajout eau', 'error')
                });
              } else {
                this.showCustomNotification('Programme eau ajouté', 'success');
              }
            } else {
              this.showCustomNotification('Programme ajouté', 'success');
            }
            this.loadFeedings();
            this.loadStocks();
            this.modalService.dismissAll();
          },
          error: () => this.showCustomNotification('Erreur ajout', 'error')
        })
      );
    }
  }

  sendProgramsToArduino() {
    console.log('Envoi des programmes à l\'Arduino');
    this.subscriptions.add(
      this.alimentationService.sendProgramsToArduino().subscribe({
        next: () => this.showCustomNotification('Programmes envoyés à l\'Arduino avec succès', 'success'),
        error: (error) => {
          console.error('Erreur lors de l\'envoi des programmes à l\'Arduino:', error);
          this.showCustomNotification('Erreur lors de l\'envoi des programmes à l\'Arduino', 'error');
        }
      })
    );
  }

  deleteProgram(section: string, index: number) {
    const programs = section === 'Aliment' ? this.nourritures : this.eau;
    const program = programs[index];

    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Confirmation', message: 'Archiver ce programme ?' } // Changement de texte
    }).afterClosed().subscribe(result => {
      if (result && program._id) {
        this.subscriptions.add(
          this.alimentationService.archiveFeeding(program._id).subscribe({ // Remplace deleteFeeding
            next: (archivedProgram) => {
              // Vérifier si le programme archivé est pour l'eau et est actuellement actif
              if (archivedProgram.feedType.toLowerCase() === 'eau' && this.isProgramActive(archivedProgram)) {
                this.alimentationService.stopWaterImmediate().subscribe({
                  next: () => console.log('Pompe arrêtée immédiatement après archivage'),
                  error: (err) => console.error('Erreur lors de l’arrêt immédiat:', err)
                });
              }
              // Vérifier si le programme archivé est pour la nourriture et est actuellement actif
              else if (archivedProgram.feedType.toLowerCase() !== 'eau' && this.isProgramActive(archivedProgram)) {
                this.alimentationService.stopFeedingImmediate().subscribe({
                  next: () => console.log('Servomoteur arrêté immédiatement après archivage'),
                  error: (err) => console.error('Erreur lors de l’arrêt immédiat:', err)
                });
              }
              this.showCustomNotification('Programme archivé', 'success');
              this.loadFeedings(); // Recharger pour exclure les archivés
            },
            error: () => this.showCustomNotification('Erreur archivage', 'error')
          })
        );
      }
    });
  }

  // Vérifie si un programme est actif à l’heure actuelle
  private isProgramActive(program: Feeding): boolean {
    if (!program.programStartTime || !program.programEndTime) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= program.programStartTime && currentTime <= program.programEndTime;
  }

  incrementStock(stockId: string, quantity: number) {
    this.subscriptions.add(
      this.alimentationService.updateStockQuantity(stockId, -quantity).subscribe({
        next: () => this.loadStocks(),
        error: () => this.showCustomNotification('Erreur mise à jour stock', 'error')
      })
    );
  }

  editProgram(section: string, index: number) {
    const modal = section === 'Aliment' ? this.addFoodModal : this.addWaterModal;
    this.openAddModal(section, modal, index);
  }

  navigateToAlimentation() {
    this.router.navigate(['/stocks']);
  }

  resetForm() {
    const now = new Date();
    this.newProgramStartTime = this.formatTimeString(new Date(now.getTime() + 300000));
    this.newProgramEndTime = this.formatTimeString(new Date(now.getTime() + 2100000));
    Object.assign(this, {
      newQuantity: 0,
      newNotes: '',
      newAutomaticFeeding: true,
      newStockId: undefined, // Peut être undefined
      currentStockQuantity: null,
      currentStockUnit: '',
      isStockInsufficient: false,
      editIndex: null
    });
  }

  resetFormForWater() {
    const now = new Date();
    this.newProgramStartTime = this.formatTimeString(new Date(now.getTime() + 300000));
    this.newProgramEndTime = this.formatTimeString(new Date(now.getTime() + 2100000));
    Object.assign(this, {
      newQuantity: this.waterQuantity, // Initialiser avec waterQuantity, mais modifiable
      newNotes: '',
      newAutomaticFeeding: true,
      // newStockId: undefined, // Supprimé, car non nécessaire
      currentStockQuantity: this.waterQuantity,
      currentStockUnit: 'L',
      isWaterQuantityInsufficient: false,
      editIndex: null
    });
  }

  onAutomaticFeedingChange() {
    if (!this.newAutomaticFeeding) {
      this.newProgramStartTime = '';
      this.newProgramEndTime = '';
      this.timeErrors = { startTime: null, endTime: null };
    } else {
      if (this.currentSection === 'Eau') {
        this.resetFormForWater();
      } else {
        this.resetForm();
      }
    }
  }

  onStockChange() {
    if (this.currentSection === 'Aliment') {
      if (!this.newStockId) {
        this.isStockInsufficient = false;
        this.currentStockQuantity = null;
        this.currentStockUnit = '';
        return;
      }
      const stock = this.filteredNourritureStocks.find(s => s._id === this.newStockId);
      Object.assign(this, {
        currentStockQuantity: stock?.quantity || null,
        currentStockUnit: stock?.unit || '',
        isStockInsufficient: stock ? this.newQuantity > stock.quantity : false
      });
    } else if (this.currentSection === 'Eau') {
      // Pour l’eau, utiliser waterQuantity
      Object.assign(this, {
        currentStockQuantity: this.waterQuantity,
        currentStockUnit: 'L',
        isWaterQuantityInsufficient: this.newQuantity > this.waterQuantity
      });
    }
  }
}