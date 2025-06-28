// --- 1. 初期設定 & グローバル変数 ---
const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const scratchAuth = new ScratchAuth();

let currentUser = null;
let realtimeChannel = null;

// --- 2. DOM要素 ---
const screens = document.querySelectorAll('.screen');
const userInfoDiv = document.getElementById('user-info');
const currentUsernameSpan = document.getElementById('current-username');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const logoLink = document.getElementById('logo-link');
const settingsButton = document.getElementById('settings-button');
const postSubmitButton = document.getElementById('post-submit-button');
const postContentTextarea = document.getElementById('post-content');
const timelineDiv = document.getElementById('timeline');
const settingsForm = document.getElementById('settings-form');
const loadingOverlay = document.getElementById('loading-overlay');

// --- 3. ルーティング & 画面管理 ---
function showLoading(show) {
    loadingOverlay.classList.toggle('hidden', !show);
}

function showScreen(screenId) {
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

async function router() {
    const hash = window.location.hash;
    if (!currentUser) {
        showScreen('login-screen');
        return;
    }

    if (hash.startsWith('#profile/')) {
        const userId = parseInt(hash.substring('#profile/'.length), 10);
        if (userId) {
            await showProfileScreen(userId);
        } else {
            window.location.hash = ''; // 不正なIDならホームへ
            showMainScreen();
        }
    } else if (hash === '#settings') {
        showSettingsScreen();
    } else {
        showMainScreen();
    }
}

// --- 4. 認証 (Login/Logout/Session) ---
async function handleLogin() {
    showLoading(true);
    try {
        const scratchUser = await scratchAuth.login();
        await findOrCreateUser(scratchUser);
    } catch (error) {
        console.error('ScratchAuth login error:', error);
        alert('ログインに失敗しました。ポップアップがブロックされていないか確認してください。');
    } finally {
        showLoading(false);
    }
}

async function findOrCreateUser(scratchUser) {
    const scid = String(scratchUser.id);
    let { data: user, error } = await supabase.from('user').select('*').eq('scid', scid).single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error finding user:', error);
        alert('ユーザー情報の取得に失敗しました。');
        return;
    }

    if (user) {
        setCurrentUser(user);
    } else {
        const newUserId = await generateUniqueUserId();
        const newUser = {
            id: newUserId,
            name: scratchUser.username,
            scid: scid,
            settings: { show_follow: true, show_star: true, show_scid: true }
        };
        const { data: createdUser, error: createError } = await supabase.from('user').insert(newUser).select().single();
        if (createError) {
            console.error('Error creating user:', createError);
            alert('アカウントの作成に失敗しました。');
            return;
        }
        setCurrentUser(createdUser);
    }
    window.location.hash = '';
    router();
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
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (user) {
        updateUserInfoHeader();
        subscribeToChanges();
    }
}

function updateUserInfoHeader() {
    if (currentUser) {
        currentUsernameSpan.textContent = `${currentUser.name}#${currentUser.id}`;
        userInfoDiv.classList.remove('hidden');
    } else {
        userInfoDiv.classList.add('hidden');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    updateUserInfoHeader();
    window.location.hash = '';
    showScreen('login-screen');
}

function checkSession() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
        currentUser = JSON.parse(userJson);
        updateUserInfoHeader();
        subscribeToChanges();
    }
    router();
}

// --- 5. メイン画面 (タイムライン) ---
function showMainScreen() {
    showScreen('main-screen');
    loadTimeline();
}

async function loadTimeline() {
    timelineDiv.innerHTML = '読み込み中...';
    const { data: posts, error } = await supabase.from('post').select('*, user(id, name)').order('time', { ascending: false }).limit(50);
    
    if (error) {
        console.error('Error loading posts:', error);
        timelineDiv.innerHTML = '投稿の読み込みに失敗しました。';
        return;
    }
    if (posts.length === 0) {
        timelineDiv.innerHTML = 'まだ投稿がありません。最初の投稿をしてみましょう！';
        return;
    }
    
    timelineDiv.innerHTML = '';
    posts.forEach(post => {
        const author = post.user || { name: '不明なユーザー', id: post.userid };
        renderPost(post, author, timelineDiv, 'append');
    });
}

function renderPost(post, author, container, mode = 'append') {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.dataset.postId = post.id;
    const isStarred = currentUser?.star?.includes(post.id);

    postEl.innerHTML = `
        <div class="post-header">
            <a href="#profile/${author.id}" class="post-author">${escapeHTML(author.name)}#${author.id}</a>
            <span class="post-time">${new Date(post.time).toLocaleString('ja-JP')}</span>
        </div>
        <div class="post-content"><p>${escapeHTML(post.content)}</p></div>
        <div class="post-actions">
            <button class="like-button" onclick="handleLike('${post.id}', this)">❤️ <span>${post.like}</span></button>
            <button class="star-button ${isStarred ? 'starred' : ''}" onclick="handleStar('${post.id}', this)">⭐ <span>${post.star}</span></button>
        </div>
    `;
    if (mode === 'prepend') container.prepend(postEl);
    else container.appendChild(postEl);
}

