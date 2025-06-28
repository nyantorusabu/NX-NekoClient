// --- 1. 初期設定 & グローバル変数 ---
const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SCRATCH_AUTH_URL = "https://auth.itinerary.eu.org/auth/?redirect={REDIRECT_URI}&name={APP_NAME}";
const APP_NAME = "NyaX";

let currentUser = null;
let realtimeChannel = null;

// --- 2. DOM要素 ---
const leftNav = document.getElementById('left-nav');
const pageTitle = document.getElementById('page-title');
const contentArea = document.getElementById('content-area');
const screens = document.querySelectorAll('.screen');
const postForm = document.querySelector('.post-form');
const timelineDiv = document.getElementById('timeline');
const settingsForm = document.getElementById('settings-form');
const loadingOverlay = document.getElementById('loading-overlay');

// --- 3. 画面管理 & ルーティング ---
function showLoading(show) {
    loadingOverlay.classList.toggle('hidden', !show);
}

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
        if (currentUser) showSettingsScreen();
        else window.location.hash = ''; // 未ログインならホームへ
    } else {
        await showMainScreen();
    }
}

// --- 4. ナビゲーションメニュー管理 ---
function updateNavMenu() {
    let menuHTML = `<a href="#" data-hash="" class="nav-item ${!window.location.hash ? 'active' : ''}"><span>ホーム</span></a>`;

    if (currentUser) {
        menuHTML += `
            <a href="#profile/${currentUser.id}" class="nav-item ${window.location.hash.includes('#profile') ? 'active' : ''}"><span>プロフィール</span></a>
            <a href="#settings" class="nav-item ${window.location.hash === '#settings' ? 'active' : ''}"><span>設定</span></a>
            <button id="logout-button" class="nav-item">ログアウト</button>
        `;
    } else {
        // 未ログイン時はログインボタンを表示
    }
    leftNav.innerHTML = menuHTML;

    // イベントリスナーを再設定
    if (currentUser) {
        leftNav.querySelector('#logout-button')?.addEventListener('click', handleLogout);
    }
    
    leftNav.querySelectorAll('a.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = link.getAttribute('href');
        });
    });
}

// --- 5. 認証 (Login/Logout/Session) ---
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
    updateNavMenu();
    router();
}

async function checkSession() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) currentUser = JSON.parse(userJson);
    else currentUser = null;
    
    if (localStorage.getItem('isLoggingIn')) {
        await handleAuthCallback();
    }
    
    updateNavMenu();
    router();
}

// --- 6. 各画面の表示ロジック ---
async function showMainScreen() {
    pageTitle.textContent = "ホーム";
    showScreen('main-screen');
    postForm.style.display = currentUser ? 'block' : 'none';
    showLoading(true);
    try {
        await loadTimeline();
    } catch (error) {
        console.error("Failed to load timeline:", error);
        timelineDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    } finally {
        showLoading(false);
    }
}

async function showProfileScreen(userId) { /* ... 変更なし ... */ }

function showSettingsScreen() {
    if (!currentUser) return router(); // ガード
    pageTitle.textContent = "設定";
    showScreen('settings-screen');
    document.getElementById('setting-username').value = currentUser.name;
    document.getElementById('setting-me').value = currentUser.me || '';
    document.getElementById('setting-show-follow').checked = currentUser.settings.show_follow;
    document.getElementById('setting-show-star').checked = currentUser.settings.show_star;
    document.getElementById('setting-show-scid').checked = currentUser.settings.show_scid;
}

// --- 7. コンテンツ読み込み & レンダリング ---
async function loadTimeline() { /* ... 変更なし ... */ }

function renderPost(post, author, container, mode = 'append') {
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
    if (mode === 'prepend') container.prepend(postEl);
    else container.appendChild(postEl);
}

async function loadProfileTabContent(user, tab) { /* ... 変更なし ... */ }

// --- 8. ユーザーアクション ---
async function handlePostSubmit() {
    if (!currentUser) return alert("ログインが必要です。");
    /* ... 以降は変更なし ... */
}
window.handleLike = async function(postId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    /* ... 以降は変更なし ... */
}
window.handleStar = async function(postId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    /* ... 以降は変更なし ... */
}
async function handleFollowToggle(targetUserId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    /* ... 以降は変更なし ... */
}
async function handleUpdateSettings(event) { /* ... 変更なし ... */ }

