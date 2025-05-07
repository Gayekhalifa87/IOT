import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Assurez-vous que ce service existe pour le token

export interface LightSchedule {
  _id?: string; // Ajoutez ceci si ce n'est pas déjà présent
  startTime: string;
  endTime: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class EnvironmentalService {
  private apiUrl = 'http://localhost:3000/api/environmental';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // --------------------------
  // Méthodes pour la gestion de la lampe
  // --------------------------

  /**
   * Programme l'allumage automatique de la lampe entre deux horaires.
   * @param startTime - L'heure de début (format HH:MM).
   * @param endTime - L'heure de fin (format HH:MM).
   * @param enabled - Si la programmation est activée (optionnel, par défaut true).
   * @returns Observable<any> - La réponse du serveur.
   */
  scheduleLightingControl(startTime: string, endTime: string, enabled: boolean = true): Observable<any> {
    const body = { startTime, endTime, enabled };
    return this.http.post<any>(`${this.apiUrl}/schedule/lighting`, body, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('scheduleLightingControl'))
    );
  }

  /**
   * Récupère la programmation de la lampe.
   * @returns Observable<LightSchedule> - La programmation de la lampe.
   */
  getLightSchedule(): Observable<LightSchedule> {
    return this.http.get<LightSchedule>(`${this.apiUrl}/light-schedule`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<LightSchedule>('getLightSchedule'))
    );
  }

  /**
   * Récupère les préférences de jour pour la lampe.
   * @returns Observable<string[]> - Les jours actifs pour la lampe.
   */
  getLightPreferences(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/light-preferences`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<string[]>('getLightPreferences', []))
    );
  }

  /**
   * Met à jour les préférences de jour pour la lampe.
   * @param activeDays - Les jours actifs à mettre à jour.
   * @returns Observable<any> - La réponse du serveur.
   */
  updateLightPreferences(activeDays: string[]): Observable<any> {
    const body = { activeDays };
    return this.http.post<any>(`${this.apiUrl}/light-preferences`, body, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('updateLightPreferences'))
    );
  }

  /**
   * Supprime la programmation de la lampe.
   * @returns Observable<any> - La réponse du serveur.
   */
  deleteLightSchedule(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/light-schedule/${id}`, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('deleteLightSchedule'))
    );
  }

  /**
   * Contrôle manuel de la lampe (allumer/éteindre).
   * @param action - "START" pour allumer, "STOP" pour éteindre.
   * @returns Observable<any> - La réponse du serveur.
   */
  controlLampManually(action: 'START' | 'STOP'): Observable<any> {
    const body = { action };
    return this.http.post<any>(`${this.apiUrl}/lighting/control`, body, { headers: this.getHeader() }).pipe(
      catchError(this.handleError<any>('controlLampManually'))
    );
  }

  // --------------------------
  // Gestion des erreurs
  // --------------------------

  /**
   * Gestion centralisée des erreurs.
   * @param operation - Le nom de l'opération en cours.
   * @param result - La valeur de retour en cas d'erreur.
   * @returns (error: any) => Observable<T> - Une fonction de gestion d'erreur.
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }

  // --------------------------
  // Méthodes pour les en-têtes HTTP
  // --------------------------

  /**
   * Retourne les en-têtes HTTP avec le token JWT.
   * @returns HttpHeaders - Les en-têtes HTTP.
   */
  private getHeader(): HttpHeaders {
    const token = this.authService.getToken(); // Récupère le token depuis AuthService
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