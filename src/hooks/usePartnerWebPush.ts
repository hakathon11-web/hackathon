import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const urlBase64ToUint8Array = (base64String: string) => {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

export const usePartnerWebPush = () => {
	const { user } = useAuth();
	const initRef = useRef(false);

	useEffect(() => {
		if (!user?.id || initRef.current) return;
		initRef.current = true;

		const setup = async () => {
			try {
				if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
					return;
				}

				// Register service worker if not registered
				const reg = await navigator.serviceWorker.register('/sw.js');
				await navigator.serviceWorker.ready;

				// Ask permission
				const permission = await Notification.requestPermission();
				if (permission !== 'granted') return;

				// Fetch VAPID public key
				const resp = await fetch('/functions/v1/get-supabase-config');
				const cfg = await resp.json();
				if (!cfg.vapidPublicKey) return;

				// Subscribe
				const existing = await reg.pushManager.getSubscription();
				let subscription = existing;
				if (!subscription) {
					subscription = await reg.pushManager.subscribe({
						userVisibleOnly: true,
						applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
					});
				}

				// Send to backend
				const token = (await supabase.auth.getSession()).data.session?.access_token;
				if (!token) return;
				await fetch('/functions/v1/save-webpush-subscription', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`,
					},
					body: JSON.stringify({ subscription }),
				});
			} catch (e) {
				// Silently ignore
			}
		};

		setup();
	}, [user?.id]);
};


