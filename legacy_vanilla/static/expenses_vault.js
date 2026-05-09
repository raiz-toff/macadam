// expenses_vault.js - Private Vault integration for the Expenses page
document.addEventListener("DOMContentLoaded", () => {
    const expensesTableBody = document.getElementById("expensesTableBody");
    const expenseModalForm = document.getElementById("expenseModalForm");
    const expenseModalEl = document.getElementById("expenseModal");
    const expenseModalInstance = expenseModalEl ? new bootstrap.Modal(expenseModalEl) : null;
    const currency = window.currencySymbol || "$";
    
    if (!expensesTableBody) return; // Only run on expenses page

    // Elements for categories
    const catOptions = document.getElementById("catOptions");
    const expCategoryFilter = document.getElementById("expCategoryFilter");

    // 1. Load Categories
    async function loadCategories() {
        try {
            const categories = await window.db.expense_categories.toArray();
            
            // Populate datalist
            if (catOptions) {
                catOptions.innerHTML = '';
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    catOptions.appendChild(option);
                });
            }

            // Populate filter
            if (expCategoryFilter) {
                // Keep the "All Categories" option
                expCategoryFilter.innerHTML = '<option value="">All Categories</option>';
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    option.textContent = cat.name;
                    expCategoryFilter.appendChild(option);
                });
            }
        } catch (e) {
            console.error("Vault Error loading categories:", e);
        }
    }

    // 2. Load Expenses
    async function loadExpensesData() {
        try {
            const expenses = await window.db.expenses.orderBy('date').reverse().toArray();
            expensesTableBody.innerHTML = ''; // Clear loading

            if (expenses.length === 0) {
                expensesTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No expenses recorded yet in your Private Vault. Click "Add New Expense" to get started.</td></tr>';
                updateTotals([]);
                return;
            }

            expenses.forEach(exp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${exp.date}</td>
                    <td><span class="badge bg-secondary">${exp.category || 'N/A'}</span></td>
                    <td>${exp.description || '—'}</td>
                    <td><strong>${currency}${Number(exp.amount || 0).toFixed(2)}</strong></td>
                    <td><small class="text-muted">${exp.receipt || '—'}</small></td>
                    <td><small class="text-muted">${exp.notes || '—'}</small></td>
                    <td>
                        <button class="btn btn-sm btn-warning edit-btn" type="button" data-id="${exp.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" type="button" data-id="${exp.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                expensesTableBody.appendChild(tr);
            });

            // Re-attach event listeners
            attachActionListeners(expenses);
            updateTotals(expenses);
            
            // Re-render charts (if they exist)
            renderCharts(expenses);

        } catch (e) {
            console.error("Vault Error loading expenses:", e);
            expensesTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading vault data.</td></tr>';
        }
    }

    function updateTotals(expenses) {
        let totalAmount = 0;
        const categoriesSet = new Set();
        
        expenses.forEach(exp => {
            totalAmount += parseFloat(exp.amount || 0);
            if (exp.category) categoriesSet.add(exp.category);
        });

        const totalsEl = document.getElementById("expTotals");
        if (totalsEl) {
            totalsEl.querySelector('[data-target="amount"]').textContent = totalAmount.toFixed(2);
            totalsEl.querySelector('[data-target="count"]').textContent = expenses.length;
        }

        const totalExpEl = document.getElementById("totalExpenses");
        const totalCountEl = document.getElementById("totalCount");
        const avgExpEl = document.getElementById("avgExpense");
        const totalCatEl = document.getElementById("totalCategories");

        if (totalExpEl) totalExpEl.textContent = totalAmount.toFixed(2);
        if (totalCountEl) totalCountEl.textContent = expenses.length;
        if (avgExpEl) avgExpEl.textContent = expenses.length > 0 ? (totalAmount / expenses.length).toFixed(2) : "0.00";
        if (totalCatEl) totalCatEl.textContent = categoriesSet.size;
    }

    let expenseCategoryChart = null;
    let expenseTrendChart = null;

    function renderCharts(expenses) {
        const expenseCategoryCanvas = document.getElementById("expenseCategoryChart");
        const expenseTrendCanvas = document.getElementById("expenseTrendChart");
        
        if (!expenseCategoryCanvas || !window.Chart) return;

        const style = getComputedStyle(document.body);
        const doughnutColors = style.getPropertyValue('--chart-doughnut-colors').trim().split(', ');

        const categoryTotals = {};
        const monthlyTotals = {};

        expenses.forEach(exp => {
            const category = exp.category || "Unknown";
            const amount = parseFloat(exp.amount || 0);
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;

            const date = new Date(exp.date);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amount;
        });

        const categories = Object.keys(categoryTotals);
        const amounts = categories.map(cat => categoryTotals[cat]);

        if (expenseCategoryChart) expenseCategoryChart.destroy();
        expenseCategoryChart = new Chart(expenseCategoryCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels: categories,
                datasets: [{
                    data: amounts,
                    backgroundColor: doughnutColors.slice(0, Math.max(1, categories.length))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: "bottom" },
                    tooltip: { callbacks: { label: (c) => `${c.label}: ${currency}${Number(c.parsed).toFixed(2)}` } }
                }
            }
        });

        if (expenseTrendCanvas) {
            const months = Object.keys(monthlyTotals).sort((a, b) => new Date(a) - new Date(b));
            const monthAmounts = months.map(m => monthlyTotals[m]);

            if (expenseTrendChart) expenseTrendChart.destroy();
            expenseTrendChart = new Chart(expenseTrendCanvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: months,
                    datasets: [{
                        label: "Monthly Expenses",
                        data: monthAmounts,
                        backgroundColor: "#f9731680",
                        borderColor: "#f97316",
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => `${currency}${Number(c.parsed.y).toFixed(2)}` } }
                    },
                    scales: {
                        x: { title: { display: true, text: "Month" } },
                        y: { title: { display: true, text: "Amount ($)" }, beginAtZero: true }
                    }
                }
            });
        }
    }

    function attachActionListeners(expenses) {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const expense = expenses.find(e => e.id === id);
                if (expense) openEditModal(expense);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this expense from your Private Vault?')) {
                    const id = parseInt(btn.dataset.id);
                    await window.db.expenses.delete(id);
                    loadExpensesData();
                }
            });
        });
    }

    function openEditModal(expense) {
        const modalTitle = document.getElementById("expenseModalTitle");
        if (modalTitle) modalTitle.textContent = "Edit Expense";
        
        expenseModalForm.dataset.editId = expense.id; // Store ID for update
        
        expenseModalForm.date.value = expense.date;
        expenseModalForm.amount.value = expense.amount || 0;
        expenseModalForm.category.value = expense.category || "";
        expenseModalForm.description.value = expense.description || "";
        expenseModalForm.receipt.value = expense.receipt || "";
        expenseModalForm.notes.value = expense.notes || "";

        expenseModalInstance.show();
    }

    // Modal reset on Add
    expenseModalEl.addEventListener("show.bs.modal", function(e) {
        if (!e.relatedTarget || !e.relatedTarget.dataset.editExpense) {
            // It's an Add action
            if(!expenseModalForm.dataset.editId) {
                const modalTitle = document.getElementById("expenseModalTitle");
                if (modalTitle) modalTitle.textContent = "Add New Expense";
                expenseModalForm.reset();
                const dateInput = expenseModalForm.querySelector("#date");
                if (dateInput) dateInput.valueAsDate = new Date();
                delete expenseModalForm.dataset.editId;
            }
        }
    });

    // Ensure category exists
    async function ensureCategory(categoryName) {
        if (!categoryName) return;
        const exists = await window.db.expense_categories.where('name').equalsIgnoreCase(categoryName).count();
        if (exists === 0) {
            await window.db.expense_categories.add({ name: categoryName });
            await loadCategories(); // Refresh lists
        }
    }

    // Handle Form Submission
    if (expenseModalForm) {
        expenseModalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(expenseModalForm);
            
            const categoryName = formData.get('category').trim();
            await ensureCategory(categoryName);

            const data = {
                date: formData.get('date'),
                category: categoryName,
                amount: parseFloat(formData.get('amount') || 0),
                description: formData.get('description'),
                receipt: formData.get('receipt'),
                notes: formData.get('notes')
            };

            const editId = expenseModalForm.dataset.editId;
            if (editId) {
                await window.db.expenses.update(parseInt(editId), data);
                delete expenseModalForm.dataset.editId;
            } else {
                await window.db.expenses.add(data);
            }
            
            expenseModalInstance.hide();
            loadExpensesData();
        });
    }

    // Modal close cleanup
    expenseModalEl.addEventListener("hidden.bs.modal", () => {
        delete expenseModalForm.dataset.editId;
    });

    // Initial Load
    loadCategories().then(loadExpensesData);
});
