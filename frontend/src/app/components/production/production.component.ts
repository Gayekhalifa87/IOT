import { Component, OnInit } from '@angular/core';
import { CostService } from '../../services/cost.service';
import { ProductionService } from '../../services/production.service';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Production } from '../../models/production.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';


interface FeedRequirement {
  totalFeedConsumptionKg: number;
  bagsNeeded: number;
  totalCostFCFA: number;
}

interface FeedRequirements {
  demarrage: FeedRequirement;
  croissance: FeedRequirement;
  finition: FeedRequirement;
}


interface ProfitabilityStats {
  profit: number;             // Bénéfice/perte en valeur absolue (FCFA)
  profitMargin: number;       // Marge bénéficiaire en pourcentage
  returnOnInvestment: number; // Retour sur investissement en pourcentage
  status: string;             // 'Bénéfice' ou 'Perte'
}


interface ProfitabilityCalculation {
  revenue: number;
  costs: number;
  result: number;
  profit: number;  // Retiré le caractère optionnel ?
  profitMargin?: number;
  chickPrice?: number;
  sellingPricePerKg?: number;
  averageWeightKg?: number;
  mortalityRate?: number;
  feedCost?: number;
  otherCostsPerChicken?: number;
  totalRevenue: number;  // Retiré le caractère optionnel ?
  totalCosts: number;    // Retiré le caractère optionnel ?
}


interface ProductionManagement {
  totalProduction: number;
  deaths: number;
  updatedProduction: number;
  chickenCount: number; // Ajoutez cette propriété
  mortality: number;    // Ajoutez cette propriété
}


interface FeedCalculation {
  chickenCount: number;
  numberOfWeeks: number;
  result: FeedRequirements;
  totalFeedConsumptionKg: number;
  totalBagsNeeded: number;
  totalCostFCFA: number;
  bagsRequired: number;
  estimatedMortality?: number; // Add this
  survivingChickens?: number;  // Add this
}


interface ProfitabilityParams {
  numberOfChickens: number;
  chickPrice: number;
  feedCost: number;
  otherCosts: number;
  sellingPricePerUnit: number;
}


interface ProfitabilityResults {
  numberOfChickens: number;
  purchaseCost: number;
  feedCost: number;
  otherCosts: number;
  totalCost: number;
  costPerUnit: number;
  totalRevenue: number;
  profit: number;
  profitPerUnit: number;
}

@Component({
  selector: 'app-production',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './production.component.html',
  styleUrls: ['./production.component.css'],
})
export class ProductionComponent implements OnInit {
  productions: any[] = [];
  costStats: any[] = [];
  productionStats: any = null;
  totalCosts: any = null;
  loading = true;
  error: string | null = null;
  showEditModal = false;
  editingProduction: any = null;
  editForm: any = null;
  isAdding = true;

  
  
