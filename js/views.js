// js/views.js
import { DOM, currentUser, escapeHTML } from './main.js';
import { showScreen, showLoading, renderPost, renderTimeline } from './ui.js';
import { fetchUser, fetchFollowerCount, fetchPostsByIds, fetchUsers, updateUser } from './api.js';
import { handleFollowToggle } from './event-handlers.js';

let currentTimelineTab = 'foryou';

export async function showMainScreen() {
    DOM.pageTitle.textContent = "ホーム"; showScreen('main-screen');
    if (currentUser) {
        DOM.postFormContainer.innerHTML = `
            <div class="post-form">
                <img src="https://trampoline.turbowarp.org/avatars/by-username/${currentUser.name}" class="user-icon">
                <div class="form-content">
                    <div id="reply-info" class="hidden" style="margin-bottom: 0.5rem;"></div>
                    <textarea id="post-content" placeholder="いまどうしてる？" maxlength="280"></textarea>
                    <div class="post-form-actions"><button id="post-submit-button">ポスト</button></div>
                </div>
            </div>`;
    } else { DOM.postFormContainer.innerHTML = ''; }
    document.querySelector('.timeline-tabs [data-tab="following"]').style.display = currentUser ? 'flex' : 'none';
    await switchTimelineTab(currentUser ? currentTimelineTab : 'foryou');
}

export async function showExploreScreen() {
    DOM.pageTitle.textContent = "発見"; showScreen('explore-screen');
    await renderTimeline('foryou', DOM.exploreContent);
}

export async function showNotificationsScreen() {
    DOM.pageTitle.textContent = "通知"; showScreen('notifications-screen');
    const contentDiv = DOM.notificationsContent; contentDiv.innerHTML = '';
    if (currentUser.notice?.length) {
        currentUser.notice.forEach(n => {
            const noticeEl = document.createElement('div');
            noticeEl.className = 'widget-item'; noticeEl.textContent = n;
            contentDiv.appendChild(noticeEl);
        });
    } else { contentDiv.innerHTML = `<p style="padding: 2rem;">通知はまだありません。</p>`; }
}

export async function showLikesScreen() {
    DOM.pageTitle.textContent = "いいね"; showScreen('likes-screen');
    await loadAndRenderPostsByIds(currentUser.like, DOM.likesContent, "いいねしたポストはまだありません。");
}

export async function showStarsScreen() {
    DOM.pageTitle.textContent = "お気に入り"; showScreen('stars-screen');
    await loadAndRenderPostsByIds(currentUser.star, DOM.starsContent, "お気に入りに登録したポストはまだありません。");
}

export async function showPostDetail(postId) {
    DOM.pageTitle.textContent = "ポスト"; showScreen('post-detail-screen');
    const contentDiv = DOM.postDetailContent; contentDiv.innerHTML = '<div class="spinner"></div>';
    try {
        const { data: post, error } = await fetchPostDetail(postId);
        if (error || !post) throw new Error('ポストが見つかりません。');
        contentDiv.innerHTML = ''; renderPost(post, post.user, contentDiv);
    } catch (err) { contentDiv.innerHTML = `<p class="error-message">${err.message}</p>`; }
}

export async function showProfileScreen(userId) {
    DOM.pageTitle.textContent = "プロフィール"; showScreen('profile-screen');
    const profileHeader = document.getElementById('profile-header'), profileTabs = document.getElementById('profile-tabs');
    profileHeader.innerHTML = '<div class="spinner"></div>'; profileTabs.innerHTML = '';
    
    const { data: user, error: userError } = await fetchUser(userId);
    if (userError || !user) { profileHeader.innerHTML = '<h2>ユーザーが見つかりません</h2>'; return; }
    
    const { count: followerCount } = await fetchFollowerCount(userId);
    
    profileHeader.innerHTML = `
        <div id="follow-button-container" class="follow-button"></div><h2>${escapeHTML(user.name)}</h2>
        <div class="user-id">#${user.id}</div><p class="user-me">${escapeHTML(user.me || '')}</p>
        <div class="user-stats"><span><strong>${user.follow?.length || 0}</strong> フォロー</span><span id="follower-count"><strong>${followerCount || 0}</strong> フォロワー</span></div>`;
    
    if (currentUser && userId !== currentUser.id) {
        const followButton = document.createElement('button');
        const isFollowing = currentUser.follow?.includes(userId);
        followButton.textContent = isFollowing ? 'フォロー解除' : 'フォロー';
        followButton.onclick = () => handleFollowToggle(userId, followButton);
        profileHeader.querySelector('#follow-button-container').appendChild(followButton);
    }
    
    profileTabs.innerHTML = `<button class="tab-button active" data-tab="posts">ポスト</button><button class="tab-button" data-tab="likes">いいね</button><button class="tab-button" data-tab="stars">お気に入り</button><button class="tab-button" data-tab="follows">フォロー</button>`;
    profileTabs.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => loadProfileTabContent(user, button.dataset.tab)));
    await loadProfileTabContent(user, 'posts');
}

