// --- 1. 初期設定 & グローバル変数 ---
const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SCRATCH_AUTH_URL = "https://auth.itinerary.eu.org/auth/?redirect={REDIRECT_URI}&name={APP_NAME}";
const APP_NAME = "NyaX";
let currentUser = null;
let realtimeChannel = null;
let currentTimelineTab = 'foryou';

// --- 2. DOM要素 ---
const navMenuTop = document.getElementById('nav-menu-top');
const navMenuBottom = document.getElementById('nav-menu-bottom');
const pageTitle = document.getElementById('page-title');
const screens = document.querySelectorAll('.screen');
const postFormContainer = document.querySelector('.post-form-container');
const timelineDiv = document.getElementById('timeline');
const exploreTimelineDiv = document.getElementById('explore-timeline');
const loadingOverlay = document.getElementById('loading-overlay');
const loginBanner = document.getElementById('login-banner');

// --- 3. 画面管理 & ルーティング ---
function showLoading(show) { loadingOverlay.classList.toggle('hidden', !show); }
function showScreen(screenId) {
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId)?.classList.remove('hidden');
}

async function router() {
    updateNavMenu();
    const hash = window.location.hash || '#';

    showLoading(true);
    try {
        if (hash.startsWith('#profile/')) {
            const userId = parseInt(hash.substring('#profile/'.length), 10);
            if (userId) await showProfileScreen(userId); else window.location.hash = '';
        } else if (hash === '#settings') {
            if (currentUser) await showSettingsScreen(); else window.location.hash = '';
        } else if (hash === '#explore') {
            await showExploreScreen();
        } else {
            await showMainScreen();
        }
    } catch (error) {
        console.error("Routing error:", error);
        // エラーページなどを表示する処理
    } finally {
        showLoading(false);
    }
}

// --- 4. ナビゲーションメニュー管理 ---
function updateNavMenu() {
    const hash = window.location.hash || '#';
    // 上部メニュー
    let topMenuHTML = `
        <a href="#" class="nav-item ${hash === '#' ? 'active' : ''}"><span>ホーム</span></a>
        <a href="#explore" class="nav-item ${hash === '#explore' ? 'active' : ''}"><span>発見</span></a>
    `;
    if (currentUser) {
        topMenuHTML += `
            <a href="#profile/${currentUser.id}" class="nav-item ${hash.startsWith('#profile/') ? 'active' : ''}"><span>プロフィール</span></a>
            <a href="#settings" class="nav-item ${hash === '#settings' ? 'active' : ''}"><span>設定</span></a>
        `;
    }
    navMenuTop.innerHTML = topMenuHTML;

    // 下部アカウントボタン
    let bottomMenuHTML = '';
    if (currentUser) {
        bottomMenuHTML = `<button id="account-button" class="nav-item"><span>${escapeHTML(currentUser.name)}#${currentUser.id}</span></button>`;
    } else {
        bottomMenuHTML = `<button id="login-button" class="nav-item"><span>ログイン</span></button>`;
    }
    navMenuBottom.innerHTML = bottomMenuHTML;
    
    loginBanner.classList.toggle('hidden', !!currentUser);

    // イベントリスナー再設定
    navMenuTop.querySelectorAll('a.nav-item').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = link.getAttribute('href'); });
    });
    navMenuBottom.querySelector('button')?.addEventListener('click', currentUser ? () => { if(confirm("ログアウトしますか？")) handleLogout() } : handleLoginRedirect);
}