  paginatedProductions: any[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 3;
  totalPages: number = 0;
  

  totalChickCost: number = 0; // Coût total des poussins


  public totalFeedCost: number = 0;  // Coût total de l'alimentation
  public totalOtherCosts: number = 0; // Autres coûts totaux



  //detailler les calculs
  public totalExpenses: number = 0;
  public totalRevenue: number = 0;
  public profit: number = 0; // Pour stocker le bénéfice


  showResults = false;

   // Méthode pour synchroniser les valeurs
   onChickenCountChange(value: number) {
    this.feedCalculation.chickenCount = value;
    this.profitabilityParams.numberOfChickens = value; // Synchroniser la valeur
  }

  public profitabilityStats: any = null;
  public successMessage: string | null = null;

  dashboardStats: any = {
    profit: 0
  };

  // Propriétés pour les notifications
  showNotificationBar = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'info' = 'info';

  profitabilityParams = {
    numberOfChickens: 0,
    chickPrice: 0,
    feedCost: 0,
    otherCosts: 0,
    sales: [{ quantity: 0, unitPrice: 0 }] // Tableau pour les ventes
  };

  profitabilityResults: ProfitabilityResults | null = null;

  // Propriétés pour les calculs
  feedCalculation = {
    chickenCount: 0,
    numberOfWeeks: 0,
    result: {
      demarrage: { totalFeedConsumptionKg: 0, bagsNeeded: 0, totalCostFCFA: 0 },
      croissance: { totalFeedConsumptionKg: 0, bagsNeeded: 0, totalCostFCFA: 0 },
      finition: { totalFeedConsumptionKg: 0, bagsNeeded: 0, totalCostFCFA: 0 }
    } as FeedRequirements,
    totalFeedConsumptionKg: 0,
    totalBagsNeeded: 0,
    totalCostFCFA: 0,
    bagsRequired: 0,
    estimatedMortality: 0, // Initialize this
    survivingChickens: 0  // Initialize this
  };


  profitabilityCalculation: ProfitabilityCalculation = {
    revenue: 0,
    costs: 0,
    result: 0,
    profit: 0,           // Initialisé à 0
    profitMargin: 0,     // Initialisé à 0
    chickPrice: 0,
    sellingPricePerKg: 0,
    averageWeightKg: 0,
    mortalityRate: 0,
    feedCost: 0,
    otherCostsPerChicken: 0,
    totalRevenue: 0,     // Initialisé à 0
    totalCosts: 0        // Initialisé à 0
  };

  

  // Propriétés pour la gestion de la production
  productionManagement: ProductionManagement = {
  totalProduction: 0,
  deaths: 0,
  updatedProduction: 0,
  chickenCount: 0, // Initialisez cette propriété
  mortality: 0,    // Initialisez cette propriété
};

  feedBagSize = 50;
  feedPrices: { [key: string]: number | undefined } = { 'demarrage': undefined, 'croissance': undefined, 'finition': undefined }; // Champs vides par défaut
  defaultFeedPrices: { [key: string]: number } = { 'demarrage': 15000, 'croissance': 17000, 'finition': 18000 }; // Valeurs par défaut pour placeholders

  constructor(
    private costService: CostService,
    private productionService: ProductionService,
    private dialog: MatDialog
    
  ) {}

  // 1. Vérifiez que votre service renvoie bien des données
  ngOnInit() {
    this.loadDashboardData();
    
    // Ajoutez un log pour vérifier si des données sont récupérées
    this.productionService.getAllProductions().subscribe(data => {
      console.log('Productions récupérées:', data);
    });
  }
/* 
  loadDashboardData() {
    this.loading = true;
    this.error = null;
  
    forkJoin({
      productions: this.productionService.getAllProductions(),
      costStats: this.costService.getCostStats(),
      productionStats: this.productionService.getProductionStats(),
      totalCosts: this.costService.calculateTotalCosts(),
      costHistory: this.costService.getCostHistory(undefined, undefined, 20) // Récupérer l'historique des coûts
    }).subscribe({
      next: (data) => {
        // Gérer les productions
        this.productions = data.productions;
  
        // Récupérer la dernière production pour les statistiques
        const lastProduction = data.productions[data.productions.length - 1];
  
        // Mettre à jour les statistiques de production
        this.productionStats = {
          totalProduction: lastProduction ? lastProduction.chickenCount : 0,
          totalMortality: lastProduction ? lastProduction.mortality : 0
        };
  
        // Mettre à jour le formulaire de gestion de production avec les dernières valeurs
        this.productionManagement = {
          totalProduction: lastProduction ? lastProduction.chickenCount + lastProduction.mortality : 0,
          deaths: lastProduction ? lastProduction.mortality : 0,
          updatedProduction: lastProduction ? lastProduction.chickenCount : 0,
          chickenCount: lastProduction ? lastProduction.chickenCount : 0,
          mortality: lastProduction ? lastProduction.mortality : 0
        };
  
        // Mettre à jour les autres statistiques
        this.costStats = data.costStats;
        this.totalCosts = data.totalCosts;
  
        // Mettre à jour les calculs depuis l'historique
        this.updateCalculationsFromHistory(data.costHistory);
  
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Une erreur est survenue lors du chargement des données';
        this.loading = false;
        console.error(err);
      }
    });
  } */


    loadDashboardData() {
      this.loading = true;
      forkJoin({
        productions: this.productionService.getAllProductions(),
        costStats: this.costService.getCostStats(),
        productionStats: this.productionService.getProductionStats(),
        totalCosts: this.costService.calculateTotalCosts(),
        costHistory: this.costService.getCostHistory(undefined, undefined, 20) // Récupérer les derniers coûts
      }).subscribe({
        next: (data) => {
          // Mise à jour des productions et pagination
          this.productions = data.productions;
          this.paginatedProductions = this.productions.slice(0, this.itemsPerPage);
          this.totalPages = Math.ceil(this.productions.length / this.itemsPerPage);
          this.productionStats = data.productionStats;
          this.totalCosts = data.totalCosts;
          this.costStats = data.costStats;
    
          // Récupérer la dernière production pour initialiser productionManagement
          const lastProduction = this.productions[this.productions.length - 1];
          if (lastProduction) {
            this.productionManagement = {
              totalProduction: lastProduction.chickenCount + lastProduction.mortality,
              deaths: lastProduction.mortality,
              updatedProduction: lastProduction.chickenCount,
              chickenCount: lastProduction.chickenCount,
              mortality: lastProduction.mortality
            };
            this.feedCalculation.chickenCount = lastProduction.chickenCount;
            this.profitabilityParams.numberOfChickens = lastProduction.chickenCount;
          }
    
          // Récupérer le dernier calcul de besoins en alimentation depuis costHistory
          const lastFeedCalc = data.costHistory
            .filter(cost => cost.type === 'feed_calculation')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
            if (lastFeedCalc && lastFeedCalc.dynamicData) {
              const dynamicData = lastFeedCalc.dynamicData instanceof Map
                ? this.mapToObject(lastFeedCalc.dynamicData)
                : lastFeedCalc.dynamicData;
            
              this.feedCalculation = {
                chickenCount: parseInt(dynamicData['chickenCount'], 10) || 0,
                numberOfWeeks: parseInt(dynamicData['numberOfWeeks'], 10) || 0,
                totalFeedConsumptionKg: parseFloat(dynamicData['totalFeedConsumptionKg']) || 0,
                totalBagsNeeded: parseInt(dynamicData['totalBagsNeeded'], 10) || 0,
                totalCostFCFA: parseFloat(dynamicData['totalCostFCFA']) || 0,
                survivingChickens: parseInt(dynamicData['survivingChickens'], 10) || 0,
                estimatedMortality: (parseInt(dynamicData['chickenCount'], 10) || 0) - (parseInt(dynamicData['survivingChickens'], 10) || 0),
                bagsRequired: 0,
                result: this.feedCalculation.result
              };

              this.feedPrices = {
                demarrage: dynamicData['demarragePrice'] !== undefined ? parseFloat(dynamicData['demarragePrice']) : undefined,
                croissance: dynamicData['croissancePrice'] !== undefined ? parseFloat(dynamicData['croissancePrice']) : undefined,
                finition: dynamicData['finitionPrice'] !== undefined ? parseFloat(dynamicData['finitionPrice']) : undefined
              };
    
            // Restaurer profitabilityParams.feedCost et numberOfChickens
            this.profitabilityParams.feedCost = this.feedCalculation.totalCostFCFA;
            this.profitabilityParams.numberOfChickens = this.feedCalculation.survivingChickens;
    
            // Optionnel : Restaurer les prix si stockés dans la BDD
            // Si vous voulez stocker les prix utilisés dans dynamicData, ajoutez-les dans saveFeedCalculation()
          }
    
          // Mettre à jour les résultats de rentabilité (si applicable)
          this.updateCalculationsFromHistory(data.costHistory);
    
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.showNotification('Erreur lors du chargement des données', 'error');
        }
      });
    }

  
    updatePaginatedProductions() {
      const startIndex = (this.currentPage - 1) * this.itemsPerPage;
      this.paginatedProductions = this.productions.slice(startIndex, startIndex + this.itemsPerPage);
      console.log('Productions paginées:', this.paginatedProductions); // Log des productions paginées
    }

    changePage(page: number) {
      console.log('Changement de page à :', page);
      if (page < 1 || page > this.totalPages) return; // Vérifiez les limites
      this.currentPage = page;
      this.updatePaginatedProductions();
    }

    get pageNumbers(): number[] {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }




  // Méthode pour afficher une notification
private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  this.notificationMessage = message;
  this.notificationType = type;
  this.showNotificationBar = true;

  // Fermer automatiquement la notification après 5 secondes
  setTimeout(() => {
    this.showNotificationBar = false;
  }, 5000);
}


