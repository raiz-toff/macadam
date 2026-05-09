// weekly_vault.js - Private Vault integration for the Weekly Records page
document.addEventListener("DOMContentLoaded", () => {
    const weeklyTableBody = document.getElementById("weeklyTableBody");
    const weekModalForm = document.getElementById("weekModalForm");
    const weekModalEl = document.getElementById("weekModal");
    const weekModalInstance = weekModalEl ? new bootstrap.Modal(weekModalEl) : null;
    const currency = window.currencySymbol || "$";
    
    if (!weeklyTableBody) return; // Only run on weekly page

    // 1. Load data from Dexie and render the table
    async function loadWeeklyData() {
        try {
            const weeks = await window.db.weekly_earnings.orderBy('week_no').reverse().toArray();
            weeklyTableBody.innerHTML = ''; // Clear loading

            if (weeks.length === 0) {
                weeklyTableBody.innerHTML = '<tr><td colspan="13" class="text-center text-muted py-4">No weekly records yet in your Private Vault. Click "Add New Week" to get started.</td></tr>';
                updateTotals([]);
                return;
            }

            weeks.forEach(week => {
                const tr = document.createElement('tr');
                const total = (week.doordash_pay || 0) + (week.tips || 0) + (week.other_pay || 0);
                const avg = week.hours_worked ? (total / week.hours_worked) : 0;
                
                tr.innerHTML = `
                    <td><strong>${week.week_no}</strong></td>
                    <td>${week.start_date}</td>
                    <td>${week.end_date}</td>
                    <td>${Number(week.hours_worked || 0).toFixed(2)}</td>
                    <td>${week.deliveries || 0}</td>
                    <td>${currency}${Number(week.doordash_pay || 0).toFixed(2)}</td>
                    <td>${currency}${Number(week.tips || 0).toFixed(2)}</td>
                    <td>${currency}${Number(week.other_pay || 0).toFixed(2)}</td>
                    <td>${currency}${Number(week.paid_out_of_pocket || 0).toFixed(2)}</td>
                    <td><strong>${currency}${total.toFixed(2)}</strong></td>
                    <td>${currency}${avg.toFixed(2)}</td>
                    <td>${week.active_hours ? Number(week.active_hours).toFixed(2) : "—"}</td>
                    <td>
                        <button class="btn btn-sm btn-warning edit-btn" type="button" data-id="${week.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" type="button" data-id="${week.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                weeklyTableBody.appendChild(tr);
            });

            // Re-attach event listeners
            attachActionListeners(weeks);
            updateTotals(weeks);
            
            // Re-render charts (if they exist)
            if (typeof window.renderWeeklyVaultCharts === 'function') {
                window.renderWeeklyVaultCharts(weeks);
            }

        } catch (e) {
            console.error("Vault Error:", e);
            weeklyTableBody.innerHTML = '<tr><td colspan="13" class="text-center text-danger">Error loading vault data.</td></tr>';
        }
    }

    function updateTotals(weeks) {
        let totalHours = 0, totalEarnings = 0, totalPaid = 0;
        weeks.forEach(w => {
            totalHours += parseFloat(w.hours_worked || 0);
            totalEarnings += (w.doordash_pay || 0) + (w.tips || 0) + (w.other_pay || 0);
            totalPaid += (w.paid_out_of_pocket || 0);
        });

        const totalsEl = document.getElementById("weekTotals");
        if (totalsEl) {
            totalsEl.querySelector('[data-target="hours"]').textContent = totalHours.toFixed(2);
            totalsEl.querySelector('[data-target="earnings"]').textContent = totalEarnings.toFixed(2);
            totalsEl.querySelector('[data-target="paid"]').textContent = totalPaid.toFixed(2);
        }

        const sumHoursEl = document.getElementById("totalHours");
        const sumEarnEl = document.getElementById("totalEarnings");
        const sumDelEl = document.getElementById("totalDeliveries");
        const sumWeeksEl = document.getElementById("totalWeeks");

        if (sumHoursEl) sumHoursEl.textContent = totalHours.toFixed(2);
        if (sumEarnEl) sumEarnEl.textContent = totalEarnings.toFixed(2);
        if (sumDelEl) sumDelEl.textContent = weeks.reduce((sum, w) => sum + (w.deliveries || 0), 0);
        if (sumWeeksEl) sumWeeksEl.textContent = weeks.length;
    }

    function attachActionListeners(weeks) {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const week = weeks.find(w => w.id === id);
                if (week) openEditModal(week);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this week from your Private Vault?')) {
                    const id = parseInt(btn.dataset.id);
                    await window.db.weekly_earnings.delete(id);
                    loadWeeklyData();
                }
            });
        });
    }

    function openEditModal(week) {
        const modalTitle = document.getElementById("modalTitle");
        if (modalTitle) modalTitle.textContent = "Edit Week";
        
        weekModalForm.dataset.editId = week.id; // Store ID for update
        
        const hoursDec = parseFloat(week.hours_worked || 0);
        const h = Math.floor(hoursDec);
        const m = Math.round((hoursDec - h) * 60);
        
        const activeDec = parseFloat(week.active_hours || 0);
        const ah = Math.floor(activeDec);
        const am = Math.round((activeDec - ah) * 60);

        weekModalForm.week_no.value = week.week_no;
        weekModalForm.deliveries.value = week.deliveries || 0;
        weekModalForm.start_date.value = week.start_date;
        weekModalForm.end_date.value = week.end_date;
        weekModalForm.hours.value = h;
        weekModalForm.minutes.value = m;
        weekModalForm.active_hours.value = activeDec ? ah : "";
        weekModalForm.active_minutes.value = activeDec ? am : "";
        weekModalForm.doordash_pay.value = week.doordash_pay || 0;
        weekModalForm.tips.value = week.tips || 0;
        weekModalForm.other_pay.value = week.other_pay || 0;
        weekModalForm.paid_out_of_pocket.value = week.paid_out_of_pocket || 0;
        weekModalForm.notes.value = week.notes || "";

        weekModalInstance.show();
    }

    // Modal reset on Add
    weekModalEl.addEventListener("show.bs.modal", function(e) {
        if (!e.relatedTarget || !e.relatedTarget.dataset.editWeek) {
            // It's an Add action (unless opened by JS edit)
            if(!weekModalForm.dataset.editId) {
                const modalTitle = document.getElementById("modalTitle");
                if (modalTitle) modalTitle.textContent = "Add New Week";
                weekModalForm.reset();
                delete weekModalForm.dataset.editId;
            }
        }
    });

    // Handle Form Submission
    if (weekModalForm) {
        weekModalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(weekModalForm);
            
            const hours = parseInt(formData.get('hours') || 0);
            const mins = parseInt(formData.get('minutes') || 0);
            const hours_worked = hours + (mins / 60);
            
            const ah = parseInt(formData.get('active_hours') || 0);
            const am = parseInt(formData.get('active_minutes') || 0);
            const active_hours = (ah || am) ? ah + (am / 60) : null;

            const data = {
                week_no: parseInt(formData.get('week_no')),
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                deliveries: parseInt(formData.get('deliveries') || 0),
                hours_worked: hours_worked,
                active_hours: active_hours,
                doordash_pay: parseFloat(formData.get('doordash_pay') || 0),
                tips: parseFloat(formData.get('tips') || 0),
                other_pay: parseFloat(formData.get('other_pay') || 0),
                paid_out_of_pocket: parseFloat(formData.get('paid_out_of_pocket') || 0),
                notes: formData.get('notes')
            };

            const editId = weekModalForm.dataset.editId;
            if (editId) {
                await window.db.weekly_earnings.update(parseInt(editId), data);
                delete weekModalForm.dataset.editId;
            } else {
                await window.db.weekly_earnings.add(data);
            }
            
            weekModalInstance.hide();
            loadWeeklyData();
        });
    }

    // Modal close cleanup
    weekModalEl.addEventListener("hidden.bs.modal", () => {
        delete weekModalForm.dataset.editId;
    });

    // Initial Load
    loadWeeklyData();
});