// --- 5. 認証 ---
function handleLoginRedirect() {
    // ▼▼▼▼▼ エラー解決のための最重要修正箇所 ▼▼▼▼▼
    const redirectUri = window.location.href.split('?')[0].split('#')[0];
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    const authUrl = SCRATCH_AUTH_URL.replace("{REDIRECT_URI}", encodeURIComponent(redirectUri)).replace("{APP_NAME}", encodeURIComponent(APP_NAME));
    localStorage.setItem('isLoggingIn', 'true');
    window.location.href = authUrl;
}
async function handleAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const privateCode = params.get('privateCode');
    if (localStorage.getItem('isLoggingIn') !== 'true' || !privateCode) {
        localStorage.removeItem('isLoggingIn');
        return;
    }
    
    showLoading(true);
    localStorage.removeItem('isLoggingIn');
    try {
        const { data, error } = await supabase.functions.invoke('scratch-auth-callback', { body: { privateCode } });
        if (error || data.error) throw error || new Error(data.error);
        await findOrCreateUser(data.user);
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        console.error('Auth callback error:', error);
        alert('認証に失敗しました。');
    } finally {
        showLoading(false);
    }
}
async function findOrCreateUser(scratchUser) {
    const scid = String(scratchUser.id);
    let { data: user, error } = await supabase.from('user').select('*').eq('scid', scid).single();

    if (error && error.code !== 'PGRST116') {
        throw new Error('ユーザー情報の取得に失敗しました。');
    }

    if (user) {
        setCurrentUser(user);
    } else {
        const newUserId = await generateUniqueUserId();
        const newUser = {
            id: newUserId,
            name: scratchUser.name,
            scid: scid,
            settings: { show_follow: true, show_star: true, show_scid: true }
        };
        const { data: createdUser, error: createError } = await supabase.from('user').insert(newUser).select().single();
        if (createError) throw new Error('アカウントの作成に失敗しました。');
        setCurrentUser(createdUser);
    }
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
function setCurrentUser(user) {
    currentUser = user;
    if(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        subscribeToChanges();
    } else {
        localStorage.removeItem('currentUser');
    }
}
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
    router();
}
async function checkSession() {
    showLoading(true);
    const userJson = localStorage.getItem('currentUser');
    currentUser = userJson ? JSON.parse(userJson) : null;
    
    if (localStorage.getItem('isLoggingIn')) {
        await handleAuthCallback();
    }
    
    await router();
    showLoading(false);
}

// --- 6. 各画面の表示ロジック ---
async function showMainScreen() {
    pageTitle.textContent = "ホーム";
    showScreen('main-screen');
    if (currentUser) {
        postFormContainer.innerHTML = `<div class="post-form"><textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea><button id="post-submit-button">ポスト</button></div>`;
        postFormContainer.querySelector('#post-submit-button').addEventListener('click', handlePostSubmit);
    } else {
        postFormContainer.innerHTML = '';
    }
    document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
    await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
}

async function showExploreScreen() {
    pageTitle.textContent = "発見";
    showScreen('explore-screen');
    await loadTimeline('foryou', exploreTimelineDiv);
}

async function showProfileScreen(userId) {
    pageTitle.textContent = "プロフィール";
    showScreen('profile-screen');
    const profileHeader = document.getElementById('profile-header');
    const profileTabs = document.getElementById('profile-tabs');
    const profileContent = document.getElementById('profile-content');
    profileHeader.innerHTML = ''; profileTabs.innerHTML = ''; profileContent.innerHTML = '';

    const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
    if (error || !user) throw new Error('ユーザーが見つかりません');
    
    const { count: followerCount } = await supabase.from('user').select('id', { count: 'exact', head: true }).contains('follow', [userId]);
    profileHeader.innerHTML = `<div id="follow-button-container" class="follow-button"></div><h2>${escapeHTML(user.name)}</h2><div class="user-id">#${user.id} ${user.settings.show_scid ? `(Scratch ID: ${user.scid})` : ''}</div><p class="user-me">${escapeHTML(user.me || '')}</p><div class="user-stats"><span><strong>${user.follow?.length || 0}</strong> フォロー</span><span id="follower-count"><strong>${followerCount || 0}</strong> フォロワー</span></div>`;
    
    if (currentUser && userId !== currentUser.id) {
        const followButton = document.createElement('button');
        const isFollowing = currentUser.follow?.includes(userId);
        followButton.textContent = isFollowing ? 'フォロー解除' : 'フォロー';
        followButton.onclick = () => handleFollowToggle(userId, followButton);
        profileHeader.querySelector('#follow-button-container').appendChild(followButton);
    }

    profileTabs.innerHTML = `<button class="tab-button active" data-tab="posts">投稿</button><button class="tab-button" data-tab="stars">Star</button><button class="tab-button" data-tab="follows">フォロー</button>`;
    profileTabs.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => loadProfileTabContent(user, button.dataset.tab)));
    await loadProfileTabContent(user, 'posts');
}

async function showSettingsScreen() {
    if (!currentUser) return router();
    pageTitle.textContent = "設定";
    showScreen('settings-screen');
    const settingsEl = document.getElementById('settings-screen');
    settingsEl.innerHTML = `
        <form id="settings-form">
            <label for="setting-username">ユーザー名:</label>
            <input type="text" id="setting-username" required value="${escapeHTML(currentUser.name)}">
            <label for="setting-me">自己紹介:</label>
            <textarea id="setting-me">${escapeHTML(currentUser.me || '')}</textarea>
            <fieldset>
                <legend>公開設定</legend>
                <input type="checkbox" id="setting-show-follow" ${currentUser.settings.show_follow ? 'checked' : ''}>
                <label for="setting-show-follow">フォローしている人を公開する</label><br>
                <input type="checkbox" id="setting-show-star" ${currentUser.settings.show_star ? 'checked' : ''}>
                <label for="setting-show-star">お気に入りを付けたポストを公開する</label><br>
                <input type="checkbox" id="setting-show-scid" ${currentUser.settings.show_scid ? 'checked' : ''}>
                <label for="setting-show-scid">ScratchアカウントIDを公開する</label>
            </fieldset>
            <button type="submit">設定を保存</button>
        </form>`;
    settingsEl.querySelector('#settings-form').addEventListener('submit', handleUpdateSettings);
}

