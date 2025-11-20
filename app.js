
// --- Configuration and Utility Functions ---

const APP_ID = 'smartExpenseTracker';
const CATEGORIES = ['Food', 'Transport', 'Housing', 'Entertainment', 'Bills', 'Shopping', 'Other'];

/**
 * Utility for Local Storage operations.
 */
class StorageUtility {
    static get(key) {
        try {
            const data = localStorage.getItem(`${APP_ID}-${key}`);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Error reading from localStorage:", e);
            return null;
        }
    }

    static set(key, data) {
        try {
            localStorage.setItem(`${APP_ID}-${key}`, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error("Error writing to localStorage:", e);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(`${APP_ID}-${key}`);
            return true;
        } catch (e) {
            console.error("Error removing from localStorage:", e);
            return false;
        }
    }
}

/**
 * Utility for Date and Currency formatting.
 */
class Utility {
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatCurrency(amount) {
        // CHANGED: Using 'en-IN' locale and 'INR' currency code for Indian Rupees (₹)
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    }

    static getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday start
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
    }

    static getStartOfMonth(date) {
        const d = new Date(date);
        d.setDate(1);
        return d.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
    }

    static getPreviousMonth(dateKey) { // dateKey is YYYY-MM
        const [year, month] = dateKey.split('-').map(Number);
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }

    static getPreviousWeek(dateKey) { // dateKey is YYYY-MM-DD (Monday)
        const d = new Date(dateKey);
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    }
}

// --- Core Data Managers ---

/**
 * Handles all expense creation, retrieval, updates, and deletion.
 */
class ExpenseManager {
    constructor() {
        this.expenses = this._loadExpenses();
    }

    _loadExpenses() {
        // Returns an array of expense objects, or an empty array.
        // Expense object format: { id: string, amount: number, category: string, description: string, date: string (YYYY-MM-DD) }
        return StorageUtility.get('expenses') || [];
    }

    _saveExpenses() {
        StorageUtility.set('expenses', this.expenses);
    }

    addExpense(amount, category, description, date) {
        const newExpense = {
            id: crypto.randomUUID(), // Use secure, unique ID
            amount: parseFloat(amount),
            category: category,
            description: description.trim(),
            date: date,
        };
        this.expenses.push(newExpense);
        this._saveExpenses();
        return newExpense;
    }

    updateExpense(id, amount, category, description, date) {
        const index = this.expenses.findIndex(e => e.id === id);
        if (index !== -1) {
            this.expenses[index] = {
                id: id,
                amount: parseFloat(amount),
                category: category,
                description: description.trim(),
                date: date,
            };
            this._saveExpenses();
            return this.expenses[index];
        }
        return null;
    }

    deleteExpense(id) {
        const initialLength = this.expenses.length;
        this.expenses = this.expenses.filter(e => e.id !== id);
        this._saveExpenses();
        return this.expenses.length < initialLength;
    }

    getDailyExpenses(date) {
        return this.expenses
            .filter(e => e.date === date)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by newest (though date is the same, this is good practice)
    }

    getExpensesByMonth(monthKey) { // YYYY-MM
        return this.expenses.filter(e => e.date.startsWith(monthKey));
    }

    getExpensesByWeek(dateKey) { // dateKey is YYYY-MM-DD (Monday)
        const startOfWeek = new Date(dateKey);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return this.expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
        });
    }
}

/**
 * Handles budget setting and retrieval.
 */
class BudgetManager {
    constructor() {
        this.budgets = this._loadBudgets();
    }

    _loadBudgets() {
        // Budgets stored as { type: 'monthly'|'weekly', key: 'YYYY-MM' or 'YYYY-MM-DD', amount: number }
        return StorageUtility.get('budgets') || {};
    }

    _saveBudgets() {
        StorageUtility.set('budgets', this.budgets);
    }

    setBudget(type, key, amount) {
        if (type !== 'monthly' && type !== 'weekly') return false;

        if (!this.budgets[type]) {
            this.budgets[type] = {};
        }
        this.budgets[type][key] = parseFloat(amount);
        this._saveBudgets();
        return true;
    }

    getBudget(type, key) {
        return this.budgets[type]?.[key] || 0;
    }

    // A shortcut to check if the current period has a budget set
    getCurrentMonthlyBudget() {
        const currentMonth = Utility.getStartOfMonth(new Date().toISOString().split('T')[0]);
        return this.getBudget('monthly', currentMonth);
    }
}

