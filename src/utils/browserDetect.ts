export type HelpTabType = 'ios-safari' | 'android-chrome' | 'desktop-chrome' | 'desktop-safari' | 'other';

export interface EnvironmentInfo {
  os: 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'other';
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other';
  isMobile: boolean;
  recommendedTab: HelpTabType;
  label: string;
}

/**
 * Helper function to automatically detect the user's browser and OS
 * to pre-select the correct 'helpTab' in the installation modal for a better user experience.
 */
export function detectBrowserAndOS(): EnvironmentInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      os: 'other',
      browser: 'other',
      isMobile: false,
      recommendedTab: 'android-chrome',
      label: 'Android / Chrome',
    };
  }

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const platform = navigator.platform || '';

  // OS detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) && !isIOS;
  const isWindows = /Win32|Win64|Windows|WinCE/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  // Browser detection
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Android/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR|Samsung/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isSamsung = /SamsungBrowser/i.test(ua);

  const isMobile = isIOS || isAndroid || /Mobi|Tablet/i.test(ua);

  let os: EnvironmentInfo['os'] = 'other';
  if (isIOS) os = 'ios';
  else if (isAndroid) os = 'android';
  else if (isMacOS) os = 'macos';
  else if (isWindows) os = 'windows';
  else if (isLinux) os = 'linux';

  let browser: EnvironmentInfo['browser'] = 'other';
  if (isSafari) browser = 'safari';
  else if (isChrome) browser = 'chrome';
  else if (isFirefox) browser = 'firefox';
  else if (isEdge) browser = 'edge';
  else if (isSamsung) browser = 'samsung';

  let recommendedTab: HelpTabType = 'android-chrome';
  let label = 'Android / Chrome';

  if (isIOS) {
    recommendedTab = 'ios-safari';
    label = 'iOS Safari';
  } else if (isAndroid) {
    recommendedTab = 'android-chrome';
    label = 'Android Chrome';
  } else if (isMacOS && isSafari) {
    recommendedTab = 'desktop-safari';
    label = 'Mac Safari';
  } else if (isChrome || isEdge || isWindows || isLinux) {
    recommendedTab = 'desktop-chrome';
    label = isEdge ? 'Desktop Edge' : 'Desktop Chrome';
  } else if (isSafari) {
    recommendedTab = 'desktop-safari';
    label = 'Safari';
  } else {
    recommendedTab = 'other';
    label = 'Browser';
  }

  return {
    os,
    browser,
    isMobile,
    recommendedTab,
    label,
  };
}
