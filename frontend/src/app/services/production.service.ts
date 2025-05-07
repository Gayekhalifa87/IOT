// src/app/services/production.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Production } from '../models/production.model'; // Importez l'interface

@Injectable({
  providedIn: 'root',
})
export class ProductionService {
  private apiUrl = 'http://localhost:3000/api/productions';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Ajouter une production
  addProduction(production: Production): Observable<Production> {
    return this.http.post<Production>(this.apiUrl, production, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<Production>('addProduction'))
    );
  }

  // Récupérer les statistiques de production
  getProductionStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('getProductionStats'))
    );
  }

  // Mettre à jour une production
  updateProduction(id: string, production: Production): Observable<Production> {
    return this.http.put<Production>(`${this.apiUrl}/${id}`, production, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<Production>('updateProduction'))
    );
  }

  // Supprimer une production
  deleteProduction(id: string): Observable<Production> {
    return this.http.delete<Production>(`${this.apiUrl}/${id}`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<Production>('deleteProduction'))
    );
  }

  // Récupérer toutes les productions
  getAllProductions(): Observable<Production[]> {
    return this.http.get<Production[]>(this.apiUrl, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<Production[]>('getAllProductions', []))
    );
  }

  // Gestion des erreurs
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
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