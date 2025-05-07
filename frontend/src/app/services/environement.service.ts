// src/app/services/environmental.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EnvironmentalData {
  temperature: number;
  humidity: number;
  lightRaw: number;
  lightPercentage: number;
  timestamp: Date;
  _id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironementService {
  // Définir l'URL de l'API directement ici
  private apiUrl = 'http://localhost:3000/api/environements'; // Remplacez par l'URL de votre API

  constructor(private http: HttpClient) { }

  getLatestData(): Observable<EnvironmentalData> {
    return this.http.get<EnvironmentalData>(`${this.apiUrl}/latest`);
  }

  getDataHistory(limit: number = 100, startDate?: Date, endDate?: Date): Observable<EnvironmentalData[]> {
    let params: any = { limit };
    
    if (startDate) {
      params.startDate = startDate.toISOString();
    }
    
    if (endDate) {
      params.endDate = endDate.toISOString();
    }
    
    return this.http.get<EnvironmentalData[]>(`${this.apiUrl}/history`, { params });
  }
}