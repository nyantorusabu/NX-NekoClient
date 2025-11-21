(function () {
    const PROXY_INFO_BASE = 'https://nyaxproxy.nnya13586.workers.dev/info/';

    // URL抽出用（http/https） - シンプルな正規表現
    const urlRegex = /(https?:\/\/[^\s<>"'()`]+)/ig;

    // 監視するコンテナのセレクタ。タイムラインや投稿詳細など。必要に応じて追加してください。
    const WATCH_CONTAINERS = ['#timeline', '#post-detail-content', '#search-results-content', '#profile-content', '#explore-content'];

    function extractFirstUrl(text) {
        if (!text) return null;
        const m = text.match(urlRegex);
        return m ? m[0] : null;
    }

    async function fetchUrlInfo(url) {
        try {
            const infoUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(PROXY_INFO_BASE + url);
            const resp = await fetch(infoUrl, { method: 'GET', cache: 'force-cache' });
            if (!resp.ok) return null;
            const json = await resp.json();
            // 期待する構造: { url, title, description, icon: { url, proxy } }
            return json;
        } catch (e) {
            console.warn('fetchUrlInfo failed', e);
            return null;
        }
    }

    function createPreviewElement(info, originalUrl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'link-preview attachment-item';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '0.6rem';
        wrapper.style.alignItems = 'center';
        wrapper.style.padding = '0.6rem';
        wrapper.style.borderRadius = '8px';
        wrapper.style.border = '1px solid var(--border-color)';
        wrapper.style.background = '#fff';
        wrapper.style.maxWidth = '100%';
        wrapper.style.boxSizing = 'border-box';

        // icon
        const iconUrl = info.icon.proxy;
        if (iconUrl) {
            const img = document.createElement('img');
            img.src = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(iconUrl);
            img.alt = 'favicon';
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '6px';
            wrapper.appendChild(img);
        }

        const right = document.createElement('div');
        right.style.flex = '1 1 auto';
        right.style.minWidth = '0';

        const title = document.createElement('div');
        title.style.fontWeight = '700';
        title.style.fontSize = '0.95rem';
        title.style.color = 'var(--text-color)';
        title.style.overflow = 'hidden';
        title.style.whiteSpace = 'nowrap';
        title.style.textOverflow = 'ellipsis';
        title.textContent = (info && info.title) ? info.title : originalUrl;
        right.appendChild(title);

        if (info && info.description) {
            const desc = document.createElement('div');
            desc.style.fontSize = '0.92rem';
            desc.style.color = 'var(--secondary-text-color)';
            desc.style.overflow = 'hidden';
            desc.style.whiteSpace = 'nowrap';
            desc.style.textOverflow = 'ellipsis';
            desc.textContent = info.description;
            right.appendChild(desc);
        }

        const link = document.createElement('a');
        link.href = info && info.url ? info.url : originalUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'attachment-download-link';
        link.style.marginTop = '0.25rem';
        link.textContent = (new URL(link.href)).hostname;
        right.appendChild(link);

        wrapper.appendChild(right);

        return wrapper;
    }

    // 投稿エレメントから本文テキストを取得するヘルパー（DOM構造に依存）
    function getPostContentText(postEl) {
        // 既存の構造に合わせて .post-content を参照
        const contentEl = postEl.querySelector('.post-content, .notification-item-content, .user-me');
        if (!contentEl) return '';
        return contentEl.innerText || contentEl.textContent || '';
    }

    // 添付領域を取得または新規作成
    function ensureAttachmentsContainer(postEl) {
        let container = postEl.querySelector('.attachments-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'attachments-container';
            // 投稿の最後に追加
            const main = postEl.querySelector('.post-main') || postEl;
            main.appendChild(container);
        }
        return container;
    }

    // メイン処理: 投稿エレメントを受けて必要ならプレビューを追加
    async function processPostElement(postEl) {
        if (!postEl || postEl.dataset.urlPreviewAdded) return;
        // マーク済みとしておく（重複防止）
        postEl.dataset.urlPreviewAdded = 'pending';

        const text = getPostContentText(postEl);
        const url = extractFirstUrl(text);
        if (!url) {
            postEl.dataset.urlPreviewAdded = 'none';
            return;
        }

        // フェッチして情報取得
        const info = await fetchUrlInfo(url);
        if (!info) {
            postEl.dataset.urlPreviewAdded = 'failed';
            return;
        }

        // 添付領域に追加
        try {
            const container = ensureAttachmentsContainer(postEl);
            // すでに同一URLのプレビューがあるかチェック
            const existing = Array.from(container.querySelectorAll('.link-preview')).some(el => {
                const a = el.querySelector('a.attachment-download-link');
                return a && (a.href === info.url || a.href === url);
            });
            if (!existing) {
                const previewEl = createPreviewElement(info, url);
                container.insertBefore(previewEl, container.firstChild);
            }
            postEl.dataset.urlPreviewAdded = 'ok';
        } catch (e) {
            console.warn('append preview failed', e);
            postEl.dataset.urlPreviewAdded = 'failed';
        }
    }

    // 監視コールバック: DOM追加時に投稿要素を走査して処理
    function createObserverFor(container) {
        if (!container) return;
        const mo = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    // 投稿単位の要素は .post を想定
                    if (node.matches && node.matches('.post')) {
                        processPostElement(node);
                    } else {
                        // 子孫の投稿要素を探す
                        const posts = node.querySelectorAll ? node.querySelectorAll('.post') : [];
                        posts.forEach(p => processPostElement(p));
                    }
                }
            }
        });
        mo.observe(container, { childList: true, subtree: true });
        // 初回に既存の投稿も処理
        container.querySelectorAll('.post').forEach(p => processPostElement(p));
    }

    // 初期化
    function init() {
        // 監視対象を順に作成
        WATCH_CONTAINERS.forEach(sel => {
            const c = document.querySelector(sel);
            if (c) createObserverFor(c);
            else {
                // まだ存在しない場合はドキュメント全体を監視して後で作成されたら対応
                const docObserver = new MutationObserver(() => {
                    const el = document.querySelector(sel);
                    if (el) {
                        createObserverFor(el);
                        docObserver.disconnect();
                    }
                });
                docObserver.observe(document.documentElement, { childList: true, subtree: true });
            }
        });

        // timeline などを汎用監視（動的に新しいコンテナが来る場合対応）
        const globalObserver = new MutationObserver((mutations) => {
            for (const sel of WATCH_CONTAINERS) {
                const el = document.querySelector(sel);
                if (el && !el.dataset.linkPreviewObserverAttached) {
                    createObserverFor(el);
                    el.dataset.linkPreviewObserverAttached = '1';
                }
            }
        });
        globalObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();