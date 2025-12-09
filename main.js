// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let users = JSON.parse(localStorage.getItem('financeUsers')) || {};
let currentUser = null;
let transactions = [];
let userCategories = [];
let expenseLimit = 0;
let currentPage = 'main';

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
    loadUserTransactions();
    renderAll();

    // Обработчики событий
    document.getElementById('transactionForm').addEventListener('submit', addTransaction);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('loginBtn').addEventListener('click', () => openModal(true));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('closeModal').addEventListener('click', () => openModal(false));
    document.getElementById('toggleAnalysisBtn').addEventListener('click', toggleAnalysisPage);
    document.getElementById('addTransactionBtn').addEventListener('click', showAddForm);
    document.getElementById('cancelAddBtn').addEventListener('click', hideAddForm);
    
    // Лимит расходов
    document.getElementById('saveLimitBtn').addEventListener('click', saveExpenseLimit);
    
    // Переключение графика
    document.querySelectorAll('input[name="chartType"]').forEach(radio => {
        radio.addEventListener('change', renderAnalysis);
    });

    // 🔍 ПОИСК: обновляем список при вводе
    document.getElementById('searchInput').addEventListener('input', renderTransactions);
});

// === ЗАГРУЗКА ДАННЫХ ===
function loadUserTransactions() {
    if (currentUser && users[currentUser]) {
        const userData = users[currentUser];
        transactions = Array.isArray(userData.transactions) ? userData.transactions : [];
        expenseLimit = (typeof userData.expenseLimit === 'number') ? userData.expenseLimit : 0;
        userCategories = Array.isArray(userData.categories) ? userData.categories : [];
    } else {
        transactions = [];
        expenseLimit = 0;
        userCategories = [];
    }
    const limitInput = document.getElementById('expenseLimitInput');
    if (limitInput) limitInput.value = expenseLimit || '';
    
    // Обновляем список категорий в форме
    updateCategoryList();
}
function updateCategoryList() {
    const datalist = document.getElementById('categoryList');
    if (!datalist) return;
    
    // Очищаем старые варианты
    datalist.innerHTML = '';
    
    // Добавляем уникальные категории
    [...new Set(userCategories)].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        datalist.appendChild(option);
    });
}
// === СОХРАНЕНИЕ ДАННЫХ ===
function save() {
    if (currentUser) {
        users[currentUser] = {
            transactions: transactions,
            expenseLimit: expenseLimit,
            categories: userCategories
        };
        localStorage.setItem('financeUsers', JSON.stringify(users));
    }
}

// === ВХОД / ВЫХОД ===
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        currentUser = username;
        // Создаём пользователя в НОВОМ формате (объект, а не массив!)
        if (!users[currentUser]) {
            users[currentUser] = { transactions: [], expenseLimit: 0, categories: [] };
        }
        loadUserTransactions();
        updateAuthUI();
        openModal(false);
        renderAll();
        document.getElementById('loginForm').reset();
    }
}

function handleLogout() {
    save();
    currentUser = null;
    transactions = [];
    expenseLimit = 0;
    currentPage = 'main';
    updateAuthUI();
    renderAll();
    document.getElementById('toggleAnalysisBtn').textContent = 'Анализ финансов';
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authMsg = document.getElementById('authMessage');
    const addBtn = document.getElementById('addTransactionBtn');

    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        logoutBtn.textContent = `Выйти (${currentUser})`;
        authMsg.style.display = 'none';
        addBtn.disabled = false;
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        authMsg.style.display = 'block';
        addBtn.disabled = true;
    }
}

// === ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ ===
function toggleAnalysisPage() {
    currentPage = currentPage === 'main' ? 'analysis' : 'main';
    document.getElementById('mainPage').style.display = currentPage === 'main' ? 'block' : 'none';
    document.getElementById('analysisPage').style.display = currentPage === 'analysis' ? 'block' : 'none';
    
    const btn = document.getElementById('toggleAnalysisBtn');
    btn.textContent = currentPage === 'analysis' ? 'На главную' : 'Анализ финансов';
    
    if (currentPage === 'analysis') renderAnalysis();
}

// === ФОРМА ДОБАВЛЕНИЯ ===
function showAddForm() {
    if (!currentUser) return alert('Войдите в систему!');
    document.getElementById('addFormSection').style.display = 'block';
}

function hideAddForm() {
    document.getElementById('addFormSection').style.display = 'none';
}

// === ДОБАВЛЕНИЕ ТРАНЗАКЦИИ ===
function addTransaction(e) {
    e.preventDefault();
    if (!currentUser) return alert('Войдите в систему!');

    const amount = +document.getElementById('amount').value;
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value.trim(); // ← добавил .trim()
    const date = document.getElementById('date').value;

    // Сохраняем категорию, если её ещё нет
    if (category && !userCategories.includes(category)) {
        userCategories.push(category);
        updateCategoryList(); // ← ОБНОВЛЯЕМ СПИСОК НА СТРАНИЦЕ
    }

    transactions.push({ id: Date.now(), type, amount, category, date });
    save();

    // ПРОВЕРКА ЛИМИТА
    if (type === 'expense' && expenseLimit > 0) {
        const totalExpenses = calculateBalance(transactions).expense;
        if (totalExpenses > expenseLimit) {
            showAlert('Превышен лимит расходов!');
        }
    }

    hideAddForm();
    renderAll();
    e.target.reset();
    document.getElementById('date').valueAsDate = new Date();
}

