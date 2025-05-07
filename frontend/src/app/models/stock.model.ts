// src/app/models/stock.interface.ts
  export interface Stock {
    _id?: string;
    type: string;
    quantity: number;
    unit: string;
    category: string;
    minQuantity: number;
    userId?: string;
    lastUpdated?: Date;
    maxCapacity?: number;
  }
  
  
  export interface StockStats {
    type: string;
    totalQuantity: number;
    unit: string;
  }
  
  export interface History {
    type: string;
    data: any;
    userId: string;
    action: 'create' | 'update' | 'delete';
    description: string;
    createdAt?: Date;
  }

  
  

  export interface LowStockAlert {
    type: string;          // Type de stock (ex: "feed", "water")
    currentStock: number;  // Quantité actuelle en stock
    unit: string;          // Unité de mesure (ex: "kg", "L")
    minQuantity: number;   // Quantité minimale requise
    error?: string;
  }

  