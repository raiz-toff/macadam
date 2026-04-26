import sqlite3
import json
from datetime import datetime

db_path = '/home/coder/Production/FinancialWebApp/instance/doordash.db'
out_path = '/home/coder/Production/FinancialWebApp/GigTracker/legacy_backup.json'

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get weekly earnings
    cursor.execute("SELECT * FROM weekly_earnings")
    weeks = [dict(row) for row in cursor.fetchall()]

    # Get categories
    cursor.execute("SELECT * FROM expense_category")
    categories = [dict(row) for row in cursor.fetchall()]

    # Get expenses
    cursor.execute("SELECT * FROM expense")
    expenses = [dict(row) for row in cursor.fetchall()]

    # Map categories to expenses
    cat_map = {c['id']: c['name'] for c in categories}
    mapped_expenses = []
    for exp in expenses:
        mapped_exp = dict(exp)
        if 'category_id' in mapped_exp:
            cat_id = mapped_exp.pop('category_id')
            mapped_exp['category'] = cat_map.get(cat_id, 'Unknown')
        mapped_expenses.append(mapped_exp)

    # Format Date times for strings if they aren't
    for w in weeks:
        if 'start_date' in w and isinstance(w['start_date'], str) and ' ' in w['start_date']:
            w['start_date'] = w['start_date'].split(' ')[0]
        if 'end_date' in w and isinstance(w['end_date'], str) and ' ' in w['end_date']:
            w['end_date'] = w['end_date'].split(' ')[0]

    for e in mapped_expenses:
        if 'date' in e and isinstance(e['date'], str) and ' ' in e['date']:
            e['date'] = e['date'].split(' ')[0]

    backup = {
        "timestamp": datetime.now().isoformat(),
        "app": "Macadam",
        "version": 1,
        "data": {
            "weekly_earnings": weeks,
            "expenses": mapped_expenses,
            "expense_categories": categories,
            "settings": []
        }
    }

    with open(out_path, 'w') as f:
        json.dump(backup, f, indent=2)

    print(f"Backup created at {out_path}")

except Exception as e:
    print(f"Error: {e}")
