// Данные приложения
let financeData = {
    currentUser: { firstName: "Вы" },
    categories: [],
    users: [],
    transactions: [],
    totalBalance: 0,
    period: 'month'
};

// Загрузка данных
function loadData() {
    const saved = localStorage.getItem('financeData');
    if (saved) {
        financeData = JSON.parse(saved);
    } else {
        // Начальные данные
        financeData.categories = [
            { id: 1, name: 'Продукты', color: '#10b981', icon: 'fas fa-shopping-basket', balance: 0, percent: 30 },
            { id: 2, name: 'Транспорт', color: '#3b82f6', icon: 'fas fa-car', balance: 0, percent: 20 },
            { id: 3, name: 'Развлечения', color: '#8b5cf6', icon: 'fas fa-film', balance: 0, percent: 15 },
            { id: 4, name: 'Коммуналка', color: '#ef4444', icon: 'fas fa-home', balance: 0, percent: 25 },
            { id: 5, name: 'Прочее', color: '#64748b', icon: 'fas fa-ellipsis-h', balance: 0, percent: 10 }
        ];
        financeData.totalBalance = 0;
        saveData();
    }
}

// Сохранение данных
function saveData() {
    localStorage.setItem('financeData', JSON.stringify(financeData));
}

// Telegram пользователь
function initTelegramUser() {
    if (typeof Telegram !== 'undefined') {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const user = tg.initDataUnsafe?.user;
        if (user) {
            financeData.currentUser = {
                id: user.id,
                firstName: user.first_name || 'Пользователь',
                username: user.username
            };
            document.getElementById('user-name').textContent = user.first_name || 'Вы';
            saveData();
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initTelegramUser();
});
