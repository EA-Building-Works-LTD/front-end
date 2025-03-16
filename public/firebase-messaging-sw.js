// Firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase will inject the configuration via firebase-messaging-sw.js?messagingSenderId=123456789
// This is handled automatically when you initialize messaging in your app
firebase.initializeApp({
  // The messagingSenderId should be automatically injected
  // If not, you can hardcode your config here as a fallback
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  // console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 