/**
 * Calculates totals and provides text-based feedback.
 */
class InsightsEngine {
    constructor(expenseManager, budgetManager) {
        this.em = expenseManager;
        this.bm = budgetManager;
    }

    calculateTotals(expenses) {
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        const categoryTotals = expenses.reduce((totals, e) => {
            totals[e.category] = (totals[e.category] || 0) + e.amount;
            return totals;
        }, {});
        return { total, categoryTotals };
    }

    getWeeklySummary() {
        const today = new Date().toISOString().split('T')[0];
        const currentWeekKey = Utility.getStartOfWeek(today);
        const lastWeekKey = Utility.getPreviousWeek(currentWeekKey);

        const currentWeekExpenses = this.em.getExpensesByWeek(currentWeekKey);
        const lastWeekExpenses = this.em.getExpensesByWeek(lastWeekKey);

        const current = this.calculateTotals(currentWeekExpenses);
        const last = this.calculateTotals(lastWeekExpenses);

        return {
            currentWeekKey,
            lastWeekKey,
            current,
            last,
        };
    }

    getMonthlySummary() {
        const today = new Date().toISOString().split('T')[0];
        const currentMonthKey = Utility.getStartOfMonth(today);
        const prevMonthKey = Utility.getPreviousMonth(currentMonthKey);

        const currentMonthExpenses = this.em.getExpensesByMonth(currentMonthKey);
        const prevMonthExpenses = this.em.getExpensesByMonth(prevMonthKey);

        const current = this.calculateTotals(currentMonthExpenses);
        const prev = this.calculateTotals(prevMonthExpenses);
        const budget = this.bm.getCurrentMonthlyBudget();

        return {
            currentMonthKey,
            prevMonthKey,
            current,
            prev,
            budget
        };
    }

    generateInsights() {
        const weekly = this.getWeeklySummary();
        const monthly = this.getMonthlySummary();
        const insights = [];

        // 1. Weekly Comparison Insight
        if (weekly.current.total > 0 && weekly.last.total > 0) {
            const diff = weekly.current.total - weekly.last.total;
            const percentDiff = (Math.abs(diff) / weekly.last.total) * 100;
            if (diff > 0) {
                insights.push(`Warning: Your spending is ${percentDiff.toFixed(0)}% higher than last week. Be mindful!`);
            } else if (diff < 0) {
                insights.push(`Great job! Your spending is ${percentDiff.toFixed(0)}% lower than last week. Keep saving!`);
            }
        } else if (weekly.current.total > 0 && weekly.last.total === 0) {
            insights.push("Start comparing! You have expenses this week, but none recorded last week.");
        }

        // 2. Budget Insight
        if (monthly.budget > 0) {
            const remaining = monthly.budget - monthly.current.total;
            const percentUsed = (monthly.current.total / monthly.budget) * 100;
            if (remaining >= 0 && percentUsed < 80) {
                insights.push(`Excellent! You've only used ${percentUsed.toFixed(0)}% of your monthly budget. Remaining: ${Utility.formatCurrency(remaining)}.`);
            } else if (remaining < 0) {
                insights.push(`Critical Warning: You are over budget by ${Utility.formatCurrency(Math.abs(remaining))} this month. Immediate action needed!`);
            } else if (percentUsed >= 80) {
                insights.push(`Caution: You are close to your budget limit (${percentUsed.toFixed(0)}% used). Be careful for the rest of the month.`);
            }
        } else {
            insights.push("Tip: Set a monthly budget in the 'Budget & Goals' section to get critical performance feedback.");
        }

        // 3. Top Category Insight (Current Month)
        if (Object.keys(monthly.current.categoryTotals).length > 0) {
            const topCategory = Object.keys(monthly.current.categoryTotals).reduce((a, b) => monthly.current.categoryTotals[a] > monthly.current.categoryTotals[b] ? a : b);
            const topAmount = monthly.current.categoryTotals[topCategory];
            insights.push(`Observation: Your highest expense category this month is ${topCategory}, costing ${Utility.formatCurrency(topAmount)}.`);

            if (topCategory === 'Entertainment' || topCategory === 'Shopping') {
                insights.push(`Suggestion: Try to find free or cheaper alternatives for ${topCategory} this week to maximize savings.`);
            }
        }

        return insights;
    }
}

