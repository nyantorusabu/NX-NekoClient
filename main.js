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
    const hash = window.location.hash;

    if (hash.startsWith('#profile/')) {
        const userId = parseInt(hash.substring('#profile/'.length), 10);
        if (userId) await showProfileScreen(userId);
        else window.location.hash = '';
    } else if (hash === '#settings') {
        if (currentUser) await showSettingsScreen();
        else window.location.hash = ''; // 未ログインならホームへ
    } else {
        if (hash) window.location.hash = '';
        await showMainScreen();
    }
}

// --- 4. ナビゲーションメニュー管理 ---
function updateNavMenu() {
    // 上部メニュー
    let topMenuHTML = `
        <a href="#" class="nav-item ${!window.location.hash ? 'active' : ''}"><span>ホーム</span></a>
        <a href="#explore" class="nav-item"><span>発見</span></a>
    `;
    if (currentUser) {
        topMenuHTML += `
            <a href="#profile/${currentUser.id}" class="nav-item ${window.location.hash.includes('#profile') ? 'active' : ''}"><span>プロフィール</span></a>
            <a href="#settings" class="nav-item ${window.location.hash === '#settings' ? 'active' : ''}"><span>設定</span></a>
        `;
    }
    navMenuTop.innerHTML = topMenuHTML;

    // 下部アカウントボタン
    let bottomMenuHTML = '';
    if (currentUser) {
        bottomMenuHTML = `<button id="logout-button" class="nav-item"><span>${escapeHTML(currentUser.name)}#${currentUser.id} からログアウト</span></button>`;
    } else {
        bottomMenuHTML = `<button id="login-button" class="nav-item"><span>ログイン</span></button>`;
    }
    navMenuBottom.innerHTML = bottomMenuHTML;
    
    // 未ログイン時バナーの表示/非表示
    loginBanner.classList.toggle('hidden', !!currentUser);

    // イベントリスナー再設定
    navMenuTop.querySelectorAll('a.nav-item').forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = link.getAttribute('href');
    }));
    navMenuBottom.querySelector('button')?.addEventListener('click', currentUser ? handleLogout : handleLoginRedirect);
}

// --- 5. 認証 ---
function handleLoginRedirect() { /* ... 変更なし ... */ }
async function handleAuthCallback() { /* ... 変更なし ... */ }
async function findOrCreateUser(scratchUser) { /* ... 変更なし ... */ }
async function generateUniqueUserId() { /* ... 変更なし ... */ }
function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (user) subscribeToChanges();
}
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    router();
}
async function checkSession() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) currentUser = JSON.parse(userJson);
    else currentUser = null;
    
    if (localStorage.getItem('isLoggingIn')) {
        await handleAuthCallback();
    }
    
    await router();
}

// --- 6. 各画面の表示ロジック ---
async function showMainScreen() {
    pageTitle.textContent = "ホーム";
    showScreen('main-screen');

    // ログイン状態に応じてポストフォームを描画
    if (currentUser) {
        postFormContainer.innerHTML = `
            <div class="post-form">
                <textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea>
                <button id="post-submit-button">ポスト</button>
            </div>`;
        postFormContainer.querySelector('#post-submit-button').addEventListener('click', handlePostSubmit);
    } else {
        postFormContainer.innerHTML = '';
    }
    
    // タブの表示状態を更新
    const tabs = document.querySelector('.timeline-tabs');
    tabs.querySelector('[data-tab="following"]').style.display = currentUser ? 'block' : 'none';

    showLoading(true);
    try {
        await loadTimeline(currentTimelineTab);
    } catch (error) {
        console.error("Failed to load timeline:", error);
        timelineDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    } finally {
        showLoading(false);
    }
}

async function showProfileScreen(userId) { /* ... 変更なし ... */ }

