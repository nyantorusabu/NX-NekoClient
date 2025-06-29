window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初期設定 & グローバル変数 ---
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let currentUser = null; let realtimeChannel = null; let currentTimelineTab = 'foryou';
    let replyingTo = null;

    // --- 2. アイコンSVG定義 ▼▼▼ [修正点7] 枠線のみのアイコンに変更 ▼▼▼ ---
    const ICONS = {
        home: `<svg viewBox="0 0 24 24"><g><path d="M12 2.148L2.735 8.163v11.233h18.53V8.163L12 2.148zM19.998 18.06V8.625l-7.998-5.332-7.999 5.332v9.435h15.997z"></path><path d="M9.458 11.22c0 1.406 1.14 2.544 2.542 2.544s2.542-1.138 2.542-2.544-1.14-2.543-2.542-2.543-2.542 1.137-2.542 2.543z"></path></g></svg>`, // Home (feather: home)
        explore: `<svg viewBox="0 0 24 24"><g><path d="M11 4C7.13 4 4 7.13 4 11s3.13 7 7 7c1.76 0 3.39-.7 4.6-1.85L19 20.24l1.24-1.24-3.44-3.44C17.3 14.39 18 12.76 18 11c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5z"></path></g></svg>`, // Search (feather: search)
        notifications: `<svg viewBox="0 0 24 24"><g><path d="M18 16.7L19.46 20H4.53L6 16.7V10c0-3.24 2.12-5.96 5-6.7V2h2v1.3c2.88.74 5 3.5 5 6.7v6.7zM12 22c1.33 0 2.42-1.08 2.42-2.42H9.58C9.58 20.92 10.67 22 12 22z"></path></g></svg>`, // Bell (feather: bell)
        likes: `<svg viewBox="0 0 24 24"><g><path d="M20.88 5.61a5.55 5.55 0 0 0-7.83 0L12 6.66l-1.05-1.05a5.55 5.55 0 0 0-7.83 0 5.63 5.63 0 0 0 0 7.86L12 21.46l8.88-8.88a5.63 5.63 0 0 0 0-7.86z"></path></g></svg>`, // Heart (feather: heart)
        stars: `<svg viewBox="0 0 24 24"><g><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.27l-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01L12 2z"></path></g></svg>`, // Star (feather: star)
        profile: `<svg viewBox="0 0 24 24"><g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></g></svg>`, // User (feather: user)
        settings: `<svg viewBox="0 0 24 24"><g><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82-.33V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V12a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></g></svg>`, // Settings (feather: settings)
    };
    // ▲▲▲ [修正点7] ここまで ▲▲▲

    // --- 3. DOM要素の取得 ---
    const DOM = {
        navMenuTop: document.getElementById('nav-menu-top'),
        navMenuBottom: document.getElementById('nav-menu-bottom'),
        pageHeader: document.getElementById('page-header'),
        screens: document.querySelectorAll('.screen'),
        postFormContainer: document.querySelector('.post-form-container'),
        postModal: document.getElementById('post-modal'),
        timeline: document.getElementById('timeline'),
        exploreContent: document.getElementById('explore-content'),
        notificationsContent: document.getElementById('notifications-content'),
        likesContent: document.getElementById('likes-content'),
        starsContent: document.getElementById('stars-content'),
        postDetailContent: document.getElementById('post-detail-content'),
        searchResultsScreen: document.getElementById('search-results-screen'), // search-results-contentではなくscreen
        searchResultsContent: document.getElementById('search-results-content'), // コンテンツ表示用
        loadingOverlay: document.getElementById('loading-overlay'),
        loginBanner: document.getElementById('login-banner'),
        rightSidebar: {
            recommendations: document.getElementById('recommendations-widget-container'),
            searchWidget: document.getElementById('right-sidebar-search-widget-container') // ▼▼▼ [修正点8] 右サイドバー検索ウィジェット用コンテナ ▼▼▼
        }
    };

    // --- 4. ユーティリティ関数 ---
    function showLoading(show) { DOM.loadingOverlay.classList.toggle('hidden', !show); }
    function showScreen(screenId) {
        DOM.screens.forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId)?.classList.remove('hidden');
    }
    function escapeHTML(str) { if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

    // ▼▼▼ [修正点6] フォローボタンの状態を更新するヘルパー関数 ▼▼▼
    function updateFollowButtonState(buttonElement, isFollowing) {
        buttonElement.classList.remove('follow-button-not-following', 'follow-button-following', 'follow-button-unfollow-hover');
        if (isFollowing) {
            buttonElement.textContent = 'フォロー中';
            buttonElement.classList.add('follow-button-following');
            // ホバー時に「フォロー解除」を表示するロジック
            buttonElement.onmouseenter = () => {
                buttonElement.textContent = 'フォロー解除';
                buttonElement.classList.add('follow-button-unfollow-hover');
            };
            buttonElement.onmouseleave = () => {
                buttonElement.textContent = 'フォロー中';
                buttonElement.classList.remove('follow-button-unfollow-hover');
            };
        } else {
            buttonElement.textContent = 'フォロー';
            buttonElement.classList.add('follow-button-not-following');
            // フォローしていない場合はホバー時の特殊な挙動をリセット
            buttonElement.onmouseenter = null;
            buttonElement.onmouseleave = null;
        }
        buttonElement.disabled = false;
    }
    // ▲▲▲ [修正点6] ここまで ▲▲▲

    // ▼▼▼ [修正点3] 通知を送信する関数 ▼▼▼
    async function sendNotification(recipientId, message) {
        if (!recipientId || !message || recipientId === currentUser.id) return; // 自分自身への通知は送らない
        try {
            // 受信者の現在の通知リストを取得
            const { data: userData, error: fetchError } = await supabase.from('user')
                .select('notice')
                .eq('id', recipientId)
                .single();

            if (fetchError || !userData) {
                console.error('通知受信者の情報取得に失敗:', fetchError);
                return;
            }

            // 新しい通知を先頭に追加（最大通知数を考慮するならここで制御）
            const currentNotices = userData.notice || [];
            const updatedNotices = [message, ...currentNotices].slice(0, 50); // 最新50件まで保持

            const { error: updateError } = await supabase.from('user')
                .update({ notice: updatedNotices })
                .eq('id', recipientId);

            if (updateError) {
                console.error('通知の更新に失敗:', updateError);
            }
        } catch (e) {
            console.error('通知送信中にエラー発生:', e);
        }
    }
    // ▲▲▲ [修正点3] ここまで ▲▼▼

    // --- 5. ルーティングと画面管理 ---
    async function router() {
        updateNavAndSidebars();
        const hash = window.location.hash || '#';
        showLoading(true);
        try {
            if (hash.startsWith('#post/')) await showPostDetail(hash.substring(6));
            else if (hash.startsWith('#profile/')) await showProfileScreen(parseInt(hash.substring(9)));
            else if (hash.startsWith('#search/')) await showSearchResults(decodeURIComponent(hash.substring(8)));
            else if (hash === '#settings' && currentUser) await showSettingsScreen();
            else if (hash === '#explore') await showExploreScreen();
            else if (hash === '#notifications' && currentUser) await showNotificationsScreen();
            else if (hash === '#likes' && currentUser) await showLikesScreen();
            else if (hash === '#stars' && currentUser) await showStarsScreen();
            else await showMainScreen();
        } catch (error) {
            console.error("Routing error:", error);
            DOM.pageHeader.innerHTML = `<h2>エラー</h2>`;
            showScreen('main-screen');
            DOM.timeline.innerHTML = `<p class="error-message">ページの読み込み中にエラーが発生しました。</p>`;
        } finally {
            showLoading(false);
        }
    }

    // --- 6. ナビゲーションとサイドバー ---
    function updateNavAndSidebars() {
        const hash = window.location.hash || '#';
        const menuItems = [
            { name: 'ホーム', hash: '#', icon: ICONS.home },
            { name: '検索', hash: '#explore', icon: ICONS.explore }
        ];
        if (currentUser) {
            menuItems.push(
                { name: '通知', hash: '#notifications', icon: ICONS.notifications },
                { name: 'いいね', hash: '#likes', icon: ICONS.likes },
                { name: 'お気に入り', hash: '#stars', icon: ICONS.stars },
                { name: 'プロフィール', hash: `#profile/${currentUser.id}`, icon: ICONS.profile },
                { name: '設定', hash: '#settings', icon: ICONS.settings }
            );
        }
        DOM.navMenuTop.innerHTML = menuItems.map(item => `<a href="${item.hash}" class="nav-item ${hash === item.hash ? 'active' : ''}">${item.icon}<span>${item.name}</span></a>`).join('');
        if(currentUser) DOM.navMenuTop.innerHTML += `<button class="nav-item nav-item-post"><span>ポスト</span></button>`;
        
        DOM.navMenuBottom.innerHTML = currentUser ?
            `<button id="account-button" class="nav-item account-button">
                <img src="https://trampoline.turbowarp.org/avatars/by-username/${currentUser.scid}" class="user-icon" alt="${currentUser.name}'s icon">
                <div class="account-info">
                    <span class="name">${escapeHTML(currentUser.name)}</span>
                    <span class="id">#${currentUser.id}</span>
                </div>
            </button>` :
            `<button id="login-button" class="nav-item"><span>ログイン</span></button>`;
        
        DOM.loginBanner.classList.toggle('hidden', !!currentUser);
        DOM.navMenuTop.querySelectorAll('a.nav-item').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = link.getAttribute('href'); }));
        DOM.navMenuBottom.querySelector('button')?.addEventListener('click', currentUser ? handleLogout : goToLoginPage);
        DOM.navMenuTop.querySelector('.nav-item-post')?.addEventListener('click', () => openPostModal());
        loadRightSidebar();
    }
    async function loadRightSidebar() {
        // ▼▼▼ [修正点8] 右サイドバーに検索バーを追加 ▼▼▼
        DOM.rightSidebar.searchWidget.innerHTML = `
            <div class="sidebar-search-widget">
                ${ICONS.explore}
                <input type="search" id="sidebar-search-input" placeholder="検索">
            </div>`;
        document.getElementById('sidebar-search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    window.location.hash = `#search/${encodeURIComponent(query)}`;
                }
            }
        });
        // ▲▲▲ [修正点8] ここまで ▼▼▼

        const { data, error } = await supabase.rpc('get_recommended_users', { count_limit: 3 });
        if (error || !data || data.length === 0) { DOM.rightSidebar.recommendations.innerHTML = ''; return; }
        let recHTML = '<div class="widget-title">おすすめユーザー</div>';
        recHTML += data.map(user => {
            const isFollowing = currentUser?.follow?.includes(user.id);
            const btnClass = isFollowing ? 'follow-button-following' : 'follow-button-not-following';
            const btnText = isFollowing ? 'フォロー中' : 'フォロー';

            return `
                <div class="widget-item recommend-user">
                    <a href="#profile/${user.id}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:0.5rem;">
                        <img src="https://trampoline.turbowarp.org/avatars/by-username/${user.scid}" style="width:40px;height:40px;border-radius:50%;" alt="${user.name}'s icon">
                        <div>
                            <span>${escapeHTML(user.name)}</span>
                            <small style="color:var(--secondary-text-color); display:block;">#${user.id}</small>
                        </div>
                    </a>
                    ${currentUser && currentUser.id !== user.id ? 
                        `<button class="${btnClass}" data-user-id="${user.id}">${btnText}</button>` : ''}
                </div>`;
        }).join('');
        DOM.rightSidebar.recommendations.innerHTML = `<div class="sidebar-widget">${recHTML}</div>`;

        DOM.rightSidebar.recommendations.querySelectorAll('.recommend-user button').forEach(button => {
            const userId = parseInt(button.dataset.userId);
            if (!isNaN(userId)) {
                // ▼▼▼ [修正点5,6] updateFollowButtonStateを呼び出し、一貫した挙動にする ▼▼▼
                const isFollowing = currentUser?.follow?.includes(userId);
                updateFollowButtonState(button, isFollowing); // 初期状態をセット
                button.onclick = () => handleFollowToggle(userId, button);
                // ▲▲▲ [修正点5,6] ここまで ▼▼▼
            }
        });
    }

    // --- 7. 認証とセッション ---
    function goToLoginPage() { window.location.href = 'login.html'; }
    function handleLogout() {
        if(!confirm("ログアウトしますか？")) return;
        currentUser = null; localStorage.removeItem('currentUser');
        if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
        window.location.hash = '#';
        router();
    }
    function checkSession() {
        const userJson = localStorage.getItem('currentUser');
        currentUser = userJson ? JSON.parse(userJson) : null;
        if(currentUser) subscribeToChanges();
        router();
    }

    // --- 8. ポスト関連のUIとロジック ---
    function openPostModal(replyInfo = null) {
        if (!currentUser) return goToLoginPage();
        DOM.postModal.classList.remove('hidden');
        const modalContainer = DOM.postModal.querySelector('.post-form-container-modal');
        modalContainer.innerHTML = `
            <div class="post-form">
                <img src="https://trampoline.turbowarp.org/avatars/by-username/${currentUser.scid}" class="user-icon" alt="your icon">
                <div class="form-content">
                    <div id="reply-info-modal" class="hidden" style="margin-bottom: 0.5rem; color: var(--secondary-text-color);"></div>
                    <textarea id="post-content-modal" placeholder="ポストを入力" maxlength="280"></textarea>
                    <div class="post-form-actions"><button id="post-submit-button-modal">ポスト</button></div>
                </div>
            </div>`;
        const textarea = document.getElementById('post-content-modal');
        if (replyInfo) {
            replyingTo = replyInfo;
            const replyInfoDiv = document.getElementById('reply-info-modal');
            replyInfoDiv.innerHTML = `<span>@${replyInfo.name}に返信中</span>`;
            replyInfoDiv.classList.remove('hidden');
        }
        modalContainer.querySelector('#post-submit-button-modal').addEventListener('click', () => handlePostSubmit(true));
        DOM.postModal.querySelector('.modal-close-btn').onclick = closePostModal;
        textarea.focus();
        textarea.addEventListener('keydown', handleCtrlEnter);
    }
    function closePostModal() {
        DOM.postModal.classList.add('hidden');
        replyingTo = null;
        const textarea = document.getElementById('post-content-modal');
        if (textarea) textarea.removeEventListener('keydown', handleCtrlEnter);
    }
    const handleCtrlEnter = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.target.closest('.post-form').querySelector('button').click();
        }
    };
    
    async function handlePostSubmit(isModal = false) {
        if (!currentUser) return alert("ログインが必要です。");
        const contentElId = isModal ? 'post-content-modal' : 'post-content';
        const buttonId = isModal ? 'post-submit-button-modal' : 'post-submit-button';
        const contentEl = document.getElementById(contentElId);
        const content = contentEl.value.trim();
        if (!content) return alert('内容を入力してください。');
        const button = document.getElementById(buttonId);
        button.disabled = true; button.textContent = '投稿中...';
        try {
            const postData = { userid: currentUser.id, content, reply_id: replyingTo?.id || null };
            const { data: newPost, error } = await supabase.from('post').insert(postData).select().single(); // 投稿したポスト情報を取得
            if(error) throw error;
            
            // ▼▼▼ [修正点3] 返信の場合に通知を送信 ▼▼▼
            if (newPost.reply_id && newPost.reply_to?.user?.id) {
                const parentPostAuthorId = newPost.reply_to.user.id;
                sendNotification(parentPostAuthorId, `${escapeHTML(currentUser.name)}さんがあなたのポストに返信しました。`);
            }
            // ▲▲▲ [修正点3] ここまで ▼▼▼

            // 投稿成功後、リアルタイム更新が走るので、ここではUIを直接更新しない
            if (isModal) closePostModal(); else contentEl.value = '';
            clearReply();
        } catch(e) { console.error(e); alert('ポストに失敗しました。'); }
        finally { button.disabled = false; button.textContent = 'ポスト'; }
    }

    async function renderPost(post, author, container, prepend = false) {
        if (!post || !author) return; // 無効なポストやユーザーデータをスキップ
        const postEl = document.createElement('div'); postEl.className = 'post';
        postEl.onclick = (e) => { if (!e.target.closest('button, a, .post-menu-btn')) window.location.hash = `#post/${post.id}`; };
        const isLiked = currentUser?.like?.includes(post.id);
        const isStarred = currentUser?.star?.includes(post.id);
        let replyHTML = post.reply_to?.user ? `<div class="replying-to"><a href="#profile/${post.reply_to.user.id}">@${escapeHTML(post.reply_to.user.name)}</a> さんに返信</div>` : '';
        const menuHTML = currentUser?.id === post.userid ? `<button class="post-menu-btn" onclick="event.stopPropagation(); window.togglePostMenu('${post.id}')">…</button><div id="menu-${post.id}" class="post-menu hidden"><button class="delete-btn" onclick="window.deletePost('${post.id}')">削除</button></div>` : '';
        const { count: replyCountData, error: replyCountError } = await supabase.from('post').select('id', {count: 'exact', head: true}).eq('reply_id', post.id);
        const replyCount = replyCountError ? '?' : (replyCountData || 0);

        const actionsHTML = currentUser ? `
            <div class="post-actions">
                <button class="reply-button" onclick="event.stopPropagation(); window.handleReplyClick('${post.id}', '${escapeHTML(author.name)}')" title="返信">🗨 <span>${replyCount}</span></button>
                <button class="like-button ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); window.handleLike(this, '${post.id}')"><span class="icon">${isLiked ? '♥' : '♡'}</span> <span>${post.like}</span></button>
                <button class="star-button ${isStarred ? 'starred' : ''}" onclick="event.stopPropagation(); window.handleStar(this, '${post.id}')"><span class="icon">${isStarred ? '★' : '☆'}</span> <span>${post.star}</span></button>
            </div>` : '';
        postEl.innerHTML = `
            <img src="https://trampoline.turbowarp.org/avatars/by-username/${author.scid}" class="user-icon" alt="${author.name}'s icon">
            <div class="post-main">
                ${replyHTML}
                <div class="post-header">
                    <a href="#profile/${author.id}" class="post-author">${escapeHTML(author.name || '不明')}</a>
                    <span class="post-time">#${author.id || '????'} · ${new Date(post.time).toLocaleString('ja-JP')}</span>
                    ${menuHTML}
                </div>
                <div class="post-content"><p>${escapeHTML(post.content)}</p></div>
                ${actionsHTML}
            </div>`;
        if (prepend) container.prepend(postEl); else container.appendChild(postEl);
    }
    
    // --- 9. ページごとの表示ロジック ---
    async function showMainScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">ホーム</h2>`;
        showScreen('main-screen');
        if (currentUser) {
            DOM.postFormContainer.innerHTML = `<div class="post-form"><img src="https://trampoline.turbowarp.org/avatars/by-username/${currentUser.scid}" class="user-icon" alt="your icon"><div class="form-content"><div id="reply-info" class="hidden" style="margin-bottom: 0.5rem; color: var(--secondary-text-color);"></div><textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea><div class="post-form-actions"><button id="post-submit-button">ポスト</button></div></div></div>`;
            const textarea = document.getElementById('post-content');
            textarea.addEventListener('keydown', handleCtrlEnter);
            DOM.postFormContainer.querySelector('#post-submit-button').addEventListener('click', () => handlePostSubmit(false));
        } else { DOM.postFormContainer.innerHTML = ''; }
        document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
        await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
    }

    async function showExploreScreen() {
        DOM.pageHeader.innerHTML = `
            <div class="header-search-bar">
                <input type="search" id="search-input" placeholder="検索">
                <button id="search-button">
                    ${ICONS.explore}
                </button>
            </div>`;
        document.getElementById('search-button').onclick = () => performSearch();
        document.getElementById('search-input').onkeydown = (e) => { if(e.key === 'Enter') performSearch(); };
        showScreen('explore-screen');
        await loadTimeline('foryou', DOM.exploreContent); // 発見ページでは「すべて」を表示
    }

    // ▼▼▼ [修正点1, 2] 検索機能の拡張（ユーザーとポストの部分一致検索） ▼▼▼
    async function performSearch() {
        const query = document.getElementById('search-input').value.trim() || document.getElementById('sidebar-search-input').value.trim();
        if (!query) return;
        window.location.hash = `#search/${encodeURIComponent(query)}`;
    }

    async function showSearchResults(query) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">検索結果: "${escapeHTML(query)}"</h2>`;
        showScreen('search-results-screen');
        const contentDiv = DOM.searchResultsContent;
        contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            let resultsHTML = '';

            // ユーザー検索
            const { data: users, error: userError } = await supabase.from('user')
                .select('*')
                .or(`name.ilike.%${query}%,me.ilike.%${query}%`) // 部分一致検索
                .order('id', { ascending: true }) // ユーザーIDでソート
                .limit(10); // 上位10件など、表示数を制限

            if (userError) console.error("ユーザー検索エラー:", userError);
            if (users && users.length > 0) {
                resultsHTML += `<h3>ユーザー (${users.length}件)</h3>`;
                resultsHTML += users.map(u => `
                    <div class="profile-card widget-item">
                        <div class="profile-card-info" style="display:flex; align-items:center; gap:0.8rem;">
                            <a href="#profile/${u.id}" style="display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;">
                                <img src="https://trampoline.turbowarp.org/avatars/by-username/${u.scid}" style="width:48px; height:48px; border-radius:50%;" alt="${u.name}'s icon">
                                <div>
                                    <span class="name" style="font-weight:700;">${escapeHTML(u.name)}</span>
                                    <span class="id" style="color:var(--secondary-text-color);">#${u.id}</span>
                                    <p class="me" style="margin:0.2rem 0 0;">${escapeHTML(u.me || '')}</p>
                                </div>
                            </a>
                        </div>
                    </div>`).join('');
            } else {
                resultsHTML += `<p style="padding:1rem; text-align:center;">ユーザーは見つかりませんでした。</p>`;
            }

            // ポスト検索
            const { data: posts, error: postError } = await supabase.from('post')
                .select('*, user(*), reply_to:reply_id(*, user(*))')
                .ilike('content', `%${query}%`) // 部分一致検索
                .order('time', { ascending: false });

            if (postError) console.error("ポスト検索エラー:", postError);
            if (posts && posts.length > 0) {
                resultsHTML += `<h3>ポスト (${posts.length}件)</h3>`;
                contentDiv.innerHTML = resultsHTML; // ユーザー結果を先に表示
                for (const post of posts) {
                    await renderPost(post, post.user, contentDiv);
                }
            } else {
                resultsHTML += `<p style="padding:1rem; text-align:center;">ポストは見つかりませんでした。</p>`;
                contentDiv.innerHTML = resultsHTML; // ポストがない場合も表示を更新
            }

            if ((!users || users.length === 0) && (!posts || posts.length === 0)) {
                contentDiv.innerHTML = `<p style="padding:2rem; text-align:center;">「${escapeHTML(query)}」に一致する結果は見つかりませんでした。</p>`;
            }

        } catch (e) {
            contentDiv.innerHTML = `<p class="error-message">検索結果の読み込みに失敗しました。</p>`;
            console.error("検索結果表示エラー:", e);
        }
    }
    // ▲▲▲ [修正点1, 2] ここまで ▼▼▼

    async function showNotificationsScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">通知</h2>`;
        showScreen('notifications-screen');
        const contentDiv = DOM.notificationsContent; contentDiv.innerHTML = '';
        
        // ▼▼▼ [修正点4] 通知表示を最新順にし、空の場合のメッセージを追加 ▼▼▼
        if (currentUser.notice?.length) {
            currentUser.notice.reverse().forEach(n => { // 最新の通知を上に表示するためreverse()
                const noticeEl = document.createElement('div'); noticeEl.className = 'widget-item';
                noticeEl.textContent = n;
                contentDiv.appendChild(noticeEl);
            });
        } else { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">通知はまだありません。</p>'; }
        // ▲▲▲ [修正点4] ここまで ▼▼▼
    }
    async function showLikesScreen() { DOM.pageHeader.innerHTML = `<h2 id="page-title">いいね</h2>`; showScreen('likes-screen'); await loadPostsByIds(currentUser.like, DOM.likesContent, "いいねしたポストはまだありません。"); }
    async function showStarsScreen() { DOM.pageHeader.innerHTML = `<h2 id="page-title">お気に入り</h2>`; showScreen('stars-screen'); await loadPostsByIds(currentUser.star, DOM.starsContent, "お気に入りに登録したポストはまだありません。"); }
    async function showPostDetail(postId) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">ポスト</h2>`;
        showScreen('post-detail-screen');
        const contentDiv = DOM.postDetailContent; contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            const { data: post, error } = await supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').eq('id', postId).single();
            if (error || !post) throw new Error('ポストが見つかりません。');
            contentDiv.innerHTML = '';
            await renderPost(post, post.user, contentDiv); // 親ポストの表示
            
            // ▼▼▼ [修正点3] ポストへの返信を取得して表示 ▼▼▼
            const { data: replies, error: repliesError } = await supabase.from('post')
                .select('*, user(*), reply_to:reply_id(*, user(*))')
                .eq('reply_id', postId)
                .order('time', { ascending: true }); // 返信は時系列順に表示

            if (repliesError) {
                console.error("返信の読み込みに失敗しました:", repliesError);
            } else if (replies?.length > 0) {
                const repliesHeader = document.createElement('h3');
                repliesHeader.textContent = '返信';
                repliesHeader.style.padding = '1rem';
                repliesHeader.style.borderBottom = '1px solid var(--border-color)';
                repliesHeader.style.margin = '0';
                repliesHeader.style.fontSize = '1.2rem';
                contentDiv.appendChild(repliesHeader);

                for (const reply of replies) {
                    await renderPost(reply, reply.user, contentDiv);
                }
            }
            // ▲▲▲ [修正点3] ここまで ▼▼▼
        } catch (err) { contentDiv.innerHTML = `<p class="error-message">${err.message}</p>`; }
    }
    
    // --- 10. コンテンツ読み込み & レンダリング ---
    async function loadPostsByIds(ids, container, emptyMessage) {
        showLoading(true); container.innerHTML = '';
        try {
            if (!ids || ids.length === 0) { container.innerHTML = `<p style="padding: 2rem; text-align:center;">${emptyMessage}</p>`; return; }
            // nullをフィルタリングしてUUIDではないIDを除外（理論上は不要だが念のため）
            const validIds = ids.filter(id => id !== null && typeof id === 'string' && id.length === 36 && id.includes('-'));
            if (validIds.length === 0) { container.innerHTML = `<p style="padding: 2rem; text-align:center;">${emptyMessage}</p>`; return; }

            const { data, error } = await supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').in('id', validIds).order('time', { ascending: false });
            if (error) throw error;
            if (!data?.length) { container.innerHTML = `<p style="padding: 2rem; text-align:center;">${emptyMessage}</p>`; return; } // データが空の場合
            for (const p of data) { await renderPost(p, p.user, container); }
        } catch (err) { container.innerHTML = `<p class="error-message">ポストの読み込みに失敗しました。</p>`; console.error("loadPostsByIds error:", err); }
        finally { showLoading(false); }
    }
    async function switchTimelineTab(tab) {
        if (tab === 'following' && !currentUser) return;
        currentTimelineTab = tab;
        document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        await loadTimeline(tab, DOM.timeline);
    }
    async function loadTimeline(tab, container) {
        showLoading(true); container.innerHTML = '';
        try {
            // ▼▼▼ [修正点4] is('reply_id', null) を削除し、返信も表示対象にする ▼▼▼
            let query = supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').order('time', { ascending: false }).limit(50);
            // ▲▲▲ [修正点4] ここまで ▼▼▼
            if (tab === 'following' && currentUser?.follow?.length) {
                query = query.in('userid', currentUser.follow);
            }
            const { data: posts, error } = await query;
            if (error) throw new Error('ポストの読み込みに失敗しました。');
            if (!posts?.length) { container.innerHTML = `<p style="padding: 2rem; text-align: center;">${tab === 'following' ? 'まだ誰もフォローしていません。' : 'まだポストがありません。'}</p>`; return; }
            for (const post of posts) { await renderPost(post, post.user || {}, container); }
        } catch(err) { container.innerHTML = `<p class="error-message">${err.message}</p>`; console.error("loadTimeline error:", err);}
        finally { showLoading(false); }
    }
    
    // --- 11. ユーザーアクション ---
    window.togglePostMenu = (postId) => document.getElementById(`menu-${postId}`).classList.toggle('hidden');
    window.deletePost = async (postId) => { if (!confirm('このポストを削除しますか？')) return; showLoading(true); try { const { error } = await supabase.from('post').delete().eq('id', postId); if (error) throw error; window.location.hash = '#'; router(); } catch(e) { alert('削除に失敗しました。'); } finally { showLoading(false); } };
    window.handleReplyClick = (postId, username) => { if (!currentUser) return alert("ログインが必要です。"); openPostModal({ id: postId, name: username }); };
    window.clearReply = () => { replyingTo = null; document.getElementById('reply-info')?.classList.add('hidden'); document.getElementById('reply-info-modal')?.classList.add('hidden'); };
    window.handleLike = async (button, postId) => {
        if (!currentUser) return alert("ログインが必要です。");
        button.disabled = true;
        const iconSpan = button.querySelector('.icon'), countSpan = button.querySelector('span:last-child');
        const isLiked = currentUser.like?.includes(postId);
        const updatedLikes = isLiked ? currentUser.like.filter(id => id !== postId) : [...(currentUser.like || []), postId];
        const incrementValue = isLiked ? -1 : 1;
        const { error: userError } = await supabase.from('user').update({ like: updatedLikes }).eq('id', currentUser.id);
        if (userError) { alert('いいねの更新に失敗しました。'); button.disabled = false; return; }
        const { error: postError } = await supabase.rpc('handle_like', { post_id: postId, increment_val: incrementValue });
        if (postError) {
            await supabase.from('user').update({ like: currentUser.like }).eq('id', currentUser.id);
            alert('いいね数の更新に失敗しました。');
        } else {
            currentUser.like = updatedLikes; localStorage.setItem('currentUser', JSON.stringify(currentUser));
            countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
            button.classList.toggle('liked', !isLiked);
            iconSpan.textContent = isLiked ? '♡' : '♥';
            // ▼▼▼ [修正点3] いいねの通知を送信 ▼▼▼
            const { data: postData } = await supabase.from('post').select('userid').eq('id', postId).single();
            if (postData?.userid) {
                sendNotification(postData.userid, `${escapeHTML(currentUser.name)}さんがあなたのポストにいいねしました。`);
            }
            // ▲▲▲ [修正点3] ここまで ▼▼▼
        }
        button.disabled = false;
    };
    window.handleStar = async (button, postId) => {
        if (!currentUser) return alert("ログインが必要です。");
        button.disabled = true;
        const iconSpan = button.querySelector('.icon'), countSpan = button.querySelector('span:last-child');
        const isStarred = currentUser.star?.includes(postId);
        const updatedStars = isStarred ? currentUser.star.filter(id => id !== postId) : [...(currentUser.star || []), postId];
        const incrementValue = isStarred ? -1 : 1;
        const { error: userError } = await supabase.from('user').update({ star: updatedStars }).eq('id', currentUser.id);
        if (userError) { alert('お気に入りの更新に失敗しました。'); button.disabled = false; return; }
        const { error: postError } = await supabase.rpc('increment_star', { post_id_in: postId, increment_val: incrementValue });
        if (postError) {
            await supabase.from('user').update({ star: currentUser.star }).eq('id', currentUser.id);
            alert('お気に入り数の更新に失敗しました。');
        } else {
            currentUser.star = updatedStars; localStorage.setItem('currentUser', JSON.stringify(currentUser));
            countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
            button.classList.toggle('starred', !isStarred);
            iconSpan.textContent = isStarred ? '★' : '☆'; // アイコンの表示も更新
            // ▼▼▼ [修正点3] お気に入りの通知を送信 ▼▼▼
            const { data: postData } = await supabase.from('post').select('userid').eq('id', postId).single();
            if (postData?.userid) {
                sendNotification(postData.userid, `${escapeHTML(currentUser.name)}さんがあなたのポストをお気に入りに登録しました。`);
            }
            // ▲▲▲ [修正点3] ここまで ▼▼▼
        }
        button.disabled = false;
    };
    // handleRecFollow は handleFollowToggle を呼び出すだけで良い
    window.handleRecFollow = async (userId, button) => { if (!currentUser) return alert("ログインが必要です。"); button.disabled = true; await handleFollowToggle(userId, button); };
    
    async function handleFollowToggle(targetUserId, button) {
        if (!currentUser) return alert("ログインが必要です。");
        button.disabled = true;
        const isFollowing = currentUser.follow?.includes(targetUserId);
        const updatedFollows = isFollowing ? currentUser.follow.filter(id => id !== targetUserId) : [...(currentUser.follow || []), targetUserId];
        
        const { error } = await supabase.from('user').update({ follow: updatedFollows }).eq('id', currentUser.id);
        if (error) { alert('フォロー状態の更新に失敗しました。'); } 
        else {
            currentUser.follow = updatedFollows; localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // ▼▼▼ [修正点5, 6] updateFollowButtonState を呼び出し、ボタンのスタイルとテキストを更新 ▼▼▼
            updateFollowButtonState(button, !isFollowing);
            // ▲▲▲ [修正点5, 6] ここまで ▼▼▼

            // ▼▼▼ [修正点3] フォロー/アンフォローの通知を送信 ▼▼▼
            if (!isFollowing) { // フォローした場合のみ通知
                sendNotification(targetUserId, `${escapeHTML(currentUser.name)}さんがあなたをフォローしました。`);
            }
            // ▲▲▲ [修正点3] ここまで ▼▼▼

            // フォロワー数表示の更新（RPC関数を再呼び出しして正確な数を取得）
            const followerCountSpan = document.querySelector('#follower-count strong');
            if (followerCountSpan) {
                const { data: newCount, error: newCountError } = await supabase.rpc('get_follower_count', { target_user_id: targetUserId });
                if (!newCountError) {
                    followerCountSpan.textContent = newCount;
                } else {
                    console.error("フォロワー数の再取得に失敗:", newCountError);
                    followerCountSpan.textContent = '?'; // 取得失敗時は '?' を表示
                }
            }
        }
        // updateFollowButtonStateがボタンのdisabled状態も処理するので、ここでは解除しない
    }

    // --- 12. プロフィール関連 ---
    async function showProfileScreen(userId) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">プロフィール</h2>`;
        showScreen('profile-screen');
        const profileHeader = document.getElementById('profile-header'), profileTabs = document.getElementById('profile-tabs');
        profileHeader.innerHTML = '<div class="spinner"></div>'; profileTabs.innerHTML = '';
        const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
        if (error || !user) { profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>'; return; }
        
        // フォロワー数取得をRPC関数に修正
        const { data: followerCountData, error: countError } = await supabase.rpc('get_follower_count', { target_user_id: userId });
        const followerCount = countError ? '?' : followerCountData;

        profileHeader.innerHTML = `
            <div class="header-top">
                <img src="https://trampoline.turbowarp.org/avatars/by-username/${user.scid}" class="user-icon-large" alt="${user.name}'s icon">
                <div id="follow-button-container" class="follow-button"></div>
            </div>
            <div class="profile-info">
                <h2>${escapeHTML(user.name)}</h2>
                <div class="user-id">#${user.id} ${user.settings.show_scid ? `(@${user.scid})` : ''}</div>
                <p class="user-me">${escapeHTML(user.me || '')}</p>
                <div class="user-stats">
                    <span><strong>${user.follow?.length || 0}</strong> フォロー中</span>
                    <span id="follower-count"><strong>${followerCount}</strong> フォロワー</span>
                </div>
            </div>`;
        if (currentUser && userId !== currentUser.id) {
            const followButton = document.createElement('button');
            followButton.id = `profile-follow-button-${userId}`;
            
            // ▼▼▼ [修正点6] プロフィールフォローボタンの初期状態とホバーイベントを設定 ▼▼▼
            const isFollowing = currentUser.follow?.includes(userId);
            updateFollowButtonState(followButton, isFollowing); // 初期状態をセット

            followButton.onclick = () => handleFollowToggle(userId, followButton);
            profileHeader.querySelector('#follow-button-container').appendChild(followButton);
            // ▲▲▲ [修正点6] ここまで ▼▼▼
        }
        profileTabs.innerHTML = `<button class="tab-button active" data-tab="posts">ポスト</button><button class="tab-button" data-tab="likes">いいね</button><button class="tab-button" data-tab="stars">お気に入り</button><button class="tab-button" data-tab="follows">フォロー中</button>`;
        profileTabs.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => loadProfileTabContent(user, button.dataset.tab)));
        await loadProfileTabContent(user, 'posts');
    }
    async function loadProfileTabContent(user, tab) {
        document.querySelectorAll('#profile-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        const contentDiv = document.getElementById('profile-content');
        contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            switch(tab) {
                case 'posts': await loadPostsByIds(user.post, contentDiv, "このユーザーはまだポストしていません。"); break;
                case 'likes': 
                    if (!user.settings.show_like && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのいいねは非公開です。</p>'; break; }
                    await loadPostsByIds(user.like, contentDiv, "このユーザーはまだいいねしたポストがありません。"); break;
                case 'stars':
                    if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのお気に入りは非公開です。</p>'; break; }
                    await loadPostsByIds(user.star, contentDiv, "このユーザーはまだお気に入りしたポストがありません。"); break;
                case 'follows':
                    if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのフォローリストは非公開です。</p>'; break; }
                    if (!user.follow?.length) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">誰もフォローしていません。</p>'; break; }
                    const { data: fUsers, error: fErr } = await supabase.from('user').select('id, name, me, scid').in('id', user.follow);
                    if(fErr) throw fErr; contentDiv.innerHTML = '';
                    fUsers?.forEach(u => {
                        const userCard = document.createElement('div'); userCard.className = 'profile-card';
                        userCard.innerHTML = `<div class="profile-card-info" style="display:flex; align-items:center; gap:0.8rem;"><a href="#profile/${u.id}" style="display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;"><img src="https://trampoline.turbowarp.org/avatars/by-username/${u.scid}" style="width:48px; height:48px; border-radius:50%;" alt="${u.name}'s icon"><div><span class="name" style="font-weight:700;">${escapeHTML(u.name)}</span><span class="id" style="color:var(--secondary-text-color);">#${u.id}</span><p class="me" style="margin:0.2rem 0 0;">${escapeHTML(u.me || '')}</p></div></a></div>`;
                        contentDiv.appendChild(userCard);
                    });
                    break;
            }
        } catch(err) { contentDiv.innerHTML = `<p class="error-message">コンテンツの読み込みに失敗しました。</p>`; console.error("loadProfileTabContent error:", err);}
    }
    async function showSettingsScreen() {
        if (!currentUser) return router();
        DOM.pageHeader.innerHTML = `<h2 id="page-title">設定</h2>`;
        showScreen('settings-screen');
        document.getElementById('settings-screen').innerHTML = `
            <form id="settings-form">
                <label for="setting-username">ユーザー名:</label>
                <input type="text" id="setting-username" required value="${escapeHTML(currentUser.name)}">
                <label for="setting-me">自己紹介:</label>
                <textarea id="setting-me">${escapeHTML(currentUser.me || '')}</textarea>
                <fieldset><legend>公開設定</legend>
                    <input type="checkbox" id="setting-show-like" ${currentUser.settings.show_like ? 'checked' : ''}><label for="setting-show-like">いいねしたポストを公開する</label><br>
                    <input type="checkbox" id="setting-show-follow" ${currentUser.settings.show_follow ? 'checked' : ''}><label for="setting-show-follow">フォローしている人を公開する</label><br>
                    <input type="checkbox" id="setting-show-star" ${currentUser.settings.show_star ? 'checked' : ''}><label for="setting-show-star">お気に入りを公開する</label><br>
                    <input type="checkbox" id="setting-show-scid" ${currentUser.settings.show_scid ? 'checked' : ''}><label for="setting-show-scid">Scratchアカウント名を公開する</label>
                </fieldset>
                <button type="submit">設定を保存</button>
            </form>`;
        document.getElementById('settings-form').addEventListener('submit', handleUpdateSettings);
    }
    async function handleUpdateSettings(event) {
        event.preventDefault(); if (!currentUser) return;
        const form = event.target;
        const updatedData = {
            name: form.querySelector('#setting-username').value.trim(),
            me: form.querySelector('#setting-me').value.trim(),
            settings: {
                show_like: form.querySelector('#setting-show-like').checked,
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
            currentUser = data; localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.hash = ''; // ホームに戻る
        }
    }
    function subscribeToChanges() {
        if (realtimeChannel) return;
        realtimeChannel = supabase.channel('nyax-feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'post' }, payload => {
                const mainScreenVisible = !document.getElementById('main-screen').classList.contains('hidden');
                // ▼▼▼ [修正点4] 通知画面もリアルタイム更新の対象にする ▼▼▼
                const notificationsScreenVisible = !document.getElementById('notifications-screen').classList.contains('hidden');
                if ((payload.eventType === 'INSERT' || payload.eventType === 'DELETE') && (mainScreenVisible || notificationsScreenVisible)) {
                    router(); // 変更があったら再描画
                }
                // ▲▲▲ [修正点4] ここまで ▼▼▼
            }).subscribe();
    }
    
    // --- 13. 初期化処理 ---
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.addEventListener('click', () => switchTimelineTab(btn.dataset.tab)));
    document.getElementById('banner-signup-button').addEventListener('click', goToLoginPage);
    document.getElementById('banner-login-button').addEventListener('click', goToLoginPage);
    window.addEventListener('hashchange', router); // ルーターを最後にセット
    checkSession();
});