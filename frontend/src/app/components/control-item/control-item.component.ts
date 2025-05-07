import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClock, faSync, faExclamationTriangle, faEdit, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { StockService } from '../../services/stock.service';
import { Subscription, interval } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EnvironmentalService, LightSchedule } from '../../services/environmental.service';
import { LightScheduleModalComponent } from '../light-schedule-modal/light-schedule-modal.component';

enum ControlStatus {
  IDLE = 'Disponible',         // Quand le stock est disponible mais inactif
  ACTIVE = 'Actif',           // Quand le contrôle est actif
  ERROR = 'Erreur',           // Erreur générale
  LOW_STOCK = 'Stock bas',    // Stock faible mais non vide
  NO_STOCK = 'Indisponible',  // Stock vide
  LOADING = 'Chargement...',  // Pendant le chargement
  NOT_FOUND = 'Introuvable'   // Stock non trouvé
}


@Component({
  selector: 'app-control-item',
  templateUrl: './control-item.component.html',
  styleUrls: ['./control-item.component.css'],
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, LightScheduleModalComponent]
})
export class ControlItemComponent implements OnInit, OnChanges, OnDestroy {
  @Input() title: string = '';
  @Input() type: string = '';
  @Input() value: number = 0; // Pour compatibilité avec les autres types, mais pas utilisé pour l’eau
  @Input() unit: string = '';
  @Input() status: string = '';
  @Input() isActive: boolean = false;
  @Input() stockId: string | undefined = undefined; // Permet undefined
  @Input() requiresStock: boolean = false;
  @Input() isToggleable: boolean = true;
  @Input() refreshInterval: number = 30000;
  private WATER_REFRESH_INTERVAL = 1000;

  currentValue: number = 0;
  initialValue: number = 0;
  isWaterSensorConnected: boolean = false; // État du capteur d’eau
  private decrementInterval: any;
  private refreshSubscription: Subscription | null = null;
  private subscriptions: Subscription[] = [];

  // Icônes
  faClock = faClock;
  faSync = faSync;
  faExclamationTriangle = faExclamationTriangle;
  faEdit = faEdit;
  faPlus = faPlus;
  faTrash = faTrash;

  lightSchedule: LightSchedule | null = null;

  // États
  isLoading: boolean = false;
  isRefreshing: boolean = false;
  errorMessage: string = '';
  lastRefresh: Date | null = null;
  ControlStatus = ControlStatus;
  cdr: any;

  constructor(
    private stockService: StockService,
    private environmentalService: EnvironmentalService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.updateCurrentValue();
    if (!this.stockId && this.requiresStock && this.type !== 'water') {
      this.loadStockIdByType();
    } else if (this.stockId && this.requiresStock && this.type !== 'water') {
      this.refreshStockData();
      this.setupPeriodicRefresh();
    }

    if (this.type === 'water') {
      this.loadWaterQuantity(); // Charger la quantité d’eau via le capteur
      this.setupPeriodicRefresh(); // Ajouter le rafraîchissement périodique pour l’eau
    }

    if (this.type === 'light') {
      this.loadLightSchedule();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && this.type !== 'water') {
      this.updateCurrentValue();
    }
    if (changes['stockId'] && !changes['stockId'].firstChange && this.type !== 'water') {
      this.refreshStockData();
      this.setupPeriodicRefresh();
    }
  }