// --- 9. Supabaseリアルタイム購読 ---
function subscribeToChanges() { /* ... 変更なし ... */ }

// --- 10. ヘルパー関数 ---
function escapeHTML(str) { /* ... 変更なし ... */ }

// --- 11. イベントリスナー & 初期化処理 ---
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('redirect-login-button')?.addEventListener('click', handleLoginRedirect);
    document.getElementById('post-submit-button')?.addEventListener('click', handlePostSubmit);
    document.getElementById('settings-form')?.addEventListener('submit', handleUpdateSettings);
    
    window.addEventListener('hashchange', router);
    checkSession();
});


// =======================================================
// 以下、変更のない関数（前のコードからコピー＆ペースト）
// =======================================================
async function findOrCreateUser(scratchUser) {
    const scid = String(scratchUser.id);
    let { data: user, error } = await supabase.from('user').select('*').eq('scid', scid).single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error finding user:', error);
        alert('ユーザー情報の取得に失敗しました。');
        throw error;
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
        if (createError) {
            console.error('Error creating user:', createError);
            alert('アカウントの作成に失敗しました。');
            throw createError;
        }
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
async function showProfileScreen(userId) {
    pageTitle.textContent = "プロフィール";
    showScreen('profile-screen');
    showLoading(true);
    const profileHeader = document.getElementById('profile-header');
    const profileTabs = document.getElementById('profile-tabs');
    const profileContent = document.getElementById('profile-content');
    profileHeader.innerHTML = '';
    profileTabs.innerHTML = '';
    profileContent.innerHTML = '';

    try {
        const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
        if (error || !user) {
            throw new Error('ユーザーが見つかりません');
        }
        
        const { count: followerCount } = await supabase.from('user').select('id', { count: 'exact', head: true }).contains('follow', [userId]);

        profileHeader.innerHTML = `
            <div id="follow-button-container" class="follow-button"></div>
            <h2>${escapeHTML(user.name)}</h2>
            <div class="user-id">#${user.id} ${user.settings.show_scid ? `(Scratch ID: ${user.scid})` : ''}</div>
            <p class="user-me">${escapeHTML(user.me || '')}</p>
            <div class="user-stats">
                <span><strong>${user.follow?.length || 0}</strong> フォロー</span>
                <span id="follower-count"><strong>${followerCount || 0}</strong> フォロワー</span>
            </div>
        `;
        
        if (currentUser && userId !== currentUser.id) {
            const followButton = document.createElement('button');
            const isFollowing = currentUser.follow?.includes(userId);
            followButton.textContent = isFollowing ? 'フォロー中' : 'フォロー';
            followButton.onclick = () => handleFollowToggle(userId, followButton);
            document.getElementById('follow-button-container').appendChild(followButton);
        }

        profileTabs.innerHTML = `
            <button class="tab-button active" data-tab="posts">投稿</button>
            <button class="tab-button" data-tab="stars">Star</button>
            <button class="tab-button" data-tab="follows">フォロー</button>
        `;

        profileTabs.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', async () => {
                profileTabs.querySelector('.active').classList.remove('active');
                button.classList.add('active');
                await loadProfileTabContent(user, button.dataset.tab);
            });
        });

        await loadProfileTabContent(user, 'posts');
    } catch(err) {
        console.error(err);
        profileHeader.innerHTML = `<h2>${err.message}</h2>`;
    } finally {
        showLoading(false);
    }
}
async function loadTimeline() {
    timelineDiv.innerHTML = '';
    const { data: posts, error } = await supabase.from('post').select('*, user(id, name)').order('time', { ascending: false }).limit(50);
    
    if (error) {
        console.error('Error loading posts:', error);
        throw new Error('投稿の読み込みに失敗しました。');
    }
    if (posts.length === 0) {
        timelineDiv.innerHTML = '<p>まだ投稿がありません。</p>';
        return;
    }
    
    posts.forEach(post => {
        const author = post.user || { name: '不明なユーザー', id: post.userid };
        renderPost(post, author, timelineDiv, 'append');
    });
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
                if (posts && posts.length > 0) {
                    posts.forEach(p => renderPost(p, user, contentDiv));
                } else {
                    contentDiv.innerHTML = '<p class="empty-message">まだ投稿がありません。</p>';
                }
                break;
            case 'stars':
                if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) {
                    contentDiv.innerHTML = '<p class="locked">🔒 このユーザーのStarは非公開です。</p>';
                    break;
                }
                if (!user.star || user.star.length === 0) {
                    contentDiv.innerHTML = '<p class="empty-message">Starを付けた投稿はありません。</p>';
                    break;
                }
                const { data: starredPosts, error: starredError } = await supabase.from('post').select('*, user(id, name)').in('id', user.star).order('time', { ascending: false });
                if(starredError) throw starredError;
                contentDiv.innerHTML = '';
                starredPosts?.forEach(p => renderPost(p, p.user, contentDiv));
                break;
            case 'follows':
                if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) {
                    contentDiv.innerHTML = '<p class="locked">🔒 このユーザーのフォローリストは非公開です。</p>';
                    break;
                }
                if (!user.follow || user.follow.length === 0) {
                    contentDiv.innerHTML = '<p class="empty-message">誰もフォローしていません。</p>';
                    break;
                }
                const { data: followUsers, error: followsError } = await supabase.from('user').select('id, name, me').in('id', user.follow);
                if(followsError) throw followsError;
                contentDiv.innerHTML = '';
                followUsers?.forEach(u => {
                    const userCard = document.createElement('div');
                    userCard.className = 'profile-card';
                    userCard.innerHTML = `
                        <div class="profile-card-info">
                            <a href="#profile/${u.id}">
                                <span class="name">${escapeHTML(u.name)}</span>
                                <span class="id">#${u.id}</span>
                                <p class="me">${escapeHTML(u.me || '')}</p>
                            </a>
                        </div>
                        ${currentUser && u.id !== currentUser.id ? `<div id="follow-btn-${u.id}" class="follow-button-in-list"></div>` : ''}
                    `;
                    contentDiv.appendChild(userCard);

                    if (currentUser && u.id !== currentUser.id) {
                        const followButtonContainer = userCard.querySelector(`#follow-btn-${u.id}`);
                        const followButton = document.createElement('button');
                        const isFollowing = currentUser.follow?.includes(u.id);
                        followButton.textContent = isFollowing ? 'フォロー中' : 'フォロー';
                        followButton.onclick = (e) => {
                            e.stopPropagation();
                            handleFollowToggle(u.id, followButton);
                        };
                        followButtonContainer.appendChild(followButton);
                    }
                });
                break;
        }
    } catch(err) {
        console.error(err);
        contentDiv.innerHTML = `<p class="error-message">コンテンツの読み込みに失敗しました。</p>`;
    }
}
async function handlePostSubmit() {
    if (!currentUser) return alert("ログインが必要です。");
    const content = document.getElementById('post-content').value.trim();
    if (!content) return alert('内容を入力してください。');

    const button = document.getElementById('post-submit-button');
    button.disabled = true;
    button.textContent = '投稿中...';

    const { data, error: postError } = await supabase.from('post').insert({ userid: currentUser.id, content }).select().single();
    if (postError) {
        console.error('Error posting:', postError);
        alert('投稿に失敗しました。');
    } else {
        const updatedPosts = [...(currentUser.post || []), data.id];
        const { error: userError } = await supabase.from('user').update({ post: updatedPosts }).eq('id', currentUser.id);
        if (userError) console.error('Failed to update user posts array:', userError);
        else {
            currentUser.post = updatedPosts;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        document.getElementById('post-content').value = '';
    }
    button.disabled = false;
    button.textContent = 'ポスト';
}
async function handleFollowToggle(targetUserId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
    const isFollowing = currentUser.follow?.includes(targetUserId);
    const updatedFollows = isFollowing 
        ? currentUser.follow.filter(id => id !== targetUserId)
        : [...(currentUser.follow || []), targetUserId];
    
    const { error } = await supabase.from('user').update({ follow: updatedFollows }).eq('id', currentUser.id);

    if (error) {
        alert('フォロー状態の更新に失敗しました。');
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
    if (error) {
        alert('設定の更新に失敗しました。');
    } else {
        alert('設定を更新しました。');
        setCurrentUser(data);
        window.location.hash = '';
        await router();
    }
}
function subscribeToChanges() {
    if (realtimeChannel) return;
    realtimeChannel = supabase.channel('public:post')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post' }, async payload => {
        if (document.getElementById('main-screen').classList.contains('hidden')) return;
        const { data: author } = await supabase.from('user').select('id, name').eq('id', payload.new.userid).single();
        if (author) renderPost(payload.new, author, timelineDiv, 'prepend');
      })
      .subscribe();
}
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}