// --- 7. コンテンツ読み込み & レンダリング ---
async function switchTimelineTab(tab) {
    if (tab === 'following' && !currentUser) return;
    currentTimelineTab = tab;
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    showLoading(true);
    try { await loadTimeline(tab, timelineDiv); } 
    catch (error) { timelineDiv.innerHTML = `<p class="error-message">${error.message}</p>`; } 
    finally { showLoading(false); }
}

async function loadTimeline(tab, container) {
    container.innerHTML = '<div class="spinner"></div>';
    let query = supabase.from('post').select('*, user(id, name)').order('time', { ascending: false }).limit(50);
    if (tab === 'following') {
        if (!currentUser || !currentUser.follow || currentUser.follow.length === 0) {
            container.innerHTML = '<p>まだ誰もフォローしていません。</p>'; return;
        }
        query = query.in('userid', currentUser.follow);
    }
    const { data: posts, error } = await query;
    container.innerHTML = '';
    if (error) throw new Error('投稿の読み込みに失敗しました。');
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p>まだ投稿がありません。</p>'; return;
    }
    posts.forEach(post => renderPost(post, post.user || {}, container));
}

function renderPost(post, author, container) {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    const isLiked = false; // 将来的にユーザーのいいね情報を元に判定
    const isStarred = currentUser && currentUser.star?.includes(post.id);

    const actionsHTML = currentUser ? `
        <div class="post-actions">
            <button class="like-button" onclick="handleLike(this, '${post.id}')"><span class="icon">${isLiked ? '♥' : '♡'}</span> <span>${post.like}</span></button>
            <button class="star-button ${isStarred ? 'starred' : ''}" onclick="handleStar(this, '${post.id}')"><span class="icon">${isStarred ? '★' : '☆'}</span> <span>${post.star}</span></button>
        </div>` : '';
    postEl.innerHTML = `<div class="post-header"><a href="#profile/${author.id}" class="post-author">${escapeHTML(author.name)}#${author.id}</a><span class="post-time">${new Date(post.time).toLocaleString('ja-JP')}</span></div><div class="post-content"><p>${escapeHTML(post.content)}</p></div>${actionsHTML}`;
    container.appendChild(postEl);
}

