document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  const currency = window.currencySymbol || "$";
  const csrfToken = window.csrfToken || "";

  // Theme handling (global)
  (function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved) {
      document.documentElement.setAttribute("data-bs-theme", saved);
    }
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-bs-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-bs-theme", next);
        localStorage.setItem("theme", next);
        if (hasDashboard) {
          [earningsChart, rateChart, rollingChart, expenseChart].forEach(chart => chart?.destroy());
          initCharts();
          updateDashboard();
        }
      });
    }
  })();

  // Dashboard charts and summaries (only if dashboard elements exist)
  const earningsCanvas = document.getElementById("earningsChart");
  const rateCanvas = document.getElementById("rateChart");
  const sumHours = document.getElementById("sumHours");
  const sumEarnings = document.getElementById("sumEarnings");
  const avgRate = document.getElementById("avgRate");
  const effRate = document.getElementById("effRate");
  const bestWeek = document.getElementById("bestWeek");
  const worstWeek = document.getElementById("worstWeek");
  const sumExpenses = document.getElementById("sumExpenses");
  const outOfPocket = document.getElementById("outOfPocket");
  const netIncome = document.getElementById("netIncome");
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");
  const filterForm = document.getElementById("filterForm");
  const presetButtons = document.querySelectorAll(".preset");
  const exportWeekly = document.getElementById("exportWeekly");
  const exportExpenses = document.getElementById("exportExpenses");
  const exportSummary = document.getElementById("exportSummary");

  const hasDashboard =
    earningsCanvas &&
    rateCanvas &&
    sumHours &&
    sumEarnings &&
    avgRate &&
    effRate &&
    bestWeek &&
    worstWeek &&
    sumExpenses &&
    outOfPocket &&
    netIncome &&
    window.Chart &&
    document.getElementById("earningsExpensesChart") &&
    document.getElementById("earningsBreakdownChart");

  if (hasDashboard) {
    let earningsChart;
    let rateChart;
    let rollingChart;
    let expenseChart;
    let earningsExpensesChart;
    let earningsBreakdownChart;
    let deliveriesChart;
    let monthlyEarningsChart;

    function formatWeek(value) {
      if (!value || typeof value.week_no === "undefined") return "N/A";
      return `Week ${value.week_no} (${currency}${Number(value.earnings).toFixed(2)})`;
    }

    function initCharts() {
      const style = getComputedStyle(document.body);
      const c1 = style.getPropertyValue('--chart-line-color-1').trim();
      const c2 = style.getPropertyValue('--chart-line-color-2').trim();
      const c3 = style.getPropertyValue('--chart-line-color-3').trim();
      const doughnutColors = style.getPropertyValue('--chart-doughnut-colors').trim().split(', ');

      // Weekly Earnings Chart
      earningsChart = new Chart(earningsCanvas.getContext("2d"), {
        type: "line",
        data: { labels: [], datasets: [{ label: "Total Earnings", data: [], fill: true, borderColor: c1, backgroundColor: c1 + "40", tension: 0.4 }] },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { 
            legend: { display: true },
            tooltip: { callbacks: { label: (c) => `${currency}${Number(c.parsed.y).toFixed(2)}` } }
          },
          scales: { 
            x: { title: { display: true, text: "Week Ending" } }, 
            y: { title: { display: true, text: "Earnings ($)" }, beginAtZero: true }
          },
        },
      });

      // Hourly Rate Chart
      rateChart = new Chart(rateCanvas.getContext("2d"), {
        type: "line",
        data: { labels: [], datasets: [{ label: "Avg $/Hour", data: [], fill: true, borderColor: c2, backgroundColor: c2 + "40", tension: 0.4 }] },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { 
            legend: { display: true },
            tooltip: { callbacks: { label: (c) => `${currency}${Number(c.parsed.y).toFixed(2)}` } }
          },
          scales: { 
            x: { title: { display: true, text: "Week Ending" } }, 
            y: { title: { display: true, text: "Avg $/Hour" }, beginAtZero: true }
          },
        },
      });

      // Rolling Average Chart
      const rollingCanvas = document.getElementById("rollingChart");
      if (rollingCanvas) {
        rollingChart = new Chart(rollingCanvas.getContext("2d"), {
          type: "line",
          data: { labels: [], datasets: [{ label: "Rolling 4-week Avg $/Hour", data: [], fill: true, borderColor: c3, backgroundColor: c3 + "40", tension: 0.4 }] },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
              legend: { display: true },
              tooltip: { callbacks: { label: (c) => `${currency}${Number(c.parsed.y).toFixed(2)}` } }
            },
            scales: { 
              x: { title: { display: true, text: "Week Ending" } }, 
              y: { title: { display: true, text: "Avg $/Hour" }, beginAtZero: true }
            },
          },
        });
      }

      // Expenses Chart
      const expenseCanvas = document.getElementById("expenseChart");
      if (expenseCanvas) {
        expenseChart = new Chart(expenseCanvas.getContext("2d"), {
          type: "doughnut",
          data: { labels: [], datasets: [{ data: [], backgroundColor: doughnutColors }] },
          options: { 
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
              legend: { display: true, position: "bottom" },
              tooltip: { callbacks: { label: (c) => `${currency}${Number(c.parsed.y).toFixed(2)}` } }
            }
          },
        });
      }

      // Earnings & Expenses Comparison Chart
      const earningsExpensesCanvas = document.getElementById("earningsExpensesChart");
      if (earningsExpensesCanvas) {
        earningsExpensesChart = new Chart(earningsExpensesCanvas.getContext("2d"), {
          type: "line",
          data: {
            labels: [],
            datasets: [
              { label: "Earnings", data: [], borderColor: c1, backgroundColor: c1 + "40", fill: true, tension: 0.4, yAxisID: "y" },
              { label: "Expenses", data: [], borderColor: "#f97316", backgroundColor: "#f9731640", fill: true, tension: 0.4, yAxisID: "y" }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
              mode: "index",
              intersect: false,
            },
            plugins: {
              legend: { display: true },
              tooltip: { 
                callbacks: { 
                  label: (c) => `${c.dataset.label}: ${currency}${Number(c.parsed.y).toFixed(2)}`,
                  footer: (items) => {
                    const earnings = items.find(i => i.datasetIndex === 0)?.parsed.y || 0;
                    const expenses = items.find(i => i.datasetIndex === 1)?.parsed.y || 0;
                    const net = earnings - expenses;
                    return `Net: ${currency}${net.toFixed(2)}`;
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: "Week Ending" } },
              y: { title: { display: true, text: "Amount ($)" }, beginAtZero: true }
            },
          },
        });
      }

      // Earnings Breakdown Chart
      const earningsBreakdownCanvas = document.getElementById("earningsBreakdownChart");
      if (earningsBreakdownCanvas) {
        earningsBreakdownChart = new Chart(earningsBreakdownCanvas.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: ["DoorDash Pay", "Tips", "Other Pay"],
            datasets: [{ data: [0, 0, 0], backgroundColor: [c1, c2, "#f97316"] }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: true, position: "bottom" },
              tooltip: { callbacks: { label: (c) => `${c.label}: ${currency}${Number(c.parsed).toFixed(2)}` } }
            }
          },
        });
      }

      // Deliveries Chart
      const deliveriesCanvas = document.getElementById("deliveriesChart");
      if (deliveriesCanvas) {
        deliveriesChart = new Chart(deliveriesCanvas.getContext("2d"), {
          type: "bar",
          data: {
            labels: [],
            datasets: [
              { label: "Deliveries", data: [], backgroundColor: c1 + "80", borderColor: c1, borderWidth: 1 },
              { label: "$/Delivery", data: [], type: "line", borderColor: c2, backgroundColor: c2 + "40", fill: false, yAxisID: "y1", tension: 0.4 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: true },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    if (context.datasetIndex === 0) {
                      return `Deliveries: ${context.parsed.y}`;
                    } else {
                      return `$/Delivery: ${currency}${Number(context.parsed.y).toFixed(2)}`;
                    }
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: "Week Ending" } },
              y: { type: "linear", position: "left", title: { display: true, text: "Deliveries" }, beginAtZero: true },
              y1: { type: "linear", position: "right", title: { display: true, text: "$/Delivery" }, beginAtZero: true, grid: { drawOnChartArea: false } }
            },
          },
        });
      }

      // Monthly Earnings Chart
      const monthlyEarningsCanvas = document.getElementById("monthlyEarningsChart");
      if (monthlyEarningsCanvas) {
        monthlyEarningsChart = new Chart(monthlyEarningsCanvas.getContext("2d"), {
          type: "bar",
          data: {
            labels: [],
            datasets: [
              { label: "Earnings", data: [], backgroundColor: c1 + "80", borderColor: c1, borderWidth: 1 },
              { label: "Expenses", data: [], backgroundColor: "#f9731680", borderColor: "#f97316", borderWidth: 1 },
              { label: "Net", data: [], backgroundColor: c2 + "80", borderColor: c2, borderWidth: 1 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: true },
              tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${currency}${Number(c.parsed.y).toFixed(2)}` } }
            },
            scales: {
              x: { title: { display: true, text: "Month" } },
              y: { title: { display: true, text: "Amount ($)" }, beginAtZero: true }
            },
          },
        });
      }

      // Chart type toggle handlers
      document.querySelectorAll(".chart-toggle").forEach(btn => {
        btn.addEventListener("click", function() {
          const chartName = this.dataset.chart;
          const chartType = this.dataset.type;
          const chart = chartName === "earningsExpenses" ? earningsExpensesChart : null;
          
          if (chart) {
            chart.config.type = chartType;
            chart.update();
            
            // Update button states
            this.parentElement.querySelectorAll(".chart-toggle").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
          }
        });
      });
    }

    async function updateDashboard() {
      const startVal = startInput ? startInput.value : null;
      const endVal = endInput ? endInput.value : null;
      try {
        if (!window.generateVaultSummary) {
            console.warn("Vault aggregation script not loaded yet.");
            return;
        }
        const data = await window.generateVaultSummary(startVal, endVal);
        renderSummary(data);
        renderCharts(data);
        updateExportLinks();
      } catch (err) {
        console.error("Error updating dashboard from Vault:", err);
      }
    }

    function formatTrend(value, prefix = "") {
      if (!value || value === 0) return '<span class="trend-neutral">—</span>';
      const sign = value > 0 ? "+" : "";
      const className = value > 0 ? "trend-up" : "trend-down";
      const icon = value > 0 ? "↑" : "↓";
      return `<span class="${className}">${icon} ${sign}${value}%</span>`;
    }

    function renderSummary(data) {
      // Main KPIs
      sumHours.textContent = Number(data.total_hours || 0).toFixed(2);
      sumEarnings.textContent = Number(data.total_earnings || 0).toFixed(2);
      avgRate.textContent = Number(data.average_rate || 0).toFixed(2);
      effRate.textContent = Number(data.effective_rate || 0).toFixed(2);
      bestWeek.textContent = data.best_week ? formatWeek(data.best_week) : "N/A";
      worstWeek.textContent = data.worst_week ? formatWeek(data.worst_week) : "N/A";
      sumExpenses.textContent = Number(data.total_expenses || 0).toFixed(2);
      outOfPocket.textContent = Number(data.total_out_of_pocket || 0).toFixed(2);
      netIncome.textContent = Number(data.net_income || 0).toFixed(2);

      // Additional metrics
      const totalDeliveries = document.getElementById("totalDeliveries");
      const avgDeliveriesPerWeek = document.getElementById("avgDeliveriesPerWeek");
      const avgEarningsPerDelivery = document.getElementById("avgEarningsPerDelivery");
      const totalTips = document.getElementById("totalTips");
      const tipsPercentage = document.getElementById("tipsPercentage");

      if (totalDeliveries) totalDeliveries.textContent = Number(data.total_deliveries || 0);
      if (avgDeliveriesPerWeek) avgDeliveriesPerWeek.textContent = `${Number(data.avg_deliveries_per_week || 0).toFixed(1)}/week`;
      if (avgEarningsPerDelivery) avgEarningsPerDelivery.textContent = Number(data.avg_earnings_per_delivery || 0).toFixed(2);
      if (totalTips) totalTips.textContent = Number(data.total_tips || 0).toFixed(2);
      if (tipsPercentage) tipsPercentage.textContent = `${Number(data.tips_percentage || 0).toFixed(1)}%`;

      // Trend indicators
      const trends = data.trends || {};
      const earningsTrend = document.getElementById("earningsTrend");
      const netTrend = document.getElementById("netTrend");
      const rateTrend = document.getElementById("rateTrend");
      const hoursTrend = document.getElementById("hoursTrend");

      if (earningsTrend) earningsTrend.innerHTML = formatTrend(trends.earnings);
      if (netTrend) netTrend.innerHTML = formatTrend(trends.earnings); // Using earnings trend for net
      if (rateTrend) rateTrend.innerHTML = formatTrend(trends.rate);
      if (hoursTrend) hoursTrend.innerHTML = formatTrend(trends.hours);

      const monthlyBody = document.getElementById("monthlyBody");
      if (monthlyBody) {
        monthlyBody.innerHTML = "";
        if ((data.monthly_rollups || []).length === 0) {
          monthlyBody.innerHTML = '<tr><td colspan="7" class="muted">No data</td></tr>';
        } else {
          data.monthly_rollups.forEach((m) => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${m.month}</td>
              <td>${currency}${m.earnings.toFixed(2)}</td>
              <td>${currency}${m.expenses.toFixed(2)}</td>
              <td>${currency}${m.out_of_pocket.toFixed(2)}</td>
              <td>${currency}${m.net.toFixed(2)}</td>
              <td>${m.hours.toFixed(2)}</td>
              <td>${currency}${m.avg_rate.toFixed(2)}</td>
            `;
            monthlyBody.appendChild(row);
          });
        }
      }

      const ytd = data.ytd || {};
      const ytdBox = document.getElementById("ytdStats");
      if (ytdBox) {
        ytdBox.querySelector('[data-target="earnings"]').textContent = Number(ytd.earnings || 0).toFixed(2);
        ytdBox.querySelector('[data-target="expenses"]').textContent = Number(ytd.expenses || 0).toFixed(2);
        ytdBox.querySelector('[data-target="out"]').textContent = Number(ytd.out_of_pocket || 0).toFixed(2);
        ytdBox.querySelector('[data-target="net"]').textContent = Number(ytd.net || 0).toFixed(2);
        ytdBox.querySelector('[data-target="avg"]').textContent = Number(ytd.avg_rate || 0).toFixed(2);
        ytdBox.querySelector('[data-target="eff"]').textContent = Number(ytd.effective_rate || 0).toFixed(2);
      }
    }

    function renderCharts(data) {
      const labels = (data.weekly_data || []).map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const earnings = (data.weekly_data || []).map((item) => item.earnings);
      const rates = (data.weekly_data || []).map((item) => item.avg_rate);
      const deliveries = (data.weekly_data || []).map((item) => item.deliveries || 0);
      const earningsPerDelivery = (data.weekly_data || []).map((item) => {
        return item.deliveries > 0 ? (item.earnings / item.deliveries) : 0;
      });

      // Weekly Earnings Chart
      earningsChart.data.labels = labels;
      earningsChart.data.datasets[0].data = earnings;
      earningsChart.update();

      // Hourly Rate Chart
      rateChart.data.labels = labels;
      rateChart.data.datasets[0].data = rates;
      rateChart.update();

      // Rolling Average Chart
      if (rollingChart) {
        const rollLabels = (data.rolling_avg || []).map((item) => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const rollRates = (data.rolling_avg || []).map((item) => item.rate);
        rollingChart.data.labels = rollLabels;
        rollingChart.data.datasets[0].data = rollRates;
        rollingChart.update();
      }

      // Expenses Chart
      if (expenseChart) {
        const cats = data.category_breakdown || [];
        expenseChart.data.labels = cats.map((c) => c.category);
        expenseChart.data.datasets[0].data = cats.map((c) => c.amount);
        expenseChart.update();
      }

      // Earnings & Expenses Comparison Chart
      if (earningsExpensesChart) {
        // Distribute total expenses evenly across weeks for visualization
        // In a real scenario, you'd want weekly expense data from the API
        const weeklyCount = Math.max(1, labels.length);
        const avgExpensesPerWeek = (data.total_expenses || 0) / weeklyCount;
        const expensesByWeek = Array(weeklyCount).fill(avgExpensesPerWeek);
        
        earningsExpensesChart.data.labels = labels;
        earningsExpensesChart.data.datasets[0].data = earnings;
        earningsExpensesChart.data.datasets[1].data = expensesByWeek;
        earningsExpensesChart.update();
      }

      // Earnings Breakdown Chart
      if (earningsBreakdownChart) {
        earningsBreakdownChart.data.datasets[0].data = [
          Number(data.total_doordash_pay || 0),
          Number(data.total_tips || 0),
          Number(data.total_other_pay || 0)
        ];
        earningsBreakdownChart.update();
      }

      // Deliveries Chart
      if (deliveriesChart) {
        deliveriesChart.data.labels = labels;
        deliveriesChart.data.datasets[0].data = deliveries;
        deliveriesChart.data.datasets[1].data = earningsPerDelivery;
        deliveriesChart.update();
      }

      // Monthly Earnings Chart
      if (monthlyEarningsChart) {
        const monthlyData = data.monthly_rollups || [];
        const monthLabels = monthlyData.map(m => {
          const [year, month] = m.month.split('-');
          return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        monthlyEarningsChart.data.labels = monthLabels;
        monthlyEarningsChart.data.datasets[0].data = monthlyData.map(m => m.earnings);
        monthlyEarningsChart.data.datasets[1].data = monthlyData.map(m => m.expenses);
        monthlyEarningsChart.data.datasets[2].data = monthlyData.map(m => m.net);
        monthlyEarningsChart.update();
      }
    }

    function updateExportLinks() {
      const params = new URLSearchParams();
      if (startInput && startInput.value) params.append("start", startInput.value);
      if (endInput && endInput.value) params.append("end", endInput.value);
      const qs = params.toString();
      if (exportWeekly) exportWeekly.href = qs ? `/export/weekly.csv?${qs}` : "/export/weekly.csv";
      if (exportExpenses) exportExpenses.href = qs ? `/export/expenses.csv?${qs}` : "/export/expenses.csv";
      if (exportSummary) exportSummary.href = qs ? `/export/summary.csv?${qs}` : "/export/summary.csv";
    }

    initCharts();
    updateDashboard();

    if (filterForm) {
      filterForm.addEventListener("submit", (evt) => {
        evt.preventDefault();
        updateDashboard();
      });
    }

    presetButtons.forEach((btn) => {
      btn.addEventListener("click", () => setPreset(btn.dataset.range));
    });
  }

  function formatDate(d) {
    return d.toISOString().split("T")[0];
  }

  function setPreset(range) {
    const today = new Date();
    let start = null;
    let end = new Date(today);

    if (range === "this_week") {
      const day = today.getDay() || 7;
      start = new Date(today);
      start.setDate(today.getDate() - (day - 1));
    } else if (range === "this_month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (range === "ytd") {
      start = new Date(today.getFullYear(), 0, 1);
    } else if (range === "all") {
      start = "";
      end = "";
    }

    if (startInput && endInput) {
      startInput.value = start ? formatDate(start) : "";
      endInput.value = end ? formatDate(end) : "";
    }
    if (hasDashboard) {
      const evt = new Event("submit");
      filterForm?.dispatchEvent(evt);
    }
  }



});
