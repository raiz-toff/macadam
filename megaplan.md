# MACADAM — Complete Feature Plan
### Gig Delivery Driver Earnings Intelligence Platform
#### Local-First | Multi-Platform | Zero Cloud | Astro 5.0+

---

> **How to read this document:**
> Features are grouped by domain. Each feature is numbered globally and described in enough detail to implement it independently. Work through them one by one. Some features depend on earlier ones — those dependencies are noted inline.

---

## PART 1 — ONBOARDING & IDENTITY

**1. Platform Selection Screen**
On first launch, show a full-screen picker with logos and names for: DoorDash, Uber Eats, Foodora, Skip the Dishes, Instacart, Amazon Flex, and a generic "Other" option. Each card is tappable and multi-selectable. User must pick at least one before proceeding. Store as `user.platforms[]` in IndexedDB.

**2. Platform-Aware Terminology Engine**
After platform selection, load a terminology config per platform. DoorDash calls them "Dashers" and deliveries are "orders." Uber Eats calls them "couriers" and tasks are "trips." Foodora uses "riders." Skip the Dishes uses "couriers." All labels, button text, and tooltips across the entire app swap dynamically based on what platforms are active. If multi-platform, default to neutral terms like "delivery" and "driver."

**3. Driver Name & Avatar Setup**
Step two of onboarding: collect the driver's preferred display name. Offer a grid of 12 avatar illustrations (motorcycle, car, bicycle, scooter, e-bike, van, cargo bike, etc.) or let user upload a custom avatar image (stored as base64 in IndexedDB). Avatar appears in the dashboard header, shift log entries, and exported reports.

**4. Primary Currency & Region**
Ask for country/region (Canada, USA, UK, etc.) and auto-populate currency symbol, decimal separator, and number format. For Canada, default to CAD with a note that tips are taxable. Persist to `user.locale` and apply globally to every money field in the app.

**5. Vehicle Setup Wizard**
Dedicated sub-step: choose vehicle type (Gas Car, Hybrid, Electric Vehicle, Motorcycle, Bicycle, E-Bike, Scooter, On Foot). Each type unlocks relevant fields. Gas/Hybrid asks for fuel efficiency (L/100km or MPG), current fuel price, engine displacement. EV asks for kWh per 100km and electricity rate. Bike/E-Bike asks for maintenance cost per km. This populates the expense calculator engine.

**6. Multiple Vehicle Profiles**
Allow adding more than one vehicle during onboarding or later in settings. For example: "Honda Civic" for daytime DoorDash + "Road Bike" for evening Foodora. Each shift can be assigned a vehicle. Expense calculations pull from the matching vehicle's efficiency data.

**7. Home Base / Starting Zone Setup**
Ask the driver to pin or type their starting location (city/neighborhood, no exact address needed for privacy). This is used for estimating dead miles and zone-based analytics. Stored as a label only, not GPS coordinates.

**8. Work Schedule Preference**
Ask how they prefer to work: Full-Time (30+ hrs/week), Part-Time (10–30 hrs), Side Hustle (<10 hrs), or Seasonal. This sets the default view density on the dashboard — full-time dashers see weekly KPIs prominently, side hustlers see per-shift summaries instead.

**9. Weekly Earnings Goal**
Numeric input: how much do you want to earn per week (gross, before expenses)? Show a motivational label like "That's $X/hr if you work 20 hrs." Store as `user.weeklyGoal`. Drives the progress ring on the dashboard.

**10. Monthly Earnings Goal**
Same as above but monthly. Auto-populated as `weeklyGoal × 4.33` but editable. Used for the monthly budget and tax planning sections.

**11. Annual Income Target**
Full-year income target. Auto-populated but editable. Drives the annual tax estimator and year-to-date progress bar.

**12. Tax Withholding Percentage**
Ask what % of earnings the user wants to mentally "set aside" for taxes. Default to provincial/state suggestion (e.g., 25% for Ontario self-employed). Every time a shift is logged, that % is shown as "pre-tax net" vs "gross." This is a mental accounting tool, not actual tax advice.

**13. HST/GST Registration Toggle**
For Canadian drivers: ask if they are HST/GST registered (required if earning >$30,000/year). If yes, unlock an HST collected tracker per shift and an ITC (Input Tax Credit) tracker for expenses. Display a badge "HST Registered" on reports.

**14. Preferred Distance Unit**
Kilometers or Miles. One button, stored globally. All mileage fields, efficiency calculations, and reports respect this.

**15. Dark/Light/Auto Theme Selection**
Onboarding final step: pick visual theme. "Auto" follows device system preference. Persisted in `localStorage` so it applies before any IndexedDB read (avoids flash of wrong theme).

**16. Notification Preferences Setup**
Ask which MacadamNotify alerts they want: daily summary toast, weekly goal nudge, streak alerts, expense reminders, or none. These are all client-side (no push server needed) — driven by time-based checks on app open.

**17. Onboarding Progress Persistence**
If the user closes mid-onboarding, save progress to `sessionStorage`. On next open, offer "Continue where you left off" or "Start Over." Prevents frustration from accidental closes.

**18. Onboarding Completion Animation**
On finishing onboarding, fire a full-screen celebration animation (confetti or a branded "road opening" animation) with the message "Your Vault is Ready, [Name]." This is the brand moment.

**19. Onboarding Skip to Demo**
At any point in onboarding, a small "Try Demo First" link launches the Transient Demo Mode (as already built) without saving any data. Helps hesitant users explore before committing.

**20. Re-Onboarding / Reset Flow**
In Settings → Danger Zone: a "Reset My Vault" option that wipes all IndexedDB data and returns the user to step 1 of onboarding. Requires typing "RESET" in a MacadamConfirm dialog.

---

## PART 2 — MULTI-PLATFORM MANAGEMENT

**21. Platform Switcher — Slide Tab Bar**
When 2+ platforms are active, a persistent tab bar (or pill-style switcher) appears at the top of the dashboard. Tabs show platform logo + name. Switching animates the dashboard content to the selected platform's data. If only 1 platform, hide the switcher entirely.

**22. Platform Switcher — Dropdown Mode**
In settings, let the user choose between "Tab Bar" and "Dropdown" as their preferred switcher UI. The dropdown floats in the top-right corner of the header and is accessible from every view.

**23. Global View (All Platforms Combined)**
A special "All" or "Global" tab in the switcher that aggregates earnings, expenses, and metrics across every active platform into unified totals. This is the default landing view for multi-platform drivers.