// --- 6. プロフィール画面 ---
async function showProfileScreen(userId) {
    showScreen('profile-screen');
    showLoading(true);
    const profileHeader = document.getElementById('profile-header');
    const profileTabs = document.getElementById('profile-tabs');
    const profileContent = document.getElementById('profile-content');
    profileHeader.innerHTML = '';
    profileTabs.innerHTML = '';
    profileContent.innerHTML = '読み込み中...';

    const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
    if (error || !user) {
        profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>';
        showLoading(false);
        return;
    }
    
    // フォロワー数を取得
    const { count: followerCount } = await supabase.from('user').select('id', { count: 'exact', head: true }).contains('follow', [userId]);

    // ヘッダーをレンダリング
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
    
    // フォローボタン
    if (userId !== currentUser.id) {
        const followButton = document.createElement('button');
        const isFollowing = currentUser.follow?.includes(userId);
        followButton.textContent = isFollowing ? 'フォロー中' : 'フォロー';
        followButton.onclick = () => handleFollowToggle(userId, followButton);
        document.getElementById('follow-button-container').appendChild(followButton);
    }

    // タブをレンダリング
    profileTabs.innerHTML = `
        <button class="tab-button active" data-tab="posts">投稿</button>
        <button class="tab-button" data-tab="stars">Star</button>
        <button class="tab-button" data-tab="follows">フォロー</button>
    `;

    // タブのイベントリスナー
    profileTabs.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', async () => {
            profileTabs.querySelector('.active').classList.remove('active');
            button.classList.add('active');
            await loadProfileTabContent(user, button.dataset.tab);
        });
    });

    await loadProfileTabContent(user, 'posts'); // 初期タブ
    showLoading(false);
}

async function loadProfileTabContent(user, tab) {
    const contentDiv = document.getElementById('profile-content');
    contentDiv.innerHTML = '読み込み中...';
    showLoading(true);
    
    switch(tab) {
        case 'posts':
            const { data: posts } = await supabase.from('post').select('*, user(id, name)').eq('userid', user.id).order('time', { ascending: false });
            contentDiv.innerHTML = '';
            if (posts && posts.length > 0) {
                posts.forEach(p => renderPost(p, user, contentDiv));
            } else {
                contentDiv.innerHTML = '<p>まだ投稿がありません。</p>';
            }
            break;
        case 'stars':
            if (!user.settings.show_star && user.id !== currentUser.id) {
                contentDiv.innerHTML = '<p class="locked">🔒 このユーザーのStarは非公開です。</p>';
                break;
            }
            if (!user.star || user.star.length === 0) {
                contentDiv.innerHTML = '<p>Starを付けた投稿はありません。</p>';
                break;
            }
            const { data: starredPosts } = await supabase.from('post').select('*, user(id, name)').in('id', user.star).order('time', { ascending: false });
            contentDiv.innerHTML = '';
            starredPosts?.forEach(p => renderPost(p, p.user, contentDiv));
            break;
        case 'follows':
            if (!user.settings.show_follow && user.id !== currentUser.id) {
                contentDiv.innerHTML = '<p class="locked">🔒 このユーザーのフォローリストは非公開です。</p>';
                break;
            }
            if (!user.follow || user.follow.length === 0) {
                contentDiv.innerHTML = '<p>誰もフォローしていません。</p>';
                break;
            }
            const { data: followUsers } = await supabase.from('user').select('id, name').in('id', user.follow);
            contentDiv.innerHTML = '';
            followUsers?.forEach(u => {
                contentDiv.innerHTML += `
                    <div class="profile-card">
                        <div class="profile-card-info">
                            <a href="#profile/${u.id}">
                                <span class="name">${escapeHTML(u.name)}</span>
                                <span class="id">#${u.id}</span>
                            </a>
                        </div>
                    </div>
                `;
            });
            break;
    }
    showLoading(false);
}

// --- 7. 投稿・インタラクション処理 (Post/Like/Star/Follow) ---
async function handlePostSubmit() {
    const content = postContentTextarea.value.trim();
    if (!content) return alert('内容を入力してください。');
    if (!currentUser) return alert('ログインしていません。');

    postSubmitButton.disabled = true;
    postSubmitButton.textContent = '投稿中...';

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
        postContentTextarea.value = '';
        // リアルタイム更新で自分の投稿も反映されるので、ここでは手動で追加しない
    }
    postSubmitButton.disabled = false;
    postSubmitButton.textContent = 'ポスト';
}

