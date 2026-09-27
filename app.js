const toast = document.getElementById('toast');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const searchInput = document.getElementById('searchInput');
const transactionRows = [...document.querySelectorAll('#transactionsBody tr')];
const themeToggle = document.getElementById('themeToggle');
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const assignablePermissions = {
    projects: 'المشاريع',
    clients: 'العملاء',
    employees: 'الموظفون والموارد البشرية',
    offers: 'عروض الأسعار',
    tenders: 'المناقصات',
    reports: 'التقارير',
    dataCenter: 'مركز البيانات',
    settings: 'إعدادات النظام'
};
const rolePresets = {
    hr: { label: 'مسؤول الموارد البشرية', permissions: ['employees'] },
    projectManager: { label: 'مدير المشاريع', permissions: ['projects', 'offers', 'tenders', 'reports'] },
    accountant: { label: 'المحاسب', permissions: ['offers', 'reports'] },
    admin: { label: 'مدير النظام', permissions: ['*'] },
    custom: { label: 'صلاحيات مخصصة', permissions: [] }
};
const sectionPermission = {
    projects: 'projects',
    clients: 'clients',
    employees: 'employees',
    offers: 'offers',
    tenders: 'tenders',
    reports: 'reports',
    dataCenter: 'dataCenter',
    users: 'users',
    settings: 'settings'
};
function getPermissionKeys(value) {
    if (Array.isArray(value)) return value;
    if (value === 'كامل الصلاحيات') return ['*'];
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
    } catch (error) {
        const aliases = {
            projects: /مشاريع|projects?/i,
            clients: /عملاء|clients?/i,
            employees: /موظف|موارد بشرية|employees?|\bHR\b/i,
            offers: /عروض|offers?/i,
            tenders: /مناقصات|tenders?/i,
            reports: /تقارير|reports?/i,
            dataCenter: /مركز البيانات|data center/i,
            settings: /إعدادات|settings?/i
        };
        return Object.entries(aliases).filter(([, pattern]) => pattern.test(value)).map(([permission]) => permission);
    }
    return [];
}
function userHasPermission(account, permission) {
    const permissions = getPermissionKeys(account?.permissions);
    return permissions.includes('*') || permissions.includes(permission);
}
function setNavigationPermissions(account) {
    document.querySelectorAll('.main-nav a').forEach((link) => {
        const sectionKey = link.getAttribute('href').slice(1);
        const permission = sectionPermission[sectionKey];
        link.hidden = Boolean(permission && !userHasPermission(account, permission));
    });
}
let activeAccount = null;
const getSectionRecords = (sectionKey) => {
    try {
        const records = JSON.parse(localStorage.getItem('idh-section-records') || '{}');
        return Array.isArray(records[sectionKey]) ? records[sectionKey] : [];
    } catch (error) {
        return [];
    }
};
const saveSectionRecords = (sectionKey, sectionRecords) => {
    let records = {};
    try {
        records = JSON.parse(localStorage.getItem('idh-section-records') || '{}');
    } catch (error) {
        records = {};
    }
    records[sectionKey] = sectionRecords;
    localStorage.setItem('idh-section-records', JSON.stringify(records));
};
const getSavedQuotes = () => {
    try {
        const quotes = JSON.parse(localStorage.getItem('idh-quotes') || '[]');
        return Array.isArray(quotes) ? quotes : [];
    } catch (error) {
        return [];
    }
};
const apiRequest = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = sessionStorage.getItem('idh-api-token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(endpoint, { ...options, headers });
    const responseText = await response.text();
    let data = {};
    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
        data = { error: 'تعذر قراءة استجابة الخادم. افتح النظام عبر خادم Node.js.' };
    }
    if (!response.ok) throw new Error(data.error || 'تعذر الاتصال بالخادم');
    return data;
};

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function setTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    themeToggle.setAttribute('aria-label', isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
    themeToggle.title = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
}

setTheme(localStorage.getItem('idh-theme') === 'dark');

const languageSelect = document.getElementById('languageSelect');
const languageText = {
    ar: { welcome: 'مرحباً، مدير المنظمة', welcomeSub: 'نظرة سريعة على أداء منظمة I D H الخيرية', heroSmall: 'نظرة شاملة وفعالة', heroTitle: 'لوحة المعلومات', heroSub: 'مركز واحد لمتابعة مشاريع ومبادرات وعملاء منظمة I D H الخيرية', nav: ['لوحة المعلومات', 'المشاريع', 'العملاء', 'الموظفون', 'عروض الأسعار', 'المناقصات', 'التقارير', 'مركز البيانات', 'المستخدمون والصلاحيات', 'إعدادات النظام'], search: 'ابحث في النظام', logout: 'تسجيل الخروج' },
    en: { welcome: 'Welcome, Organization Manager', welcomeSub: 'A quick overview of I D H Charity Organization performance', heroSmall: 'A clear and effective overview', heroTitle: 'Information Dashboard', heroSub: 'One place to follow I D H projects, initiatives, and clients', nav: ['Dashboard', 'Projects', 'Clients', 'Employees', 'Price Offers', 'Tenders', 'Reports', 'Data Center', 'Users & Permissions', 'System Settings'], search: 'Search the system', logout: 'Sign out' }
};

function applyLanguage(language) {
    const text = languageText[language];
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
    document.body.classList.toggle('ltr', language === 'en');
    document.querySelector('.welcome > span').textContent = text.welcome;
    document.querySelector('.welcome small').textContent = text.welcomeSub;
    document.querySelector('.hero-copy small').textContent = text.heroSmall;
    document.querySelector('.hero-copy h1').textContent = text.heroTitle;
    document.querySelector('.hero-copy p').textContent = text.heroSub;
    document.getElementById('searchInput').placeholder = text.search;
    document.getElementById('logoutButton').textContent = text.logout;
    document.getElementById('logoutButton').setAttribute('aria-label', text.logout);
    document.getElementById('logoutButton').title = text.logout;
    document.querySelectorAll('.main-nav a').forEach((link, index) => {
        const icon = link.querySelector('span')?.outerHTML || '';
        link.innerHTML = `${icon} ${text.nav[index]}`;
    });
    localStorage.setItem('idh-language', language);
}

languageSelect.value = localStorage.getItem('idh-language') || 'ar';
applyLanguage(languageSelect.value);
languageSelect.addEventListener('change', (event) => {
    applyLanguage(event.target.value);
    showToast(event.target.value === 'en' ? 'English language enabled' : 'تم تفعيل اللغة العربية');
});