  // Méthode pour ajouter une nouvelle vente
  addSale() {
    this.profitabilityParams.sales.push({ quantity: 0, unitPrice: 0 });
  }


  // Méthode pour supprimer une vente
  removeSale(index: number) {
    this.profitabilityParams.sales.splice(index, 1);
  }


  // // Add these methods to the class
exportResultsToCSV(): void {
  // Existing implementation from line 320-329
  // This is already in your component but not declared properly
}



exportProfitabilityToCSV(): void {
  const headers = ['Métrique', 'Valeur'];
  const data = [
    ['Revenus totaux', this.profitabilityCalculation?.totalRevenue?.toString() || '0'],
    ['Coûts totaux', this.profitabilityCalculation?.totalCosts?.toString() || '0'],
    ['Profit', this.profitabilityStats?.profit?.toString() || '0'],
    ['Marge de profit (%)', this.profitabilityStats?.profitMargin?.toString() || '0']
  ];
  
  this.exportToCSV(data, headers, 'rentabilite_poulailler.csv');
}


private exportToCSV(data: any[], headers: string[], filename: string): void {
  let csvContent = headers.join(',') + '\n';

  data.forEach(row => {
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  link.click();
  document.body.removeChild(link);
}
  
  // If you don't already have this utility method, add it too
  // private exportToCSV(data: any[], headers: string[], filename: string): void {
  //   let csvContent = headers.join(',') + '\n';
    
  //   data.forEach(row => {
  //     csvContent += row.join(',') + '\n';
  //   });
    
  //   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  //   const link = document.createElement('a');
  //   const url = URL.createObjectURL(blob);
    
  //   link.setAttribute('href', url);
  //   link.setAttribute('download', filename);
  //   link.style.visibility = 'hidden';
    
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // }
  



  private updateCalculationsFromHistory(costHistory: any[]) {
    if (!costHistory || costHistory.length === 0) return;
  
    console.log('Cost history:', costHistory);
  
    // Trouver le dernier calcul de rentabilité
    const lastProfitCalc = costHistory
      .filter(cost => cost.type === 'profitability_calculation')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
    console.log('Last profitability calculation:', lastProfitCalc);
  
    // Mettre à jour les données de calcul de rentabilité
    if (lastProfitCalc) {
      // Récupérer dynamicData, que ce soit un objet ou une Map
      let dynamicData: any = lastProfitCalc.dynamicData;
  
      // Si dynamicData est une Map, on la convertit en objet pour faciliter l'accès
      if (dynamicData instanceof Map) {
        const obj: any = {};
        dynamicData.forEach((value, key) => {
          obj[key] = value;
        });
        dynamicData = obj;
      } else if (typeof dynamicData !== 'object' || dynamicData === null) {
        // Si dynamicData n'est pas un objet, on initialise un objet vide
        dynamicData = {};
      }
  
      console.log('Profitability dynamic data:', dynamicData);
  
      // Mettre à jour profitabilityCalculation
      this.profitabilityCalculation = {
        ...this.profitabilityCalculation,
        revenue: parseFloat(dynamicData.totalRevenue) || 0,
        costs: parseFloat(dynamicData.totalCosts) || 0,
        profit: parseFloat(dynamicData.profit) || 0,
        profitMargin: parseFloat(dynamicData.profitMargin) || 0,
        totalRevenue: parseFloat(dynamicData.totalRevenue) || 0,
        totalCosts: parseFloat(dynamicData.totalCosts) || 0
      };
  
      console.log('Updated Profitability Calculation:', this.profitabilityCalculation);
    }
  }

  
  
  calculateFeedRequirements() {
    const { chickenCount, numberOfWeeks } = this.feedCalculation;

    if (chickenCount <= 0 || numberOfWeeks <= 0 || numberOfWeeks < 4 || numberOfWeeks > 10) {
      this.showNotification('Veuillez entrer des valeurs valides (4 à 10 semaines)', 'error');
      return;
    }

    const mortalityRates = {
      demarrage: 0.01,
      croissance: 0.003,
      finition: 0.002
    };

    const feedRates = {
      demarrage: [0.02, 0.03, 0.04],
      croissance: [0.06, 0.07, 0.08],
      finition: [0.10, 0.11, 0.12]
    };

    let survivingChickens = chickenCount;
    let totalFeedConsumptionKg = 0;
    let totalBagsNeeded = 0;
    let totalCostFCFA = 0;
    const phaseResults: FeedRequirements = {
      demarrage: { totalFeedConsumptionKg: 0, bagsNeeded: 0, totalCostFCFA: 0 },
      croissance: { totalFeedConsumptionKg: 0, bagsNeeded: 0, totalCostFCFA: 0 },
      finition: { totalFeedConsumptionKg: 0, bagsNeeded: 0, totalCostFCFA: 0 }
    };

    for (let week = 1; week <= numberOfWeeks; week++) {
      let phase: keyof FeedRequirements;
      let weekInPhase: number;
      let mortalityRate: number;

      if (week <= 3) {
        phase = 'demarrage';
        weekInPhase = week - 1;
        mortalityRate = mortalityRates.demarrage;
      } else if (week <= 6) {
        phase = 'croissance';
        weekInPhase = week - 4;
        mortalityRate = mortalityRates.croissance;
      } else {
        phase = 'finition';
        weekInPhase = week - 7;
        mortalityRate = mortalityRates.finition;
      }

      const dailyFeed = feedRates[phase][Math.min(weekInPhase, feedRates[phase].length - 1)];
      const weeklyFeed = survivingChickens * dailyFeed * 7;
      phaseResults[phase].totalFeedConsumptionKg += weeklyFeed;

      if (week < numberOfWeeks) {
        survivingChickens *= (1 - mortalityRate);
      }
    }

    for (const phase in phaseResults) {
      const p = phase as keyof FeedRequirements;
      phaseResults[p].bagsNeeded = Math.ceil(phaseResults[p].totalFeedConsumptionKg / this.feedBagSize);
      const phasePrice = this.feedPrices[p] !== undefined ? this.feedPrices[p] : this.defaultFeedPrices[p];
      phaseResults[p].totalCostFCFA = phaseResults[p].bagsNeeded * (phasePrice || 0); // Gestion de undefined
      totalFeedConsumptionKg += phaseResults[p].totalFeedConsumptionKg;
      totalBagsNeeded += phaseResults[p].bagsNeeded;
      totalCostFCFA += phaseResults[p].totalCostFCFA;
    }

    this.feedCalculation.result = phaseResults;
    this.feedCalculation.totalFeedConsumptionKg = totalFeedConsumptionKg;
    this.feedCalculation.totalBagsNeeded = totalBagsNeeded;
    this.feedCalculation.totalCostFCFA = totalCostFCFA;
    this.feedCalculation.survivingChickens = Math.floor(survivingChickens);
    this.feedCalculation.estimatedMortality = chickenCount - this.feedCalculation.survivingChickens;

    this.profitabilityParams.feedCost = totalCostFCFA;
    this.profitabilityParams.numberOfChickens = this.feedCalculation.survivingChickens;

    this.showResults = true;
    setTimeout(() => {
      this.showResults = false;
    }, 5000);

    this.saveFeedCalculation();
  }



  private saveFeedCalculation() {
  const production: Production = {
    chickenCount: this.feedCalculation.chickenCount,
    mortality: this.feedCalculation.estimatedMortality || 0
  };

  const dynamicData = new Map<string, string>([
    ['chickenCount', this.feedCalculation.chickenCount.toString()],
    ['numberOfWeeks', this.feedCalculation.numberOfWeeks.toString()],
    ['totalFeedConsumptionKg', this.feedCalculation.totalFeedConsumptionKg.toString()],
    ['totalBagsNeeded', this.feedCalculation.totalBagsNeeded.toString()],
    ['totalCostFCFA', this.feedCalculation.totalCostFCFA.toString()],
    ['survivingChickens', this.feedCalculation.survivingChickens.toString()]
  ]);

  this.productionService.addProduction(production).subscribe({
    next: () => {
      this.costService.addCost({
        type: 'feed_calculation',
        description: `Calcul pour ${this.feedCalculation.chickenCount} volailles`,
        amount: this.feedCalculation.totalCostFCFA,
        date: new Date(), // Ajout de la propriété date
        dynamicData
      }).subscribe({
        next: () => this.loadDashboardData(),
        error: (err) => this.showNotification('Erreur lors de la sauvegarde', 'error')
      });
    },
    error: (err) => this.showNotification('Erreur lors de la sauvegarde de la production', 'error')
  });
}


  addProduction() {
    const { chickenCount, mortality } = this.productionManagement;
    const production: Production = {
      chickenCount,
      mortality
    };

    this.productionService.addProduction(production).subscribe({
      next: (savedProduction) => {
        console.log('Production ajoutée:', savedProduction);
        this.loadDashboardData();
        this.isAdding = false; // Changer l'état du bouton en "Modifier"
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout de la production:', error);
      }
    });
  }
  


  editProduction(production: Production) {
    this.editingProduction = production;
    this.editForm = {
      chickenCount: production.chickenCount,
      mortality: production.mortality
    };
    this.showEditModal = true;
  }


  saveEditedProduction() {
    if (!this.editingProduction?._id) return;

    const updatedProduction: Production = {
      ...this.editingProduction,
      ...this.editForm,
      updatedAt: new Date('2025-02-27 23:38:11')
    };

    this.productionService.updateProduction(this.editingProduction._id, updatedProduction).subscribe({
      next: (updated) => {
        // Mettre à jour la liste des productions
        this.productions = this.productions.map(p =>
          p._id === updated._id ? updated : p
        );
        this.showEditModal = false;
        this.editingProduction = null;
        this.loadDashboardData(); // Recharger les données
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour:', error);
        // Gérer l'erreur (afficher un message à l'utilisateur)
      }
    });
  }

  

  deleteProduction(production: Production) {
    if (!production._id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmer la suppression',
        message: 'Êtes-vous sûr de vouloir supprimer cette production ?',
        confirmButtonText: 'Supprimer',
        cancelButtonText: 'Annuler',
        confirmButtonIcon: 'delete',
        confirmButtonColor: '#f44336' // Rouge pour l'action de suppression
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.productionService.deleteProduction(production._id!).subscribe({
          next: () => {
            this.productions = this.productions.filter(p => p._id !== production._id);
            this.loadDashboardData(); // Recharger les données
            this.showNotification('Production supprimée avec succès', 'success');
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            this.showNotification('Erreur lors de la suppression de la production', 'error');
          }
        });
      }
    });
  }

