window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初期設定 & グローバル変数 ---
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA1MjEwMywiZXhwIjoyMDU1NjI4MTAzfQ.oeUdur2k0VsoLcaMn8XHnQGuRfwf3Qwbc3OkDeeOI_A";
    const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let selectedFiles = [];

    let currentUser = null; let realtimeChannel = null; let currentTimelineTab = 'foryou';
    let replyingTo = null;
    let newIconDataUrl = null;
    let resetIconToDefault = false;
    let openedMenuPostId = null;
    let currentDmChannel = null;
    let lastRenderedMessageId = null;
    let allUsersCache = new Map(); // オブジェクトからMapに変更

    let isLoadingMore = false;
    let postLoadObserver;
    let currentPagination = { page: 0, hasMore: true, type: null, options: {} };
    const POSTS_PER_PAGE = 10;

     // --- 2. アイコンSVG定義 ---
    const ICONS = {
        home: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><rect x="9" y="12" width="6" height="10"></rect></svg>`,
        dm: `<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
        send: `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
        explore: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
        notifications: `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
        likes: `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
        stars: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        profile: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        settings: `<svg viewBox="0 0 24 24"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V12a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        attachment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`,
        back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
    };

    // --- 3. DOM要素の取得 ---
    const DOM = {
        mainContent: document.getElementById('main-content'),
        navMenuTop: document.getElementById('nav-menu-top'),
        navMenuBottom: document.getElementById('nav-menu-bottom'),
        pageHeader: document.getElementById('page-header'),
        screens: document.querySelectorAll('.screen'),
        postFormContainer: document.querySelector('.post-form-container'),
        postModal: document.getElementById('post-modal'),
        editPostModal: document.getElementById('edit-post-modal'),
        editPostModalContent: document.getElementById('edit-post-modal-content'),
        createDmModal: document.getElementById('create-dm-modal'),
        createDmModalContent: document.getElementById('create-dm-modal-content'),
        dmManageModal: document.getElementById('dm-manage-modal'),
        dmManageModalContent: document.getElementById('dm-manage-modal-content'),
        connectionErrorOverlay: document.getElementById('connection-error-overlay'),
        retryConnectionBtn: document.getElementById('retry-connection-btn'),
        friezeOverlay: document.getElementById('frieze-overlay'), // ★★★ この行を追加
        friezeReason: document.getElementById('frieze-reason'), // ★★★ この行を追加
        imagePreviewModal: document.getElementById('image-preview-modal'),
        imagePreviewModalContent: document.getElementById('image-preview-modal-content'),
        timeline: document.getElementById('timeline'),
        exploreContent: document.getElementById('explore-content'),
        notificationsContent: document.getElementById('notifications-content'),
        likesContent: document.getElementById('likes-content'),
        starsContent: document.getElementById('stars-content'),
        postDetailContent: document.getElementById('post-detail-content'),
        searchResultsScreen: document.getElementById('search-results-screen'),
        searchResultsContent: document.getElementById('search-results-content'),
        dmScreen: document.getElementById('dm-screen'),
        dmContent: document.getElementById('dm-content'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loginBanner: document.getElementById('login-banner'),
        rightSidebar: {
            recommendations: document.getElementById('recommendations-widget-container'),
            searchWidget: document.getElementById('right-sidebar-search-widget-container')
        }
    };

// --- 4. ユーティリティ関数 ---
    function showLoading(show) {
        DOM.loadingOverlay.classList.toggle('hidden', !show);
    }
    
    function showScreen(screenId) {
        DOM.screens.forEach(screen => {
            if (!screen.classList.contains('hidden')) {
                screen.classList.add('hidden');
            }
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    }

    function escapeHTML(str) { if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

    function getUserIconUrl(user) {
        if (!user) return 'favicon.png';
        return user.icon_data ? user.icon_data : `https://trampoline.turbowarp.org/avatars/by-username/${user.scid}`;
    }

    function renderDmMessage(msg) {
        if (msg.type === 'system') {
            return `<div class="dm-system-message">${escapeHTML(msg.content)}</div>`;
        }
        
        const sent = msg.userid === currentUser.id;
        
        if (sent) {
            // 自分のメッセージ
            return `<div class="dm-message-container sent">
                <div class="dm-message-wrapper">
                    <div class="dm-message">${escapeHTML(msg.content)}</div>
                </div>
            </div>`;
        } else {
            // 他の人のメッセージ
            // ★★★ キャッシュへのアクセス方法を Map 形式に修正 ★★★
            const user = allUsersCache.get(msg.userid) || {};
            const time = new Date(msg.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            return `<div class="dm-message-container received">
                <img src="${getUserIconUrl(user)}" class="dm-message-icon">
                <div class="dm-message-wrapper">
                    <div class="dm-message-meta">${escapeHTML(user.name || '不明')}・${time}</div>
                    <div class="dm-message">${escapeHTML(msg.content)}</div>
                </div>
            </div>`;
        }
    }

    function updateFollowButtonState(buttonElement, isFollowing) {
        buttonElement.classList.remove('follow-button-not-following', 'follow-button-following');
        if (isFollowing) {
            buttonElement.textContent = 'フォロー中';
            buttonElement.classList.add('follow-button-following');
            buttonElement.onmouseenter = () => { buttonElement.textContent = 'フォロー解除'; };
            buttonElement.onmouseleave = () => { buttonElement.textContent = 'フォロー中'; };
        } else {
            buttonElement.textContent = 'フォロー';
            buttonElement.classList.add('follow-button-not-following');
            buttonElement.onmouseenter = null;
            buttonElement.onmouseleave = null;
        }
        buttonElement.disabled = false;
    }

    async function sendNotification(recipientId, message) {
        if (!currentUser || !recipientId || !message || recipientId === currentUser.id) return;
        try {
            const { data: userData, error: fetchError } = await supabase.from('user').select('notice, notice_count').eq('id', recipientId).single();
            if (fetchError || !userData) { console.error('通知受信者の情報取得に失敗:', fetchError); return; }
            const currentNotices = userData.notice || [];
            const updatedNotices = [`${new Date().toLocaleDateString('ja-JP')} ${new Date().toLocaleTimeString('ja-JP')} - ${message}`, ...currentNotices].slice(0, 50);
            const updatedNoticeCount = (userData.notice_count || 0) + 1;
            const { error: updateError } = await supabase.from('user').update({ notice: updatedNotices, notice_count: updatedNoticeCount }).eq('id', recipientId);
            if (updateError) { console.error('通知の更新に失敗:', updateError); }
        } catch (e) { console.error('通知送信中にエラー発生:', e); }
    }
    
    function formatPostContent(text, userCache = new Map()) { // ★★★ デフォルト値を追加
        let formattedText = escapeHTML(text);
        const urlRegex = /(https?:\/\/[^\s<>"'’]+)/g;
        formattedText = formattedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">$1</a>');
        const hashtagRegex = /#([a-zA-Z0-9_ぁ-んァ-ヶー一-龠]+)/g;
        formattedText = formattedText.replace(hashtagRegex, (match, tagName) => `<a href="#search/${encodeURIComponent(tagName)}" onclick="event.stopPropagation()">${match}</a>`);
        
        const mentionRegex = /@(\d+)/g;
        formattedText = formattedText.replace(mentionRegex, (match, userId) => {
            const numericId = parseInt(userId);
            if (userCache.has(numericId)) {
                const user = userCache.get(numericId); // ユーザーオブジェクトを取得
                const userName = user ? user.name : null; // nameプロパティを取得
                if (userName) {
                    return `<a href="#profile/${numericId}" onclick="event.stopPropagation()">@${escapeHTML(userName)}</a>`;
                }
            }
            return match;
        });

        return formattedText;
    }

    // --- 5. ルーティングと画面管理 ---
    async function router() {
        showLoading(true);
        isLoadingMore = false; // ページ遷移時に読み込み状態をリセット

        await updateNavAndSidebars();
        const hash = window.location.hash || '#';

        if (postLoadObserver) {
            postLoadObserver.disconnect();
        }

        try {
            if (hash.startsWith('#post/')) await showPostDetail(hash.substring(6));
            else if (hash.startsWith('#profile/')) await showProfileScreen(parseInt(hash.substring(9)));
            else if (hash.startsWith('#search/')) await showSearchResults(decodeURIComponent(hash.substring(8)));
            else if (hash.startsWith('#dm/')) await showDmScreen(hash.substring(4));
            else if (hash === '#dm') await showDmScreen();
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
            showLoading(false); // エラー発生時はローディングを止める
        }
        // ▼▼▼ [修正点1] finallyブロックのshowLoading(false)を削除し、各描画関数の最後に移動 ▼▼▼
        // finally {
        //     showLoading(false);
        // }
        // ▲▲▲ [修正点1] ここまで ▼▼▼
    }
    
    // --- 6. ナビゲーションとサイドバー ---
    async function loadRightSidebar() {
        if (DOM.rightSidebar.searchWidget) {
            DOM.rightSidebar.searchWidget.innerHTML = ` <div class="sidebar-search-widget"> ${ICONS.explore} <input type="search" id="sidebar-search-input" placeholder="検索"> </div>`;
            document.getElementById('sidebar-search-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim();
                    if (query) { window.location.hash = `#search/${encodeURIComponent(query)}`; }
                }
            });
        }
        
        let query = supabase.from('user').select('id, name, scid, icon_data');
        if (currentUser) {
            query = query.neq('id', currentUser.id);
        }
        const { data, error } = await query.order('time', { ascending: false }).limit(3);

        if (error || !data || data.length === 0) { if(DOM.rightSidebar.recommendations) DOM.rightSidebar.recommendations.innerHTML = ''; return; }
        let recHTML = '<div class="widget-title">おすすめユーザー</div>';
        recHTML += data.map(user => {
            const isFollowing = currentUser?.follow?.includes(user.id);
            const btnClass = isFollowing ? 'follow-button-following' : 'follow-button-not-following';
            const btnText = isFollowing ? 'フォロー中' : 'フォロー';
            return ` <div class="widget-item recommend-user"> <a href="#profile/${user.id}" class="profile-link" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:0.5rem;"> <img src="${getUserIconUrl(user)}" style="width:40px;height:40px;border-radius:50%;" alt="${user.name}'s icon"> <div> <span>${escapeHTML(user.name)}</span> <small style="color:var(--secondary-text-color); display:block;">#${user.id}</small> </div> </a> ${currentUser && currentUser.id !== user.id ? `<button class="${btnClass}" data-user-id="${user.id}">${btnText}</button>` : ''} </div>`;
        }).join('');
        if(DOM.rightSidebar.recommendations) DOM.rightSidebar.recommendations.innerHTML = `<div class="sidebar-widget">${recHTML}</div>`;
        DOM.rightSidebar.recommendations?.querySelectorAll('.recommend-user button').forEach(button => {
            const userId = parseInt(button.dataset.userId);
            if (!isNaN(userId)) {
                const isFollowing = currentUser?.follow?.includes(userId);
                updateFollowButtonState(button, isFollowing);
                button.onclick = () => window.handleFollowToggle(userId, button);
            }
        });
    }
    
    async function updateNavAndSidebars() {
        const hash = window.location.hash || '#';
        const menuItems = [ { name: 'ホーム', hash: '#', icon: ICONS.home }, { name: '検索', hash: '#explore', icon: ICONS.explore } ];
        if (currentUser && !currentUser.notice_count_fetched_recently) {
            const { data: updatedUser, error } = await supabase.from('user').select('notice, notice_count').eq('id', currentUser.id).single();
            if (!error && updatedUser) {
                currentUser.notice = updatedUser.notice;
                currentUser.notice_count = updatedUser.notice_count;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            currentUser.notice_count_fetched_recently = true;
            setTimeout(() => { if (currentUser) currentUser.notice_count_fetched_recently = false; }, 10000);
        }
         if (currentUser) {
            menuItems.push(
                { name: '通知', hash: '#notifications', icon: ICONS.notifications, badge: currentUser.notice_count }, 
                { name: 'いいね', hash: '#likes', icon: ICONS.likes }, 
                { name: 'お気に入り', hash: '#stars', icon: ICONS.stars }, 
                { name: 'メッセージ', hash: '#dm', icon: ICONS.dm },
                { name: 'プロフィール', hash: `#profile/${currentUser.id}`, icon: ICONS.profile }, 
                { name: '設定', hash: '#settings', icon: ICONS.settings }
            );
        }
        DOM.navMenuTop.innerHTML = menuItems.map(item => {
            let isActive = false;
            if (item.hash === '#') {
                isActive = (hash === '#' || hash === '');
            } else {
                isActive = hash.startsWith(item.hash);
            }
            return ` <a href="${item.hash}" class="nav-item ${isActive ? 'active' : ''}"> ${item.icon} <span>${item.name}</span> ${item.badge && item.badge > 0 ? `<span class="notification-badge">${item.badge > 99 ? '99+' : item.badge}</span>` : ''} </a>`
        }).join('');
        if(currentUser) DOM.navMenuTop.innerHTML += `<button class="nav-item nav-item-post"><span>ポスト</span></button>`;
        DOM.navMenuBottom.innerHTML = currentUser ? `<button id="account-button" class="nav-item account-button"> <img src="${getUserIconUrl(currentUser)}" class="user-icon" alt="${currentUser.name}'s icon"> <div class="account-info"> <span class="name">${escapeHTML(currentUser.name)}</span> <span class="id">#${currentUser.id}</span> </div> </button>` : `<button id="login-button" class="nav-item"><span>ログイン</span></button>`;
        DOM.loginBanner.classList.toggle('hidden', !!currentUser);
        // ▼▼▼ [修正点2] preventDefaultを削除し、通常のhashchangeをトリガーさせる ▼▼▼
        DOM.navMenuTop.querySelectorAll('a.nav-item').forEach(link => {
            link.onclick = (e) => {
                // hashchangeイベントに任せるため、preventDefaultはしない
            };
        });
        // ▲▲▲ [修正点2] ここまで ▼▼▼
        DOM.navMenuBottom.querySelector('button')?.addEventListener('click', currentUser ? handleLogout : goToLoginPage);
        DOM.navMenuTop.querySelector('.nav-item-post')?.addEventListener('click', () => openPostModal());
        loadRightSidebar();
    }
    
    // --- 7. 認証とセッション ---
    function goToLoginPage() { window.location.href = 'login.html'; }
    function handleLogout() {
        if(!confirm("ログアウトしますか？")) return;
        currentUser = null; localStorage.removeItem('nyaxUserId');
        if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
        window.location.hash = '#';
        router();
    }
     async function checkSession() {
        const userId = localStorage.getItem('nyaxUserId');
        if (userId) {
            try {
                const { data, error } = await supabase.from('user').select('*').eq('id', parseInt(userId)).single();
                if (error || !data) throw new Error('ユーザーデータの取得に失敗しました。');
                currentUser = data;

                // 凍結チェック
                if (currentUser.frieze) {
                    DOM.friezeReason.textContent = currentUser.frieze;
                    DOM.friezeOverlay.classList.remove('hidden');
                    return; // 凍結されている場合はここで処理を中断
                }

                // 凍結されていなければ、通常の起動処理を続行
                subscribeToChanges();
                router();

            } catch (error) {
                console.error(error);
                currentUser = null;
                // localStorageは削除せず、エラー画面を表示
                DOM.connectionErrorOverlay.classList.remove('hidden');
            }
        } else {
            currentUser = null;
            router();
        }
    }

    // --- 8. ポスト関連のUIとロジック ---
    function openPostModal(replyInfo = null) {
        if (!currentUser) return goToLoginPage();
        DOM.postModal.classList.remove('hidden');
        const modalContainer = DOM.postModal.querySelector('.post-form-container-modal');
        modalContainer.innerHTML = createPostFormHTML();
        attachPostFormListeners(modalContainer);

        if (replyInfo) {
            replyingTo = replyInfo;
            const replyInfoDiv = modalContainer.querySelector('#reply-info');
            replyInfoDiv.innerHTML = `<span>@${replyInfo.name}に返信中</span>`;
            replyInfoDiv.classList.remove('hidden');
        }
        DOM.postModal.querySelector('.modal-close-btn').onclick = closePostModal;
        modalContainer.querySelector('textarea').focus();
    }
    function closePostModal() {
        DOM.postModal.classList.add('hidden');
        replyingTo = null;
        selectedFiles = [];
    }
    const handleCtrlEnter = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.target.closest('.post-form').querySelector('button[id^="post-submit-button"]').click();
        }
    };
    
    function createPostFormHTML() {
        return `
            <div class="post-form">
                <img src="${getUserIconUrl(currentUser)}" class="user-icon" alt="your icon">
                <div class="form-content">
                    <div id="reply-info" class="hidden" style="margin-bottom: 0.5rem; color: var(--secondary-text-color);"></div>
                    <textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea>
                    <div class="file-preview-container"></div>
                    <div class="post-form-actions">
                        <button type="button" class="attachment-button" title="ファイルを添付">
                            ${ICONS.attachment}
                        </button>
                        <input type="file" id="file-input" class="hidden" multiple>
                        <button id="post-submit-button">ポスト</button>
                    </div>
                </div>
            </div>`;
    }
    function attachPostFormListeners(container) {
        container.querySelector('.attachment-button').addEventListener('click', () => {
            container.querySelector('#file-input').click();
        });
        container.querySelector('#file-input').addEventListener('change', (e) => handleFileSelection(e, container));
        container.querySelector('#post-submit-button').addEventListener('click', () => handlePostSubmit(container));
        container.querySelector('textarea').addEventListener('keydown', handleCtrlEnter);
    }

    function handleFileSelection(event, container) {
        const previewContainer = container.querySelector('.file-preview-container');
        previewContainer.innerHTML = '';
        selectedFiles = Array.from(event.target.files);
        
        selectedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewItem.innerHTML = `<img src="${e.target.result}" alt="${file.name}"><button class="file-preview-remove" data-index="${index}">×</button>`;
                    previewContainer.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewItem.innerHTML = `<video src="${e.target.result}" controls></video><button class="file-preview-remove" data-index="${index}">×</button>`;
                    previewContainer.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('audio/')) {
                previewItem.innerHTML = `<span>🎵 ${escapeHTML(file.name)}</span><button class="file-preview-remove" data-index="${index}">×</button>`;
                previewContainer.appendChild(previewItem);
            } else {
                previewItem.innerHTML = `<span>📄 ${escapeHTML(file.name)}</span><button class="file-preview-remove" data-index="${index}">×</button>`;
                previewContainer.appendChild(previewItem);
            }
        });
        
        previewContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-preview-remove')) {
                const indexToRemove = parseInt(e.target.dataset.index);
                selectedFiles.splice(indexToRemove, 1);
                handleFileSelection({ target: { files: new DataTransfer().files } }, container);
                const newFiles = new DataTransfer();
                selectedFiles.forEach(file => newFiles.items.add(file));
                container.querySelector('#file-input').files = newFiles.files;
            }
        });
    }
    
    async function handlePostSubmit(container) {
        if (!currentUser) return alert("ログインが必要です。");
        const contentEl = container.querySelector('textarea');
        const content = contentEl.value.trim();
        if (!content && selectedFiles.length === 0) return alert('内容を入力するか、ファイルを添付してください。');
        
        const button = container.querySelector('#post-submit-button');
        button.disabled = true; button.textContent = '投稿中...';
        showLoading(true);

        try {
            let attachmentsData = [];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const fileId = crypto.randomUUID();
                    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from('nyax').upload(fileId, file);
                    if (uploadError) throw new Error(`ファイルアップロードに失敗しました: ${uploadError.message}`);
                    
                    const fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'file'));
                    attachmentsData.push({ type: fileType, id: fileId, name: file.name });
                }
            }
            
            const postData = { userid: currentUser.id, content, reply_id: replyingTo?.id || null, attachments: attachmentsData.length > 0 ? attachmentsData : null };
            const { data: newPost, error: postError } = await supabase.from('post').insert(postData).select().single();
            if(postError) throw postError;

            const currentPostIds = currentUser.post || [];
            const updatedPostIds = [newPost.id, ...currentPostIds];
            const { error: userUpdateError } = await supabase.from('user').update({ post: updatedPostIds }).eq('id', currentUser.id);
            if (userUpdateError) throw new Error('ユーザー情報の更新に失敗しました。');
            
            currentUser.post = updatedPostIds;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            if (replyingTo) {
                const { data: parentPost } = await supabase.from('post').select('userid').eq('id', replyingTo.id).single();
                if (parentPost && parentPost.userid !== currentUser.id) {
                    sendNotification(parentPost.userid, `${escapeHTML(currentUser.name)}さんがあなたのポストに返信しました。`);
                }
            }
            
            selectedFiles = [];
            contentEl.value = '';
            container.querySelector('.file-preview-container').innerHTML = '';
            if (container.closest('.modal-overlay')) {
                closePostModal();
            } else {
                clearReply();
            }
        } catch(e) { console.error(e); alert(e.message); }
        finally { button.disabled = false; button.textContent = 'ポスト'; showLoading(false); }
    }
    
    window.openImageModal = (src) => {
        DOM.imagePreviewModalContent.src = src;
        DOM.imagePreviewModal.classList.remove('hidden');
    }
    window.closeImageModal = () => {
        DOM.imagePreviewModal.classList.add('hidden');
        DOM.imagePreviewModalContent.src = '';
    }
    
    window.handleDownload = async (fileUrl, fileName) => {
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('ファイルの取得に失敗しました。');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (e) {
            console.error('ダウンロードエラー:', e);
            alert('ファイルのダウンロードに失敗しました。');
        }
    }

    async function renderPost(post, author, options = {}) {
        if (!post || !author) return null;
        const { prepend = false, replyCountsMap = new Map(), userCache = new Map(), } = options; // mainPostId を追加

        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.dataset.postId = post.id;
        
        const userIconLink = document.createElement('a');
        userIconLink.href = `#profile/${author.id}`;
        userIconLink.className = 'user-icon-link';

        const userIcon = document.createElement('img');
        userIcon.src = getUserIconUrl(author);
        userIcon.className = 'user-icon';
        userIcon.alt = `${author.name}'s icon`;
        userIconLink.appendChild(userIcon);
        postEl.appendChild(userIconLink);

        const postMain = document.createElement('div');
        postMain.className = 'post-main';
        
        // ▼▼▼ 返信先表示のロジックをこのブロックに差し替え ▼▼▼
        if (post.reply_to && post.reply_to.user) {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'replying-to';
            const replyLink = document.createElement('a');
            replyLink.href = `#profile/${post.reply_to.user.id}`;
            replyLink.textContent = `@${escapeHTML(post.reply_to.user.name)}`;
            replyDiv.appendChild(replyLink);
            replyDiv.append(' さんに返信');
            postMain.appendChild(replyDiv);
        }
        // ▲▲▲ 差し替えここまで ▲▲▲

        const postHeader = document.createElement('div');
        // ... (以降の postHeader の中身は変更なし) ...
        postHeader.className = 'post-header';
        
        const authorLink = document.createElement('a');
        authorLink.href = `#profile/${author.id}`;
        authorLink.className = 'post-author';
        authorLink.textContent = escapeHTML(author.name || '不明');
        postHeader.appendChild(authorLink);

        const postTime = document.createElement('span');
        postTime.className = 'post-time';
        postTime.textContent = `#${author.id || '????'} · ${new Date(post.time).toLocaleString('ja-JP')}`;
        postHeader.appendChild(postTime);

        if (currentUser?.id === post.userid) {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'post-menu-btn';
            menuBtn.innerHTML = '…';
            postHeader.appendChild(menuBtn);

            const menu = document.createElement('div');
            menu.id = `menu-${post.id}`;
            menu.className = 'post-menu';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '編集';
            menu.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '削除';
            menu.appendChild(deleteBtn);
            
            postHeader.appendChild(menu);
        }
        
        postMain.appendChild(postHeader);
        
        const postContent = document.createElement('div');
        postContent.className = 'post-content';
        const contentP = document.createElement('p');
        // ★★★ 不要な await を削除 ★★★
        contentP.innerHTML = formatPostContent(post.content, userCache);
        postContent.appendChild(contentP);
        postMain.appendChild(postContent);

        if (post.attachments && post.attachments.length > 0) {
            const attachmentsContainer = document.createElement('div');
            attachmentsContainer.className = 'attachments-container';
            for (const attachment of post.attachments) {
                const { data: publicUrlData } = supabase.storage.from('nyax').getPublicUrl(attachment.id);
                const publicURL = publicUrlData.publicUrl;
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'attachment-item';

                if (attachment.type === 'image') {
                    const img = document.createElement('img');
                    img.src = publicURL;
                    img.alt = escapeHTML(attachment.name);
                    img.className = 'attachment-image';
                    itemDiv.appendChild(img);
                } else if (attachment.type === 'video') {
                    const video = document.createElement('video');
                    video.src = publicURL;
                    video.controls = true;
                    itemDiv.appendChild(video);
                } else if (attachment.type === 'audio') {
                    const audio = document.createElement('audio');
                    audio.src = publicURL;
                    audio.controls = true;
                    itemDiv.appendChild(audio);
                }
                
                if (attachment.type === 'file' || attachment.type === 'image' || attachment.type === 'video' || attachment.type === 'audio') {
                    const downloadLink = document.createElement('a');
                    downloadLink.className = 'attachment-download-link';
                    downloadLink.href = '#';
                    downloadLink.textContent = `ダウンロード: ${escapeHTML(attachment.name)}`;
                    downloadLink.dataset.url = publicURL;
                    downloadLink.dataset.name = attachment.name;
                    itemDiv.appendChild(downloadLink);
                }
                attachmentsContainer.appendChild(itemDiv);
            }
            postMain.appendChild(attachmentsContainer);
        }

        if (currentUser) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'post-actions';

            const replyCount = replyCountsMap.get(post.id) || 0;

            const replyBtn = document.createElement('button');
            replyBtn.className = 'reply-button';
            replyBtn.title = '返信';
            replyBtn.innerHTML = `🗨 <span>${replyCount}</span>`;
            replyBtn.dataset.username = escapeHTML(author.name);
            actionsDiv.appendChild(replyBtn);

            const likeBtn = document.createElement('button');
            const isLiked = currentUser.like?.includes(post.id);
            likeBtn.className = `like-button ${isLiked ? 'liked' : ''}`;
            likeBtn.innerHTML = `<span class="icon">${isLiked ? '♥' : '♡'}</span> <span>${post.like}</span>`;
            actionsDiv.appendChild(likeBtn);

            const starBtn = document.createElement('button');
            const isStarred = currentUser.star?.includes(post.id);
            starBtn.className = `star-button ${isStarred ? 'starred' : ''}`;
            starBtn.innerHTML = `<span class="icon">${isStarred ? '★' : '☆'}</span> <span>${post.star}</span>`;
            actionsDiv.appendChild(starBtn);
            
            postMain.appendChild(actionsDiv);
        }
        
        // ツリー表示用のコンテナを追加
        // const subRepliesContainer = document.createElement('div');
        // subRepliesContainer.className = 'sub-replies-container';
        // postMain.appendChild(subRepliesContainer);

        postEl.appendChild(postMain);
        return postEl;
    }

        // --- 9. ページごとの表示ロジック ---
    async function showMainScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">ホーム</h2>`;
        showScreen('main-screen');
        if (currentUser) {
            DOM.postFormContainer.innerHTML = createPostFormHTML();
            attachPostFormListeners(DOM.postFormContainer);
        } else { DOM.postFormContainer.innerHTML = ''; }
        document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
        await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
        showLoading(false);
    }

    async function showExploreScreen() {
        DOM.pageHeader.innerHTML = `
            <div class="header-search-bar">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="search" id="search-input" placeholder="検索">
            </div>`;
        const searchInput = document.getElementById('search-input');
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                window.location.hash = `#search/${encodeURIComponent(query)}`;
            }
        };
        searchInput.onkeydown = (e) => { if (e.key === 'Enter') performSearch(); };

        showScreen('explore-screen');
        DOM.exploreContent.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--secondary-text-color);">ユーザーやポストを検索してみましょう。</p>`;
        showLoading(false);
    }

    async function showSearchResults(query) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">検索結果: "${escapeHTML(query)}"</h2>`;
        showScreen('search-results-screen');
        const contentDiv = DOM.searchResultsContent;
        contentDiv.innerHTML = '';
        
        const userResultsContainer = document.createElement('div');
        contentDiv.appendChild(userResultsContainer);
        const postResultsContainer = document.createElement('div');
        contentDiv.appendChild(postResultsContainer);

        userResultsContainer.innerHTML = '<div class="spinner"></div>';
        const { data: users, error: userError } = await supabase.from('user').select('id, name, scid, me, icon_data').or(`name.ilike.%${query}%,scid.ilike.%${query}%,me.ilike.%${query}%`).order('id', { ascending: true }).limit(10);
        if (userError) console.error("ユーザー検索エラー:", userError);
        userResultsContainer.innerHTML = `<h3 style="padding:1rem;">ユーザー (${users?.length || 0}件)</h3>`;
        if (users && users.length > 0) {
            users.forEach(u => {
                const userCard = document.createElement('div'); userCard.className = 'profile-card widget-item';
                const userLink = document.createElement('a');
                userLink.href = `#profile/${u.id}`;
                userLink.className = 'profile-link';
                userLink.style.cssText = 'display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;';
                userLink.innerHTML = `<img src="${getUserIconUrl(u)}" style="width:48px; height:48px; border-radius:50%;" alt="${u.name}'s icon"><div><span class="name" style="font-weight:700;">${escapeHTML(u.name)}</span><span class="id" style="color:var(--secondary-text-color);">#${u.id}</span><p class="me" style="margin:0.2rem 0 0;">${escapeHTML(u.me || '')}</p></div>`;
                userCard.appendChild(userLink);
                userResultsContainer.appendChild(userCard);
            });
        } else {
            userResultsContainer.innerHTML += `<p style="padding:1rem; text-align:center;">ユーザーは見つかりませんでした。</p>`;
        }
        
        postResultsContainer.innerHTML = `<h3 style="padding:1rem; border-top:1px solid var(--border-color); margin-top:1rem; padding-top:1rem;">ポスト</h3>`;
        await loadPostsWithPagination(postResultsContainer, 'search', { query });
        showLoading(false);
    }
    
    async function showNotificationsScreen() {
        if (!currentUser) {
            DOM.pageHeader.innerHTML = `<h2 id="page-title">通知</h2>`;
            showScreen('notifications-screen');
            DOM.notificationsContent.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">通知を見るにはログインが必要です。</p>';
            showLoading(false);
            return;
        }
        DOM.pageHeader.innerHTML = `<h2 id="page-title">通知</h2>`;
        showScreen('notifications-screen');
        const contentDiv = DOM.notificationsContent;
        contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            await updateNavAndSidebars();
            if (currentUser.notice_count > 0) {
                const { error: resetError } = await supabase.from('user').update({ notice_count: 0 }).eq('id', currentUser.id);
                if (resetError) { console.error('通知数のリセットに失敗:', resetError); } 
                else {
                    currentUser.notice_count = 0;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    await updateNavAndSidebars();
                }
            }
            contentDiv.innerHTML = '';
            if (currentUser.notice?.length) {
                currentUser.notice.forEach(n => {
                    const noticeEl = document.createElement('div'); noticeEl.className = 'widget-item';
                    noticeEl.textContent = n;
                    contentDiv.appendChild(noticeEl);
                });
            } else {
                contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">通知はまだありません。</p>';
            }
        } catch (e) {
            console.error("通知画面エラー:", e);
            contentDiv.innerHTML = `<p class="error-message">通知の読み込みに失敗しました。</p>`;
        } finally {
            showLoading(false);
        }
    }

    async function showLikesScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">いいね</h2>`;
        showScreen('likes-screen');
        await loadPostsWithPagination(DOM.likesContent, 'likes', { ids: currentUser.like });
        showLoading(false);
    }
    async function showStarsScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">お気に入り</h2>`;
        showScreen('stars-screen');
        await loadPostsWithPagination(DOM.starsContent, 'stars', { ids: currentUser.star });
        showLoading(false);
    }

    async function showPostDetail(postId) {
        DOM.pageHeader.innerHTML = `
            <div class="header-with-back-button">
                <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                <h2 id="page-title">ポスト</h2>
            </div>`;
        showScreen('post-detail-screen');
        const contentDiv = DOM.postDetailContent;
        contentDiv.innerHTML = '<div class="spinner"></div>';

        try {
            // 1. メインポスト、親ポスト、全返信ツリーを一括で取得
            const { data: mainPost, error: postError } = await supabase
                .from('post')
                .select('*, user(id, name, scid, icon_data), reply_to:reply_id(*, user(id, name, scid, icon_data, content))')
                .eq('id', postId)
                .single();
    
            if (postError || !mainPost) throw new Error('ポストが見つかりません。');
            
            const { data: allRepliesRaw, error: repliesError } = await supabase.rpc('get_all_replies', { root_post_id: postId });
            if (repliesError) throw repliesError;

            // 2. 表示に必要な全メンションユーザー情報を収集・キャッシュ
            const mentionRegex = /@(\d+)/g;
            const allMentionedIds = new Set();
            const collectMentions = (text) => {
                if (!text) return;
                const matches = text.matchAll(mentionRegex);
                for (const match of matches) allMentionedIds.add(parseInt(match[1]));
            };

            collectMentions(mainPost.content);
            if (mainPost.reply_to) {
                collectMentions(mainPost.reply_to.content);
            }
            allRepliesRaw.forEach(reply => collectMentions(reply.content));
            
            const newIdsToFetch = [...allMentionedIds].filter(id => id && !allUsersCache.has(id));
            if (newIdsToFetch.length > 0) {
                const { data: newUsers } = await supabase.from('user').select('id, name').in('id', newIdsToFetch);
                if (newUsers) newUsers.forEach(u => allUsersCache.set(u.id, u));
            }

            // 3. DOMの初期化とメインポストの描画
            contentDiv.innerHTML = '';
    
            if (mainPost.reply_to) {
                const parentPostContainer = document.createElement('div');
                parentPostContainer.className = 'parent-post-container';
                // userCache を渡す
                const parentPostEl = await renderPost(mainPost.reply_to, mainPost.reply_to.user, { userCache: allUsersCache });
                if (parentPostEl) parentPostContainer.appendChild(parentPostEl);
                contentDiv.appendChild(parentPostContainer);
            }
    
            // userCache を渡す
            const mainPostEl = await renderPost(mainPost, mainPost.user, { userCache: allUsersCache });
            if (mainPostEl) contentDiv.appendChild(mainPostEl);
    
            const repliesHeader = document.createElement('h3');
            repliesHeader.textContent = '返信';
            repliesHeader.style.cssText = 'padding: 1rem; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); margin-top: 1rem; margin-bottom: 0; font-size: 1.2rem;';
            contentDiv.appendChild(repliesHeader);

            // 4. データを整形し、深さ優先でフラットなリストを構築
            const repliesMap = new Map(allRepliesRaw.map(r => [r.id, r]));
            const repliesByParentId = new Map();

            for (const reply of allRepliesRaw) {
                const parentId = reply.reply_id;
                if (parentId === postId) {
                    reply.reply_to = mainPost;
                } else if (repliesMap.has(parentId)) {
                    const parentPostData = repliesMap.get(parentId);
                    reply.reply_to = {
                        ...parentPostData,
                        user: {
                            id: parentPostData.author_id,
                            name: parentPostData.author_name,
                        }
                    };
                }
                if (!repliesByParentId.has(parentId)) repliesByParentId.set(parentId, []);
                repliesByParentId.get(parentId).push(reply);
            }

            for (const replies of repliesByParentId.values()) {
                replies.sort((a, b) => new Date(a.time) - new Date(b.time));
            }

            const flatReplyList = [];
            const buildFlatList = (parentId) => {
                const children = repliesByParentId.get(parentId) || [];
                for (const child of children) {
                    if (child.reply_id === postId) {
                        delete child.reply_to; 
                    }
                    flatReplyList.push(child);
                    buildFlatList(child.id);
                }
            };
            buildFlatList(postId);

            // 5. 無限スクロールのセットアップ
            const repliesContainer = document.createElement('div');
            contentDiv.appendChild(repliesContainer);
            const trigger = document.createElement('div');
            trigger.className = 'load-more-trigger';
            contentDiv.appendChild(trigger);
            
            let pagination = { page: 0, hasMore: flatReplyList.length > 0 };
            const REPLIES_PER_PAGE = 10;
            let isLoadingReplies = false;

            const loadMoreReplies = async () => {
                if (isLoadingReplies || !pagination.hasMore) return;
                isLoadingReplies = true;
                trigger.innerHTML = '<div class="spinner"></div>';
                
                const from = pagination.page * REPLIES_PER_PAGE;
                const to = from + REPLIES_PER_PAGE;
                const repliesToRender = flatReplyList.slice(from, to);

                for (const reply of repliesToRender) {
                    const postForRender = { ...reply, like: reply.like, star: reply.star };
                    const authorForRender = { id: reply.author_id, name: reply.author_name, scid: reply.author_scid, icon_data: reply.author_icon_data };
                    // userCache を渡す
                    const postEl = await renderPost(postForRender, authorForRender, { userCache: allUsersCache });
                    if (postEl) repliesContainer.appendChild(postEl);
                }

                pagination.page++;
                if (pagination.page * REPLIES_PER_PAGE >= flatReplyList.length) {
                    pagination.hasMore = false;
                }
                
                if (!pagination.hasMore) {
                    trigger.textContent = repliesContainer.hasChildNodes() ? 'すべての返信を読み込みました' : 'まだ返信はありません。';
                    if (postLoadObserver) postLoadObserver.disconnect();
                } else {
                    trigger.innerHTML = '';
                }
                isLoadingReplies = false;
            };
            
            const postLoadObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreReplies();
                }
            }, { rootMargin: '200px' });
            
            postLoadObserver.observe(trigger);

        } catch (err) {
            console.error("Post detail error:", err);
            contentDiv.innerHTML = `<p class="error-message">${err.message || 'ページの読み込みに失敗しました。'}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    async function showDmScreen(dmId = null) {
        if (!currentUser) return router();
        DOM.pageHeader.innerHTML = `<h2 id="page-title">メッセージ</h2>`;
        showScreen('dm-screen');
        DOM.dmContent.innerHTML = '<div class="spinner"></div>';

        const { data: dms, error } = await supabase.from('dm').select('id, title, member, time').contains('member', [currentUser.id]).order('time', { ascending: false });
        if (error) { DOM.dmContent.innerHTML = 'DMの読み込みに失敗しました。'; console.error(error); return; }

        let dmListHTML = dms.map(dm => `
            <div class="dm-list-item ${dm.id === dmId ? 'active' : ''}" onclick="window.location.hash='#dm/${dm.id}'">
                <div class="dm-list-item-title">${escapeHTML(dm.title) || dm.member.join(', ')}</div>
                <button class="dm-manage-btn" onclick="event.stopPropagation(); window.openDmManageModal('${dm.id}')">…</button>
            </div>
        `).join('');

        DOM.dmContent.innerHTML = `
            <div id="dm-list-container">
                <button class="dm-new-message-btn" onclick="window.openCreateDmModal()">新しいメッセージ</button>
                ${dmListHTML}
            </div>
            <div id="dm-conversation-container"></div>
        `;

        if (dmId) {
            await showDmConversation(dmId);
        } else {
            document.getElementById('dm-conversation-container').innerHTML = `<div class="dm-welcome-message"><h3>DMを選択するか、新しいDMを作成してください。</h3></div>`;
        }
        showLoading(false);
    }

    async function showDmConversation(dmId) {
        const container = document.getElementById('dm-conversation-container');
        container.innerHTML = '<div class="spinner"></div>';
        
        const { data: dm, error } = await supabase.from('dm').select('*').eq('id', dmId).single();
        if (error || !dm || !dm.member.includes(currentUser.id)) {
            container.innerHTML = 'DMが見つからないか、アクセス権がありません。';
            return;
        }

        // ★★★ キャッシュへのアクセス方法を Map 形式に修正 ★★★
        const memberIds = dm.member.filter(id => !allUsersCache.has(id));
        if(memberIds.length > 0) {
            const {data: users} = await supabase.from('user').select('id, name, scid, icon_data').in('id', memberIds);
            if(users) users.forEach(u => allUsersCache.set(u.id, u));
        }
        
        const posts = dm.post || [];
        const messagesHTML = posts.slice().reverse().map(renderDmMessage).join('');
        
        container.innerHTML = `
            <div class="dm-conversation-view">${messagesHTML}</div>
            <div class="dm-message-form">
                <textarea id="dm-message-input" placeholder="メッセージを送信"></textarea>
                <button id="send-dm-btn">${ICONS.send}</button>
            </div>
        `;
        const messageInput = document.getElementById('dm-message-input');
        messageInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                sendDmMessage(dmId);
            }
        });
        document.getElementById('send-dm-btn').onclick = () => sendDmMessage(dmId);

        lastRenderedMessageId = posts.length > 0 ? posts[posts.length - 1].id : null;

        if (currentDmChannel) supabase.removeChannel(currentDmChannel);
        currentDmChannel = supabase.channel(`dm-${dmId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm', filter: `id=eq.${dmId}` }, payload => {
                const newPost = payload.new.post;
                if(newPost && newPost.length > 0) {
                    const latestMessage = newPost[newPost.length - 1];
                    if(latestMessage.id === lastRenderedMessageId) return;

                    const view = document.querySelector('.dm-conversation-view');
                    if(view) {
                        const msgHTML = renderDmMessage(latestMessage);
                        view.insertAdjacentHTML('afterbegin', msgHTML);
                        lastRenderedMessageId = latestMessage.id;
                    }
                }
            }).subscribe();
    }
    // // --- 10. プロフィールと設定 ---
    async function showProfileScreen(userId) {
        DOM.pageHeader.innerHTML = `
            <div class="header-with-back-button">
                <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                <h2 id="page-title">プロフィール</h2>
            </div>`;
        showScreen('profile-screen');
        const profileHeader = document.getElementById('profile-header');
        const profileTabs = document.getElementById('profile-tabs');
        const profileContent = document.getElementById('profile-content');
        
        // ★★★ 以前の凍結通知が残っていれば削除 ★★★
        const existingFriezeNotice = DOM.mainContent.querySelector('.frieze-notice');
        if (existingFriezeNotice) existingFriezeNotice.remove();

        profileHeader.innerHTML = '<div class="spinner"></div>';
        profileTabs.innerHTML = '';
        profileContent.innerHTML = '';

        try {
            const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
            if (error || !user) {
                profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>';
                showLoading(false);
                return;
            }

            // ★★★ 最初に凍結状態をチェック ★★★
            if (user.frieze) {
                profileHeader.innerHTML = `
                    <div class="header-top">
                        <img src="${getUserIconUrl(user)}" class="user-icon-large" alt="${user.name}'s icon">
                    </div>
                    <div class="profile-info">
                        <h2>${escapeHTML(user.name)}</h2>
                        <div class="user-id">#${user.id}</div>
                    </div>`;
                const friezeNotice = document.createElement('div');
                friezeNotice.className = 'frieze-notice';
                friezeNotice.innerHTML = `このユーザーは<a href="rule" target="_blank" rel="noopener noreferrer">NyaXルール</a>に違反したため凍結されています。`;
                profileHeader.insertAdjacentElement('afterend', friezeNotice);
                showLoading(false);
                return; // 凍結されている場合はここで描画を終了
            }

            // --- 凍結されていない場合の通常の描画処理 ---
            const { data: followerCountData, error: countError } = await supabase.rpc('get_follower_count', { target_user_id: userId });
            const followerCount = countError ? '?' : followerCountData;

            profileHeader.innerHTML = `
                <div class="header-top">
                    <img src="${getUserIconUrl(user)}" class="user-icon-large" alt="${user.name}'s icon">
                    <div id="profile-actions" class="profile-actions"></div>
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
                const actionsContainer = profileHeader.querySelector('#profile-actions');
                if (actionsContainer) {
                    // DMボタン
                    const dmButton = document.createElement('button');
                    dmButton.className = 'dm-button';
                    dmButton.title = 'メッセージを送信';
                    dmButton.innerHTML = ICONS.dm;
                    dmButton.onclick = () => handleDmButtonClick(userId);
                    actionsContainer.appendChild(dmButton);

                    // フォローボタン
                    const followButton = document.createElement('button');
                    const isFollowing = currentUser.follow?.includes(userId);
                    updateFollowButtonState(followButton, isFollowing);
                    followButton.classList.add('profile-follow-button');
                    followButton.onclick = () => window.handleFollowToggle(userId, followButton);
                    actionsContainer.appendChild(followButton);
                }
            }
            
            profileTabs.innerHTML = `<button class="tab-button active" data-tab="posts">ポスト</button><button class="tab-button" data-tab="likes">いいね</button><button class="tab-button" data-tab="stars">お気に入り</button><button class="tab-button" data-tab="follows">フォロー中</button>`;
            profileTabs.querySelectorAll('.tab-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadProfileTabContent(user, button.dataset.tab);
                });
            });

            await loadProfileTabContent(user, 'posts');

        } catch(err) {
            profileHeader.innerHTML = '<h2>プロフィールの読み込みに失敗しました</h2>';
            console.error(err);
        } finally {
            showLoading(false);
        }
    }

    async function loadProfileTabContent(user, tab) {
        document.querySelectorAll('#profile-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        const contentDiv = document.getElementById('profile-content');
        
        isLoadingMore = false; // 読み込み状態をリセット
        if (postLoadObserver) postLoadObserver.disconnect();
        contentDiv.innerHTML = '';

        try {
            switch(tab) {
                case 'posts':
                    await loadPostsWithPagination(contentDiv, 'profile_posts', { ids: user.post || [] });
                    break;
                case 'likes': 
                    if (!user.settings.show_like && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのいいねは非公開です。</p>'; break; }
                    await loadPostsWithPagination(contentDiv, 'likes', { ids: user.like || [] });
                    break;
                case 'stars':
                    if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのお気に入りは非公開です。</p>'; break; }
                    await loadPostsWithPagination(contentDiv, 'stars', { ids: user.star || [] });
                    break;
                case 'follows':
                    contentDiv.innerHTML = '<div class="spinner"></div>';
                    if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのフォローリストは非公開です。</p>'; break; }
                    if (!user.follow?.length) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">誰もフォローしていません。</p>'; break; }
                    
                    const { data: fUsers, error: fErr } = await supabase.from('user').select('id, name, me, scid, icon_data').in('id', user.follow);
                    if(fErr) throw fErr;
                    contentDiv.innerHTML = '';
                    fUsers?.forEach(u => { // ★★★ ループ変数を 'f' から 'u' に修正
                        const userCard = document.createElement('div');
                        userCard.className = 'profile-card';
                        const userLink = document.createElement('a');
                        userLink.href = `#profile/${u.id}`;
                        userLink.className = 'profile-link';
                        userLink.style.cssText = 'display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;';
                        userLink.innerHTML = `<img src="${getUserIconUrl(u)}" style="width:48px; height:48px; border-radius:50%;" alt="${u.name}'s icon"><div><span class="name" style="font-weight:700;">${escapeHTML(u.name)}</span><span class="id" style="color:var(--secondary-text-color);">#${u.id}</span><p class="me" style="margin:0.2rem 0 0;">${escapeHTML(u.me || '')}</p></div>`;
                        userCard.appendChild(userLink);
                        contentDiv.appendChild(userCard);
                    });
                    break;
            }
        } catch(err) {
            contentDiv.innerHTML = `<p class="error-message">コンテンツの読み込みに失敗しました。</p>`;
            console.error("loadProfileTabContent error:", err);
        }
    }

    async function showSettingsScreen() {
        if (!currentUser) return router();
        DOM.pageHeader.innerHTML = `<h2 id="page-title">設定</h2>`;
        showScreen('settings-screen');
        newIconDataUrl = null;
        resetIconToDefault = false;
        document.getElementById('settings-screen').innerHTML = `
            <form id="settings-form">
                <label for="setting-username">ユーザー名:</label>
                <input type="text" id="setting-username" required value="${escapeHTML(currentUser.name)}">
                
                <label for="setting-icon-input">アイコン:</label>
                <div class="setting-icon-container">
                    <img id="setting-icon-preview" src="${getUserIconUrl(currentUser)}" alt="icon preview" title="クリックしてファイルを選択">
                    <button type="button" id="reset-icon-btn">デフォルトに戻す</button>
                </div>
                <input type="file" id="setting-icon-input" accept="image/*" class="hidden">

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
        
        const iconInput = document.getElementById('setting-icon-input');
        const iconPreview = document.getElementById('setting-icon-preview');
        
        iconPreview.addEventListener('click', () => iconInput.click());
        iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                resetIconToDefault = false;
                const reader = new FileReader();
                reader.onload = (event) => {
                    newIconDataUrl = event.target.result;
                    iconPreview.src = newIconDataUrl;
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('reset-icon-btn').addEventListener('click', () => {
            resetIconToDefault = true;
            newIconDataUrl = null;
            iconInput.value = ''; // ファイル選択をクリア
            iconPreview.src = `https://trampoline.turbowarp.org/avatars/by-username/${currentUser.scid}`;
        });

        document.getElementById('settings-form').addEventListener('submit', handleUpdateSettings);
        showLoading(false);
    }
    
    async function loadPostsWithPagination(container, type, options = {}) {
        currentPagination = { page: 0, hasMore: true, type, options };
        
        let trigger = container.querySelector('.load-more-trigger');
        if (trigger) trigger.remove();
        
        trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        container.appendChild(trigger);
        
        const loadMore = async () => {
            if (isLoadingMore || !currentPagination.hasMore) return;
            isLoadingMore = true;
            trigger.innerHTML = '<div class="spinner"></div>';

            const from = currentPagination.page * POSTS_PER_PAGE;
            const to = from + POSTS_PER_PAGE - 1;
            
            let query = supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))');

            if (type === 'timeline') {
                query = query.is('reply_id', null);
                if (options.tab === 'following') {
                    if (currentUser?.follow?.length > 0) { query = query.in('userid', currentUser.follow); } 
                    else { currentPagination.hasMore = false; }
                }
            } else if (type === 'search') {
                query = query.ilike('content', `%${options.query}%`);
            } else if (type === 'likes' || type === 'stars' || type === 'profile_posts') {
                if (!options.ids || options.ids.length === 0) { currentPagination.hasMore = false; } 
                else { query = query.in('id', options.ids); }
            }
            
            query = query.order('time', { ascending: false });

            const emptyMessages = { timeline: 'まだポストがありません。', search: '該当するポストはありません。', likes: 'いいねしたポストはありません。', stars: 'お気に入りに登録したポストはありません。', profile_posts: 'このユーザーはまだポストしていません。' };
            if (!currentPagination.hasMore) {
                const existingPosts = container.querySelectorAll('.post').length;
                trigger.innerHTML = existingPosts === 0 ? emptyMessages[type] || '' : 'すべてのポストを読み込みました';
                isLoadingMore = false;
                if(postLoadObserver) postLoadObserver.unobserve(trigger);
                return;
            }
            
            const { data: posts, error } = await query.range(from, to);

            if (error) {
                console.error("ポストの読み込みに失敗:", error);
                trigger.innerHTML = '読み込みに失敗しました。';
            } else {
                if (posts.length > 0) {
                    const postIds = posts.map(p => p.id);

                    const { data: counts, error: countError } = await supabase.rpc('get_reply_counts', { post_ids: postIds });
                    const replyCountsMap = countError ? new Map() : new Map(counts.map(c => [c.post_id, c.reply_count]));

                    const mentionRegex = /@(\d+)/g;
                    const allMentionedIds = new Set();
                    posts.forEach(p => {
                        if(!p.content) return;
                        const matches = p.content.matchAll(mentionRegex);
                        for (const match of matches) {
                            allMentionedIds.add(parseInt(match[1]));
                        }
                    });
                    
                    const newIdsToFetch = [...allMentionedIds].filter(id => !allUsersCache.has(id));
                    if (newIdsToFetch.length > 0) {
                        const { data: newUsers } = await supabase.from('user').select('id, name').in('id', newIdsToFetch);
                        if(newUsers) newUsers.forEach(u => allUsersCache.set(u.id, u)); // ★★★ タイプミスを修正 ★★★
                    }
                    const userCacheForRender = allUsersCache;

                    for (const post of posts) {
                        const postEl = await renderPost(post, post.user || {}, { replyCountsMap, userCache: userCacheForRender });
                        if (postEl) trigger.before(postEl);
                    }
    
                    currentPagination.page++;
                    if (posts.length < POSTS_PER_PAGE) { currentPagination.hasMore = false; }
                } else {
                    currentPagination.hasMore = false;
                }

                if (!currentPagination.hasMore) {
                    const existingPosts = container.querySelectorAll('.post').length;
                    trigger.innerHTML = existingPosts === 0 ? emptyMessages[type] || '' : 'すべてのポストを読み込みました';
                    if (postLoadObserver) postLoadObserver.unobserve(trigger);
                } else {
                    trigger.innerHTML = '';
                }
            }
            isLoadingMore = false;
        };
        
        postLoadObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoadingMore) {
                loadMore();
            }
        }, { rootMargin: '200px' });

        postLoadObserver.observe(trigger);
    }

    async function switchTimelineTab(tab) {
        if (tab === 'following' && !currentUser) return;
        isLoadingMore = false; // 読み込み状態をリセット
        currentTimelineTab = tab;
        document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        
        if (postLoadObserver) postLoadObserver.disconnect();
        DOM.timeline.innerHTML = '';
        await loadPostsWithPagination(DOM.timeline, 'timeline', { tab });
    }
    
    async function handleUpdateSettings(event) {
        event.preventDefault();
        if (!currentUser) return;
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
        
        if (resetIconToDefault) {
            updatedData.icon_data = null;
        } else if (newIconDataUrl) {
            updatedData.icon_data = newIconDataUrl;
        }

        if (!updatedData.name) return alert('ユーザー名は必須です。');
        const { data, error } = await supabase.from('user').update(updatedData).eq('id', currentUser.id).select().single();
        if (error) {
            alert('設定の更新に失敗しました。');
        } else {
            alert('設定を更新しました。');
            currentUser = data; // メモリ上のcurrentUserを更新
            newIconDataUrl = null; // リセット
            resetIconToDefault = false; // リセット
            window.location.hash = '';
        }
    }

    // --- 11. ユーザーアクション (変更なし) ---
    window.togglePostMenu = (postId) => {
        const targetMenu = document.getElementById(`menu-${postId}`);
        if (!targetMenu) {
            return;
        }

        const isCurrentlyVisible = targetMenu.classList.contains('is-visible');

        // まず、現在開いている他のメニューをすべて閉じる
        document.querySelectorAll('.post-menu.is-visible').forEach(menu => {
            menu.classList.remove('is-visible');
        });

        // ターゲットメニューが今閉じたものでなければ、開く
        if (!isCurrentlyVisible) {
            targetMenu.classList.add('is-visible');
        }
    };

    window.deletePost = async (postId) => {
        if (!confirm('このポストを削除しますか？')) return;
    showLoading(true);
    try {
        const { data: postData, error: fetchError } = await supabase.from('post').select('attachments').eq('id', postId).single();
        if (fetchError) throw new Error(`ポスト情報の取得に失敗: ${fetchError.message}`);
        if (postData.attachments && postData.attachments.length > 0) {
            const fileIds = postData.attachments.map(file => file.id);
            const { error: storageError } = await supabaseAdmin.storage.from('nyax').remove(fileIds);
            if (storageError) { console.error('ストレージのファイル削除に失敗:', storageError.message); }
        }
        const { error: deleteError } = await supabase.from('post').delete().eq('id', postId);
        if (deleteError) throw deleteError;
        if (currentUser && currentUser.post?.includes(postId)) {
            const updatedPosts = currentUser.post.filter(id => id !== postId);
            const { error: userUpdateError } = await supabase.from('user').update({ post: updatedPosts }).eq('id', currentUser.id);
            if (userUpdateError) { console.error("ユーザーのポストリスト更新に失敗:", userUpdateError); } 
            else { currentUser.post = updatedPosts; localStorage.setItem('currentUser', JSON.stringify(currentUser)); }
        }
        router();
    } catch(e) { console.error(e); alert('削除に失敗しました。'); } 
    finally { showLoading(false); }
    };
    window.handleReplyClick = (postId, username) => { if (!currentUser) return alert("ログインが必要です。"); openPostModal({ id: postId, name: username }); };
    window.clearReply = () => { replyingTo = null; const replyInfo = document.getElementById('reply-info'); if (replyInfo) replyInfo.classList.add('hidden'); };
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
        if (!isLiked) {
            const { data: postData } = await supabase.from('post').select('userid').eq('id', postId).single();
            if (postData?.userid && postData.userid !== currentUser.id) {
                sendNotification(postData.userid, `${escapeHTML(currentUser.name)}さんがあなたのポストにいいねしました。`);
            }
        }
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
            currentUser.star = updatedStars;
            // localStorageはIDしか保持しないので更新不要
            countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
            button.classList.toggle('starred', !isStarred);
            iconSpan.textContent = isStarred ? '☆' : '★'; // アイコンのトグルを修正
            if (!isStarred) {
                const { data: postData } = await supabase.from('post').select('userid').eq('id', postId).single();
            if (postData?.userid && postData.userid !== currentUser.id) {
                sendNotification(postData.userid, `${escapeHTML(currentUser.name)}さんがあなたのポストをお気に入りに登録しました。`);
            }
        }
     }
        button.disabled = false;
    };
    
    window.handleFollowToggle = async (targetUserId, button) => {
        if (!currentUser) return alert("ログインが必要です。");
        button.disabled = true;
        const isFollowing = currentUser.follow?.includes(targetUserId);
        const updatedFollows = isFollowing ? currentUser.follow.filter(id => id !== targetUserId) : [...(currentUser.follow || []), targetUserId];
        
        const { error } = await supabase.from('user').update({ follow: updatedFollows }).eq('id', currentUser.id);
        if (error) {
            alert('フォロー状態の更新に失敗しました。');
            button.disabled = false;
        } else {
            currentUser.follow = updatedFollows; // メモリ上のユーザー情報を更新
            updateFollowButtonState(button, !isFollowing);
            if (!isFollowing) { sendNotification(targetUserId, `${escapeHTML(currentUser.name)}さんがあなたをフォローしました。`); }
            const followerCountSpan = document.querySelector('#follower-count strong');
            if (followerCountSpan) {
                const { data: newCount, error: newCountError } = await supabase.rpc('get_follower_count', { target_user_id: targetUserId });
                if (!newCountError) { followerCountSpan.textContent = newCount; } 
                else { console.error("フォロワー数の再取得に失敗:", newCountError); followerCountSpan.textContent = '?'; }
            }
        }
    }

