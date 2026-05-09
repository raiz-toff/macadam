// vault_backup.js - Handles Exporting and Importing the Private Vault

document.addEventListener("DOMContentLoaded", () => {
    const btnExport = document.getElementById("btnExportVault");
    const btnImport = document.getElementById("btnImportVault");
    const fileInput = document.getElementById("importFile");

    if (!btnExport || !btnImport || !fileInput) return;

    // Enable import button only when a file is selected
    fileInput.addEventListener('change', (e) => {
        btnImport.disabled = e.target.files.length === 0;
    });

    // 1. Export Vault Logic
    btnExport.addEventListener("click", async () => {
        try {
            if (!window.db) throw new Error("Database not initialized.");
            
            // Gather all data from all stores
            const backupData = {
                timestamp: new Date().toISOString(),
                app: "Macadam",
                version: 1,
                data: {
                    weekly_earnings: await window.db.weekly_earnings.toArray(),
                    expenses: await window.db.expenses.toArray(),
                    expense_categories: await window.db.expense_categories.toArray(),
                    settings: await window.db.settings.toArray()
                }
            };

            // Convert to formatted JSON string
            const jsonString = JSON.stringify(backupData, null, 2);
            
            // Create a Blob and trigger a pseudo-download
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement("a");
            const dateStr = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `macadam_vault_backup_${dateStr}.json`;
            
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (e) {
            console.error("Export Failed:", e);
            alert("Failed to export vault: " + e.message);
        }
    });

    // 2. Import Vault Logic
    btnImport.addEventListener("click", async () => {
        if (fileInput.files.length === 0) return;
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                
                // Validate schema
                if (parsedData.app !== "Macadam" || !parsedData.data) {
                    throw new Error("Invalid or corrupted backup file format.");
                }

                const confirmed = confirm("WARNING: This will merge the backup into your existing vault. Existing records with the same IDs will be overwritten. Proceed?");
                if (!confirmed) return;

                // Bulk Put Data
                if (parsedData.data.weekly_earnings) {
                    try {
                        await window.db.weekly_earnings.bulkPut(parsedData.data.weekly_earnings);
                    } catch(e) { console.warn("Weekly earnings import warning:", e); }
                }
                if (parsedData.data.expenses) {
                    try {
                        await window.db.expenses.bulkPut(parsedData.data.expenses);
                    } catch(e) { console.warn("Expenses import warning:", e); }
                }
                if (parsedData.data.expense_categories) {
                    // Import categories one by one to gracefully catch unique name constraint errors
                    for (const cat of parsedData.data.expense_categories) {
                        try {
                            // Delete the legacy ID so it auto-increments and avoids PK collisions with different names
                            delete cat.id; 
                            await window.db.expense_categories.put(cat);
                        } catch (e) {
                            // Expected constraint error if the category name already exists. Safe to ignore.
                        }
                    }
                }
                if (parsedData.data.settings) {
                    try {
                        await window.db.settings.bulkPut(parsedData.data.settings);
                    } catch(e) { console.warn("Settings import warning:", e); }
                }

                alert("Vault Restore Successful! The page will now reload.");
                window.location.reload(); 

            } catch (error) {
                console.error("Import Failed:", error);
                alert("Failed to import vault: " + error.message);
            }
        };

        reader.onerror = () => {
            alert("Error reading file.");
        };

        reader.readAsText(file);
    });
});