  cancelEdit() {
    this.showEditModal = false;
    this.editingProduction = null;
  }



  // Fonction utilitaire pour calculer les besoins pour chaque phase
  private calculatePhaseRequirements(phase: keyof FeedRequirements, chickenCount: number, weeks: number): FeedRequirement {
    const dailyFeedPerChicken: { [key in keyof FeedRequirements]: number } = {
      'demarrage': 0.035,
      'croissance': 0.07,
      'finition': 0.12
    };
  
    let phaseDuration: number;
    if (phase === 'demarrage') {
      phaseDuration = Math.min(weeks, 3);
    } else if (phase === 'croissance') {
      phaseDuration = weeks <= 3 ? 0 : Math.min(weeks - 3, 3);
    } else {
      phaseDuration = weeks <= 6 ? 0 : weeks - 6;
    }
  
    phaseDuration = Math.max(0, phaseDuration);
  
    const totalFeedConsumptionKg = chickenCount * dailyFeedPerChicken[phase] * phaseDuration * 7;
    const bagsNeeded = Math.ceil(totalFeedConsumptionKg / this.feedBagSize);
    const phasePrice = this.feedPrices[phase] ?? this.defaultFeedPrices[phase]; // Utilisation de ?? pour une valeur par défaut
    const totalCostFCFA = bagsNeeded * phasePrice;
  
    return {
      totalFeedConsumptionKg,
      bagsNeeded,
      totalCostFCFA
    };
  }



