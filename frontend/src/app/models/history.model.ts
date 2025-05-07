export interface History {
    type: 'environmental' | 'feeding' | 'vaccine' | 'production' | 'alert' | 'maintenance' | 'cost' | 'notification' | 'adjustment' | 'stock';
    data: any;
    action: string;
    description: string;
    metadata?: any;
    createdAt?: Date;
    userId?: string;
  }