async function openEditPostModal(postId) {
        showLoading(true);
        try {
            const { data: post, error } = await supabase.from('post').select('content, attachments').eq('id', postId).single();
            if (error || !post) throw new Error('ポスト情報の取得に失敗しました。');
            
            let currentAttachments = post.attachments || [];
            let filesToDelete = new Set();
            let filesToAdd = [];

            const renderAttachments = () => {
                let existingAttachmentsHTML = '';
                currentAttachments.forEach((attachment, index) => {
                    if (filesToDelete.has(attachment.id)) return;
                    existingAttachmentsHTML += `
                        <div class="file-preview-item">
                            <span>${attachment.type === 'image' ? '🖼️' : '📎'} ${escapeHTML(attachment.name)}</span>
                            <button class="file-preview-remove" data-id="${attachment.id}" data-type="existing">×</button>
                        </div>`;
                });

                let newAttachmentsHTML = '';
                filesToAdd.forEach((file, index) => {
                    newAttachmentsHTML += `
                        <div class="file-preview-item">
                            <span>${file.type.startsWith('image/') ? '🖼️' : '📎'} ${escapeHTML(file.name)}</span>
                            <button class="file-preview-remove" data-index="${index}" data-type="new">×</button>
                        </div>`;
                });
                return existingAttachmentsHTML + newAttachmentsHTML;
            };

            const updatePreview = () => {
                const container = DOM.editPostModalContent.querySelector('.file-preview-container');
                if (container) container.innerHTML = renderAttachments();
            };

            DOM.editPostModalContent.innerHTML = `
                <div class="post-form" style="padding: 1rem;">
                    <img src="${getUserIconUrl(currentUser)}" class="user-icon" alt="your icon">
                    <div class="form-content">
                        <textarea id="edit-post-textarea" class="post-form-textarea">${post.content}</textarea>
                        <div class="file-preview-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">${renderAttachments()}</div>
                        <div class="post-form-actions" style="padding-top: 1rem;">
                            <button type="button" class="attachment-button" title="ファイルを追加">${ICONS.attachment}</button>
                            <input type="file" id="edit-file-input" class="hidden" multiple>
                            <button id="update-post-button" style="padding: 0.5rem 1.5rem; border-radius: 9999px; border: none; background-color: var(--primary-color); color: white; font-weight: 700; margin-left: auto;">保存</button>
                        </div>
                    </div>
                </div>
            `;
            
            DOM.editPostModal.querySelector('#update-post-button').onclick = () => handleUpdatePost(postId, currentAttachments, filesToAdd, Array.from(filesToDelete));
            DOM.editPostModal.querySelector('.modal-close-btn').onclick = () => DOM.editPostModal.classList.add('hidden');
            
            DOM.editPostModal.querySelector('.attachment-button').onclick = () => {
                DOM.editPostModal.querySelector('#edit-file-input').click();
            };

            DOM.editPostModal.querySelector('#edit-file-input').onchange = (e) => {
                filesToAdd.push(...Array.from(e.target.files));
                updatePreview();
            };

            DOM.editPostModal.querySelector('.file-preview-container').onclick = (e) => {
                if (e.target.classList.contains('file-preview-remove')) {
                    const type = e.target.dataset.type;
                    if (type === 'existing') {
                        filesToDelete.add(e.target.dataset.id);
                    } else if (type === 'new') {
                        const index = parseInt(e.target.dataset.index);
                        filesToAdd.splice(index, 1);
                    }
                    updatePreview();
                }
            };

            DOM.editPostModal.classList.remove('hidden');
            DOM.editPostModal.querySelector('#edit-post-textarea').focus();

        } catch(e) { console.error(e); alert(e.message); } 
        finally { showLoading(false); }
    }
    
    window.openDmManageModal = async function(dmId) {
        DOM.dmManageModalContent.innerHTML = '<div class="spinner"></div>';
        DOM.dmManageModal.classList.remove('hidden');
        DOM.dmManageModal.querySelector('.modal-close-btn').onclick = () => DOM.dmManageModal.classList.add('hidden');

        try {
            const { data: dm, error } = await supabase.from('dm').select('*').eq('id', dmId).single();
            if (error || !dm) throw new Error('DM情報の取得に失敗しました。');

            const isHost = dm.host_id === currentUser.id;
            const memberDetails = await Promise.all(
                dm.member.map(async (id) => allUsersCache[id] || (await supabase.from('user').select('id, name').eq('id', id).single()).data)
            );
            
            let html = `<div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;"><h3>DM管理</h3>`;

            if (isHost) {
                html += `
                    <div>
                        <label for="dm-title-input" style="font-weight: bold; display: block; margin-bottom: 0.5rem;">タイトル</label>
                        <input type="text" id="dm-title-input" value="${escapeHTML(dm.title || '')}" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px;">
                        <button id="save-dm-title-btn" style="margin-top: 0.5rem;">タイトルを保存</button>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0;">メンバー (${dm.member.length})</h4>
                        <div id="dm-member-list">
                            ${memberDetails.map(m => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                                    <span>${escapeHTML(m.name)} (#${m.id}) ${m.id === dm.host_id ? '(ホスト)' : ''}</span>
                                    ${m.id !== dm.host_id ? `<button class="remove-member-btn" data-user-id="${m.id}" data-user-name="${escapeHTML(m.name)}">削除</button>` : ''}
                                </div>`).join('')}
                        </div>
                    </div>
                    <div>
                        <label for="dm-add-member-search" style="font-weight: bold; display: block; margin-bottom: 0.5rem;">メンバーを追加</label>
                        <input type="text" id="dm-add-member-search" placeholder="ユーザー名またはIDで検索" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px;">
                        <div id="dm-add-member-results" style="margin-top: 0.5rem; max-height: 150px; overflow-y: auto;"></div>
                    </div>
                    <hr>
                    <button id="disband-dm-btn" style="align-self: flex-end;">DMを解散</button>
                `;
            } else {
                html += `
                    <p>このDMから退出しますか？<br>一度退出すると、再度招待されない限り参加できません。</p>
                    <button id="leave-dm-btn" style="align-self: flex-end;">DMから退出</button>
                `;
            }
            html += `</div>`;
            DOM.dmManageModalContent.innerHTML = html;

            // Event Listeners
            if (isHost) {
                document.getElementById('save-dm-title-btn').onclick = () => handleUpdateDmTitle(dmId, document.getElementById('dm-title-input').value);
                document.getElementById('disband-dm-btn').onclick = () => handleDisbandDm(dmId);
                
                document.querySelectorAll('.remove-member-btn').forEach(btn => {
                    const userId = parseInt(btn.dataset.userId);
                    const userName = btn.dataset.userName;
                    btn.onclick = () => handleRemoveDmMember(dmId, userId, userName);
                });
                
                const searchInput = document.getElementById('dm-add-member-search');
                const resultsContainer = document.getElementById('dm-add-member-results');
                let searchTimeout;
                searchInput.addEventListener('input', () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(async () => {
                        const query = searchInput.value.trim();
                        if (query.length < 2) { resultsContainer.innerHTML = ''; return; }
                        
                        const { data: users } = await supabase.from('user').select('id, name').or(`name.ilike.%${query}%,id.eq.${parseInt(query) || 0}`).limit(5);
                        const nonMembers = users.filter(u => !dm.member.includes(u.id));

                        resultsContainer.innerHTML = nonMembers.length > 0
                            ? nonMembers.map(u => `<div class="widget-item" style="cursor: pointer;" data-user-id="${u.id}"><strong>${escapeHTML(u.name)}</strong> (#${u.id})</div>`).join('')
                            : `<div class="widget-item">ユーザーが見つかりません。</div>`;
                    }, 300);
                });
                resultsContainer.addEventListener('click', (e) => {
                    const userDiv = e.target.closest('[data-user-id]');
                    if (userDiv) {
                        const userId = parseInt(userDiv.dataset.userId);
                        const userName = userDiv.querySelector('strong').textContent;
                        handleAddDmMember(dmId, userId, userName);
                    }
                });

            } else {
                document.getElementById('leave-dm-btn').onclick = () => handleLeaveDm(dmId);
            }

        } catch (e) {
            DOM.dmManageModalContent.innerHTML = `<p style="padding: 1.5rem;">${e.message}</p>`;
            console.error(e);
        }
    };

    async function handleUpdateDmTitle(dmId, newTitle) {
        const { error } = await supabase.from('dm').update({ title: newTitle.trim() }).eq('id', dmId);
        if (error) {
            alert('タイトルの更新に失敗しました。');
        } else {
            alert('タイトルを更新しました。');
            DOM.dmManageModal.classList.add('hidden');
            showDmScreen(dmId);
        }
    }

    async function handleRemoveDmMember(dmId, userIdToRemove, userNameToRemove) {
        if (!confirm(`${userNameToRemove}さんをDMから削除しますか？`)) return;

        const { data: dm } = await supabase.from('dm').select('member').eq('id', dmId).single();
        const updatedMembers = dm.member.filter(id => id !== userIdToRemove);

        const { error } = await supabase.from('dm').update({ member: updatedMembers }).eq('id', dmId);
        if (error) {
            alert('メンバーの削除に失敗しました。');
        } else {
            await sendSystemDmMessage(dmId, `${currentUser.name}さんが${userNameToRemove}さんを強制退出させました`);
            await sendNotification(userIdToRemove, `${currentUser.name}さんによってDMから削除されました。`);
            alert('メンバーを削除しました。');
            openDmManageModal(dmId); // モーダルを再描画
        }
    }

    async function handleAddDmMember(dmId, userIdToAdd, userNameToAdd) {
        if (!confirm(`${userNameToAdd}さんをDMに追加しますか？`)) return;

        const { data: dm } = await supabase.from('dm').select('member').eq('id', dmId).single();
        if (dm.member.includes(userIdToAdd)) {
            alert('このユーザーは既にメンバーです。');
            return;
        }
        const updatedMembers = [...dm.member, userIdToAdd];

        const { error } = await supabase.from('dm').update({ member: updatedMembers }).eq('id', dmId);
        if (error) {
            alert('メンバーの追加に失敗しました。');
        } else {
            await sendSystemDmMessage(dmId, `${currentUser.name}さんが${userNameToAdd}さんを招待しました`);
            await sendNotification(userIdToAdd, `${currentUser.name}さんがあなたをDMに招待しました。`);
            alert('メンバーを追加しました。');
            openDmManageModal(dmId); // モーダルを再描画
        }
    }
    
    async function handleLeaveDm(dmId) {
        if (!confirm('本当にこのDMから退出しますか？')) return;

        const { data: dm } = await supabase.from('dm').select('member').eq('id', dmId).single();
        const updatedMembers = dm.member.filter(id => id !== currentUser.id);

        const { error } = await supabase.from('dm').update({ member: updatedMembers }).eq('id', dmId);
        if (error) {
            alert('DMからの退出に失敗しました。');
        } else {
            await sendSystemDmMessage(dmId, `${currentUser.name}さんが退出しました`);
            alert('DMから退出しました。');
            DOM.dmManageModal.classList.add('hidden');
            window.location.hash = '#dm';
        }
    }

    async function handleDisbandDm(dmId) {
        if (!confirm('本当にこのDMを解散しますか？この操作は取り消せません。')) return;
        
        const { error } = await supabase.from('dm').delete().eq('id', dmId);
        if (error) {
            alert('DMの解散に失敗しました。');
        } else {
            alert('DMを解散しました。');
            DOM.dmManageModal.classList.add('hidden');
            window.location.hash = '#dm';
        }
    }

    async function sendSystemDmMessage(dmId, content) {
        const message = {
            id: crypto.randomUUID(),
            time: new Date().toISOString(),
            type: 'system',
            content: content,
        };
        await supabase.rpc('append_to_dm_post', { dm_id_in: dmId, new_message_in: message });
    }

    async function handleUpdatePost(postId, originalAttachments, filesToAdd, filesToDeleteIds) {
        const newContent = DOM.editPostModal.querySelector('#edit-post-textarea').value.trim();
        const editPostTextarea = DOM.editPostModal.querySelector('#edit-post-textarea');
        editPostTextarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleUpdatePost(postId, originalAttachments, filesToAdd, filesToDeleteIds);
            }
        });
        const button = DOM.editPostModal.querySelector('#update-post-button');
        button.disabled = true; button.textContent = '保存中...';
        showLoading(true);

        try {
            // 1. ファイルを削除
            if (filesToDeleteIds.length > 0) {
                const { error: deleteError } = await supabaseAdmin.storage.from('nyax').remove(filesToDeleteIds);
                if (deleteError) console.error('ストレージのファイル削除に失敗:', deleteError);
            }

            // 2. ファイルをアップロード
            let newUploadedAttachments = [];
            if (filesToAdd.length > 0) {
                for (const file of filesToAdd) {
                    const fileId = crypto.randomUUID();
                    const { error: uploadError } = await supabaseAdmin.storage.from('nyax').upload(fileId, file);
                    if (uploadError) throw new Error(`ファイルアップロードに失敗: ${uploadError.message}`);
                    
                    const fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'file'));
                    newUploadedAttachments.push({ type: fileType, id: fileId, name: file.name });
                }
            }
            
            // 3. 添付ファイルリストを更新
            let finalAttachments = originalAttachments.filter(att => !filesToDeleteIds.includes(att.id));
            finalAttachments.push(...newUploadedAttachments);

            // 4. ポスト情報をDBで更新
            const { error: postUpdateError } = await supabase.from('post').update({ content: newContent, attachments: finalAttachments.length > 0 ? finalAttachments : null }).eq('id', postId);
            if (postUpdateError) throw postUpdateError;
            
            DOM.editPostModal.classList.add('hidden');
            router(); // 画面を再読み込みして変更を反映

        } catch(e) { console.error(e); alert('ポストの更新に失敗しました。'); } 
        finally { button.disabled = false; button.textContent = '保存'; showLoading(false); }
    }
    
    // --- [新規追加] DM操作関数 ---
    async function handleDmButtonClick(targetUserId) {
        if (!currentUser) return;
        const members = [currentUser.id, targetUserId].sort();

        // 1対1のDMが既に存在するかチェック
        const { data: existingDm, error } = await supabase.from('dm')
            .select('id')
            .contains('member', members)
            .eq('member', `{${members.join(',')}}`) // ★★★ integer[]型に合わせた形式に変更 ★★★
            .single();

        if (existingDm) {
            window.location.hash = `#dm/${existingDm.id}`;
        } else {
            const {data: targetUser} = await supabase.from('user').select('name').eq('id', targetUserId).single();
            if (confirm(`${targetUser.name}さんとの新しいDMを作成しますか？`)) {
                const { data: newDm, error: createError } = await supabase.from('dm').insert({
                    host_id: currentUser.id,
                    member: members,
                    title: `${currentUser.name}, ${targetUser.name}`
                }).select('id').single();

                if (createError) {
                    alert('DMの作成に失敗しました。');
                } else {
                    window.location.hash = `#dm/${newDm.id}`;
                }
            }
        }
    }
    
    window.openCreateDmModal = function() {
        DOM.createDmModalContent.innerHTML = `
            <div style="padding: 1.5rem;">
                <h3>新しいメッセージ</h3>
                <p>ユーザーを検索してDMを開始します。</p>
                <input type="text" id="dm-user-search" placeholder="ユーザー名またはIDで検索" style="width: 100%; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: 8px;">
                <div id="dm-user-search-results" style="margin-top: 1rem; max-height: 200px; overflow-y: auto;"></div>
            </div>
        `;

        const searchInput = DOM.createDmModalContent.querySelector('#dm-user-search');
        const resultsContainer = DOM.createDmModalContent.querySelector('#dm-user-search-results');
        
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = searchInput.value.trim();
                if (query.length < 2) {
                    resultsContainer.innerHTML = '';
                    return;
                }
                const { data: users, error } = await supabase.from('user')
                    .select('id, name, scid')
                    .or(`name.ilike.%${query}%,id.eq.${parseInt(query) || 0}`)
                    .neq('id', currentUser.id)
                    .limit(5);

                if (users && users.length > 0) {
                    resultsContainer.innerHTML = users.map(u => `
                        <div class="widget-item" style="cursor: pointer;" data-user-id="${u.id}" data-user-name="${escapeHTML(u.name)}">
                            <strong>${escapeHTML(u.name)}</strong> (#${u.id})
                        </div>
                    `).join('');
                } else {
                    resultsContainer.innerHTML = `<div class="widget-item">ユーザーが見つかりません。</div>`;
                }
            }, 300);
        });

        resultsContainer.addEventListener('click', (e) => {
            const userDiv = e.target.closest('[data-user-id]');
            if (userDiv) {
                const targetUserId = parseInt(userDiv.dataset.userId);
                const targetUserName = userDiv.dataset.userName;
                DOM.createDmModal.classList.add('hidden');
                handleDmButtonClick(targetUserId);
            }
        });
        
        DOM.createDmModal.classList.remove('hidden');
        DOM.createDmModal.querySelector('.modal-close-btn').onclick = () => {
            DOM.createDmModal.classList.add('hidden');
        };
    }
    
    async function sendDmMessage(dmId) {
        const input = document.getElementById('dm-message-input');
        const content = input.value.trim();
        if (!content) return;
        input.disabled = true;

        const message = {
            id: crypto.randomUUID(),
            time: new Date().toISOString(),
            userid: currentUser.id,
            reply_id: null,
            content: content,
            attachments: []
        };

        const { error } = await supabase.rpc('append_to_dm_post', {
            dm_id_in: dmId,
            new_message_in: message
        });

        if (error) {
            alert('メッセージの送信に失敗しました。');
            console.error(error);
        } else {
            input.value = '';
        }
        input.disabled = false;
        input.focus();
    }
    
    // --- 12. リアルタイム更新 ---
    function subscribeToChanges() {
        if (realtimeChannel) return;
        realtimeChannel = supabase.channel('nyax-feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post' }, async (payload) => {
                const mainScreenEl = document.getElementById('main-screen');
                
                // ▼▼▼ [修正点1, 2] ボタンの挿入位置を変更 ▼▼▼
                if (mainScreenEl && !mainScreenEl.classList.contains('hidden')) {
                    if (document.querySelector('.new-posts-indicator')) return;
                    
                    const indicator = document.createElement('div');
                    indicator.className = 'new-posts-indicator';
                    const button = document.createElement('button');
                    button.textContent = '新しいポストを表示';
                    button.onclick = () => {
                        indicator.remove();
                        router();
                    };
                    indicator.appendChild(button);
                    
                    // ポストフォームコンテナの前に挿入する
                    const postFormStickyContainer = mainScreenEl.querySelector('.post-form-sticky-container');
                    if (postFormStickyContainer) {
                        mainScreenEl.insertBefore(indicator, postFormStickyContainer);
                    }
                } else if (!document.getElementById('post-detail-screen').classList.contains('hidden')) {
                // ▲▲▲ [修正点1, 2] ここまで ▼▼▼
                    const currentPostId = window.location.hash.substring(6);
                    if (payload.new.reply_id === currentPostId) {
                        router();
                    }
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user', filter: `id=eq.${currentUser?.id}` }, payload => {
                updateNavAndSidebars();
            })
            .subscribe();
    }
    
        // --- 13. 初期化処理 ---

    // アプリケーション全体のクリックイベントを処理する単一のハンドラ
    document.addEventListener('click', (e) => {
        const target = e.target;

        // --- 1. メニューを開く/閉じるボタンの処理 ---
        const menuButton = target.closest('.post-menu-btn');
        if (menuButton) {
            e.stopPropagation();
            const postElement = menuButton.closest('.post');
            if (postElement) {
                window.togglePostMenu(postElement.dataset.postId);
            }
            return;
        }

        // --- 2. メニュー内のボタンの処理 ---
        const editButton = target.closest('.edit-btn');
        if (editButton) {
            const postElement = editButton.closest('.post');
            if (postElement) {
                // 編集モーダルを開き、メニューを閉じる
                openEditPostModal(postElement.dataset.postId);
                document.getElementById(`menu-${postElement.dataset.postId}`)?.classList.remove('is-visible');
            }
            return;
        }
        const deleteButton = target.closest('.delete-btn');
        if (deleteButton) {
            const postElement = deleteButton.closest('.post');
            if (postElement) {
                // 削除処理を実行（メニューは画面遷移で消えるのでそのままでOK）
                window.deletePost(postElement.dataset.postId);
            }
            return;
        }

        // --- 3. メニューの外側がクリックされたら、開いているメニューを閉じる ---
        if (!target.closest('.post-menu')) {
            document.querySelectorAll('.post-menu.is-visible').forEach(menu => {
                menu.classList.remove('is-visible');
            });
        }

        // --- 4. ポスト関連の他のインタラクティブな要素の処理 ---
        if (target.closest('#main-content')) {
            const postElement = target.closest('.post');
            if (postElement) {
                const postId = postElement.dataset.postId;
                const replyButton = target.closest('.reply-button');
                const likeButton = target.closest('.like-button');
                const starButton = target.closest('.star-button');
                const imageAttachment = target.closest('.attachment-item img');
                const downloadLink = target.closest('.attachment-download-link');

                if (replyButton) { window.handleReplyClick(postId, replyButton.dataset.username); return; }
                if (likeButton) { window.handleLike(likeButton, postId); return; }
                if (starButton) { window.handleStar(starButton, postId); return; }
                if (imageAttachment) { window.openImageModal(imageAttachment.src); return; }
                if (downloadLink) { e.preventDefault(); window.handleDownload(downloadLink.dataset.url, downloadLink.dataset.name); return; }
                if (target.closest('a')) { return; }
                
                // メニューやボタン、リンク以外の部分がクリックされた場合
                if (!target.closest('.post-menu')) {
                    window.location.hash = `#post/${postId}`;
                    return;
                }
            }
        }
        
        // --- 5. その他のグローバルなクリック処理 ---
        const timelineTab = target.closest('.timeline-tab-button');
        if(timelineTab) {
            switchTimelineTab(timelineTab.dataset.tab);
            return;
        }
        
        const bannerSignup = target.closest('#banner-signup-button');
        if(bannerSignup) {
            goToLoginPage();
            return;
        }

        const bannerLogin = target.closest('#banner-login-button');
        if(bannerLogin) {
            goToLoginPage();
            return;
        }
    });

    // 「再試行」ボタンのイベントリスナー
    DOM.retryConnectionBtn.addEventListener('click', () => {
        DOM.connectionErrorOverlay.classList.add('hidden'); // エラー表示を隠す
        checkSession(); // 再度セッションチェックを実行
    });

    window.addEventListener('hashchange', router);
    
    // 全ての準備が整った後、最後にセッションチェックを開始
    DOM.friezeOverlay.classList.add('hidden');
    DOM.connectionErrorOverlay.classList.add('hidden');
    checkSession();
});