function applySessionProfile(account) {
    const profile = document.querySelector('.profile');
    if (!profile || !account) return;
    activeAccount = account;
    const permissionKeys = getPermissionKeys(account.permissions);
    const permissionText = permissionKeys.includes('*')
        ? 'كامل الصلاحيات'
        : permissionKeys.map((permission) => assignablePermissions[permission]).filter(Boolean).join('، ') || 'بدون صلاحيات';
    profile.querySelector('.profile-avatar').textContent = account.username.charAt(0).toUpperCase();
    profile.querySelector('b').textContent = account.username;
    profile.querySelector('small').textContent = `${account.role} · ${permissionText}`;
    setNavigationPermissions(account);
}

let savedSession = null;
try {
    savedSession = JSON.parse(sessionStorage.getItem('idh-session-user') || 'null');
} catch (error) {
    sessionStorage.removeItem('idh-session-user');
}
if (sessionStorage.getItem('idh-api-token') && savedSession) {
    loginScreen.classList.add('hidden');
    applySessionProfile(savedSession);
} else {
    sessionStorage.removeItem('idh-api-token');
    sessionStorage.removeItem('idh-admin-session');
    sessionStorage.removeItem('idh-session-user');
    setNavigationPermissions({ permissions: [] });
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    try {
        const result = await apiRequest('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        sessionStorage.setItem('idh-api-token', result.token);
        sessionStorage.setItem('idh-admin-session', 'active');
        sessionStorage.setItem('idh-session-user', JSON.stringify(result.user));
        loginScreen.classList.add('hidden');
        loginError.textContent = '';
        applySessionProfile(result.user);
        showToast(`مرحباً ${result.user.username}، تم تسجيل الدخول بنجاح`);
    } catch (error) {
        loginError.textContent = error.message || 'تعذر الاتصال بخادم تسجيل الدخول.';
    }
});

document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
        if (sessionStorage.getItem('idh-api-token')) await apiRequest('/api/logout', { method: 'POST' });
    } catch (error) {
        // Clear local authentication even if the server is unavailable.
    }
    sessionStorage.removeItem('idh-api-token');
    sessionStorage.removeItem('idh-admin-session');
    sessionStorage.removeItem('idh-session-user');
    activeAccount = null;
    setNavigationPermissions({ permissions: [] });
    document.querySelectorAll('.main-nav a').forEach((link) => link.classList.remove('active'));
    workspacePanel.hidden = true;
    loginForm.reset();
    loginError.textContent = '';
    loginScreen.classList.remove('hidden');
    document.getElementById('username').focus();
});

document.getElementById('changePassword').addEventListener('click', async () => {
    const currentPassword = window.prompt('اكتب كلمة المرور الحالية:');
    if (!currentPassword) return;
    const newPassword = window.prompt('اكتب كلمة المرور الجديدة (12 حرفًا على الأقل):');
    const confirmation = window.prompt('أعد كتابة كلمة المرور الجديدة للتأكيد:');
    if (!newPassword || newPassword.length < 12 || newPassword !== confirmation) return showToast('استخدم كلمة مرور من 12 حرفًا على الأقل، وأكدها بشكل صحيح.');
    try {
        await apiRequest('/api/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
        showToast('تم تغيير كلمة المرور بنجاح');
    } catch (error) {
        showToast(error.message || 'تعذر تغيير كلمة المرور عبر الخادم.');
    }
});

themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    setTheme(isDark);
    localStorage.setItem('idh-theme', isDark ? 'dark' : 'light');
    showToast(isDark ? 'تم تفعيل الوضع الداكن' : 'تم تفعيل الوضع الفاتح');
});

menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
const workspacePanel = document.getElementById('workspacePanel');
const workspaceTitle = document.getElementById('workspaceTitle');
const workspaceContent = document.getElementById('workspaceContent');
const workspaceSections = {
    projects: { title: 'إدارة المشاريع', subtitle: 'إضافة وتعديل وحذف المشاريع', fields: ['اسم المشروع', 'العميل', 'قيمة العقد', 'حالة المشروع'] },
    clients: { title: 'إدارة العملاء', subtitle: 'تحديث بيانات العملاء ووسائل التواصل', fields: ['اسم العميل', 'البريد الإلكتروني', 'رقم الهاتف', 'نوع العميل'] },
    employees: { title: 'إدارة الموظفين', subtitle: 'حفظ بيانات الموظفين في Google Sheets', fields: ['اسم الموظف', 'القسم', 'المسمى الوظيفي', 'رقم الهاتف', 'البريد الإلكتروني', 'تاريخ المباشرة', 'الحالة الوظيفية'] },
    offers: { title: 'إدارة عروض الأسعار', subtitle: 'إنشاء ومراجعة عروض الأسعار', fields: ['رقم العرض', 'اسم العميل', 'قيمة العرض', { label: 'تاريخ الانتهاء', type: 'date' }] },
    tenders: { title: 'إدارة المناقصات', subtitle: 'تعديل ومتابعة المناقصات وطلبات الشراء', fields: ['اسم المناقصة', 'الجهة المالكة', 'المرجع', { label: 'آخر موعد للتقديم', type: 'date' }], dateFilter: true },
    reports: { title: 'التقارير', subtitle: 'إنشاء التقارير وحفظها وتصديرها', fields: ['عنوان التقرير', { label: 'الفترة من', type: 'date' }, { label: 'الفترة إلى', type: 'date' }, 'نوع التقرير'], dateFilter: true },
    users: { title: 'المستخدمون والصلاحيات', subtitle: 'إدارة الحسابات والصلاحيات الكاملة', fields: ['اسم المستخدم', 'البريد الإلكتروني', 'الدور', 'الصلاحية'] },
    settings: { title: 'إعدادات النظام', subtitle: 'إدارة إعدادات المنظمة وقنوات التواصل', fields: ['اسم المنظمة', 'البريد الرئيسي', 'رقم التواصل', 'اللغة'] }
};

