import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Stock } from '../models/stock.model';

export interface Feeding {
  _id?: string;
  quantity: number;
  feedType: string;
  stockQuantity?: number;
  notes?: string;
  automaticFeeding?: boolean;
  waterSupply?: {
    startTime: string;
    endTime: string;
    enabled: boolean;
  };
  programStartTime?: string;
  programEndTime?: string;
  isArchived: boolean;
  stockId?: string;
  createdAt?: Date;
  reminderSent?: boolean;
}

export interface ConsumptionStats {
  _id: string;  // feedType
  totalConsumed: number;
  totalInitial: number;
  remainingQuantity: number;
}

export interface FeedingStats {
  _id: string;
  totalQuantity: number;
  averageQuantity: number;
  count: number;
}

export interface StockAlert {
  _id: string;
  currentStock: number;
}

export interface Notification {
  _id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}


export interface ConsumptionData {
  feedType: string;
  totalConsumed: number;
  unit: string;
}

export interface DistributionData {
  feedType: string;
  totalDistributed: number;
  unit: string;
}

@Injectable({
  providedIn: 'root',
})
export class AlimentationService {
  private readonly apiUrl = 'http://localhost:3000/api/feedings';
  private readonly stockApiUrl = 'http://localhost:3000/api/stocks';
  private readonly notificationsUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  // Ajouter une alimentation
  addFeeding(feeding: Feeding): Observable<Feeding> {
    const headers = this.getHeaders();
    const requestBody = {
      quantity: feeding.quantity,
      feedType: feeding.feedType,
      programStartTime: feeding.programStartTime,
      programEndTime: feeding.programEndTime,
      notes: feeding.notes,
      automaticFeeding: feeding.automaticFeeding,
      stockId: feeding.stockId,
      reminderSent: false
    };

    return this.http.post<Feeding>(this.apiUrl, requestBody, { headers }).pipe(
      switchMap(addedFeeding => {
        if (feeding.stockId && feeding.quantity) {
          return this.updateStockQuantity(feeding.stockId, feeding.quantity).pipe(
            map(() => addedFeeding)
          );
        }
        return of(addedFeeding);
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir l'historique des alimentations
  getFeedingHistory(params: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Observable<Feeding[]> {
    const headers = this.getHeaders();
    let httpParams = new HttpParams();

    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString());
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<Feeding[]>(this.apiUrl, { headers, params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir toutes les alimentations
  getAllFeedings(): Observable<Feeding[]> {
    const headers = this.getHeaders();
    return this.http.get<Feeding[]>(`${this.apiUrl}/all`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Mettre à jour une alimentation
  updateFeeding(id: string, feeding: Partial<Feeding>): Observable<Feeding> {
    const headers = this.getHeaders();
    return this.http.put<Feeding>(`${this.apiUrl}/${id}`, feeding, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Archiver une alimentation
  archiveFeeding(id: string): Observable<Feeding> {
    const headers = this.getHeaders();
    return this.http.put<Feeding>(`${this.apiUrl}/${id}/archive`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les programmes archivés
  getArchivedFeedings(): Observable<Feeding[]> {
    const headers = this.getHeaders();
    return this.http.get<Feeding[]>(`${this.apiUrl}/archived`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Arrêter immédiatement la pompe à eau
  stopWaterImmediate(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/stop-water-immediate`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }


  stopFeedingImmediate(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/stop-feeding-immediate`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les statistiques des alimentations
  getFeedingStats(params: {
    startDate?: Date;
    endDate?: Date;
  }): Observable<FeedingStats[]> {
    const headers = this.getHeaders();
    let httpParams = new HttpParams();

    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString());
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString());
    }

    return this.http.get<FeedingStats[]>(`${this.apiUrl}/stats`, { headers, params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les programmes d'alimentation avec leurs stocks associés
  getFeedingProgramWithStock(): Observable<Feeding[]> {
    const headers = this.getHeaders();
    return this.http.get<Feeding[]>(`${this.apiUrl}/with-stock`, { headers }).pipe(
      map(feedings => feedings.filter(feeding => feeding.stockQuantity !== undefined)),
      catchError(this.handleError)
    );
  }

  // Décrémenter la quantité d'une alimentation
  decrementFeedingQuantity(id: string, amount: number = 1): Observable<Feeding> {
    const headers = this.getHeaders();
    return this.http.patch<Feeding>(`${this.apiUrl}/${id}/decrement`, { amount }, { headers }).pipe(
      switchMap(feeding => {
        if (feeding.stockId) {
          return this.updateStockQuantity(feeding.stockId, amount).pipe(
            map(() => feeding)
          );
        }
        return of(feeding);
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir les statistiques de consommation
  getConsumptionStats(): Observable<ConsumptionStats[]> {
    const headers = this.getHeaders();
    return this.http.get<ConsumptionStats[]>(`${this.apiUrl}/consumption-stats`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les alertes de stock bas
  getAlertLowStock(): Observable<StockAlert[]> {
    const headers = this.getHeaders();
    return this.http.get<StockAlert[]>(`${this.stockApiUrl}/alerts/low-stock`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Ajouter plusieurs alimentations en une seule requête
  bulkAddFeedings(feedings: Feeding[]): Observable<Feeding[]> {
    const headers = this.getHeaders();
    return this.http.post<Feeding[]>(`${this.apiUrl}/bulk`, { feedings }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Mettre à jour l'apport en eau
  updateWaterSupply(
    id: string,
    waterSupply: {
      startTime: string;
      endTime: string;
      enabled: boolean;
    }
  ): Observable<Feeding> {
    const headers = this.getHeaders();
    return this.http.put<Feeding>(`${this.apiUrl}/${id}/water-supply`, waterSupply, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Mettre à jour la quantité de stock
  updateStockQuantity(stockId: string, quantityToRemove: number): Observable<any> {
    const headers = this.getHeaders();
    const url = `${this.stockApiUrl}/update-quantity/${stockId}`;
    return this.http.put(url, { quantityToRemove }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Vérifier manuellement les rappels d'alimentation
  checkFeedingReminders(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/check-reminders`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Démarrer les tâches cron de rappel d'alimentation (admin uniquement)
  startFeedingReminderCronJobs(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/cron/start`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Obtenir les notifications non lues
  getUnreadNotifications(): Observable<Notification[]> {
    const headers = this.getHeaders();
    return this.http.get<Notification[]>(`${this.notificationsUrl}/unread`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Marquer une notification comme lue
  markNotificationAsRead(id: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put<any>(`${this.notificationsUrl}/${id}/read`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Envoyer les programmes à l'Arduino
  sendProgramsToArduino(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/arduino/programs`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Envoyer une commande manuelle à l'Arduino
  sendManualCommandToArduino(command: string): Observable<any> {
    const headers = this.getHeaders();
    const body = { command };
    return this.http.post<any>(`${this.apiUrl}/arduino/command`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }


  // Récupérer la quantité d'aliments consommés
  getConsumedFood(params: { startDate?: Date; endDate?: Date } = {}): Observable<ConsumptionData> {
    const headers = this.getHeaders();
    let httpParams = new HttpParams();

    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString().split('T')[0]);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString().split('T')[0]);
    }

    return this.http.get<ConsumptionData>(`${this.apiUrl}/consumed/food`, { headers, params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  // Récupérer la quantité d'eau consommée
  getConsumedWater(params: { startDate?: Date; endDate?: Date } = {}): Observable<ConsumptionData> {
    const headers = this.getHeaders();
    let httpParams = new HttpParams();

    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString().split('T')[0]);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString().split('T')[0]);
    }

    return this.http.get<ConsumptionData>(`${this.apiUrl}/consumed/water`, { headers, params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  // Récupérer la quantité distribuée
  getDistributionQuantity(params: { feedType?: string; startDate?: Date; endDate?: Date } = {}): Observable<DistributionData[] | DistributionData> {
    const headers = this.getHeaders();
    let httpParams = new HttpParams();

    if (params.feedType) {
      httpParams = httpParams.set('feedType', params.feedType);
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString().split('T')[0]);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString().split('T')[0]);
    }

    return this.http.get<DistributionData[] | DistributionData>(`${this.apiUrl}/distribution`, { headers, params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse) {
    console.error('Erreur dans AlimentationService:', error);
    return throwError(() => new Error('Une erreur est survenue'));
  }
}