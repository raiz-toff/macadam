// vault_aggregation.js - Private Vault calculations for Dashboard

window.generateVaultSummary = async function(startDateStr, endDateStr) {
    if (!window.db) throw new Error("Vault DB not initialized");

    let allWeeks = await window.db.weekly_earnings.toArray();
    let allExpenses = await window.db.expenses.toArray();

    // Parse filters
    const start = startDateStr ? new Date(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr) : null;
    
    // YTD limits
    const currentYear = new Date().getFullYear();
    const ytdStart = new Date(currentYear, 0, 1);

    // Filter helpers
    const isWithinRange = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
    };

    const filteredWeeks = allWeeks.filter(w => isWithinRange(w.end_date));
    const filteredExpenses = allExpenses.filter(e => isWithinRange(e.date));

    const ytdWeeks = allWeeks.filter(w => new Date(w.end_date) >= ytdStart);
    const ytdExpenses = allExpenses.filter(e => new Date(e.date) >= ytdStart);

    // Helpers
    const getWeekTotals = (w) => {
        const ddp = parseFloat(w.doordash_pay || 0);
        const tip = parseFloat(w.tips || 0);
        const oth = parseFloat(w.other_pay || 0);
        return ddp + tip + oth;
    };

    // Calculate main aggregations
    let total_earnings = 0;
    let total_hours = 0;
    let total_doordash_pay = 0;
    let total_tips = 0;
    let total_other_pay = 0;
    let total_deliveries = 0;
    let total_out_of_pocket = 0;

    let best_week = null;
    let worst_week = null;

    filteredWeeks.forEach(w => {
        const earnings = getWeekTotals(w);
        total_earnings += earnings;
        total_hours += parseFloat(w.hours_worked || 0);
        total_doordash_pay += parseFloat(w.doordash_pay || 0);
        total_tips += parseFloat(w.tips || 0);
        total_other_pay += parseFloat(w.other_pay || 0);
        total_deliveries += parseInt(w.deliveries || 0);
        total_out_of_pocket += parseFloat(w.paid_out_of_pocket || 0);

        if (!best_week || earnings > best_week.earnings) {
            best_week = { week_no: w.week_no, earnings };
        }
        if (!worst_week || earnings < worst_week.earnings) {
            worst_week = { week_no: w.week_no, earnings };
        }
    });

    let total_expenses = 0;
    const category_totals = {};
    filteredExpenses.forEach(e => {
        const amt = parseFloat(e.amount || 0);
        total_expenses += amt;
        const cat = e.category || 'Unknown';
        category_totals[cat] = (category_totals[cat] || 0) + amt;
    });

    const category_breakdown = Object.keys(category_totals).map(k => ({
        category: k, amount: category_totals[k]
    }));

    const net_income = total_earnings - total_expenses;
    const average_rate = total_hours > 0 ? (total_earnings / total_hours) : 0;
    const effective_rate = total_hours > 0 ? (net_income / total_hours) : 0;
    
    const num_weeks = filteredWeeks.length;
    const avg_deliveries_per_week = num_weeks > 0 ? (total_deliveries / num_weeks) : 0;
    const avg_earnings_per_delivery = total_deliveries > 0 ? (total_earnings / total_deliveries) : 0;
    const tips_percentage = total_earnings > 0 ? ((total_tips / total_earnings) * 100) : 0;

    // YTD calcs
    let ytd_earnings = 0, ytd_hours = 0, ytd_out = 0;
    ytdWeeks.forEach(w => {
        ytd_earnings += getWeekTotals(w);
        ytd_hours += parseFloat(w.hours_worked || 0);
        ytd_out += parseFloat(w.paid_out_of_pocket || 0);
    });
    let ytd_expenses = 0;
    ytdExpenses.forEach(e => { ytd_expenses += parseFloat(e.amount || 0); });
    
    const ytd_net = ytd_earnings - ytd_expenses;
    const ytd = {
        earnings: ytd_earnings,
        expenses: ytd_expenses,
        out_of_pocket: ytd_out,
        net: ytd_net,
        avg_rate: ytd_hours > 0 ? (ytd_earnings / ytd_hours) : 0,
        effective_rate: ytd_hours > 0 ? (ytd_net / ytd_hours) : 0
    };

    // Trends (Placeholder: comparing this set against a prior set would require more complex date logic. Setting to 0 for offline decoupling)
    const trends = { earnings: 0, rate: 0, hours: 0 };

    // Weekly Data for charts
    // Sort weeks chronologically
    const sortedWeeks = [...filteredWeeks].sort((a,b) => new Date(a.end_date) - new Date(b.end_date));
    const weekly_data = sortedWeeks.map(w => {
        const e = getWeekTotals(w);
        const h = parseFloat(w.hours_worked || 0);
        return {
            date: w.end_date,
            earnings: e,
            avg_rate: h > 0 ? (e/h) : 0,
            deliveries: parseInt(w.deliveries || 0)
        };
    });

    // Rolling avg (4-period)
    const rolling_avg = [];
    for (let i = 0; i < weekly_data.length; i++) {
        let sumE = 0, sumH = 0;
        let count = 0;
        for (let j = Math.max(0, i-3); j <= i; j++) {
            const ww = sortedWeeks[j];
            sumE += getWeekTotals(ww);
            sumH += parseFloat(ww.hours_worked || 0);
            count++;
        }
        rolling_avg.push({
            date: weekly_data[i].date,
            rate: sumH > 0 ? (sumE/sumH) : 0
        });
    }

    // Monthly Rollups
    const monthlyMap = {};
    filteredWeeks.forEach(w => {
        const d = new Date(w.end_date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if(!monthlyMap[key]) monthlyMap[key] = { month: key, earnings: 0, expenses: 0, out_of_pocket: 0, hours: 0 };
        monthlyMap[key].earnings += getWeekTotals(w);
        monthlyMap[key].hours += parseFloat(w.hours_worked || 0);
        monthlyMap[key].out_of_pocket += parseFloat(w.paid_out_of_pocket || 0);
    });

    filteredExpenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if(!monthlyMap[key]) monthlyMap[key] = { month: key, earnings: 0, expenses: 0, out_of_pocket: 0, hours: 0 };
        monthlyMap[key].expenses += parseFloat(e.amount || 0);
    });

    const monthly_rollups = Object.keys(monthlyMap).sort().map(k => {
        const m = monthlyMap[k];
        m.net = m.earnings - m.expenses;
        m.avg_rate = m.hours > 0 ? (m.earnings / m.hours) : 0;
        return m;
    });

    return {
        total_hours,
        total_earnings,
        average_rate,
        effective_rate,
        best_week,
        worst_week,
        total_expenses,
        total_out_of_pocket,
        net_income,
        total_deliveries,
        avg_deliveries_per_week,
        avg_earnings_per_delivery,
        total_tips,
        tips_percentage,
        total_doordash_pay,
        total_other_pay,
        trends,
        monthly_rollups,
        ytd,
        weekly_data,
        rolling_avg,
        category_breakdown
    };
};
