const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { rateLimit } = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';
const database = new Database(path.join(__dirname, 'idh.sqlite'));
const sessions = new Map();
const permissionKeys = new Set(['projects', 'clients', 'employees', 'offers', 'tenders', 'reports', 'dataCenter', 'users', 'settings']);
const sessionIdleTimeoutMs = 30 * 60 * 1000;
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'محاولات تسجيل الدخول كثيرة. حاول بعد 15 دقيقة.' }
});

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use((request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    next();
});
app.get(['/', '/index.html'], (request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.js', (request, response) => response.sendFile(path.join(__dirname, 'app.js')));
app.get('/styles.css', (request, response) => response.sendFile(path.join(__dirname, 'styles.css')));
app.get('/idh-logo.svg', (request, response) => response.sendFile(path.join(__dirname, 'idh-logo.svg')));

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'مستخدم',
    permissions TEXT NOT NULL DEFAULT 'صلاحيات محددة',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const initialAdminUsername = (process.env.INITIAL_ADMIN_USERNAME || 'ENGFTO7').trim();
if (!/^[A-Za-z0-9_.-]{3,32}$/.test(initialAdminUsername)) {
    throw new Error('INITIAL_ADMIN_USERNAME must be 3-32 letters, numbers, dots, underscores, or hyphens.');
}
let admin = database.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(initialAdminUsername);
if (!admin && initialAdminUsername !== 'ENGFT') {
    const legacyAdmin = database.prepare('SELECT id, password_hash FROM users WHERE username = ?').get('ENGFT');
    if (legacyAdmin) {
        database.prepare('UPDATE users SET username = ? WHERE id = ?').run(initialAdminUsername, legacyAdmin.id);
        admin = { ...legacyAdmin, username: initialAdminUsername };
    }
}
const configuredInitialPassword = process.env.INITIAL_ADMIN_PASSWORD;
if (configuredInitialPassword && configuredInitialPassword.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters.');
}
const adminNeedsBootstrap = !admin || bcrypt.compareSync('ENG2026', admin.password_hash);
if (adminNeedsBootstrap) {
    if (process.env.NODE_ENV === 'production' && !configuredInitialPassword) {
        throw new Error('Set INITIAL_ADMIN_PASSWORD before first production startup or before rotating the default admin password.');
    }
    const bootstrapPassword = configuredInitialPassword || crypto.randomBytes(24).toString('base64url');
    if (admin) {
        database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(bootstrapPassword, 12), admin.id);
    } else {
        database.prepare('INSERT INTO users (username, password_hash, role, permissions) VALUES (?, ?, ?, ?)')
            .run(initialAdminUsername, bcrypt.hashSync(bootstrapPassword, 12), 'مدير النظام', 'كامل الصلاحيات');
    }
    if (!configuredInitialPassword) console.warn(`One-time initial password for ${initialAdminUsername}: ${bootstrapPassword}`);
}

function authenticate(request, response, next) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    const session = token && sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        if (token) sessions.delete(token);
        return response.status(401).json({ error: 'انتهت الجلسة. سجّل الدخول مجددًا.' });
    }
    session.expiresAt = Date.now() + sessionIdleTimeoutMs;
    request.user = session;
    request.sessionToken = token;
    next();
}

function audit(username, action) {
    database.prepare('INSERT INTO audit_log (username, action) VALUES (?, ?)').run(username, action);
}

function parsePermissions(value) {
    if (Array.isArray(value)) return value.filter((permission) => permission === '*' || permissionKeys.has(permission));
    if (value === 'كامل الصلاحيات') return ['*'];
    if (typeof value !== 'string' || !value) return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((permission) => permission === '*' || permissionKeys.has(permission));
    } catch (error) {
        const legacyLabels = {
            projects: /مشاريع|projects?/i,
            clients: /عملاء|clients?/i,
            employees: /موظف|موارد بشرية|employees?|\bHR\b/i,
            offers: /عروض|offers?/i,
            tenders: /مناقصات|tenders?/i,
            reports: /تقارير|reports?/i,
            dataCenter: /مركز البيانات|data center/i,
            users: /مستخدمون|users?/i,
            settings: /إعدادات|settings?/i
        };
        return Object.entries(legacyLabels).filter(([, pattern]) => pattern.test(value)).map(([permission]) => permission);
    }
    return [];
}

function hasPermission(user, permission) {
    const permissions = parsePermissions(user.permissions);
    return permissions.includes('*') || permissions.includes(permission);
}

function requirePermission(request, response, permission) {
    if (hasPermission(request.user, permission)) return true;
    response.status(403).json({ error: 'ليس لديك صلاحية للوصول إلى هذا القسم.' });
    return false;
}

async function requestEmployeeSheet(action, employee) {
    const endpoint = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    const secret = process.env.GOOGLE_SHEETS_SHARED_SECRET;
    if (!endpoint || !secret) {
        const error = new Error('Google Sheets غير مهيأة. أضف رابط Apps Script والمفتاح السري إلى إعدادات الخادم.');
        error.status = 503;
        throw error;
    }
    const endpointUrl = new URL(endpoint);
    if (endpointUrl.protocol !== 'https:' || endpointUrl.hostname !== 'script.google.com') {
        const error = new Error('رابط Google Apps Script غير صالح.');
        error.status = 500;
        throw error;
    }
    const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, employee, secret }),
        signal: AbortSignal.timeout(12000)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
        const error = new Error(result.error || 'تعذر الاتصال بجدول Google Sheets.');
        error.status = 502;
        throw error;
    }
    return result;
}

