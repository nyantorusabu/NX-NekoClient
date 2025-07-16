const VAPID_PUBLIC_KEY = 'BBtpT5drPSx6JU70xfWoftHno5EwoNVCtiFoPYf9PNgig2CLWQ8-ePZtzGAG46m_Y9OEXaV71Dw2CEwX7abaUEk';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function initializePushNotifications(supabase, user) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications are not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);

        // ログインしている場合のみ購読処理に進む
        if (!user) return;
        
        // 既に購読済みかチェック
        let subscription = await registration.pushManager.getSubscription();

        if (subscription === null) {
            console.log('Not subscribed, requesting permission...');
            const permission = await window.Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Permission not granted.');
                return;
            }

            console.log('Subscribing...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('New subscription:', subscription);

            // 新しい購読情報をDBに保存
            await supabase.rpc('save_push_subscription', { p_subscription_data: subscription.toJSON() });
            console.log('Subscription saved to DB.');
        } else {
            console.log('Already subscribed:', subscription);
        }

    } catch (error) {
        console.error('Service Worker registration or subscription failed:', error);
    }
}