async function showSettingsScreen() {
    if (!currentUser) return router(); // ガード
    pageTitle.textContent = "設定";
    showScreen('settings-screen');
    document.getElementById('settings-screen').innerHTML = `
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
    document.getElementById('settings-form').addEventListener('submit', handleUpdateSettings);
}

// --- 7. コンテンツ読み込み & レンダリング ---
async function switchTimelineTab(tab) {
    if (tab === 'following' && !currentUser) return; // 未ログインならフォロー中は表示しない
    currentTimelineTab = tab;
    
    document.querySelectorAll('.timeline-tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    showLoading(true);
    try {
        await loadTimeline(tab);
    } catch (error) {
        console.error("Failed to load timeline on tab switch:", error);
        timelineDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    } finally {
        showLoading(false);
    }
}

async function loadTimeline(tab = 'foryou') {
    timelineDiv.innerHTML = '';
    let query = supabase.from('post').select('*, user(id, name)').order('time', { ascending: false }).limit(50);

    if (tab === 'following') {
        if (!currentUser || !currentUser.follow || currentUser.follow.length === 0) {
            timelineDiv.innerHTML = '<p>まだ誰もフォローしていません。</p>';
            return;
        }
        query = query.in('userid', currentUser.follow);
    }
    
    const { data: posts, error } = await query;
    if (error) throw new Error('投稿の読み込みに失敗しました。');
    if (posts.length === 0) {
        timelineDiv.innerHTML = '<p>まだ投稿がありません。</p>';
        return;
    }
    posts.forEach(post => renderPost(post, post.user || {}, timelineDiv));
}

function renderPost(post, author, container) { /* ... 変更なし ... */ }
async function loadProfileTabContent(user, tab) { /* ... 変更なし ... */ }

// --- 8. ユーザーアクション ---
async function handlePostSubmit() { /* ... 変更なし ... */ }
window.handleLike = async function(postId, button) { /* ... 変更なし ... */ }
window.handleStar = async function(postId, button) { /* ... 変更なし ... */ }
async function handleFollowToggle(targetUserId, button) { /* ... 変更なし ... */ }
async function handleUpdateSettings(event) { /* ... 変更なし ... */ }

// --- 9. Supabaseリアルタイム購読 ---
function subscribeToChanges() { /* ... 変更なし ... */ }

// --- 10. ヘルパー関数 ---
function escapeHTML(str) { /* ... 変更なし ... */ }

// --- 11. イベントリスナー & 初期化処理 ---
window.addEventListener('DOMContentLoaded', () => {
    // タイムラインタブ
    document.querySelectorAll('.timeline-tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTimelineTab(btn.dataset.tab));
    });

    // 未ログイン時バナー
    document.getElementById('banner-signup-button').addEventListener('click', handleLoginRedirect);
    document.getElementById('banner-login-button').addEventListener('click', handleLoginRedirect);
    
    window.addEventListener('hashchange', router);
    checkSession();
});

// =======================================================
// 以下、変更のない関数（前のコードからコピー＆ペースト）
// =======================================================
// (省略していた関数群をここにペースト)
function handleLoginRedirect() {
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = SCRATCH_AUTH_URL
        .replace("{REDIRECT_URI}", encodeURIComponent(redirectUri))
        .replace("{APP_NAME}", encodeURIComponent(APP_NAME));
    
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
function renderPost(post, author, container) {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    const isStarred = currentUser && currentUser.star?.includes(post.id);

    const actionsHTML = currentUser ? `
        <div class="post-actions">
            <button class="like-button" onclick="handleLike('${post.id}', this)">❤️ <span>${post.like}</span></button>
            <button class="star-button ${isStarred ? 'starred' : ''}" onclick="handleStar('${post.id}', this)">⭐ <span>${post.star}</span></button>
        </div>` : '';

    postEl.innerHTML = `
        <div class="post-header">
            <a href="#profile/${author.id}" class="post-author">${escapeHTML(author.name)}#${author.id}</a>
            <span class="post-time">${new Date(post.time).toLocaleString('ja-JP')}</span>
        </div>
        <div class="post-content"><p>${escapeHTML(post.content)}</p></div>
        ${actionsHTML}
    `;
    container.appendChild(postEl);
}
async function loadProfileTabContent(user, tab) {
    const contentDiv = document.getElementById('profile-content');
    contentDiv.innerHTML = '<div class="spinner"></div>';
    try {
        switch(tab) {
            case 'posts':
                const { data: posts, error: postsError } = await supabase.from('post').select('*, user(id, name)').eq('userid', user.id).order('time', { ascending: false });
                if(postsError) throw postsError;
                contentDiv.innerHTML = '';
                if (posts && posts.length > 0) posts.forEach(p => renderPost(p, user, contentDiv));
                else contentDiv.innerHTML = '<p class="empty-message">まだ投稿がありません。</p>';
                break;
            case 'stars':
                if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) {
                    contentDiv.innerHTML = '<p class="locked">🔒 このユーザーのStarは非公開です。</p>'; break;
                }
                if (!user.star || user.star.length === 0) {
                    contentDiv.innerHTML = '<p class="empty-message">Starを付けた投稿はありません。</p>'; break;
                }
                const { data: starredPosts, error: starredError } = await supabase.from('post').select('*, user(id, name)').in('id', user.star).order('time', { ascending: false });
                if(starredError) throw starredError;
                contentDiv.innerHTML = '';
                starredPosts?.forEach(p => renderPost(p, p.user, contentDiv));
                break;
            case 'follows':
                if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) {
                    contentDiv.innerHTML = '<p class="locked">🔒 このユーザーのフォローリストは非公開です。</p>'; break;
                }
                if (!user.follow || user.follow.length === 0) {
                    contentDiv.innerHTML = '<p class="empty-message">誰もフォローしていません。</p>'; break;
                }
                const { data: followUsers, error: followsError } = await supabase.from('user').select('id, name, me').in('id', user.follow);
                if(followsError) throw followsError;
                contentDiv.innerHTML = '';
                followUsers?.forEach(u => {
                    const userCard = document.createElement('div'); userCard.className = 'profile-card';
                    userCard.innerHTML = `<div class="profile-card-info"><a href="#profile/${u.id}"><span class="name">${escapeHTML(u.name)}</span><span class="id">#${u.id}</span><p class="me">${escapeHTML(u.me || '')}</p></a></div>${currentUser && u.id !== currentUser.id ? `<div id="follow-btn-${u.id}"></div>` : ''}`;
                    contentDiv.appendChild(userCard);
                    if (currentUser && u.id !== currentUser.id) {
                        const followButtonContainer = userCard.querySelector(`#follow-btn-${u.id}`);
                        const followButton = document.createElement('button');
                        const isFollowing = currentUser.follow?.includes(u.id);
                        followButton.textContent = isFollowing ? 'フォロー中' : 'フォロー';
                        followButton.onclick = (e) => { e.stopPropagation(); handleFollowToggle(u.id, followButton); };
                        followButtonContainer.appendChild(followButton);
                    }
                });
                break;
        }
    } catch(err) { contentDiv.innerHTML = `<p class="error-message">コンテンツの読み込みに失敗しました。</p>`; }
}
async function handlePostSubmit() {
    if (!currentUser) return alert("ログインが必要です。");
    const contentEl = document.getElementById('post-content');
    const content = contentEl.value.trim();
    if (!content) return alert('内容を入力してください。');
    const button = document.getElementById('post-submit-button');
    button.disabled = true; button.textContent = '投稿中...';
    const { error: postError } = await supabase.from('post').insert({ userid: currentUser.id, content }).select().single();
    if (postError) { alert('投稿に失敗しました。'); }
    else {
        const updatedPosts = [...(currentUser.post || []), data.id];
        const { error: userError } = await supabase.from('user').update({ post: updatedPosts }).eq('id', currentUser.id);
        if (userError) console.error('Failed to update user posts array:', userError);
        else {
            currentUser.post = updatedPosts;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        contentEl.value = '';
    }
    button.disabled = false; button.textContent = 'ポスト';
}
window.handleLike = async function(postId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
    const { error } = await supabase.rpc('increment_like', { post_id_in: postId });
    if (error) { alert('Likeに失敗しました。'); }
    else { button.querySelector('span').textContent = parseInt(button.querySelector('span').textContent) + 1; }
    button.disabled = false;
}
window.handleStar = async function(postId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
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
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        button.querySelector('span').textContent = parseInt(button.querySelector('span').textContent) + incrementValue;
        button.classList.toggle('starred', !isStarred);
    }
    button.disabled = false;
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
        button.textContent = !isFollowing ? 'フォロー中' : 'フォロー';
        const followerCountSpan = document.querySelector('#follower-count strong');
        if (followerCountSpan && window.location.hash === `#profile/${targetUserId}`) {
            let currentCount = parseInt(followerCountSpan.textContent);
            followerCountSpan.textContent = isFollowing ? currentCount - 1 : currentCount + 1;
        }
    }
    button.disabled = false;
}
async function handleUpdateSettings(event) {
    event.preventDefault();
    if (!currentUser) return;
    const newUsername = document.getElementById('setting-username').value.trim();
    if (!newUsername) return alert('ユーザー名は必須です。');
    const updatedData = {
        name: newUsername,
        me: document.getElementById('setting-me').value.trim(),
        settings: {
            show_follow: document.getElementById('setting-show-follow').checked,
            show_star: document.getElementById('setting-show-star').checked,
            show_scid: document.getElementById('setting-show-scid').checked,
        },
    };
    const { data, error } = await supabase.from('user').update(updatedData).eq('id', currentUser.id).select().single();
    if (error) { alert('設定の更新に失敗しました。'); }
    else {
        alert('設定を更新しました。');
        setCurrentUser(data);
        window.location.hash = '';
    }
}
function subscribeToChanges() {
    if (realtimeChannel) return;
    realtimeChannel = supabase.channel('public:post')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post' }, async payload => {
        if (!document.getElementById('main-screen').classList.contains('hidden')) {
            const { data: author } = await supabase.from('user').select('id, name').eq('id', payload.new.userid).single();
            if (author) renderPost(payload.new, author, timelineDiv);
        }
      })
      .subscribe();
}
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}