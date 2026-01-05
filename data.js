// Инициализация данных в localStorage
function initData() {
    if (!localStorage.getItem('financeData')) {
        const defaultData = {
            totalBalance: 0,
            partners: {
                Таня: 0,
                Саша: 0
            },
            template: [
                { category: "Коммуналка", percent: 40, person: "Таня" },
                { category: "Озон", percent: 15, person: "Таня" },
                { category: "Продукты", percent: 25, person: "Таня" },
                { category: "Машина", percent: 20, person: "Саша" }
            ],
            transactions: [],
            sharedAccess: {
                enabled: false,
                partnerId: null,
                lastSync: null
            },
            settings: {
                notifications: true,
                currency: '₽',
                monthlyReset: false
            },
            userInfo: {
                telegramId: null,
                name: 'Пользователь'
            }
        };
        localStorage.setItem('financeData', JSON.stringify(defaultData));
    }
    
    initTelegramUser();
}

// Инициализация пользователя Telegram
function initTelegramUser() {
    let data = getData();
    
    if (typeof Telegram !== 'undefined') {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;
        
        if (user) {
            data.userInfo.telegramId = user.id;
            data.userInfo.name = user.first_name || 'Пользователь';
            
            if (data.sharedAccess.enabled && data.sharedAccess.partnerId) {
                checkPartnerSync();
            }
            
            saveData(data);
        }
    }
}

// Получить все данные
function getData() {
    return JSON.parse(localStorage.getItem('financeData')) || {};
}

// Сохранить данные
function saveData(data) {
    localStorage.setItem('financeData', JSON.stringify(data));
}

// Добавить доход
function addIncome(amount, description = 'Доход') {
    let data = getData();
    data.totalBalance += amount;
    
    data.template.forEach(item => {
        const share = (amount * item.percent) / 100;
        data.partners[item.person] = (data.partners[item.person] || 0) + share;
    });

    data.transactions.push({
        type: 'income',
        amount: amount,
        date: new Date().toISOString(),
        description: description
    });

    saveData(data);
    updateUI();
}

// Добавить расход
function addExpense(amount, category, person) {
    let data = getData();
    if (data.totalBalance >= amount) {
        data.totalBalance -= amount;
        data.partners[person] = (data.partners[person] || 0) - amount;
        
        data.transactions.push({
            type: 'expense',
            amount: amount,
            category: category,
            person: person,
            date: new Date().toISOString()
        });

        saveData(data);
        updateUI();
        return true;
    }
    return false;
}

// Общий доступ
function enablePartnerSharing(partnerTelegramId) {
    let data = getData();
    data.sharedAccess.enabled = true;
    data.sharedAccess.partnerId = partnerTelegramId;
    data.sharedAccess.lastSync = new Date().toISOString();
    saveData(data);
    return true;
}

function disablePartnerSharing() {
    let data = getData();
    data.sharedAccess.enabled = false;
    data.sharedAccess.partnerId = null;
    saveData(data);
    return true;
}

function getPartnerCode() {
    const data = getData();
    if (data.userInfo.telegramId) {
        return btoa(JSON.stringify({
            userId: data.userInfo.telegramId,
            userName: data.userInfo.name,
            timestamp: new Date().getTime()
        }));
    }
    return null;
}

function decodePartnerCode(code) {
    try {
        return JSON.parse(atob(code));
    } catch (e) {
        return null;
    }
}

function checkPartnerSync() {
    // В реальном приложении здесь бы была синхронизация с сервером
    console.log('Проверка синхронизации с партнером');
}

// Экспорт/импорт
function exportData() {
    const data = getData();
    const exportObj = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: data
    };
    
    return JSON.stringify(exportObj, null, 2);
}

function importData(jsonString) {
    try {
        const importObj = JSON.parse(jsonString);
        
        if (!importObj.data || !importObj.data.transactions) {
            throw new Error('Некорректный формат данных');
        }
        
        localStorage.setItem('financeData', JSON.stringify(importObj.data));
        updateUI();
        
        return { success: true, message: 'Данные успешно импортированы' };
    } catch (error) {
        return { success: false, message: 'Ошибка импорта: ' + error.message };
    }
}

// Напоминания
function checkReminders() {
    const data = getData();
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    if (data.settings.monthlyReset && today.getDate() === lastDayOfMonth.getDate()) {
        return {
            type: 'monthly_reset',
            message: 'Завтра начинается новый месяц. Проверьте остатки по категориям.'
        };
    }
    
    if (data.totalBalance < 1000) {
        return {
            type: 'low_balance',
            message: `Внимание! Общий баланс низкий: ${data.totalBalance} ₽`
        };
    }
    
    return null;
}

// Сброс месяца
function resetMonthlyData() {
    let data = getData();
    
    const template = data.template;
    const settings = data.settings;
    const sharedAccess = data.sharedAccess;
    const userInfo = data.userInfo;
    
    const newData = {
        totalBalance: 0,
        partners: {
            Таня: 0,
            Саша: 0
        },
        template: template,
        transactions: [],
        sharedAccess: sharedAccess,
        settings: settings,
        userInfo: userInfo
    };
    
    localStorage.setItem('financeData', JSON.stringify(newData));
    updateUI();
    
    return true;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initData();
    updateUI();
});
