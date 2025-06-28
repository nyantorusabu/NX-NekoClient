// js/ui.js

// ▼▼▼ auth.jsからのインポートを追加し、main.jsからの不要なインポートを削除 ▼▼▼
import { ICONS, DOM, currentUser, escapeHTML, router } from './main.js';
import { handleLogout, goToLoginPage } from './auth.js';
import { handleRecFollow } from './event-handlers.js';
import { fetchTimeline } from './api.js';

// (これ以降のコードは前回のままで変更ありません)

export function showLoading(show) { DOM.loadingOverlay.classList.toggle('hidden', !show); }
export function showScreen(screenId) {
    DOM.screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId)?.classList.remove('hidden');
}

export function updateNavAndSidebars() {
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
            <img src="https://trampoline.turbowarp.org/avatars/by-username/${currentUser.name}" class="user-icon">
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
    const { data, error } = await getRecommendedUsers(3);
    if (error || !data?.length) { DOM.rightSidebar.recommendations.innerHTML = ''; return; }
    let recHTML = '<div class="widget-title">おすすめユーザー</div>';
    recHTML += data.map(user => `
        <div class="widget-item recommend-user">
            <a href="#profile/${user.id}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:0.5rem;">
                <img src="https://trampoline.turbowarp.org/avatars/by-username/${user.name}" style="width:40px;height:40px;border-radius:50%;">
                <div><span>${escapeHTML(user.name)}</span><small style="color:var(--secondary-text-color); display:block;">#${user.id}</small></div>
            </a>
            ${currentUser && currentUser.id !== user.id ? `<button data-user-id="${user.id}">フォロー</button>` : ''}
        </div>`).join('');
    DOM.rightSidebar.recommendations.innerHTML = `<div class="sidebar-widget">${recHTML}</div>`;
    DOM.rightSidebar.recommendations.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => handleRecFollow(parseInt(e.target.dataset.userId), e.target)));
}

export function openPostModal(replyInfo = null) {
    if (!currentUser) return goToLoginPage();
    DOM.postModal.classList.remove('hidden');
    const modalContainer = DOM.postModal.querySelector('.post-form-container-modal');
    modalContainer.innerHTML = `
        <div class="post-form">
            <img src="https://trampoline.turbowarp.org/avatars/by-username/${currentUser.name}" class="user-icon">
            <div class="form-content">
                <div id="reply-info-modal" class="hidden" style="margin-bottom: 0.5rem; color: var(--secondary-text-color);"></div>
                <textarea id="post-content-modal" placeholder="いまどうしてる？" maxlength="280"></textarea>
                <div class="post-form-actions"><button id="post-submit-button-modal">ポスト</button></div>
            </div>
        </div>`;
    const textarea = document.getElementById('post-content-modal');
    if (replyInfo) {
        window.replyingTo = replyInfo;
        const replyInfoDiv = document.getElementById('reply-info-modal');
        replyInfoDiv.innerHTML = `<span>@${replyInfo.name}に返信中</span>`;
        replyInfoDiv.classList.remove('hidden');
    }
    modalContainer.querySelector('#post-submit-button-modal').addEventListener('click', () => handlePostSubmit(true));
    DOM.postModal.querySelector('.modal-close-btn').onclick = closePostModal;
    textarea.focus();
    textarea.addEventListener('keydown', handleCtrlEnter);
}

export function closePostModal() {
    DOM.postModal.classList.add('hidden');
    window.replyingTo = null;
    const textarea = document.getElementById('post-content-modal');
    if (textarea) textarea.removeEventListener('keydown', handleCtrlEnter);
}

export async function renderTimeline(tab, container) {
    showLoading(true); container.innerHTML = '';
    try {
        const { data: posts, error } = await fetchTimeline(tab, currentUser?.follow);
        if (error) throw new Error('ポストの読み込みに失敗しました。');
        if (!posts?.length) {
            container.innerHTML = `<p style="padding: 2rem; text-align: center;">${tab === 'following' ? 'まだ誰もフォローしていません。' : 'すべてのポストを読んだようです！'}</p>`; return;
        }
        posts.forEach(post => renderPost(post, post.user || {}, container, false));
    } catch(err) { container.innerHTML = `<p class="error-message">${err.message}</p>`; }
    finally { showLoading(false); }
}

export function renderPost(post, author, container, prepend = false) {
    const postEl = document.createElement('div'); postEl.className = 'post';
    postEl.dataset.postId = post.id;
    postEl.onclick = (e) => { if (!e.target.closest('button, a')) window.location.hash = `#post/${post.id}`; };
    
    const isLiked = currentUser?.like?.includes(post.id);
    const isStarred = currentUser?.star?.includes(post.id);
    
    let replyHTML = post.reply_to?.user ? `<div class="replying-to"><a href="#profile/${post.reply_to.user.id}">@${post.reply_to.user.name}</a> さんに返信</div>` : '';
    const menuHTML = currentUser?.id === post.userid ? `<button class="post-menu-btn" data-post-id="${post.id}">…</button><div id="menu-${post.id}" class="post-menu hidden"><button class="delete-btn" data-post-id="${post.id}">削除</button></div>` : '';
    
    const actionsHTML = currentUser ? `
        <div class="post-actions">
            <button class="reply-button" title="返信" data-post-id="${post.id}" data-username="${escapeHTML(author.name)}">🗨 <span>${post.reply_count || 0}</span></button>
            <button class="like-button ${isLiked ? 'liked' : ''}" data-post-id="${post.id}"><span class="icon">${isLiked ? '♥' : '♡'}</span> <span>${post.like}</span></button>
            <button class="star-button ${isStarred ? 'starred' : ''}" data-post-id="${post.id}"><span class="icon">${isStarred ? '★' : '☆'}</span> <span>${post.star}</span></button>
        </div>` : '';
    
    postEl.innerHTML = `
        <img src="https://trampoline.turbowarp.org/avatars/by-username/${author.name}" class="user-icon">
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