  private calculatePhaseRequirementsWithMortality(
    phase: keyof FeedRequirements,
    initialChickenCount: number,
    totalWeeks: number,
    weeklyMortalityRate: number
  ): FeedRequirement {
    const dailyFeedPerChicken: { [key in keyof FeedRequirements]: number } = {
      'demarrage': 0.035,
      'croissance': 0.07,
      'finition': 0.12
    };
  
    let startWeek = 0;
    let endWeek = 0;
  
    if (phase === 'demarrage') {
      startWeek = 1;
      endWeek = Math.min(totalWeeks, 3);
    } else if (phase === 'croissance') {
      startWeek = 4;
      endWeek = Math.min(totalWeeks, 6);
    } else {
      startWeek = 7;
      endWeek = totalWeeks;
    }
  
    let phaseDuration = Math.max(0, endWeek - startWeek + 1);
  
    if (startWeek > totalWeeks) {
      return {
        totalFeedConsumptionKg: 0,
        bagsNeeded: 0,
        totalCostFCFA: 0
      };
    }
  
    let totalFeedConsumptionKg = 0;
    let currentChickenCount = initialChickenCount;
  
    for (let week = startWeek; week <= endWeek; week++) {
      if (week > 1) {
        currentChickenCount *= (1 - weeklyMortalityRate);
      }
      const weeklyConsumption = currentChickenCount * dailyFeedPerChicken[phase] * 7;
      totalFeedConsumptionKg += weeklyConsumption;
    }
  
    currentChickenCount = Math.floor(currentChickenCount);
    const bagsNeeded = Math.ceil(totalFeedConsumptionKg / this.feedBagSize);
    const phasePrice = this.feedPrices[phase] ?? this.defaultFeedPrices[phase]; // Utilisation de ?? pour une valeur par défaut
    const totalCostFCFA = bagsNeeded * phasePrice;
  
    return {
      totalFeedConsumptionKg,
      bagsNeeded,
      totalCostFCFA
    };
  }