function openQuoteWorkspace() {
    workspaceTitle.textContent = 'إدارة عروض الأسعار';
    document.getElementById('workspaceSubtitle').textContent = 'إنشاء عروض الأسعار ومتابعة المسودات المحفوظة';
    workspaceContent.innerHTML = `<div class="quote-workspace">
        <header class="quote-header">
            <div><span class="quote-eyebrow">إدارة المبيعات</span><h2>عرض سعر جديد</h2><p>أنشئ عرضًا واضحًا مرتبطًا ببيانات العميل والبنود.</p></div>
            <div class="quote-header-actions"><span class="quote-draft-status" id="quoteStatus">مسودة جديدة</span><span class="quote-tax-chip">ضريبة القيمة المضافة 15%</span><button class="filter-btn" id="newQuote" type="button">＋ عرض جديد</button></div>
        </header>
        <form id="quoteForm">
            <section class="quote-step">
                <div class="quote-step-heading"><span>01</span><div><h3>بيانات العرض</h3><small>المعلومات الأساسية للعرض والعميل</small></div></div>
                <div class="quote-fields">
                    <label>اسم العميل<input name="customer" list="quoteClients" placeholder="اختر العميل أو اكتب اسمه" required /><datalist id="quoteClients"></datalist></label>
                    <label>نوع التعميد<select name="orderType"><option>توريد</option><option>صيانة</option><option>تشغيل</option><option>خدمات</option></select></label>
                    <label>تاريخ العرض<input name="quoteDate" type="date" required /></label>
                    <label class="quote-field-wide">موضوع العرض<input name="subject" placeholder="مثال: توريد وتركيب..." required /></label>
                    <label>المندوب<input name="representative" placeholder="اسم مسؤول العرض" required /></label>
                    <label>مدة التوريد (يوم)<input name="deliveryDays" type="number" min="1" placeholder="30" required /></label>
                    <label>الضمان<input name="warranty" placeholder="مثال: سنة واحدة" /></label>
                    <label class="quote-field-wide">شروط الدفع<input name="paymentTerms" placeholder="مثال: دفعة مقدمة والباقي بعد التسليم" /></label>
                </div>
            </section>
            <section class="quote-step quote-items-step">
                <div class="quote-step-heading"><span>02</span><div><h3>بنود العرض</h3><small>أضف الأصناف والكميات والأسعار</small></div><button class="filter-btn" id="addQuoteItem" type="button">＋ إضافة بند</button></div>
                <div class="quote-table-wrap"><table class="quote-table"><thead><tr><th>الصنف المسجل</th><th>الوحدة</th><th>الكمية</th><th>سعر البيع</th><th>الإجمالي</th><th><span class="visually-hidden">حذف</span></th></tr></thead><tbody id="quoteItems"></tbody></table></div>
                <div class="quote-bottom-row">
                    <p class="quote-note">الأسعار بالريال السعودي، وتُحتسب الضريبة تلقائيًا.</p>
                    <dl class="quote-totals"><div><dt>المجموع قبل الضريبة</dt><dd id="quoteSubtotal">0.00 ر.س</dd></div><div><dt>ضريبة القيمة المضافة (15%)</dt><dd id="quoteTax">0.00 ر.س</dd></div><div class="quote-grand-total"><dt>الإجمالي شامل الضريبة</dt><dd id="quoteTotal">0.00 ر.س</dd></div></dl>
                </div>
                <div class="quote-form-footer"><span class="quote-save-message" id="quoteSaveMessage">المسودة تحفظ على هذا الجهاز</span><button class="primary-btn" id="saveQuote" type="submit">حفظ المسودة</button></div>
            </section>
        </form>
        <section class="saved-quotes"><div class="quote-saved-heading"><h3>العروض المحفوظة</h3><span id="quoteCount">0 عرض</span></div><div id="savedQuotesList" class="saved-quotes-list"></div></section>
    </div>`;
    workspacePanel.hidden = false;
    workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const quoteForm = workspaceContent.querySelector('#quoteForm');
    const quoteItems = workspaceContent.querySelector('#quoteItems');
    const quotes = getSavedQuotes();
    const clients = getSectionRecords('clients');
    let editingQuoteId = null;
    const currency = (amount) => `${Number(amount || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
    const localDate = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    clients.forEach((client) => {
        const option = document.createElement('option');
        option.value = client.values?.[0] || '';
        if (option.value) workspaceContent.querySelector('#quoteClients').append(option);
    });

    const updateQuoteTotals = () => {
        let subtotal = 0;
        quoteItems.querySelectorAll('tr').forEach((row) => {
            const quantity = Number(row.querySelector('[name="quantity"]').value) || 0;
            const price = Number(row.querySelector('[name="price"]').value) || 0;
            const lineTotal = quantity * price;
            subtotal += lineTotal;
            row.querySelector('.quote-line-total').textContent = currency(lineTotal);
        });
        const tax = subtotal * 0.15;
        workspaceContent.querySelector('#quoteSubtotal').textContent = currency(subtotal);
        workspaceContent.querySelector('#quoteTax').textContent = currency(tax);
        workspaceContent.querySelector('#quoteTotal').textContent = currency(subtotal + tax);
        return { subtotal, tax, total: subtotal + tax };
    };

    const addQuoteItem = (item = {}) => {
        const row = document.createElement('tr');
        const itemCell = document.createElement('td');
        const itemInput = document.createElement('input');
        itemInput.name = 'itemName';
        itemInput.placeholder = 'اسم الصنف أو الخدمة';
        itemInput.value = item.name || '';
        itemInput.required = true;
        itemCell.append(itemInput);

        const unitCell = document.createElement('td');
        const unitSelect = document.createElement('select');
        unitSelect.name = 'unit';
        ['قطعة', 'خدمة', 'ساعة', 'متر', 'مجموعة'].forEach((unit) => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitSelect.append(option);
        });
        unitSelect.value = item.unit || 'قطعة';
        unitCell.append(unitSelect);

        const quantityCell = document.createElement('td');
        const quantityInput = document.createElement('input');
        quantityInput.name = 'quantity';
        quantityInput.type = 'number';
        quantityInput.min = '0.01';
        quantityInput.step = 'any';
        quantityInput.placeholder = '1';
        quantityInput.value = item.quantity ?? '1';
        quantityInput.required = true;
        quantityCell.append(quantityInput);

        const priceCell = document.createElement('td');
        const priceInput = document.createElement('input');
        priceInput.name = 'price';
        priceInput.type = 'number';
        priceInput.min = '0';
        priceInput.step = 'any';
        priceInput.placeholder = '0.00';
        priceInput.value = item.price ?? '';
        priceInput.required = true;
        priceCell.append(priceInput);

        const totalCell = document.createElement('td');
        totalCell.className = 'quote-line-total';
        totalCell.textContent = currency((Number(item.quantity) || 0) * (Number(item.price) || 0));
        const actionCell = document.createElement('td');
        const removeButton = document.createElement('button');
        removeButton.className = 'quote-remove-item';
        removeButton.type = 'button';
        removeButton.setAttribute('aria-label', 'حذف البند');
        removeButton.title = 'حذف البند';
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => {
            if (quoteItems.children.length > 1) row.remove();
            else {
                itemInput.value = '';
                quantityInput.value = '1';
                priceInput.value = '';
            }
            updateQuoteTotals();
        });
        actionCell.append(removeButton);
        row.append(itemCell, unitCell, quantityCell, priceCell, totalCell, actionCell);
        row.querySelectorAll('input, select').forEach((input) => input.addEventListener('input', updateQuoteTotals));
        quoteItems.append(row);
        updateQuoteTotals();
    };

    const renderSavedQuotes = () => {
        const list = workspaceContent.querySelector('#savedQuotesList');
        list.replaceChildren();
        workspaceContent.querySelector('#quoteCount').textContent = `${quotes.length} عرض`;
        if (!quotes.length) {
            const empty = document.createElement('p');
            empty.className = 'saved-quotes-empty';
            empty.textContent = 'لا توجد عروض محفوظة بعد.';
            list.append(empty);
            return;
        }
        quotes.forEach((quote) => {
            const button = document.createElement('button');
            button.className = 'saved-quote';
            button.type = 'button';
            const title = document.createElement('strong');
            title.textContent = quote.customer || 'عميل';
            const detail = document.createElement('span');
            detail.textContent = `${quote.subject} · ${quote.quoteDate} · ${currency(quote.total)}`;
            button.append(title, detail);
            button.addEventListener('click', () => {
                Object.entries(quote.details).forEach(([name, value]) => {
                    const field = quoteForm.elements.namedItem(name);
                    if (field) field.value = value;
                });
                quoteItems.replaceChildren();
                quote.items.forEach((item) => addQuoteItem(item));
                editingQuoteId = quote.id;
                workspaceContent.querySelector('#quoteStatus').textContent = 'تعديل مسودة محفوظة';
                workspaceContent.querySelector('#saveQuote').textContent = 'حفظ التغييرات';
                updateQuoteTotals();
                quoteForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            list.append(button);
        });
    };

    quoteForm.elements.namedItem('quoteDate').value = localDate();
    try {
        const sessionUser = JSON.parse(sessionStorage.getItem('idh-session-user') || 'null');
        quoteForm.elements.namedItem('representative').value = sessionUser?.username || 'ENGFT';
    } catch (error) {
        quoteForm.elements.namedItem('representative').value = 'ENGFT';
    }
    addQuoteItem();
    renderSavedQuotes();
    workspaceContent.querySelector('#addQuoteItem').addEventListener('click', () => addQuoteItem());
    workspaceContent.querySelector('#newQuote').addEventListener('click', () => {
        quoteForm.reset();
        quoteItems.replaceChildren();
        addQuoteItem();
        quoteForm.elements.namedItem('quoteDate').value = localDate();
        workspaceContent.querySelector('#quoteSaveMessage').textContent = 'المسودة تحفظ على هذا الجهاز';
        editingQuoteId = null;
        workspaceContent.querySelector('#quoteStatus').textContent = 'مسودة جديدة';
        workspaceContent.querySelector('#saveQuote').textContent = 'حفظ المسودة';
        try {
            const sessionUser = JSON.parse(sessionStorage.getItem('idh-session-user') || 'null');
            quoteForm.elements.namedItem('representative').value = sessionUser?.username || 'ENGFT';
        } catch (error) {
            quoteForm.elements.namedItem('representative').value = 'ENGFT';
        }
        quoteForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    quoteForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const items = [...quoteItems.querySelectorAll('tr')].map((row) => ({
            name: row.querySelector('[name="itemName"]').value.trim(),
            unit: row.querySelector('[name="unit"]').value,
            quantity: Number(row.querySelector('[name="quantity"]').value),
            price: Number(row.querySelector('[name="price"]').value)
        }));
        if (!items.length || items.some((item) => !item.name || !item.quantity || item.price < 0)) return showToast('أكمل بيانات بند واحد على الأقل');
        const totals = updateQuoteTotals();
        const detailFields = ['customer', 'orderType', 'quoteDate', 'subject', 'representative', 'deliveryDays', 'warranty', 'paymentTerms'];
        const details = Object.fromEntries(detailFields.map((name) => [name, quoteForm.elements.namedItem(name).value]));
        const existingIndex = quotes.findIndex((quote) => quote.id === editingQuoteId);
        const quote = { id: editingQuoteId || `quote-${Date.now()}`, details, ...details, items, ...totals, updatedAt: new Date().toISOString() };
        if (existingIndex >= 0) quotes[existingIndex] = quote;
        else quotes.unshift(quote);
        localStorage.setItem('idh-quotes', JSON.stringify(quotes));
        editingQuoteId = quote.id;
        workspaceContent.querySelector('#quoteStatus').textContent = 'مسودة محفوظة';
        workspaceContent.querySelector('#saveQuote').textContent = 'حفظ التغييرات';
        workspaceContent.querySelector('#quoteSaveMessage').textContent = 'تم حفظ المسودة على هذا الجهاز';
        renderSavedQuotes();
        showToast('تم حفظ عرض السعر بنجاح');
    });
}

function openDataCenter() {
    workspaceTitle.textContent = 'مركز تخزين البيانات';
    document.getElementById('workspaceSubtitle').textContent = 'استعراض وبحث وطباعة السجلات المحلية وبيانات الموظفين';
    workspaceContent.innerHTML = `<section class="data-center-view">
        <div class="data-center-toolbar">
            <label class="data-center-filter">نوع البيانات<select id="dataCenterType" aria-label="نوع البيانات"><option value="all">كل البيانات</option><option value="quotes">عروض الأسعار</option></select></label>
            <label class="data-center-search">بحث<input id="dataCenterSearch" type="search" placeholder="ابحث في السجلات" /></label>
            <div class="data-center-actions"><button class="filter-btn" id="refreshDataCenter" type="button">↻ تحديث</button><button class="primary-btn" id="printDataCenter" type="button">▣ طباعة</button></div>
        </div>
        <div class="data-center-summary"><strong id="dataCenterCount">0 سجل</strong><span>المصدر: بيانات المتصفح وGoogle Sheets</span></div>
        <div class="data-center-table-wrap"><table class="data-center-table"><thead><tr><th>نوع السجل</th><th>العنوان</th><th>التاريخ</th><th>التفاصيل</th><th>القيمة</th></tr></thead><tbody id="dataCenterRows"></tbody></table></div>
        <p class="data-center-empty" id="dataCenterEmpty" hidden>لا توجد سجلات مطابقة. احفظ سجلات أو عروض أسعار أولًا.</p>
    </section>`;
    workspacePanel.hidden = false;
    workspacePanel.classList.add('data-center-print');
    workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const typeSelect = workspaceContent.querySelector('#dataCenterType');
    const searchField = workspaceContent.querySelector('#dataCenterSearch');
    let sheetEmployees = [];
    const collectRecords = () => {
        const quotes = getSavedQuotes().map((quote) => ({
            type: 'عرض سعر',
            typeKey: 'quotes',
            title: quote.customer || 'عميل غير محدد',
            date: quote.quoteDate || quote.updatedAt,
            details: [quote.subject, ...(quote.items || []).map((item) => `${item.name}، ${item.quantity} ${item.unit} × ${item.price}`)].filter(Boolean).join(' · '),
            amount: Number(quote.total) || 0
        }));
        const sectionRecords = Object.entries(workspaceSections)
            .filter(([key]) => key !== 'users')
            .flatMap(([key, section]) => getSectionRecords(key).map((record) => {
                const values = Array.isArray(record.values) ? record.values : [];
                const title = values[0] || section.title;
                const details = values.slice(1).map((value, index) => {
                    const field = section.fields[index + 1];
                    const label = typeof field === 'string' ? field : field?.label;
                    return `${label || 'تفصيل'}: ${value}`;
                }).join(' · ');
                return {
                    type: section.title,
                    typeKey: key,
                    title,
                    date: record.updatedAt || record.createdAt,
                    details,
                    amount: null
                };
            }));
        const employeeRecords = sheetEmployees.map((employee) => ({
            type: 'موظف',
            typeKey: 'employees',
            title: employee.name,
            date: employee.startDate,
            details: [employee.department, employee.position, employee.phone, employee.email, employee.status].filter(Boolean).join(' · '),
            amount: null
        }));
        return [...quotes, ...sectionRecords, ...employeeRecords];
    };
    const renderRecords = () => {
        const selectedType = typeSelect.value;
        const term = searchField.value.trim().toLocaleLowerCase();
        const records = collectRecords().filter((record) => {
            const matchesType = selectedType === 'all' || record.typeKey === selectedType;
            const searchable = `${record.type} ${record.title} ${record.date || ''} ${record.details}`.toLocaleLowerCase();
            return matchesType && (!term || searchable.includes(term));
        });
        const rows = workspaceContent.querySelector('#dataCenterRows');
        rows.replaceChildren();
        workspaceContent.querySelector('#dataCenterCount').textContent = `${records.length} سجل`;
        workspaceContent.querySelector('#dataCenterEmpty').hidden = records.length > 0;
        records.forEach((record) => {
            const row = document.createElement('tr');
            const values = [record.type, record.title, record.date ? new Date(record.date).toLocaleDateString('ar-SA') : '—', record.details || '—', record.amount === null ? '—' : `${record.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`];
            values.forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            });
            rows.append(row);
        });
    };

    typeSelect.querySelector('option[value="quotes"]').textContent = 'عروض الأسعار';
    Object.entries(workspaceSections).forEach(([key, section]) => {
        if (key === 'users') return;
        const option = document.createElement('option');
        option.value = key;
        option.textContent = section.title;
        typeSelect.append(option);
    });
    typeSelect.addEventListener('change', renderRecords);
    searchField.addEventListener('input', renderRecords);
    workspaceContent.querySelector('#refreshDataCenter').addEventListener('click', () => {
        renderRecords();
        if (sessionStorage.getItem('idh-api-token') && (userHasPermission(activeAccount, 'employees') || userHasPermission(activeAccount, 'dataCenter'))) {
            apiRequest('/api/employees').then((result) => {
                sheetEmployees = result.employees || [];
                renderRecords();
            }).catch(() => showToast('تعذر تحديث بيانات الموظفين من Google Sheets'));
        }
        showToast('تم تحديث السجلات المحفوظة');
    });
    workspaceContent.querySelector('#printDataCenter').addEventListener('click', () => window.print());
    renderRecords();
    if (sessionStorage.getItem('idh-api-token') && (userHasPermission(activeAccount, 'employees') || userHasPermission(activeAccount, 'dataCenter'))) {
        apiRequest('/api/employees').then((result) => {
            sheetEmployees = result.employees || [];
            renderRecords();
        }).catch(() => { });
    }
}

function openEmployeeWorkspace() {
    workspaceTitle.textContent = 'إدارة الموظفين';
    document.getElementById('workspaceSubtitle').textContent = 'حفظ بيانات الموظفين واستعراضها من Google Sheets';
    workspaceContent.innerHTML = `<section class="employee-workspace">
        <form class="employee-form" id="employeeForm">
            <label>اسم الموظف<input name="name" autocomplete="name" required /></label>
            <label>القسم<input name="department" required /></label>
            <label>المسمى الوظيفي<input name="position" required /></label>
            <label>رقم الهاتف<input name="phone" type="tel" autocomplete="tel" /></label>
            <label>البريد الإلكتروني<input name="email" type="email" autocomplete="email" /></label>
            <label>تاريخ المباشرة<input name="startDate" type="date" required /></label>
            <label>الحالة الوظيفية<select name="status"><option>نشط</option><option>إجازة</option><option>متوقف</option></select></label>
            <div class="employee-form-footer"><span id="employeeMessage" role="status">تُحفظ البيانات في ورقة Employees.</span><button class="primary-btn" type="submit">حفظ الموظف</button></div>
        </form>
        <div class="employee-list-heading"><h3>سجل الموظفين</h3><button class="filter-btn" id="refreshEmployees" type="button">↻ تحديث</button></div>
        <div class="employee-table-wrap"><table class="employee-table"><thead><tr><th>رقم الموظف</th><th>الاسم</th><th>القسم</th><th>المسمى الوظيفي</th><th>الهاتف</th><th>البريد الإلكتروني</th><th>تاريخ المباشرة</th><th>الحالة</th></tr></thead><tbody id="employeeRows"></tbody></table></div>
    </section>`;
    workspacePanel.hidden = false;
    workspacePanel.classList.remove('data-center-print');
    workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const form = workspaceContent.querySelector('#employeeForm');
    const message = workspaceContent.querySelector('#employeeMessage');
    const submitButton = form.querySelector('button[type="submit"]');
    const renderEmployees = (employees) => {
        const rows = workspaceContent.querySelector('#employeeRows');
        rows.replaceChildren();
        employees.forEach((employee) => {
            const row = document.createElement('tr');
            [employee.id, employee.name, employee.department, employee.position, employee.phone, employee.email, employee.startDate, employee.status].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '—';
                row.append(cell);
            });
            rows.append(row);
        });
        if (!employees.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 8;
            cell.textContent = 'لا توجد بيانات موظفين محفوظة.';
            row.append(cell);
            rows.append(row);
        }
    };
    const loadEmployees = async () => {
        message.textContent = 'جارٍ تحميل البيانات من Google Sheets...';
        try {
            const result = await apiRequest('/api/employees');
            const employees = result.employees || [];
            renderEmployees(employees);
            message.textContent = `تم تحميل ${employees.length} موظف من Google Sheets.`;
        } catch (error) {
            renderEmployees([]);
            message.textContent = error.message || 'تعذر الاتصال بـ Google Sheets.';
        }
    };

    form.elements.namedItem('startDate').value = new Date().toLocaleDateString('en-CA');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        message.textContent = 'جارٍ حفظ بيانات الموظف...';
        const employee = Object.fromEntries(new FormData(form).entries());
        try {
            await apiRequest('/api/employees', { method: 'POST', body: JSON.stringify(employee) });
            form.reset();
            form.elements.namedItem('startDate').value = new Date().toLocaleDateString('en-CA');
            message.textContent = 'تم حفظ بيانات الموظف في Google Sheets.';
            showToast('تم حفظ الموظف بنجاح');
            await loadEmployees();
        } catch (error) {
            message.textContent = error.message || 'تعذر حفظ بيانات الموظف.';
            showToast('لم يتم حفظ الموظف');
        } finally {
            submitButton.disabled = false;
        }
    });
    workspaceContent.querySelector('#refreshEmployees').addEventListener('click', loadEmployees);
    loadEmployees();
}

function openWorkspace(sectionKey) {
    workspacePanel.classList.toggle('data-center-print', sectionKey === 'dataCenter');
    if (sectionKey === 'dataCenter') {
        openDataCenter();
        return;
    }
    if (sectionKey === 'employees') {
        openEmployeeWorkspace();
        return;
    }
    const section = workspaceSections[sectionKey];
    if (!section) return;
    if (sectionKey === 'offers') {
        openQuoteWorkspace();
        return;
    }
    workspaceTitle.textContent = section.title;
    document.getElementById('workspaceSubtitle').textContent = section.subtitle;
    const filterButton = section.dateFilter ? '<button class="filter-btn" data-workspace-action="filter">⌕ تصفية بالتاريخ</button>' : '';
    const permissionOptions = Object.entries(assignablePermissions).map(([key, label]) => `<label class="user-permission-option"><input type="checkbox" name="permissions" value="${key}" /><span>${label}</span></label>`).join('');
    const userForm = `<form class="workspace-form user-create-form" id="userCreateForm"><label>اسم المستخدم<input type="text" name="username" autocomplete="username" placeholder="مثال: ahmed.user" required /></label><label>كلمة المرور<input type="password" name="password" autocomplete="new-password" minlength="12" placeholder="12 حرفًا على الأقل" required /></label><label>تأكيد كلمة المرور<input type="password" name="confirmation" autocomplete="new-password" minlength="12" placeholder="أعد كتابة كلمة المرور" required /></label><label>الدور الوظيفي<select name="role"><option value="hr">مسؤول الموارد البشرية</option><option value="projectManager">مدير المشاريع</option><option value="accountant">المحاسب</option><option value="custom">صلاحيات مخصصة</option><option value="admin">مدير النظام</option></select></label><fieldset class="user-permission-picker"><legend>الأقسام المسموح بها</legend><div class="user-permission-options">${permissionOptions}<label class="user-permission-option full-access-option"><input type="checkbox" name="permissions" value="*" /><span>كامل صلاحيات النظام</span></label></div></fieldset><div class="workspace-form-footer"><button class="primary-btn" type="submit">حفظ حساب المستخدم</button><span class="permission-note">كلمات المرور تُحفظ مشفرة على الخادم.</span></div></form>`;
    const standardForm = `<form class="workspace-form" id="sectionForm">${section.fields.map((field, index) => { const item = typeof field === 'string' ? { label: field, type: 'text' } : field; return `<label>${item.label}<input type="${item.type}" name="field${index}" placeholder="${item.type === 'date' ? '' : `أدخل ${item.label}`}" required /></label>`; }).join('')}<div class="workspace-form-footer"><button class="primary-btn" type="submit">حفظ التغييرات</button><span class="permission-note">ENGFT · مدير النظام · كامل الصلاحيات</span></div></form>`;
    workspaceContent.innerHTML = `<div class="workspace-actions"><button class="primary-btn" data-workspace-action="add">＋ إضافة جديد</button><button class="filter-btn" data-workspace-action="edit">✎ تعديل المحدد</button><button class="filter-btn" data-workspace-action="delete">⌫ حذف المحدد</button>${filterButton}<button class="filter-btn" data-workspace-action="export">⇩ تصدير القسم</button></div>${sectionKey === 'users' ? userForm : standardForm}<div class="workspace-list"><b>${sectionKey === 'users' ? 'الحسابات الحالية' : 'آخر السجلات'}</b><span class="workspace-message">${sectionKey === 'users' ? 'جارٍ تحميل الحسابات...' : 'لا توجد سجلات محفوظة في هذا القسم.'}</span><div class="workspace-records" role="list"></div></div>`;
    workspacePanel.hidden = false;
    workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const standardFormElement = workspaceContent.querySelector('#sectionForm');
    const sectionRecords = getSectionRecords(sectionKey);
    let selectedRecordIndex = -1;
    let editingRecordIndex = -1;
    const renderRecords = (visibleRecords = sectionRecords) => {
        const recordsContainer = workspaceContent.querySelector('.workspace-records');
        const message = workspaceContent.querySelector('.workspace-message');
        recordsContainer.replaceChildren();
        message.textContent = visibleRecords.length
            ? `المعروض ${visibleRecords.length} من ${sectionRecords.length} سجل.`
            : sectionRecords.length ? 'لا توجد نتائج مطابقة.' : 'لا توجد سجلات محفوظة في هذا القسم.';
        visibleRecords.forEach((record) => {
            const recordIndex = sectionRecords.indexOf(record);
            const recordButton = document.createElement('button');
            recordButton.className = 'workspace-record';
            recordButton.type = 'button';
            recordButton.setAttribute('role', 'listitem');
            recordButton.setAttribute('aria-pressed', String(selectedRecordIndex === recordIndex));
            recordButton.classList.toggle('selected', selectedRecordIndex === recordIndex);
            recordButton.textContent = record.values.map((value, index) => `${section.fields[index].label || section.fields[index]}: ${value}`).join(' · ');
            recordButton.addEventListener('click', () => {
                selectedRecordIndex = recordIndex;
                renderRecords(visibleRecords);
            });
            recordsContainer.append(recordButton);
        });
    };
    if (sectionKey !== 'users') renderRecords();
    if (standardFormElement) standardFormElement.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = [...standardFormElement.querySelectorAll('input')].map((input) => input.value.trim());
        const record = { values, updatedAt: new Date().toISOString() };
        if (editingRecordIndex >= 0) {
            sectionRecords[editingRecordIndex] = record;
            selectedRecordIndex = editingRecordIndex;
        } else {
            sectionRecords.unshift(record);
            selectedRecordIndex = 0;
        }
        saveSectionRecords(sectionKey, sectionRecords);
        editingRecordIndex = -1;
        renderRecords();
        showToast(`تم حفظ السجل في ${section.title}`);
    });
    const userFormElement = workspaceContent.querySelector('#userCreateForm');
    if (userFormElement) {
        const roleSelect = userFormElement.elements.namedItem('role');
        const permissionChecks = [...userFormElement.querySelectorAll('input[name="permissions"]')];
        const fullPermissionCheck = permissionChecks.find((input) => input.value === '*');
        const sectionPermissionChecks = permissionChecks.filter((input) => input.value !== '*');
        const applyRolePreset = (roleKey) => {
            const permissions = rolePresets[roleKey]?.permissions || [];
            permissionChecks.forEach((input) => {
                input.checked = permissions.includes(input.value);
                if (input.value !== '*') input.disabled = permissions.includes('*');
            });
        };
        const renderUserAccounts = (users) => {
            const container = workspaceContent.querySelector('.workspace-records');
            container.replaceChildren();
            users.forEach((user) => {
                const item = document.createElement('div');
                item.className = 'user-account-row';
                const identity = document.createElement('strong');
                identity.textContent = `${user.username} · ${user.role}`;
                const granted = document.createElement('span');
                const userPermissions = getPermissionKeys(user.permissions);
                granted.textContent = userPermissions.includes('*')
                    ? 'كامل الصلاحيات'
                    : userPermissions.map((permission) => assignablePermissions[permission]).filter(Boolean).join('، ') || 'بدون صلاحيات';
                item.append(identity, granted);
                container.append(item);
            });
            workspaceContent.querySelector('.workspace-message').textContent = users.length
                ? `عدد الحسابات: ${users.length}`
                : 'لا توجد حسابات أخرى.';
        };
        const loadUserAccounts = async () => {
            try {
                const users = await apiRequest('/api/users');
                renderUserAccounts(users);
            } catch (error) {
                workspaceContent.querySelector('.workspace-message').textContent = error.message || 'تعذر تحميل الحسابات. شغّل الخادم وسجّل الدخول كمدير.';
            }
        };

        roleSelect.addEventListener('change', () => applyRolePreset(roleSelect.value));
        permissionChecks.forEach((input) => input.addEventListener('change', () => {
            if (input.value === '*') {
                sectionPermissionChecks.forEach((sectionInput) => {
                    sectionInput.checked = false;
                    sectionInput.disabled = input.checked;
                });
                roleSelect.value = input.checked ? 'admin' : 'custom';
            } else {
                fullPermissionCheck.checked = false;
                sectionPermissionChecks.forEach((sectionInput) => { sectionInput.disabled = false; });
                roleSelect.value = 'custom';
            }
        }));
        applyRolePreset(roleSelect.value);
        userFormElement.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(userFormElement);
            const username = formData.get('username').trim();
            const password = formData.get('password');
            const confirmation = formData.get('confirmation');
            const selectedPermissions = permissionChecks.filter((input) => input.checked).map((input) => input.value);
            const role = rolePresets[roleSelect.value]?.label || rolePresets.custom.label;
            const message = workspaceContent.querySelector('.workspace-message');
            if (password !== confirmation) return showToast('كلمتا المرور غير متطابقتين');
            if (!selectedPermissions.length) return showToast('اختر قسمًا واحدًا على الأقل');
            try {
                const createdUser = await apiRequest('/api/users', { method: 'POST', body: JSON.stringify({ username, password, role, permissions: selectedPermissions }) });
                userFormElement.reset();
                roleSelect.value = 'hr';
                applyRolePreset('hr');
                message.textContent = `تم إنشاء حساب ${createdUser.username} بدور ${createdUser.role}.`;
                showToast(`تم إنشاء حساب ${createdUser.username} بنجاح`);
                await loadUserAccounts();
            } catch (error) {
                message.textContent = error.message || 'تعذر إنشاء الحساب. تأكد من تشغيل الخادم.';
                showToast(error.message || 'تعذر إنشاء الحساب');
            }
        });
        loadUserAccounts();
    }
    workspaceContent.querySelectorAll('[data-workspace-action]').forEach((button) => button.addEventListener('click', async () => {
        const actionNames = { add: 'إضافة سجل جديد', edit: 'تعديل السجل المحدد', delete: 'حذف السجل المحدد', filter: 'تصفية البيانات بالتاريخ', export: 'تصدير بيانات القسم' };
        if (sectionKey === 'users' && button.dataset.workspaceAction === 'add') {
            workspaceContent.querySelector('#userCreateForm input[name="username"]').focus();
            showToast('استخدم نموذج إنشاء الحساب الجديد');
            return;
        }
        if (sectionKey !== 'users' && button.dataset.workspaceAction === 'add') {
            editingRecordIndex = -1;
            standardFormElement.reset();
            standardFormElement.querySelector('input').focus();
            showToast('أدخل بيانات السجل الجديد ثم احفظه');
            return;
        }
        if (sectionKey !== 'users' && button.dataset.workspaceAction === 'edit') {
            if (selectedRecordIndex < 0) return showToast('اختر سجلًا من القائمة أولًا');
            editingRecordIndex = selectedRecordIndex;
            sectionRecords[selectedRecordIndex].values.forEach((value, index) => {
                standardFormElement.querySelector(`[name="field${index}"]`).value = value;
            });
            standardFormElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            standardFormElement.querySelector('input').focus({ preventScroll: true });
            showToast('عدّل البيانات ثم احفظ التغييرات');
            return;
        }
        if (sectionKey !== 'users' && button.dataset.workspaceAction === 'delete') {
            if (selectedRecordIndex < 0) return showToast('اختر سجلًا من القائمة أولًا');
            if (!window.confirm('هل تريد حذف السجل المحدد؟')) return;
            sectionRecords.splice(selectedRecordIndex, 1);
            saveSectionRecords(sectionKey, sectionRecords);
            selectedRecordIndex = -1;
            renderRecords();
            showToast('تم حذف السجل المحدد');
            return;
        }
        if (sectionKey !== 'users' && button.dataset.workspaceAction === 'export') {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([JSON.stringify(sectionRecords, null, 2)], { type: 'application/json' }));
            link.download = `idh-${sectionKey}-export.json`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('تم تصدير سجلات القسم');
            return;
        }
        if (button.dataset.workspaceAction === 'filter') {
            const dateIndexes = section.fields.reduce((indexes, field, index) => {
                if (typeof field !== 'string' && field.type === 'date') indexes.push(index);
                return indexes;
            }, []);
            const dates = dateIndexes.map((index) => standardFormElement.querySelector(`[name="field${index}"]`).value).filter(Boolean);
            if (!dates.length) return showToast('أدخل تاريخًا واحدًا على الأقل في النموذج للتصفية');
            const [startDate, endDate] = dates;
            renderRecords(sectionRecords.filter((record) => {
                const recordDate = record.values[dateIndexes[0]];
                return recordDate && recordDate >= startDate && recordDate <= (endDate || startDate);
            }));
            showToast(`تم عرض السجلات المطابقة للتاريخ ${dates.join(' إلى ')}`);
            return;
        }
        showToast(`${actionNames[button.dataset.workspaceAction]} في ${section.title}`);
    }));
}

document.querySelectorAll('.main-nav a').forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        document.querySelectorAll('.main-nav a').forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
        sidebar.classList.remove('open');
        const sectionKey = link.getAttribute('href').slice(1);
        if (sectionKey !== 'dashboard' && !activeAccount) {
            loginScreen.classList.remove('hidden');
            return;
        }
        if (sectionKey !== 'dashboard' && !userHasPermission(activeAccount, sectionPermission[sectionKey])) {
            link.classList.remove('active');
            showToast('ليس لديك صلاحية للوصول إلى هذا القسم');
            return;
        }
        if (sectionKey === 'dashboard') {
            workspacePanel.hidden = true;
            document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        openWorkspace(sectionKey);
    });
});

document.getElementById('closeWorkspace').addEventListener('click', () => {
    workspacePanel.hidden = true;
    workspacePanel.classList.remove('data-center-print');
    showToast('تم إغلاق مساحة الإدارة');
});

document.querySelector('.hero-banner').addEventListener('click', () => showToast('لوحة منظمة I D H جاهزة للمتابعة'));
document.getElementById('notificationBtn').addEventListener('click', () => showToast('لديك 3 إشعارات جديدة'));
document.querySelector('.support-card button').addEventListener('click', () => showToast('سيتواصل معك فريق الدعم قريباً'));

document.getElementById('addRecord').addEventListener('click', () => {
    const name = window.prompt('اكتب اسم السجل الجديد:');
    if (!name) return;
    const row = document.createElement('tr');
    row.innerHTML = `<td><span class="donor-avatar green-bg">${name.charAt(0)}</span><span class="person">${name}<small>#IDH-NEW</small></span></td><td>سجل جديد</td><td>25 سبتمبر 2026</td><td><span class="payment">إدخال يدوي</span></td><td class="amount">غير محدد</td><td><span class="status pending">قيد المراجعة</span></td>`;
    document.getElementById('transactionsBody').prepend(row);
    showToast(`تمت إضافة السجل: ${name}`);
});

