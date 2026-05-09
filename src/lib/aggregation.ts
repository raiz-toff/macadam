import { db, type WeeklyEarning, type Expense } from './db';

export interface VaultSummary {
  total_hours: number;
  total_earnings: number;
  average_rate: number;
  effective_rate: number;
  best_week: { week_no: number; earnings: number } | null;
  worst_week: { week_no: number; earnings: number } | null;
  total_expenses: number;
  total_out_of_pocket: number;
  net_income: number;
  total_deliveries: number;
  avg_deliveries_per_week: number;
  avg_earnings_per_delivery: number;
  total_tips: number;
  tips_percentage: number;
  monthly_rollups: any[];
  ytd: any;
  weekly_data: any[];
  rolling_avg: any[];
  category_breakdown: any[];
}

export async function generateVaultSummary(platformId?: string, startDateStr?: string, endDateStr?: string): Promise<VaultSummary> {
  try {
    let allWeeks = await db.weekly_earnings.toArray();
    let allExpenses = await db.expenses.toArray();

    if (platformId) {
      allWeeks = allWeeks.filter(w => w.platform_id === platformId);
      allExpenses = allExpenses.filter(e => e.platform_id === platformId);
    }

    const start = startDateStr ? new Date(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr) : null;
    
    const isWithinRange = (dateStr: string) => {
      if (!dateStr) return false;
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      } catch {
        return false;
      }
    };

    const filteredWeeks = allWeeks.filter(w => isWithinRange(w.end_date)).sort((a,b) => a.week_no - b.week_no);
    const filteredExpenses = allExpenses.filter(e => isWithinRange(e.date));

    let total_earnings = 0;
    let total_hours = 0;
    let total_tips = 0;
    let total_deliveries = 0;

    let best_week: { week_no: number; earnings: number } | null = null;
    let worst_week: { week_no: number; earnings: number } | null = null;
    
    const weekly_data = filteredWeeks.map(w => {
      const earnings = Number(w.total_earnings) || 0;
      const hours = Number(w.total_hours) || 0;
      const deliveries = Number(w.deliveries) || 0;
      const tips = Number(w.tips) || 0;

      total_earnings += earnings;
      total_hours += hours;
      total_tips += tips;
      total_deliveries += deliveries;

      if (!best_week || earnings > best_week.earnings) {
        best_week = { week_no: w.week_no, earnings };
      }
      if (!worst_week || earnings < worst_week.earnings) {
        worst_week = { week_no: w.week_no, earnings };
      }

      return {
        date: w.end_date,
        earnings: earnings,
        deliveries: deliveries
      };
    });

    let total_expenses = 0;
    filteredExpenses.forEach(e => {
      total_expenses += Number(e.amount) || 0;
    });

    const net_income = total_earnings - total_expenses;

    return {
      total_hours,
      total_earnings,
      average_rate: total_hours > 0 ? total_earnings / total_hours : 0,
      effective_rate: total_hours > 0 ? net_income / total_hours : 0,
      best_week,
      worst_week,
      total_expenses,
      total_out_of_pocket: 0,
      net_income,
      total_deliveries,
      avg_deliveries_per_week: filteredWeeks.length > 0 ? total_deliveries / filteredWeeks.length : 0,
      avg_earnings_per_delivery: total_deliveries > 0 ? total_earnings / total_deliveries : 0,
      total_tips,
      tips_percentage: total_earnings > 0 ? (total_tips / total_earnings) * 100 : 0,
      monthly_rollups: [],
      ytd: {},
      weekly_data,
      rolling_avg: [],
      category_breakdown: []
    };
  } catch (err) {
    console.error('Failed to generate vault summary:', err);
    // Return empty but valid object
    return {
      total_hours: 0, total_earnings: 0, average_rate: 0, effective_rate: 0,
      best_week: null, worst_week: null, total_expenses: 0, total_out_of_pocket: 0,
      net_income: 0, total_deliveries: 0, avg_deliveries_per_week: 0,
      avg_earnings_per_delivery: 0, total_tips: 0, tips_percentage: 0,
      monthly_rollups: [], ytd: {}, weekly_data: [], rolling_avg: [], category_breakdown: []
    };
  }
}
