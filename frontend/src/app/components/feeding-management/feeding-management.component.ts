import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlimentationService, Feeding, FeedingStats, StockAlert, Notification, ConsumptionData, DistributionData } from '../../services/alimentation.service';
import { FeedingType } from '../../models/alimentation';
import { HeaderComponent } from '../header/header.component';
import { filter, Subscription, forkJoin } from 'rxjs';
import { StockService } from '../../services/stock.service';
import { Stock } from '../../models/stock.model';

interface FeedingProgram {
  quantity: number;
  programStartTime: string;
  programEndTime: string;
  feedType: string;
  stockId?: string;
  automaticFeeding: boolean;
  notes?: string;
  _id?: string;
}

@Component({
  selector: 'app-feeding-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './feeding-management.component.html',
  styleUrls: ['./feeding-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedingManagementComponent implements OnInit, OnDestroy {
  feedingPrograms: FeedingProgram[] = [];
  feedingForm!: FormGroup;
  waterSupplyForm!: FormGroup;
  feedingHistory: Feeding[] = [];
  feedingStats: FeedingStats[] = [];
  stockAlerts: StockAlert[] = [];
  availableStocks: Stock[] = [];
  unreadNotifications: Notification[] = [];
  startDate: string;
  endDate: string;
  isFeedingSystemActive: boolean = false;
  lastFeedingTime: string = '';
  nextFeedingTime: string = '';
  foodTankLevel: number = 0;
  waterTankLevel: number = 0;
  foodTotal: number = 0;
  waterTotal: number = 0;
  foodType: string = 'Nourriture';
  hasFoodPrograms: boolean = false;

  dailyFoodConsumption: number = 0;
  dailyWaterConsumption: number = 0;
  dailyDistributions: number = 0;
  feedTypes: FeedingType[] = [];
  selectedProgram: FeedingProgram | null = null;
  bulkFeedingMode: boolean = false;
  bulkFeedings: Feeding[] = [];

  programGauges: Map<string, number> = new Map();

  private initialFoodQuantity: number = 0;
  private initialWaterQuantity: number = 0;
  
  private subscriptions: Subscription = new Subscription();
  private updateInterval: any;
  private feedingInterval: any;
  private waterInterval: any;
  private notificationsInterval: any;

  archivedFeedings: Feeding[] = [];

  lastWateringTime: string = '--:--';
  nextWateringTime: string = '--:--';

  isAuthPage: boolean = false;
  isWaterSystemActive: boolean = false;
  waterPrograms: FeedingProgram[] = [];

  showNotificationBar = false;
  notificationMessage = '';
  notificationType = '';

  constructor(
    private fb: FormBuilder,
    private alimentationService: AlimentationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private stockService: StockService
  ) {
    const routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isAuthPage = event.url === '/login';
      });
    
    this.subscriptions.add(routerSubscription);
      
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    this.startDate = weekAgo.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.initForms();
    this.loadFeedingHistory();
    this.loadFeedingStats();
    this.loadStockAlerts();
    this.loadFeedingPrograms();
    this.loadArchivedFeedings();
    this.loadAvailableStocks();
    this.loadUnreadNotifications();
    this.initDailyStats();

    this.updateInterval = setInterval(() => {
      this.checkCompletedPrograms();
    }, 60000);

    this.notificationsInterval = setInterval(() => {
      this.loadUnreadNotifications();
    }, 300000);
  }

  ngOnDestroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.feedingInterval) clearInterval(this.feedingInterval);
    if (this.waterInterval) clearInterval(this.waterInterval);
    if (this.notificationsInterval) clearInterval(this.notificationsInterval);
    
    this.subscriptions.unsubscribe();
  }

  private initForms() {
    this.feedingForm = this.fb.group({
      feedType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0)]],
      stockId: ['', Validators.required],
      notes: [''],
      automaticFeeding: [false],
      programStartTime: [''],
      programEndTime: ['']
    });

    this.waterSupplyForm = this.fb.group({
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      enabled: [false]
    });
  }

  loadFeedingHistory() {
    const params = { startDate: new Date(this.startDate), endDate: new Date(this.endDate), limit: 50 };
    this.subscriptions.add(
      this.alimentationService.getFeedingHistory(params).subscribe({
        next: (history) => {
          this.feedingHistory = history;
          this.updateLastFeedingTime();
          this.calculateDailyConsumption();
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur lors du chargement de l\'historique:', error)
      })
    );
  }

  loadFeedingStats() {
    const params = { startDate: new Date(this.startDate), endDate: new Date(this.endDate) };
    this.subscriptions.add(
      this.alimentationService.getFeedingStats(params).subscribe({
        next: (stats) => {
          this.feedingStats = stats;
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur lors du chargement des statistiques:', error)
      })
    );
  }

  loadStockAlerts() {
    this.subscriptions.add(
      this.alimentationService.getAlertLowStock().subscribe({
        next: (alerts) => {
          this.stockAlerts = alerts;
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur lors du chargement des alertes de stock:', error)
      })
    );
  }

  loadFeedingPrograms() {
    this.subscriptions.add(
      this.alimentationService.getAllFeedings().subscribe({
        next: (feedings: Feeding[]) => {
          this.feedingPrograms = feedings
            .filter(feeding => feeding.programStartTime && feeding.programEndTime && !feeding.isArchived) // Exclure les archivés
            .map(feeding => ({
              quantity: feeding.quantity,
              programStartTime: feeding.programStartTime!,
              programEndTime: feeding.programEndTime!,
              feedType: feeding.feedType,
              stockId: feeding.stockId,
              automaticFeeding: feeding.automaticFeeding || false,
              notes: feeding.notes,
              _id: feeding._id
            }));

          this.waterPrograms = this.feedingPrograms.filter(p => p.feedType === 'Eau');
          this.hasFoodPrograms = this.feedingPrograms.some(p => p.feedType !== 'Eau');
          const firstFoodProgram = this.feedingPrograms.find(p => p.feedType !== 'Eau');
          this.foodType = firstFoodProgram ? firstFoodProgram.feedType : 'Nourriture';

          this.initialFoodQuantity = this.feedingPrograms
            .filter(program => program.feedType !== 'Eau')
            .reduce((total, program) => total + program.quantity, 0);

          this.initialWaterQuantity = this.feedingPrograms
            .filter(program => program.feedType === 'Eau')
            .reduce((total, program) => total + program.quantity, 0);

          this.updateNextFeedingTime();
          this.updateTankLevels();
          this.updateConsumptionStats();
          this.checkCompletedPrograms();
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur lors du chargement des programmes:', error)
      })
    );
  }


  loadArchivedFeedings() {
    this.subscriptions.add(
      this.alimentationService.getArchivedFeedings().subscribe({
        next: (feedings) => {
          this.archivedFeedings = feedings;
          this.updateConsumptionStats();
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur lors du chargement des programmes archivés:', error)
      })
    );
  }



  loadAvailableStocks() {
    this.subscriptions.add(
      this.stockService.getAllStocks().subscribe({
        next: (stocks) => {
          this.availableStocks = stocks;
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur lors du chargement des stocks:', error)
      })
    );
  }

  loadUnreadNotifications() {
    this.subscriptions.add(
      this.alimentationService.getUnreadNotifications().subscribe({
        next: (notifications) => {
          this.unreadNotifications = notifications;
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur lors du chargement des notifications:', error)
      })
    );
  }

  // Commandes manuelles pour l'alimentation
  startFeedingManually() {
    console.log('Tentative de démarrage manuel de l\'alimentation');
    this.subscriptions.add(
      this.alimentationService.sendManualCommandToArduino('START_FEEDING').subscribe({
        next: (response) => {
          console.log('Réponse START_FEEDING:', response);
          this.isFeedingSystemActive = true;
          this.lastFeedingTime = this.formatTimeString(new Date());
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur START_FEEDING:', error)
      })
    );
  }

  stopFeedingManually() {
    this.subscriptions.add(
      this.alimentationService.sendManualCommandToArduino('STOP_FEEDING').subscribe({
        next: () => {
          this.isFeedingSystemActive = false;
          this.cdr.markForCheck();
          console.log('Commande manuelle STOP_FEEDING envoyée');
        },
        error: (error) => console.error('Erreur lors de l\'envoi de STOP_FEEDING:', error)
      })
    );
  }

  // Commandes manuelles pour l'eau
  startWaterManually() {
    console.log('Tentative de démarrage manuel de l\'eau');
    this.subscriptions.add(
      this.alimentationService.sendManualCommandToArduino('START_WATER').subscribe({
        next: (response) => {
          console.log('Réponse START_WATER:', response);
          this.isWaterSystemActive = true;
          this.lastWateringTime = this.formatTimeString(new Date());
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Erreur START_WATER:', error)
      })
    );
  }

  stopWaterManually() {
    this.subscriptions.add(
      this.alimentationService.sendManualCommandToArduino('STOP_WATER').subscribe({
        next: () => {
          this.isWaterSystemActive = false;
          this.cdr.markForCheck();
          console.log('Commande manuelle STOP_WATER envoyée');
        },
        error: (error) => console.error('Erreur lors de l\'envoi de STOP_WATER:', error)
      })
    );
  }

  toggleFeedingSystem() {
    if (!this.feedingPrograms || this.feedingPrograms.length === 0) return;
    this.isFeedingSystemActive = !this.isFeedingSystemActive;
    if (this.isFeedingSystemActive) {
      const activeProgram = this.getActiveProgram();
      if (!activeProgram) console.log('Aucun programme actif, attente prochaine période');
      this.startFeedingSystem();
    } else {
      this.stopFeedingSystem();
    }
  }

  startFeedingSystem() {
    this.feedingInterval = setInterval(() => {
      const activeProgram = this.getActiveProgram();
      
      if (!activeProgram || !activeProgram._id) return;
      
      if (!this.isWithinTimeRange(activeProgram)) return;
      
      const decrementAmount = 0.5;
      const currentQuantity = typeof activeProgram.quantity === 'number' ? 
        activeProgram.quantity : parseFloat(activeProgram.quantity as any) || 0;
      const newQuantity = Math.max(0, currentQuantity - decrementAmount);
      
      this.alimentationService.decrementFeedingQuantity(activeProgram._id, decrementAmount)
        .subscribe({
          next: (updatedFeeding) => {
            activeProgram.quantity = typeof updatedFeeding.quantity === 'number' ? 
              updatedFeeding.quantity : parseFloat(updatedFeeding.quantity as any) || 0;
    
            if (activeProgram.stockId) {
              this.alimentationService.updateStockQuantity(activeProgram.stockId, decrementAmount)
                .subscribe({
                  next: () => {
                    this.updateTankLevels();
                    this.dailyFoodConsumption += decrementAmount;
                    this.dailyDistributions++;
    
                    if (activeProgram.quantity <= 0) {
                      this.updateProgram(activeProgram);
                    }
                    
                    this.cdr.detectChanges();
                  },
                  error: (error) => console.error('Erreur lors de la décrémentation du stock:', error)
                });
            } else {
              this.updateTankLevels();
              this.cdr.detectChanges();
            }
          },
          error: (error) => console.error('Erreur lors de la décrémentation:', error)
        });
    }, 2000);
  }

  stopFeedingSystem() {
    if (this.feedingInterval) {
      clearInterval(this.feedingInterval);
      this.feedingInterval = null;
    }
    this.isFeedingSystemActive = false;
    this.cdr.markForCheck();
  }

  toggleWaterSystem() {
    if (!this.feedingPrograms || this.feedingPrograms.length === 0) return;
    this.isWaterSystemActive = !this.isWaterSystemActive;
    if (this.isWaterSystemActive) {
      const activeWaterProgram = this.getActiveWaterProgram();
      if (!activeWaterProgram) console.log('Aucun programme d\'eau actif, attente prochaine période');
      this.startWaterSystem();
    } else {
      this.stopWaterSystem();
    }
  }

  startWaterSystem() {
    console.log('[startWaterSystem] Début de la vérification du programme d\'eau actif');
    const activeWaterProgram = this.getActiveWaterProgram();
    console.log('[startWaterSystem] Programme d\'eau actif:', activeWaterProgram);
  
    if (activeWaterProgram && !this.isWaterSystemActive) {
      console.log('[startWaterSystem] Programme actif détecté, tentative de démarrage automatique');
      this.subscriptions.add(
        this.alimentationService.sendManualCommandToArduino('START_WATER').subscribe({
          next: () => {
            console.log('[startWaterSystem] Commande START_WATER envoyée avec succès');
            this.isWaterSystemActive = true;
            this.lastWateringTime = this.formatTimeString(new Date());
            this.showCustomNotification('Eau démarrée automatiquement', 'success');
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('[startWaterSystem] Erreur lors de l\'envoi de START_WATER:', error);
            this.showCustomNotification('Erreur démarrage automatique de l\'eau', 'error');
          }
        })
      );
    } else {
      console.log('[startWaterSystem] Aucun programme actif ou système déjà actif:', {
        activeWaterProgram: !!activeWaterProgram,
        isWaterSystemActive: this.isWaterSystemActive
      });
    }
  
    this.waterInterval = setInterval(() => {
      console.log('[startWaterSystem] Intervalle de vérification lancé');
      const activeWaterProgram = this.getActiveWaterProgram();
      console.log('[startWaterSystem] Programme d\'eau actif dans l\'intervalle:', activeWaterProgram);
  
      if (!activeWaterProgram || !activeWaterProgram._id) {
        console.log('[startWaterSystem] Aucun programme actif ou ID manquant, arrêt du système');
        this.stopWaterSystem();
        return;
      }
  
      const currentQuantity = typeof activeWaterProgram.quantity === 'number' ? 
        activeWaterProgram.quantity : parseFloat(activeWaterProgram.quantity as any) || 0;
      console.log('[startWaterSystem] Quantité actuelle:', currentQuantity);
  
      if (currentQuantity > 0) {
        const decrementAmount = 0.5;
        const newQuantity = Math.max(0, currentQuantity - decrementAmount);
        console.log('[startWaterSystem] Décrémentation - Quantité avant:', currentQuantity, 'Quantité après:', newQuantity);
  
        this.alimentationService.decrementFeedingQuantity(activeWaterProgram._id, decrementAmount)
          .subscribe({
            next: (updatedFeeding) => {
              console.log('[startWaterSystem] Quantité décrémentée avec succès:', updatedFeeding);
              activeWaterProgram.quantity = typeof updatedFeeding.quantity === 'number' ? 
                updatedFeeding.quantity : parseFloat(updatedFeeding.quantity as any) || 0;
  
              if (activeWaterProgram.stockId) {
                this.alimentationService.updateStockQuantity(activeWaterProgram.stockId, decrementAmount)
                  .subscribe({
                    next: () => {
                      console.log('[startWaterSystem] Stock mis à jour avec succès');
                      this.dailyWaterConsumption += decrementAmount;
                      this.dailyDistributions++;
                      this.updateTankLevels();
                      this.cdr.detectChanges();
  
                      if (newQuantity <= 0) {
                        console.log('[startWaterSystem] Quantité épuisée, arrêt du système');
                        this.stopWaterSystem();
                      }
                    },
                    error: (error) => {
                      console.error('[startWaterSystem] Erreur lors de la mise à jour du stock d\'eau:', error);
                      this.stopWaterSystem();
                    }
                  });
              } else {
                console.log('[startWaterSystem] Pas de stockId, mise à jour des jauges uniquement');
                this.updateTankLevels();
                this.cdr.detectChanges();
              }
            },
            error: (error) => {
              console.error('[startWaterSystem] Erreur lors de la décrémentation de l\'eau:', error);
              this.stopWaterSystem();
            }
          });
      } else {
        console.log('[startWaterSystem] Quantité <= 0, arrêt du système');
        this.stopWaterSystem();
      }
    }, 3000);
  }

  showCustomNotification(message: string, type: 'success' | 'error' | 'info') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotificationBar = true;
    setTimeout(() => this.showNotificationBar = false, 3000);
  }

  stopWaterSystem() {
    if (this.waterInterval) {
      clearInterval(this.waterInterval);
      this.waterInterval = null;
    }
    this.isWaterSystemActive = false;
    this.cdr.markForCheck();
  }

  updateProgram(program: FeedingProgram) {
    if (program._id) {
      this.subscriptions.add(
        this.alimentationService.updateFeeding(program._id, program).subscribe({
          next: () => {
            this.reloadData();
            this.selectedProgram = null;
            this.updateTankLevels();
            this.updateConsumptionStats(); // Mettre à jour après modification
            this.cdr.markForCheck();
          },
          error: (error) => console.error('Erreur lors de la mise à jour du programme:', error)
        })
      );
    }
  }

  updateWaterProgram(program: FeedingProgram) {
    if (program._id) {
      const updatedWaterSupply = {
        startTime: program.programStartTime,
        endTime: program.programEndTime,
        enabled: program.automaticFeeding
      };

      this.subscriptions.add(
        this.alimentationService.updateWaterSupply(program._id, updatedWaterSupply).subscribe({
          next: () => {
            this.loadFeedingPrograms();
            this.updateTankLevels();
            this.updateConsumptionStats(); // Mettre à jour après modification
            this.cdr.markForCheck();
          },
          error: (error) => console.error('Erreur lors de la mise à jour du programme d\'eau:', error)
        })
      );
    }
  }

  deleteProgram(index: number) {
    const program = this.feedingPrograms[index];
    if (program._id && confirm('Êtes-vous sûr de vouloir archiver ce programme ?')) { // Changement de texte
      this.subscriptions.add(
        this.alimentationService.archiveFeeding(program._id).subscribe({ // Remplace deleteFeeding
          next: () => {
            this.reloadData();
            this.updateConsumptionStats(); // Mettre à jour après archivage
            this.cdr.markForCheck();
          },
          error: (error) => console.error('Erreur lors de l’archivage du programme:', error)
        })
      );
    }
  }

  deleteWaterProgram(index: number) {
    const program = this.waterPrograms[index];
    if (program && confirm('Voulez-vous vraiment archiver ce programme d\'arrosage ?')) { // Changement de texte
      if (program._id) {
        this.subscriptions.add(
          this.alimentationService.archiveFeeding(program._id).subscribe({ // Remplace deleteFeeding
            next: () => {
              this.waterPrograms.splice(index, 1);
              this.loadFeedingPrograms(); // Recharger pour exclure les archivés
              this.updateConsumptionStats(); // Mettre à jour après archivage
              this.cdr.markForCheck();
            },
            error: (error) => console.error('Erreur lors de l’archivage du programme d\'eau:', error)
          })
        );
      } else {
        this.waterPrograms.splice(index, 1);
        this.updateConsumptionStats();
        this.cdr.markForCheck();
      }
    }
  }

  initDailyStats() {
    const now = new Date();
    const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msToMidnight = night.getTime() - now.getTime();

    this.resetDailyStats();

    setTimeout(() => {
      this.resetDailyStats();
      setInterval(() => this.resetDailyStats(), 24 * 60 * 60 * 1000);
    }, msToMidnight);
  }

  resetDailyStats() {
    this.dailyFoodConsumption = 0;
    this.dailyWaterConsumption = 0;
    this.dailyDistributions = 0;
    this.cdr.markForCheck();
  }

  canActivateSystems(): boolean {
    return this.feedingPrograms && this.feedingPrograms.length > 0;
  }

  calculateAutonomy(stock: number | undefined): number {
    if (stock === undefined) return 0;
    const averageDailyConsumption = this.calculateAverageDailyConsumption();
    return averageDailyConsumption > 0 ? Math.floor(stock / averageDailyConsumption) : 0;
  }

  calculateAverageDailyConsumption(): number {
    if (this.feedingStats.length === 0) return 0;
    const totalQuantity = this.feedingStats.reduce((sum, stat) => sum + stat.totalQuantity, 0);
    const daysInRange = this.getDaysInRange();
    return daysInRange > 0 ? totalQuantity / daysInRange : 0;
  }

  getDaysInRange(): number {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateDailyConsumption() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayFeedings = this.feedingHistory.filter(feeding => {
      const feedingDate = new Date(feeding.createdAt!);
      feedingDate.setHours(0, 0, 0, 0);
      return feedingDate.getTime() === today.getTime();
    });
    
    this.dailyFoodConsumption = todayFeedings.reduce((sum, feeding) => {
      if (feeding.feedType !== 'Eau') return sum + feeding.quantity;
      return sum;
    }, 0);
    
    this.dailyWaterConsumption = todayFeedings.reduce((sum, feeding) => {
      if (feeding.feedType === 'Eau') return sum + feeding.quantity;
      return sum;
    }, 0);
    
    this.dailyDistributions = todayFeedings.length;
    
    this.cdr.markForCheck();
  }

  updateLastFeedingTime() {
    if (this.feedingHistory.length > 0) {
      const lastFeeding = this.feedingHistory[0];
      this.lastFeedingTime = new Date(lastFeeding.createdAt!)
        .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      this.lastFeedingTime = '--:--';
    }
    this.cdr.markForCheck();
  }

  updateNextFeedingTime() {
    const now = new Date();
    const nextProgram = this.feedingPrograms.find(program => {
      const [hours, minutes] = program.programStartTime.split(':');
      const programTime = new Date();
      programTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return programTime > now;
    });
    this.nextFeedingTime = nextProgram ? nextProgram.programStartTime : '--:--';
    this.cdr.markForCheck();
  }

  private updateTankLevels() {
    if (!this.feedingPrograms || this.feedingPrograms.length === 0) {
      this.foodTankLevel = 0;
      this.waterTankLevel = 0;
      this.foodTotal = 0;
      this.waterTotal = 0;
      this.programGauges.clear();
      this.cdr.markForCheck();
      return;
    }
  
    const maxFoodCapacity = 100;
    const maxWaterCapacity = 100;
  
    this.foodTotal = this.feedingPrograms
      .filter(program => program.feedType !== 'Eau')
      .reduce((acc, program) => acc + (typeof program.quantity === 'number' ? program.quantity : parseFloat(program.quantity as any) || 0), 0);

    this.waterTotal = this.feedingPrograms
      .filter(program => program.feedType === 'Eau')
      .reduce((acc, program) => acc + (typeof program.quantity === 'number' ? program.quantity : parseFloat(program.quantity as any) || 0), 0);
  
    this.foodTankLevel = Math.min(100, Math.max(0, (this.foodTotal / maxFoodCapacity) * 100));
    this.waterTankLevel = Math.min(100, Math.max(0, (this.waterTotal / maxWaterCapacity) * 100));

    console.log('Total nourriture :', this.foodTotal, '-> Jauge nourriture :', this.foodTankLevel);
    console.log('Total eau :', this.waterTotal, '-> Jauge eau :', this.waterTankLevel);

    this.programGauges.clear();
    this.feedingPrograms.forEach(program => {
      if (!program._id) return;
      const initialQuantity = program.feedType === 'Eau' ? 
        this.initialWaterQuantity : this.initialFoodQuantity;
      if (initialQuantity > 0) {
        const currentQuantity = typeof program.quantity === 'number' ? 
          program.quantity : parseFloat(program.quantity as any) || 0;
        const percentRemaining = Math.min(100, Math.max(0, (currentQuantity / initialQuantity) * 100));
        this.programGauges.set(program._id, percentRemaining);
      } else {
        this.programGauges.set(program._id, 0);
      }
    });
  
    this.cdr.markForCheck();
  }

  private updateConsumptionStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
    const params = { startDate: today, endDate: tomorrow };
  
    forkJoin([
      this.alimentationService.getConsumedFood(params),
      this.alimentationService.getConsumedWater(params),
      this.alimentationService.getDistributionQuantity(params)
    ]).subscribe({
      next: ([foodData, waterData, distributionData]: [ConsumptionData, ConsumptionData, DistributionData[] | DistributionData]) => {
        this.dailyFoodConsumption = foodData.totalConsumed;
        this.dailyWaterConsumption = waterData.totalConsumed;
  
        // Inclure les archivés terminés aujourd'hui avec une vérification défensive
        const archivedToday = this.archivedFeedings.filter(feeding => {
          // Utilisez une propriété existante comme createdAt si updatedAt n’est pas garanti
          const dateToCheck = (feeding as any).updatedAt || feeding.createdAt || null;
          const updatedAt = dateToCheck ? new Date(dateToCheck) : null;
          return updatedAt && updatedAt >= today && updatedAt < tomorrow;
        });
  
        archivedToday.forEach(feeding => {
          if (feeding.feedType === 'Eau') {
            this.dailyWaterConsumption += feeding.quantity;
          } else {
            this.dailyFoodConsumption += feeding.quantity;
          }
        });
  
        if (Array.isArray(distributionData)) {
          this.dailyDistributions = distributionData.reduce((sum, data) => sum + (data.totalDistributed > 0 ? 1 : 0), 0);
        } else {
          this.dailyDistributions = distributionData.totalDistributed > 0 ? 1 : 0;
        }
        this.dailyDistributions += archivedToday.length;
  
        this.cdr.markForCheck();
      },
      error: (error) => console.error('Erreur lors de la mise à jour des stats:', error)
    });
  }


  private checkCompletedPrograms() {
    const now = new Date();
    const currentTimeString = this.formatTimeString(now);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    this.feedingPrograms.forEach(program => {
      if (program.programEndTime && program.programEndTime < currentTimeString && program._id) {
        const programDate = new Date();
        const [endHours, endMinutes] = program.programEndTime.split(':').map(Number);
        programDate.setHours(endHours, endMinutes, 0, 0);

        if (programDate.getFullYear() === today.getFullYear() &&
            programDate.getMonth() === today.getMonth() &&
            programDate.getDate() === today.getDate()) {
          // Ne pas incrémenter ici, car updateConsumptionStats gère les archivés
        }

        this.alimentationService.archiveFeeding(program._id).subscribe({ // Remplace deleteFeeding
          next: () => {
            console.log(`Programme ${program._id} terminé et archivé`);
            this.loadFeedingPrograms(); // Recharger pour exclure les archivés
            this.loadArchivedFeedings(); // Recharger les archivés
            this.updateConsumptionStats(); // Mettre à jour avec les archivés
          },
          error: (error) => console.error('Erreur lors de l’archivage du programme terminé:', error)
        });
      }
    });

    this.cdr.markForCheck();
  }

  private formatTimeString(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  private getActiveProgram(): FeedingProgram | undefined {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    return this.feedingPrograms.find(program => {
      if (!program.programStartTime || !program.programEndTime) return false;
      const [startHours, startMinutes] = program.programStartTime.split(':').map(Number);
      const [endHours, endMinutes] = program.programEndTime.split(':').map(Number);
      const startTime = startHours * 60 + startMinutes;
      const endTime = endHours * 60 + endMinutes;
      const quantity = typeof program.quantity === 'number' ? program.quantity : parseFloat(program.quantity as any) || 0;
      return program.feedType !== 'Eau' && quantity > 0 && currentTime >= startTime && currentTime <= endTime;
    });
  }

  private getActiveWaterProgram(): FeedingProgram | undefined {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    return this.feedingPrograms.find(program => {
      if (!program.programStartTime || !program.programEndTime) return false;
      const [startHours, startMinutes] = program.programStartTime.split(':').map(Number);
      const [endHours, endMinutes] = program.programEndTime.split(':').map(Number);
      const startTime = startHours * 60 + startMinutes;
      const endTime = endHours * 60 + endMinutes;
      const quantity = typeof program.quantity === 'number' ? program.quantity : parseFloat(program.quantity as any) || 0;
      return program.feedType === 'Eau' && quantity > 0 && currentTime >= startTime && currentTime <= endTime;
    });
  }

  private isWithinTimeRange(program: FeedingProgram): boolean {
    if (!program.programStartTime || !program.programEndTime) return false;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHours, startMinutes] = program.programStartTime.split(':').map(Number);
    const [endHours, endMinutes] = program.programEndTime.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;
    const endTime = endHours * 60 + endMinutes;
    return currentTime >= startTime && currentTime <= endTime;
  }

  trackByFn(index: number, item: any): any {
    return item._id || index;
  }

  trackByStockFn(index: number, item: StockAlert): string {
    return item._id || index.toString();
  }

  trackByNotificationFn(index: number, item: Notification): string {
    return item._id || index.toString();
  }

  private reloadData() {
    this.loadFeedingHistory();
    this.loadFeedingStats();
    this.loadStockAlerts();
    this.loadFeedingPrograms();
    this.loadAvailableStocks();
  }
}