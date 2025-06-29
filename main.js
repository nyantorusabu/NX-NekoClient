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

    let isLoadingMore = false;
    let observer;
    const POSTS_PER_PAGE = 10; // ▼▼▼ [修正点4] 10件に変更 ▼▼▼

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

    // --- 4. ユーティリティ関数とグローバルな関数定義 ---
    function showLoading(show) { DOM.loadingOverlay.classList.toggle('hidden', !show); }
    function showScreen(screenId) {
        DOM.screens.forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId)?.classList.remove('hidden');
    }
    function escapeHTML(str) { if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

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
    
    // ▼▼▼ [修正点2] clearReplyをwindowスコープに移動 ▼▼▼
    window.clearReply = () => {
        replyingTo = null;
        const replyInfo = document.getElementById('reply-info');
        const replyInfoModal = document.getElementById('reply-info-modal');
        if (replyInfo) replyInfo.classList.add('hidden');
        if (replyInfoModal) replyInfoModal.classList.add('hidden');
    };
    // ▲▲▲ [修正点2] ここまで ▲▲▲

    // ▼▼▼ [修正点1] show...関数群をスコープ解決のため先に定義 ▼▼▼
    async function showMainScreen() {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">ホーム</h2>`;
        showScreen('main-screen');
        if (currentUser) {
            DOM.postFormContainer.innerHTML = createPostFormHTML();
            attachPostFormListeners(DOM.postFormContainer);
        } else { DOM.postFormContainer.innerHTML = ''; }
        document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
        await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
    }

    async function showExploreScreen() {
        DOM.pageHeader.innerHTML = `
            <div class="header-search-bar">
                <span class="search-icon">${ICONS.explore}</span>
                <input type="search" id="search-input" placeholder="検索">
            </div>`;
        document.getElementById('search-input').onkeydown = (e) => { if(e.key === 'Enter') performSearch(); };
        showScreen('explore-screen');
        DOM.exploreContent.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">ユーザーやポストを検索してみましょう。</p>';
    }

    async function showSearchResults(query) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">検索結果: "${escapeHTML(query)}"</h2>`;
        showScreen('search-results-screen');
        const contentDiv = DOM.searchResultsContent;
        contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            // ユーザー検索とポスト検索を並行して実行
            const userSearchPromise = supabase.from('user').select('*').or(`name.ilike.%${query}%,scid.ilike.%${query}%,me.ilike.%${query}%`).order('id', { ascending: true }).limit(10);
            const postSearchPromise = supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').ilike('content', `%${query}%`).order('time', { ascending: false });

            const [{ data: users, error: userError }, { data: posts, error: postError }] = await Promise.all([userSearchPromise, postSearchPromise]);

            contentDiv.innerHTML = ''; // コンテンツをクリア

            // ユーザー結果の表示
            const userResultsContainer = document.createElement('div');
            let userResultsHTML = `<h3 style="padding:1rem;">ユーザー</h3>`;
            if (userError) {
                console.error("ユーザー検索エラー:", userError);
                userResultsHTML += `<p class="error-message">ユーザーの検索中にエラーが発生しました。</p>`;
            } else if (users && users.length > 0) {
                userResultsHTML += users.map(u => ` <div class="profile-card widget-item"> <div class="profile-card-info" style="display:flex; align-items:center; gap:0.8rem;"> <a href="#profile/${u.id}" style="display:flex; align-items:center; gap:0.8rem; text-decoration:none; color:inherit;"> <img src="https://trampoline.turbowarp.org/avatars/by-username/${u.scid}" style="width:48px; height:48px; border-radius:50%;" alt="${u.name}'s icon"> <div> <span class="name" style="font-weight:700;">${escapeHTML(u.name)}</span> <span class="id" style="color:var(--secondary-text-color);">#${u.id}</span> <p class="me" style="margin:0.2rem 0 0;">${escapeHTML(u.me || '')}</p> </div> </a> </div> </div>`).join('');
            } else {
                userResultsHTML += `<p style="padding:1rem; text-align:center;">一致するユーザーは見つかりませんでした。</p>`;
            }
            userResultsContainer.innerHTML = userResultsHTML;
            contentDiv.appendChild(userResultsContainer);

            // ポスト結果の表示
            const postResultsContainer = document.createElement('div');
            let postResultsHTML = `<h3 style="padding:1rem; border-top:1px solid var(--border-color); margin-top:1rem; padding-top:1rem;">ポスト</h3>`;
            postResultsContainer.innerHTML = postResultsHTML;
            contentDiv.appendChild(postResultsContainer);

            if (postError) {
                console.error("ポスト検索エラー:", postError);
                postResultsContainer.innerHTML += `<p class="error-message">ポストの検索中にエラーが発生しました。</p>`;
            } else if (posts && posts.length > 0) {
                for (const post of posts) { await renderPost(post, post.user, postResultsContainer); }
            } else {
                postResultsContainer.innerHTML += `<p style="padding:1rem; text-align:center;">一致するポストは見つかりませんでした。</p>`;
            }

        } catch (e) {
            contentDiv.innerHTML = `<p class="error-message">検索結果の読み込みに失敗しました。</p>`;
            console.error("検索結果表示エラー:", e);
        }
    }
    
    async function showNotificationsScreen() {
        if (!currentUser) {
            DOM.pageHeader.innerHTML = `<h2 id="page-title">通知</h2>`;
            showScreen('notifications-screen');
            DOM.notificationsContent.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">通知を見るにはログインが必要です。</p>';
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

    async function showLikesScreen() { DOM.pageHeader.innerHTML = `<h2 id="page-title">いいね</h2>`; showScreen('likes-screen'); await loadPostsByIds(DOM.likesContent, "いいねしたポストはまだありません。", { ids: currentUser.like }, true); }
    async function showStarsScreen() { DOM.pageHeader.innerHTML = `<h2 id="page-title">お気に入り</h2>`; showScreen('stars-screen'); await loadPostsByIds(DOM.starsContent, "お気に入りに登録したポストはまだありません。", { ids: currentUser.star }, true); }

    async function showPostDetail(postId) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">ポスト</h2>`;
        showScreen('post-detail-screen');
        const contentDiv = DOM.postDetailContent; contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            const { data: post, error } = await supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').eq('id', postId).single();
            if (error || !post) throw new Error('ポストが見つかりません。');
            contentDiv.innerHTML = '';
            
            if (post.reply_id && post.reply_to) {
                const parentPostContainer = document.createElement('div');
                parentPostContainer.className = 'parent-post-container';
                await renderPost(post.reply_to, post.reply_to.user, parentPostContainer);
                contentDiv.appendChild(parentPostContainer);
            }
            
            await renderPost(post, post.user, contentDiv);
            
            const { data: replies, error: repliesError } = await supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').eq('reply_id', postId).order('time', { ascending: true });
            if (repliesError) { console.error("返信の読み込みに失敗しました:", repliesError); } 
            else if (replies?.length > 0) {
                const repliesHeader = document.createElement('h3');
                repliesHeader.textContent = '返信';
                repliesHeader.style.cssText = 'padding: 1rem; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); margin: 1rem 0 0; font-size: 1.2rem;';
                contentDiv.appendChild(repliesHeader);
                for (const reply of replies) { await renderPost(reply, reply.user, contentDiv); }
            }
        } catch (err) { contentDiv.innerHTML = `<p class="error-message">${err.message}</p>`; }
    }
    
    async function showProfileScreen(userId) {
        DOM.pageHeader.innerHTML = `<h2 id="page-title">プロフィール</h2>`;
        showScreen('profile-screen');
        const profileHeader = document.getElementById('profile-header'), profileTabs = document.getElementById('profile-tabs');
        profileHeader.innerHTML = '<div class="spinner"></div>'; profileTabs.innerHTML = '';
        const { data: user, error } = await supabase.from('user').select('*').eq('id', userId).single();
        if (error || !user) { profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>'; return; }
        
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
            const isFollowing = currentUser.follow?.includes(userId);
            updateFollowButtonState(followButton, isFollowing);
            followButton.onclick = () => handleFollowToggle(userId, followButton);
            profileHeader.querySelector('#follow-button-container').appendChild(followButton);
        }
        profileTabs.innerHTML = `<button class="tab-button active" data-tab="posts">ポスト</button><button class="tab-button" data-tab="likes">いいね</button><button class="tab-button" data-tab="stars">お気に入り</button><button class="tab-button" data-tab="follows">フォロー中</button>`;
        profileTabs.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => loadProfileTabContent(user, button.dataset.tab)));
        await loadProfileTabContent(user, 'posts');
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
    // ▲▲▲ [修正点1] ここまで ▲▲▲

    // --- 10. コンテンツ読み込み & レンダリング ---
    async function loadPostsByIds(container, emptyMessage, options = {}, isInitial = true) {
        const page = isInitial ? 0 : parseInt(container.dataset.page || '0');
        if (isInitial) {
            container.innerHTML = '';
            showLoading(true);
        } else {
            const footer = container.querySelector('.timeline-footer');
            if(footer) footer.innerHTML = '<div class="spinner"></div>';
        }
    
        try {
            let query = supabase.from('post').select('*, user(*)');
            
            if (options.ids && options.ids.length > 0) {
                query = query.in('id', options.ids);
            } else if(options.authorId) {
                query = query.eq('userid', options.authorId);
            } else {
                if(isInitial) container.innerHTML = `<p style="padding: 2rem; text-align:center;">${emptyMessage}</p>`;
                return;
            }
    
            const { data, error } = await query.order('time', { ascending: false }).range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);
            if (error) throw error;
    
            if (isInitial && (!data || data.length === 0)) {
                container.innerHTML = `<p style="padding: 2rem; text-align:center;">${emptyMessage}</p>`;
                return;
            }
            
            for (const p of data) { await renderPost(p, p.user, container); }
            
            container.dataset.page = page + 1;

            const footer = container.querySelector('.timeline-footer') || document.createElement('div');
            footer.className = 'timeline-footer';
            container.appendChild(footer);
            
            if (data.length < POSTS_PER_PAGE) {
                if(observer) observer.disconnect();
                footer.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">すべてのポストを読み込みました</p>';
            } else {
                footer.innerHTML = '<div class="spinner"></div>';
                setupIntersectionObserver(container, () => loadPostsByIds(container, emptyMessage, options, false));
            }
        } catch (err) { container.innerHTML = `<p class="error-message">ポストの読み込みに失敗しました。</p>`; console.error("loadPostsByIds error:", err); }
        finally { if (isInitial) showLoading(false); }
    }

    async function loadTimeline(tab, container, isInitial = true) {
        const page = isInitial ? 0 : parseInt(container.dataset.page || '0');
        if (isInitial) {
            container.innerHTML = '';
            showLoading(true);
        } else {
            const footer = container.querySelector('.timeline-footer');
            if(footer) footer.innerHTML = '<div class="spinner"></div>';
        }
        
        try {
            let query = supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))');
            if (tab === 'following') {
                if (currentUser?.follow?.length > 0) {
                    query = query.in('userid', currentUser.follow);
                } else {
                    if(isInitial) container.innerHTML = `<p style="padding: 2rem; text-align: center;">まだ誰もフォローしていません。</p>`;
                    if (isInitial) showLoading(false);
                    return;
                }
            }

            const { data: posts, error } = await query.order('time', { ascending: false }).range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);
            if (error) throw error;
            
            if (isInitial && posts.length === 0) {
                container.innerHTML = `<p style="padding: 2rem; text-align: center;">${tab === 'following' ? 'フォローしているユーザーのポストはまだありません。' : 'まだポストがありません。'}</p>`;
                return;
            }
            
            for (const post of posts) { await renderPost(post, post.user || {}, container); }

            container.dataset.page = page + 1;

            const footer = container.querySelector('.timeline-footer') || document.createElement('div');
            footer.className = 'timeline-footer';
            container.appendChild(footer);

            if (posts.length < POSTS_PER_PAGE) {
                if (observer) observer.disconnect();
                footer.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">すべてのポストを読み込みました</p>';
            } else {
                footer.innerHTML = '<div class="spinner"></div>';
                setupIntersectionObserver(container, () => loadTimeline(tab, container, false));
            }

        } catch(err) { container.innerHTML = `<p class="error-message">${err.message}</p>`; console.error("loadTimeline error:", err);}
        finally { if (isInitial) showLoading(false); }
    }

    function setupIntersectionObserver(container, callback) {
        if (observer) observer.disconnect();
        const target = container.querySelector('.timeline-footer');
        if (!target) return;

        observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoadingMore) {
                isLoadingMore = true;
                callback();
                setTimeout(() => { isLoadingMore = false; }, 1000); // 連発防止
            }
        }, { threshold: 0.1 });
        observer.observe(target);
    }
    
    // --- 11. ユーザーアクション ---
    // (変更なし)

    // --- 12. プロフィール関連 ---
    async function loadProfileTabContent(user, tab) {
        document.querySelectorAll('#profile-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        const contentDiv = document.getElementById('profile-content');
        
        try {
            switch(tab) {
                case 'posts': await loadPostsByIds(contentDiv, "このユーザーはまだポストしていません。", { authorId: user.id }, true); break;
                case 'likes': 
                    if (!user.settings.show_like && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのいいねは非公開です。</p>'; break; }
                    await loadPostsByIds(contentDiv, "このユーザーはまだいいねしたポストがありません。", { ids: user.like || [] }, true); break;
                case 'stars':
                    if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center;">🔒 このユーザーのお気に入りは非公開です。</p>'; break; }
                    await loadPostsByIds(contentDiv, "このユーザーはまだお気に入りしたポストがありません。", { ids: user.star || [] }, true); break;
                case 'follows':
                    contentDiv.innerHTML = '<div class="spinner"></div>';
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
    
    // --- 13. 初期化処理 ---
    // ▼▼▼ [修正点1] イベントデリゲーションの最終修正版 ▼▼▼
    DOM.mainContent.addEventListener('click', (e) => {
        const target = e.target;
        const postElement = target.closest('.post');
        
        const timelineTab = target.closest('.timeline-tab-button');
        if (timelineTab) {
            switchTimelineTab(timelineTab.dataset.tab);
            return;
        }

        if (!postElement) return;

        const postId = postElement.dataset.postId;
        
        if (target.closest('.post-menu-btn')) {
            e.stopPropagation();
            togglePostMenu(postId);
            return;
        }
        if (target.closest('.delete-btn')) {
            e.stopPropagation();
            deletePost(postId);
            return;
        }
        if (target.closest('.reply-button')) {
            e.stopPropagation();
            handleReplyClick(postId, target.closest('.reply-button').dataset.username);
            return;
        }
        if (target.closest('.like-button')) {
            e.stopPropagation();
            handleLike(target.closest('.like-button'), postId);
            return;
        }
        if (target.closest('.star-button')) {
            e.stopPropagation();
            handleStar(target.closest('.star-button'), postId);
            return;
        }
        if (target.matches('.attachment-image')) {
            e.stopPropagation();
            openImageModal(target.src);
            return;
        }
        if (target.closest('.attachment-download-link')) {
            e.preventDefault();
            e.stopPropagation();
            const link = target.closest('.attachment-download-link');
            handleDownload(link.dataset.url, link.dataset.name);
            return;
        }
        
        if (!target.closest('a, video, audio, button')) {
            window.location.hash = `#post/${postId}`;
        }
    });
    // ▲▲▲ [修正点1] ここまで ▼▼▼

    document.getElementById('banner-signup-button').addEventListener('click', goToLoginPage);
    document.getElementById('banner-login-button').addEventListener('click', goToLoginPage);
    window.addEventListener('hashchange', router);
    checkSession();
});
