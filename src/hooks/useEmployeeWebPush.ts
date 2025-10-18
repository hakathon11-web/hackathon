import { useEffect, useRef } from 'react';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';

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

export const useEmployeeWebPush = () => {
  const { employee } = useEmployeeAuth();
  const initRef = useRef(false);

  useEffect(() => {
    if (!employee?.id || initRef.current) return;
    initRef.current = true;

    const setup = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          return;
        }

        // Register service worker
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

        // Send to backend (employee flow uses employeeId instead of JWT)
        await fetch('/functions/v1/save-employee-webpush-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: employee.id, subscription }),
        });
      } catch (e) {
        // Silently ignore
      }
    };

    setup();
  }, [employee?.id]);
};