document.getElementById('deleteRecord').addEventListener('click', () => {
    const lastRow = document.querySelector('#transactionsBody tr:last-child');
    if (!lastRow) return showToast('لا توجد سجلات لمسحها');
    const recordName = lastRow.querySelector('.person')?.firstChild?.textContent?.trim() || 'السجل';
    lastRow.remove();
    showToast(`تم مسح ${recordName}`);
});

document.getElementById('sendMessage').addEventListener('click', () => {
    const message = window.prompt('اكتب الرسالة المراد إرسالها:');
    if (message) showToast('تم إرسال الرسالة إلى أعضاء النظام');
});

document.getElementById('inboxButton').addEventListener('click', () => {
    const inbox = document.getElementById('inboxPreview');
    inbox.hidden = !inbox.hidden;
    showToast(inbox.hidden ? 'تم إخفاء الوارد' : 'لديك رسالتان واردتان');
});

document.getElementById('exportData').addEventListener('click', () => {
    const data = { organization: 'I D H الخيرية', exportedBy: 'ENGFT', exportedAt: new Date().toISOString(), transactions: [...document.querySelectorAll('#transactionsBody tr')].map((row) => row.innerText) };
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.download = 'idh-system-export.json';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('تم تصدير بيانات النظام');
});

document.getElementById('clearData').addEventListener('click', () => {
    if (!window.confirm('هل أنت متأكد من إفراغ كل البيانات المحلية؟')) return;
    document.getElementById('transactionsBody').innerHTML = '';
    localStorage.removeItem('idh-system-data');
    localStorage.removeItem('idh-section-records');
    showToast('تم إفراغ البيانات المحلية بالكامل');
});

