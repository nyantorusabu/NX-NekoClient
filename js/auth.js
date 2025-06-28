// js/auth.js
import { supabase } from './api.js';
import { setCurrentUser, router } from './main.js';

let realtimeChannel = null;
export function subscribeToChanges() {
    if (realtimeChannel) return;
    realtimeChannel = supabase.channel('nyax-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post' }, payload => {
        console.log('Realtime update received:', payload);
        router();
      })
      .subscribe();
}
export function unsubscribeChanges() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

export function goToLoginPage() { window.location.href = 'login.html'; }

export function handleLogout() {
    if (!confirm("ログアウトしますか？")) return;
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    unsubscribeChanges();
    window.location.hash = '#';
    router();
}

export async function checkSession() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
        setCurrentUser(JSON.parse(userJson));
        subscribeToChanges();
    } else {
        setCurrentUser(null);
    }
    await router();
}

// ログインページの処理（login.html専用）
if (document.body.classList.contains('login-page')) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessageDiv = document.getElementById('error-message');
    const getCodeBtn = document.getElementById('get-code-btn');
    const verifyCommentBtn = document.getElementById('verify-comment-btn');
    const codeDisplay = document.getElementById('verification-code');
    const usernameInput = document.getElementById('username-input');

    let currentUsername = ''; let currentCode = '';

    function showLoading(show) { loadingOverlay.classList.toggle('hidden', !show); }
    function showMessage(message, isError = true) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.toggle('hidden', !message);
        errorMessageDiv.style.color = isError ? '#f44336' : '#4caf50';
    }

    getCodeBtn.addEventListener('click', async () => {
        currentUsername = usernameInput.value.trim();
        if (!currentUsername) return showMessage('ユーザー名を入力してください。');
        showMessage('', false); showLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('scratch-auth-handler', { body: { type: 'generateCode' } });
            if (error || !data.code) throw new Error(data?.error || 'コードの取得に失敗しました。');
            currentCode = data.code;
            codeDisplay.textContent = currentCode;
            document.getElementById('auth-step1').classList.add('hidden');
            document.getElementById('auth-step2').classList.remove('hidden');
        } catch (err) { showMessage(err.message); } 
        finally { showLoading(false); }
    });

    verifyCommentBtn.addEventListener('click', async () => {
        showMessage('', false); showLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('scratch-auth-handler', { body: { type: 'verifyComment', username: currentUsername, code: currentCode } });
            if (error || !data.ok) throw new Error(data?.error || '認証に失敗しました。');
            await handleSuccessfulLogin(data.user);
        } catch (err) { showMessage(err.message); }
        finally { showLoading(false); }
    });

    codeDisplay.addEventListener('click', () => {
        navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
            showMessage('認証コードをコピーしました！', false);
            setTimeout(() => showMessage('', false), 2000);
        });
    });

    async function handleSuccessfulLogin(scratchUser) {
        const { data: existingUser } = await supabase.from('user').select('*').eq('scid', String(scratchUser.id)).single();
        let finalUser = existingUser;
        if (!existingUser) {
            const newUserId = await generateUniqueUserId();
            const { data: createdUser, error } = await supabase.from('user').insert({
                id: newUserId, name: scratchUser.name, scid: String(scratchUser.id),
                settings: { show_follow: true, show_star: true, show_like: true, show_scid: true }
            }).select().single();
            if(error) throw error;
            finalUser = createdUser;
        }
        localStorage.setItem('currentUser', JSON.stringify(finalUser));
        window.location.href = 'index.html';
    }

    async function generateUniqueUserId() {
        let userId, isUnique = false;
        while (!isUnique) {
            userId = Math.floor(1000 + Math.random() * 9000);
            const { count } = await supabase.from('user').select('id', { count: 'exact', head: true }).eq('id', userId);
            if (count === 0) isUnique = true;
        }
        return userId;
    }
}