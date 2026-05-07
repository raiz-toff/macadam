// onboarding.js — Macadam Welcome Gate & Setup Wizard
// Loaded after db.js, before script.js on every page.

(function () {
    'use strict';

    const ONBOARDED_KEY = 'macadam_onboarded';
    const DEMO_KEY = 'macadam_demo_loaded';

    // ── PUBLIC API (always available, even for onboarded users) ──
    window.macadamOnboarding = {
        reset: function () {
            localStorage.removeItem(ONBOARDED_KEY);
            localStorage.removeItem(DEMO_KEY);
            window.location.reload();
        },
        clearDemo: async function () {
            try {
                await window.db.weekly_earnings.clear();
                await window.db.expenses.clear();
                await window.db.settings.delete('demo_data');
                localStorage.removeItem(ONBOARDED_KEY);
                localStorage.removeItem(DEMO_KEY);
                window.location.reload();
            } catch (e) {
                console.error('Failed to clear demo data:', e);
                alert('Failed to clear demo data: ' + e.message);
            }
        }
    };

    // ── Fast synchronous guard ──────────────────────────────────
    // localStorage is synchronous → no flash for returning users.
    if (localStorage.getItem(ONBOARDED_KEY) === 'true') return;

    // ── Async detection: check IndexedDB for existing data ──────
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.db.open();
            const count = await window.db.weekly_earnings.count();
            if (count > 0) {
                // Existing user with data — mark onboarded, bail out
                localStorage.setItem(ONBOARDED_KEY, 'true');
                return;
            }
        } catch (e) {
            console.warn('Onboarding: DB check failed, showing gate.', e);
        }

        showWelcomeGate();
    });

    // ================================================================
    //  WELCOME GATE
    // ================================================================

    function showWelcomeGate() {
        const gate = document.createElement('div');
        gate.id = 'macadam-welcome-gate';
        gate.innerHTML = `
            <div class="gate-container">
                <div class="gate-header">
                    <div class="gate-logo"><i class="bi bi-car-front-fill"></i> Macadam</div>
                    <p class="gate-tagline">
                        The private vault for independent drivers. Track your earnings,
                        expenses and performance — all stored locally on your device.
                    </p>
                </div>

                <!-- Three paths -->
                <div class="gate-paths" id="gatePaths">
                    <!-- Restore -->
                    <div class="gate-card" id="gateRestore">
                        <div class="gate-card-icon restore">
                            <i class="bi bi-cloud-upload"></i>
                        </div>
                        <div class="gate-card-title">Restore Your Vault</div>
                        <div class="gate-card-desc">
                            Already have a Macadam backup? Import your <code>.json</code> file
                            and pick up right where you left off.
                        </div>
                        <div class="gate-card-action">Upload Backup <i class="bi bi-arrow-right"></i></div>
                        <input type="file" accept=".json" class="gate-file-input" id="gateFileInput">
                    </div>

                    <!-- Demo -->
                    <div class="gate-card" id="gateDemo">
                        <div class="gate-card-icon demo">
                            <i class="bi bi-play-circle"></i>
                        </div>
                        <div class="gate-card-title">Try the Demo</div>
                        <div class="gate-card-desc">
                            See Macadam in action with sample delivery data.
                            You can clear it anytime from Settings.
                        </div>
                        <div class="gate-card-action">Load Demo Data <i class="bi bi-arrow-right"></i></div>
                    </div>

                    <!-- CSV Import -->
                    <div class="gate-card" id="gateCsv" style="display:none;"> <!-- Hidden for now as it requires backend/complex parser -->
                        <div class="gate-card-icon demo">
                            <i class="bi bi-file-earmark-spreadsheet"></i>
                        </div>
                        <div class="gate-card-title">Import CSV</div>
                        <div class="gate-card-desc">
                            Import historical data from Stride, Gridwise, etc.
                        </div>
                        <div class="gate-card-action">Upload CSV <i class="bi bi-arrow-right"></i></div>
                    </div>

                    <!-- Start Fresh -->
                    <div class="gate-card" id="gateFresh">
                        <div class="gate-card-icon fresh">
                            <i class="bi bi-rocket-takeoff"></i>
                        </div>
                        <div class="gate-card-title">Start Fresh</div>
                        <div class="gate-card-desc">
                            Set up your personal tracker from scratch with a
                            quick guided setup.
                        </div>
                        <div class="gate-card-action">Begin Setup <i class="bi bi-arrow-right"></i></div>
                    </div>
                </div>

                <!-- Wizard (hidden initially, shown when "Start Fresh" is clicked) -->
                <div id="wizardArea" style="display:none;"></div>

                <div class="gate-footer">
                    <i class="bi bi-shield-lock-fill"></i>
                    Your data never leaves this device. No cloud, no tracking.
                </div>
            </div>
        `;

        document.body.appendChild(gate);
        bindGateEvents(gate);
    }

    // ── Gate Event Handlers ─────────────────────────────────────

    function bindGateEvents(gate) {
        // Restore
        const restoreCard = gate.querySelector('#gateRestore');
        const fileInput = gate.querySelector('#gateFileInput');

        restoreCard.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length === 0) return;
            handleRestoreFile(e.target.files[0], gate);
        });

        // Demo
        gate.querySelector('#gateDemo').addEventListener('click', () => {
            handleLoadDemo(gate);
        });

        // Start Fresh → Wizard
        gate.querySelector('#gateFresh').addEventListener('click', () => {
            gate.querySelector('#gatePaths').style.display = 'none';
            showWizard(gate);
        });
    }

    // ================================================================
    //  RESTORE BACKUP (reuse vault_backup logic inline)
    // ================================================================

    function handleRestoreFile(file, gate) {
        const paths = gate.querySelector('#gatePaths');
        paths.innerHTML = `
            <div class="gate-loading">
                <div class="gate-spinner"></div>
                <div class="gate-loading-text">Restoring your vault…</div>
            </div>
        `;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.app !== 'Macadam' || !parsed.data) {
                    throw new Error('Invalid or corrupted backup file.');
                }

                if (parsed.data.weekly_earnings) {
                    await window.db.weekly_earnings.bulkPut(parsed.data.weekly_earnings);
                }
                if (parsed.data.expenses) {
                    await window.db.expenses.bulkPut(parsed.data.expenses);
                }
                if (parsed.data.expense_categories) {
                    for (const cat of parsed.data.expense_categories) {
                        try { delete cat.id; await window.db.expense_categories.put(cat); } catch (_) { /* dup */ }
                    }
                }
                if (parsed.data.settings) {
                    await window.db.settings.bulkPut(parsed.data.settings);
                }

                localStorage.setItem(ONBOARDED_KEY, 'true');
                dismissGate(gate);
            } catch (err) {
                paths.innerHTML = `
                    <div class="gate-loading">
                        <i class="bi bi-exclamation-triangle" style="font-size:2.5rem;color:#f59e0b;"></i>
                        <div class="gate-loading-text" style="color:#f59e0b;">${err.message}</div>
                        <button class="wizard-btn wizard-btn-next" onclick="location.reload()" style="margin-top:1rem;">Try Again</button>
                    </div>
                `;
            }
        };
        reader.onerror = () => {
            paths.innerHTML = `
                <div class="gate-loading">
                    <i class="bi bi-exclamation-triangle" style="font-size:2.5rem;color:#f59e0b;"></i>
                    <div class="gate-loading-text" style="color:#f59e0b;">Error reading file.</div>
                    <button class="wizard-btn wizard-btn-next" onclick="location.reload()" style="margin-top:1rem;">Try Again</button>
                </div>
            `;
        };
        reader.readAsText(file);
    }

    // ================================================================
    //  DEMO DATA
    // ================================================================

    async function handleLoadDemo(gate) {
        const paths = gate.querySelector('#gatePaths');
        paths.innerHTML = `
            <div class="gate-loading">
                <div class="gate-spinner"></div>
                <div class="gate-loading-text">Generating sample data…</div>
            </div>
        `;

        try {
            await loadDemoData();
            localStorage.setItem(ONBOARDED_KEY, 'true');
            localStorage.setItem(DEMO_KEY, 'true');
            await window.db.settings.put({ key: 'demo_data', value: true });
            dismissGate(gate);
        } catch (err) {
            console.error('Demo load failed:', err);
            paths.innerHTML = `
                <div class="gate-loading">
                    <i class="bi bi-exclamation-triangle" style="font-size:2.5rem;color:#f59e0b;"></i>
                    <div class="gate-loading-text" style="color:#f59e0b;">Failed to load demo: ${err.message}</div>
                    <button class="wizard-btn wizard-btn-next" onclick="location.reload()" style="margin-top:1rem;">Try Again</button>
                </div>
            `;
        }
    }

    async function loadDemoData() {
        // Ensure DB is open (may have been closed if DB was deleted and recreated)
        if (!window.db.isOpen()) {
            await window.db.open();
        }

        const today = new Date();
        const weeks = [];
        const expenses = [];

        // Generate 8 weeks of data ending near today
        for (let i = 7; i >= 0; i--) {
            const endDate = new Date(today);
            endDate.setDate(today.getDate() - (i * 7));
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 6);

            const hours = +(15 + Math.random() * 40).toFixed(2);
            const deliveries = Math.floor(20 + Math.random() * 80);
            const ddPay = +(deliveries * (3.5 + Math.random() * 3)).toFixed(2);
            const tips = +(deliveries * (1.5 + Math.random() * 2.5)).toFixed(2);
            const otherPay = Math.random() > 0.6 ? +(Math.random() * 30).toFixed(2) : 0;
            const oop = Math.random() > 0.7 ? +(10 + Math.random() * 60).toFixed(2) : 0;

            weeks.push({
                week_no: 8 - i,
                start_date: fmt(startDate),
                end_date: fmt(endDate),
                hours_worked: hours,
                active_hours: +(hours * (0.55 + Math.random() * 0.15)).toFixed(2),
                deliveries: deliveries,
                doordash_pay: ddPay,
                tips: tips,
                other_pay: otherPay,
                paid_out_of_pocket: oop,
                notes: ''
            });
        }

        // Generate ~15 expense records
        const categories = ['Fuel', 'Maintenance', 'Supplies', 'Phone/Data', 'Insurance', 'Taxes/Fees'];
        const descriptions = {
            'Fuel': ['Shell Gas Station', 'Costco Fuel', 'BP Station', 'Circle K'],
            'Maintenance': ['Oil Change', 'Tire Rotation', 'Car Wash', 'Wiper Blades'],
            'Supplies': ['Phone Mount', 'Insulated Bag', 'Dash Cam', 'USB Charger'],
            'Phone/Data': ['T-Mobile Bill', 'Phone Case', 'Screen Protector'],
            'Insurance': ['Progressive Auto', 'State Farm Monthly'],
            'Taxes/Fees': ['Quarterly Estimate', 'Registration Renewal']
        };
        const amounts = {
            'Fuel': [35, 65],
            'Maintenance': [25, 120],
            'Supplies': [12, 45],
            'Phone/Data': [40, 80],
            'Insurance': [80, 180],
            'Taxes/Fees': [50, 300]
        };

        for (let i = 0; i < 15; i++) {
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const descs = descriptions[cat];
            const [lo, hi] = amounts[cat];
            const d = new Date(today);
            d.setDate(today.getDate() - Math.floor(Math.random() * 56));

            expenses.push({
                date: fmt(d),
                category_id: categories.indexOf(cat) + 1,
                category: cat,
                amount: +(lo + Math.random() * (hi - lo)).toFixed(2),
                description: descs[Math.floor(Math.random() * descs.length)],
                receipt: '',
                notes: ''
            });
        }

        await window.db.weekly_earnings.bulkAdd(weeks);
        await window.db.expenses.bulkAdd(expenses);
    }

    function fmt(d) {
        return d.toISOString().split('T')[0];
    }

    // ================================================================
    //  WIZARD (Start Fresh)
    // ================================================================

    function showWizard(gate) {
        const area = gate.querySelector('#wizardArea');
        area.style.display = 'block';

        const defaultCategoriesGas = ['Fuel', 'Maintenance', 'Supplies', 'Insurance', 'Phone/Data', 'Taxes/Fees'];
        const defaultCategoriesEV = ['Charging', 'Maintenance', 'Supplies', 'Insurance', 'Phone/Data', 'Taxes/Fees'];
        const defaultCategoriesBike = ['Bike Maintenance', 'Supplies', 'Phone/Data', 'Taxes/Fees'];

        let currentStep = 0;
        const totalSteps = 8;
        let wizardCategories = [...defaultCategoriesGas];
        let selectedPlatforms = ['DoorDash'];
        let selectedCurrency = '$';

        area.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-progress" id="wizardProgress">
                    ${Array.from({ length: totalSteps }, (_, i) => `<div class="wizard-dot${i === 0 ? ' active' : ''}" data-step="${i}"></div>`).join('')}
                </div>

                <div class="wizard-panel" id="wizardPanel">
                    <!-- Step 0: Welcome -->
                    <div class="wizard-step active" data-step="0">
                        <div class="wizard-step-icon">🚗</div>
                        <div class="wizard-step-title">Welcome to Macadam</div>
                        <div class="wizard-step-desc">
                            Track your delivery earnings, manage expenses, and monitor your
                            performance — all stored securely on your device. Your data <strong style="color:#10b981;">never leaves this device</strong>.
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizName">What should we call you? <span class="required-star">*</span></label>
                            <input type="text" id="wizName" placeholder="Your name or nickname" required>
                            <div class="error-msg">Please enter a name.</div>
                        </div>
                        <div class="wizard-form-group">
                            <label>Pick an Avatar (optional)</label>
                            <div class="avatar-grid" id="wizAvatars">
                                <span class="avatar-option selected" data-avatar="😎">😎</span>
                                <span class="avatar-option" data-avatar="🚗">🚗</span>
                                <span class="avatar-option" data-avatar="🛵">🛵</span>
                                <span class="avatar-option" data-avatar="🚴">🚴</span>
                                <span class="avatar-option" data-avatar="⚡">⚡</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 1: Preferences -->
                    <div class="wizard-step" data-step="1">
                        <div class="wizard-step-icon">⚙️</div>
                        <div class="wizard-step-title">Preferences</div>
                        <div class="wizard-form-group">
                            <label for="wizCurrency">Currency Symbol <span class="required-star">*</span></label>
                            <input type="text" id="wizCurrency" value="$" maxlength="3" required>
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizTheme">Preferred Theme</label>
                            <select id="wizTheme">
                                <option value="auto">Auto (System)</option>
                                <option value="light">Light</option>
                                <option value="dark" selected>Dark</option>
                            </select>
                        </div>
                        <div class="wizard-form-group">
                            <label>Accent Color</label>
                            <div class="color-picker" id="wizColors">
                                <div class="color-swatch selected" style="background:#f43f5e;" data-color="rose"></div>
                                <div class="color-swatch" style="background:#3b82f6;" data-color="blue"></div>
                                <div class="color-swatch" style="background:#10b981;" data-color="green"></div>
                                <div class="color-swatch" style="background:#8b5cf6;" data-color="purple"></div>
                            </div>
                        </div>
                        <div class="wizard-form-group">
                            <label>Reminders</label>
                            <div class="wizard-checkbox-group">
                                <label class="wizard-checkbox-label">
                                    <input type="checkbox" id="wizNotifications" style="display:none;">
                                    <span>Enable Weekly Logging Reminder</span>
                                </label>
                            </div>
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizWeekStartDay">Week Starts On</label>
                            <select id="wizWeekStartDay">
                                <option value="1">Monday (Default)</option>
                                <option value="0">Sunday</option>
                            </select>
                        </div>
                    </div>

                    <!-- Step 2: Work Profile -->
                    <div class="wizard-step" data-step="2">
                        <div class="wizard-step-icon">🛵</div>
                        <div class="wizard-step-title">Work Profile</div>
                        <div class="wizard-form-group">
                            <label>Primary Platforms</label>
                            <div class="wizard-checkbox-group" id="wizPlatforms">
                                <label class="wizard-checkbox-label selected">
                                    <input type="checkbox" value="DoorDash" checked style="display:none;">
                                    <span>DoorDash</span>
                                </label>
                                <label class="wizard-checkbox-label">
                                    <input type="checkbox" value="UberEats" style="display:none;">
                                    <span>UberEats</span>
                                </label>
                                <label class="wizard-checkbox-label">
                                    <input type="checkbox" value="Grubhub" style="display:none;">
                                    <span>Grubhub</span>
                                </label>
                                <label class="wizard-checkbox-label">
                                    <input type="checkbox" value="Instacart" style="display:none;">
                                    <span>Instacart</span>
                                </label>
                                <label class="wizard-checkbox-label">
                                    <input type="checkbox" value="Other" style="display:none;">
                                    <span>Other</span>
                                </label>
                            </div>
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizVehicle">Vehicle Type</label>
                            <select id="wizVehicle">
                                <option value="gas">Gas Car</option>
                                <option value="ev">Electric Vehicle (EV)</option>
                                <option value="bike">Bicycle / E-Bike</option>
                                <option value="scooter">Scooter / Motorcycle</option>
                            </select>
                        </div>
                        <div class="wizard-form-group" id="wizMpgGroup">
                            <label for="wizMpg">Vehicle Efficiency (MPG)</label>
                            <input type="number" id="wizMpg" min="0" step="1" placeholder="e.g. 25">
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizMileageMethod">Mileage Tracking Method</label>
                            <select id="wizMileageMethod">
                                <option value="odometer">Manual (Odometer)</option>
                                <option value="app">App Estimate</option>
                            </select>
                        </div>
                    </div>

                    <!-- Step 3: Goals -->
                    <div class="wizard-step" data-step="3">
                        <div class="wizard-step-icon">🎯</div>
                        <div class="wizard-step-title">Set Your Goals</div>
                        <div class="wizard-form-group">
                            <label for="wizGoal">Weekly Earnings Target (optional)</label>
                            <div class="input-group">
                                <span class="cur-sym">$</span>
                                <input type="number" id="wizGoal" min="0" step="10" placeholder="e.g. 500" inputmode="decimal">
                            </div>
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizTax">Tax Withholding Goal % <span class="help-tooltip" data-tooltip="Percentage of earnings to set aside for taxes">ⓘ</span></label>
                            <input type="number" id="wizTax" min="0" max="100" placeholder="e.g. 20" value="20" inputmode="decimal">
                        </div>
                    </div>

                    <!-- Step 4: Recurring Expenses -->
                    <div class="wizard-step" data-step="5">
                        <div class="wizard-step-icon">📅</div>
                        <div class="wizard-step-title">Fixed Monthly Costs</div>
                        <div class="wizard-step-desc">
                            Do you have recurring monthly business expenses? (We'll remind you to log these).
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizInsCost">Auto Insurance</label>
                            <div class="input-group">
                                <span class="cur-sym">$</span>
                                <input type="number" id="wizInsCost" min="0" step="1" placeholder="e.g. 150">
                            </div>
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizPhoneCost">Phone/Data Bill</label>
                            <div class="input-group">
                                <span class="cur-sym">$</span>
                                <input type="number" id="wizPhoneCost" min="0" step="1" placeholder="e.g. 60">
                            </div>
                        </div>
                    </div>

                    <!-- Step 5: Categories -->
                    <div class="wizard-step" data-step="4">
                        <div class="wizard-step-icon">🏷️</div>
                        <div class="wizard-step-title">Expense Categories</div>
                        <div class="wizard-step-desc">
                            We've pre-filled some based on your vehicle. Add or remove as needed. Click to edit.
                        </div>
                        <div class="category-chips" id="wizCategoryChips"></div>
                        <div class="add-category-input">
                            <input type="text" id="wizNewCategory" placeholder="Add category…" maxlength="30">
                        </div>
                    </div>

                    <!-- Step 6: Initial Data -->
                    <div class="wizard-step" data-step="6">
                        <div class="wizard-step-icon">📊</div>
                        <div class="wizard-step-title">Log Your First Week</div>
                        <div class="wizard-step-desc">
                            Got your latest delivery stats? Enter them now (Optional).
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizWeekStart">Week Start</label>
                            <input type="date" id="wizWeekStart">
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizWeekEnd">Week End</label>
                            <input type="date" id="wizWeekEnd">
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizHours">Total Hours <span class="help-tooltip" data-tooltip="Total Dash Time (including waiting)">ⓘ</span></label>
                            <div class="quick-fill-group">
                                <button class="quick-fill-btn" data-target="wizHours" data-val="10">10h</button>
                                <button class="quick-fill-btn" data-target="wizHours" data-val="20">20h</button>
                                <button class="quick-fill-btn" data-target="wizHours" data-val="40">40h</button>
                            </div>
                            <input type="number" id="wizHours" min="0" step="0.5" placeholder="e.g. 32" inputmode="decimal">
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizActiveHours">Active Hours <span class="help-tooltip" data-tooltip="Time actively on delivery">ⓘ</span></label>
                            <input type="number" id="wizActiveHours" min="0" step="0.5" placeholder="e.g. 25" inputmode="decimal">
                        </div>
                        <div class="wizard-form-group">
                            <label for="wizDeliveries">Deliveries</label>
                            <input type="number" id="wizDeliveries" min="0" placeholder="e.g. 45" inputmode="numeric">
                        </div>

                        <!-- Dynamic Pay Fields Area -->
                        <div id="wizDynamicPayFields"></div>

                        <div class="wizard-form-group">
                            <label for="wizTips">Tips</label>
                            <div class="input-group">
                                <span class="cur-sym">$</span>
                                <input type="number" id="wizTips" class="wiz-pay-input" min="0" step="0.01" placeholder="e.g. 120.50" inputmode="decimal">
                            </div>
                        </div>

                        <div style="margin-top:1rem; font-weight:bold; color:#10b981;">
                            Total Calc: <span id="wizTotalCalc">$0.00</span>
                        </div>
                    </div>

                    <!-- Step 7: Done! -->
                    <div class="wizard-step" data-step="7" style="position:relative; overflow:hidden;">
                        <canvas id="confettiCanvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;"></canvas>
                        <div class="wizard-success-icon" style="position:relative; z-index:2;"><i class="bi bi-check-lg"></i></div>
                        <div class="wizard-step-title" style="position:relative; z-index:2;">You're All Set, <span id="wizFinalName"></span>!</div>
                        <div class="wizard-step-desc" style="position:relative; z-index:2;">
                            Macadam is ready to track your hustle.
                        </div>

                        <div class="dashboard-preview" style="position:relative; z-index:2;">
                            [ Dashboard Preview Generating... ]
                        </div>

                        <div class="wizard-quicklinks" style="position:relative; z-index:2;">
                            <a href="index.html" class="wizard-quicklink"><i class="bi bi-speedometer2"></i> Dashboard</a>
                            <a href="weekly.html" class="wizard-quicklink"><i class="bi bi-calendar-week"></i> Weekly Log</a>
                            <a href="expenses.html" class="wizard-quicklink"><i class="bi bi-receipt"></i> Expenses</a>
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="wizard-nav" id="wizardNav">
                    <button class="wizard-btn wizard-btn-back" id="wizBack" style="visibility:hidden;">
                        <i class="bi bi-arrow-left"></i> Back
                    </button>
                    <button class="wizard-btn wizard-btn-skip" id="wizSkip" style="visibility:hidden;">
                        Skip this step
                    </button>
                    <button class="wizard-btn wizard-btn-next" id="wizNext">
                        Next <i class="bi bi-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        renderCategoryChips();
        bindWizardEvents();
        updateDynamicPayFields();

        // ── Wizard internals ────────────────────────────────────

        function renderCategoryChips() {
            const container = area.querySelector('#wizCategoryChips');
            container.innerHTML = wizardCategories.map((cat, i) => `
                <div class="category-chip">
                    <input type="text" value="${cat}" data-idx="${i}" class="chip-edit">
                    <span class="chip-remove" data-idx="${i}"><i class="bi bi-x"></i></span>
                </div>
            `).join('');

            container.querySelectorAll('.chip-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    wizardCategories.splice(parseInt(btn.dataset.idx), 1);
                    renderCategoryChips();
                });
            });

            container.querySelectorAll('.chip-edit').forEach(inp => {
                inp.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    const val = e.target.value.trim();
                    if(val && !wizardCategories.includes(val)) {
                        wizardCategories[idx] = val;
                    } else {
                        e.target.value = wizardCategories[idx]; // revert
                    }
                });
            });
        }

        function updateDynamicPayFields() {
            const container = area.querySelector('#wizDynamicPayFields');
            if(!container) return;
            container.innerHTML = selectedPlatforms.map(plat => `
                <div class="wizard-form-group">
                    <label for="wizPay_${plat}">${plat} Pay</label>
                    <div class="input-group">
                        <span class="cur-sym">${selectedCurrency}</span>
                        <input type="number" id="wizPay_${plat}" class="wiz-pay-input" data-platform="${plat}" min="0" step="0.01" placeholder="e.g. 150.00" inputmode="decimal">
                    </div>
                </div>
            `).join('');

            // Rebind total calc
            area.querySelectorAll('.wiz-pay-input').forEach(inp => {
                inp.addEventListener('input', calculateTotal);
                inp.addEventListener('blur', formatCurrencyInput);
            });
            calculateTotal();
        }

        function calculateTotal() {
            let total = 0;
            area.querySelectorAll('.wiz-pay-input').forEach(inp => {
                total += parseFloat(inp.value || 0);
            });
            area.querySelector('#wizTotalCalc').innerText = selectedCurrency + total.toFixed(2);
        }

        function formatCurrencyInput(e) {
            if(e.target.value) {
                e.target.value = parseFloat(e.target.value).toFixed(2);
            }
        }

        function triggerConfetti() {
            const canvas = document.getElementById('confettiCanvas');
            if(!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            const particles = [];
            for(let i=0; i<50; i++) {
                particles.push({
                    x: canvas.width / 2,
                    y: canvas.height / 2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10 - 5,
                    color: ['#f43f5e', '#10b981', '#3b82f6', '#f59e0b'][Math.floor(Math.random()*4)],
                    size: Math.random() * 5 + 5
                });
            }

            function animate() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                let active = false;
                particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.2; // gravity
                    if(p.y < canvas.height) active = true;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, p.size, p.size);
                });
                if(active) requestAnimationFrame(animate);
            }
            animate();
        }

        function bindWizardEvents() {
            const btnNext = area.querySelector('#wizNext');
            const btnBack = area.querySelector('#wizBack');
            const btnSkip = area.querySelector('#wizSkip');
            const newCatInput = area.querySelector('#wizNewCategory');

            btnNext.addEventListener('click', () => {
                // Validation before next
                if (currentStep === 0) {
                    const name = area.querySelector('#wizName').value.trim();
                    if(!name) {
                        area.querySelector('#wizName').closest('.wizard-form-group').classList.add('error');
                        return;
                    }
                    area.querySelector('#wizName').closest('.wizard-form-group').classList.remove('error');
                }

                if (currentStep === 1) {
                     const cur = area.querySelector('#wizCurrency').value.trim();
                     if(cur) {
                         selectedCurrency = cur;
                         area.querySelectorAll('.cur-sym').forEach(el => el.innerText = cur);
                     }
                }

                if (currentStep === totalSteps - 1) { // They clicked finish
                    window.onbeforeunload = null;
                    finishWizard();
                    return;
                }

                goToStep(currentStep + 1);
            });

            btnBack.addEventListener('click', () => goToStep(currentStep - 1));
            btnSkip.addEventListener('click', () => goToStep(currentStep + 1));

            // Prevent exit
            window.onbeforeunload = function() {
                if (currentStep > 0 && currentStep < totalSteps -1) {
                    return "Are you sure you want to leave setup?";
                }
            };


            // Notifications toggle
            const notifCheck = area.querySelector('#wizNotifications');
            if(notifCheck) {
                notifCheck.addEventListener('change', (e) => {
                    if(e.target.checked) {
                        e.target.parentElement.classList.add('selected');
                        if (Notification.permission !== 'granted') {
                            Notification.requestPermission();
                        }
                    } else {
                        e.target.parentElement.classList.remove('selected');
                    }
                });
            }

            // MPG Visibility
            area.querySelector('#wizVehicle').addEventListener('change', (e) => {
                const mpgGroup = area.querySelector('#wizMpgGroup');
                if(e.target.value === 'bike') {
                    mpgGroup.style.display = 'none';
                } else {
                    mpgGroup.style.display = 'block';
                }
            });

            // Avatar selection
            area.querySelectorAll('.avatar-option').forEach(av => {
                av.addEventListener('click', () => {
                    area.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
                    av.classList.add('selected');
                });
            });

            // Color selection
            area.querySelectorAll('.color-swatch').forEach(sw => {
                sw.addEventListener('click', () => {
                    area.querySelectorAll('.color-swatch').forEach(a => a.classList.remove('selected'));
                    sw.classList.add('selected');
                });
            });

            // Platform selection
            area.querySelectorAll('#wizPlatforms .wizard-checkbox-label input').forEach(chk => {
                chk.addEventListener('change', (e) => {
                    if(e.target.checked) {
                        e.target.parentElement.classList.add('selected');
                        if(!selectedPlatforms.includes(e.target.value)) selectedPlatforms.push(e.target.value);
                    } else {
                        // Keep at least one
                        if(selectedPlatforms.length === 1) {
                            e.target.checked = true;
                            return;
                        }
                        e.target.parentElement.classList.remove('selected');
                        selectedPlatforms = selectedPlatforms.filter(p => p !== e.target.value);
                    }
                    updateDynamicPayFields();
                });
            });

            // Vehicle type change -> update categories
            area.querySelector('#wizVehicle').addEventListener('change', (e) => {
                if(e.target.value === 'ev') wizardCategories = [...defaultCategoriesEV];
                else if(e.target.value === 'bike') wizardCategories = [...defaultCategoriesBike];
                else wizardCategories = [...defaultCategoriesGas];
                renderCategoryChips();
            });

            // Add category on Enter
            newCatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const name = newCatInput.value.trim();
                    if (name && !wizardCategories.includes(name)) {
                        wizardCategories.push(name);
                        renderCategoryChips();
                    }
                    newCatInput.value = '';
                }
            });

            // Date sync
            const wizStart = area.querySelector('#wizWeekStart');
            const wizEnd = area.querySelector('#wizWeekEnd');
            wizStart.addEventListener('change', (e) => {
                if(e.target.value) {
                    const d = new Date(e.target.value + "T12:00:00Z");
                    d.setDate(d.getDate() + 6);
                    wizEnd.value = d.toISOString().split('T')[0];
                }
            });

            // Validate end date
            wizEnd.addEventListener('change', (e) => {
                 if(wizStart.value && e.target.value < wizStart.value) {
                     e.target.value = wizStart.value;
                 }
            });

            // Quick fill hours
            area.querySelectorAll('.quick-fill-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = area.querySelector('#' + btn.dataset.target);
                    target.value = btn.dataset.val;
                });
            });

            // Set default dates for the first week form based on preference
            const updateDefaultDates = () => {
                const today = new Date();
                const startDayPref = parseInt(area.querySelector('#wizWeekStartDay').value || '1'); // 1=Mon, 0=Sun
                const day = today.getDay();

                const diff = (day < startDayPref ? 7 : 0) + day - startDayPref;

                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - diff);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                wizStart.value = startOfWeek.toISOString().split('T')[0];
                wizEnd.value = endOfWeek.toISOString().split('T')[0];
            };
            updateDefaultDates();
            area.querySelector('#wizWeekStartDay').addEventListener('change', updateDefaultDates);
        }

        function goToStep(step) {
            if (step < 0 || step >= totalSteps) return;

            currentStep = step;

            // Update dots
            area.querySelectorAll('.wizard-dot').forEach((dot, i) => {
                dot.classList.remove('active', 'completed');
                if (i < currentStep) dot.classList.add('completed');
                if (i === currentStep) dot.classList.add('active');
            });

            // Show the right step
            area.querySelectorAll('.wizard-step').forEach((s, i) => {
                s.classList.toggle('active', i === currentStep);
            });

            // Update nav buttons
            const btnBack = area.querySelector('#wizBack');
            const btnNext = area.querySelector('#wizNext');
            const btnSkip = area.querySelector('#wizSkip');

            btnBack.style.visibility = currentStep === 0 ? 'hidden' : 'visible';

            // Show skip only on step 5 (first week data)
            btnSkip.style.visibility = currentStep === 6 ? 'visible' : 'hidden';

            if (currentStep === totalSteps - 1) {
                // Last step — hide nav initially, show finish
                area.querySelector('#wizardNav').style.display = 'flex';
                btnSkip.style.visibility = 'hidden';
                btnBack.style.visibility = 'hidden';
                btnNext.innerHTML = 'Go to Dashboard <i class="bi bi-rocket-takeoff"></i>';

                const name = area.querySelector('#wizName').value.trim();
                area.querySelector('#wizFinalName').innerText = name;
                triggerConfetti();

                // Gen preview
                const goal = area.querySelector('#wizGoal').value || '500';
                area.querySelector('.dashboard-preview').innerHTML = `
                   <div style="text-align:center;">
                      <div style="font-size:1.2rem; color:#fff;">Welcome, ${name}!</div>
                      <div style="color:#10b981; font-weight:bold; margin-top:0.5rem;">Target: ${selectedCurrency}${goal}/week</div>
                      <div>${selectedPlatforms.join(', ')} Driver</div>
                   </div>
                `;
            } else {
                area.querySelector('#wizardNav').style.display = 'flex';
                btnNext.innerHTML = 'Next <i class="bi bi-arrow-right"></i>';
            }
        }
