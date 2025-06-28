// js/event-handlers.js

import { DOM, currentUser } from './main.js';
// ▼▼▼ ui.jsからのインポートを追加 ▼▼▼
import { showLoading, closePostModal, renderPost, renderTimeline } from './ui.js';
import { updateUser, createPost, deletePost, togglePostLike } from './api.js';

export async function handlePostSubmit(isModal = false) {
    if (!currentUser) return alert("ログインが必要です。");
    const contentElId = isModal ? 'post-content-modal' : 'post-content';
    const buttonId = isModal ? 'post-submit-button-modal' : 'post-submit-button';
    const contentEl = document.getElementById(contentElId);
    const content = contentEl.value.trim();
    if (!content) return alert('内容を入力してください。');
    const button = document.getElementById(buttonId);
    button.disabled = true; button.textContent = '投稿中...';
    try {
        const postData = { userid: currentUser.id, content, reply_id: window.replyingTo?.id || null };
        const { data, error } = await createPost(postData);
        if(error) throw error;
        currentUser.post = [...(currentUser.post || []), data.id];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        if (isModal) closePostModal(); else contentEl.value = '';
        clearReply();
        if (!document.getElementById('main-screen').classList.contains('hidden')) {
            const postExists = DOM.timeline.querySelector('.post');
            if (postExists) renderPost(data, data.user, DOM.timeline, true); 
            else await renderTimeline(window.currentTimelineTab, DOM.timeline);
        }
    } catch(e) { console.error(e); alert('ポストに失敗しました。'); }
    finally { button.disabled = false; button.textContent = 'ポスト'; }
}

export function handleReplyClick(postId, username) {
    if (!currentUser) return alert("ログインが必要です。");
    openPostModal({ id: postId, name: username });
}
export function clearReply() {
    window.replyingTo = null;
    document.getElementById('reply-info-modal')?.classList.add('hidden');
    document.getElementById('reply-info')?.classList.add('hidden');
}

export function togglePostMenu(postId) { document.getElementById(`menu-${postId}`).classList.toggle('hidden'); }
export async function handleDeletePost(postId) {
    if (!confirm('このポストを削除しますか？')) return;
    showLoading(true);
    try {
        const { error } = await deletePost(postId);
        if (error) throw error;
        window.location.hash = '#';
    } catch(e) { alert('削除に失敗しました。'); }
    finally { showLoading(false); }
}

export async function handleLike(button, postId) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
    const iconSpan = button.querySelector('.icon'), countSpan = button.querySelector('span:last-child');
    const isLiked = currentUser.like?.includes(postId);
    const updatedLikes = isLiked ? currentUser.like.filter(id => id !== postId) : [...(currentUser.like || []), postId];
    const incrementValue = isLiked ? -1 : 1;
    const { error: userError } = await updateUser(currentUser.id, { like: updatedLikes });
    if (userError) { alert('いいねの更新に失敗しました。'); button.disabled = false; return; }
    
    const { error: postError } = await togglePostLike(postId, incrementValue);
    if (postError) {
        await updateUser(currentUser.id, { like: currentUser.like }); // Rollback
        alert('いいね数の更新に失敗しました。');
    } else {
        currentUser.like = updatedLikes;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        countSpan.textContent = parseInt(countSpan.textContent) + incrementValue;
        button.classList.toggle('liked', !isLiked);
        iconSpan.textContent = isLiked ? '♡' : '♥';
    }
    button.disabled = false;
}
export async function handleStar(button, postId) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
    const iconSpan = button.querySelector('.icon');
    const isStarred = currentUser.star?.includes(postId);
    const updatedStars = isStarred ? currentUser.star.filter(id => id !== postId) : [...(currentUser.star || []), postId];
    const { error } = await updateUser(currentUser.id, { star: updatedStars });
    if (error) { alert('お気に入りの更新に失敗しました。'); } else {
        currentUser.star = updatedStars; localStorage.setItem('currentUser', JSON.stringify(currentUser));
        button.classList.toggle('starred', !isStarred); iconSpan.textContent = isStarred ? '☆' : '★';
    }
    button.disabled = false;
}
export async function handleRecFollow(userId, button) {
    if (!currentUser) return alert("ログインが必要です。");
    button.textContent = '...'; button.disabled = true;
    await handleFollowToggle(userId, button, true);
}
export async function handleFollowToggle(targetUserId, button, isRecButton = false) {
    if (!currentUser) return alert("ログインが必要です。");
    button.disabled = true;
    const isFollowing = currentUser.follow?.includes(targetUserId);
    const updatedFollows = isFollowing ? currentUser.follow.filter(id => id !== targetUserId) : [...(currentUser.follow || []), targetUserId];
    const { error } = await updateUser(currentUser.id, { follow: updatedFollows });
    if (error) { alert('フォロー状態の更新に失敗しました。');
    } else {
        currentUser.follow = updatedFollows; localStorage.setItem('currentUser', JSON.stringify(currentUser));
        if (isRecButton) { button.textContent = isFollowing ? 'フォロー' : 'フォロー中'; button.style.backgroundColor = isFollowing ? 'black' : 'green'; }
        else { button.textContent = !isFollowing ? 'フォロー解除' : 'フォロー'; }
        const followerCountSpan = document.querySelector('#follower-count strong');
        if (followerCountSpan) followerCountSpan.textContent = parseInt(followerCountSpan.textContent) + (isFollowing ? -1 : 1);
    }
    if(!isRecButton) button.disabled = false;
    else if (isFollowing) button.disabled = false;
}
export async function handleUpdateSettings(event) {
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
    const { data, error } = await updateUser(currentUser.id, updatedData);
    if (error) { alert('設定の更新に失敗しました。'); }
    else {
        alert('設定を更新しました。');
        window.currentUser = data; localStorage.setItem('currentUser', JSON.stringify(data));
        window.location.hash = '';
    }
}
export const handleCtrlEnter = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.target.closest('.post-form').querySelector('button').click();
    }
};