window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初期設定 & グローバル変数 ---
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 2. DOM要素 ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessageDiv = document.getElementById('error-message');
    const getCodeBtn = document.getElementById('get-code-btn');
    const verifyCommentBtn = document.getElementById('verify-comment-btn');
    const codeDisplay = document.getElementById('verification-code');
    const usernameInput = document.getElementById('username-input');

    let currentUsername = '';
    let currentCode = '';

    // --- 3. UI操作関数 ---
    function showLoading(show) { loadingOverlay.classList.toggle('hidden', !show); }
    function showMessage(message, isError = true) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.toggle('hidden', !message);
        errorMessageDiv.style.color = isError ? '#f44336' : '#4caf50';
    }

    // --- 4. イベントリスナー ---
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

    // --- 5. 認証成功時の処理 ---
    async function handleSuccessfulLogin(scratchUser) {
        // ▼▼▼ scid (Scratchユーザー名) で既存ユーザーを検索 ▼▼▼
        const { data: existingUser } = await supabase.from('user').select('*').eq('scid', scratchUser.name).single();
        let finalUser = existingUser;
        
        if (!existingUser) {
            const newUserId = await generateUniqueUserId();
            const newUserPayload = {
                id: newUserId,
                name: scratchUser.name, // NyaXの初期表示名もScratchユーザー名に
                scid: scratchUser.name, // scidにScratchのユーザー名を保存
                settings: { show_like: true, show_follow: true, show_follower: true, show_star: true, show_scid: true }
            };
            const { data: createdUser, error } = await supabase.from('user').insert(newUserPayload).select().single();
            if(error) throw error;
            finalUser = createdUser;
        }
        
        localStorage.setItem('nyaxUserId', finalUser.id);
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
});
