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
    
    let isLoadingMore = false;
    let postLoadObserver;
    let currentPagination = { page: 0, hasMore: true, type: null, options: {} };
    const POSTS_PER_PAGE = 10;

    // --- 2. アイコンSVG定義 ---
    const ICONS = {
        home: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><rect x="9" y="12" width="6" height="10"></rect></svg>`,
        explore: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
        notifications: `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
        likes: `<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
        stars: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        profile: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        settings: `<svg viewBox="0 0 24 24"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V12a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        attachment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`,
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
    
    async function formatPostContent(text) {
        let formattedText = escapeHTML(text);
        const urlRegex = /(https?:\/\/[^\s<>"'’]+)/g;
        formattedText = formattedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">$1</a>');
        const hashtagRegex = /#([a-zA-Z0-9_ぁ-んァ-ヶー一-龠]+)/g;
        formattedText = formattedText.replace(hashtagRegex, (match, tagName) => `<a href="#search/${encodeURIComponent(tagName)}" onclick="event.stopPropagation()">${match}</a>`);
        const mentionRegex = /@(\d+)/g;
        const userIds = [...formattedText.matchAll(mentionRegex)].map(match => parseInt(match[1]));
        if (userIds.length > 0) {
            const { data: users, error } = await supabase.from('user').select('id, name').in('id', userIds);
            if (!error && users) {
                const userMap = new Map(users.map(user => [user.id, user.name]));
                formattedText = formattedText.replace(mentionRegex, (match, userId) => {
                    const numericId = parseInt(userId);
                    if (userMap.has(numericId)) {
                        const userName = userMap.get(numericId);
                        return `<a href="#profile/${numericId}" onclick="event.stopPropagation()">@${escapeHTML(userName)}</a>`;
                    }
                    return match;
                });
            }
        }
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
            menuItems.push( { name: '通知', hash: '#notifications', icon: ICONS.notifications, badge: currentUser.notice_count }, { name: 'いいね', hash: '#likes', icon: ICONS.likes }, { name: 'お気に入り', hash: '#stars', icon: ICONS.stars }, { name: 'プロフィール', hash: `#profile/${currentUser.id}`, icon: ICONS.profile }, { name: '設定', hash: '#settings', icon: ICONS.settings } );
        }
        DOM.navMenuTop.innerHTML = menuItems.map(item => ` <a href="${item.hash}" class="nav-item ${hash === item.hash ? 'active' : ''}"> ${item.icon} <span>${item.name}</span> ${item.badge && item.badge > 0 ? `<span class="notification-badge">${item.badge > 99 ? '99+' : item.badge}</span>` : ''} </a>`).join('');
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
                subscribeToChanges();
            } catch (error) {
                console.error(error);
                currentUser = null;
                localStorage.removeItem('nyaxUserId');
            }
        } else {
            currentUser = null;
        }
        router();
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
        const { prepend = false, isThread = false } = options;

        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.dataset.postId = post.id;
        if (isThread) {
            postEl.style.marginLeft = '20px';
            postEl.style.borderLeft = '2px solid var(--border-color)';
            postEl.style.paddingLeft = '1rem';
        }

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

        if (post.reply_to?.user) {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'replying-to';
            const replyLink = document.createElement('a');
            replyLink.href = `#profile/${post.reply_to.user.id}`;
            replyLink.textContent = `@${escapeHTML(post.reply_to.user.name)}`;
            replyDiv.appendChild(replyLink);
            replyDiv.append(' さんに返信');
            postMain.appendChild(replyDiv);
        }

        const postHeader = document.createElement('div');
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
            menu.className = 'post-menu hidden';

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
        contentP.innerHTML = await formatPostContent(post.content);
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

            const { count: replyCountData } = await supabase.from('post').select('id', {count: 'exact', head: true}).eq('reply_id', post.id);

            const replyBtn = document.createElement('button');
            replyBtn.className = 'reply-button';
            replyBtn.title = '返信';
            replyBtn.innerHTML = `🗨 <span>${replyCountData || 0}</span>`;
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
        // ▼▼▼ [修正点1] 読み込み完了後にローディングを非表示 ▼▼▼
        showLoading(false);
        // ▲▲▲ [修正点1] ここまで ▼▼▼
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
        // ▼▼▼ [修正点1] 読み込み完了後にローディングを非表示 ▼▼▼
        showLoading(false);
        // ▲▲▲ [修正点1] ここまで ▼▼▼
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
        DOM.pageHeader.innerHTML = `<h2 id="page-title">ポスト</h2>`;
        showScreen('post-detail-screen');
        const contentDiv = DOM.postDetailContent;
        contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            const { data: post, error } = await supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').eq('id', postId).single();
            if (error || !post) throw new Error('ポストが見つかりません。');
            contentDiv.innerHTML = '';
            
            if (post.reply_to) {
                const parentPostContainer = document.createElement('div');
                parentPostContainer.className = 'parent-post-container';
                const parentPostEl = await renderPost(post.reply_to, post.reply_to.user);
                if (parentPostEl) parentPostContainer.appendChild(parentPostEl);
                contentDiv.appendChild(parentPostContainer);
            }
            
            const mainPostEl = await renderPost(post, post.user);
            if(mainPostEl) contentDiv.appendChild(mainPostEl);
            
            const repliesHeader = document.createElement('h3');
            repliesHeader.textContent = '返信';
            repliesHeader.style.cssText = 'padding: 1rem; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); margin-top: 1rem; margin-bottom: 0; font-size: 1.2rem;';
            contentDiv.appendChild(repliesHeader);

            await loadPostsWithPagination(contentDiv, 'replies', { postId });
        } catch (err) {
            contentDiv.innerHTML = `<p class="error-message">${err.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    // --- 10. プロフィールと設定 ---
    async function showProfileScreen(userId) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">プロフィール</h2>`;
        showScreen('profile-screen');
        const profileHeader = document.getElementById('profile-header');
        const profileTabs = document.getElementById('profile-tabs');
        profileHeader.innerHTML = '<div class="spinner"></div>';
        profileTabs.innerHTML = '';

        try {
            const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
            if (error || !user) {
                profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>';
                showLoading(false);
                return;
            }
            
            const { data: followerCountData, error: countError } = await supabase.rpc('get_follower_count', { target_user_id: userId });
            const followerCount = countError ? '?' : followerCountData;

            profileHeader.innerHTML = `
                <div class="header-top">
                    <img src="${getUserIconUrl(user)}" class="user-icon-large" alt="${user.name}'s icon">
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
                const isFollowing = currentUser.follow?.includes(userId);
                updateFollowButtonState(followButton, isFollowing);
                followButton.onclick = () => window.handleFollowToggle(userId, followButton);
                profileHeader.querySelector('#follow-button-container').appendChild(followButton);
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
                    fUsers?.forEach(u => {
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
                if (options.tab === 'following') {
                    if (currentUser?.follow?.length > 0) { query = query.in('userid', currentUser.follow); } 
                    else { currentPagination.hasMore = false; }
                }
            } else if (type === 'search') {
                query = query.ilike('content', `%${options.query}%`);
            } else if (type === 'likes' || type === 'stars' || type === 'profile_posts') {
                if (!options.ids || options.ids.length === 0) { currentPagination.hasMore = false; } 
                else { query = query.in('id', options.ids); }
            } else if (type === 'replies') {
                query = query.eq('reply_id', options.postId).order('time', { ascending: true });
            }
            
            if (type !== 'replies') { query = query.order('time', { ascending: false }); }

            const emptyMessages = { timeline: 'まだポストがありません。', search: '該当するポストはありません。', likes: 'いいねしたポストはありません。', stars: 'お気に入りに登録したポストはありません。', profile_posts: 'このユーザーはまだポストしていません。', replies: '' };
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
                    for (const post of posts) {
                        const postEl = await renderPost(post, post.user || {});
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
        if (!targetMenu) return;
    
        const isHidden = targetMenu.classList.contains('hidden');
    
        // まず、現在開いている他のメニューをすべて閉じる
        document.querySelectorAll('.post-menu:not(.hidden)').forEach(menu => {
            if (menu.id !== `menu-${postId}`) {
                menu.classList.add('hidden');
            }
        });
    
        // ターゲットメニューの表示状態を切り替える
        targetMenu.classList.toggle('hidden');
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
        currentUser.star = updatedStars; localStorage.setItem('currentUser', JSON.stringify(currentUser));
        countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
        button.classList.toggle('starred', !isStarred);
        iconSpan.textContent = isStarred ? '★' : '☆';
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
    DOM.mainContent.addEventListener('click', (e) => {
        const target = e.target;
        const postElement = target.closest('.post');
        if (!postElement) return;

        const postId = postElement.dataset.postId;
        
        const menuButton = target.closest('.post-menu-btn');
        const deleteButton = target.closest('.delete-btn');
        const replyButton = target.closest('.reply-button');
        const likeButton = target.closest('.like-button');
        const starButton = target.closest('.star-button');
        const imageAttachment = target.closest('.attachment-item img');
        const downloadLink = target.closest('.attachment-download-link');
        const profileLink = target.closest('.user-icon-link, .post-author, .replying-to a, .profile-link');

        if (menuButton) { e.stopPropagation(); window.togglePostMenu(postId); return; }
        if (deleteButton) { e.stopPropagation(); window.deletePost(postId); return; }
        if(replyButton) { e.stopPropagation(); window.handleReplyClick(postId, replyButton.dataset.username); return; }
        if(likeButton) { e.stopPropagation(); window.handleLike(likeButton, postId); return; }
        if(starButton) { e.stopPropagation(); window.handleStar(starButton, postId); return; }
        if(imageAttachment) { e.stopPropagation(); window.openImageModal(imageAttachment.src); return; }
        if(downloadLink) { e.preventDefault(); e.stopPropagation(); window.handleDownload(downloadLink.dataset.url, downloadLink.dataset.name); return; }
        if(profileLink) { e.preventDefault(); e.stopPropagation(); window.location.hash = profileLink.getAttribute('href'); return; }
        
        if (postElement && !target.closest('a, video, audio, button')) {
            window.location.hash = `#post/${postElement.dataset.postId}`;
        }
    });

    const tabsContainer = document.querySelector('.timeline-tabs');
    if(tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.timeline-tab-button')) {
                switchTimelineTab(e.target.dataset.tab);
            }
        });
    }

    document.addEventListener('click', (e) => {
        // メニューボタン自身、またはメニューの内側がクリックされた場合は何もしない
        if (e.target.closest('.post-menu-btn') || e.target.closest('.post-menu')) {
            return;
        }

        // それ以外の場所がクリックされたら、開いているすべてのメニューを閉じる
        document.querySelectorAll('.post-menu:not(.hidden)').forEach(menu => {
            menu.classList.add('hidden');
        });
    });
    
    document.getElementById('banner-signup-button').addEventListener('click', goToLoginPage);
    document.getElementById('banner-login-button').addEventListener('click', goToLoginPage);
    window.addEventListener('hashchange', router);
    checkSession();
});