// === УДАЛЕНИЕ ===
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    save();
    renderAll();
}

// === ЛИМИТ РАСХОДОВ ===
function saveExpenseLimit() {
    const value = +document.getElementById('expenseLimitInput').value;
    if (isNaN(value) || value < 0) {
        alert('Введите корректный лимит');
        return;
    }
    expenseLimit = value;
    save();
    renderAnalysis();
}

// === ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ ===
function showAlert(message) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = `⚠️ ${message}`;
    alertBox.style.display = 'block';
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 3000);
}

// === ОСНОВНОЙ РЕНДЕР ===
function renderAll() {
    updateAuthUI();
    if (currentPage === 'main') {
        renderTransactions();
    } else {
        renderAnalysis();
    }
}

// === РЕНДЕР ТРАНЗАКЦИЙ (С ПОИСКОМ) ===
function renderTransactions() {
    const listEl = document.getElementById('transactionList');
    if (!currentUser) {
        listEl.innerHTML = '<p style="text-align:center;color:#666;">Войдите для просмотра</p>';
        return;
    }

    // ПОИСК: получаем значение из поля ввода
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Фильтруем транзакции
    let filtered = transactions.filter(t => 
        t.category.toLowerCase().includes(searchTerm) ||
        t.amount.toString().includes(searchTerm)
    );

    // Сортируем (новые сверху)
    filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    listEl.innerHTML = filtered.length === 0
        ? '<p style="text-align:center;color:#666;">Нет транзакций</p>'
        : filtered.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div><strong>${t.date}</strong></div>
                    <div>${t.category}</div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}${t.amount} ₽
                </div>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">Удалить</button>
            </div>
        `).join('');
}

// === АНАЛИЗ (С ЕЖЕМЕСЯЧНЫМ ОТЧЁТОМ) ===
function renderAnalysis() {
    if (!currentUser) {
        return;
    }

    // Убедимся, что expenseLimit — число
    expenseLimit = typeof expenseLimit === 'number' ? expenseLimit : 0;
    const balance = calculateBalance(transactions);

    // Обновляем баланс
    document.getElementById('analysisIncome').textContent = balance.income + ' ₽';
    document.getElementById('analysisExpense').textContent = balance.expense + ' ₽';
    document.getElementById('analysisBalance').textContent = balance.balance + ' ₽';

    // Статус лимита
    const limitStatusEl = document.getElementById('limitStatus');
    if (expenseLimit > 0) {
        const percent = (balance.expense / expenseLimit) * 100;
        let statusText = `Потрачено: ${balance.expense} ₽ из ${expenseLimit} ₽ (${percent.toFixed(1)}%)`;
        let color = '#06d6a0';
        if (percent >= 100) {
            color = '#ef476f';
            statusText += '  Превышен лимит!';
        } else if (percent >= 80) {
            color = '#ff9e00';
            statusText += '  Почти достигнут!';
        }
        limitStatusEl.innerHTML = `<span style="color: ${color}">${statusText}</span>`;
    } else {
        limitStatusEl.textContent = 'Лимит не установлен';
    }

    // ЕЖЕМЕСЯЧНЫЙ ОТЧЁТ
    const monthlyReport = getMonthlyReport();
    const reportEl = document.getElementById('monthlyReport');
    if (monthlyReport) {
        reportEl.innerHTML = `
            <p><strong>Доходы:</strong> ${monthlyReport.income} ₽</p>
            <p><strong>Расходы:</strong> ${monthlyReport.expense} ₽</p>
            <p><strong>Баланс:</strong> ${monthlyReport.balance} ₽</p>
        `;
    } else {
        reportEl.innerHTML = '<p>Нет данных за текущий месяц</p>';
    }

    // График и категории
    const chartType = document.querySelector('input[name="chartType"]:checked').value;
    const list = transactions.filter(t => t.type === chartType);
    drawChart(list);

    const totals = {};
    list.forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);

    const categoriesList = document.getElementById('categoriesList');
    if (Object.keys(totals).length === 0) {
        categoriesList.innerHTML = '<p>Нет данных</p>';
    } else {
        categoriesList.innerHTML = Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, sum]) => `
                <div class="category-item">
                    <span>${cat}</span>
                    <strong>${sum} ₽</strong>
                </div>
            `).join('');
    }
}

// === ЕЖЕМЕСЯЧНЫЙ ОТЧЁТ ===
function getMonthlyReport() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяц с ведущим нулём
    const currentMonthPrefix = `${year}-${month}`;

    const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonthPrefix));
    if (monthlyTransactions.length === 0) return null;

    return calculateBalance(monthlyTransactions);
}

// === ГРАФИК ===
function drawChart(list) {
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);

    if (list.length === 0) return;

    const totals = {};
    list.forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);

    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    let start = -Math.PI / 2;
    const colors = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#2ecc71', '#34495e'];

    Object.values(totals).forEach((amount, i) => {
        const slice = (amount / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.arc(150, 150, 120, start, start + slice);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        start += slice;
    });
}

// === РАСЧЁТ БАЛАНСА ===
function calculateBalance(list) {
    let income = 0, expense = 0;
    list.forEach(t => t.type === 'income' ? income += t.amount : expense += t.amount);
    return { income, expense, balance: income - expense };
}

// === МОДАЛЬНОЕ ОКНО ===
function openModal(show) {
    document.getElementById('modal').style.display = show ? 'flex' : 'none';
}
