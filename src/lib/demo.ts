import { db } from './db';

export async function seedDemoData() {
    await Promise.all([
        db.weekly_earnings.clear(),
        db.expenses.clear(),
        db.expense_categories.clear(),
        db.settings.clear()
    ]);

    // Seed Categories
    await db.expense_categories.bulkAdd([
        { id: 1, name: 'Fuel' }, 
        { id: 2, name: 'Maintenance' }, 
        { id: 3, name: 'Supplies' }, 
        { id: 4, name: 'Insurance' }, 
        { id: 5, name: 'Phone/Data' }
    ]);

    // Seed Settings
    const demoSettings = [
        { key: 'macadam_v2_user_name', value: 'Demo Pilot' },
        { key: 'macadam_v2_avatar', value: '⚡' },
        { key: 'macadam_v2_currency', value: '$' },
        { key: 'macadam_v2_goal', value: '1200' },
        { key: 'macadam_v2_tax_percent', value: '25' },
        { key: 'macadam_v2_vehicle', value: 'ev' }
    ];
    await db.settings.bulkPut(demoSettings);

    const today = new Date();
    const weeks = [];
    const expenses = [];

    // Generate 8 weeks of historical data
    for (let i = 7; i >= 0; i--) {
        const endDate = new Date(today);
        endDate.setDate(today.getDate() - (i * 7));
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);

        const hours = +(25 + Math.random() * 20).toFixed(1);
        const deliveries = Math.floor(40 + Math.random() * 50);
        const earnings = +(deliveries * (8 + Math.random() * 4)).toFixed(2);
        const tips = +(earnings * (0.15 + Math.random() * 0.1)).toFixed(2);

        weeks.push({
            week_no: 8 - i,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            total_hours: hours,
            deliveries: deliveries,
            total_earnings: earnings,
            tips: tips,
            active_days: 5,
            miles: deliveries * 10
        });
    }

    // Generate some common expenses
    for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - Math.floor(Math.random() * 60));
        
        expenses.push({
            date: date.toISOString().split('T')[0],
            amount: +(15 + Math.random() * 80).toFixed(2),
            category_id: Math.floor(Math.random() * 5) + 1,
            description: 'Sample Demo Expense',
        });
    }

    await db.weekly_earnings.bulkAdd(weeks);
    await db.expenses.bulkAdd(expenses);
}
