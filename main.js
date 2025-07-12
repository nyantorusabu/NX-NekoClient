window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初期設定 & グローバル変数 ---
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
    
    const { createClient } = window.supabase;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        reply: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`
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
        // ▼▼▼ この2行を追加 ▼▼▼
        editDmMessageModal: document.getElementById('edit-dm-message-modal'),
        editDmMessageModalContent: document.getElementById('edit-dm-message-modal-content'),
        // ▲▲▲ 追加ここまで ▲▲▲
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
        
        // icon_dataが存在するかチェック
        if (user.icon_data) {
            // Data URL形式か、それともファイルID(UUID)かを判別
            if (user.icon_data.startsWith('data:image')) {
                // 古い形式（Data URL）の場合はそのまま返す
                return user.icon_data;
            } else {
                // 新しい形式（ファイルID）の場合は、Supabase Storageの公開URLを生成して返す
                const { data } = supabase.storage.from('nyax').getPublicUrl(user.icon_data);
                return data.publicUrl;
            }
        }
        
        // icon_dataがなければ、デフォルトのScratchアバターURLを返す
        return `https://trampoline.turbowarp.org/avatars/by-username/${user.scid}`;
    }

    function renderDmMessage(msg) {
        if (msg.type === 'system') {
            const formattedContent = formatPostContent(msg.content, allUsersCache);
            return `<div class="dm-system-message">${formattedContent}</div>`;
        }

        let attachmentsHTML = '';
        if (msg.attachments && msg.attachments.length > 0) {
            attachmentsHTML += '<div class="attachments-container">';
            for (const attachment of msg.attachments) {
                const { data: publicUrlData } = supabase.storage.from('nyax').getPublicUrl(attachment.id);
                const publicURL = publicUrlData.publicUrl;
                
                let itemHTML = '<div class="attachment-item">';
                if (attachment.type === 'image') {
                    itemHTML += `<img src="${publicURL}" alt="${escapeHTML(attachment.name)}" class="attachment-image" onclick="event.stopPropagation(); window.openImageModal('${publicURL}')">`;
                } else if (attachment.type === 'video') {
                    itemHTML += `<video src="${publicURL}" controls onclick="event.stopPropagation();"></video>`;
                } else if (attachment.type === 'audio') {
                    itemHTML += `<audio src="${publicURL}" controls onclick="event.stopPropagation();"></audio>`;
                }
                
                itemHTML += `<a href="#" class="attachment-download-link" onclick="event.preventDefault(); event.stopPropagation(); window.handleDownload('${publicURL}', '${escapeHTML(attachment.name)}')">ダウンロード: ${escapeHTML(attachment.name)}</a>`;
                itemHTML += '</div>';
                attachmentsHTML += itemHTML;
            }
            attachmentsHTML += '</div>';
        }

        const formattedContent = msg.content ? formatPostContent(msg.content, allUsersCache) : '';
        const sent = msg.userid === currentUser.id;
        
        if (sent) {
            // 送信メッセージ
            return `<div class="dm-message-container sent" data-message-id="${msg.id}">
                <div class="dm-message-wrapper">
                    <button class="dm-message-menu-btn">…</button>
                    <div class="post-menu">
                        <button class="edit-dm-msg-btn">編集</button>
                        <button class="delete-dm-msg-btn delete-btn">削除</button>
                    </div>
                    <div class="dm-message">${formattedContent}${attachmentsHTML}</div>
                </div>
            </div>`;
        } else {
            // 受信メッセージ
            const user = allUsersCache.get(msg.userid) || {};
            const time = new Date(msg.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            return `<div class="dm-message-container received">
                <a href="#profile/${user.id}" class="dm-user-link">
                    <img src="${getUserIconUrl(user)}" class="dm-message-icon">
                </a>
                <div class="dm-message-wrapper">
                    <div class="dm-message-meta">
                        <a href="#profile/${user.id}" class="dm-user-link">${escapeHTML(user.name || '不明')}</a>
                        ・${time}
                    </div>
                    <div class="dm-message">${formattedContent}${attachmentsHTML}</div>
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

    async function sendNotification(recipientId, message, openHash = '') {
        if (!currentUser || !recipientId || !message || recipientId === currentUser.id) return;
        
        try {
            const { error } = await supabase.rpc('send_notification_with_timestamp', {
                recipient_id: recipientId,
                message_text: message,
                open_hash: openHash
            });

            if (error) {
                console.error('通知の送信に失敗しました:', error);
            }
        } catch (e) {
            console.error('通知送信中にエラー発生:', e);
        }
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
            else if (hash.startsWith('#profile/')) {
                const path = hash.substring(9);
                const userId = parseInt(path, 10); // パスの先頭がユーザーID
                
                if (isNaN(userId)) {
                    window.location.hash = '#'; return;
                }

                // URLからサブページ名を取得
                const subpageMatch = path.match(/\/(.+)/);
                const subpage = subpageMatch ? subpageMatch[1] : 'posts'; // サブページがなければ'posts'
                
                await showProfileScreen(userId, subpage);
            }
            // ▲▲▲ 修正ここまで ▲▲▲
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
            // ▼▼▼ このreturn文を、新しいHTML構造に差し替え ▼▼▼
            return `
                <a href="${item.hash}" class="nav-item ${isActive ? 'active' : ''}">
                    <div class="nav-item-icon-container">
                        ${item.icon}
                        ${item.badge && item.badge > 0 ? `<span class="notification-badge">${item.badge > 99 ? '99+' : item.badge}</span>` : ''}
                    </div>
                    <span class="nav-item-text">${item.name}</span>
                </a>`;
            // ▲▲▲ HTML構造は前回と同じですが、CSSとの連携で重要なので再確認 ▲▲▲
        }).join('');
        // ▼▼▼ この行を修正 ▼▼▼
        if(currentUser) DOM.navMenuTop.innerHTML += `<button class="nav-item nav-item-post"><span class="nav-item-text">ポスト</span><span class="nav-item-icon">${ICONS.send}</span></button>`;
        // ▲▲▲ 修正ここまで ▲▲▲
        // 未ログイン時は何も表示せず、ログインしている場合のみアカウントボタンを表示する
        DOM.navMenuBottom.innerHTML = currentUser ? `<button id="account-button" class="nav-item account-button"> <img src="${getUserIconUrl(currentUser)}" class="user-icon" alt="${currentUser.name}'s icon"> <div class="account-info"> <span class="name">${escapeHTML(currentUser.name)}</span> <span class="id">#${currentUser.id}</span> </div> </button>` : '';
        DOM.loginBanner.classList.toggle('hidden', !!currentUser);
        // ▼▼▼ [修正点2] preventDefaultを削除し、通常のhashchangeをトリガーさせる ▼▼▼
        DOM.navMenuTop.querySelectorAll('a.nav-item').forEach(link => {
            link.onclick = (e) => {
                // hashchangeイベントに任せるため、preventDefaultはしない
            };
        });
        // ▲▲▲ [修正点2] ここまで ▼▼▼
        // ログアウトボタン（account-button）が存在する場合のみイベントリスナーを設定
        DOM.navMenuBottom.querySelector('#account-button')?.addEventListener('click', handleLogout);
        DOM.navMenuTop.querySelector('.nav-item-post')?.addEventListener('click', () => openPostModal());
        loadRightSidebar();
    }
    
    // --- 7. 認証とセッション ---
    function goToLoginPage() { window.location.href = 'login.html'; }
    function handleLogout() {
        if(!confirm("ログアウトしますか？")) return;
        // supabase.auth.signOut()を呼び出してセッションを破棄
        supabase.auth.signOut().then(() => {
            currentUser = null;
            if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
            window.location.hash = '#';
            router();
        });
    }
    async function checkSession() {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error(sessionError);
            DOM.connectionErrorOverlay.classList.remove('hidden');
            return;
        }

        if (session) {
            try {
                const authUserId = session.user.id; // これはUUID
                
                // 取得した認証UUIDを使って、'uuid'カラムを検索する
                const { data, error } = await supabase
                    .from('user')
                    .select('*')
                    .eq('uuid', authUserId) // 'id'ではなく'uuid'と比較する
                    .single();

                if (error || !data) throw new Error('ユーザーデータの取得に失敗しました。');
                
                currentUser = data;

                if (currentUser.frieze) {
                    DOM.friezeReason.textContent = currentUser.frieze;
                    DOM.friezeOverlay.classList.remove('hidden');
                    return;
                }

                subscribeToChanges();
                router();

            } catch (error) {
                console.error(error);
                currentUser = null;
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
                    const fileId = await uploadFileViaEdgeFunction(file);
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

            // --- 通知送信ロジック ---
            let repliedUserId = null; // 返信通知を送った相手を記録
            if (replyingTo) {
                const { data: parentPost } = await supabase.from('post').select('userid').eq('id', replyingTo.id).single();
                if (parentPost && parentPost.userid !== currentUser.id) {
                    repliedUserId = parentPost.userid;
                    sendNotification(repliedUserId, `@${currentUser.id}さんがあなたのポストに返信しました。`, `#post/${newPost.id}`);
                }
            }

            // メンション通知
            const mentionRegex = /@(\d+)/g;
            const mentionedIds = new Set();
            let match;
            while ((match = mentionRegex.exec(content)) !== null) {
                const mentionedId = parseInt(match[1]);
                // 自分自身と、すでに返信通知を送った相手は除外する
                if (mentionedId !== currentUser.id && mentionedId !== repliedUserId) {
                    mentionedIds.add(mentionedId);
                }
            }
            
            if (mentionedIds.size > 0) {
                mentionedIds.forEach(id => {
                    sendNotification(id, `@${currentUser.id}さんがあなたをメンションしました。`, `#post/${newPost.id}`);
                });
            }
            // --- 通知送信ロジックここまで ---

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

    async function uploadFileViaEdgeFunction(file) {
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke('upload-file', {
            body: formData,
        });

        if (error) {
            throw new Error(`ファイルアップロードに失敗しました: ${error.message}`);
        }
        
        // Edge Functionからの戻り値はdataの中にさらにdataプロパティがある場合がある
        const responseData = data.data || data;
        if (responseData.error) {
             throw new Error(`ファイルアップロードに失敗しました: ${responseData.error}`);
        }

        return responseData.fileId;
    }

    async function deleteFilesViaEdgeFunction(fileIds) {
        if (!fileIds || fileIds.length === 0) return;

        const { error } = await supabase.functions.invoke('delete-files', {
            body: JSON.stringify({ fileIds: fileIds }),
        });

        if (error) {
            console.error('ファイルの削除に失敗しました:', error.message);
            // ここではエラーをthrowせず、コンソールに出力するに留める
        }
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
        postHeader.className = 'post-header';
        
        const authorLink = document.createElement('a');
        authorLink.href = `#profile/${author.id}`;
        authorLink.className = 'post-author';
        authorLink.textContent = escapeHTML(author.name || '不明');
        postHeader.appendChild(authorLink);

        if (author.admin) {
            const adminBadge = document.createElement('img');
            adminBadge.src = 'icons/admin.png';
            adminBadge.className = 'admin-badge';
            adminBadge.title = 'NyaXTeam';
            authorLink.appendChild(adminBadge);
        } else if (author.verify) { // adminがfalseの場合のみverifyをチェック
            const verifyBadge = document.createElement('img');
            verifyBadge.src = 'icons/verify.png';
            verifyBadge.className = 'verify-badge';
            verifyBadge.title = '認証済み';
            authorLink.appendChild(verifyBadge);
        }

        const postTime = document.createElement('span');
        postTime.className = 'post-time';
        postTime.textContent = `#${author.id || '????'} · ${new Date(post.time).toLocaleString('ja-JP')}`;
        postHeader.appendChild(postTime);

        if (currentUser && (currentUser.id === post.userid || currentUser.admin)) {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'post-menu-btn';
            menuBtn.innerHTML = '…';
            postHeader.appendChild(menuBtn);

            const menu = document.createElement('div');
            // ▼▼▼ この行を削除 ▼▼▼
            // menu.id = `menu-${post.id}`; 
            // ▲▲▲ 削除ここまで ▲▲▲
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
            // ▼▼▼ この行を修正 ▼▼▼
            // SVGをラップしていた <span class="icon"> を削除
            replyBtn.innerHTML = `${ICONS.reply} <span>${replyCount}</span>`;
            // ▲▲▲ 修正ここまで ▲▲▲
            replyBtn.dataset.username = escapeHTML(author.name);
            actionsDiv.appendChild(replyBtn);

            const likeBtn = document.createElement('button');
            const isLiked = currentUser.like?.includes(post.id);
            likeBtn.className = `like-button ${isLiked ? 'liked' : ''}`;
            likeBtn.innerHTML = `<span class="icon">${ICONS.likes}</span> <span>${post.like}</span>`;
            actionsDiv.appendChild(likeBtn);
            // ▲▲▲ 修正ここまで ▲▲▲

            // ▼▼▼ お気に入りボタンのHTMLを修正 ▼▼▼
            const starBtn = document.createElement('button');
            const isStarred = currentUser.star?.includes(post.id);
            starBtn.className = `star-button ${isStarred ? 'starred' : ''}`;
            starBtn.innerHTML = `<span class="icon">${ICONS.stars}</span> <span>${post.star}</span>`;
            actionsDiv.appendChild(starBtn);
            // ▲▲▲ 修正ここまで ▲▲▲
            
            postMain.appendChild(actionsDiv);
        }
        
        // ツリー表示用のコンテナを追加
        // const subRepliesContainer = document.createElement('div');
        // subRepliesContainer.className = 'sub-replies-container';
        // postMain.appendChild(subRepliesContainer);

        postEl.appendChild(postMain);
        return postEl;
    }

    function createAdPostHTML() {
        const adContainer = document.createElement('div');
        adContainer.className = 'post ad-post';

        // iframeを使った広告描画用のHTML
        adContainer.innerHTML = `
            <div class="user-icon-link">
                <img src="favicon.png" class="user-icon" alt="広告アイコン">
            </div>
            <div class="post-main">
                <div class="post-header">
                    <span class="post-author">[広告]</span>
                </div>
                <div class="post-content">
                    <iframe scrolling="no" frameborder="0" style="width:300px; height:250px; border:0; overflow:hidden;"></iframe>
                </div>
            </div>
        `;

        // iframe要素を取得
        const iframe = adContainer.querySelector('iframe');
        
        // iframeの読み込みを待ってから、中に広告スクリプトを書き込む
        iframe.onload = () => {
            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            // 広告スクリプトをiframeの中に直接書き込む
            iframeDoc.write(`
                <body style="margin:0; padding:0;">
                    <!-- admax -->
                    <div class="admax-ads" data-admax-id="0bd891d69fb4e13cd644500a25fc1f46" style="display:inline-block;width:300px;height:250px;"></div>
                    <script type="text/javascript">(admaxads = window.admaxads || []).push({admax_id: "0bd891d69fb4e13cd644500a25fc1f46",type: "banner"});</script>
                    <script type="text/javascript" charset="utf-8" src="https://adm.shinobi.jp/st/t.js" async></script>
                <!-- admax -->
                </body>
            `);
            iframeDoc.close();
        };

        // 広告ポスト全体のクリックイベントを止める
        adContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        }, true);

        return adContainer;
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
            // メンションされたユーザー情報を取得
            const allMentionedIds = new Set();
            (currentUser.notice || []).forEach(n => {
                const message = typeof n === 'object' ? n.message : n;
                const mentionRegex = /@(\d+)/g;
                let match;
                while ((match = mentionRegex.exec(message)) !== null) {
                    allMentionedIds.add(parseInt(match[1]));
                }
            });
            const newIdsToFetch = [...allMentionedIds].filter(id => !allUsersCache.has(id));
            if (newIdsToFetch.length > 0) {
                const { data: newUsers } = await supabase.from('user').select('id, name, scid, icon_data').in('id', newIdsToFetch);
                if (newUsers) newUsers.forEach(u => allUsersCache.set(u.id, u));
            }

            // バックグラウンドでDBの未読数を0に更新
            if (currentUser.notice_count > 0) {
                supabase.from('user').update({ notice_count: 0 }).eq('id', currentUser.id)
                    .then(({ error: resetError }) => {
                        if (!resetError) {
                            currentUser.notice_count = 0;
                            localStorage.setItem('currentUser', JSON.stringify(currentUser));
                            updateNavAndSidebars();
                        }
                    });
            }
            
            contentDiv.innerHTML = '';
            if (currentUser.notice?.length) {
                currentUser.notice.forEach(n_obj => {
                    const isObject = typeof n_obj === 'object' && n_obj !== null;
                    
                    const notification = isObject ? n_obj : { id: crypto.randomUUID(), message: n_obj, open: '', click: true };
                    
                    const noticeEl = document.createElement('div');
                    noticeEl.className = 'widget-item notification-item';
                    if (!notification.click) {
                        noticeEl.classList.add('notification-new');
                    }
                    noticeEl.dataset.notificationId = notification.id;

                    const content = document.createElement('div');
                    content.className = 'notification-item-content';
                    content.innerHTML = formatPostContent(notification.message, allUsersCache);
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'notification-delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.title = '通知を削除';

                    noticeEl.appendChild(content);
                    noticeEl.appendChild(deleteBtn);
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
        DOM.likesContent.innerHTML = '';
        await loadPostsWithPagination(DOM.likesContent, 'likes', { ids: currentUser.like });
        showLoading(false);
    }
    async function showStarsScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">お気に入り</h2>`;
        showScreen('stars-screen');
        DOM.starsContent.innerHTML = '';
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
            // 1. メインポストと親ポストを取得
            const { data: mainPost, error: postError } = await supabase
                .from('post')
                .select('id, content, attachments, "like", star, time, userid, reply_id, user(id, name, scid, icon_data, admin, verify), reply_to:reply_id(id, content, attachments, "like", star, time, userid, user(id, name, scid, icon_data, admin, verify))')
                .eq('id', postId)
                .single();
    
            if (postError || !mainPost) throw new Error('ポストが見つかりません。');
            
            // 2. 全ての返信を、返信先情報も含めて一括取得
            const { data: allRepliesRaw, error: repliesError } = await supabase.rpc('get_all_replies', { root_post_id: postId });
            if (repliesError) throw repliesError;

            // 3. 必要なユーザー情報と返信数を一括で取得
            const allPostIdsOnPage = new Set([mainPost.id, ...allRepliesRaw.map(r => r.id)]);
            if(mainPost.reply_to) allPostIdsOnPage.add(mainPost.reply_to.id);

            const allMentionedIds = new Set();
            const mentionRegex = /@(\d+)/g;
            const collectMentions = (text) => {
                if (!text) return;
                const matches = text.matchAll(mentionRegex);
                for (const match of matches) allMentionedIds.add(parseInt(match[1]));
            };
            collectMentions(mainPost.content);
            if (mainPost.reply_to) collectMentions(mainPost.reply_to.content);
            allRepliesRaw.forEach(reply => collectMentions(reply.content));
            
            const newIdsToFetch = [...allMentionedIds].filter(id => id && !allUsersCache.has(id));
            if (newIdsToFetch.length > 0) {
                const { data: newUsers } = await supabase.from('user').select('id, name').in('id', newIdsToFetch);
                if (newUsers) newUsers.forEach(u => allUsersCache.set(u.id, u));
            }
            
            const { data: counts, error: countError } = await supabase.rpc('get_reply_counts', { post_ids: Array.from(allPostIdsOnPage) });
            const replyCountsMapForDetail = countError ? new Map() : new Map(counts.map(c => [c.post_id, c.reply_count]));

            // 4. DOMの初期化と描画
            contentDiv.innerHTML = '';
    
            if (mainPost.reply_to) {
                const parentPostContainer = document.createElement('div');
                parentPostContainer.className = 'parent-post-container';
                const parentPostEl = await renderPost(mainPost.reply_to, mainPost.reply_to.user, { userCache: allUsersCache, replyCountsMap: replyCountsMapForDetail });
                if (parentPostEl) parentPostContainer.appendChild(parentPostEl);
                contentDiv.appendChild(parentPostContainer);
            }
    
            const mainPostEl = await renderPost(mainPost, mainPost.user, { userCache: allUsersCache, replyCountsMap: replyCountsMapForDetail });
            if (mainPostEl) contentDiv.appendChild(mainPostEl);
    
            const repliesHeader = document.createElement('h3');
            repliesHeader.textContent = '返信';
            repliesHeader.style.cssText = 'padding: 1rem; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); margin-top: 1rem; margin-bottom: 0; font-size: 1.2rem;';
            contentDiv.appendChild(repliesHeader);

            // 5. 返信リストを構築
            const repliesByParentId = new Map();
            allRepliesRaw.forEach(reply => {
                if (!repliesByParentId.has(reply.reply_id)) repliesByParentId.set(reply.reply_id, []);
                repliesByParentId.get(reply.reply_id).push(reply);
            });
            for (const replies of repliesByParentId.values()) {
                replies.sort((a, b) => new Date(a.time) - new Date(b.time));
            }

            const flatReplyList = [];
            const buildFlatList = (parentId) => {
                const children = repliesByParentId.get(parentId) || [];
                for (const child of children) {
                    flatReplyList.push(child);
                    buildFlatList(child.id);
                }
            };
            buildFlatList(postId);

            // 6. 無限スクロールのセットアップ
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
                    const authorForRender = { 
                        id: reply.author_id, 
                        name: reply.author_name, 
                        scid: reply.author_scid, 
                        icon_data: reply.author_icon_data,
                        admin: reply.author_admin,
                        verify: reply.author_verify
                    };
                    
                    // 「@{user}さんに返信」の表示は、引き続きすべての孫以降の返信で行う
                    if (reply.reply_id !== postId && reply.reply_to_user_id && reply.reply_to_user_name) {
                        postForRender.reply_to = {
                            user: {
                                id: reply.reply_to_user_id,
                                name: reply.reply_to_user_name
                            }
                        };
                    }
                    
                    const postEl = await renderPost(postForRender, authorForRender, { userCache: allUsersCache, replyCountsMap: replyCountsMapForDetail });
                    
                    if (postEl) {
                        // ▼▼▼ このif文を追加 ▼▼▼
                        // 「孫」以降の返信であれば、インデント用のクラスを付与
                        if (reply.reply_id !== postId) {
                            postEl.classList.add('grandchild-reply');
                        }
                        // ▲▲▲ 追加ここまで ▲▲▲
                        repliesContainer.appendChild(postEl);
                    }
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

        // 表示する可能性のある全メンバーのIDを収集
        const allMemberIds = new Set(dms.flatMap(dm => dm.member));
        const newIdsToFetch = [...allMemberIds].filter(id => !allUsersCache.has(id));
        if (newIdsToFetch.length > 0) {
            const { data: newUsers } = await supabase.from('user').select('id, name, scid, icon_data').in('id', newIdsToFetch);
            if (newUsers) newUsers.forEach(u => allUsersCache.set(u.id, u));
        }
        
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
        
        let dmSelectedFiles = []; // この会話画面専用のファイル管理変数

        const { data: dm, error } = await supabase.from('dm').select('id, post, member, host_id').eq('id', dmId).single();
        if (error || !dm || !dm.member.includes(currentUser.id)) {
            container.innerHTML = 'DMが見つからないか、アクセス権がありません。';
            return;
        }

        const memberIds = dm.member;
        const newIdsToFetch = memberIds.filter(id => !allUsersCache.has(id));
        if (newIdsToFetch.length > 0) {
            const {data: users} = await supabase.from('user').select('id, name, scid, icon_data').in('id', newIdsToFetch);
            if (users) users.forEach(u => allUsersCache.set(u.id, u));
        }
        
        const posts = dm.post || [];
        const messagesHTML = posts.slice().reverse().map(renderDmMessage).join('');
        
        container.innerHTML = `
            <div class="dm-conversation-view">${messagesHTML}</div>
            <div class="dm-message-form">
                <div class="dm-form-content">
                    <textarea id="dm-message-input" placeholder="メッセージを送信"></textarea>
                    <div class="file-preview-container dm-file-preview"></div>
                </div>
                <div class="dm-form-actions">
                    <button id="dm-attachment-btn" class="attachment-button" title="ファイルを添付">${ICONS.attachment}</button>
                    <input type="file" id="dm-file-input" class="hidden" multiple>
                    <button id="send-dm-btn" title="送信 (Ctrl+Enter)">${ICONS.send}</button>
                </div>
            </div>
        `;
        
        const messageInput = document.getElementById('dm-message-input');
        const fileInput = document.getElementById('dm-file-input');
        const previewContainer = container.querySelector('.file-preview-container');

        document.getElementById('dm-attachment-btn').onclick = () => fileInput.click();

        fileInput.onchange = (event) => {
            dmSelectedFiles = Array.from(event.target.files);
            previewContainer.innerHTML = '';
            dmSelectedFiles.forEach((file, index) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'file-preview-item';
                
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewItem.innerHTML = `<img src="${e.target.result}" alt="${file.name}"><button class="file-preview-remove" data-index="${index}">×</button>`;
                    };
                    reader.readAsDataURL(file);
                } else if (file.type.startsWith('video/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewItem.innerHTML = `<video src="${e.target.result}" style="width:100px; height:100px; object-fit:cover;" controls></video><button class="file-preview-remove" data-index="${index}">×</button>`;
                    };
                    reader.readAsDataURL(file);
                } else if (file.type.startsWith('audio/')) {
                    // ▼▼▼ このブロックを修正 ▼▼▼
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewItem.innerHTML = `<div style="display:flex; align-items:center; gap:0.5rem;"><audio src="${e.target.result}" controls style="height: 30px; width: 200px;"></audio><button class="file-preview-remove" data-index="${index}" style="position:relative; top:0; right:0;">×</button></div>`;
                    };
                    reader.readAsDataURL(file);
                    // ▲▲▲ 修正ここまで ▲▲▲
                } else {
                    previewItem.innerHTML = `<span>📄 ${escapeHTML(file.name)}</span><button class="file-preview-remove" data-index="${index}">×</button>`;
                }
                previewContainer.appendChild(previewItem);
            });
        };

        previewContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-preview-remove')) {
                const indexToRemove = parseInt(e.target.dataset.index);
                dmSelectedFiles.splice(indexToRemove, 1);
                const newFiles = new DataTransfer();
                dmSelectedFiles.forEach(file => newFiles.items.add(file));
                fileInput.files = newFiles.files;
                fileInput.dispatchEvent(new Event('change')); // プレビューを再描画
            }
        });

        const sendMessageAction = () => {
            sendDmMessage(dmId, dmSelectedFiles).then(() => {
                dmSelectedFiles = [];
                fileInput.value = '';
                previewContainer.innerHTML = '';
            });
        };

        messageInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                sendMessageAction();
            }
        });
        document.getElementById('send-dm-btn').onclick = sendMessageAction;

        lastRenderedMessageId = posts.length > 0 ? posts[posts.length - 1].id : null;

        if (currentDmChannel) supabase.removeChannel(currentDmChannel);
        currentDmChannel = supabase.channel(`dm-${dmId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm', filter: `id=eq.${dmId}` }, payload => {
                const newPost = payload.new.post;
                if(newPost && newPost.length > 0) {
                    const latestMessage = newPost[newPost.length - 1];
                    if(latestMessage.id === lastRenderedMessageId || latestMessage.userid === currentUser.id) return;

                    const view = document.querySelector('.dm-conversation-view');
                    if(view) {
                        const msgHTML = renderDmMessage(latestMessage);
                        view.insertAdjacentHTML('afterbegin', msgHTML);
                        lastRenderedMessageId = latestMessage.id;
                    }
                }
            }).subscribe();
    }
    
    // --- 10. プロフィールと設定 ---
    async function showProfileScreen(userId, subpage = 'posts') {
        DOM.pageHeader.innerHTML = `
            <div class="header-with-back-button">
                <button class="header-back-btn" onclick="window.history.back()">${ICONS.back}</button>
                <h2 id="page-title">プロフィール</h2>
            </div>`;
        showScreen('profile-screen');
        const profileHeader = document.getElementById('profile-header');
        const profileTabs = document.getElementById('profile-tabs');
        
        const existingFriezeNotice = DOM.mainContent.querySelector('.frieze-notice');
        if (existingFriezeNotice) existingFriezeNotice.remove();
        
        // サブタブコンテナも初期化
        const subTabsContainer = document.getElementById('profile-sub-tabs-container');
        if (!subTabsContainer) {
            profileTabs.insertAdjacentHTML('afterend', '<div id="profile-sub-tabs-container"></div>');
        }

        profileHeader.innerHTML = '<div class="spinner"></div>';
        profileTabs.innerHTML = '';
        document.getElementById('profile-sub-tabs-container').innerHTML = ''; // サブタブもクリア
        document.getElementById('profile-content').innerHTML = '';

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
                    <h2>
                        ${escapeHTML(user.name)}
                        ${user.admin ? `<img src="icons/admin.png" class="admin-badge" title="NyaXTeam">` : (user.verify ? `<img src="icons/verify.png" class="verify-badge" title="認証済み">` : '')}
                    </h2>
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

                    // 管理者のみに表示されるメニュー
                    if (currentUser.admin) {
                        const adminMenuButton = document.createElement('button');
                        adminMenuButton.className = 'dm-button'; // スタイルを流用
                        adminMenuButton.innerHTML = '…';
                        adminMenuButton.onclick = (e) => {
                            e.stopPropagation();
                            openAdminProfileMenu(e.currentTarget, user);
                        };
                        actionsContainer.appendChild(adminMenuButton);
                    }
                }
            }
            
            // メインのタブを定義
            const mainTabs = [
                { key: 'posts', name: 'ポスト' },
                { key: 'likes', name: 'いいね' },
                { key: 'stars', name: 'お気に入り' },
                { key: 'follows', name: 'フォロー' } // 「フォロー中」と「フォロワー」を統合
            ];

            // 現在アクティブにすべきメインタブを決定
            const activeMainTabKey = (subpage === 'following' || subpage === 'followers') ? 'follows' : subpage;

            profileTabs.innerHTML = mainTabs.map(tab => 
                `<button class="tab-button ${tab.key === activeMainTabKey ? 'active' : ''}" data-tab="${tab.key}">${tab.name}</button>`
            ).join('');

            // メインタブのクリックイベントを設定
            profileTabs.querySelectorAll('.tab-button').forEach(button => {
                button.onclick = (e) => {
                    e.stopPropagation();
                    const tabKey = button.dataset.tab;
                    let newSubpage;
                    // ▼▼▼ このif-elseブロックを修正 ▼▼▼
                    if (tabKey === 'posts') {
                        newSubpage = ''; // ポストタブの場合はサブページなし
                    } else if (tabKey === 'follows') {
                        newSubpage = 'following'; // フォロータブの場合は'following'をデフォルトに
                    } else {
                        newSubpage = tabKey;
                    }
                    loadProfileTabContent(user, newSubpage || 'posts'); // newSubpageが空なら'posts'として扱う
                    // ▲▲▲ 修正ここまで ▲▲▲
                };
            });

            await loadProfileTabContent(user, subpage);

        } catch(err) {
            profileHeader.innerHTML = '<h2>プロフィールの読み込みに失敗しました</h2>';
            console.error(err);
        } finally {
            showLoading(false);
        }
    }

    async function loadProfileTabContent(user, subpage) {
        // メインのタブのアクティブ状態を更新
        const activeMainTabKey = (subpage === 'following' || subpage === 'followers') ? 'follows' : subpage;
        document.querySelectorAll('#profile-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === activeMainTabKey));
        
        const subTabsContainer = document.getElementById('profile-sub-tabs-container');
        const contentDiv = document.getElementById('profile-content');
        
        subTabsContainer.innerHTML = ''; // サブメニューをリセット
        isLoadingMore = false;
        if (postLoadObserver) postLoadObserver.disconnect();
        contentDiv.innerHTML = '';

        let newUrl;
        if (subpage === 'posts') {
            newUrl = `#profile/${user.id}`; // ポストタブはサブページなし
        } else {
            newUrl = `#profile/${user.id}/${subpage}`;
        }
        
        if (window.location.hash !== newUrl) {
            window.history.pushState({ path: newUrl }, '', newUrl);
        }

        if (activeMainTabKey === 'follows') {
            subTabsContainer.innerHTML = `
                <div class="profile-sub-tabs">
                    <button class="tab-button ${subpage === 'following' ? 'active' : ''}" data-sub-tab="following">フォロー中</button>
                    <button class="tab-button ${subpage === 'followers' ? 'active' : ''}" data-sub-tab="followers">フォロワー</button>
                </div>`;
            
            // ▼▼▼ このブロックを修正 ▼▼▼
            subTabsContainer.querySelectorAll('.tab-button').forEach(button => {
                button.onclick = (e) => {
                    e.stopPropagation();
                    // hashを変更せずにコンテンツをロード
                    loadProfileTabContent(user, button.dataset.subTab);
                };
            });
            // ▲▲▲ 修正ここまで ▲▲▲
        }
        
        try {
            switch(subpage) {
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
                case 'following':
                    if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのフォローリストは非公開です。</p>'; break; }
                    // ▼▼▼ このブロックを修正 ▼▼▼
                    await loadUsersWithPagination(contentDiv, 'follows', { ids: user.follow || [] });
                    // ▲▲▲ 修正ここまで ▲▲▲
                    break;
                case 'followers':
                    if (!user.settings.show_follower && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのフォロワーリストは非公開です。</p>'; break; }
                    // ▼▼▼ このブロックを修正 ▼▼▼
                    await loadUsersWithPagination(contentDiv, 'followers', { userId: user.id });
                    // ▲▲▲ 修正ここまで ▲▲▲
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
        // ▼▼▼ innerHTMLの生成部分を修正 ▼▼▼
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
                    <input type="checkbox" id="setting-show-follower" ${currentUser.settings.show_follower ?? true ? 'checked' : ''}><label for="setting-show-follower">フォロワーリストを公開する</label><br>
                    <input type="checkbox" id="setting-show-star" ${currentUser.settings.show_star ? 'checked' : ''}><label for="setting-show-star">お気に入りを公開する</label><br>
                    <input type="checkbox" id="setting-show-scid" ${currentUser.settings.show_scid ? 'checked' : ''}><label for="setting-show-scid">Scratchアカウント名を公開する</label>
                </fieldset>
                <button type="submit">設定を保存</button>
            </form>
            <div class="settings-danger-zone">
                <button id="settings-logout-btn">ログアウト</button>
            </div>
            `;
        // ▲▲▲ 修正ここまで ▲▲▲
        
        const iconInput = document.getElementById('setting-icon-input');
        const iconPreview = document.getElementById('setting-icon-preview');
        
        iconPreview.addEventListener('click', () => iconInput.click());
        iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;

            resetIconToDefault = false;
            const reader = new FileReader();

            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const MAX_DIMENSION = 300;
                    let { width, height } = img;

                    // リサイズが必要か判定
                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height = Math.round((height * MAX_DIMENSION) / width);
                            width = MAX_DIMENSION;
                        } else {
                            width = Math.round((width * MAX_DIMENSION) / height);
                            height = MAX_DIMENSION;
                        }
                    }

                    // canvasを使ってリサイズ
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // リサイズ後の画像をData URLとして取得
                    newIconDataUrl = canvas.toDataURL(file.type); // 元のファイル形式を維持
                    iconPreview.src = newIconDataUrl;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
        // ▲▲▲ 置き換えここまで ▲▲▲

        document.getElementById('reset-icon-btn').addEventListener('click', () => {
            resetIconToDefault = true;
            newIconDataUrl = null;
            iconInput.value = ''; // ファイル選択をクリア
            iconPreview.src = `https://trampoline.turbowarp.org/avatars/by-username/${currentUser.scid}`;
        });

        document.getElementById('settings-form').addEventListener('submit', handleUpdateSettings);
        // ▼▼▼ この行を追加 ▼▼▼
        document.getElementById('settings-logout-btn').addEventListener('click', handleLogout);
        // ▲▲▲ 追加ここまで ▲▲▲
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
            
            let query = supabase.from('post').select('id, userid, content, attachments, "like", star, reply_id, time, user(id, name, scid, icon_data, admin, verify), reply_to:reply_id(id, user(id, name))');

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
                    // 2ページ目以降の読み込み時に広告を挿入する
                    if (currentPagination.page > 0) {
                        const adPostEl = createAdPostHTML();
                        trigger.before(adPostEl);
                    }
                    
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

    async function loadUsersWithPagination(container, type, options = {}) {
        currentPagination = { page: 0, hasMore: true, type, options };

        let trigger = container.querySelector('.load-more-trigger');
        if (trigger) trigger.remove();
        
        trigger = document.createElement('div');
        trigger.className = 'load-more-trigger';
        container.appendChild(trigger);

        const renderUserCard = (u) => {
            const userCard = document.createElement('div');
            userCard.className = 'profile-card';
            const userLink = document.createElement('a');
            userLink.href = `#profile/${u.id}`;
            userLink.className = 'profile-link';
            userLink.style.cssText = 'display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;';
            userLink.innerHTML = `<img src="${getUserIconUrl(u)}" style="width:48px; height:48px; border-radius:50%;" alt="${u.name}'s icon"><div><span class="name" style="font-weight:700;">${escapeHTML(u.name)}</span><span class="id" style="color:var(--secondary-text-color);">#${u.id}</span><p class="me" style="margin:0.2rem 0 0;">${escapeHTML(u.me || '')}</p></div>`;
            userCard.appendChild(userLink);
            return userCard;
        };
        
        const loadMore = async () => {
            if (isLoadingMore || !currentPagination.hasMore) return;
            isLoadingMore = true;
            trigger.innerHTML = '<div class="spinner"></div>';

            const from = currentPagination.page * POSTS_PER_PAGE;
            const to = from + POSTS_PER_PAGE - 1;

            let users = [];
            let error = null;

            if (type === 'follows') {
                const idsToFetch = (options.ids || []).slice(from, to + 1);
                if (idsToFetch.length > 0) {
                    const result = await supabase.from('user').select('id, name, me, scid, icon_data').in('id', idsToFetch);
                    users = result.data;
                    error = result.error;
                }
            } else if (type === 'followers') {
                const result = await supabase.rpc('get_followers', { target_user_id: options.userId }).range(from, to);
                users = result.data;
                error = result.error;
            }

            if (error) {
                console.error(`${type}のユーザー読み込みに失敗:`, error);
                trigger.innerHTML = '読み込みに失敗しました。';
            } else {
                if (users && users.length > 0) {
                    users.forEach(u => container.insertBefore(renderUserCard(u), trigger));
                    currentPagination.page++;
                    if (users.length < POSTS_PER_PAGE) {
                        currentPagination.hasMore = false;
                    }
                } else {
                    currentPagination.hasMore = false;
                }

                if (!currentPagination.hasMore) {
                    const emptyMessages = { follows: '誰もフォローしていません。', followers: 'まだフォロワーがいません。' };
                    trigger.innerHTML = container.querySelectorAll('.profile-card').length === 0 ? emptyMessages[type] : 'すべてのユーザーを読み込みました';
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
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        showLoading(true);

        try {
            const updatedData = {
                name: form.querySelector('#setting-username').value.trim(),
                me: form.querySelector('#setting-me').value.trim(),
                settings: {
                    show_like: form.querySelector('#setting-show-like').checked,
                    show_follow: form.querySelector('#setting-show-follow').checked,
                    show_follower: form.querySelector('#setting-show-follower').checked,
                    show_star: form.querySelector('#setting-show-star').checked,
                    show_scid: form.querySelector('#setting-show-scid').checked,
                },
            };

            if (!updatedData.name) throw new Error('ユーザー名は必須です。');

            // --- アイコンの更新・移行処理 ---
            if (resetIconToDefault) {
                // デフォルトに戻す場合、古いStorageのアイコンがあれば削除
                if (currentUser.icon_data && !currentUser.icon_data.startsWith('data:image')) {
                    await deleteFilesViaEdgeFunction([currentUser.icon_data]);
                }
                updatedData.icon_data = null;
            } else if (newIconDataUrl) {
                // 新しいアイコンが選択された場合
                // 古いStorageのアイコンがあれば削除
                if (currentUser.icon_data && !currentUser.icon_data.startsWith('data:image')) {
                    await deleteFilesViaEdgeFunction([currentUser.icon_data]);
                }
                // Data URLをBlobに変換してアップロード
                const blob = await (await fetch(newIconDataUrl)).blob();
                const fileId = await uploadFileViaEdgeFunction(new File([blob], 'icon.png', { type: blob.type }));
                updatedData.icon_data = fileId;
            } else if (currentUser.icon_data && currentUser.icon_data.startsWith('data:image')) {
                // ★自動移行処理★: 古いData URL形式のアイコンが設定されており、新しいアイコンが選択されていない場合
                // Data URLをBlobに変換してアップロード
                const blob = await (await fetch(currentUser.icon_data)).blob();
                const fileId = await uploadFileViaEdgeFunction(new File([blob], 'icon.png', { type: blob.type }));
                updatedData.icon_data = fileId;
            }
            // --- ここまで ---
            
            const { data, error } = await supabase.from('user').update(updatedData).eq('id', currentUser.id).select().single();
            if (error) throw error;
            
            alert('設定を更新しました。');
            currentUser = data;
            newIconDataUrl = null;
            resetIconToDefault = false;
            window.location.hash = '';

        } catch(e) {
            console.error('設定の更新に失敗:', e);
            alert(`設定の更新に失敗しました: ${e.message}`);
        } finally {
            button.disabled = false;
            showLoading(false);
        }
    }

    // --- 11. ユーザーアクション (変更なし) ---
    window.deletePost = async (postId) => {
        if (!confirm('このポストを削除しますか？')) return;
    showLoading(true);
    try {
        const { data: postData, error: fetchError } = await supabase.from('post').select('attachments').eq('id', postId).single();
        if (fetchError) throw new Error(`ポスト情報の取得に失敗: ${fetchError.message}`);
        if (postData.attachments && postData.attachments.length > 0) {
            const fileIds = postData.attachments.map(file => file.id);
            await deleteFilesViaEdgeFunction(fileIds);
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
        
        // ▼▼▼ この行を修正 ▼▼▼
        const countSpan = button.querySelector('span:not(.icon)');
        // ▲▲▲ 修正ここまで ▲▲▲
        const isLiked = currentUser.like?.includes(postId);
        const updatedLikes = isLiked ? currentUser.like.filter(id => id !== postId) : [...(currentUser.like || []), postId];
        const incrementValue = isLiked ? -1 : 1;
        
        const { error: userError } = await supabase.from('user').update({ like: updatedLikes }).eq('id', currentUser.id);
        if (userError) {
            alert('いいねの更新に失敗しました。');
            button.disabled = false;
            return;
        }

        const { error: postError } = await supabase.rpc('handle_like', { post_id: postId, increment_val: incrementValue });
        if (postError) {
            await supabase.from('user').update({ like: currentUser.like }).eq('id', currentUser.id); // ロールバック
            alert('いいね数の更新に失敗しました。');
        } else {
            currentUser.like = updatedLikes;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
            button.classList.toggle('liked', !isLiked);
            
        if (!isLiked) {
            const { data: postData } = await supabase.from('post').select('userid, id').eq('id', postId).single();
            if (postData?.userid && postData.userid !== currentUser.id) {
                // ▼▼▼ この行を修正 ▼▼▼
                sendNotification(postData.userid, `@${currentUser.id}さんがあなたのポストにいいねしました。`, `#post/${postData.id}`);
            }
        }
    }
        button.disabled = false;
    };
        window.handleStar = async (button, postId) => {
        if (!currentUser) return alert("ログインが必要です。");
        button.disabled = true;
        
        // ▼▼▼ この行を修正 ▼▼▼
        const countSpan = button.querySelector('span:not(.icon)');
        // ▲▲▲ 修正ここまで ▲▲▲
        const isStarred = currentUser.star?.includes(postId);
        const updatedStars = isStarred ? currentUser.star.filter(id => id !== postId) : [...(currentUser.star || []), postId];
        const incrementValue = isStarred ? -1 : 1;
        
        const { error: userError } = await supabase.from('user').update({ star: updatedStars }).eq('id', currentUser.id);
        if (userError) {
            alert('お気に入りの更新に失敗しました。');
            button.disabled = false;
            return;
        }

        const { error: postError } = await supabase.rpc('increment_star', { post_id_in: postId, increment_val: incrementValue });
        if (postError) {
            await supabase.from('user').update({ star: currentUser.star }).eq('id', currentUser.id); // ロールバック
            alert('お気に入り数の更新に失敗しました。');
        } else {
            currentUser.star = updatedStars;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
            button.classList.toggle('starred', !isStarred);

            if (!isStarred) {
            const { data: postData } = await supabase.from('post').select('userid, id').eq('id', postId).single();
            if (postData?.userid && postData.userid !== currentUser.id) {
                // ▼▼▼ この行を修正 ▼▼▼
                sendNotification(postData.userid, `@${currentUser.id}さんがあなたのポストをお気に入りに登録しました。`, `#post/${postData.id}`);
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
            if (!isFollowing) { 
            // ▼▼▼ この行を修正 ▼▼▼
            sendNotification(targetUserId, `@${currentUser.id}さんがあなたをフォローしました。`, `#profile/${currentUser.id}`);
            }
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
            const { data: dm, error } = await supabase.from('dm').select('id, title, member, host_id').eq('id', dmId).single();
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
            await sendSystemDmMessage(dmId, `@${currentUser.id}さんが@${userIdToRemove}さんを強制退出させました`);
            // ▼▼▼ この行を修正 ▼▼▼
            sendNotification(userIdToRemove, `@${currentUser.id}さんによってDMから削除されました。`);
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
            await sendSystemDmMessage(dmId, `@${currentUser.id}さんが@${userIdToAdd}さんを招待しました`);
            // ▼▼▼ この行を修正 ▼▼▼
            sendNotification(userIdToAdd, `@${currentUser.id}さんがあなたをDMに招待しました。`, `#dm/${dmId}`);
            alert('メンバーを追加しました。');
            openDmManageModal(dmId); // モーダルを再描画
        }
    }
    
    async function handleLeaveDm(dmId) {
        if (!confirm('本当にこのDMから退出しますか？')) return;
        showLoading(true);

        try {

            // 退出したことをシステムメッセージとして記録（これはメンバー権限で実行可能）
            await sendSystemDmMessage(dmId, `@${currentUser.id}さんが退出しました`);
            
            // 新しいDB関数を呼び出す
            const { error } = await supabase.rpc('leave_dm', {
                dm_id_to_leave: dmId,
                user_id_to_leave: currentUser.id
            });

            if (error) throw error;
            
            alert('DMから退出しました。');
            DOM.dmManageModal.classList.add('hidden');
            window.location.hash = '#dm';

        } catch (e) {
            console.error('DMからの退出に失敗しました:', e);
            alert('DMからの退出に失敗しました。');
        } finally {
            showLoading(false);
        }
    }

    async function handleDisbandDm(dmId) {
        if (!confirm('本当にこのDMを解散しますか？この操作は取り消せません。')) return;
        showLoading(true);
        try {
            // 添付ファイルを全て削除
            const { data: dm, error: fetchError } = await supabase.from('dm').select('post').eq('id', dmId).single();
            if (fetchError) throw fetchError;
            
            const fileIdsToDelete = (dm.post || [])
                .flatMap(msg => msg.attachments || [])
                .map(att => att.id);

            if (fileIdsToDelete.length > 0) {
                await deleteFilesViaEdgeFunction(fileIdsToDelete);
            }

            // DMを削除
            const { error } = await supabase.from('dm').delete().eq('id', dmId);
            if (error) throw error;

            alert('DMを解散しました。');
            DOM.dmManageModal.classList.add('hidden');
            window.location.hash = '#dm';
        } catch (e) {
            console.error(e);
            alert('DMの解散に失敗しました。');
        } finally {
            showLoading(false);
        }
    }

    async function sendSystemDmMessage(dmId, content) {
        const mentionRegex = /@(\d+)/g;
        const mentionedIds = new Set();
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            mentionedIds.add(parseInt(match[1]));
        }
        
        const newIdsToFetch = [...mentionedIds].filter(id => !allUsersCache.has(id));
        if (newIdsToFetch.length > 0) {
            const { data: newUsers } = await supabase.from('user').select('id, name, scid, icon_data').in('id', newIdsToFetch);
            if (newUsers) newUsers.forEach(u => allUsersCache.set(u.id, u));
        }
        
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
                await deleteFilesViaEdgeFunction(filesToDeleteIds);
            }

            // 2. ファイルをアップロード
            let newUploadedAttachments = [];
            if (filesToAdd.length > 0) {
                for (const file of filesToAdd) {
                    const fileId = await uploadFileViaEdgeFunction(file);
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
        const members = [currentUser.id, targetUserId].sort((a,b) => a-b);

        const { data: existingDm } = await supabase.from('dm')
            .select('id')
            .contains('member', members)
            .eq('member', `{${members.join(',')}}`)
            .single();

        if (existingDm) {
            window.location.hash = `#dm/${existingDm.id}`;
        } else {
            const {data: targetUser} = await supabase.from('user').select('name').eq('id', targetUserId).single();
            if (confirm(`${targetUser.name}さんとの新しいDMを作成しますか？`)) {
                showLoading(true);
                try {
                    const { data: newDm, error: createError } = await supabase.from('dm').insert({
                        host_id: currentUser.id,
                        member: members,
                        title: `${currentUser.name}, ${targetUser.name}`
                    }).select('id').single();

                    if (createError) throw createError;

                    // 招待通知を送信
                    await sendNotification(targetUserId, `@${currentUser.id}さんがあなたをDMに招待しました。`, `#dm/${newDm.id}`);
                    window.location.hash = `#dm/${newDm.id}`;
                } catch(e) {
                    alert('DMの作成に失敗しました。');
                    console.error(e);
                } finally {
                    showLoading(false);
                }
            }
        }
    }

    async function openDmEditModal(dmId, messageId) {
        showLoading(true);
        try {
            const { data: dm, error: fetchError } = await supabase.from('dm').select('post').eq('id', dmId).single();
            if (fetchError || !dm) throw new Error('DM情報が取得できませんでした。');

            const message = (dm.post || []).find(m => m.id === messageId);
            if (!message) throw new Error('メッセージが見つかりませんでした。');

            let currentAttachments = message.attachments || [];
            let filesToDelete = new Set();
            let filesToAdd = [];

            const renderAttachments = () => {
                let existingHTML = currentAttachments
                    .filter(att => !filesToDelete.has(att.id))
                    .map((att, index) => `
                        <div class="file-preview-item">
                            <span>${att.type.startsWith('image') ? '🖼️' : '📎'} ${escapeHTML(att.name)}</span>
                            <button class="file-preview-remove" data-id="${att.id}" data-type="existing">×</button>
                        </div>`
                    ).join('');
                
                let newHTML = filesToAdd.map((file, index) => `
                        <div class="file-preview-item">
                            <span>${file.type.startsWith('image') ? '🖼️' : '📎'} ${escapeHTML(file.name)}</span>
                            <button class="file-preview-remove" data-index="${index}" data-type="new">×</button>
                        </div>`
                    ).join('');
                return existingHTML + newHTML;
            };

            const updatePreview = () => {
                const container = DOM.editDmMessageModalContent.querySelector('.file-preview-container');
                if (container) container.innerHTML = renderAttachments();
            };

            DOM.editDmMessageModalContent.innerHTML = `
                <div class="post-form" style="padding: 1rem;">
                    <div class="form-content">
                        <textarea id="edit-dm-textarea" style="min-height: 100px; font-size: 1rem;">${message.content || ''}</textarea>
                        <div class="file-preview-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;"></div>
                        <div class="post-form-actions" style="padding-top: 1rem;">
                            <button type="button" class="attachment-button" title="ファイルを追加">${ICONS.attachment}</button>
                            <input type="file" id="edit-dm-file-input" class="hidden" multiple>
                            <button id="update-dm-message-button" style="padding: 0.5rem 1.5rem; border-radius: 9999px; border: none; background-color: var(--primary-color); color: white; font-weight: 700; margin-left: auto;">保存</button>
                        </div>
                    </div>
                </div>`;
            
            updatePreview();

            DOM.editDmMessageModal.querySelector('#update-dm-message-button').onclick = () => handleUpdateDmMessage(dmId, messageId, currentAttachments, filesToAdd, Array.from(filesToDelete));
            DOM.editDmMessageModal.querySelector('.attachment-button').onclick = () => DOM.editDmMessageModal.querySelector('#edit-dm-file-input').click();
            
            DOM.editDmMessageModal.querySelector('#edit-dm-file-input').onchange = (e) => {
                filesToAdd.push(...Array.from(e.target.files));
                updatePreview();
            };

            DOM.editDmMessageModal.querySelector('.file-preview-container').onclick = (e) => {
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
            
            DOM.editDmMessageModal.classList.remove('hidden');
            DOM.editDmMessageModal.querySelector('.modal-close-btn').onclick = () => DOM.editDmMessageModal.classList.add('hidden');
        } catch (e) {
            alert(e.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleUpdateDmMessage(dmId, messageId, originalAttachments, filesToAdd, filesToDeleteIds) {
        const newContent = DOM.editDmMessageModal.querySelector('#edit-dm-textarea').value.trim();
        const button = DOM.editDmMessageModal.querySelector('#update-dm-message-button');
        button.disabled = true; button.textContent = '保存中...';
        showLoading(true);

        try {
            // ファイルの削除
            if (filesToDeleteIds.length > 0) {
                await deleteFilesViaEdgeFunction(filesToDeleteIds);
            }

            // ファイルのアップロード
            let newUploadedAttachments = [];
            if (filesToAdd.length > 0) {
                for (const file of filesToAdd) {
                    const fileId = await uploadFileViaEdgeFunction(file);
                    const fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'file'));
                    newUploadedAttachments.push({ type: fileType, id: fileId, name: file.name });
                }
            }

            const finalAttachments = originalAttachments.filter(att => !filesToDeleteIds.includes(att.id));
            finalAttachments.push(...newUploadedAttachments);

            // DMのpost配列を更新
            const { data: dm, error: fetchError } = await supabase.from('dm').select('post').eq('id', dmId).single();
            if (fetchError) throw fetchError;

            const postArray = dm.post || [];
            const messageIndex = postArray.findIndex(m => m.id === messageId);
            if (messageIndex === -1) throw new Error('更新対象のメッセージが見つかりません。');

            postArray[messageIndex].content = newContent;
            postArray[messageIndex].attachments = finalAttachments;
            
            const { error: updateError } = await supabase.from('dm').update({ post: postArray }).eq('id', dmId);
            if (updateError) throw updateError;
            
            DOM.editDmMessageModal.classList.add('hidden');
            // 画面を再描画して変更を反映
            const messageContainer = document.querySelector(`.dm-message-container[data-message-id="${messageId}"]`);
            if (messageContainer) {
                messageContainer.outerHTML = renderDmMessage(postArray[messageIndex]);
            }

        } catch (e) {
            console.error(e);
            alert('メッセージの更新に失敗しました。');
        } finally {
            button.disabled = false; button.textContent = '保存';
            showLoading(false);
        }
    }
    
    async function handleDeleteDmMessage(dmId, messageId) {
        if (!confirm('このメッセージを削除しますか?')) return;
        showLoading(true);
        try {
            const { data: dm, error: fetchError } = await supabase.from('dm').select('post').eq('id', dmId).single();
            if (fetchError) throw fetchError;

            const postArray = dm.post || [];
            const messageToDelete = postArray.find(m => m.id === messageId);
            const updatedPostArray = postArray.filter(m => m.id !== messageId);
            
            // 添付ファイルをストレージから削除
            if (messageToDelete && messageToDelete.attachments?.length > 0) {
                const fileIds = messageToDelete.attachments.map(att => att.id);
                await deleteFilesViaEdgeFunction(fileIds);
            }
            
            // DMのpost配列を更新
            const { error: updateError } = await supabase.from('dm').update({ post: updatedPostArray }).eq('id', dmId);
            if (updateError) throw updateError;
            
            // DOMからメッセージを削除
            document.querySelector(`.dm-message-container[data-message-id="${messageId}"]`)?.remove();
        } catch (e) {
            console.error(e);
            alert('メッセージの削除に失敗しました。');
        } finally {
            showLoading(false);
        }
    }
    
    // ▼▼▼ この関数をまるごと追加 ▼▼▼
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
                DOM.createDmModal.classList.add('hidden');
                handleDmButtonClick(targetUserId);
            }
        });
        
        DOM.createDmModal.classList.remove('hidden');
        DOM.createDmModal.querySelector('.modal-close-btn').onclick = () => {
            DOM.createDmModal.classList.add('hidden');
        };
    }
    // ▲▲▲ 追加ここまで ▲▲▲
    
    async function sendDmMessage(dmId, files = []) {
        const input = document.getElementById('dm-message-input');
        const content = input.value.trim();
        if (!content && files.length === 0) return;
        
        const sendButton = document.getElementById('send-dm-btn');
        input.disabled = true;
        sendButton.disabled = true;

        try {
            // ▼▼▼ このブロックを新規追加 ▼▼▼
            // メンションされたユーザー情報を取得してキャッシュする
            const mentionRegex = /@(\d+)/g;
            const mentionedIds = new Set();
            let match;
            while ((match = mentionRegex.exec(content)) !== null) {
                mentionedIds.add(parseInt(match[1]));
            }
            
            const newIdsToFetch = [...mentionedIds].filter(id => !allUsersCache.has(id));
            if (newIdsToFetch.length > 0) {
                const { data: newUsers } = await supabase.from('user').select('id, name').in('id', newIdsToFetch);
                if (newUsers) newUsers.forEach(u => allUsersCache.set(u.id, u));
            }
            // ▲▲▲ 追加ここまで ▲▲▲

            let attachmentsData = [];
            if (files.length > 0) {
                showLoading(true);
                for (const file of files) {
                    const fileId = await uploadFileViaEdgeFunction(file);
                    const fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'file'));
                    attachmentsData.push({ type: fileType, id: fileId, name: file.name });
                }
                showLoading(false);
            }

            const message = {
                id: crypto.randomUUID(),
                time: new Date().toISOString(),
                userid: currentUser.id,
                content: content,
                attachments: attachmentsData
            };

            const { error } = await supabase.rpc('append_to_dm_post', {
                dm_id_in: dmId,
                new_message_in: message
            });

            if (error) {
                throw error;
            } else {
                input.value = '';
                // リアルタイム更新で自分のメッセージも描画する
                const view = document.querySelector('.dm-conversation-view');
                if (view) {
                    const msgHTML = renderDmMessage(message);
                    view.insertAdjacentHTML('afterbegin', msgHTML);
                    lastRenderedMessageId = message.id;
                    view.scrollTop = view.scrollHeight;
                }
            }
        } catch (error) {
            alert('メッセージの送信に失敗しました。');
            console.error(error);
        } finally {
            input.disabled = false;
            sendButton.disabled = false;
            input.focus();
        }
    }

    function openAdminProfileMenu(button, targetUser) {
        // 既存のメニューを閉じる
        document.getElementById('admin-profile-menu')?.remove();

        const menu = document.createElement('div');
        menu.id = 'admin-profile-menu';
        menu.className = 'post-menu is-visible'; // 既存のスタイルを流用

        const verifyBtn = document.createElement('button');
        // ユーザーの現在の認証状態に応じてテキストを切り替え
        verifyBtn.textContent = targetUser.verify ? '認証を取り消す' : 'このユーザーを認証';
        verifyBtn.onclick = () => adminToggleVerify(targetUser);
        
        const sendNoticeBtn = document.createElement('button');
        sendNoticeBtn.textContent = '通知を送信';
        sendNoticeBtn.onclick = () => adminSendNotice(targetUser.id);
        
        const freezeBtn = document.createElement('button');
        freezeBtn.textContent = 'アカウントを凍結';
        freezeBtn.className = 'delete-btn';
        freezeBtn.onclick = () => adminFreezeAccount(targetUser.id);

        menu.appendChild(verifyBtn);
        menu.appendChild(sendNoticeBtn);
        menu.appendChild(freezeBtn);

        // ボタンの相対位置にメニューを表示
        document.body.appendChild(menu);
        const btnRect = button.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${window.scrollY + btnRect.bottom}px`;
        menu.style.left = `${window.scrollX + btnRect.left}px`;
        
        // メニュー外クリックで閉じる
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    }

    async function adminToggleVerify(targetUser) {
        const newVerifyStatus = !targetUser.verify;
        const actionText = newVerifyStatus ? '認証' : '認証の取り消し';
        
        if (confirm(`本当にこのユーザーの${actionText}を行いますか？`)) {
            const { error } = await supabase
                .from('user')
                .update({ verify: newVerifyStatus })
                .eq('id', targetUser.id);

            if (error) {
                alert(`${actionText}に失敗しました: ${error.message}`);
            } else {
                alert(`ユーザーの${actionText}が完了しました。ページをリロードします。`);
                window.location.reload();
            }
        }
    }
    
    async function adminSendNotice(targetUserId) {
        const message = prompt("送信する通知メッセージを入力してください:");
        if (message && message.trim()) {
            await sendNotification(targetUserId, `${message.trim()} - NyaXTeam`);
            alert('通知を送信しました。');
        }
    }

    async function adminFreezeAccount(targetUserId) {
        const reason = prompt("アカウントの凍結理由を入力してください (必須):");
        if (reason && reason.trim()) {
            if (confirm(`本当にこのユーザーを凍結しますか？\n理由: ${reason}`)) {
                const { error } = await supabase.from('user').update({ frieze: reason.trim() }).eq('id', targetUserId);
                if (error) {
                    alert(`凍結に失敗しました: ${error.message}`);
                } else {
                    alert('アカウントを凍結しました。ページをリロードします。');
                    window.location.reload();
                }
            }
        } else {
            alert('凍結理由の入力は必須です。');
        }
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

        // --- 1. メニューの開閉トリガー処理 ---
const menuButton = target.closest('.post-menu-btn, .dm-message-menu-btn');
if (menuButton) {
    e.stopPropagation();
    
    let menuToToggle;
    // ▼▼▼ この if-else ブロックを修正 ▼▼▼
    if (menuButton.classList.contains('dm-message-menu-btn')) {
        menuToToggle = menuButton.closest('.dm-message-container')?.querySelector('.post-menu');
    } else {
        menuToToggle = menuButton.closest('.post-header')?.querySelector('.post-menu');
    }

    if (menuToToggle) {
        const isCurrentlyVisible = menuToToggle.classList.contains('is-visible');
        
        // 開いている他のメニューをすべて閉じる
        document.querySelectorAll('.post-menu.is-visible').forEach(menu => {
            menu.classList.remove('is-visible');
        });

        // ターゲットが閉じていた場合のみ開く
        if (!isCurrentlyVisible) {
            menuToToggle.classList.add('is-visible');
        }
        // ▲▲▲ isDmMenuや位置調整のロジックをすべて削除 ▲▲▲
    }
    return; // メニュー開閉処理はここで終了
}
        // --- 2. メニューの外側がクリックされた場合の処理 ---
        if (!target.closest('.post-menu')) {
            document.querySelectorAll('.post-menu.is-visible').forEach(menu => {
                menu.classList.remove('is-visible');
            });
        }

        // --- 3. メニュー内のアクションボタン処理 ---
        const dmEditBtn = target.closest('.edit-dm-msg-btn');
        if (dmEditBtn) {
            const container = dmEditBtn.closest('.dm-message-container');
            openDmEditModal(window.location.hash.substring(4), container.dataset.messageId);
            return;
        }
        const dmDeleteBtn = target.closest('.delete-dm-msg-btn');
        if (dmDeleteBtn) {
            const container = dmDeleteBtn.closest('.dm-message-container');
            handleDeleteDmMessage(window.location.hash.substring(4), container.dataset.messageId);
            return;
        }
        const editButton = target.closest('.edit-btn');
        if (editButton) {
            const postElement = editButton.closest('.post');
            if(postElement) openEditPostModal(postElement.dataset.postId);
            return;
        }
        const deleteButton = target.closest('.delete-btn:not(.delete-dm-msg-btn)');
        if (deleteButton) {
            const postElement = deleteButton.closest('.post');
            if (postElement) window.deletePost(postElement.dataset.postId);
            return;
        }

        // --- 4. ポストのアクションや本体のクリック処理 ---
        const postElement = target.closest('.post');
        if (postElement) {
            const replyButton = target.closest('.reply-button');
            const likeButton = target.closest('.like-button');
            const starButton = target.closest('.star-button');
            const imageAttachment = target.closest('.attachment-item img');
            const downloadLink = target.closest('.attachment-download-link');

            if (replyButton) { window.handleReplyClick(postElement.dataset.postId, replyButton.dataset.username); return; }
            if (likeButton) { window.handleLike(likeButton, postElement.dataset.postId); return; }
            if (starButton) { window.handleStar(starButton, postElement.dataset.postId); return; }
            if (imageAttachment) { window.openImageModal(imageAttachment.src); return; }
            if (downloadLink) { e.preventDefault(); window.handleDownload(downloadLink.dataset.url, downloadLink.dataset.name); return; }
            
            if (!target.closest('a')) {
                window.location.hash = `#post/${postElement.dataset.postId}`;
                return;
            }
        }
        
        // --- 5. その他のグローバルなクリック処理 ---

        // ▼▼▼ このブロックを新規追加 ▼▼▼
        const notificationItem = target.closest('.notification-item');
        if (notificationItem) {
            const notificationId = notificationItem.dataset.notificationId;
            const notification = currentUser.notice.find(n => n.id === notificationId);

            // 削除ボタンがクリックされた場合
            if (target.closest('.notification-delete-btn')) {
                e.stopPropagation();
                // ▼▼▼ このブロックを修正 ▼▼▼
                // DB関数を呼び出して通知を削除
                supabase.rpc('delete_notification', {
                    target_user_id: currentUser.id,
                    notification_id_to_delete: notificationId
                }).then(({ error }) => {
                    if (error) {
                        console.error('通知の削除に失敗:', error);
                        alert('通知の削除に失敗しました。');
                    } else {
                        // 成功したら、ローカルのデータとUIからも削除
                        currentUser.notice = currentUser.notice.filter(n => n.id !== notificationId);
                        notificationItem.remove();
                    }
                });
                // ▲▲▲ 修正ここまで ▲▲▲
                return;
            }
            
            // 通知自体がクリックされた場合
            if (notification && !notification.click) {
                // DB関数を呼び出して既読化
                supabase.rpc('mark_notification_as_read', {
                    target_user_id: currentUser.id,
                    notification_id_to_update: notificationId
                }).then(({ error }) => {
                    if (error) {
                        console.error('通知の既読化に失敗:', error);
                    } else {
                        // 成功したらローカルのデータとUIも更新
                        notification.click = true;
                        notificationItem.classList.remove('notification-new');
                    }
                });
            }
            if (notification && notification.open) {
                window.location.hash = notification.open;
            }
            return;
        }
        // ▲▲▲ 追加ここまで ▲▲▲
        
        const timelineTab = target.closest('.timeline-tab-button');
        if (timelineTab) { switchTimelineTab(timelineTab.dataset.tab); return; }
        
        const bannerSignup = target.closest('#banner-signup-button');
        if (bannerSignup) { goToLoginPage(); return; }

        const bannerLogin = target.closest('#banner-login-button');
        if (bannerLogin) { goToLoginPage(); return; }
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
