// Загрузка данных
let users = JSON.parse(localStorage.getItem('financeUsers')) || {};
let currentUser = null;
let transactions = [];

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('date').valueAsDate = new Date();
    loadUserTransactions();
    render();
    
    // Обработчики событий
    document.getElementById('transactionForm').addEventListener('submit', addTransaction);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('loginBtn').addEventListener('click', () => openModal(true));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('closeModal').addEventListener('click', () => openModal(false));
    document.getElementById('filterMonth').addEventListener('change', render);
    document.getElementById('resetFilter').addEventListener('click', () => {
        document.getElementById('filterMonth').value = '';
        render();
    });
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
});
// Загрузка транзакций пользователя
function loadUserTransactions() {
    if (currentUser && users[currentUser]) {
        transactions = users[currentUser];
    } else {
        transactions = [];
    }
}
// Добавление транзакции
function addTransaction(e) {
    e.preventDefault();
    if (!currentUser) {
        alert('Войдите в систему для добавления транзакций');
        return;
    }
    const transaction = {
        id: Date.now(),
        type: document.getElementById('type').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value
    };
    
    transactions.push(transaction);
    save();
    render();
    e.target.reset();
    document.getElementById('date').valueAsDate = new Date();
}

// Удаление транзакции
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    save();
    render();
}

// Очистка всех транзакций
function clearAll() {
    if (confirm('Удалить все транзакции?')) {
        transactions = [];
        save(); // Сохраняем изменения
        render();
    }
}

// Авторизация
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username && password) {
        currentUser = username;
        // Если пользователь новый, создаем для него пустой массив транзакций
        if (!users[currentUser]) {
            users[currentUser] = [];
        }
        loadUserTransactions(); // Загружаем транзакции пользователя
        updateAuthUI();
        openModal(false);
        render(); // Перерисовываем интерфейс с данными пользователя
        document.getElementById('loginForm').reset();
    }
}

// Выход из системы
function handleLogout() {
    // Сохраняем данные перед выходом
    save();
    currentUser = null;
    transactions = []; // Очищаем текущие транзакции
    updateAuthUI();
    render(); // Перерисовываем интерфейс (будет пустой)
}

// Обновление интерфейса авторизации
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        logoutBtn.textContent = `Выйти (${currentUser})`;
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    }
}

// Модальное окно
function openModal(show) {
    document.getElementById('modal').style.display = show ? 'flex' : 'none';
}

// Фильтрация
function getFilteredTransactions() {
    const month = document.getElementById('filterMonth').value;
    if (!month) return transactions;
    return transactions.filter(t => t.date.startsWith(month));
}

// Расчет баланса
function calculateBalance(list) {
    let income = 0, expense = 0;
    list.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
}

// Отрисовка
function render() {
    if (!currentUser) {
        // Если пользователь не авторизован, показываем пустые данные
        document.getElementById('incomeValue').textContent = '0 ₽';
        document.getElementById('expenseValue').textContent = '0 ₽';
        document.getElementById('balanceValue').textContent = '0 ₽';
        document.getElementById('transactionList').innerHTML = '<p style="text-align: center; color: #666;">Войдите для просмотра транзакций</p>';
        return;
    }
    const filtered = getFilteredTransactions();
    const balance = calculateBalance(filtered);
    
    // Баланс
    document.getElementById('incomeValue').textContent = balance.income + ' ₽';
    document.getElementById('expenseValue').textContent = balance.expense + ' ₽';
    document.getElementById('balanceValue').textContent = balance.balance + ' ₽';
    
    // Список транзакций
    const list = document.getElementById('transactionList');
    list.innerHTML = '';
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #666;">Нет транзакций</p>';
        return;
    }
    
    // Сортируем по дате (новые сверху)
    const sortedTransactions = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(t => {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div class="transaction-info">
                <div><strong>${t.date}</strong></div>
                <div>${t.category}</div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'}${t.amount} ₽
            </div>
            <button class="delete-btn" onclick="deleteTransaction(${t.id})">Удалить</button>
        `;
        list.appendChild(div);
    });
    
    // Диаграмма
    drawChart(filtered);
}

// Диаграмма
function drawChart(list) {
    const canvas = document.getElementById('chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);
    
    const expenses = list.filter(t => t.type === 'expense');
    if (expenses.length === 0) return;
    
    const totals = {};
    expenses.forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    let start = 0;
    const colors = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'];
    
    let i = 0;
    for (let category in totals) {
        const slice = (totals[category] / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.arc(150, 150, 140, start, start + slice);
        ctx.fillStyle = colors[i++ % colors.length];
        ctx.fill();
        start += slice;
    }
}

// Сохранение
function save() {
    if (currentUser) {
        users[currentUser] = transactions;
        localStorage.setItem('financeUsers', JSON.stringify(users));
    }
}