**24. Per-Platform Color Coding**
Each platform is assigned a brand-accurate accent color: DoorDash = Red (#FF3008), Uber Eats = Black/Green (#142328), Foodora = Pink (#E2006A), Skip the Dishes = Orange (#F96302). Every chart, badge, and data point is color-coded by platform so a multi-platform global view is instantly readable.

**25. Add Platform Anytime**
In Settings → Platforms: a button to add a new platform mid-use without resetting data. The onboarding platform wizard re-runs for just the new platform (terminology, color, goals).

**26. Deactivate Platform (Soft Delete)**
Remove a platform from the active view without deleting its historical data. The platform's past shifts and earnings are preserved and still count in historical reports — it just disappears from the switcher. Reactivating it restores it fully.

**27. Platform-Specific Weekly Goal**
In addition to the global weekly goal, each platform can have its own earnings goal. The dashboard shows per-platform goal rings when viewing a single platform.

**28. Platform-Specific Tax Rate Override**
Some drivers treat platform income differently (e.g., a hobbyist rate vs. a commercial rate). Allow overriding the tax withholding % per platform.

**29. Platform Notes / Bio Card**
Per-platform freetext notes field. "DoorDash — best between 11am–2pm in my zone." "Uber Eats — avoid Sundays, dead zone." Displayed on the platform's settings card.

**30. Platform Priority Ranking**
Allow the user to drag-and-drop platforms into a priority order. This controls the default tab order in the switcher and the stack order in global chart legends.

---

## PART 3 — SHIFT LOGGING

**31. Quick-Add Shift Button**
A persistent floating action button (FAB) on the dashboard. Tapping it opens a bottom drawer with the minimum required fields to log a shift: platform, date, start time, end time, gross earnings. One-tap save. Advanced fields available by expanding the drawer.

**32. Shift Start Timer (Live Mode)**
Tap "Start Shift" and a live timer runs in the header bar. When shift ends, tap "End Shift" — the duration auto-fills. This is entirely client-side; no background process needed, the start timestamp is saved in `localStorage` and read on next open.

**33. Shift Date**
Defaults to today. Calendar picker for backdated entry. Supports logging shifts from up to 2 years back for historical import.

**34. Shift Start & End Time**
24h or 12h time picker (respects user locale). Duration auto-calculates and displays below the fields.

**35. Platform Assignment Per Shift**
Dropdown defaulting to the user's primary platform. Multi-platform drivers can switch easily.

**36. Gross Earnings Input**
The in-app amount the platform paid before any deductions. Large tap-friendly numeric keypad overlay.

**37. Tips Earned (Separate Field)**
Track tips separately from base earnings. Some platforms (Uber Eats, DoorDash) pay tips independently. Separate tracking enables tip-rate analysis. Field accepts zero.

**38. Bonus / Incentive Earnings**
A separate field for platform incentive pay: DoorDash "Peak Pay," Uber Eats "Surge," Foodora "Boost." Stored as its own category so the driver can see what % of income comes from base vs. bonuses.

**39. Number of Deliveries / Orders**
How many orders completed this shift. Auto-calculates earnings per order.

**40. Total Distance Driven (Shift)**
Manual entry (km or miles). Used for fuel cost calculation and mileage deduction tracking.

**41. Online Time vs. Active Time**
Two sub-fields: "Time app was open" (online) and "Time actually delivering" (active/busy). The ratio is the utilization rate — a key efficiency metric.

**42. Vehicle Used (Per Shift)**
Dropdown of the driver's saved vehicle profiles. Drives the expense calculation for that shift.

**43. Weather Condition (Per Shift)**
Optional dropdown: Clear, Rain, Snow, Fog, Extreme Heat. Used in weather correlation analytics to determine if conditions affect earnings.

**44. Shift Zone / Area Tag**
Freetext or predefined zone label (e.g., "Downtown Core," "Airport Zone," "Suburbs North"). Enables zone-performance analysis.

**45. Shift Mood Tag**
Optional emoji/word mood tag: Great, Good, Neutral, Rough, Terrible. Lightweight journaling for driver wellbeing and performance correlation.

**46. Shift Notes**
Freetext multi-line notes per shift. "Restaurant was backed up. App crashed twice. One huge tip from a hotel order."

**47. Shift Edit (Full)**
Tap any past shift in the log to open the full edit form. Every field is editable. Changes recalculate all dependent metrics immediately.

**48. Shift Delete (Soft)**
Deleting a shift moves it to a "Trash" bin in IndexedDB with a `deletedAt` timestamp. Deleted shifts are excluded from all calculations but can be recovered within 30 days.

**49. Shift Trash & Restore**
A "Trash" view in Settings shows soft-deleted shifts. Each has a "Restore" and "Permanently Delete" button. Auto-purge permanently after 30 days (triggered on app open).

**50. Duplicate Shift**
A "Duplicate" button on any shift entry. Opens the add form pre-filled with the same platform, vehicle, and zone — just change the date and earnings. Massive time saver for drivers with consistent routines.

**51. Shift Templates**
Save a shift configuration as a named template: "Typical Friday Night," "Morning DoorDash Run." When logging, pick a template and it pre-fills all fields. Edit what changed (earnings, distance) and save.

**52. Bulk Shift Import (CSV)**
Parse a user-uploaded CSV with column mapping UI. Map columns like "Date," "Gross," "Tips," "Platform" to Macadam fields. Preview first 5 rows before confirming import. Append or overwrite modes.

**53. Recurring Shift Scheduler**
Define a recurring shift pattern: "Every Tuesday and Thursday, 5pm–9pm, DoorDash." The app creates placeholder shift entries for the next 4 weeks. Driver fills in actual earnings after each one. Uncompleted placeholders show in a "Pending Shifts" view.

**54. Shift Conflict Detection**
When adding a shift, check if the start/end time overlaps with an existing shift on the same day. Show a warning toast with the conflicting shift details. Allow override.

**55. Hours Worked Per Day Cap Warning**
If a single shift or combined shifts on one day exceed a configurable threshold (default: 12 hours), show a wellbeing warning toast: "You've logged 12+ hours today. Make sure to rest." Non-blocking, dismissible.

**56. Shift Summary Card**
After saving any shift, show a MacadamNotify-style summary card: earnings, duration, hourly rate, distance, net after expenses. Gives instant feedback and a sense of accomplishment.

---

## PART 4 — EARNINGS ANALYTICS

**57. Hourly Earnings Rate (Per Shift)**
Auto-calculated: Gross ÷ Duration. Displayed on the shift card and in all analytics. The single most important metric for a delivery driver.

**58. Hourly Earnings Rate (Net, After Expenses)**
Gross minus estimated vehicle expenses for that shift's distance, divided by duration. This is the *real* hourly rate. Always surfaced alongside gross hourly.

**59. Earnings Per Order**
Gross ÷ Number of Orders. Highlights whether the shift had a few high-value orders or many low-value ones.

**60. Tip Rate**
Tips ÷ Gross × 100. Shows what percentage of income came from tips. Tracked per platform, per day-of-week, per zone.

**61. Bonus Dependency Ratio**
Bonus Earnings ÷ Gross × 100. If this is very high (>40%), the driver is heavily dependent on surge/peak pay, which is volatile. Flag this in analytics with a warning.

**62. Daily Earnings Summary**
For any selected day, show total gross, net, hours worked, deliveries, all platforms combined and per platform. Accessed by tapping a day in the calendar view.

**63. Weekly Earnings Summary**
7-day rolling view with daily bars. Shows goal progress ring, best day highlight, total hours, total deliveries, average hourly rate for the week.

**64. Monthly Earnings Summary**
Calendar heatmap showing earnings per day (darker = more earned). Total at top with % vs. last month. Scrollable month picker.

**65. Annual Earnings Summary**
12-month bar chart. Each bar represents total gross for that month. Year-to-date total, projected year-end (based on current month pace), prior year comparison if data exists.

**66. Earnings Trend Line**
A rolling 30-day line chart of daily earnings. Shows upward/downward trend with a simple linear regression line. Tells the driver if they're growing or declining over time.

**67. Best Day of Week Analysis**
Break down average earnings by day (Mon–Sun). Show which day earns the most, least, and the variance. "Your best day is Friday. Your worst is Monday."

**68. Best Time of Day Analysis**
Break down average hourly rate by hour of day (12am–11pm). Show a heat stripe. "You earn the most between 6pm–9pm."

**69. Best Zone Analysis**
If zone tags are used, show average earnings per order and per hour by zone. Helps drivers decide where to position.

**70. Platform Performance Comparison**
Side-by-side stat cards for each active platform: average hourly rate, average tip %, total earnings YTD, total hours YTD. Instantly answers: "Which platform pays me more?"

**71. Earnings Velocity Widget**
On the main dashboard: "At your current pace today, you will earn $X by end of shift." Based on current shift's active timer and running earnings. Updates every time the user opens the app while a shift is active.

**72. Goal Progress Ring**
A circular progress indicator on the main dashboard for the current week's goal. Shows: earned so far, goal total, remaining amount, % complete. Changes color as it fills (red → yellow → green).

**73. Streak Counter — Days Worked**
Track consecutive days where the driver logged at least one shift. Show a flame icon and streak count. Motivational gamification tied to consistency.

**74. Streak Counter — Weekly Goal Hit**
Track consecutive weeks where the driver hit their weekly earnings goal. Separate streak from days-worked streak. "4-week goal streak 🔥"

**75. Personal Records Dashboard**
A dedicated "Personal Bests" section: Best Single Shift Earnings, Best Hourly Rate Ever, Most Deliveries in a Shift, Longest Streak, Best Tip in a Single Shift, Highest Earning Week, Highest Earning Month. Each record shows the date it was set.

**76. Earnings vs. Hours Scatter Plot**
Plot every shift as a dot: x-axis = hours worked, y-axis = gross earnings. A driver should see a positive correlation. Outliers (long shifts, low pay) become immediately visible.

**77. Income Source Breakdown (Donut Chart)**
Break total earnings into: Base Pay, Tips, Bonuses/Surge. Show percentages. Helps driver understand their income composition.

**78. Earnings Comparison: This Week vs. Last Week**
A simple two-bar mini-chart. Green if this week is ahead, red if behind. Shown on the main dashboard header.

**79. Cumulative Earnings Chart (YTD)**
A rising line chart from Jan 1 to today, showing cumulative gross earnings. Plot the goal trajectory as a dashed line. Intersection point shows if on track.

**80. Earnings Per Kilometre**
Gross ÷ Distance Driven. A useful efficiency metric especially for drivers who drive far for few orders. Cross-platform comparable.

**81. Average Shift Length**
Running average of all shifts. Helps the driver identify if they're working longer than optimal.

**82. Zero-Day Tracker**
Count of days in the current month where no shifts were logged. Not judgmental — just informational. "6 days off this month."

---

## PART 5 — EXPENSE TRACKING

**83. Auto-Calculated Fuel Cost (Per Shift)**
Using the vehicle's fuel efficiency, current fuel price, and shift distance, auto-calculate estimated fuel cost. Display on shift card as "Est. Fuel: $X.XX." Editable if the driver knows exact cost.

**84. Auto-Calculated EV Charging Cost (Per Shift)**
For EV drivers: kWh per 100km × electricity rate × distance. Same display as fuel cost.

**85. Manual Expense Entry**
A standalone expense form: category, amount, date, platform assignment (or "all"), notes. Categories pre-loaded: Fuel, Maintenance, Insurance, Phone Bill, Phone Mount, Insulated Bag, Parking, Car Wash, Registration, Tolls, Accounting, Other.

**86. Expense Categories — Full List**
Pre-built category list with icons: Fuel ⛽, Oil Change 🔧, Tire Rotation 🔄, Brakes 🛑, Car Wash 🚿, Insurance 🛡, Registration 📋, Phone Plan 📱, Phone Accessories 🔌, Delivery Bag 🎒, Hot Bag 🔥, Car Seat Cover 🪑, Parking 🅿️, Tolls 🛣, Accounting/Tax Prep 📊, Other ➕. All user-editable.

**87. Add Custom Expense Category**
If no preset category fits, the user can type a custom category name and assign an emoji. Saved for future use.

**88. Recurring Expense Entry**
Mark an expense as recurring: Monthly (insurance, phone plan), Annual (registration), Weekly (fuel estimated). The app creates automatic expense log entries on schedule. Driver confirms or edits the amount each time.

**89. Expense-to-Platform Assignment**
Any expense can be assigned to a specific platform or split across all active platforms evenly. Important for deduction tracking when filing taxes separately per platform.

**90. Expense Split (Partial Business Use)**
For mixed-use expenses (e.g., a phone plan used 60% for delivery), input the business-use percentage. The app tracks only the deductible portion. Useful for CRA/IRS compliance.

**91. Receipt Photo Attachment**
Attach a photo of a receipt to any expense. Stored as compressed base64 in IndexedDB. Viewable in the expense detail and in expense reports. Cap per image to maintain storage health.

**92. Expense List View**
Sortable, filterable table of all expenses. Sort by date, amount, category, platform. Filter by date range, category, platform. Search by notes keyword.

**93. Monthly Expense Total Widget**
On the dashboard: total expenses this month broken into categories as a mini bar chart. At a glance, which category cost the most.

**94. Net Profit Calculation**
Gross Earnings − Total Expenses = Net Profit. Shown per shift, per week, per month, per year. Always displayed alongside gross to prevent "gross illusion" — thinking you earned more than you really did.

**95. Expense vs. Earnings Ratio**
Expenses ÷ Gross × 100 = Expense Ratio %. Ideally under 30%. Show as a gauge widget on the dashboard. Color-coded: green <25%, yellow 25–40%, red >40%.

**96. Fuel Price Tracker**
Let the driver update their current fuel price whenever they fill up. Stored with a timestamp so the app can calculate historically accurate fuel costs. Chart of fuel prices over time.

**97. Mileage Deduction Calculator (CRA Method)**
For Canadian drivers: apply the CRA automobile allowance rates (currently $0.70/km for the first 5,000km, $0.64/km after) to total business km. Show the deductible amount and note it's per-vehicle, per-year. Refreshable when CRA updates rates annually.

**98. Mileage Deduction Calculator (IRS Method)**
For US drivers: apply the IRS standard mileage rate (e.g., 67 cents/mile for 2024) to total business miles. Show the deductible value.

**99. Actual Cost Method vs. Standard Mileage — Comparison**
Show a comparison: "Using standard mileage deduction, your deduction is $X. Using actual costs tracked, your deduction is $Y. Actual costs may be more beneficial for you." Non-advisory, informational only.

**100. Total Business Kilometres / Miles YTD**
Running total of all distance logged across all shifts, year-to-date. Large prominent display in the Tax section. This is the most important number for Canadian/US mileage deductions.

---

## PART 6 — TAX MANAGEMENT

**101. Tax Dashboard**
A dedicated `/tax` route. Shows: YTD gross, estimated taxable income, mileage deduction, total expense deductions, estimated net taxable income, estimated tax owing (at the user's configured rate), and "set aside" balance (how much of each payment should have been saved).

**102. Quarterly Tax Reminder**
Based on the driver's region, remind them of tax installment deadlines. Canada: Mar 15, Jun 15, Sep 15, Dec 15. USA: Apr 15, Jun 15, Sep 15, Jan 15. MacadamNotify alert triggered on app-open within 14 days of each deadline.

**103. Tax Set-Aside Tracker**
Every shift logged automatically allocates X% (user-configured) into a virtual "Tax Jar." The Tax Dashboard shows: Total Jar Balance (how much they should have saved), whether that matches their actual bank savings is up to them, but the number is always visible.

**104. HST/GST Collected Tracker**
For registered Canadian drivers: per-shift field "HST Collected." Running total of HST collected YTD. Separate from earnings. Quarterly filing reminder tied to the HST period.

**105. Input Tax Credit (ITC) Tracker**
Track HST paid on business expenses. Auto-calculate ITC claimable (HST on expenses). Net HST remittable = HST Collected − ITC. Shown on the tax dashboard.

**106. T2125 Helper (Canada — Business Income)**
A guide/checklist format: walk the driver through what to put on each line of CRA form T2125 (Statement of Business Income). Pre-populate line 8299 (gross income), line 9270 (motor vehicle — standard or actual), line 8220 (telephone). Non-filing, educational.

**107. Schedule C Helper (USA — Self Employment)**
Same concept for IRS Schedule C. Pre-populate key lines from tracked data. Informational helper, not tax preparation software.

**108. Tax Year Selector**
All tax tools can be switched between tax years (current year, last year, 2 years ago) if historical data exists. Useful during tax filing season.

**109. Estimated Tax Owing Widget**
On the main dashboard, a small widget: "Est. Tax Owing: $X,XXX" based on YTD earnings × configured tax rate − estimated deductions. Tapping it goes to the full Tax Dashboard.

**110. Export Tax Summary (JSON)**
One-tap export of a tax-year summary: gross income, all deduction categories, net income, estimated tax, HST/GST summary. JSON format for use by accountants or tax software.

**111. Export Tax Summary (CSV)**
Same data as above in CSV, formatted for import into tax preparation software.

**112. Province/State Tax Rate Presets**
A dropdown of Canadian provinces and US states with their approximate self-employment tax rates pre-filled. User selects their province/state during onboarding (or in Settings) and the tax rate auto-fills. User can always override.

**113. CPP Contributions Estimator (Canada)**
For Canadian self-employed drivers: estimate CPP contributions owing based on net self-employment income. Display the formula and the estimated amount. Very useful since CPP is easily forgotten.

**114. Self-Employment Tax Estimator (USA)**
Estimate 15.3% SE tax on net earnings. Show the standard SE tax deduction (half of SE tax). Informational only.

---

## PART 7 — VEHICLE & MILEAGE MANAGEMENT

**115. Vehicle Profile Card**
Each saved vehicle has a card: name/nickname, type, make/model (optional), year (optional), color (optional), efficiency rating, and total km/miles logged on it in the app.

**116. Vehicle Efficiency Update**
As vehicles age, efficiency changes. Allow the driver to update their fuel efficiency at any time. The change takes effect for future shifts; past shifts retain their historical efficiency values at time of logging.

**117. Odometer Log**
An optional odometer log: enter actual odometer reading periodically. The app calculates real-world total distance and compares to delivery distances logged. The difference is personal driving for tax separation purposes.

**118. Vehicle Maintenance Tracker**
Log maintenance events: oil change, tire rotation, brake replacement, air filter. Each log includes date, mileage at time of service, cost, and next service due (in km or date). An upcoming maintenance alert appears when the threshold approaches.

**119. Oil Change Reminder**
Set an oil change interval (e.g., every 5,000 km or every 6 months). The app tracks logged delivery km and sends a MacadamNotify reminder when approaching the interval.

**120. Tire Tread & Replacement Tracker**
Log tire purchase date and mileage. Set expected replacement mileage (e.g., 60,000 km). App calculates % of tire life remaining. Warning at 15% remaining.

**121. Insurance Renewal Reminder**
Log insurance renewal date. App alerts 30 days and 7 days before expiry. Stored as an annual recurring expense.

**122. Registration Renewal Reminder**
Same as insurance, for vehicle registration. Annual recurring expense with alerts.

**123. Vehicle Cost Per KM / Mile**
Aggregate all vehicle-related expenses (fuel, maintenance, insurance pro-rated per km). Calculate total cost per km. Display alongside earnings per km to show the true margin.

**124. Depreciation Estimator**
Basic straight-line vehicle depreciation: purchase price ÷ expected lifespan in km. Add this per-km cost to the vehicle cost per km for a fully-loaded cost model. Helps drivers understand if a vehicle is worth operating.

**125. Multi-Vehicle Shift Stats**
In vehicle analytics: compare performance across vehicles. "On the Honda, you earn $22/hr net. On the bike, you earn $19/hr but with $2/hr expenses vs $7/hr for the car."

---

## PART 8 — SCHEDULE & TIME MANAGEMENT

**126. Weekly Schedule Calendar View**
A week-grid calendar (Mon–Sun or Sun–Sat, configurable) showing logged shifts as color-coded blocks. Each block's height represents duration. Tap to see shift details.

**127. Monthly Calendar View**
Month grid. Each day shows a mini earnings total. Days with shifts have a colored dot per platform. Days above weekly average earn a gold star highlight.

**128. Shift Planning Mode**
A separate "Planning" toggle on the calendar. Add planned (future) shifts as light/dashed blocks. These are placeholders, not logged data. When the actual shift is complete, the placeholder converts to a real logged entry.

**129. Time Blocking for Non-Delivery Days**
Allow marking days as "Off," "Sick," "Vacation," "Holiday." These appear on the calendar as grey blocks. Excluded from availability calculations.

**130. Hours-Per-Week Tracker**
Running total of hours worked this week vs. personal hour target. Shown as a small bar on the dashboard. Prevents both overwork and underwork relative to the driver's goal.

**131. Optimal Hours Calculator**
Based on the driver's hourly rate and weekly earnings goal: "To hit $X this week, you need to work Y hours at your current average rate." Dynamically updates as shifts are logged.

**132. Time vs. Earnings Efficiency Graph**
A scatter plot of weeks: x-axis = hours worked, y-axis = total earnings. Shows if working more hours actually improves earnings or if there's a ceiling.

**133. Peak Hours Indicator**
On the schedule, overlay a heat stripe (pulled from the driver's own historical data) showing their highest-earning hours. Helps them plan future shifts at their personal peak times.

**134. Rest Period Tracker**
Track time between shifts. Flag when a new shift starts less than 8 hours after the previous one ended. Optional, configurable threshold. Supports driver health.

**135. Night Shift Identifier**
Automatically tag any shift with hours between 10pm and 6am as a "night shift." Segment analytics by night vs. day shifts to help drivers evaluate the premium (or lack thereof) from working nights.

---

## PART 9 — GOALS & GAMIFICATION

**136. Multi-Tier Goal System**
Support three goal scopes simultaneously: Daily Goal, Weekly Goal, Monthly Goal. Each has a separate progress ring/bar. Completing a daily goal contributes to weekly; weekly contributes to monthly.

**137. Custom Goal Types**
Beyond earnings, allow goals for: Total Deliveries, Total Hours Worked, Total Distance Logged, Net Profit, Tips Earned. User picks up to 3 active goals.

**138. Goal History Log**
Record every goal period (week, month, year) as "Hit" or "Missed" with actual vs. target. A rolling table of goal performance. Shows the driver their long-term consistency.

**139. Milestone Badges**
A badge system awarded for achievements: "First Shift," "First $100 Day," "1000 Deliveries," "1-Month Streak," "Hit Goal 4 Weeks in a Row," "First $1000 Week," "$10,000 Lifetime Earned," etc. Badges are stored locally and shown on a "Trophies" screen.

**140. Badge Unlock Animation**
When a new badge is earned, trigger a prominent MacadamNotify-style full-card animation. The badge slides in with a shine effect and a short celebratory message.

**141. XP & Level System**
Award experience points for: logging a shift (10 XP), hitting daily goal (+25 XP), hitting weekly goal (+100 XP), adding an expense (5 XP), logging maintenance (+15 XP), exporting a report (+20 XP). Level up every 500 XP. Levels are just for fun (no paywall unlock). Shown as a small level badge near the avatar.

**142. Streak Freeze**
Allow the driver to "freeze" their streak once per month if they miss a day. Tapping the freeze icon on the streak card marks the day as "protected." Encourages return after a genuine day off.

**143. Challenge Mode**
Pre-built challenges the driver can opt into: "Earn $50 every day for 7 days," "Complete 20 deliveries in a week," "Log every expense this month," "Work 5 different zones this week." Progress tracked per challenge. Completing a challenge awards a unique badge.

**144. Personal Best Notifications**
When a driver beats their personal record for any tracked metric (best hourly rate, highest single-shift earnings, most deliveries), immediately fire a MacadamNotify celebration: "🏆 New Personal Best: $34.20/hr!"

**145. Earnings Thermometer Widget**
A vertical thermometer on the dashboard showing progress toward the monthly goal. The mercury rises as earnings accumulate. Goes "over the top" if the goal is surpassed.

---

## PART 10 — REPORTS & EXPORTS

**146. Weekly Report Card**
A formatted, print-ready summary for one week: all shifts tabulated, total gross, total expenses, net, average hourly rate, goal hit/miss status. Exportable as PDF or CSV.

**147. Monthly Report Card**
Same as weekly but monthly scope. Includes a per-day breakdown, top earning day highlight, expense category breakdown pie chart.

**148. Annual Report**
Full-year summary: month-by-month table, all totals, personal best records, YTD metrics, tax summary section. Formatted for accountant handoff.

**149. Per-Platform Report**
Filtered report showing only data for one platform. Useful for comparing performance and for platform-specific record keeping.

**150. Custom Date Range Report**
Date range picker: from date → to date. Generate any report for any arbitrary window. Export as CSV or JSON.

**151. CSV Export (All Shifts)**
Export the entire shifts database as a flat CSV. Columns: Date, Start, End, Duration, Platform, Gross, Tips, Bonuses, Orders, Distance, Vehicle, Zone, Weather, Notes.

**152. CSV Export (All Expenses)**
Export all expense records. Columns: Date, Category, Amount, Platform, Business%, Notes.

**153. JSON Export (Full Vault)**
One-file export of the entire Macadam vault: all shifts, expenses, vehicles, goals, settings. This is the primary backup mechanism.

**154. JSON Import (Full Vault Restore)**
Import a previously exported vault JSON. Validates the schema first, then presents a diff: "This will add X shifts and Y expenses to your current data." Merge or Replace modes.

**155. Print View**
A `/print` route or print stylesheet that renders any report in a clean black-and-white format optimized for printing. All charts convert to tables. All colors become greyscale.

**156. Share via Clipboard**
A "Copy Summary" button that puts a formatted plaintext earnings summary on the clipboard (e.g., "Week of May 5: Gross $847.50, Net $620.30, 32 hrs, 4.2/hr net"). Paste into any messaging app.

**157. QR Code Export**
For small data summaries (weekly stats), generate a QR code that encodes the data. Another device with Macadam can scan it to import that week's stats. Useful for moving data between devices without email.

**158. Report Template Builder**
Choose which sections to include in exports: toggle earnings summary, expense breakdown, tax summary, vehicle log, badge/level info. Save as a named template for quick re-use.

---

## PART 11 — DATA HEALTH & STORAGE MANAGEMENT

**159. Vault Storage Usage Meter**
In Settings → Data: show how much IndexedDB space is being used (in MB) with a progress bar. Benchmarked against a 50MB practical soft limit. Warning at 80% capacity.

**160. Data Integrity Check**
A "Run Health Check" button that validates all IndexedDB records: checks for orphaned expenses (platform no longer active), shifts with missing required fields, corrupt date formats. Reports issues and offers one-click fixes.

**161. Auto-Archive Old Data**
Offer to "archive" shifts older than 2 years: remove from active IndexedDB, export to a downloadable JSON archive file. Reduces storage usage without data loss.

**162. Incremental Backup Reminder**
MacadamNotify reminder every 30 days: "It's been a month since your last backup. Export your Vault to keep your data safe." Links directly to the JSON export function.

**163. Backup History Log**
Track when the user last exported their vault (timestamp stored in `localStorage`). Show "Last backup: X days ago" in Settings. Color-coded: green <7 days, yellow 7–30 days, red >30 days.

**164. Shift Count & Database Stats**
In Settings → Data: total number of shifts logged, total expenses logged, total vehicles, date range of data (oldest to newest shift), total km logged.

**165. Offline Indicator**
A subtle status pill in the header showing online/offline status. Since Macadam is local-first, offline mode is fully functional — but drivers might want to know status before trying to export or access platform links.

---

## PART 12 — SETTINGS & PERSONALIZATION

**166. Display Name Change**
Edit the display name at any time from Settings → Profile.

**167. Avatar Change**
Swap avatar from the preset grid or upload a new custom image.

**168. Currency Change**
Switch currency post-onboarding. All historical values stay the same numerically (no conversion) but the symbol updates. A warning is shown: "This changes the symbol only, not historical amounts."

**169. Theme Toggle**
Light / Dark / Auto. Stored in `localStorage` for pre-render flash prevention.

**170. Accent Color Picker**
Let the user pick a personal accent color for UI chrome (buttons, rings, highlights). Separate from platform colors. Offer 12 curated options plus a hex input.

**171. Font Size Preference**
Small / Medium / Large / Extra Large. Applied via a CSS class on the `<html>` element. Improves accessibility.

**172. Compact vs. Spacious Layout**
Toggle between a dense "pro" layout and a more spacious "casual" layout. Compact mode fits more data on screen; spacious mode is easier to tap on mobile.

**173. Dashboard Widget Customizer**
Drag-and-drop widget grid on the main dashboard. Each widget (goal ring, earnings this week, hourly rate, expense ratio, streak, etc.) can be shown/hidden and reordered. Layout saved in `localStorage`.

**174. Dashboard Bento Grid**
The default dashboard layout is a CSS Grid "Bento Box" layout. Each widget is a card sized as a fraction of the grid. The customizer controls which slots are occupied.

**175. Home Screen Quick Stats**
Configure up to 3 "hero stats" shown at the very top of the dashboard (large, prominent). Examples: Today's Earnings, Week Progress %, Hourly Rate. User picks their top 3 from a list.

**176. Date Format Preference**
DD/MM/YYYY vs MM/DD/YYYY vs YYYY-MM-DD. Applied to all date displays across the app.

**177. Week Start Day**
Sunday or Monday. Controls the weekly summary calculations and calendar rendering.

**178. Shift Duration Format**
Display shift length as "2h 30m" or "2.5 hrs" or "150 min." User preference.

**179. Notification Frequency Settings**
For each MacadamNotify alert type (daily summary, weekly goal, streak, backup reminder, maintenance due): toggle on/off and set frequency. On-app-open based, no push server needed.

**180. Danger Zone — Reset Single Platform Data**
Wipe all data for one platform only (e.g., "Delete all Foodora shifts") without touching other platforms. Requires MacadamConfirm with platform name typed.

**181. Danger Zone — Export Before Wipe**
The full vault reset flow forces an export step first: user must download the vault JSON before the reset button activates. Prevents accidental data loss.

**182. App Version & Changelog Display**
In Settings → About: current version number, last updated date, and a brief inline changelog. Links to the full changelog if hosted publicly.

**183. Keyboard Shortcuts (Desktop)**
For desktop/laptop users: `N` = new shift, `E` = expenses, `R` = reports, `S` = settings, `/` = search, `Esc` = close modal. Displayed in a "Keyboard Shortcuts" help overlay (`?` key).

---

## PART 13 — SEARCH & FILTERING

**184. Global Search**
A search bar (`/search` or `Ctrl+K` overlay) that searches across: shift notes, expense notes, zone tags, vehicle names, platform names. Results grouped by type with a preview card.

**185. Shift Filter Panel**
On the shifts list view: filter by platform, date range, vehicle, zone, weather, mood, minimum earnings, minimum hourly rate. Filters are AND-combined. Result count shown live.

**186. Expense Filter Panel**
On the expenses list: filter by category, platform, date range, minimum/maximum amount, whether a receipt photo is attached.

**187. Search Within Notes**
Full-text search specifically within shift and expense notes fields. Useful when looking for a specific restaurant or incident.

**188. Saved Filters**
Save a filter combination as a named preset. "This Month's Car Expenses," "DoorDash Weekend Shifts." One-tap to apply.

**189. Sort Controls**
All list views support multi-key sorting: primary + secondary sort. E.g., primary sort by Date descending, secondary by Earnings descending.

---

## PART 14 — MAPS & ZONES (CLIENT-SIDE)

**190. Zone Tag Manager**
A standalone list of user-created zone tags. Add, rename, delete, assign a custom color to each. No map required — purely label-based.

**191. Zone Performance Dashboard**
For users who consistently tag zones: a table showing each zone's average earnings per hour, average earnings per order, total shifts in that zone, and total earnings from that zone. Sortable by any column.

**192. Zone Comparison Chart**
Bar chart comparing zones by average hourly rate. Instantly shows which zones are most profitable for this driver.

**193. Zone-to-Platform Matrix**
A grid: zones on rows, platforms on columns. Each cell shows average hourly rate for that zone+platform combination. Helps decide: "When I'm in the airport zone, should I use DoorDash or Uber Eats?"

**194. Home Base Zone Auto-Tag**
If the shift's zone isn't specified and the user has a home base set, auto-suggest tagging it as the home base zone. Driver can confirm or override.

---

## PART 15 — NOTIFICATIONS & ALERTS

**195. Daily Summary Toast**
On first app-open of the day (after any shifts have been logged): "Yesterday you earned $X over Y hours. Your average was $Z/hr." Shown as a dismissible MacadamNotify card.

**196. Weekly Goal Alert (In-Progress)**
Mid-week (Wednesday) if the driver is behind pace: "You're $X short of your weekly goal with 3 days left. You need $Y/day to catch up."

**197. Weekly Goal Completion Alert**
When the weekly goal is hit: a full-card celebration toast with the amount earned and the streak count.

**198. Goal Miss Alert**
End of week (Sunday night, on next app-open) if the goal was missed: a calm, non-judgmental notice. "This week: $X vs. $Y goal. Keep going — you got this." No guilt-tripping language.

**199. New Personal Best Alert**
Auto-triggered when any personal record is broken. The specific metric and new value are shown.

**200. Maintenance Due Alert**
When a vehicle's service interval is approaching (configurable threshold: 200km or 2 weeks before). Links to the vehicle maintenance log.

**201. Insurance Expiry Alert**
30 days and 7 days before an insurance renewal date.

**202. Tax Installment Due Alert**
14 days before each quarterly tax installment deadline for the driver's region.

**203. Streak At Risk Alert**
If the user hasn't logged a shift today and their streak is active: an optional reminder when they open the app in the evening. "Your streak is at risk — log a shift to keep it alive." Toggleable.

**204. Backup Overdue Alert**
If more than 30 days have passed since last export: a gentle reminder in Settings and optionally as a toast.

**205. Low Hourly Rate Warning**
If the last 3 shifts have all had a net hourly rate below a configurable threshold (default: $15/hr), show a soft alert: "Your last 3 shifts averaged $X/hr net. Consider checking zone or time of day."

**206. High Expense Alert**
If expenses for the current month are tracking above the user's average by more than 20%, show a warning on the expense dashboard.

**207. Milestone Proximity Alert**
When approaching a milestone (e.g., 990 deliveries logged with milestone at 1000), show a teaser: "You're 10 deliveries away from your next badge!" Adds anticipation.

---

## PART 16 — MULTI-APP SPECIFIC FEATURES

**208. DoorDash: Peak Pay Tracker**
A dedicated "Peak Pay" field on DoorDash shifts. Track peak pay earnings separately. Analyze: which days/times had peak pay, average peak pay per shift, % of total DoorDash income from peak pay.

**209. DoorDash: Dash Zone Tracker**
Track which DoorDash zone (if the driver operates in multiple) each shift used. Zones stored as tags. Cross-reference with earnings for zone optimization.

**210. Uber Eats: Surge Multiplier Log**
Log the surge multiplier active during an Uber Eats shift (1.0×, 1.2×, 1.5×, etc.). Analyze: do surges materially increase per-hour earnings, or do they just bring more drivers and reduce your share?

**211. Uber Eats: Pro Status Tracker**
Log current Uber Eats Pro tier (Blue, Gold, Platinum, Diamond). Note the tier's perks. Track tier history over time. Does tier affect hourly rate? Correlation analysis.

**212. Foodora: Order Type Split (Pickup vs. Delivery)**
Some Foodora orders are pickup-only (no delivery distance). Log these separately. Calculate average pay for pickup vs. delivery orders.

**213. Skip the Dishes: Skip Credits / Promotions**
Log any Skip platform credits or promotions received. Track as income category "Platform Bonus." Separate from regular tip/surge.

**214. Instacart: Batch Tracker**
For Instacart drivers: log batch size (number of items), store name, total tip, and whether it was a multi-store batch. Earnings per item calculated automatically.

**215. Amazon Flex: Block Duration Tracker**
Amazon Flex pays per block (2hr, 3hr, 4hr). Log block duration, block pay, and whether the block was a fresh reserved block or a last-minute offer. Analyze which block types pay best per hour.

**216. Generic "Other Platform" Configurator**
For any platform not in the preset list: name it, assign a color, and configure which fields are relevant (tips, bonuses, surge, etc.). Creates a fully functioning platform module from scratch.

**217. Cross-Platform Arbitrage Alert**
If the driver is logged into 2+ platforms and their per-platform data shows Platform A consistently outperforms Platform B by >20%, show a soft suggestion: "Your DoorDash hourly rate is significantly higher than Skip. Consider shifting more time to DoorDash."

**218. Simultaneous Multi-Apping Shift Log**
For drivers who legitimately run multiple apps simultaneously: a special shift type "Multi-App Session" where they can split earnings across 2 platforms within one time block. Total duration is 1× (not doubled). Earnings attributed to each platform proportionally.

---

## PART 17 — WELLBEING & DRIVER HEALTH

**219. Fatigue Alert (Hours Worked This Week)**
If the driver has logged more than 50 hours in the current week, show a wellbeing notice: "You've worked 50+ hours this week. Rest is part of performance."

**220. Earnings Anxiety Indicator**
If the driver is logging shifts at an unusually high frequency with low durations (possible anxious micro-checking), detect the pattern and gently surface it with a calming note rather than data pressure.

**221. Income Stability Score**
A simple score (1–10) based on variance of weekly earnings. High variance = low stability. Low variance = high stability. Show trend: is your income getting more stable or more volatile?

**222. Break Reminder**
After logging 4+ continuous hours in a shift, the app can (optionally) show a break reminder toast on next open. Fully toggleable.

**223. Positive Reinforcement Language**
The app never uses negative or shaming language. All "below goal" messages use constructive framing. All stats are presented neutrally. This is a design constraint enforced via a language guide in the codebase.

**224. Mood Trend Chart**
If the driver uses the per-shift mood tag, chart mood over time as a colored dot timeline. Alongside earnings, it may reveal: "You feel best on the shifts where you earn the most — or the fewest."

**225. Mileage Health Warning**
If a shift logs >300 km, show a friendly note: "Long day on the road! Make sure to stretch."

---

## PART 18 — ADVANCED ANALYTICS

**226. Cohort Analysis: First Month vs. Current Month**
Compare earnings metrics from the driver's first full month in Macadam to their most recent full month. Shows growth: hourly rate change, delivery count change, income change.

**227. Diminishing Returns Detector**
Analyze shifts: does the last 2 hours of a long shift earn proportionally less than the first 2 hours? Plot earnings per hour across shift position (hour 1, 2, 3…). Shows if fatigue affects performance.

**228. Day-Part Analysis**
Break each day into four parts: Morning (5am–12pm), Afternoon (12pm–5pm), Evening (5pm–9pm), Night (9pm–close). Average earnings per hour for each day-part, segmented by platform and day of week. A full 4×7×N matrix.

**229. Holiday vs. Regular Day Analysis**
Tag major holidays (New Year's, Valentine's Day, Mother's Day, Halloween, Christmas, etc.) in the calendar. Compare average earnings on holidays vs. comparable non-holiday days. "You earn 40% more on Valentine's Day."

**230. Weather Correlation Analysis**
If weather tags are used: cross-reference weather condition with average hourly rate. "You earn $2.50/hr more on rainy days. Is it worth the wear on your car?"

**231. Order Acceptance Rate Proxy**
If the driver logs number of orders per shift alongside hours online, calculate an estimated orders-per-hour metric. Track over time. High = busy area / high acceptance rate. Low = slow zone or selective acceptance.

**232. Earnings Seasonality Chart**
A 12-month rolling heatmap showing which months historically earn the most. Patterns like "Summer is slow, winter holidays are peak" become visible after 1+ year of data.

**233. Compound Growth Rate Calculator**
Calculate month-over-month and year-over-year compound growth rate of gross earnings. Display: "Your income has grown at 8% per month over the last 6 months."

**234. Break-Even Analysis**
Based on tracked expenses: "How many hours do you need to work to cover your monthly vehicle costs?" Break-even hours displayed as a milestone on the weekly progress bar.

**235. Net Worth Contribution Tracker**
Optional: input a savings rate (% of net earnings the driver plans to save). Calculate cumulative savings contribution from delivery income over time. Motivational long-term view.

**236. Efficiency Quartile Ranking**
Divide the driver's own shifts into quartiles by hourly rate. Label each quartile: "Top 25% Shifts," "Above Average," "Below Average," "Bottom 25%." Help them identify what patterns characterize top-quartile shifts.

**237. Predictive Weekly Earnings**
Mid-week projection: based on shifts completed so far + historical same-day-of-week data, project what total earnings will be by end of week. Display as "Projected Week Total: $X."

**238. Platform Shift of Activity Analysis**
Compare platform usage over time: in January you did 80% DoorDash, now it's 60%. Did the shift in platform usage correlate with a change in earnings?

---

## PART 19 — PWA & DEVICE INTEGRATION

**239. PWA Manifest**
Full `manifest.json` with app name "Macadam," short name, icons (192×192 and 512×512 in the Macadam brand style), theme color, background color, display mode "standalone." Enables "Add to Home Screen."

**240. Service Worker (Offline Shell)**
Register a service worker that caches the Astro-built static assets. App fully loads offline. All data reads come from IndexedDB (already local). No degraded experience offline.

**241. Background Sync — Deferred Exports**
If the driver triggers an export while offline and the browser supports Background Sync, queue the export file generation and complete it when connectivity resumes.

**242. Install Prompt Intercept**
Intercept the browser's `beforeinstallprompt` event. Show a custom branded "Install Macadam" prompt using MacadamNotify UI instead of the raw browser banner. More on-brand and more likely to be acted on.

**243. Installed App Detection**
Detect if the app is running in standalone mode (installed as PWA). If so: hide any "Install" prompts, potentially unlock a subtle "Installed ✓" badge in settings.

**244. Share Target API**
Register Macadam as a share target. If the driver screenshots or shares a DoorDash earnings summary from the DoorDash app, they can "Share to Macadam." The app opens with the shared content in the quick-add shift drawer, allowing fast data entry.

**245. File System Access API (Desktop)**
On desktop browsers that support it, use the File System Access API for backup exports: open a file picker to a user-chosen directory and save the vault JSON directly there (auto-backup path). Avoids the Downloads folder clutter.

**246. Notification API (On-Device)**
Use the Web Notifications API (not push) for timed reminders set within the app. E.g., "Remind me to log my shift at 9pm." These fire locally via `setTimeout`/`setInterval` or the Notification Triggers API where supported.

**247. Vibration API (Mobile)**
Haptic feedback on key actions: badge unlock (double pulse), shift saved (single short pulse), goal hit (triple pulse). Respects the device's silent/vibrate setting.

**248. Screen Wake Lock (During Active Shift)**
While a shift timer is running, request the Screen Wake Lock API to prevent the screen from sleeping. Driver can keep the phone mounted on the dashboard without the screen going dark.

**249. Fullscreen Mode**
An optional fullscreen mode for the dashboard (using the Fullscreen API). Useful when the phone is mounted in a car dock.

**250. App Shortcuts (PWA)**
Define PWA App Shortcuts in the manifest: right-click/long-press the app icon to expose shortcuts: "Log New Shift," "View This Week," "Export Vault." Jumps directly to those routes.

---

## PART 20 — ACCESSIBILITY

**251. WCAG 2.1 AA Compliance Target**
All interactive elements have proper ARIA labels, roles, and descriptions. All color pairings meet 4.5:1 contrast ratio. Documented as a project-level requirement, not an afterthought.

**252. Reduced Motion Mode**
Detect `prefers-reduced-motion`. When active, disable all CSS transitions and animations. All animated charts render statically instead. No functionality is affected.

**253. Screen Reader Optimized Data Tables**
All analytics tables have proper `<caption>`, `<thead>`, `<th scope>` attributes. Charts have `<title>` and `<desc>` in SVG and ARIA labels on the container.

**254. Focus Trap in Modals**
All MacadamConfirm and MacadamNotify modals trap keyboard focus within themselves while open. `Esc` always closes them. No keyboard user gets stranded.

**255. Touch Target Sizing**
All tappable elements are minimum 44×44px as per Apple/Google HIG guidelines. No tiny icons require precision tapping.

**256. Voice Input Compatibility**
All input fields are properly typed and labeled so iOS/Android voice-to-text and dictation work correctly. "Set earnings to seventy five dollars" should fill the correct field via voice.

---

## PART 21 — LOCALIZATION & INTERNATIONALIZATION

**257. Multi-Language Architecture**
Even if only English is supported at launch, structure all user-facing strings in a `strings.ts` locale file rather than hardcoded. This makes future French, Spanish, or Tagalog support a localization task, not a refactor.

**258. Canadian French Support (Bilingual)**
Given Foodora and Skip the Dishes are Canadian-dominant platforms, French (fr-CA) is the highest-value second language. Translate all strings, number formats (space as thousands separator), and date formats.

**259. CRA / IRS Tax Reference Links**
In the Tax Dashboard, provide external links (opening in new tab) to the official CRA motor vehicle expense page and the IRS Schedule C instructions. These are jurisdiction-aware based on the user's country setting.

**260. Platform Help Links**
For each active platform, store the URL to the platform's driver earnings support page. Accessible from the platform settings card as a "Help & Earnings FAQs" link.

---

## PART 22 — ONBOARDING DEEP FEATURES (EXTENDED)

**261. Platform API Earnings Disclaimer**
During onboarding, show a brief disclaimer: "Macadam does not connect to any platform API. All data is entered manually. This is by design — your data stays on your device." Builds trust and sets expectations.

**262. Sample Data Tour**
After onboarding completes, offer a "Take a Tour with Sample Data" mode that populates 2 weeks of realistic fake shifts (pre-seeded, read-only). The driver sees what a populated dashboard looks like without entering real data. One button clears the sample data when done.

**263. Onboarding Contextual Tips**
On each onboarding screen, a collapsible info section explains *why* the data is being collected and how it's used. E.g., "We ask for your fuel efficiency to calculate your real net hourly rate — the most important metric for delivery drivers."

**264. First Shift Guided Entry**
After onboarding, trigger a guided first-shift entry: overlay tooltips walk the user through each field of the shift form. Tooltip chain can be skipped at any point.

**265. Onboarding Resume Across Devices**
Since Macadam is local-first, there's no account — but offer the user to export their onboarding config (just the preferences, no earnings data) as a tiny JSON file. On a new device, import it to skip re-entering all preferences.

---

## PART 23 — DEVELOPER & POWER USER FEATURES

**266. Debug Mode**
A hidden debug mode (activated by tapping the version number 5 times in Settings → About). Shows: IndexedDB record counts, localStorage keys, reactive state dump, and a console-like event log.

**267. Schema Version & Migration Engine**
Every time the app is updated, run an IndexedDB schema migration check on startup. If the schema version in the DB is behind the app version, apply migrations programmatically (e.g., adding a new field with a default value to all existing shift records).

**268. Performance Budget Monitor (Dev Mode)**
In debug mode, show the time taken for each IndexedDB query (using `performance.mark()`). Helps identify slow queries if the database grows large.

**269. Synthetic Data Generator**
In debug mode: a button to generate N random realistic shifts across configured platforms and date ranges. Useful for UI testing with large datasets.

**270. Raw Vault Inspector**
In debug mode: a JSON tree viewer showing the raw IndexedDB contents. Read-only. Useful for troubleshooting data issues without needing browser dev tools.

---

## PART 24 — DASHBOARD DEEP FEATURES

**271. Dashboard Header Status Bar**
The very top of the dashboard always shows: platform switcher (if multi-platform), current date/time, online/offline indicator, and the avatar. Sticky on scroll.

**272. "Last Shift" Quick Summary Card**
A persistent card on the dashboard showing the last logged shift: date, platform, earnings, hourly rate, duration. Tapping it opens the full shift detail. Serves as a bookmark for where the driver left off.

**273. Running Year-to-Date Gross**
Large, prominent counter on the dashboard showing total gross YTD. Optional celebratory animation as it ticks up after a new shift is added.

**274. Running Year-to-Date Net**
Same as above but net (after all expenses). Side by side with gross so the "gap" is always visible.

**275. Days Until Tax Deadline**
On the Tax widget on dashboard: countdown in days until the next tax installment or filing deadline. Changes color as it approaches.

**276. "What If" Earnings Simulator**
A simple calculator on the analytics page: "If I work X more hours at my average rate, I will earn $Y more this week/month." Slider input. Helps with schedule planning.

**277. Earnings Calendar Heatmap**
A full GitHub-style contribution heatmap covering the last 52 weeks. Each square = one day. Color intensity = earnings amount. At a glance, the driver sees their entire work history pattern.

**278. Top Earning Shifts Leaderboard**
A list of the top 10 highest-earning single shifts of all time for this driver. Shows date, platform, earnings, and hourly rate. Motivational context for current performance.

**279. Recent Activity Feed**
A chronological feed of recent actions in the app: "Shift logged — $84.50 · 4hrs · DoorDash," "Expense added — Oil Change · $67.00," "Goal hit — Week of May 5 ✓," "Badge unlocked — 500 Deliveries." Acts as an audit trail and motivational feed.

**280. Dashboard Announcement Banner**
A dismissible banner slot at the top of the dashboard for important notices: new app features, data migration completed, reminder to review tax settings. Stored in a `banners[]` array in the app config, each with a `dismissedAt` in localStorage.

---

## PART 25 — MONETIZATION-READY ARCHITECTURE (FOR FUTURE)

**281. Feature Flags System**
Even though all features are currently free, architect a feature flag system (`featureFlags.ts`) that can gate any feature. If monetization is added later (e.g., a one-time "Pro" unlock), the architecture is ready without a refactor.

**282. Tip Jar / One-Time Donation Link**
In Settings → About: a "Support Macadam" link to a Ko-fi, Buy Me a Coffee, or Stripe payment link. No in-app purchase flow needed — just an external link. Keeps the app fully free while allowing voluntary support.

**283. Referral Code Display (Future Ready)**
A placeholder "Share Macadam" card in Settings with a copyable link. The link is currently just the app URL. If a referral program is ever built, replace the URL with a tracked code without UI changes.

---

## PART 26 — PLATFORM DEEP DIVES (ADDITIONAL)

**284. DoorDash: Acceptance Rate Tracker**
Log DoorDash acceptance rate at the end of each shift (visible in the DoorDash app). Track over time. Correlate with earnings: does acceptance rate affect earnings on this driver's actual data?

**285. DoorDash: Customer Rating Tracker**
Log DoorDash customer rating at the end of each week. Track trend. Alert if approaching the minimum threshold (currently 4.2 stars) with a motivational nudge.

**286. Uber Eats: Completion Rate Tracker**
Log Uber Eats trip completion rate weekly. Alert if below 95% (the minimum to maintain status).

**287. Uber Eats: Online Time Requirement Tracker**
Uber Eats Quests sometimes require minimum online hours. Log quest requirements and track hours toward them.

**288. Skip the Dishes: City Score Tracker**
Skip uses a "city score" or rating system. Log it per week. Track trend. Alert if nearing minimum.

**289. Foodora: Attendance Score Tracker**
Foodora uses attendance/acceptance metrics. Log weekly score. Show trend. Alert on risk.

**290. Platform Payout Day Tracker**
Each platform has a regular payout schedule (weekly, bi-weekly, instant cash-out). Let the driver log their preferred payout day and show a countdown widget: "DoorDash payout in 3 days." Just a manual tracker, no bank API.

**291. Instant Cashout Fee Tracker**
Some platforms charge a small fee for instant cashouts. If the driver uses this, log the fees separately as an expense sub-category "Platform Cashout Fees." Show cumulative cost per year.

---

## PART 27 — FINAL FEATURES (POLISH & DEPTH)

**292. App Logo & Splash Screen**
A branded SVG splash screen shown for ~800ms on cold start. Macadam wordmark with a subtle animated road-line. Fades to the dashboard or onboarding. Sets the premium tone immediately.

**293. Changelog Pop-Up on App Update**
Detect version change in `localStorage` on app open. If version has incremented, show a "What's New in v2.x" MacadamNotify card summarizing the top 3 new features. User dismisses it and it doesn't show again for that version.

**294. "Did You Know?" Tips System**
A rotating contextual tip shown on the dashboard once per session (or once per day). Tips are relevant to delivery driving: "Did you know? Oil changes count as a full deduction for delivery vehicles." A curated set of 50+ tips, never repeated until the full set is shown.

**295. Data Portability Manifesto**
A short in-app page (`/about`) that explains Macadam's data philosophy in plain language: "Your data never leaves your device. We don't have a server. We can't see your earnings. You own everything." Builds brand trust and differentiates from cloud-based competitors.

**296. Competitor Comparison Mode (Informational)**
An informational page: "Why Macadam vs. SherpaShare, Hurdlr, or Stride?" — plain text comparing the approaches. No disparagement, just factual differences. Local-first, no subscription, no account required.

**297. Driver Community Tips Board (Hardcoded)**
A curated, static, read-only "Community Tips" section with crowdsourced advice from delivery drivers (research-based, no user-submitted content to avoid moderation needs). Tips like "Best times to work in winter," "How to handle restaurant wait times," "Tax tips for new dashers."

**298. App Review Nudge**
After the driver hits their 10th shift or first weekly goal, show a one-time nudge: "Enjoying Macadam? If you're using the iOS/Android version, leaving a review helps other drivers find us." Links to appropriate store listing. Non-intrusive, never shown again after one dismissal.

**299. Error Boundary with Friendly Messaging**
Wrap all major route components in React-style error boundaries (Astro components + client-side error handling). If a component crashes, show a friendly "Something went wrong with this section" card with a "Reload" button and a link to export data before reloading. No raw stack traces shown to users.

**300. Macadam Philosophy Mode ("Zen Mode")**
An optional full-screen focus view activated from the dashboard. Shows only: today's earnings so far, active shift timer (if running), and one motivational quote from a curated set written for gig workers. No metrics, no charts, no pressure. Just the number and a breath.

**301. Driver Financial Glossary**
A searchable in-app glossary of terms: Gross Earnings, Net Earnings, HST, ITC, Mileage Deduction, Depreciation, CPP, Utilization Rate, Acceptance Rate, Surge Multiplier. Each term has a 2-sentence plain-English definition. Accessible from any screen via a `?` icon next to jargon terms.

**302. Macadam API Spec (Future-Proof)**
Document a proposed REST API spec (in the codebase as a markdown file, not implemented) that would allow future optional cloud sync. The spec is designed so that the local-first architecture can be adopted into it without changing the data model. This ensures the architecture doesn't paint into a corner if cloud features are ever desired.

**303. End-of-Year Review Screen**
On January 1 (or first app-open in the new year), show a full-screen "Your Year in Review" card: total earnings, total hours, total deliveries, best shift, best week, badges earned, platforms used. Shareable as an image (canvas export). The Spotify Wrapped moment for delivery drivers.

---

## FEATURE COUNT SUMMARY

| Part | Domain | Features |
|---|---|---|
| 1 | Onboarding & Identity | 1–20 |
| 2 | Multi-Platform Management | 21–30 |
| 3 | Shift Logging | 31–56 |
| 4 | Earnings Analytics | 57–82 |
| 5 | Expense Tracking | 83–100 |
| 6 | Tax Management | 101–114 |
| 7 | Vehicle & Mileage | 115–125 |
| 8 | Schedule & Time | 126–135 |
| 9 | Goals & Gamification | 136–145 |
| 10 | Reports & Exports | 146–158 |
| 11 | Data Health & Storage | 159–165 |
| 12 | Settings & Personalization | 166–183 |
| 13 | Search & Filtering | 184–189 |
| 14 | Maps & Zones | 190–194 |
| 15 | Notifications & Alerts | 195–207 |
| 16 | Multi-App Specific | 208–218 |
| 17 | Wellbeing & Driver Health | 219–225 |
| 18 | Advanced Analytics | 226–238 |
| 19 | PWA & Device Integration | 239–250 |
| 20 | Accessibility | 251–256 |
| 21 | Localization & i18n | 257–260 |
| 22 | Onboarding Extended | 261–265 |
| 23 | Developer & Power User | 266–270 |
| 24 | Dashboard Deep Features | 271–280 |
| 25 | Monetization-Ready | 281–283 |
| 26 | Platform Deep Dives | 284–291 |
| 27 | Polish & Depth | 292–303 |

**Total: 303 features.**

---

## IMPLEMENTATION ORDER SUGGESTION

**Phase 1 — Foundation (Features to build first)**
Start with: 1–20 (Onboarding), 21–30 (Platform Management), 31–56 (Shift Logging), 83–100 (Expense Tracking core), 239 + 240 (PWA basics).

**Phase 2 — Intelligence Layer**
Build: 57–82 (Earnings Analytics), 101–114 (Tax), 115–125 (Vehicle), 126–135 (Schedule).

**Phase 3 — Engagement & Retention**
Build: 136–145 (Gamification), 195–207 (Notifications), 73–75 (Streaks/Records).

**Phase 4 — Power Features**
Build: 146–158 (Exports), 184–189 (Search), 208–218 (Platform-Specific), 226–238 (Advanced Analytics).

**Phase 5 — Polish & PWA**
Build: 241–250 (PWA deep), 251–256 (Accessibility), 292–303 (End-to-end polish).

---

*Macadam Feature Plan v1.0 — 303 features across 27 domains.*
*All features are client-side and local-first by design.*
*No cloud, no accounts, no ads. Driver data sovereignty is non-negotiable.*