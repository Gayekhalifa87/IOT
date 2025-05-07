import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { Stock, StockStats, LowStockAlert } from './../models/stock.model';
import { AuthService } from './auth.service'; // Importez AuthService

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private readonly apiUrl = 'http://localhost:3000/api/stocks';

  constructor(private http: HttpClient, private authService: AuthService) {} // Injectez AuthService

  // --------------------------
  // Méthodes pour les en-têtes HTTP
  // --------------------------

  /**
   * Retourne les en-têtes HTTP avec le token JWT.
   * @returns HttpHeaders - Les en-têtes HTTP.
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }
  

  // --------------------------
  // Méthodes pour les stocks (uniquement pour les aliments, pas l'eau)
  // --------------------------

  /**
   * Ajouter un nouveau stock (uniquement pour les aliments).
   * @param stockData - Les données du stock à ajouter.
   * @returns Observable<Stock> - La réponse du serveur.
   */
  addStock(stockData: Omit<Stock, '_id'>): Observable<Stock> {
    const headers = this.getHeaders();
    if (stockData.type.toLowerCase() === 'eau') {
      return throwError(() => new Error('Les stocks d\'eau ne sont pas gérés manuellement, utilisez le capteur d\'eau.'));
    }
    return this.http.post<Stock>(this.apiUrl, stockData, { headers }).pipe(
      tap((stock) => console.log('[StockService] Stock added:', stock)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir tous les stocks (uniquement pour les aliments).
   * @returns Observable<Stock[]> - La liste des stocks.
   */
  getAllStocks(): Observable<Stock[]> {
    const headers = this.getHeaders();
    return this.http.get<Stock[]>(`${this.apiUrl}/all`, { headers }).pipe(
      map(stocks => stocks.filter(stock => stock.type.toLowerCase() !== 'eau')),
      tap(stocks => console.log('[StockService] All stocks retrieved:', stocks)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer un stock par ID (uniquement pour les aliments).
   * @param stockId - L'ID du stock à récupérer.
   * @returns Observable<Stock> - Les détails du stock.
   */
  getStockById(stockId: string): Observable<Stock> {
    const headers = this.getHeaders();
    return this.http.get<Stock>(`${this.apiUrl}/${stockId}`, { headers }).pipe(
      map(stock => {
        if (stock.type.toLowerCase() === 'eau') {
          throw new Error('Les stocks d\'eau ne sont pas gérés manuellement, utilisez le capteur d\'eau.');
        }
        return stock;
      }),
      tap(stock => console.log('[StockService] Stock by ID retrieved:', stock)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer les statistiques des stocks (uniquement pour les aliments).
   * @returns Observable<StockStats[]> - Les statistiques des stocks.
   */
  getStockStats(): Observable<StockStats[]> {
    const headers = this.getHeaders();
    return this.http.get<StockStats[]>(`${this.apiUrl}/stats`, { headers }).pipe(
      map(stats => stats.filter(stat => stat.type.toLowerCase() !== 'eau')),
      tap((stats) => console.log('[StockService] Stock stats retrieved:', stats)),
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour un stock existant (uniquement pour les aliments).
   * @param id - L'ID du stock à mettre à jour.
   * @param stockData - Les nouvelles données du stock.
   * @returns Observable<Stock> - La réponse du serveur.
   */
  updateStock(id: string, stockData: Partial<Stock>): Observable<Stock> {
    const headers = this.getHeaders();
    return this.http.get<Stock>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map(stock => {
        if (stock.type.toLowerCase() === 'eau') {
          throw new Error('Les stocks d\'eau ne peuvent pas être mis à jour manuellement, utilisez le capteur d\'eau.');
        }
        return stock;
      }),
      switchMap(() => this.http.put<Stock>(`${this.apiUrl}/${id}`, stockData, { headers })),
      tap((stock) => console.log('[StockService] Stock updated:', stock)),
      catchError(this.handleError)
    );
  }

  /**
   * Supprimer un stock (uniquement pour les aliments).
   * @param id - L'ID du stock à supprimer.
   * @returns Observable<Stock> - La réponse du serveur.
   */
  deleteStock(id: string): Observable<Stock> {
    const headers = this.getHeaders();
    return this.http.get<Stock>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map(stock => {
        if (stock.type.toLowerCase() === 'eau') {
          throw new Error('Les stocks d\'eau ne peuvent pas être supprimés manuellement, utilisez le capteur d\'eau.');
        }
        return stock;
      }),
      switchMap(() => this.http.delete<Stock>(`${this.apiUrl}/${id}`, { headers })),
      tap((stock) => console.log('[StockService] Stock deleted:', stock)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les stocks par type (uniquement pour les aliments).
   * @param type - Le type de stock à récupérer.
   * @returns Observable<Stock[]> - La liste des stocks du type spécifié.
   */
  getStocksByType(type: string): Observable<Stock[]> {
    const headers = this.getHeaders();
    if (type.toLowerCase() === 'eau') {
      return throwError(() => new Error('Les stocks d\'eau ne sont pas gérés manuellement, utilisez le capteur d\'eau.'));
    }
    return this.http.get<Stock[]>(`${this.apiUrl}/by-type/${type}`, { headers }).pipe(
      tap(stocks => console.log('[StockService] Stocks by type retrieved:', stocks)),
      catchError(this.handleError)
    );
  }

  /**
   * Décrémenter un stock automatiquement (uniquement pour les aliments).
   * @param stockId - L'ID du stock à décrémenter.
   * @param quantity - La quantité à décrémenter (default: 1).
   * @returns Observable<any> - La réponse du serveur.
   */
  decrementStock(stockId: string, quantity: number = 1): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<Stock>(`${this.apiUrl}/${stockId}`, { headers }).pipe(
      map(stock => {
        if (stock.type.toLowerCase() === 'eau') {
          throw new Error('Les stocks d\'eau ne peuvent pas être décrémentés manuellement, utilisez le capteur d\'eau.');
        }
        return stock;
      }),
      switchMap(() => this.http.post<any>(`${this.apiUrl}/decrement`, { stockId, quantityToDecrement: quantity }, { headers })),
      tap(response => console.log('[StockService] Response from decrement:', response)),
      catchError(error => {
        console.error('[StockService] Error in decrementStock:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtenir les alertes de stock bas (uniquement pour les aliments, avec l’eau via capteur).
   * @returns Observable<LowStockAlert[]> - La liste des stocks en alerte.
   */
  getAlertLowStock(): Observable<LowStockAlert[]> {
    const headers = this.getHeaders();
    return this.http.get<LowStockAlert[]>(`${this.apiUrl}/alerts/low-stock`, { headers }).pipe(
      tap(alerts => console.log('[StockService] Low stock alerts retrieved:', alerts)),
      map(alerts => alerts.filter(alert => alert.type.toLowerCase() !== 'eau')),
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les quantités totales pour chaque type de stock (aliments via DB, eau via capteur).
   * @returns Observable<{ totalsByType: { [key: string]: { totalQuantity: number, unit: string } } }> - Les quantités totales par type.
   */
  getTotals(): Observable<{ totalsByType: { [key: string]: { totalQuantity: number, unit: string } } }> {
    const headers = this.getHeaders();
    return this.http.get<{ totalsByType: { [key: string]: { totalQuantity: number, unit: string } } }>(`${this.apiUrl}/totals`, { headers }).pipe(
      tap(totals => console.log('[StockService] Totals retrieved:', totals)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer le niveau du réservoir d'aliments (uniquement pour les aliments).
   * @returns Observable<{ foodTankLevel: number }> - Le niveau du réservoir en pourcentage.
   */
  getFoodTankLevel(): Observable<{ foodTankLevel: number }> {
    const headers = this.getHeaders();
    return this.http.get<{ foodTankLevel: number }>(`${this.apiUrl}/food-tank-level`, { headers }).pipe(
      tap(data => console.log('[StockService] Food tank level retrieved:', data.foodTankLevel)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer le niveau du réservoir d'eau via le capteur, avec l'état de connexion du capteur.
   * @returns Observable<{ waterLevel: number, waterQuantity: number, unit: string, isWaterSensorConnected: boolean }> - Le niveau, la quantité d'eau et l'état du capteur.
   */
  getWaterTankLevel(): Observable<{ waterLevel: number; waterQuantity: number; unit: string; isWaterSensorConnected: boolean }> {
    const headers = this.getHeaders();
    return this.http.get<{ waterLevel: number; waterQuantity: number; unit: string; isWaterSensorConnected: boolean }>(`${this.apiUrl}/water-tank-level`, { headers }).pipe(
      tap((data) => console.log('[StockService] Water tank level and quantity retrieved:', data)),
      catchError(this.handleError)
    );
  }

  // --------------------------
  // Gestion des erreurs
  // --------------------------

  /**
   * Gestion centralisée des erreurs.
   * @param error - L'erreur retournée par le serveur.
   * @returns Observable<never> - Un observable avec l'erreur.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
  
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = error.error.message || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur';
          break;
        default:
          errorMessage = `Code d'erreur: ${error.status}, message: ${error.message}`;
      }
    }
  
    console.error('[StockService] Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}