// --- View Renderer and Main App Logic ---

class App {
    constructor() {
        this.em = new ExpenseManager();
        this.bm = new BudgetManager();
        this.ie = new InsightsEngine(this.em, this.bm);
        this.container = document.getElementById('app-container');
        this.currentView = 'daily';
        this.setupNavigation();
        this.setupModals();
        this.render();

        // Debug: Log initial data status
        console.log("App Initialized. Total Expenses:", this.em.expenses.length);
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentView = e.target.dataset.view;
                navLinks.forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
                this.render();
            });
        });

        // Set initial active link
        document.querySelector(`[data-view="${this.currentView}"]`).classList.add('active');
    }

    setupModals() {
        this.modalContainer = document.getElementById('modal-container');
        this.modalTitle = document.getElementById('modal-title');
        this.modalMessage = document.getElementById('modal-message');
        this.modalConfirmBtn = document.getElementById('modal-confirm-btn');
        this.modalCancelBtn = document.getElementById('modal-cancel-btn');

        this.modalCancelBtn.addEventListener('click', () => this.hideModal());
    }

    showModal(title, message, onConfirm) {
        this.modalTitle.textContent = title;
        this.modalMessage.textContent = message;
        this.modalConfirmBtn.onclick = () => {
            onConfirm();
            this.hideModal();
        };
        this.modalConfirmBtn.classList.remove('hidden'); // Ensure it's visible by default
        this.modalCancelBtn.textContent = 'Cancel'; // Reset cancel text

        this.modalContainer.classList.remove('hidden');
        this.modalContainer.classList.add('flex');
    }

    hideModal() {
        this.modalContainer.classList.remove('flex');
        this.modalContainer.classList.add('hidden');
        this.modalConfirmBtn.onclick = null;
    }

    render() {
        this.container.innerHTML = `<h1 class="text-3xl font-bold mb-6 text-gray-800">${this.currentView.charAt(0).toUpperCase() + this.currentView.slice(1)} View</h1>`;
        switch (this.currentView) {
            case 'daily':
                this.renderDailyView();
                break;
            case 'weekly':
                this.renderWeeklyView();
                break;
            case 'monthly':
                this.renderMonthlyView();
                break;
            case 'budget':
                this.renderBudgetView();
                break;
            case 'insights':
                this.renderInsightsView();
                break;
        }
    }

    // --- A. Daily Expense Module Rendering ---
    renderDailyView() {
        const today = new Date().toISOString().split('T')[0];
        const expenses = this.em.getDailyExpenses(today);
        const dailyTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

        const html = `
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-1">
                            ${this.renderExpenseForm()}
                        </div>
                        <div class="lg:col-span-2 space-y-4">
                            <div class="glass-card p-4">
                                <h2 class="text-xl font-semibold text-gray-700 mb-2">Today's Total: <span class="text-indigo-600">${Utility.formatCurrency(dailyTotal)}</span></h2>
                                <p class="text-sm text-gray-500">Showing expenses for ${Utility.formatDate(today)}</p>
                            </div>
                            <h3 class="text-2xl font-semibold text-gray-700 mt-6">Recent Entries</h3>
                            <div id="expense-list" class="space-y-3">
                                ${expenses.length > 0 ? expenses.map(e => this.renderExpenseItem(e)).join('') : '<p class="text-gray-500 p-4 glass-card">No expenses recorded for today.</p>'}
                            </div>
                        </div>
                    </div>
                `;
        this.container.insertAdjacentHTML('beforeend', html);
        this.setupFormListeners();
        this.setupExpenseListListeners(today);
    }

    renderExpenseForm(expense = null) {
        const isEdit = expense !== null;
        const today = new Date().toISOString().split('T')[0];
        return `
                    <div class="glass-card p-6 sticky top-4">
                        <h3 class="text-xl font-bold mb-4 text-indigo-700">${isEdit ? 'Edit Expense' : 'Add New Expense'}</h3>
                        <form id="expense-form" data-id="${isEdit ? expense.id : ''}">
                            <div class="space-y-4">
                                <div>
                                    <label for="amount" class="block text-sm font-medium text-gray-700">Amount (₹)</label>
                                    <input type="number" step="0.01" id="amount" value="${isEdit ? expense.amount : ''}" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500">
                                </div>
                                <div>
                                    <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
                                    <select id="category" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500">
                                        ${CATEGORIES.map(c => `<option value="${c}" ${isEdit && expense.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                                    <input type="text" id="description" value="${isEdit ? expense.description : ''}" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500">
                                </div>
                                <div>
                                    <label for="date" class="block text-sm font-medium text-gray-700">Date</label>
                                    <input type="date" id="date" value="${isEdit ? expense.date : today}" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500">
                                </div>
                                <button type="submit" class="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition">
                                    ${isEdit ? 'Save Changes' : 'Record Expense'}
                                </button>
                                ${isEdit ? `<button type="button" id="cancel-edit-btn" class="w-full mt-2 bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-gray-600 transition">Cancel Edit</button>` : ''}
                            </div>
                        </form>
                    </div>
                `;
    }

    renderExpenseItem(expense) {
        return `
                    <div class="glass-card p-4 flex justify-between items-center data-id="${expense.id}">
                        <div>
                            <p class="text-lg font-semibold text-gray-800">${Utility.formatCurrency(expense.amount)}</p>
                            <p class="text-sm text-indigo-600">${expense.category}</p>
                            <p class="text-xs text-gray-500">${expense.description}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button data-action="edit" data-id="${expense.id}" class="text-sm text-indigo-600 hover:text-indigo-800 transition">Edit</button>
                            <button data-action="delete" data-id="${expense.id}" class="text-sm text-red-600 hover:text-red-800 transition">Delete</button>
                        </div>
                    </div>
                `;
    }

    setupFormListeners() {
        const form = document.getElementById('expense-form');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            const id = form.dataset.id;
            const amount = document.getElementById('amount').value;
            const category = document.getElementById('category').value;
            const description = document.getElementById('description').value;
            const date = document.getElementById('date').value;

            if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || !category || !description.trim() || !date) {
                this.showModal('Validation Error', 'Please ensure all fields are filled correctly and the amount is a positive number.', () => { });
                this.modalConfirmBtn.classList.add('hidden');
                this.modalCancelBtn.textContent = 'Close';
                return;
            }

            if (id) {
                this.em.updateExpense(id, amount, category, description, date);
            } else {
                this.em.addExpense(amount, category, description, date);
            }
            this.renderDailyView(); // Re-render the daily view to update the list
        };

        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.renderDailyView());
        }
    }

    setupExpenseListListeners(currentDate) {
        const list = document.getElementById('expense-list');
        if (!list) return;

        list.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const expense = this.em.expenses.find(e => e.id === id);

            if (!expense) return;

            if (action === 'delete') {
                this.showModal(
                    'Confirm Deletion',
                    `Are you sure you want to delete the ${Utility.formatCurrency(expense.amount)} expense for ${expense.category}?`,
                    () => {
                        this.em.deleteExpense(id);
                        this.renderDailyView();
                    }
                );
            } else if (action === 'edit') {
                // Replace the form with the edit form
                document.querySelector('.lg\\:col-span-1').innerHTML = this.renderExpenseForm(expense);
                this.setupFormListeners();
                // Scroll to the form
                document.querySelector('.lg\\:col-span-1').scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // --- B. Weekly Expense Module Rendering ---
    renderWeeklyView() {
        const { current, last, currentWeekKey, lastWeekKey } = this.ie.getWeeklySummary();

        // Calculate category comparison for the week
        const currentCategories = current.categoryTotals;
        const maxCategorySpend = Math.max(0, ...Object.values(currentCategories));

        const categoriesHtml = CATEGORIES.map(cat => {
            const currentSpend = currentCategories[cat] || 0;
            const lastSpend = last.categoryTotals[cat] || 0;
            const change = currentSpend - lastSpend;
            const percent = maxCategorySpend > 0 ? (currentSpend / maxCategorySpend) * 100 : 0;
            const changeClass = change > 0 ? 'text-red-500' : (change < 0 ? 'text-green-500' : 'text-gray-500');

            return `
                        <div class="p-3 border-b border-gray-200">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-medium text-gray-700">${cat}</span>
                                <span class="font-semibold">${Utility.formatCurrency(currentSpend)}</span>
                            </div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${percent.toFixed(0)}%;"></div>
                            </div>
                            <p class="text-xs mt-1 ${changeClass}">vs. Last Week: ${change > 0 ? '+' : ''}${Utility.formatCurrency(change)}</p>
                        </div>
                    `;
        }).join('');

        const comparisonHtml = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="glass-card p-4 text-center">
                            <p class="text-sm font-medium text-gray-500">Current Week (${Utility.formatDate(currentWeekKey)})</p>
                            <p class="text-3xl font-extrabold text-indigo-600 mt-1">${Utility.formatCurrency(current.total)}</p>
                        </div>
                        <div class="glass-card p-4 text-center">
                            <p class="text-sm font-medium text-gray-500">Last Week (${Utility.formatDate(lastWeekKey)})</p>
                            <p class="text-3xl font-extrabold text-gray-700 mt-1">${Utility.formatCurrency(last.total)}</p>
                        </div>
                    </div>
                `;

        const feedback = this.ie.generateInsights().filter(i => i.includes('week'));

        const html = `
                    ${comparisonHtml}
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        <div class="lg:col-span-2 glass-card p-6">
                            <h3 class="text-xl font-bold mb-4 text-gray-800">Category Distribution (Current Week)</h3>
                            <div class="divide-y divide-gray-100">
                                ${categoriesHtml}
                            </div>
                        </div>
                        <div class="lg:col-span-1 glass-card p-6">
                            <h3 class="text-xl font-bold mb-4 text-gray-800">Weekly Insights</h3>
                            <div class="space-y-3">
                                ${feedback.length > 0 ? feedback.map(msg => `<p class="p-3 bg-indigo-50/70 text-sm rounded-lg">${msg}</p>`).join('') : '<p class="text-gray-500">No specific weekly insights yet.</p>'}
                            </div>
                        </div>
                    </div>
                `;
        this.container.insertAdjacentHTML('beforeend', html);
    }

    // --- C. Monthly Expense Module Rendering ---
    renderMonthlyView() {
        const { current, prev, currentMonthKey, prevMonthKey } = this.ie.getMonthlySummary();
        const allMonths = Array.from(new Set(this.em.expenses.map(e => Utility.getStartOfMonth(e.date))))
            .sort().reverse();
        const historyData = allMonths.map(month => ({
            month,
            total: this.calculateMonthlyTotal(month),
        }));

        const maxTotal = Math.max(0, ...historyData.map(d => d.total));
        const trendChartHtml = historyData.map(data => {
            const percent = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
            return `
                        <div class="flex items-end h-40 relative">
                            <div class="w-full bg-indigo-200 rounded-t-lg absolute bottom-0" style="height: ${percent.toFixed(0)}%; max-height: 100%;" title="${data.month}: ${Utility.formatCurrency(data.total)}">
                                <div class="w-full h-full bg-indigo-600 transition-all duration-500 ease-out" style="height: 100%;"></div>
                            </div>
                            <p class="absolute bottom-0 text-xs w-full text-center mb-1 text-gray-600 transform -rotate-45 origin-bottom-left">${data.month.split('-')[1]}</p>
                        </div>
                    `;
        }).reverse().join('');


        const html = `
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-1 glass-card p-6 text-center">
                            <p class="text-sm font-medium text-gray-500">Current Month (${currentMonthKey}) Total</p>
                            <p class="text-4xl font-extrabold text-indigo-600 mt-2">${Utility.formatCurrency(current.total)}</p>
                        </div>
                        <div class="lg:col-span-1 glass-card p-6 text-center">
                            <p class="text-sm font-medium text-gray-500">Previous Month (${prevMonthKey}) Total</p>
                            <p class="text-4xl font-extrabold text-gray-700 mt-2">${Utility.formatCurrency(prev.total)}</p>
                        </div>
                        <div class="lg:col-span-1 glass-card p-6">
                            <h3 class="text-xl font-bold mb-4 text-gray-800">Monthly Comparison</h3>
                            <p class="${current.total > prev.total ? 'text-red-500' : 'text-green-500'} font-semibold">
                                ${current.total > prev.total ? 'UP' : (current.total < prev.total ? 'DOWN' : 'FLAT')} by ${Utility.formatCurrency(Math.abs(current.total - prev.total))}
                            </p>
                            <p class="text-sm text-gray-500 mt-2">Check the trends below for context.</p>
                        </div>
                    </div>

                    <div class="glass-card p-6 mt-6">
                        <h3 class="text-xl font-bold mb-6 text-gray-800">Spending Trend (Last 12 Months)</h3>
                        <div class="flex items-end space-x-2 h-48 border-b border-l border-gray-300 pb-6 pr-2">
                            ${trendChartHtml}
                        </div>
                        <p class="text-center text-sm text-gray-500 mt-4">Months (1 = Jan, 12 = Dec)</p>
                    </div>
                `;
        this.container.insertAdjacentHTML('beforeend', html);
    }

    calculateMonthlyTotal(monthKey) {
        const expenses = this.em.getExpensesByMonth(monthKey);
        return expenses.reduce((sum, e) => sum + e.amount, 0);
    }

    // --- D. Budget & Goals Module Rendering ---
    renderBudgetView() {
        const today = new Date().toISOString().split('T')[0];
        const currentMonthKey = Utility.getStartOfMonth(today);
        const currentBudget = this.bm.getCurrentMonthlyBudget();
        const monthlyTotal = this.calculateMonthlyTotal(currentMonthKey);
        const remaining = currentBudget - monthlyTotal;
        const percentUsed = currentBudget > 0 ? (monthlyTotal / currentBudget) * 100 : 0;
        const isOverBudget = remaining < 0;

        const progressColor = isOverBudget ? 'bg-red-500' : (percentUsed > 80 ? 'bg-orange-500' : 'bg-green-500');
        const progressBarHtml = `
                    <div class="bar-container h-6 mb-4">
                        <div class="bar-fill ${progressColor} transition-all duration-700" style="width: ${Math.min(100, percentUsed).toFixed(0)}%;"></div>
                    </div>
                `;

        const budgetStatusHtml = `
                    <div class="glass-card p-6 text-center">
                        <p class="text-sm font-medium text-gray-500">Monthly Budget for ${currentMonthKey}</p>
                        <p class="text-4xl font-extrabold text-indigo-600 mt-2">${Utility.formatCurrency(currentBudget)}</p>
                        <div class="mt-4">
                            <p class="text-lg font-semibold text-gray-800">Spent: ${Utility.formatCurrency(monthlyTotal)}</p>
                            <p class="text-lg font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}">Remaining: ${Utility.formatCurrency(Math.abs(remaining))}</p>
                        </div>
                        <div class="mt-6">
                            ${progressBarHtml}
                            <p class="text-sm font-medium text-gray-700">${percentUsed.toFixed(1)}% Used</p>
                            <span class="inline-block mt-3 px-3 py-1 rounded-full text-sm font-bold ${isOverBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                                Status: ${isOverBudget ? 'OVER BUDGET' : 'ON TRACK'}
                            </span>
                        </div>
                    </div>
                `;

        const formHtml = `
                    <div class="glass-card p-6 sticky top-4">
                        <h3 class="text-xl font-bold mb-4 text-indigo-700">Set Monthly Budget Goal</h3>
                        <form id="budget-form">
                            <div class="space-y-4">
                                <div>
                                    <label for="budget-amount" class="block text-sm font-medium text-gray-700">Set Budget Amount (₹)</label>
                                    <input type="number" step="0.01" id="budget-amount" value="${currentBudget > 0 ? currentBudget : ''}" required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500">
                                </div>
                                <div>
                                    <label for="budget-period" class="block text-sm font-medium text-gray-700">Period</label>
                                    <select id="budget-period" disabled class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 bg-gray-100 text-gray-500">
                                        <option value="monthly">Monthly (${currentMonthKey})</option>
                                    </select>
                                </div>
                                <button type="submit" class="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition">
                                    Save Budget
                                </button>
                            </div>
                        </form>
                    </div>
                `;

        const html = `
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-1">
                            ${formHtml}
                        </div>
                        <div class="lg:col-span-2">
                            ${budgetStatusHtml}
                        </div>
                    </div>
                `;
        this.container.insertAdjacentHTML('beforeend', html);
        this.setupBudgetFormListener(currentMonthKey);
    }

    setupBudgetFormListener(monthKey) {
        const form = document.getElementById('budget-form');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            const amount = document.getElementById('budget-amount').value;
            const amountNum = parseFloat(amount);

            if (isNaN(amountNum) || amountNum <= 0) {
                this.showModal('Validation Error', 'Please enter a positive number for the budget amount.', () => { });
                this.modalConfirmBtn.classList.add('hidden');
                this.modalCancelBtn.textContent = 'Close';
                return;
            }

            this.bm.setBudget('monthly', monthKey, amountNum);
            this.renderBudgetView();
        };
    }

    // --- E & F. Analytics, Insights, & Motivational Module Rendering ---
    renderInsightsView() {
        const insights = this.ie.generateInsights();
        const monthly = this.ie.getMonthlySummary();
        const weekly = this.ie.getWeeklySummary();

        const monthlyFeedback = insights.filter(msg => msg.includes('budget') || msg.includes('month') || msg.includes('Tip')).join('');
        const weeklyFeedback = insights.filter(msg => msg.includes('week') || msg.includes('Suggestion')).join('');

        const topCategoryInsight = insights.filter(msg => msg.includes('highest expense category')).join('');
        const topCategorySuggestion = insights.filter(msg => msg.includes('Suggestion:') && !msg.includes('week')).join('');

        const html = `
                    <div class="space-y-6">
                        <div class="glass-card p-6">
                            <h3 class="text-2xl font-bold mb-4 text-indigo-700">Personalized Insights & Feedback</h3>
                            <div class="space-y-4">
                                <div class="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
                                    <p class="text-sm font-semibold text-indigo-700 mb-1">Monthly Review (${monthly.currentMonthKey}):</p>
                                    <p class="text-gray-800">${monthlyFeedback || 'No specific budget or monthly feedback available yet.'}</p>
                                </div>
                                <div class="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                                    <p class="text-sm font-semibold text-yellow-700 mb-1">Weekly Checkup:</p>
                                    <p class="text-gray-800">${weeklyFeedback || 'No specific weekly comparison feedback available yet.'}</p>
                                </div>
                                <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                                    <p class="text-sm font-semibold text-green-700 mb-1">Behavioral Focus:</p>
                                    <p class="text-gray-800">${topCategoryInsight || 'Start recording expenses to identify your top category.'}</p>
                                    <p class="text-gray-800 mt-2">${topCategorySuggestion || ''}</p>
                                </div>
                            </div>
                        </div>

                        ${this.renderGoalsReview(monthly)}
                    </div>
                `;
        this.container.insertAdjacentHTML('beforeend', html);
    }

    renderGoalsReview(monthlySummary) {
        const { current, budget } = monthlySummary;
        const goalsHtml = [];

        if (budget > 0) {
            const status = current.total <= budget ? 'Achieved' : 'Missed';
            const color = current.total <= budget ? 'bg-green-500' : 'bg-red-500';

            goalsHtml.push(`
                        <div class="glass-card p-4 flex items-center justify-between">
                            <div>
                                <p class="font-semibold text-gray-800">Stay Within Monthly Budget (${Utility.formatCurrency(budget)})</p>
                                <p class="text-sm text-gray-500">Total Spent: ${Utility.formatCurrency(current.total)}</p>
                            </div>
                            <span class="px-3 py-1 text-white text-sm rounded-full ${color}">${status}</span>
                        </div>
                    `);
        } else {
            goalsHtml.push('<p class="text-gray-500 p-4">Set a monthly budget to see goal tracking here!</p>');
        }

        return `
                    <div class="glass-card p-6">
                        <h3 class="text-2xl font-bold mb-4 text-gray-800">Monthly Goals Review</h3>
                        <div class="space-y-3">
                            ${goalsHtml.join('')}
                        </div>
                    </div>
                `;
    }
}

// --- Initialization ---

window.onload = () => {
    // Check for initial data and setup. If no data, populate a small demo.
    if (!StorageUtility.get('expenses') || StorageUtility.get('expenses').length === 0) {
        console.log("No data found. Populating demo data.");
        const today = new Date().toISOString().split('T')[0];
        // Demo data amounts are kept small as they now represent INR, not USD.
        const demoExpenses = [
            { id: 'd1', amount: 150.50, category: 'Food', description: 'Lunch at cafe', date: today },
            { id: 'd2', amount: 40.00, category: 'Transport', description: 'Bus fare', date: today },
            { id: 'd3', amount: 650.99, category: 'Shopping', description: 'New shirt', date: today },
            { id: 'd4', amount: 500.00, category: 'Entertainment', description: 'Movie tickets', date: today },
        ];
        StorageUtility.set('expenses', demoExpenses);
        // Set a reasonable monthly budget in INR (e.g., ₹15,000)
        StorageUtility.set('budgets', { monthly: { [Utility.getStartOfMonth(today)]: 15000 } });
    }

    new App();
};
