// src/app/services/cost.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Cost, FeedCalculationResult, ProfitabilityCalculation } from '../models/cost.model'; // Importez l'interface


@Injectable({
  providedIn: 'root',
})
export class CostService {
  private apiUrl = 'http://localhost:3000/api/costs';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Ajouter un coût
  addCost(cost: Cost): Observable<Cost> {
    // Si cost.dynamicData est une Map, la convertir en objet simple
    const costToSend = {
      ...cost,
      dynamicData: cost.dynamicData instanceof Map ? 
        Object.fromEntries(cost.dynamicData) : 
        cost.dynamicData
    };
  
    return this.http.post<Cost>(this.apiUrl, costToSend, { headers: this.getHeader() })
      .pipe(
        catchError(error => {
          console.error('Erreur détaillée:', error);
          return throwError(() => new Error('Erreur lors de l\'ajout du coût'));
        })
      );
  }

  // Récupérer l'historique des coûts
  getCostHistory(startDate?: string, endDate?: string, limit: number = 50): Observable<Cost[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    return this.http.get<Cost[]>(`${this.apiUrl}/history`, { params, headers: this.getHeader() }).pipe(
      catchError(this.handleError<Cost[]>('getCostHistory', []))
    );
  }

  // Récupérer les statistiques des coûts
  getCostStats(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    return this.http.get<any[]>(`${this.apiUrl}/stats`, { params, headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('getCostStats', []))
    );
  }

  // Calculer les coûts totaux
  calculateTotalCosts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/total`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('calculateTotalCosts'))
    );
  }

  // Calculer les besoins en alimentation
  calculateFeedRequirements(data: any): Observable<FeedCalculationResult> {
    return this.http.post<FeedCalculationResult>(
      `${this.apiUrl}/feed-requirements`, 
      data, 
      { headers: this.getHeader() }
    ).pipe(
      catchError(this.handleError<FeedCalculationResult>('calculateFeedRequirements'))
    );
  }

  // Calculer la rentabilité
  calculateProfitability(data: ProfitabilityCalculation): Observable<ProfitabilityCalculation> {
    return this.http.post<ProfitabilityCalculation>(
      `${this.apiUrl}/profitability`, 
      data, 
      { headers: this.getHeader() }
    ).pipe(
      catchError(this.handleError<ProfitabilityCalculation>('calculateProfitability'))
    );
  }

  // Gestion des erreurs
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      // Log détaillé de l'erreur
      if (error.error instanceof ErrorEvent) {
        console.error('Client side error:', error.error.message);
      } else {
        console.error(`Backend returned code ${error.status}, body was:`, error.error);
      }
      // Vous pouvez retourner une erreur personnalisée ici
      throw error;
    };
  }

  // Récupérer les en-têtes HTTP avec le token JWT
  private getHeader(): HttpHeaders {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });
    } else {
      return new HttpHeaders({
        'Content-Type': 'application/json',
      });
    }
  }
}