async function showSettingsScreen() {
    if (!currentUser) return router();
    DOM.pageTitle.textContent = "設定"; showScreen('settings-screen');
    document.getElementById('settings-screen').innerHTML = `
        <form id="settings-form">
            <label for="setting-username">ユーザー名:</label>
            <input type="text" id="setting-username" required value="${escapeHTML(currentUser.name)}">
            <label for="setting-me">自己紹介:</label>
            <textarea id="setting-me">${escapeHTML(currentUser.me || '')}</textarea>
            <fieldset><legend>公開設定</legend>
                <input type="checkbox" id="setting-show-like" ${currentUser.settings.show_like ? 'checked' : ''}><label for="setting-show-like">いいねしたポストを公開する</label><br>
                <input type="checkbox" id="setting-show-follow" ${currentUser.settings.show_follow ? 'checked' : ''}><label for="setting-show-follow">フォローリストを公開する</label><br>
                <input type="checkbox" id="setting-show-star" ${currentUser.settings.show_star ? 'checked' : ''}><label for="setting-show-star">お気に入りを公開する</label><br>
                <input type="checkbox" id="setting-show-scid" ${currentUser.settings.show_scid ? 'checked' : ''}><label for="setting-show-scid">ScratchアカウントIDを公開する</label>
            </fieldset>
            <button type="submit">設定を保存</button>
        </form>`;
}

async function loadProfileTabContent(user, tab) {
    document.querySelectorAll('#profile-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    const contentDiv = document.getElementById('profile-content');
    showLoading(true);
    try {
        switch(tab) {
            case 'posts': await loadAndRenderPostsByIds(user.post, contentDiv, "このユーザーはまだポストしていません。"); break;
            case 'likes':
                if (!user.settings.show_like && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒 このユーザーのいいねは非公開です。</p>'; break; }
                await loadAndRenderPostsByIds(user.like, contentDiv, "このユーザーはまだいいねしたポストがありません。"); break;
            case 'stars':
                if (!user.settings.show_star && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒 このユーザーのお気に入りは非公開です。</p>'; break; }
                await loadAndRenderPostsByIds(user.star, contentDiv, "このユーザーはまだお気に入りしたポストがありません。"); break;
            case 'follows':
                if (!user.settings.show_follow && (!currentUser || user.id !== currentUser.id)) { contentDiv.innerHTML = '<p>🔒 このユーザーのフォローリストは非公開です。</p>'; break; }
                if (!user.follow?.length) { contentDiv.innerHTML = '<p>誰もフォローしていません。</p>'; break; }
                const { data: fUsers, error: fErr } = await fetchUsers(user.follow);
                if(fErr) throw fErr; contentDiv.innerHTML = '';
                fUsers?.forEach(u => {
                    const userCard = document.createElement('div'); userCard.className = 'profile-card';
                    userCard.innerHTML = `<div class="profile-card-info"><a href="#profile/${u.id}"><span class="name">${escapeHTML(u.name)}</span><span class="id">#${u.id}</span><p class="me">${escapeHTML(u.me || '')}</p></a></div>`;
                    contentDiv.appendChild(userCard);
                });
                break;
        }
    } catch(err) { contentDiv.innerHTML = `<p class="error-message">コンテンツの読み込みに失敗しました。</p>`; }
    finally { showLoading(false); }
}

async function loadAndRenderPostsByIds(ids, container, emptyMessage) {
    container.innerHTML = '<div class="spinner"></div>';
    try {
        if (!ids || ids.length === 0) { container.innerHTML = `<p style="padding: 2rem;">${emptyMessage}</p>`; return; }
        const { data, error } = await fetchPostsByIds(ids);
        if (error) throw error;
        container.innerHTML = '';
        data.forEach(p => renderPost(p, p.user, container));
    } catch (err) { container.innerHTML = `<p class="error-message">ポストの読み込みに失敗しました。</p>`; }
}

async function switchTimelineTab(tab) {
    if (tab === 'following' && !currentUser) return;
    currentTimelineTab = tab;
    document.querySelectorAll('.timeline-tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    await renderTimeline(tab, DOM.timeline);
}