async function finishWizard() {
            try {
                // Save preferences
                const currency = area.querySelector('#wizCurrency').value.trim() || '$';
                const theme = area.querySelector('#wizTheme').value;
                const name = area.querySelector('#wizName').value.trim();
                const avatarEl = area.querySelector('.avatar-option.selected');
                const avatar = avatarEl ? avatarEl.dataset.avatar : '😎';
                const colorEl = area.querySelector('.color-swatch.selected');
                const accentColor = colorEl ? colorEl.dataset.color : 'rose';
                const weekStartDay = area.querySelector('#wizWeekStartDay').value;

                const vehicle = area.querySelector('#wizVehicle').value;
                const goal = parseFloat(area.querySelector('#wizGoal').value) || 0;
                const tax = parseFloat(area.querySelector('#wizTax').value) || 20;

                const notifsEnabled = area.querySelector('#wizNotifications')?.checked || false;
                const mpg = parseFloat(area.querySelector('#wizMpg')?.value) || 0;
                const mileageMethod = area.querySelector('#wizMileageMethod')?.value || 'odometer';

                const insCost = parseFloat(area.querySelector('#wizInsCost')?.value) || 0;
                const phoneCost = parseFloat(area.querySelector('#wizPhoneCost')?.value) || 0;

                await window.db.settings.bulkPut([
                    { key: 'currency_symbol', value: currency },
                    { key: 'driver_name', value: name },
                    { key: 'driver_avatar', value: avatar },
                    { key: 'accent_color', value: accentColor },
                    { key: 'week_start_day', value: weekStartDay },
                    { key: 'vehicle_type', value: vehicle },
                    { key: 'weekly_goal', value: goal },
                    { key: 'tax_rate', value: tax },
                    { key: 'notifications_enabled', value: notifsEnabled },
                    { key: 'vehicle_mpg', value: mpg },
                    { key: 'mileage_tracking_method', value: mileageMethod },
                    { key: 'recurring_insurance', value: insCost },
                    { key: 'recurring_phone', value: phoneCost },
                    { key: 'badge_first_setup', value: true },
                    { key: 'primary_platforms', value: selectedPlatforms }
                ]);

                window.currencySymbol = currency;
                document.documentElement.setAttribute('data-bs-theme', theme);
                localStorage.setItem('theme', theme);

                // Save categories — clear defaults and put the wizard list
                await window.db.expense_categories.clear();
                if (wizardCategories.length > 0) {
                    await window.db.expense_categories.bulkAdd(
                        wizardCategories.map(c => ({ name: c }))
                    );
                }

                // Save first week if filled out
                const wizHours = area.querySelector('#wizHours');
                const startDate = area.querySelector('#wizWeekStart').value;
                const endDate = area.querySelector('#wizWeekEnd').value;

                if (wizHours.value && parseFloat(wizHours.value) > 0 && startDate && endDate) {
                    // Sum up platforms
                    let totalPlatformPay = 0;
                    area.querySelectorAll('.wiz-pay-input').forEach(inp => {
                        if(inp.id !== 'wizTips') totalPlatformPay += parseFloat(inp.value || 0);
                    });

                    await window.db.weekly_earnings.add({
                        week_no: 1,
                        start_date: startDate,
                        end_date: endDate,
                        hours_worked: parseFloat(wizHours.value) || 0,
                        active_hours: parseFloat(area.querySelector('#wizActiveHours').value) || 0,
                        deliveries: parseInt(area.querySelector('#wizDeliveries').value) || 0,
                        doordash_pay: totalPlatformPay, // Store total base pay here for backwards compat
                        tips: parseFloat(area.querySelector('#wizTips').value) || 0,
                        other_pay: 0,
                        paid_out_of_pocket: 0,
                        notes: `Platforms: ${selectedPlatforms.join(', ')}`
                    });
                }

                localStorage.setItem(ONBOARDED_KEY, 'true');
                dismissGate(gate);
            } catch (err) {
                console.error('Wizard finish error:', err);
            }
        }
    }

    // ================================================================
    //  GATE DISMISS
    // ================================================================

    function dismissGate(gate) {
        gate.classList.add('gate-exit');
        setTimeout(() => {
            gate.remove();
            window.location.reload();
        }, 350);
    }

})();
