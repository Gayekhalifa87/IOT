import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Importez AuthService

export interface Vaccine {
  _id?: string;
  name: string;
  dateAdministered: Date;
  nextDueDate?: Date | null;
  numberOfChickens: number;
  notes?: string;
  administered: boolean;
  administeredDate?: Date;
  scheduledDate?: Date; // Propriété ajoutée
  userId?: string;
}

export interface VaccineScheduleParams {
  startDate: Date;
  chickenType: 'pondeuse' | 'chair' | 'mixte';
  numberOfChickens: number;
  scheduleType?: 'standard' | 'complet';
}

export interface NotificationPreferences {
  enableEmailReminders: boolean;
  reminderDays?: number;
  dailySummary?: boolean;
}

export interface ScheduleResponse {
  success: boolean;
  message: string;
  vaccines: Vaccine[];
}

export interface VaccinesResponse {
  message: string | null;
  success: boolean;
  count: number;
  vaccines: Vaccine[];
}

export interface VaccineResponse {
  success: boolean;
  message: string;
  vaccine: Vaccine;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  preferences?: NotificationPreferences;
  upcomingVaccineCount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VaccineService {
  private apiUrl = 'http://localhost:3000/api/vaccins'; // URL statique

  constructor(private http: HttpClient, private authService: AuthService) {} // Injectez AuthService

  // --------------------------
  // Méthodes pour les en-têtes HTTP
  // --------------------------

  /**
   * Retourne les en-têtes HTTP avec le token JWT.
   * @returns HttpHeaders - Les en-têtes HTTP.
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken(); // Récupère le token depuis AuthService
    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // Ajoute le token dans l'en-tête Authorization
      });
    } else {
      return new HttpHeaders({
        'Content-Type': 'application/json',
      });
    }
  }

  // --------------------------
  // Méthodes pour les vaccins
  // --------------------------

  /**
   * Génération de calendrier de vaccination.
   * @param params - Les paramètres pour générer le calendrier.
   * @returns Observable<ScheduleResponse> - La réponse du serveur.
   */
  generateVaccinationSchedule(params: VaccineScheduleParams): Observable<ScheduleResponse> {
    const headers = this.getHeaders();
    return this.http.post<ScheduleResponse>(`${this.apiUrl}/generate-schedule`, params, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupération du calendrier de vaccination.
   * @returns Observable<VaccinesResponse> - La réponse du serveur.
   */
  getVaccineSchedule(): Observable<VaccinesResponse> {
    const headers = this.getHeaders();
    return this.http.get<VaccinesResponse>(`${this.apiUrl}/schedule`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupération des vaccins à venir.
   * @returns Observable<VaccinesResponse> - La réponse du serveur.
   */
  getUpcomingVaccines(): Observable<VaccinesResponse> {
    const headers = this.getHeaders();
    return this.http.get<VaccinesResponse>(`${this.apiUrl}/upcoming`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupération des vaccins administrés.
   * @returns Observable<VaccinesResponse> - La réponse du serveur.
   */
  getAdministeredVaccines(): Observable<VaccinesResponse> {
    const headers = this.getHeaders();
    return this.http.get<VaccinesResponse>(`${this.apiUrl}/administered`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Marquer un vaccin comme administré.
   * @param id - L'ID du vaccin.
   * @param data - Les données à mettre à jour.
   * @returns Observable<VaccineResponse> - La réponse du serveur.
   */
  markVaccineAsAdministered(id: string, data: { administeredDate?: Date, notes?: string }): Observable<VaccineResponse> {
    const headers = this.getHeaders();
    return this.http.put<VaccineResponse>(`${this.apiUrl}/${id}/administered`, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mise à jour d'un vaccin.
   * @param id - L'ID du vaccin.
   * @param vaccineData - Les nouvelles données du vaccin.
   * @returns Observable<VaccineResponse> - La réponse du serveur.
   */
  updateVaccine(id: string, vaccineData: Partial<Vaccine>): Observable<VaccineResponse> {
    const headers = this.getHeaders();
    return this.http.put<VaccineResponse>(`${this.apiUrl}/${id}`, vaccineData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Suppression d'un vaccin.
   * @param id - L'ID du vaccin.
   * @returns Observable<{ success: boolean, message: string }> - La réponse du serveur.
   */
  deleteVaccine(id: string): Observable<{ success: boolean, message: string }> {
    const headers = this.getHeaders();
    return this.http.delete<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Envoi de rappel manuel.
   * @param id - L'ID du vaccin.
   * @returns Observable<NotificationResponse> - La réponse du serveur.
   */
  sendManualReminder(id: string): Observable<NotificationResponse> {
    const headers = this.getHeaders();
    return this.http.post<NotificationResponse>(`${this.apiUrl}/${id}/reminder`, {}, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mise à jour des préférences de notification.
   * @param preferences - Les nouvelles préférences.
   * @returns Observable<NotificationResponse> - La réponse du serveur.
   */
  updateNotificationPreferences(preferences: NotificationPreferences): Observable<NotificationResponse> {
    const headers = this.getHeaders();
    return this.http.put<NotificationResponse>(`${this.apiUrl}/notifications/preferences`, preferences, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Envoi du résumé hebdomadaire.
   * @returns Observable<NotificationResponse> - La réponse du serveur.
   */
  sendWeeklySummary(): Observable<NotificationResponse> {
    const headers = this.getHeaders();
    return this.http.post<NotificationResponse>(`${this.apiUrl}/notifications/weekly-summary`, {}, { headers }).pipe(
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
          errorMessage = 'Données invalides';
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

    console.error('Erreur dans VaccineService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}