window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初期設定 & グローバル変数 ---
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let currentUser = null; let realtimeChannel = null; let currentTimelineTab = 'foryou';
    let replyingTo = null;

    const ICONS = {
        home: `<svg viewBox="0 0 24 24"><g><path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.878 4.12 22 5.5 22h13c1.38 0 2.5-1.122 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z"></path></g></svg>`,
        explore: `<svg viewBox="0 0 24 24"><g><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.418-.726 4.596-1.904 1.178-1.178 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.83-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.432 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path></g></svg>`,
        notifications: `<svg viewBox="0 0 24 24"><g><path d="M21.697 16.468c-.02-.016-2.14-1.64-2.14-6.335 0-4.506-3.655-8.13-8.13-8.13S3.297 5.627 3.297 10.133c0 4.696-2.12 6.32-2.14 6.335-.14.108-.22.28-.22.463v1.5c0 .552.447 1 1 1h4.07c.54 2.6 2.87 4.5 5.59 4.5s5.05-1.9 5.59-4.5h4.07c.553 0 1-.448 1-1v-1.5c0-.183-.08-.355-.22-.463z"></path></g></svg>`,
        likes: `<svg viewBox="0 0 24 24" fill="currentColor"><g><path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z"></path></g></svg>`,
        stars: `<svg viewBox="0 0 24 24"><g><path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2.25l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873L12 17.75z"></path></g></svg>`,
        profile: `<svg viewBox="0 0 24 24"><g><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></g></svg>`,
        settings: `<svg viewBox="0 0 24 24"><g><path d="M19.88 18.23c.36.02.65.32.65.68v1.1c0 .37-.29.67-.66.68H4.13c-.37-.01-.66-.31-.66-.68v-1.1c0-.36.29-.66.65-.68h.01c.36-.02.65-.32.65-.68s-.29-.66-.65-.68h-.01c-.36-.02-.65-.32-.65-.68v-1.1c0-.37.29-.67.66-.68h.01c.37.01.66.31.66.68s-.29.67-.66-.68h-.01c-.37.01-.66-.31-.66-.68v-1.1c0-.37.29-.67.66-.68h15.75c.37.01.66.31.66.68v1.1c0 .37-.29.67-.66.68h-.01c-.37-.01-.66-.31-.66-.68s.29-.67.66-.68h.01zm-3.26-9.28L12 3.63 7.38 8.95c-.38.41-.35 1.05.06 1.42.4.37 1.04.34 1.41-.06L11 8.43V15c0 .55.45 1 1 1s1-.45 1-1V8.43l2.15 1.88c.37.33.92.31 1.28-.05.37-.36.39-.96.05-1.33z"></path></g></svg>`,
    };
    const DOM = {
        navMenuTop: document.getElementById('nav-menu-top'),
        navMenuBottom: document.getElementById('nav-menu-bottom'),
        pageTitle: document.getElementById('page-title'),
        screens: document.querySelectorAll('.screen'),
        postFormContainer: document.querySelector('.post-form-container'),
        postModal: document.getElementById('post-modal'),
        timeline: document.getElementById('timeline'),
        exploreContent: document.getElementById('explore-content'),
        notificationsContent: document.getElementById('notifications-content'),
        likesContent: document.getElementById('likes-content'),
        starsContent: document.getElementById('stars-content'),
        postDetailContent: document.getElementById('post-detail-content'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loginBanner: document.getElementById('login-banner'),
        rightSidebar: {
            search: document.getElementById('search-widget-container'),
            recommendations: document.getElementById('recommendations-widget-container')
        }
    };

    function showLoading(show) { DOM.loadingOverlay.classList.toggle('hidden', !show); }
    function showScreen(screenId) {
        DOM.screens.forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId)?.classList.remove('hidden');
    }
    function escapeHTML(str) { if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

    function updateNavAndSidebars() {
        const hash = window.location.hash || '#';
        const menuItems = [
            { name: 'ホーム', hash: '#', icon: ICONS.home },
            { name: '発見', hash: '#explore', icon: ICONS.explore }
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
        DOM.rightSidebar.search.innerHTML = `<div class="sidebar-widget search-widget"><input type="text" placeholder="検索"></div>`;
        const { data, error } = await supabase.rpc('get_recommended_users', { count_limit: 3 });
        if (error || !data || data.length === 0) { DOM.rightSidebar.recommendations.innerHTML = ''; return; }
        let recHTML = '<div class="widget-title">おすすめユーザー</div>';
        recHTML += data.map(user => `
            <div class="widget-item recommend-user">
                <a href="#profile/${user.id}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:0.5rem;">
                    <img src="https://trampoline.turbowarp.org/avatars/by-username/${user.scid}" style="width:40px;height:40px;border-radius:50%;" alt="${user.name}'s icon">
                    <div>
                        <span>${escapeHTML(user.name)}</span>
                        <small style="color:var(--secondary-text-color); display:block;">#${user.id}</small>
                    </div>
                </a>
                ${currentUser && currentUser.id !== user.id ? `<button onclick="window.handleRecFollow(${user.id}, this)">フォロー</button>` : ''}
            </div>`).join('');
        DOM.rightSidebar.recommendations.innerHTML = `<div class="sidebar-widget">${recHTML}</div>`;
    }

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
            const { data, error } = await supabase.from('post').insert(postData).select().single();
            if(error) throw error;
            currentUser.post = [...(currentUser.post || []), data.id];
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (isModal) closePostModal(); else contentEl.value = '';
            clearReply();
            if (!document.getElementById('main-screen').classList.contains('hidden')) {
                await loadTimeline(currentTimelineTab, DOM.timeline);
            }
        } catch(e) { console.error(e); alert('ポストに失敗しました。'); }
        finally { button.disabled = false; button.textContent = 'ポスト'; }
    }

    async function renderPost(post, author, container, prepend = false) {
        const postEl = document.createElement('div'); postEl.className = 'post';
        postEl.onclick = (e) => { if (!e.target.closest('button, a')) window.location.hash = `#post/${post.id}`; };
        const isLiked = currentUser?.like?.includes(post.id);
        const isStarred = currentUser?.star?.includes(post.id);
        let replyHTML = post.reply_to?.user ? `<div class="replying-to"><a href="#profile/${post.reply_to.user.id}">@${post.reply_to.user.name}</a> さんに返信</div>` : '';
        const menuHTML = currentUser?.id === post.userid ? `<button class="post-menu-btn" onclick="event.stopPropagation(); window.togglePostMenu('${post.id}')">…</button><div id="menu-${post.id}" class="post-menu hidden"><button class="delete-btn" onclick="window.deletePost('${post.id}')">削除</button></div>` : '';
        const { count: replyCount } = await supabase.from('post').select('id', {count: 'exact', head: true}).eq('reply_id', post.id);
        const actionsHTML = currentUser ? `
            <div class="post-actions">
                <button class="reply-button" onclick="event.stopPropagation(); window.handleReplyClick('${post.id}', '${escapeHTML(author.name)}')" title="返信">🗨 <span>${replyCount || 0}</span></button>
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
    
    // --- ルーターとメイン画面表示 ---
    async function router() {
        updateNavAndSidebars();
        const hash = window.location.hash || '#';
        showLoading(true);
        try {
            if (hash.startsWith('#post/')) await showPostDetail(hash.substring(7));
            else if (hash.startsWith('#profile/')) await showProfileScreen(parseInt(hash.substring(9)));
            else if (hash === '#settings' && currentUser) await showSettingsScreen();
            else if (hash === '#explore') await showExploreScreen();
            else if (hash === '#notifications' && currentUser) await showNotificationsScreen();
            else if (hash === '#likes' && currentUser) await showLikesScreen();
            else if (hash === '#stars' && currentUser) await showStarsScreen();
            else await showMainScreen();
        } catch (error) {
            console.error("Routing error:", error);
            DOM.pageTitle.textContent = "エラー";
            showScreen('main-screen');
            DOM.timeline.innerHTML = `<p class="error-message">ページの読み込み中にエラーが発生しました。</p>`;
        } finally {
            showLoading(false);
        }
    }
    async function showMainScreen() {
        DOM.pageTitle.textContent = "ホーム"; showScreen('main-screen');
        if (currentUser) {
            DOM.postFormContainer.innerHTML = `
                <div class="post-form">
                    <img src="https://trampoline.turbowarp.org/avatars/by-username/${currentUser.scid}" class="user-icon" alt="your icon">
                    <div class="form-content">
                        <div id="reply-info" class="hidden" style="margin-bottom: 0.5rem; color: var(--secondary-text-color);"></div>
                        <textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea>
                        <div class="post-form-actions"><button id="post-submit-button">ポスト</button></div>
                    </div>
                </div>`;
            const textarea = document.getElementById('post-content');
            textarea.addEventListener('keydown', handleCtrlEnter);
            DOM.postFormContainer.querySelector('#post-submit-button').addEventListener('click', () => handlePostSubmit(false));
        } else { DOM.postFormContainer.innerHTML = ''; }
        document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
        await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
    }
    async function showExploreScreen() { DOM.pageTitle.textContent = "発見"; showScreen('explore-screen'); await loadTimeline('foryou', DOM.exploreContent); }
    async function showNotificationsScreen() {
        DOM.pageTitle.textContent = "通知"; showScreen('notifications-screen');
        const contentDiv = DOM.notificationsContent; contentDiv.innerHTML = '';
        if (currentUser.notice?.length) {
            currentUser.notice.forEach(n => {
                const noticeEl = document.createElement('div');
                noticeEl.className = 'widget-item';
                noticeEl.textContent = n;
                contentDiv.appendChild(noticeEl);
            });
        } else {
            contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">通知はまだありません。</p>';
        }
    }
    async function showLikesScreen() { DOM.pageTitle.textContent = "いいね"; showScreen('likes-screen'); await loadPostsByIds(currentUser.like, DOM.likesContent, "いいねしたポストはまだありません。"); }
    async function showStarsScreen() { DOM.pageTitle.textContent = "お気に入り"; showScreen('stars-screen'); await loadPostsByIds(currentUser.star, DOM.starsContent, "お気に入りに登録したポストはまだありません。"); }
    async function showPostDetail(postId) {
        DOM.pageTitle.textContent = "ポスト"; showScreen('post-detail-screen');
        const contentDiv = DOM.postDetailContent; contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            const { data: post, error } = await supabase.from('post').select('*, user(*), reply_to:reply_id(*, user(*))').eq('id', postId).single();
            if (error || !post) throw new Error('ポストが見つかりません。');
            contentDiv.innerHTML = '';
            renderPost(post, post.user, contentDiv);
        } catch (err) { contentDiv.innerHTML = `<p class="error-message">${err.message}</p>`; }
    }
    
    // 他の全関数...
    window.togglePostMenu = (postId) => document.getElementById(`menu-${postId}`).classList.toggle('hidden');
    window.deletePost = async (postId) => { if (!confirm('このポストを削除しますか？')) return; showLoading(true); try { const { error } = await supabase.from('post').delete().eq('id', postId); if (error) throw error; window.location.hash = '#'; } catch(e) { alert('削除に失敗しました。'); } finally { showLoading(false); } };
    window.handleReplyClick = (postId, username) => { if (!currentUser) return alert("ログインが必要です。"); openPostModal({ id: postId, name: username }); };
    window.clearReply = () => { replyingTo = null; document.getElementById('reply-info')?.classList.add('hidden'); document.getElementById('reply-info-modal')?.classList.add('hidden'); };
    window.handleLike = async (button, postId) => { /* ... */ };
    window.handleStar = async (button, postId) => { /* ... */ };
    window.handleRecFollow = async (userId, button) => { if (!currentUser) return alert("ログインが必要です。"); button.textContent = '...'; button.disabled = true; await handleFollowToggle(userId, button, true); };
    async function handleFollowToggle(targetUserId, button, isRecButton = false) { /* ... */ }
    async function showProfileScreen(userId) { /* ... */ }
    async function loadProfileTabContent(user, tab) { /* ... */ }
    async function showSettingsScreen() { /* ... */ }
    async function handleUpdateSettings(event) { /* ... */ }
    function subscribeToChanges() { if (realtimeChannel) return; realtimeChannel = supabase.channel('nyax-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'post' }, payload => { if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') { const mainScreenVisible = !document.getElementById('main-screen').classList.contains('hidden'); if (mainScreenVisible) router(); } }).subscribe(); }
    
    // --- 初期化処理 ---
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.addEventListener('click', () => switchTimelineTab(btn.dataset.tab)));
    document.getElementById('banner-signup-button').addEventListener('click', goToLoginPage);
    document.getElementById('banner-login-button').addEventListener('click', goToLoginPage);
    window.addEventListener('hashchange', router);
    checkSession();
});
