// feeding.model.ts

export interface BaseModel {
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface WaterSupply {
    startTime: string;
    endTime: string;
    enabled: boolean;
  }
  
  export interface Feeding extends BaseModel {
    quantity: number;
    feedType: string;
    stockQuantity: number;
    waterSupply?: WaterSupply;
    notes?: string;
  }
  
  export interface FeedingHistory extends BaseModel {
    type: 'feeding';
    data: Feeding;
    userId: string;
    action: 'create' | 'update' | 'delete' | 'bulk_create';
    description: string;
  }
  
  export interface FeedingStats {
    _id: string; // feedType
    totalQuantity: number;
    averageQuantity: number;
    count: number;
  }
  
  export interface StockAlert {
    _id: string; // feedType
    currentStock: number;
  }


  export interface FeedingType {
    _id: string;
    name: string;
    unit: string;
    maxQuantity?: number;
  }


  export interface FeedingProgram {
    _id?: string;
    quantity: number;
    feedType: string;
    programStartTime: string;
    programEndTime: string;
    stockId?: string;
    stockQuantity?: number;
    notes?: string;
    automaticFeeding?: boolean;
  }
  
  
  export interface FeedingFilters {
    startDate?: Date;
    endDate?: Date;
    feedType?: string;
    limit?: number;
  }
  
  export interface WaterSupplyUpdate {
    startTime: string;
    endTime: string;
    enabled: boolean;
  }
  
  export class FeedingCreate implements Pick<Feeding, 'quantity' | 'feedType' | 'stockQuantity'> {
    constructor(
      public quantity: number,
      public feedType: string,
      public stockQuantity: number
    ) {}
  }
  
  export class FeedingUpdate implements Partial<Feeding> {
    constructor(
      public quantity?: number,
      public feedType?: string,
      public stockQuantity?: number,
      public waterSupply?: WaterSupply,
      public notes?: string
    ) {}
  }