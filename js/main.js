// js/main.js

// --- グローバル変数をエクスポート ---
// 他のファイルから import { currentUser } from './main.js' のように使えるようにする
export let currentUser = null;
export let currentTimelineTab = 'foryou';
export let replyingTo = null;

// --- 他のJSファイルをインポート ---
import { checkSession, handleLogout, goToLoginPage, subscribeToChanges, unsubscribeChanges } from './auth.js';
import { updateNavAndSidebars, openPostModal, closePostModal } from './ui.js';
import { handleLike, handleStar, handleReplyClick, clearReply, togglePostMenu, handleDeletePost, handleRecFollow, handleUpdateSettings, handlePostSubmit, handleCtrlEnter } from './event-handlers.js';
import { showProfileScreen, showExploreScreen, showNotificationsScreen, showLikesScreen, showStarsScreen, showSettingsScreen, showMainScreen, showPostDetail, switchTimelineTab } from './views.js';

// --- グローバル変数のセッター関数 ---
// 他のファイルから currentUser を変更できるようにする
export function setCurrentUser(user) { currentUser = user; }
export function setCurrentTimelineTab(tab) { currentTimelineTab = tab; }
export function setReplyingTo(replyInfo) { replyingTo = replyInfo; }

// --- グローバル定数とヘルパー関数をエクスポート ---
// アプリケーション全体で共有するアイコンや便利機能
export const ICONS = {
    home: `<svg viewBox="0 0 24 24"><g><path d="M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.878 4.12 22 5.5 22h13c1.38 0 2.5-1.122 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z"></path></g></svg>`,
    explore: `<svg viewBox="0 0 24 24"><g><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.418-.726 4.596-1.904 1.178-1.178 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.83-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.432 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path></g></svg>`,
    notifications: `<svg viewBox="0 0 24 24"><g><path d="M21.697 16.468c-.02-.016-2.14-1.64-2.14-6.335 0-4.506-3.655-8.13-8.13-8.13S3.297 5.627 3.297 10.133c0 4.696-2.12 6.32-2.14 6.335-.14.108-.22.28-.22.463v1.5c0 .552.447 1 1 1h4.07c.54 2.6 2.87 4.5 5.59 4.5s5.05-1.9 5.59-4.5h4.07c.553 0 1-.448 1-1v-1.5c0-.183-.08-.355-.22-.463z"></path></g></svg>`,
    likes: `<svg viewBox="0 0 24 24" fill="currentColor"><g><path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z"></path></g></svg>`,
    stars: `<svg viewBox="0 0 24 24"><g><path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2.25l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873L12 17.75z"></path></g></svg>`,
    profile: `<svg viewBox="0 0 24 24"><g><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></g></svg>`,
    settings: `<svg viewBox="0 0 24 24"><g><path d="M19.88 18.23c.36.02.65.32.65.68v1.1c0 .37-.29.67-.66.68H4.13c-.37-.01-.66-.31-.66-.68v-1.1c0-.36.29-.66.65-.68h.01c.36-.02.65-.32.65-.68s-.29-.66-.65-.68h-.01c-.36-.02-.65-.32-.65-.68v-1.1c0-.37.29-.67.66-.68h.01c.37.01.66.31.66.68s-.29.67-.66-.68h-.01c-.37.01-.66-.31-.66-.68v-1.1c0-.37.29-.67.66-.68h15.75c.37.01.66.31.66.68v1.1c0 .37-.29.67-.66-.68h-.01c-.37-.01-.66-.31-.66-.68s.29-.67.66-.68h.01zm-3.26-9.28L12 3.63 7.38 8.95c-.38.41-.35 1.05.06 1.42.4.37 1.04.34 1.41-.06L11 8.43V15c0 .55.45 1 1 1s1-.45 1-1V8.43l2.15 1.88c.37.33.92.31 1.28-.05.37-.36.39-.96.05-1.33z"></path></g></svg>`,
};
export const DOM = {
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
export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- グローバルスコープに関数を公開 ---
window.handleLike = handleLike;
window.handleStar = handleStar;
window.handleReplyClick = handleReplyClick;
window.clearReply = clearReply;
window.togglePostMenu = togglePostMenu;
window.deletePost = handleDeletePost;
window.handleRecFollow = handleRecFollow;

// --- ルーター ---
export async function router() {
    updateNavAndSidebars();
    const hash = window.location.hash || '#';
    DOM.loadingOverlay.classList.remove('hidden');
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
        DOM.loadingOverlay.classList.add('hidden');
    }
}

// --- 初期化処理 ---
function initialize() {
    // このファイルではリスナーはhashchangeのみ
    window.addEventListener('hashchange', router);
    // ログイン状態を確認してアプリを開始
    checkSession();
}

// アプリケーション起動
initialize();