  // Calculer la rentabilité
  calculateProfitability() {
    const { numberOfChickens, chickPrice, feedCost, otherCosts, sales } = this.profitabilityParams;
  
    const totalSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    if (totalSold > numberOfChickens) {
      this.showNotification('Le nombre total de volailles vendues dépasse le nombre disponible', 'error');
      return;
    }
  
    const purchaseCost = numberOfChickens * chickPrice;
    const totalCosts = purchaseCost + (feedCost || 0) + (otherCosts || 0);
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.quantity * sale.unitPrice, 0);
    const profit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  
    this.profitabilityResults = {
      numberOfChickens,
      purchaseCost,
      feedCost: feedCost || 0,
      otherCosts: otherCosts || 0,
      totalCost: totalCosts,
      costPerUnit: totalCosts / numberOfChickens,
      totalRevenue,
      profit,
      profitPerUnit: profit / numberOfChickens
    };
  
    this.profitabilityCalculation = {
      ...this.profitabilityCalculation,
      totalRevenue,
      totalCosts,
      profit,
      profitMargin
    };
  
    // Préparer dynamicData avec toutes les informations
    const dynamicData = new Map<string, string>([
      ['numberOfChickens', numberOfChickens.toString()],
      ['purchaseCost', purchaseCost.toString()],
      ['feedCost', (feedCost || 0).toString()],
      ['otherCosts', (otherCosts || 0).toString()],
      ['totalRevenue', totalRevenue.toString()],
      ['profit', profit.toString()],
      ['profitMargin', profitMargin.toString()],
      ['sales', JSON.stringify(sales)] // Stocker les ventes comme chaîne JSON
    ]);
  
