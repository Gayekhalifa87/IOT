// src/app/models/cost.model.ts
export interface Cost {
    _id?: string; // Optionnel car généré par MongoDB
    type: string;
    description: string;
    amount: number;
    date: Date;
    dynamicData?: Map<string, string>; // Optionnel
    createdAt?: Date; // Optionnel car généré par MongoDB
    updatedAt?: Date; // Optionnel car généré par MongoDB
    profitabilityDetails?: {
      numberOfChickens: number;
      purchaseCost: number;
      feedCost: number;
      otherCosts: number;
      totalCost: number;
      costPerUnit: number;
      totalRevenue: number;
      profit: number;
      profitPerUnit: number;
      sales: { quantity: number; unitPrice: number }[];
    };
    userId?: string;
  }



// Dans un fichier séparé (models/calculations.model.ts)

export interface FeedCalculationResult {
  results: any; // Replace 'any' with the correct type if available
  totals: {
    totalFeedConsumptionKg: number;
    totalBagsNeeded: number;
    totalCostFCFA: number;
  };
  calculatedAt: Date;
}

export interface ProfitabilityCalculation {
  revenue: number;
  costs: number;
  profitability: number;
  calculatedAt: Date;
}

export interface ProductionUpdate {
  totalProduction: number;
  deaths: number;
  updatedProduction: number;
  updatedAt: Date;
}


// Interface pour les statistiques de rentabilité
export interface ProfitabilityStats {
  profit: number;             // Bénéfice/perte en valeur absolue (FCFA)
  profitMargin: number;       // Marge bénéficiaire en pourcentage
  returnOnInvestment: number; // Retour sur investissement en pourcentage
  status: string;             // 'Bénéfice' ou 'Perte'
}

// Interface pour le calcul de rentabilité
export interface ProfitabilityCalculation {
  revenue: number;           // Revenus (FCFA)
  costs: number;             // Coûts (FCFA)
  result: number;            // Rentabilité calculée (%)
  profit?: number;           // Bénéfice/perte (FCFA)
  profitMargin?: number;     // Marge bénéficiaire (%)
  chickPrice?: number;       // Prix d'achat par poussin (FCFA)
  sellingPricePerKg?: number; // Prix de vente par kg (FCFA)
  averageWeightKg?: number;   // Poids moyen d'un poulet (kg)
  mortalityRate?: number;     // Taux de mortalité (%)
  feedCost?: number;          // Coût total d'alimentation (FCFA)
  otherCostsPerChicken?: number; // Autres coûts par poulet (FCFA)
}