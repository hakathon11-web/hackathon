self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

// Handle push events
self.addEventListener('push', (event) => {
	let data = {};
	try {
		if (event.data) {
			data = event.data.json();
		}
	} catch (e) {
		// Fallback to text
		data = { title: 'New Notification', body: event.data && event.data.text ? event.data.text() : 'You have a new message.' };
	}

	const title = data.title || 'New Booking Request';
	const options = {
		body: data.body || 'You received a new booking request.',
		icon: data.icon || '/favicon_logoai/android-chrome-192x192.png',
		badge: data.badge || '/favicon_logoai/favicon-32x32.png',
		data: data.data || {},
		requireInteraction: true,
		silent: false,
		vibrate: [200, 100, 200],
		tag: data.tag || 'booking-request',
		renotify: true,
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

// Focus or open the app on click
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if ('focus' in client) {
					client.focus();
					if ('navigate' in client) {
						client.navigate(url);
					}
					return;
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow(url);
			}
		})
	);
});


