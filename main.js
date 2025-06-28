// --- 1. 初期設定 & グローバル変数 ---
const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null; let realtimeChannel = null; let currentTimelineTab = 'foryou';

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
    } finally {
        showLoading(false);
    }
}

// --- 4. ナビゲーションメニュー管理 ---
function updateNavMenu() {
    const hash = window.location.hash || '#';
    let topMenuHTML = `
        <a href="#" class="nav-item ${hash === '#' ? 'active' : ''}"><span>ホーム</span></a>
        <a href="#explore" class="nav-item ${hash === '#explore' ? 'active' : ''}"><span>発見</span></a>`;
    if (currentUser) {
        topMenuHTML += `
            <a href="#profile/${currentUser.id}" class="nav-item ${hash.startsWith('#profile/') ? 'active' : ''}"><span>プロフィール</span></a>
            <a href="#settings" class="nav-item ${hash === '#settings' ? 'active' : ''}"><span>設定</span></a>`;
    }
    navMenuTop.innerHTML = topMenuHTML;

    let bottomMenuHTML = currentUser ?
        `<button id="account-button" class="nav-item"><span>${escapeHTML(currentUser.name)}#${currentUser.id}</span></button>` :
        `<button id="login-button" class="nav-item"><span>ログイン</span></button>`;
    navMenuBottom.innerHTML = bottomMenuHTML;
    
    loginBanner.classList.toggle('hidden', !!currentUser);

    navMenuTop.querySelectorAll('a.nav-item').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = link.getAttribute('href'); }));
    navMenuBottom.querySelector('button')?.addEventListener('click', currentUser ? handleLogout : goToLoginPage);
}

// --- 5. 認証 ---
function goToLoginPage() { window.location.href = 'login.html'; }
function handleLogout() {
    if(!confirm("ログアウトしますか？")) return;
    currentUser = null;
    localStorage.removeItem('currentUser');
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
    router();
}
function checkSession() {
    const userJson = localStorage.getItem('currentUser');
    currentUser = userJson ? JSON.parse(userJson) : null;
    if(currentUser) subscribeToChanges();
    router();
}

// --- 6. 各画面の表示ロジック ---
async function showMainScreen() {
    pageTitle.textContent = "ホーム";
    showScreen('main-screen');
    if (currentUser) {
        postFormContainer.innerHTML = `<div class="post-form"><div style="display:flex;justify-content:flex-end;"><button id="post-submit-button">ポスト</button></div><textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea></div>`;
        postFormContainer.querySelector('#post-submit-button').addEventListener('click', handlePostSubmit);
    } else { postFormContainer.innerHTML = ''; }
    
    document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
    await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
}
async function showExploreScreen() {
    pageTitle.textContent = "発見";
    showScreen('explore-screen');
    await loadTimeline('foryou', exploreTimelineDiv);
}
async function showProfileScreen(userId) { /* ... */ }
async function showSettingsScreen() { /* ... */ }

// --- 7. コンテンツ読み込み & レンダリング ---
async function switchTimelineTab(tab) {
    if (tab === 'following' && !currentUser) return;
    currentTimelineTab = tab;
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    await loadTimeline(tab, timelineDiv);
}
async function loadTimeline(tab, container) {
    showLoading(true);
    container.innerHTML = '';
    try {
        let query = supabase.from('post').select('*, user(id, name)').order('time', { ascending: false }).limit(50);
        if (tab === 'following' && currentUser?.follow?.length) {
            query = query.in('userid', currentUser.follow);
        }
        const { data: posts, error } = await query;
        if (error) throw new Error('投稿の読み込みに失敗しました。');
        if (!posts?.length) {
            container.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--secondary-text-color);">${tab === 'following' ? 'まだ誰もフォローしていません。' : 'まだ投稿がありません。'}</p>`;
            return;
        }
        posts.forEach(post => renderPost(post, post.user || {}, container));
    } catch(err) {
        container.innerHTML = `<p class="error-message">${err.message}</p>`;
    } finally {
        showLoading(false);
    }
}
function renderPost(post, author, container) { /* ... */ }
async function loadProfileTabContent(user, tab) { /* ... */ }
async function loadTimelineForUser(userId, container) { /* ... */ }

// --- 8. ユーザーアクション ---
window.handleLike = async (button, postId) => alert('いいね機能は現在開発中です！');
window.handleStar = async (button, postId) => { /* ... */ };
async function handlePostSubmit() { /* ... */ }
async function handleFollowToggle(targetUserId, button) { /* ... */ }
async function handleUpdateSettings(event) { /* ... */ }

// --- 9. Supabaseリアルタイム購読 ---
function subscribeToChanges() { /* ... */ }

// --- 10. ヘルパー関数 ---
function escapeHTML(str) { /* ... */ }

// --- 11. イベントリスナー & 初期化処理 ---
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.addEventListener('click', () => switchTimelineTab(btn.dataset.tab)));
    document.getElementById('banner-signup-button').addEventListener('click', goToLoginPage);
    document.getElementById('banner-login-button').addEventListener('click', goToLoginPage);
    window.addEventListener('hashchange', router);
    checkSession();
});

// (ここに前回のコードの変更なし関数群をペースト)
async function showProfileScreen(userId) {
    pageTitle.textContent = "プロフィール";
    showScreen('profile-screen');
    const profileHeader = document.getElementById('profile-header');
    const profileTabs = document.getElementById('profile-tabs');
    profileHeader.innerHTML = ''; profileTabs.innerHTML = '';
    const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
    if (error || !user) { profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>'; return; }
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
    document.getElementById('settings-screen').innerHTML = `<form id="settings-form">...</form>`;
    document.getElementById('settings-form').addEventListener('submit', handleUpdateSettings);
}
function renderPost(post, author, container) {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    const isLiked = false;
    const isStarred = currentUser?.star?.includes(post.id);
    const actionsHTML = currentUser ? `<div class="post-actions"><button class="like-button" onclick="handleLike(this, '${post.id}')"><span class="icon">${isLiked ? '♥' : '♡'}</span> <span>${post.like}</span></button><button class="star-button ${isStarred ? 'starred' : ''}" onclick="handleStar(this, '${post.id}')"><span class="icon">${isStarred ? '★' : '☆'}</span> <span>${post.star}</span></button></div>` : '';
    postEl.innerHTML = `<div class="post-header"><a href="#profile/${author.id}" class="post-author">${escapeHTML(author.name || '不明')}#${author.id || '????'}</a><span class="post-time">${new Date(post.time).toLocaleString('ja-JP')}</span></div><div class="post-content"><p>${escapeHTML(post.content)}</p></div>${actionsHTML}`;
    container.appendChild(postEl);
}
async function loadProfileTabContent(user, tab) { /* ... */ }
async function loadTimelineForUser(userId, container) { /* ... */ }
window.handleStar = async (button, postId) => { /* ... */ };
async function handlePostSubmit() { /* ... */ }
async function handleFollowToggle(targetUserId, button) { /* ... */ }
async function handleUpdateSettings(event) { /* ... */ }
function subscribeToChanges() { /* ... */ }
function escapeHTML(str) { /* ... */ }