function requireAdmin(request, response) {
    if (hasPermission(request.user, '*')) return true;
    response.status(403).json({ error: 'ليس لديك صلاحية' });
    return false;
}

app.post('/api/login', loginLimiter, (request, response) => {
    const { username, password } = request.body;
    const user = database.prepare('SELECT id, username, password_hash, role, permissions FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) return response.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    const token = crypto.randomBytes(32).toString('hex');
    const account = { id: user.id, username: user.username, role: user.role, permissions: parsePermissions(user.permissions) };
    sessions.set(token, { ...account, expiresAt: Date.now() + sessionIdleTimeoutMs });
    audit(user.username, 'تسجيل الدخول');
    response.json({ token, user: account });
});

app.post('/api/logout', authenticate, (request, response) => {
    sessions.delete(request.sessionToken);
    response.json({ message: 'تم تسجيل الخروج بنجاح' });
});

app.get('/api/users', authenticate, (request, response) => {
    if (!requireAdmin(request, response)) return;
    const users = database.prepare('SELECT id, username, role, permissions, created_at FROM users ORDER BY id DESC').all();
    response.json(users.map((user) => ({ ...user, permissions: parsePermissions(user.permissions) })));
});

app.post('/api/users', authenticate, (request, response) => {
    if (!requireAdmin(request, response)) return;
    const { username, password, role } = request.body;
    const permissions = parsePermissions(request.body.permissions);
    if (!username || !password || password.length < 12) return response.status(400).json({ error: 'اسم المستخدم مطلوب وكلمة المرور يجب أن تتكون من 12 حرفًا على الأقل.' });
    if (!permissions.length) return response.status(400).json({ error: 'اختر صلاحية واحدة على الأقل.' });
    if (permissions.includes('*') && permissions.length > 1) return response.status(400).json({ error: 'لا يمكن الجمع بين صلاحية كاملة وصلاحيات أقسام منفصلة.' });
    try {
        const result = database.prepare('INSERT INTO users (username, password_hash, role, permissions) VALUES (?, ?, ?, ?)')
            .run(username, bcrypt.hashSync(password, 12), role || 'مستخدم', JSON.stringify(permissions));
        audit(request.user.username, `إضافة المستخدم ${username}`);
        response.status(201).json({ id: result.lastInsertRowid, username, role: role || 'مستخدم', permissions });
    } catch (error) {
        response.status(409).json({ error: 'اسم المستخدم مستخدم مسبقًا' });
    }
});

app.get('/api/employees', authenticate, async (request, response) => {
    if (!hasPermission(request.user, 'employees') && !hasPermission(request.user, 'dataCenter')) {
        return response.status(403).json({ error: 'ليس لديك صلاحية لعرض بيانات الموظفين.' });
    }
    try {
        const result = await requestEmployeeSheet('listEmployees');
        response.json({ employees: result.employees || [] });
    } catch (error) {
        response.status(error.status || 502).json({ error: error.message || 'تعذر تحميل بيانات الموظفين' });
    }
});

app.post('/api/employees', authenticate, async (request, response) => {
    if (!requirePermission(request, response, 'employees')) return;
    const { name, department, position, phone, email, startDate, status } = request.body;
    const employeeName = String(name || '').trim();
    const employeeDepartment = String(department || '').trim();
    const employeePosition = String(position || '').trim();
    if (!employeeName || !employeeDepartment || !employeePosition) {
        return response.status(400).json({ error: 'اسم الموظف والقسم والمسمى الوظيفي مطلوبة.' });
    }
    const employee = {
        id: crypto.randomUUID(),
        name: employeeName,
        department: employeeDepartment,
        position: employeePosition,
        phone: String(phone || '').trim(),
        email: String(email || '').trim(),
        startDate: String(startDate || '').trim(),
        status: String(status || 'نشط').trim(),
        createdAt: new Date().toISOString()
    };
    try {
        const result = await requestEmployeeSheet('saveEmployee', employee);
        audit(request.user.username, `إضافة الموظف ${employee.name}`);
        response.status(201).json({ employee: result.employee || employee });
    } catch (error) {
        response.status(error.status || 502).json({ error: error.message || 'تعذر حفظ بيانات الموظف' });
    }
});

app.post('/api/change-password', authenticate, (request, response) => {
    const { currentPassword, newPassword } = request.body;
    const user = database.prepare('SELECT password_hash FROM users WHERE id = ?').get(request.user.id);
    if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) return response.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    if (!newPassword || newPassword.length < 12) return response.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تتكون من 12 حرفًا على الأقل.' });
    database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 12), request.user.id);
    audit(request.user.username, 'تغيير كلمة المرور');
    response.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

app.get('/api/health', (request, response) => response.json({ status: 'ok', database: 'sqlite' }));
app.get('*', (request, response) => {
    if (path.extname(request.path)) return response.status(404).json({ error: 'غير موجود' });
    response.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(port, host, () => console.log(`IDH server listening on ${host}:${port}`));
