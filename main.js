// Данные
let users = JSON.parse(localStorage.getItem('financeUsers')) || {};
let currentUser = null;
let transactions = [];

// Состояние приложения
let currentPage = 'main'; // 'main' или 'analysis'

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadUserTransactions();
    renderAll();

    // Обработчики
    document.getElementById('transactionForm').addEventListener('submit', addTransaction);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('loginBtn').addEventListener('click', () => openModal(true));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('closeModal').addEventListener('click', () => openModal(false));
    document.getElementById('toggleAnalysisBtn').addEventListener('click', toggleAnalysisPage);
    document.getElementById('addTransactionBtn').addEventListener('click', showAddForm);
    document.getElementById('cancelAddBtn').addEventListener('click', hideAddForm);

    // Переключение графика
    document.querySelectorAll('input[name="chartType"]').forEach(radio => {
        radio.addEventListener('change', renderAnalysis);
    });
});

// Загрузка транзакций
function loadUserTransactions() {
    transactions = currentUser && users[currentUser] ? users[currentUser] : [];
}

// Добавление транзакции
function addTransaction(e) {
    e.preventDefault();
    if (!currentUser) return alert('Войдите в систему для добавления транзакций');

    transactions.push({
        id: Date.now(),
        type: document.getElementById('type').value,
        amount: +document.getElementById('amount').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value
    });

    save();
    hideAddForm();
    renderAll();
    document.getElementById('transactionForm').reset();
    document.getElementById('date').valueAsDate = new Date();
}

// Удаление
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    save();
    renderAll();
}

// Авторизация
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        currentUser = username;
        if (!users[currentUser]) users[currentUser] = [];
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
    updateAuthUI();
    renderAll();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authMessage = document.getElementById('authMessage');
    const addBtn = document.getElementById('addTransactionBtn');

    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        logoutBtn.textContent = `Выйти (${currentUser})`;
        authMessage.style.display = 'none';
        addBtn.disabled = false;
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        authMessage.style.display = 'block';
        addBtn.disabled = true;
    }
}

// Переключение страниц
function toggleAnalysisPage() {
    currentPage = currentPage === 'main' ? 'analysis' : 'main';
    document.getElementById('mainPage').style.display = currentPage === 'main' ? 'block' : 'none';
    document.getElementById('analysisPage').style.display = currentPage === 'analysis' ? 'block' : 'none';
    const btn = document.getElementById('toggleAnalysisBtn')
        if (currentPage == 'analysis'){
            btn.textContent = 'На главную'
        } else{
            btn.textContent = 'Анализ финансов';
        }
    if (currentPage === 'analysis'){ renderAnalysis();}
}

// Форма добавления
function showAddForm() {
    if (!currentUser) return alert('Войдите в систему!');
    document.getElementById('addFormSection').style.display = 'block';
}

function hideAddForm() {
    document.getElementById('addFormSection').style.display = 'none';
}

// Основной рендер
function renderAll() {
    updateAuthUI();
    if (currentPage === 'main') {
        renderTransactions();
    } else {
        renderAnalysis();
    }
}

// Рендер списка транзакций
function renderTransactions() {
    const list = document.getElementById('transactionList');
    if (!currentUser) {
        list.innerHTML = '<p style="text-align: center; color: #666;">Войдите для просмотра транзакций</p>';
        return;
    }

    list.innerHTML = transactions.length === 0
        ? '<p style="text-align: center; color: #666;">Нет транзакций</p>'
        : [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(t => `
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

// Анализ
function renderAnalysis() {
    if (!currentUser) {
        document.getElementById('analysisIncome').textContent = '0 ₽';
        document.getElementById('analysisExpense').textContent = '0 ₽';
        document.getElementById('analysisBalance').textContent = '0 ₽';
        document.getElementById('categoriesList').innerHTML = '<p>Войдите в систему</p>';
        drawChart([]);
        return;
    }

    const balance = calculateBalance(transactions);
    document.getElementById('analysisIncome').textContent = balance.income + ' ₽';
    document.getElementById('analysisExpense').textContent = balance.expense + ' ₽';
    document.getElementById('analysisBalance').textContent = balance.balance + ' ₽';

    const chartType = document.querySelector('input[name="chartType"]:checked').value;
    const list = transactions.filter(t => t.type === chartType);
    drawChart(list);

    // Категории
    const totals = {};
    list.forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

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

// Диаграмма
function drawChart(list) {
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);

    if (list.length === 0) return;

    const totals = {};
    list.forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);

    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    let start = -Math.PI / 2; // начать сверху
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

// Баланс
function calculateBalance(list) {
    let income = 0, expense = 0;
    list.forEach(t => t.type === 'income' ? income += t.amount : expense += t.amount);
    return { income, expense, balance: income - expense };
}

// Сохранение
function save() {
    if (currentUser) {
        users[currentUser] = transactions;
        localStorage.setItem('financeUsers', JSON.stringify(users));
    }
}

// Модалка
function openModal(show) {
    document.getElementById('modal').style.display = show ? 'flex' : 'none';
}