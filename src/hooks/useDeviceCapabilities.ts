// src/hooks/useDeviceCapabilities.ts
//
// PURPOSE:
// Detect device capabilities relevant to the Scan to Layout tool.
// Used to show/hide scan-related UI and default to manual room creation
// when camera or LiDAR is unavailable.

'use client';

import { useEffect, useState } from 'react';

export type DeviceCapabilities = {
  /** Whether the browser supports camera access (MediaDevices API) */
  hasCamera: boolean;
  /** Whether this is likely a mobile device with potential LiDAR support */
  isMobileDevice: boolean;
  /** Whether this appears to be an Apple device that might have LiDAR */
  isAppleDevice: boolean;
  /** Whether detection has completed */
  ready: boolean;
};

export function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>({
    hasCamera: false,
    isMobileDevice: false,
    isAppleDevice: false,
    ready: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
    const hasCameraAPI = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

    setCaps({
      hasCamera: hasCameraAPI && isMobile,
      isMobileDevice: isMobile,
      isAppleDevice: isApple && isMobile,
      ready: true,
    });
  }, []);

  return caps;
}