async function loadProfileTabContent(user, tab) {
    document.querySelectorAll('#profile-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    const contentDiv = document.getElementById('profile-content');
    contentDiv.innerHTML = '<div class="spinner"></div>';
    try {
        switch(tab) {
            case 'posts':
                const { data: posts, error: pErr } = await supabase.from('post').select('*, user(id, name)').eq('userid', user.id).order('time', { ascending: false });
                if(pErr) throw pErr; contentDiv.innerHTML = '';
                if (posts && posts.length > 0) posts.forEach(p => renderPost(p, user, contentDiv));
                else contentDiv.innerHTML = '<p>まだ投稿がありません。</p>';
                break;
            case 'stars':
                if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒このユーザーのStarは非公開です。</p>'; break; }
                if (!user.star || user.star.length === 0) { contentDiv.innerHTML = '<p>Starを付けた投稿はありません。</p>'; break; }
                const { data: sPosts, error: sErr } = await supabase.from('post').select('*, user(id, name)').in('id', user.star).order('time', { ascending: false });
                if(sErr) throw sErr; contentDiv.innerHTML = '';
                sPosts?.forEach(p => renderPost(p, p.user, contentDiv));
                break;
            case 'follows':
                if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒このユーザーのフォローリストは非公開です。</p>'; break; }
                if (!user.follow || user.follow.length === 0) { contentDiv.innerHTML = '<p>誰もフォローしていません。</p>'; break; }
                const { data: fUsers, error: fErr } = await supabase.from('user').select('id, name, me').in('id', user.follow);
                if(fErr) throw fErr; contentDiv.innerHTML = '';
                fUsers?.forEach(u => { /* (中略) */ });
                break;
        }
    } catch(err) { contentDiv.innerHTML = `<p>コンテンツの読み込みに失敗しました。</p>`; }
}

// --- 8. ユーザーアクション ---
window.handleLike = async function(button, postId) {
    if (!currentUser) return alert("ログインが必要です。");
    alert('いいね機能は現在開発中です！');
}
window.handleStar = async function(button, postId) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
    const iconSpan = button.querySelector('.icon');
    const countSpan = button.querySelector('span:last-child');
    const isStarred = currentUser.star?.includes(postId);
    const updatedStars = isStarred ? currentUser.star.filter(id => id !== postId) : [...(currentUser.star || []), postId];
    const incrementValue = isStarred ? -1 : 1;
    const { error: userError } = await supabase.from('user').update({ star: updatedStars }).eq('id', currentUser.id);
    if (userError) { alert('Starの更新に失敗しました。'); button.disabled = false; return; }
    const { error: postError } = await supabase.rpc('increment_star', { post_id_in: postId, increment_val: incrementValue });
    if (postError) {
        await supabase.from('user').update({ star: currentUser.star }).eq('id', currentUser.id);
        alert('Starの更新に失敗しました。');
    } else {
        currentUser.star = updatedStars;
        setCurrentUser(currentUser);
        countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
        button.classList.toggle('starred', !isStarred);
        iconSpan.textContent = isStarred ? '☆' : '★';
    }
    button.disabled = false;
}
async function handlePostSubmit() {
    if (!currentUser) return alert("ログインが必要です。");
    const contentEl = document.getElementById('post-content');
    const content = contentEl.value.trim();
    if (!content) return alert('内容を入力してください。');
    const button = document.getElementById('post-submit-button');
    button.disabled = true; button.textContent = '投稿中...';
    try {
        const { data, error } = await supabase.from('post').insert({ userid: currentUser.id, content }).select().single();
        if(error) throw error;
        const updatedPosts = [...(currentUser.post || []), data.id];
        await supabase.from('user').update({ post: updatedPosts }).eq('id', currentUser.id);
        currentUser.post = updatedPosts;
        setCurrentUser(currentUser);
        contentEl.value = '';
    } catch(e) { alert('投稿に失敗しました。'); }
    finally { button.disabled = false; button.textContent = 'ポスト'; }
}
async function handleFollowToggle(targetUserId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
    const isFollowing = currentUser.follow?.includes(targetUserId);
    const updatedFollows = isFollowing ? currentUser.follow.filter(id => id !== targetUserId) : [...(currentUser.follow || []), targetUserId];
    const { error } = await supabase.from('user').update({ follow: updatedFollows }).eq('id', currentUser.id);
    if (error) { alert('フォロー状態の更新に失敗しました。');
    } else {
        currentUser.follow = updatedFollows;
        setCurrentUser(currentUser);
        button.textContent = !isFollowing ? 'フォロー解除' : 'フォロー';
        const followerCountSpan = document.querySelector('#follower-count strong');
        if (followerCountSpan) {
            let currentCount = parseInt(followerCountSpan.textContent);
            followerCountSpan.textContent = isFollowing ? currentCount - 1 : currentCount + 1;
        }
    }
    button.disabled = false;
}
async function handleUpdateSettings(event) {
    event.preventDefault();
    if (!currentUser) return;
    const form = event.target;
    const updatedData = {
        name: form.querySelector('#setting-username').value.trim(),
        me: form.querySelector('#setting-me').value.trim(),
        settings: {
            show_follow: form.querySelector('#setting-show-follow').checked,
            show_star: form.querySelector('#setting-show-star').checked,
            show_scid: form.querySelector('#setting-show-scid').checked,
        },
    };
    if (!updatedData.name) return alert('ユーザー名は必須です。');
    const { data, error } = await supabase.from('user').update(updatedData).eq('id', currentUser.id).select().single();
    if (error) { alert('設定の更新に失敗しました。'); }
    else {
        alert('設定を更新しました。');
        setCurrentUser(data);
        window.location.hash = '';
    }
}
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function subscribeToChanges() {
    if (realtimeChannel) return;
    realtimeChannel = supabase.channel('public:post')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post' }, async payload => {
        if (!document.getElementById('main-screen').classList.contains('hidden') && currentTimelineTab === 'foryou') {
            const { data: author } = await supabase.from('user').select('id, name').eq('id', payload.new.userid).single();
            if (author) renderPost(payload.new, author, timelineDiv);
        }
      })
      .subscribe();
}

// --- 11. イベントリスナー & 初期化処理 ---
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.addEventListener('click', () => switchTimelineTab(btn.dataset.tab)));
    document.getElementById('banner-signup-button').addEventListener('click', handleLoginRedirect);
    document.getElementById('banner-login-button').addEventListener('click', handleLoginRedirect);
    window.addEventListener('hashchange', router);
    checkSession();
});