'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa';

export default function PWAInitializer() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}