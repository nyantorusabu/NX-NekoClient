window.addEventListener('DOMContentLoaded', () => {
    // --- 1. 初期設定 & グローバル変数 ---
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNTIxMDMsImV4cCI6MjA1NTYyODEwM30.yasDnEOlUi6zKNsnuPXD8RA6tsPljrwBRQNPVLsXAks';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let currentUser = null; let realtimeChannel = null; let currentTimelineTab = 'foryou';

    const ICONS = {
        home: `<svg viewBox="0 0 24 24"><g><path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.878 4.12 22 5.5 22h13c1.38 0 2.5-1.122 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z"></path></g></svg>`,
        explore: `<svg viewBox="0 0 24 24"><g><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.418-.726 4.596-1.904 1.178-1.178 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.83-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.432 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path></g></svg>`,
        notifications: `<svg viewBox="0 0 24 24"><g><path d="M21.697 16.468c-.02-.016-2.14-1.64-2.14-6.335 0-4.506-3.655-8.13-8.13-8.13S3.297 5.627 3.297 10.133c0 4.696-2.12 6.32-2.14 6.335-.14.108-.22.28-.22.463v1.5c0 .552.447 1 1 1h4.07c.54 2.6 2.87 4.5 5.59 4.5s5.05-1.9 5.59-4.5h4.07c.553 0 1-.448 1-1v-1.5c0-.183-.08-.355-.22-.463z"></path></g></svg>`,
        likes: `<svg viewBox="0 0 24 24" fill="#f91880"><g><path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z"></path></g></svg>`,
        stars: `<svg viewBox="0 0 24 24"><g><path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2.25l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873L12 17.75z"></path></g></svg>`,
        profile: `<svg viewBox="0 0 24 24"><g><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></g></svg>`,
        settings: `<svg viewBox="0 0 24 24"><g><path d="M13.235 2.56c-.33-.424-.87-.66-1.42-.66h-1.63c-.55 0-1.09.236-1.42.66L6.52 5.5H3.5c-.83 0-1.5.67-1.5 1.5v12c0 .83.67 1.5 1.5 1.5h17c.83 0 1.5-.67 1.5-1.5v-12c0-.83-.67-1.5-1.5-1.5h-3.02l-2.245-2.94zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path></g></svg>`
    };

    const DOM = {
        navMenuTop: document.getElementById('nav-menu-top'),
        navMenuBottom: document.getElementById('nav-menu-bottom'),
        pageTitle: document.getElementById('page-title'),
        screens: document.querySelectorAll('.screen'),
        postFormContainer: document.querySelector('.post-form-container'),
        timeline: document.getElementById('timeline'),
        exploreContent: document.getElementById('explore-content'),
        notificationsContent: document.getElementById('notifications-content'),
        likesContent: document.getElementById('likes-content'),
        starsContent: document.getElementById('stars-content'),
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

    async function router() {
        updateNavAndSidebars();
        const hash = window.location.hash || '#';
        showLoading(true);
        try {
            if (hash.startsWith('#profile/')) await showProfileScreen(parseInt(hash.substring(9)));
            else if (hash === '#settings' && currentUser) await showSettingsScreen();
            else if (hash === '#explore') await showExploreScreen();
            else if (hash === '#notifications' && currentUser) await showNotificationsScreen();
            else if (hash === '#likes' && currentUser) await showLikesScreen();
            else if (hash === '#stars' && currentUser) await showStarsScreen();
            else await showMainScreen();
        } catch (error) { console.error("Routing error:", error); } 
        finally { showLoading(false); }
    }

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
        DOM.navMenuTop.innerHTML = menuItems.map(item => `
            <a href="${item.hash}" class="nav-item ${hash === item.hash ? 'active' : ''}">
                ${item.icon}<span>${item.name}</span>
            </a>`).join('');
        if(currentUser) DOM.navMenuTop.innerHTML += `<button class="nav-item nav-item-post"><span>ポスト</span></button>`;
        
        DOM.navMenuBottom.innerHTML = currentUser ?
            `<button id="account-button" class="nav-item"><span>${escapeHTML(currentUser.name)}#${currentUser.id}</span></button>` :
            `<button id="login-button" class="nav-item"><span>ログイン</span></button>`;
        
        DOM.loginBanner.classList.toggle('hidden', !!currentUser);

        DOM.navMenuTop.querySelectorAll('a.nav-item').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); window.location.hash = link.getAttribute('href'); }));
        DOM.navMenuBottom.querySelector('button')?.addEventListener('click', currentUser ? handleLogout : goToLoginPage);
        DOM.navMenuTop.querySelector('.nav-item-post')?.addEventListener('click', () => document.getElementById('post-content')?.focus());
        
        loadRightSidebar();
    }

    function loadRightSidebar() {
        DOM.rightSidebar.search.innerHTML = `<div class="sidebar-widget search-widget"><input type="text" placeholder="検索"></div>`;
        DOM.rightSidebar.recommendations.innerHTML = `
            <div class="sidebar-widget">
                <div class="widget-title">おすすめユーザー</div>
                <div class="widget-item recommend-user"><span>User One</span><button>フォロー</button></div>
                <div class="widget-item recommend-user"><span>User Two</span><button>フォロー</button></div>
            </div>`;
    }

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

    async function showMainScreen() {
        DOM.pageTitle.textContent = "ホーム";
        showScreen('main-screen');
        if (currentUser) {
            DOM.postFormContainer.innerHTML = `<div class="post-form"><textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea><div class="post-form-actions"><button id="post-submit-button">ポスト</button></div></div>`;
            DOM.postFormContainer.querySelector('#post-submit-button').addEventListener('click', handlePostSubmit);
        } else { DOM.postFormContainer.innerHTML = ''; }
        document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
        await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
    }
    async function showExploreScreen() {
        DOM.pageTitle.textContent = "発見";
        showScreen('explore-screen');
        await loadTimeline('foryou', DOM.exploreContent);
    }
    async function showNotificationsScreen() {
        DOM.pageTitle.textContent = "通知";
        showScreen('notifications-screen');
        const contentDiv = DOM.notificationsContent;
        contentDiv.innerHTML = '';
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
    async function showLikesScreen() {
        DOM.pageTitle.textContent = "いいね";
        showScreen('likes-screen');
        const contentDiv = DOM.likesContent;
        if (!currentUser.like?.length) {
            contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">いいねした投稿はまだありません。</p>'; return;
        }
        await loadPostsByIds(currentUser.like, contentDiv);
    }
    async function showStarsScreen() {
        DOM.pageTitle.textContent = "お気に入り";
        showScreen('stars-screen');
        const contentDiv = DOM.starsContent;
        if (!currentUser.star?.length) {
            contentDiv.innerHTML = '<p style="padding: 2rem; text-align:center; color: var(--secondary-text-color);">お気に入りに登録した投稿はまだありません。</p>'; return;
        }
        await loadPostsByIds(currentUser.star, contentDiv);
    }
    async function loadPostsByIds(ids, container) {
        showLoading(true);
        container.innerHTML = '';
        try {
            const { data, error } = await supabase.from('post').select('*, user(id, name)').in('id', ids).order('time', { ascending: false });
            if (error) throw error;
            data.forEach(p => renderPost(p, p.user, container));
        } catch (err) {
            container.innerHTML = `<p class="error-message">投稿の読み込みに失敗しました。</p>`;
        } finally {
            showLoading(false);
        }
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
            let query = supabase.from('post').select('*, user(id, name)').order('time', { ascending: false }).limit(50);
            if (tab === 'following' && currentUser?.follow?.length) {
                query = query.in('userid', currentUser.follow);
            }
            const { data: posts, error } = await query;
            if (error) throw new Error('投稿の読み込みに失敗しました。');
            if (!posts?.length) {
                container.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--secondary-text-color);">${tab === 'following' ? 'まだ誰もフォローしていません。' : 'まだ投稿がありません。'}</p>`; return;
            }
            posts.forEach(post => renderPost(post, post.user || {}, container));
        } catch(err) { container.innerHTML = `<p class="error-message">${err.message}</p>`; }
        finally { showLoading(false); }
    }
    function renderPost(post, author, container) {
        const postEl = document.createElement('div');
        postEl.className = 'post';
        const isLiked = currentUser?.like?.includes(post.id);
        const isStarred = currentUser?.star?.includes(post.id);
        const actionsHTML = currentUser ? `
            <div class="post-actions">
                <button class="like-button ${isLiked ? 'liked' : ''}" onclick="window.handleLike(this, '${post.id}')"><span class="icon">${isLiked ? '♥' : '♡'}</span> <span>${post.like}</span></button>
                <button class="star-button ${isStarred ? 'starred' : ''}" onclick="window.handleStar(this, '${post.id}')"><span class="icon">${isStarred ? '★' : '☆'}</span> <span>${post.star}</span></button>
            </div>` : '';
        postEl.innerHTML = `<div class="post-header"><a href="#profile/${author.id}" class="post-author">${escapeHTML(author.name || '不明')}#${author.id || '????'}</a><span class="post-time">${new Date(post.time).toLocaleString('ja-JP')}</span></div><div class="post-content"><p>${escapeHTML(post.content)}</p></div>${actionsHTML}`;
        container.appendChild(postEl);
    }
    
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
            await supabase.from('user').update({ like: currentUser.like }).eq('id', currentUser.id); // Rollback
            alert('いいね数の更新に失敗しました。');
        } else {
            currentUser.like = updatedLikes;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
            button.classList.toggle('liked', !isLiked);
            iconSpan.textContent = isLiked ? '♡' : '♥';
        }
        button.disabled = false;
    };

    window.handleStar = async (button, postId) => {
        if (!currentUser) return alert("ログインが必要です。");
        button.disabled = true;
        const iconSpan = button.querySelector('.icon'), countSpan = button.querySelector('span:last-child');
        const isStarred = currentUser.star?.includes(postId);
        const updatedStars = isStarred ? currentUser.star.filter(id => id !== postId) : [...(currentUser.star || []), postId];
        const { error } = await supabase.from('user').update({ star: updatedStars }).eq('id', currentUser.id);
        if (error) { alert('お気に入りの更新に失敗しました。');
        } else {
            currentUser.star = updatedStars;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            button.classList.toggle('starred', !isStarred);
            iconSpan.textContent = isStarred ? '☆' : '★';
        }
        button.disabled = false;
    };
    
    // 省略されていた他の関数群
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
        profileTabs.innerHTML = `<button class="tab-button active" data-tab="posts">投稿</button><button class="tab-button" data-tab="likes">いいね</button><button class="tab-button" data-tab="stars">Star</button><button class="tab-button" data-tab="follows">フォロー</button>`;
        profileTabs.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => loadProfileTabContent(user, button.dataset.tab)));
        await loadProfileTabContent(user, 'posts');
    }
    async function loadProfileTabContent(user, tab) {
        document.querySelectorAll('#profile-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        const contentDiv = document.getElementById('profile-content');
        contentDiv.innerHTML = '<div class="spinner"></div>';
        try {
            switch(tab) {
                case 'posts': await loadPostsByIds(user.post, contentDiv, "このユーザーはまだ投稿していません。"); break;
                case 'likes': 
                    if (!user.settings.show_like && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒 このユーザーのいいねは非公開です。</p>'; break; }
                    await loadPostsByIds(user.like, contentDiv, "このユーザーはまだいいねした投稿がありません。"); break;
                case 'stars':
                    if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒 このユーザーのStarは非公開です。</p>'; break; }
                    await loadPostsByIds(user.star, contentDiv, "このユーザーはまだお気に入りした投稿がありません。"); break;
                case 'follows':
                    if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒 このユーザーのフォローリストは非公開です。</p>'; break; }
                    if (!user.follow?.length) { contentDiv.innerHTML = '<p>誰もフォローしていません。</p>'; break; }
                    const { data: fUsers, error: fErr } = await supabase.from('user').select('id, name, me').in('id', user.follow);
                    if(fErr) throw fErr; contentDiv.innerHTML = '';
                    fUsers?.forEach(u => {
                        const userCard = document.createElement('div'); userCard.className = 'profile-card';
                        userCard.innerHTML = `<div class="profile-card-info"><a href="#profile/${u.id}"><span class="name">${escapeHTML(u.name)}</span><span class="id">#${u.id}</span><p class="me">${escapeHTML(u.me || '')}</p></a></div>`;
                        contentDiv.appendChild(userCard);
                    });
                    break;
            }
        } catch(err) { contentDiv.innerHTML = `<p class="error-message">コンテンツの読み込みに失敗しました。</p>`; }
    }
    async function showSettingsScreen() {
        if (!currentUser) return router();
        DOM.pageTitle.textContent = "設定";
        showScreen('settings-screen');
        document.getElementById('settings-screen').innerHTML = `
            <form id="settings-form">
                <label for="setting-username">ユーザー名:</label>
                <input type="text" id="setting-username" required value="${escapeHTML(currentUser.name)}">
                <label for="setting-me">自己紹介:</label>
                <textarea id="setting-me">${escapeHTML(currentUser.me || '')}</textarea>
                <fieldset>
                    <legend>公開設定</legend>
                    <input type="checkbox" id="setting-show-like" ${currentUser.settings.show_like ? 'checked' : ''}><label for="setting-show-like">いいねした投稿を公開する</label><br>
                    <input type="checkbox" id="setting-show-follow" ${currentUser.settings.show_follow ? 'checked' : ''}><label for="setting-show-follow">フォローしている人を公開する</label><br>
                    <input type="checkbox" id="setting-show-star" ${currentUser.settings.show_star ? 'checked' : ''}><label for="setting-show-star">お気に入りを付けたポストを公開する</label><br>
                    <input type="checkbox" id="setting-show-scid" ${currentUser.settings.show_scid ? 'checked' : ''}><label for="setting-show-scid">ScratchアカウントIDを公開する</label>
                </fieldset>
                <button type="submit">設定を保存</button>
            </form>`;
        document.getElementById('settings-form').addEventListener('submit', handleUpdateSettings);
    }
    async function handlePostSubmit() {
        if (!currentUser) return alert("ログインが必要です。");
        const contentEl = document.getElementById('post-content'), content = contentEl.value.trim();
        if (!content) return alert('内容を入力してください。');
        const button = document.getElementById('post-submit-button');
        button.disabled = true; button.textContent = '投稿中...';
        try {
            const { data, error } = await supabase.from('post').insert({ userid: currentUser.id, content }).select().single();
            if(error) throw error;
            const updatedPosts = [...(currentUser.post || []), data.id];
            await supabase.from('user').update({ post: updatedPosts }).eq('id', currentUser.id);
            currentUser.post = updatedPosts;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            contentEl.value = '';
            if(currentTimelineTab === 'foryou') renderPost(data, currentUser, DOM.timeline); // タイムラインに即時反映
        } catch(e) { alert('投稿に失敗しました。'); }
        finally { button.disabled = false; button.textContent = 'ポスト'; }
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
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            button.textContent = !isFollowing ? 'フォロー解除' : 'フォロー';
            const followerCountSpan = document.querySelector('#follower-count strong');
            if (followerCountSpan) {
                let currentCount = parseInt(followerCountSpan.textContent);
                followerCountSpan.textContent = isFollowing ? currentCount - 1 : currentCount + 1;
            }
        }
        button.disabled = false;
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
        if (!updatedData.name) return alert('ユーザー名は必須です。');
        const { data, error } = await supabase.from('user').update(updatedData).eq('id', currentUser.id).select().single();
        if (error) { alert('設定の更新に失敗しました。'); }
        else {
            alert('設定を更新しました。');
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.hash = '';
        }
    }
    function subscribeToChanges() {
        if (realtimeChannel) return;
        realtimeChannel = supabase.channel('public:post').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post' }, async payload => {
            if (!document.getElementById('main-screen').classList.contains('hidden') && currentTimelineTab === 'foryou') {
                const { data: author } = await supabase.from('user').select('id, name').eq('id', payload.new.userid).single();
                if (author) renderPost(payload.new, author, DOM.timeline);
            }
        }).subscribe();
    }
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- 初期化処理 ---
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.addEventListener('click', () => switchTimelineTab(btn.dataset.tab)));
    document.getElementById('banner-signup-button').addEventListener('click', goToLoginPage);
    document.getElementById('banner-login-button').addEventListener('click', goToLoginPage);
    window.addEventListener('hashchange', router);
    checkSession();
});