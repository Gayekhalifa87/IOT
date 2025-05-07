import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private apiUrl = 'http://localhost:3000/api/history';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // --------------------------
  // Méthodes pour l'historique
  // --------------------------

  getHistory(type?: string, startDate?: string, endDate?: string, limit: number = 10, page: number = 1): Observable<any> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString());

    if (type) {
      params = params.set('type', type);
    }
    if (startDate && endDate) {
      params = params.set('startDate', startDate).set('endDate', endDate);
    }

    return this.http.get<any>(this.apiUrl, { params, headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('getHistory'))
    );
  }

  getHistoryByType(type: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/type/${type}`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('getHistoryByType', []))
    );
  }

  getHistoryStats(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stats`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('getHistoryStats', []))
    );
  }

  getHistoryByUser(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('getHistoryByUser', []))
    );
  }

  searchHistory(keyword: string): Observable<any[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<any[]>(`${this.apiUrl}/search`, { params, headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('searchHistory', []))
    );
  }

  deleteHistoryEntry(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('deleteHistoryEntry'))
    );
  }

  getHistoryByDay(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (startDate && endDate) {
      params = params.set('startDate', startDate).set('endDate', endDate);
    }
    return this.http.get<any[]>(`${this.apiUrl}/by-day`, { params, headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('getHistoryByDay', []))
    );
  }

  getHistoryByWeek(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (startDate && endDate) {
      params = params.set('startDate', startDate).set('endDate', endDate);
    }
    return this.http.get<any[]>(`${this.apiUrl}/by-week`, { params, headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('getHistoryByWeek', []))
    );
  }

  getHistoryByMonth(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (startDate && endDate) {
      params = params.set('startDate', startDate).set('endDate', endDate);
    }
    return this.http.get<any[]>(`${this.apiUrl}/by-month`, { params, headers: this.getHeader() }).pipe(
      catchError(this.handleError<any[]>('getHistoryByMonth', []))
    );
  }

  exportHistoryToCsv(type?: string, startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get(`${this.apiUrl}/export/csv`, {
      params,
      headers: this.getHeader(), // Ajout des headers ici
      responseType: 'blob',
    });
  }

  exportHistoryToExcel(type?: string, startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get(`${this.apiUrl}/export/excel`, {
      params,
      headers: this.getHeader(), // Ajout des headers ici
      responseType: 'blob',
    });
  }

  exportHistoryToPdf(type?: string, startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get(`${this.apiUrl}/export/pdf`, {
      params,
      headers: this.getHeader(), // Ajout des headers ici
      responseType: 'blob',
    });
  }

  // --------------------------
  // Gestion des erreurs
  // --------------------------

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }

  // --------------------------
  // Méthodes pour les en-têtes HTTP
  // --------------------------

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