import Dexie, { type Table } from 'dexie';

export interface WeeklyEarning {
  id?: number;
  week_no: number;
  start_date: string;
  end_date: string;
  total_earnings: number;
  total_hours: number;
  deliveries: number;
  tips: number;
  platform_id: string;
  active_days?: number;
  miles?: number;
}

export interface Shift {
  id?: number;
  date: string;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  duration_hrs: number;
  platform_id: string;
  vehicle_id?: number;
  gross_earnings: number;
  tips: number;
  bonus: number;
  deliveries: number;
  distance: number;
  online_hrs?: number;
  active_hrs?: number;
  weather?: string;
  zone?: string;
  mood?: string;
  notes?: string;
  is_deleted?: number; // 0/1 for soft delete
  deleted_at?: string;
}

export interface Platform {
  id: string;
  name: string;
  color: string;
  logo: string;
  terminology: {
    driver: string;
    task: string;
  };
  active: number;
}

export interface Vehicle {
  id?: number;
  name: string;
  type: 'gas' | 'ev' | 'bike' | 'scooter' | 'hybrid' | 'foot';
  efficiency: number; // MPG, L/100km, or kWh/100km
  efficiencyUnit: string;
  fuelPrice?: number;
  engineDisplacement?: string;
  electricityRate?: number;
  maintenanceCostPerKm?: number;
  isDefault: boolean;
}

export interface ExpenseCategory {
  id?: number;
  name: string;
  icon?: string;
}

export interface Expense {
  id?: number;
  date: string;
  amount: number;
  category_id: number;
  platform_id?: string;
  description: string;
  businessPercentage: number;
  receiptImage?: string; // base64
}

export interface Setting {
  key: string;
  value: any;
}

export class MacadamDatabase extends Dexie {
  weekly_earnings!: Table<WeeklyEarning>;
  expense_categories!: Table<ExpenseCategory>;
  expenses!: Table<Expense>;
  settings!: Table<Setting>;
  platforms!: Table<Platform>;
  vehicles!: Table<Vehicle>;
  shifts!: Table<Shift>;

  constructor() {
    super('MacadamVault');
    this.version(5).stores({
      weekly_earnings: '++id, week_no, start_date, end_date, platform_id',
      expense_categories: '++id, &name',
      expenses: '++id, date, category_id, platform_id',
      settings: 'key',
      platforms: 'id, name, active',
      vehicles: '++id, name, type, isDefault',
      shifts: '++id, date, platform_id, is_deleted'
    }).upgrade(tx => {
        // Upgrade logic if needed for version 3
    });

    this.on('populate', async () => {
      await this.expense_categories.bulkAdd([
        { name: 'Fuel', icon: '⛽' },
        { name: 'Maintenance', icon: '🔧' },
        { name: 'Supplies', icon: '🎒' },
        { name: 'Insurance', icon: '🛡' },
        { name: 'Phone/Data', icon: '📱' },
        { name: 'Taxes/Fees', icon: '📊' }
      ]);
      
      await this.settings.bulkAdd([
        { key: 'currency_symbol', value: '$' },
        { key: 'default_range', value: 'all' },
        { key: 'app_name', value: 'Macadam' },
        { key: 'distance_unit', value: 'km' }
      ]);
    });
  }

  async getSetting(key: string, defaultValue: any = null) {
    try {
      const setting = await this.settings.get(key);
      return setting ? setting.value : defaultValue;
    } catch (err) {
      console.error(`Error fetching setting ${key}:`, err);
      return defaultValue;
    }
  }

  async setSetting(key: string, value: any) {
    try {
      localStorage.setItem(key, value);
      await this.settings.put({ key, value });
    } catch (err) {
      console.error(`Error saving setting ${key}:`, err);
    }
  }

  async getTerminology() {
    const activePlatforms = await this.platforms.where('active').equals(1).toArray();
    if (activePlatforms.length === 1) {
      return activePlatforms[0].terminology;
    }
    // Default to neutral terms if multi-platform or none
    return { driver: 'Driver', task: 'Delivery' };
  }
}

export const db = new MacadamDatabase();
