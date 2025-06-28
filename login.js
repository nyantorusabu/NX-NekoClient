const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const errorMessageDiv = document.getElementById('error-message');
const tabs = document.querySelectorAll('.tab-button');
const forms = document.querySelectorAll('.login-form');

// Login buttons
const loginPassBtn = document.getElementById('login-pass-btn');
const getCodeBtn = document.getElementById('get-code-btn');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const redirectBtn = document.getElementById('redirect-btn');

function showLoading(show) { loadingOverlay.classList.toggle('hidden', !show); }
function showMessage(message, isError = true) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.toggle('hidden', !message);
    errorMessageDiv.style.color = isError ? '#f44336' : '#4caf50';
}

// Tab switching logic
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        forms.forEach(form => form.classList.add('hidden'));
        document.getElementById(tab.dataset.tab + '-form').classList.remove('hidden');
    });
});

// Method 1: Password Login
loginPassBtn.addEventListener('click', async () => {
    const username = document.getElementById('username-pass').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) return showMessage('ユーザー名とパスワードを入力してください。');
    
    showMessage('', false); showLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('scratch-auth-handler', {
            body: { type: 'password', username, password }
        });
        if (error || data.error) throw new Error(data.error || 'ログインに失敗しました。');
        await handleSuccessfulLogin(data.user);
    } catch (err) {
        showMessage(err.message);
    } finally {
        showLoading(false);
    }
});

// Method 2: Verification Code
let usernameForCode = '';
getCodeBtn.addEventListener('click', async () => {
    usernameForCode = document.getElementById('username-code').value.trim();
    if (!usernameForCode) return showMessage('ユーザー名を入力してください。');
    
    showMessage('', false); showLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('scratch-auth-handler', {
            body: { type: 'getCode', username: usernameForCode }
        });
        if (error || data.error) throw new Error(data.error || 'コードの取得に失敗しました。');
        document.getElementById('verification-code').textContent = data.code;
        document.getElementById('code-step1').classList.add('hidden');
        document.getElementById('code-step2').classList.remove('hidden');
    } catch (err) {
        showMessage(err.message);
    } finally {
        showLoading(false);
    }
});

verifyCodeBtn.addEventListener('click', async () => {
    const code = document.getElementById('verification-code').textContent;
    showMessage('', false); showLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('scratch-auth-handler', {
            body: { type: 'verifyCode', username: usernameForCode, code }
        });
        if (error || data.error) throw new Error(data.error || '認証に失敗しました。');
        await handleSuccessfulLogin(data.user);
    } catch (err) {
        showMessage(err.message);
    } finally {
        showLoading(false);
    }
});

// Method 3: Redirection
redirectBtn.addEventListener('click', () => {
    const SCRATCH_AUTH_URL = "https://auth.itinerary.eu.org/auth/?redirect={REDIRECT_URI}&name={APP_NAME}";
    const redirectUri = window.location.href.split('?')[0].split('#')[0].replace('login.html', 'index.html');
    const authUrl = SCRATCH_AUTH_URL.replace("{REDIRECT_URI}", encodeURIComponent(redirectUri)).replace("{APP_NAME}", "NyaX");
    localStorage.setItem('isLoggingIn', 'true');
    window.location.href = authUrl;
});


// Common success handler
async function handleSuccessfulLogin(scratchUser) {
    const { data: existingUser } = await supabase.from('user').select('*').eq('scid', String(scratchUser.id)).single();
    let finalUser = existingUser;
    
    if (!existingUser) {
        const newUserId = await generateUniqueUserId();
        const { data: createdUser, error } = await supabase.from('user').insert({
            id: newUserId,
            name: scratchUser.name,
            scid: String(scratchUser.id),
            settings: { show_follow: true, show_star: true, show_scid: true }
        }).select().single();
        if(error) throw error;
        finalUser = createdUser;
    }
    
    localStorage.setItem('currentUser', JSON.stringify(finalUser));
    window.location.href = 'index.html';
}

async function generateUniqueUserId() {
    // (main.jsからコピー)
    let userId, isUnique = false;
    while (!isUnique) {
        userId = Math.floor(1000 + Math.random() * 9000);
        const { count } = await supabase.from('user').select('id', { count: 'exact', head: true }).eq('id', userId);
        if (count === 0) isUnique = true;
    }
    return userId;
}