window.handleLike = async function(postId, button) { /* ... 前回と同じ ... */ };
window.handleStar = async function(postId, button) { /* ... 前回と同じ ... */ };

async function handleFollowToggle(targetUserId, button) {
    button.disabled = true;
    const isFollowing = currentUser.follow?.includes(targetUserId);
    const updatedFollows = isFollowing 
        ? currentUser.follow.filter(id => id !== targetUserId)
        : [...(currentUser.follow || []), targetUserId];
    
    const { error } = await supabase.from('user').update({ follow: updatedFollows }).eq('id', currentUser.id);

    if (error) {
        alert('フォロー状態の更新に失敗しました。');
        console.error('Follow toggle error:', error);
    } else {
        currentUser.follow = updatedFollows;
        setCurrentUser(currentUser);
        button.textContent = !isFollowing ? 'フォロー中' : 'フォロー';

        // フォロワー数をリアルタイムで更新
        const followerCountSpan = document.querySelector('#follower-count strong');
        if (followerCountSpan) {
            let currentCount = parseInt(followerCountSpan.textContent);
            followerCountSpan.textContent = isFollowing ? currentCount - 1 : currentCount + 1;
        }
    }
    button.disabled = false;
}

// --- 8. 設定画面 ---
function showSettingsScreen() { /* ... 前回と同じ ... */ };
async function handleUpdateSettings(event) { /* ... 前回と同じ ... */ };

// --- 9. Supabaseリアルタイム購読 ---
function subscribeToChanges() {
    if (realtimeChannel) return; // 既に購読中なら何もしない

    realtimeChannel = supabase.channel('public:post')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post' }, async payload => {
        console.log('New post received!', payload.new);
        // タイムライン画面を表示している場合のみ追加
        if (document.getElementById('main-screen').classList.contains('hidden')) return;

        const { data: author } = await supabase.from('user').select('id, name').eq('id', payload.new.userid).single();
        if (author) {
            renderPost(payload.new, author, timelineDiv, 'prepend');
        }
      })
      .subscribe();
}

// --- 10. ヘルパー関数 ---
function escapeHTML(str) { /* ... 前回と同じ ... */ };
// Like/Starのグローバル関数は前回と同じなので省略
window.handleLike = async function(postId, button) {
    if (!currentUser) return alert('ログインしてください。');
    button.disabled = true;
    const { error } = await supabase.rpc('increment_like', { post_id_in: postId });
    if (error) {
        alert('Likeに失敗しました。');
    } else {
        const countSpan = button.querySelector('span');
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
    }
    button.disabled = false;
}

window.handleStar = async function(postId, button) {
    if (!currentUser) return alert('ログインしてください。');

    button.disabled = true;
    const isStarred = currentUser.star.includes(postId);
    const updatedStars = isStarred ? currentUser.star.filter(id => id !== postId) : [...currentUser.star, postId];
    const incrementValue = isStarred ? -1 : 1;

    const { error: userError } = await supabase.from('user').update({ star: updatedStars }).eq('id', currentUser.id);
    if (userError) {
        alert('Starの更新に失敗しました。');
        button.disabled = false;
        return;
    }
    
    const { error: postError } = await supabase.rpc('increment_star', { post_id_in: postId, increment_val: incrementValue });
    if (postError) {
        await supabase.from('user').update({ star: currentUser.star }).eq('id', currentUser.id);
        alert('Starの更新に失敗しました。');
    } else {
        currentUser.star = updatedStars;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        const countSpan = button.querySelector('span');
        countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
        button.classList.toggle('starred', !isStarred);
    }
    button.disabled = false;
}

function showSettingsScreen() {
    if (!currentUser) return;
    document.getElementById('setting-username').value = currentUser.name;
    document.getElementById('setting-me').value = currentUser.me || '';
    document.getElementById('setting-show-follow').checked = currentUser.settings.show_follow;
    document.getElementById('setting-show-star').checked = currentUser.settings.show_star;
    document.getElementById('setting-show-scid').checked = currentUser.settings.show_scid;
    showScreen('settings-screen');
}

async function handleUpdateSettings(event) {
    event.preventDefault();
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
        router();
    }
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

// --- 11. イベントリスナー & 初期化処理 ---
window.addEventListener('DOMContentLoaded', () => {
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '';
        router();
    });
    settingsButton.addEventListener('click', () => {
        window.location.hash = 'settings';
        router();
    });
    postSubmitButton.addEventListener('click', handlePostSubmit);
    settingsForm.addEventListener('submit', handleUpdateSettings);
    
    window.addEventListener('hashchange', router);
    
    checkSession();
});