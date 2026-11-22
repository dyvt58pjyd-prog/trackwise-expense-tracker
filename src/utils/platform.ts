/**
 * Unified cross-platform adapter:
 * Detects Web, PWA, Electron (macOS/Windows), or Capacitor (Android/iOS)
 * and abstracts file download, camera access, and printing.
 */

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      showSaveDialog: (options: any) => Promise<any>;
      neonTest?: (connStr?: string) => Promise<{ success: boolean; connected?: boolean; engine?: string; error?: string; database?: string }>;
      neonSync?: (payload: any) => Promise<any>;
    };
    Capacitor?: any;
  }
}

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
};

export const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
};

export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const getPlatformName = (): 'Electron' | 'Capacitor' | 'PWA' | 'Web' => {
  if (isElectron()) return 'Electron';
  if (isCapacitor()) return 'Capacitor';
  if (isPWA()) return 'PWA';
  return 'Web';
};

/**
 * Downloads or saves a file across Web, PWA, Electron and Mobile
 */
export async function downloadFile(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Native Print or Browser print
 */
export function triggerPrint(): void {
  window.print();
}

/**
 * Share API with fallback
 */
export async function shareContent(data: { title: string; text?: string; url?: string }): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