document.getElementById('editChannels').addEventListener('click', () => {
    const channel = window.prompt('اكتب اسم القناة التي تريد تحديثها:');
    if (channel) showToast(`تم فتح إعدادات قناة ${channel}`);
});

document.getElementById('composeEmail').addEventListener('click', () => {
    const recipient = window.prompt('اكتب البريد الإلكتروني للمستلم:');
    if (!recipient) return;
    window.location.href = `mailto:${recipient}`;
});

document.getElementById('openEmail').addEventListener('click', () => {
    window.location.href = 'mailto:itis@mydutyto.help';
});

document.getElementById('filterBtn').addEventListener('click', () => {
    const status = window.prompt('اكتب الحالة للتصفية: مكتمل أو قيد المراجعة');
    if (!status) return;
    transactionRows.forEach((row) => {
        row.hidden = !row.textContent.includes(status);
    });
    showToast(`تمت تصفية السجلات حسب: ${status}`);
});

searchInput.addEventListener('input', (event) => {
    const term = event.target.value.trim().toLowerCase();
    transactionRows.forEach((row) => {
        row.hidden = term && !row.textContent.toLowerCase().includes(term);
    });
});

document.querySelectorAll('.date-button').forEach((button) => button.addEventListener('click', () => showToast('التاريخ الحالي: 25 سبتمبر 2026')));
