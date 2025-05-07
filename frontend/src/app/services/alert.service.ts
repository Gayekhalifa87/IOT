// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { catchError } from 'rxjs/operators';

// @Injectable({
//   providedIn: 'root'
// })
// export class AlertService {
//   private apiUrl = 'http://localhost:3000/api/alerts'; // Remplacez par l'URL de votre API

//   constructor(private http: HttpClient) {}

//   // Crée une nouvelle alerte
//   createAlert(alert: any): Observable<any> {
//     return this.http.post<any>(this.apiUrl, alert)
//       .pipe(
//         catchError(this.handleError<any>('createAlert'))
//       );
//   }

//   // Récupère toutes les alertes
//   getAlerts(): Observable<any[]> {
//     return this.http.get<any[]>(this.apiUrl)
//       .pipe(
//         catchError(this.handleError<any[]>('getAlerts', []))
//       );
//   }

//   // Récupère les alertes actives
//   getActiveAlerts(): Observable<any[]> {
//     return this.http.get<any[]>(`${this.apiUrl}/active`)
//       .pipe(
//         catchError(this.handleError<any[]>('getActiveAlerts', []))
//       );
//   }

//   // Récupère les alertes critiques
//   getCriticalAlerts(): Observable<any[]> {
//     return this.http.get<any[]>(`${this.apiUrl}/critical`)
//       .pipe(
//         catchError(this.handleError<any[]>('getCriticalAlerts', []))
//       );
//   }

//   // Acquitte une alerte
//   acknowledgeAlert(id: string): Observable<any> {
//     return this.http.post<any>(`${this.apiUrl}/${id}/acknowledge`, {})
//       .pipe(
//         catchError(this.handleError<any>('acknowledgeAlert'))
//       );
//   }

//   // Résout une alerte
//   resolveAlert(id: string): Observable<any> {
//     return this.http.post<any>(`${this.apiUrl}/${id}/resolve`, {})
//       .pipe(
//         catchError(this.handleError<any>('resolveAlert'))
//       );
//   }

//   // Ajoute une action à une alerte
//   addActionToAlert(id: string, action: any): Observable<any> {
//     return this.http.post<any>(`${this.apiUrl}/${id}/actions`, action)
//       .pipe(
//         catchError(this.handleError<any>('addActionToAlert'))
//       );
//   }

//   private handleError<T>(operation = 'operation', result?: T) {
//     return (error: any): Observable<T> => {
//       console.error(`${operation} failed: ${error.message}`);
//       return of(result as T);
//     };
//   }
// }
