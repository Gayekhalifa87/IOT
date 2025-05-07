// src/app/models/production.model.ts
export interface Production {
    _id?: string; // Optionnel car généré par MongoDB
    chickenCount: number;
    mortality: number;
    createdAt?: Date; // Optionnel car généré par MongoDB
    updatedAt?: Date; // Optionnel car généré par MongoDB
}



  export interface ProductionStats {
    totalProduction: number;
    totalMortality: number;
  }
  
  export interface CostStats {
    total: number;
    profitability: number;
  }
  
  export interface ProductionDisplay {
    date: Date;
    quantity: number;
    status: string;
    _id: string;
  }