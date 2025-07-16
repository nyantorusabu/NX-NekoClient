// プッシュ通知を受け取ったときの処理
self.addEventListener('push', function(event) {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: 'favicon.png', // 通知に表示されるアイコン
        badge: 'favicon.png',  // モバイルの通知領域で使われるアイコン
        data: {
            url: data.url // 通知クリック時の遷移先URL
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 通知がクリックされたときの処理
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // 通知を閉じる

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // 既にアプリケーションが開かれている場合は、そのタブにフォーカスする
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            // 開かれていない場合は、新しいタブで開く
            return clients.openWindow(event.notification.data.url || '/');
        })
    );
});