  ngOnDestroy() {
    this.stopDecrementInterval();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // Charger le programme de lumière
  loadLightSchedule() {
    this.environmentalService.getLightSchedule().subscribe(
      (schedule) => {
        this.lightSchedule = schedule;
      },
      (error) => {
        console.error('Erreur lors du chargement du programme de lumière:', error);
        this.errorMessage = 'Erreur lors du chargement de la programmation';
      }
    );
  }

  // Supprimer le programme de lumière
  deleteLightSchedule() {
    if (!this.lightSchedule || !this.lightSchedule._id) {
      this.showNotification('Aucune programmation à supprimer ou ID manquant', 'error');
      return;
    }
  
    this.environmentalService.deleteLightSchedule(this.lightSchedule._id).subscribe(
      () => {
        this.lightSchedule = null;
        this.showNotification('Programmation de l\'éclairage supprimée', 'success');
      },
      (error) => {
        console.error('Erreur lors de la suppression de la programmation:', error);
        this.showNotification('Erreur lors de la suppression', 'error');
      }
    );
  }

  // Ouvrir le modal pour programmer
  openModal(lightSchedule?: LightSchedule) {
    if (this.type === 'light') {
      this.openLightScheduleModal(lightSchedule);
    }
    // Pas de modal pour l’eau, car elle est gérée via le capteur
  }

  openLightScheduleModal(lightSchedule?: LightSchedule) {
    const modalRef = this.modalService.open(LightScheduleModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.title = 'Programmer l\'éclairage';
    modalRef.componentInstance.lightSchedule = lightSchedule || this.lightSchedule;

    modalRef.result.then((result: LightSchedule) => {
      if (result) {
        this.saveLightSchedule(result);
      }
    }).catch(() => {
      // Modal fermé sans action
    });
  }

  saveLightSchedule(schedule: LightSchedule) {
    this.isLoading = true;
    this.errorMessage = '';

    if (!schedule.startTime || !schedule.endTime) {
      this.errorMessage = 'Les heures de début et de fin sont requises';
      this.isLoading = false;
      return;
    }

    if (!this.validateTimeFormat(schedule.startTime) || !this.validateTimeFormat(schedule.endTime)) {
      this.errorMessage = 'Format d\'heure invalide (HH:MM requis)';
      this.isLoading = false;
      return;
    }

    if (schedule.startTime >= schedule.endTime) {
      this.errorMessage = 'L\'heure de fin doit être postérieure à l\'heure de début';
      this.isLoading = false;
      return;
    }

    this.environmentalService.scheduleLightingControl(
      schedule.startTime,
      schedule.endTime,
      schedule.enabled
    ).subscribe({
      next: () => {
        this.lightSchedule = schedule;
        this.isLoading = false;
        this.showNotification('Programmation enregistrée avec succès', 'success');
      },
      error: (error) => {
        console.error('Erreur lors de la programmation de l\'éclairage:', error);
        this.errorMessage = error.error?.error || 'Erreur lors de la programmation';
        this.isLoading = false;
        this.showNotification(this.errorMessage, 'error');
      }
    });
  }

  validateTimeFormat(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    // Implémentation réelle de notification si nécessaire
  }

  // Charger la quantité d’eau via le capteur
  private loadWaterQuantity() {
    this.isLoading = true;
    this.errorMessage = '';
    this.stockService.getWaterTankLevel().subscribe({
      next: (data) => {
        console.log('[ControlItemComponent] Raw data received:', data);
        this.isWaterSensorConnected = data.isWaterSensorConnected;
        this.currentValue = this.isWaterSensorConnected ? data.waterQuantity : 0;
        this.initialValue = this.isWaterSensorConnected ? data.waterQuantity : 0;
        console.log('[ControlItemComponent] Processed - Connected:', this.isWaterSensorConnected, 'Current Value:', this.currentValue);
        this.unit = data.unit || 'L';
        this.updateStatusForWater();
        this.isLoading = false;
        this.cdr.markForCheck(); // Forcer la mise à jour de l’interface
      },
      error: (error) => {
        console.error('[ControlItemComponent] Error loading water quantity:', error);
        this.errorMessage = 'Erreur lors du chargement de la quantité d\'eau';
        this.isWaterSensorConnected = false;
        this.currentValue = 0;
        this.initialValue = 0;
        this.status = ControlStatus.ERROR;
        this.isLoading = false;
        this.showNotification('Erreur lors du chargement de la quantité d\'eau', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  // Mettre à jour le statut pour l’eau
  private updateStatusForWater() {
    const WATER_MIN_QUANTITY = 200;
    if (!this.isWaterSensorConnected || this.currentValue <= 0) {
      this.status = ControlStatus.NO_STOCK; // "Indisponible"
      this.currentValue = 0;
    } else if (this.currentValue < WATER_MIN_QUANTITY) {
      this.status = ControlStatus.LOW_STOCK; // "Stock bas"
    } else {
      this.status = this.isActive ? ControlStatus.ACTIVE : ControlStatus.IDLE; // "Actif" ou "Disponible"
    }
  }

  // Méthodes existantes ajustées pour exclure l’eau des stocks traditionnels
  private updateCurrentValue() {
    if (this.type === 'water') {
      // La valeur est gérée par loadWaterQuantity, pas par @Input value
      return;
    }
    this.currentValue = this.value || 0;
    this.initialValue = this.currentValue;
  }

  private loadStockIdByType() {
    if (this.type === 'water') return; // Pas de stockId pour l’eau
    this.stockService.getStocksByType(this.type).subscribe({
      next: (stocks) => {
        if (stocks && stocks.length > 0) {
          this.stockId = stocks[0]._id;
          this.refreshStockData();
          this.setupPeriodicRefresh();
        } else {
          this.errorMessage = 'Aucun stock trouvé pour ce type';
          this.status = ControlStatus.NOT_FOUND;
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'ID de stock:', error);
        this.errorMessage = 'Erreur lors de la recherche du stock';
        this.status = ControlStatus.ERROR;
      }
    });
  }

  private refreshStockData() {
    if (this.type === 'water') return; // Pas de refresh pour l’eau via stockId
    if (!this.stockId) {
      this.errorMessage = 'Aucun ID de stock fourni';
      this.status = ControlStatus.NOT_FOUND;
      return;
    }
    this.isLoading = true;
    this.stockService.getStockById(this.stockId).subscribe({
      next: (stock) => {
        this.currentValue = stock.quantity;
        this.initialValue = stock.quantity;
        this.unit = stock.unit;
        this.status = this.getStatusFromStock(stock);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du rafraîchissement des données de stock:', error);
        this.errorMessage = 'Erreur lors du rafraîchissement des données';
        this.status = ControlStatus.ERROR;
        this.isLoading = false;
      }
    });
  }

  private setupPeriodicRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    const intervalTime = this.type === 'water' ? this.WATER_REFRESH_INTERVAL : this.refreshInterval;
    if (this.type === 'water') {
      this.refreshSubscription = interval(intervalTime).subscribe(() => {
        this.loadWaterQuantity();
      });
    } else if (this.stockId && this.requiresStock) {
      this.refreshSubscription = interval(intervalTime).subscribe(() => {
        this.refreshStockData();
      });
    }
  }

  private getStatusFromStock(stock: any): string {
    if (!stock || this.type === 'water') return this.status; // Géré par updateStatusForWater pour l’eau
    if (stock.quantity <= 0) return ControlStatus.NO_STOCK; // "Indisponible"
    if (stock.minQuantity && stock.quantity <= stock.minQuantity) return ControlStatus.LOW_STOCK; // "Stock bas"
    return this.isActive ? ControlStatus.ACTIVE : ControlStatus.IDLE; // "Actif" ou "Disponible"
  }

  toggleActive() {
    if (!this.isToggleable) return;
    this.isActive = !this.isActive;
    this.status = this.isActive ? ControlStatus.ACTIVE : ControlStatus.IDLE;
    if (this.isActive && this.requiresStock && this.currentValue > 0 && this.type !== 'water') {
      this.startDecrementInterval();
    } else {
      this.stopDecrementInterval();
    }
  }

  private startDecrementInterval() {
    if (this.type === 'water') return; // Pas de décrémentation pour l’eau
    this.stopDecrementInterval();
    this.decrementInterval = setInterval(() => {
      this.decrementStock();
    }, 1000);
  }

  private stopDecrementInterval() {
    if (this.decrementInterval) {
      clearInterval(this.decrementInterval);
      this.decrementInterval = null;
    }
  }

  private decrementStock() {
    if (this.type === 'water') return; // Pas de décrémentation pour l’eau
    if (this.currentValue > 0) {
      this.currentValue--;
      this.decrementStockInDatabase();
    } else {
      this.stopDecrementInterval();
      this.status = ControlStatus.NO_STOCK;
    }
  }

  private decrementStockInDatabase() {
    if (this.type === 'water') return; // Pas de décrémentation pour l’eau
    if (this.stockId) {
      this.stockService.decrementStock(this.stockId, 1).subscribe({
        next: () => {
          this.refreshStockData();
        },
        error: (error) => {
          console.error('Erreur lors de la décrémentation du stock:', error);
          this.errorMessage = 'Erreur lors de la mise à jour du stock';
          this.status = ControlStatus.ERROR;
        }
      });
    }
  }

  refreshData() {
    if (this.type === 'water') {
      this.loadWaterQuantity();
    } else if (this.stockId && this.requiresStock) {
      this.refreshStockData();
    }
    this.lastRefresh = new Date();
  }

  getStockPercentage(): number {
    if (this.type === 'water') {
      return this.isWaterSensorConnected ? Math.min(100, Math.max(0, Math.round((this.currentValue / 1000) * 100))) : 0; // 1000L max
    }
    if (this.initialValue <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((this.currentValue / this.initialValue) * 100)));
  }

  getImageUrl(): string {
    if (this.type === 'feed') return '/assets/images/feeder.png';
    if (this.type === 'water') return '/assets/images/drink.png';
    return '/assets/images/default-control.png';
  }
  
}