import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { Observable } from 'rxjs';
import { HistoryService } from '../../services/history.service';
import { History } from '../../models/history.model';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './historiques.component.html',
  styleUrls: ['./historiques.component.scss'],
})
export class HistoriquesComponent implements OnInit {
  // Constantes système mises à jour
  readonly CURRENT_UTC_DATETIME = '2025-02-25 16:48:27';
  readonly CURRENT_USER = 'Antoine627';

  // Données de l'historique
  historyData: History[] = [];
  filteredHistory: History[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Filtres et périodes
  periodes = [
    { value: 'jour', label: "Aujourd'hui" },
    { value: 'semaine', label: '7 derniers jours' },
    { value: 'mois', label: '30 derniers jours' },
    { value: 'personnalise', label: 'Période personnalisée' },
  ];

  periodeSelectionnee = 'jour';
  afficherDatesPersonnalisees = false;
  dateDebut: string = '';
  dateFin: string = '';

  // États
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private historyService: HistoryService) {
    this.initializeDates();
  }

  private initializeDates(): void {
    const currentDate = new Date();
    const today = currentDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
    this.dateDebut = today;
    this.dateFin = today;
}

  ngOnInit(): void {
    this.loadHistory();
  }

  private getDateRange(): { startDate: string; endDate: string } {
    const currentDate = new Date(); // Date actuelle réelle
    let startDate: Date;
    let endDate: Date;

    switch (this.periodeSelectionnee) {
        case 'jour':
            // Limiter strictement à aujourd'hui
            startDate = new Date(currentDate.setHours(0, 0, 0, 0));
            endDate = new Date(currentDate.setHours(23, 59, 59, 999));
            break;

        case 'semaine':
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(currentDate.setHours(23, 59, 59, 999));
            break;

        case 'mois':
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(currentDate.setHours(23, 59, 59, 999));
            break;

        case 'personnalise':
            startDate = new Date(`${this.dateDebut}T00:00:00.000Z`);
            endDate = new Date(`${this.dateFin}T23:59:59.999Z`);
            break;

        default:
            // Par défaut, aujourd'hui
            startDate = new Date(currentDate.setHours(0, 0, 0, 0));
            endDate = new Date(currentDate.setHours(23, 59, 59, 999));
    }

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    };
}


  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }


  getVisiblePages(): number[] {
    const delta = 2;
    const range: number[] = [];

    // Ajouter les pages autour de la page courante
    const start = Math.max(2, this.currentPage - delta);
    const end = Math.min(this.totalPages - 1, this.currentPage + delta);

    for (let i = start; i <= end; i++) {
        range.push(i);
    }

    // Ajouter une ellipsis au début si nécessaire
    if (start > 2) {
        range.unshift(-1);
    }

    // Ajouter une ellipsis à la fin si nécessaire
    if (end < this.totalPages - 1) {
        range.push(-1);
    }

    return range;
}


  private getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  

  loadHistory(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    const { startDate, endDate } = this.getDateRange();

    console.log('Chargement historique:', {
      periode: this.periodeSelectionnee,
      startDate,
      endDate,
      currentDateTime: this.CURRENT_UTC_DATETIME,
      currentUser: this.CURRENT_USER
    });

    this.historyService.getHistory(undefined, startDate, endDate, this.itemsPerPage, this.currentPage)
      .subscribe({
        next: (data) => {
          this.historyData = data.history;
          this.filteredHistory = data.history;
          this.totalItems = data.pagination.total;
          this.loading = false;
          this.success = 'Historique chargé avec succès';
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'historique:', error);
          this.error = error.message || 'Erreur lors du chargement de l\'historique';
          this.loading = false;
        }
      });
  }

  appliquerFiltres(): void {
    this.currentPage = 1;
    this.loadHistory();
  }

   // Mettre à jour la méthode onPageChange
   onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadHistory();
    }
  }

  onPeriodeChange(event: any): void {
    this.periodeSelectionnee = event.target.value;
    this.afficherDatesPersonnalisees = this.periodeSelectionnee === 'personnalise';
    this.appliquerFiltres();
  }

  exporterDonnees(format: string): void {
    const { startDate, endDate } = this.getDateRange();
  
    let exportObservable: Observable<Blob>;
    if (format === 'csv') {
      exportObservable = this.historyService.exportHistoryToCsv(undefined, startDate, endDate);
    } else if (format === 'excel') {
      exportObservable = this.historyService.exportHistoryToExcel(undefined, startDate, endDate);
    } else if (format === 'pdf') {
      exportObservable = this.historyService.exportHistoryToPdf(undefined, startDate, endDate);
    } else {
      console.error('Format non supporté:', format);
      return;
    }
  
    exportObservable.subscribe({
      next: (blob: Blob) => {
        // Créer un lien pour télécharger le fichier
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historique_${this.getCurrentDateTime().replace(/[: ]/g, '_')}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erreur lors de l\'export des données:', error);
        this.error = 'Erreur lors de l\'export des données';
      },
    });
  }



  private exportCsv(startDate: string, endDate: string): void {
    this.historyService.exportHistoryToCsv(undefined, startDate, endDate)
      .subscribe({
        next: (blob) => {
          this.loading = false;
          this.success = 'Export CSV réussi';
          // Le téléchargement est géré automatiquement par le service
        },
        error: (error) => {
          console.error('Erreur lors de l\'export CSV:', error);
          this.error = 'Erreur lors de l\'export CSV';
          this.loading = false;
        }
      });
  }


  private exportExcel(startDate: string, endDate: string): void {
    this.historyService.exportHistoryToExcel(undefined, startDate, endDate)
      .subscribe({
        next: (blob) => {
          this.loading = false;
          this.success = 'Export Excel réussi';
          // Le téléchargement est géré automatiquement par le service
        },
        error: (error) => {
          console.error('Erreur lors de l\'export Excel:', error);
          this.error = 'Erreur lors de l\'export Excel';
          this.loading = false;
        }
      });
  }



  getPaginationPages(): number[] {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  formatData(data: any): string {
    if (!data) return '';
  
    // Ajouter les informations système
    const systemInfo = {
      timestamp: this.getCurrentDateTime(), // Utilise la date actuelle
      user: this.CURRENT_USER
    };
  
    const enrichedData = { ...data, system: systemInfo };
  
    // Traductions
    const translations: { [key: string]: string } = {
      timestamp: 'Date et heure',
      user: 'Utilisateur',
      updatedAt: 'Mis à jour le',
      updatedBy: 'Mis à jour par',
      createdAt: 'Créé le',
      createdBy: 'Créé par'
    };
  
    return Object.entries(enrichedData)
      .map(([key, value]) => {
        const translatedKey = translations[key] || key;
  
        // Formater les dates
        if (value instanceof Date || (typeof value === 'string' && value.includes('T'))) {
          const date = new Date(value);
          return `${translatedKey}: ${date.toLocaleString('fr-FR', { timeZone: 'UTC' })}`;
        }
  
        // Formater les objets
        if (typeof value === 'object' && value !== null) {
          return `${translatedKey}: ${JSON.stringify(value)}`;
        }
  
        return `${translatedKey}: ${value}`;
      })
      .join(', ');
  }
}