    this.costService.addCost({
      type: 'profitability_calculation',
      description: `Rentabilité pour ${numberOfChickens} volailles`,
      amount: totalCosts,
      date: new Date(), // Ajout de la propriété date
      dynamicData
    }).subscribe({
      next: () => this.loadDashboardData(),
      error: (err) => this.showNotification('Erreur lors de la sauvegarde', 'error')
    });
  }


  areFeedPricesFilled(): boolean {
    return (
      this.feedPrices['demarrage'] !== undefined &&
      this.feedPrices['croissance'] !== undefined &&
      this.feedPrices['finition'] !== undefined
    );
  }


  private prepareMapForMongoDB(map: Map<string, string>): { [key: string]: string } {
    const obj: { [key: string]: string } = {};
    map.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  private mapToObject(map: Map<string, string>): { [key: string]: string } {
    const obj: { [key: string]: string } = {};
    map.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  // Mettre à jour la production en fonction des décès
  updateProduction() {
    this.productionManagement.updatedProduction =
      this.productionManagement.totalProduction - this.productionManagement.deaths;
    
    // Mettre à jour la production totale dans les cartes
    this.productionStats = {
      ...this.productionStats,
      totalProduction: this.productionManagement.updatedProduction,
    };
  }


  preventNegative(event: KeyboardEvent) {
    const inputValue = (event.target as HTMLInputElement).value;
    const forbiddenKeys = ['-', '+', 'e', 'E', '.', ' ']; // Ajoutez d'autres caractères spéciaux ici
  
    // Vérifiez si la touche pressée est dans la liste des caractères interdits
    if (forbiddenKeys.includes(event.key) || (event.key === '0' && inputValue.length === 0)) {
      event.preventDefault(); // Empêche la saisie
    }
  }
  
  preventSpecialCharacters(event: KeyboardEvent) {
    const forbiddenKeys = ['-', '+', 'e', 'E', '.', ' ']; // Caractères interdits
    if (forbiddenKeys.includes(event.key)) {
      event.preventDefault(); // Empêche la saisie du caractère
    }
  }


  calculateTotalExpenses() {
    const feedCost = this.profitabilityParams.feedCost || 0; // Coût d'alimentation
    const otherCosts = this.profitabilityParams.otherCosts || 0; // Autres coûts
    const chickPrice = this.profitabilityParams.chickPrice || 0; // Prix unitaire des poussins
    const numberOfChickens = this.profitabilityParams.numberOfChickens || 0; // Nombre de poussins
  
    // Calculer le coût total des poussins
    const chickCost = chickPrice * numberOfChickens; // Coût total des poussins
  
    // Total des dépenses
    this.totalExpenses = feedCost + otherCosts + chickCost;
  
    // Mettre à jour les coûts spécifiques
    this.totalFeedCost = feedCost;
    this.totalOtherCosts = otherCosts;
    this.totalChickCost = chickCost; // Ajoutez ceci pour stocker le coût total des poussins
  }
  calculateTotalCosts() {
    const chickPrice = this.profitabilityParams.chickPrice || 0;
    const numberOfChickens = this.profitabilityParams.numberOfChickens || 0;
    const otherCosts = this.profitabilityParams.otherCosts || 0;
  
    // Calculer le coût total des poussins
    this.totalChickCost = chickPrice * numberOfChickens;
  
    // Mettre à jour le coût total d'alimentation et d'autres coûts
    this.totalFeedCost = this.profitabilityParams.feedCost || 0;
    this.totalOtherCosts = otherCosts;
  
    // Mettre à jour le total général si nécessaire
    this.totalExpenses = this.totalFeedCost + this.totalChickCost + this.totalOtherCosts;
  }

 
  

}