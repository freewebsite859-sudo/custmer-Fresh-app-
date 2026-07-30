import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedUpi } from './AddUpiModal';

interface ScanUpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpiScanned: (upi: SavedUpi) => void;
  onUpiParsed?: (upiId: string) => void;
}

export const ScanUpiQrModal: React.FC<ScanUpiQrModalProps> = ({
  isOpen,
  onClose,
  onUpiScanned,
  onUpiParsed,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'denied' | 'scanned'>('requesting');
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<{ upiId: string; name: string } | null>(null);
  const [isPwaSupported, setIsPwaSupported] = useState(true);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);

  useEffect(() => {
    // Check if current platform environment supports standard PWA install prompts (e.g., standard iOS Browsers lack this)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      setIsPwaSupported(false);
    }
  }, []);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Start Camera Feed
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraState('requesting');
      setScannedResult(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraState('requesting');
    setErrorMessage('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser context.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('active');

      // Auto-detect QR after camera starts scanning
      simulateAutoScan();
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraState('denied');
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. You can upload a QR image or grant camera permissions.'
          : 'Unable to access camera device. Try selecting a QR image file.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities && capabilities.torch) {
          await (track as any).applyConstraints({
            advanced: [{ torch: !torchOn }],
          });
          setTorchOn(!torchOn);
        } else {
          // Visual fallback toggle for simulated flash lighting
          setTorchOn(!torchOn);
        }
      } catch (e) {
        setTorchOn(!torchOn);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const simulateAutoScan = () => {
    // Automatically detect a mock or scanned UPI QR code after 2.5s of camera active state
    const timer = setTimeout(() => {
      if (streamRef.current && cameraState !== 'scanned' && !showManualInstall) {
        const sampleUpis = [
          { upiId: 'amelia.stratton@okicici', name: 'Amelia Stratton' },
          { upiId: 'nexora.salon@paytm', name: 'Nexora Salon Payments' },
          { upiId: 'stratton.987@ybl', name: 'Amelia Stratton' },
        ];
        const randomUpi = sampleUpis[Math.floor(Math.random() * sampleUpis.length)];
        handleSuccessScan(randomUpi.upiId, randomUpi.name);
      }
    }, 2800);

    return () => clearTimeout(timer);
  };

  const handleSuccessScan = (upiId: string, name: string) => {
    // Trigger subtle haptic vibration feedback if supported by device browser
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([50, 30, 50]);
      } catch (e) {
        // Silently handle if navigator.vibrate is restricted in iframe/browser
      }
    }

    const cleanUpi = upiId.toLowerCase().trim();
    setCameraState('scanned');
    setScannedResult({ upiId: cleanUpi, name });
    stopCamera();

    // Automatically transition & pre-fill into AddUpiModal input field via global state callback
    if (onUpiParsed) {
      setTimeout(() => {
        onUpiParsed(cleanUpi);
      }, 600);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate reading QR code image
      setTimeout(() => {
        const upiFromImage = 'amelia.qr.' + Math.floor(Math.random() * 899 + 100) + '@okaxis';
        handleSuccessScan(upiFromImage, 'Amelia Stratton');
      }, 800);
    }
  };

  const handleConfirmAddUpi = () => {
    if (!scannedResult) return;

    if (onUpiParsed) {
      onUpiParsed(scannedResult.upiId.toLowerCase().trim());
      onClose();
      return;
    }

    const provider = scannedResult.upiId.split('@')[1] || 'upi';
    onUpiScanned({
      id: 'upi-' + Date.now(),
      upiId: scannedResult.upiId.toLowerCase().trim(),
      name: scannedResult.name,
      provider: provider,
      isVerified: true,
      isQrScanned: true,
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[260] bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Scanner Container */}
      <div className="relative w-full max-w-md bg-[#180f12] text-white sm:rounded-[28px] rounded-t-[28px] shadow-2xl border border-white/10 z-10 overflow-hidden flex flex-col h-full max-h-[90vh] manual-installation-modal">
        {/* Header Bar */}
        <div className="p-4 px-5 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#e6007e]/20 text-[#ffcbd9] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                {showManualInstall ? 'install_mobile' : 'qr_code_scanner'}
              </span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white leading-tight">
                {showManualInstall ? 'Manual Installation' : 'Scan UPI QR Code'}
              </h3>
              <p className="text-[11px] text-white/60">
                {showManualInstall ? 'Scan with your phone to install' : 'Align QR code inside scanner frame'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManualInstall(!showManualInstall)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                showManualInstall 
                ? 'bg-[#e6007e] text-white border-[#e6007e]' 
                : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
              }`}
            >
              {showManualInstall ? 'Scanner' : 'Manual'}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Copy Application Link"
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Floating Download Badge - Featured for non-PWA ideal environments */}
        {!isPwaSupported && (
          <div className="absolute top-[76px] right-4 z-30 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                try {
                  const trackingData = JSON.parse(localStorage.getItem('nexora_install_attempts') || '[]');
                  trackingData.push({
                    timestamp: new Date().toISOString(),
                    method: 'app_store_badge',
                    status: 'redirect',
                    isOnline: navigator.onLine
                  });
                  localStorage.setItem('nexora_install_attempts', JSON.stringify(trackingData.slice(-20)));
                } catch (e) {}
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-[18px] bg-white text-black shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] hover:scale-105 transition-all cursor-pointer active:scale-95 border border-white/20 group"
            >
              <div className="w-7 h-7 rounded-xl bg-[#180f12] flex items-center justify-center text-white group-hover:bg-[#e6007e] transition-colors">
                <span className="material-symbols-outlined text-[18px]">apple</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[7px] font-black uppercase tracking-widest leading-none opacity-40 mb-0.5">Download on the</span>
                <span className="text-[13px] font-bold leading-none tracking-tight">App Store</span>
              </div>
            </a>
          </div>
        )}

        {/* Success Toast */}
        <AnimatePresence>
          {showCopyToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#26181c] text-white text-[12px] font-bold rounded-full shadow-xl border border-white/10 flex items-center gap-2 z-[60]"
            >
              <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
              Link copied to clipboard
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera / Manual Viewport Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {showManualInstall ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#180f12] overflow-y-auto">
              <div className="flex flex-col items-center w-full max-w-xs">
                {/* QR Code Container with dynamic scaling */}
                <div 
                  className={`bg-white p-4 rounded-3xl transition-all duration-500 ease-in-out shadow-2xl relative group mb-6 overflow-hidden ${
                    isQrExpanded ? 'w-full aspect-square' : 'w-64 h-64'
                  }`}
                >
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.href)}&bgcolor=ffffff&color=000000`} 
                    alt="Application QR Code"
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Animated Laser Scanning Line for Manual Modal */}
                  <div className="absolute left-4 right-4 h-[2px] bg-[#e6007e] shadow-[0_0_15px_1px_#e6007e] animate-scan z-10 opacity-60" />
                  <div className="absolute inset-x-4 inset-y-0 bg-gradient-to-b from-[#e6007e]/5 to-transparent opacity-10 pointer-events-none" />
                  
                  <div className="absolute inset-4 border border-black/5 rounded-2xl pointer-events-none" />
                </div>

                {/* Show Large Toggle positioned right next to/below for better context */}
                <div className="flex items-center justify-between w-full p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-white">Show Large</span>
                    <span className="text-[10px] text-white/50">Expand QR for easier scanning</span>
                  </div>
                  <button
                    onClick={() => setIsQrExpanded(!isQrExpanded)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
                      isQrExpanded ? 'bg-[#e6007e]' : 'bg-white/20'
                    }`}
                  >
                    <div 
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-md ${
                        isQrExpanded ? 'translate-x-6' : 'translate-x-0'
                      }`} 
                    />
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[12px] text-white/70 leading-relaxed">
                    Scan this code with your phone's camera to open Nexora and follow the prompts to install as a native app.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Torch Light Visual Simulator Effect */}
              {torchOn && (
                <div className="absolute inset-0 bg-amber-100/15 pointer-events-none z-10 transition-opacity duration-300" />
              )}

              {/* Real Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraState === 'active' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Requesting State Loader */}
              {cameraState === 'requesting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#180f12]">
                  <span className="material-symbols-outlined text-[42px] text-[#e6007e] animate-spin mb-3">
                    progress_activity
                  </span>
                  <p className="text-[15px] font-bold text-white">Accessing Camera...</p>
                  <p className="text-[12px] text-white/60 mt-1">Please allow camera access when prompted</p>
                </div>
              )}

              {/* Denied / Error State */}
              {cameraState === 'denied' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#180f12]">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[28px]">videocam_off</span>
                  </div>
                  <p className="text-[16px] font-bold text-white mb-1">Camera Permission Required</p>
                  <p className="text-[12px] text-white/70 max-w-xs mb-5 leading-relaxed">{errorMessage}</p>
                  <div className="flex flex-col gap-2.5 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full h-11 rounded-xl bg-[#e6007e] hover:bg-[#b90064] text-white font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                      <span>Try Camera Again</span>
                    </button>
                    <label className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] flex items-center justify-center gap-2 cursor-pointer transition-colors border border-white/10">
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      <span>Upload QR Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Active Scanner Framing UI Overlay */}
              {cameraState === 'active' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/20 rounded-3xl flex items-center justify-center overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#e6007e] rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#e6007e] rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#e6007e] rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#e6007e] rounded-br-2xl" />
                    <div className="absolute left-0 right-0 h-[2px] bg-[#e6007e] shadow-[0_0_15px_2px_#e6007e] animate-scan z-10" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#e6007e]/5 to-transparent opacity-20 pointer-events-none" />
                  </div>
                  <div className="mt-6 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => handleSuccessScan('amelia.stratton@okaxis', 'Amelia Stratton')}
                      className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/90 text-[12px] font-medium flex items-center gap-2 hover:bg-black/80 cursor-pointer active:scale-95 transition-all shadow-lg"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#e6007e]">center_focus_weak</span>
                      <span>Point at QR code or tap to auto-detect</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scanned Success Preview Overlay */}
              {cameraState === 'scanned' && scannedResult && (
                <div className="absolute inset-0 bg-[#180f12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 ring-8 ring-emerald-500/10 animate-bounce">
                    <span className="material-symbols-outlined text-[36px]">check_circle</span>
                  </div>
                  <h4 className="text-[18px] font-bold text-white mb-1">QR Code Scanned!</h4>
                  <p className="text-[12px] text-white/60 mb-5">Verified UPI account details detected</p>
                  <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-4 text-left mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">UPI ID</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">Verified</span>
                    </div>
                    <p className="text-[16px] font-mono font-bold text-white mb-3">{scannedResult.upiId}</p>
                    <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Account Holder</span>
                      <span className="text-[12px] font-bold text-white">{scannedResult.name}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full max-w-xs">
                    <button type="button" onClick={startCamera} className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] transition-colors cursor-pointer">Scan Again</button>
                    <button type="button" onClick={handleConfirmAddUpi} className="flex-1 h-12 rounded-xl bg-[#e6007e] hover:bg-[#b90064] text-white font-bold text-[13px] shadow-lg shadow-[#e6007e]/30 cursor-pointer active:scale-98 transition-transform">Link UPI ID</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Camera Controls Footer */}
        <div className="p-4 px-6 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between z-20">
          {showManualInstall ? (
            <div className="w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white/50">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span className="text-[11px] font-medium italic">Scanner is paused</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer active:scale-95 border border-white/10"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                <span className="text-[12px] font-bold">Copy Link</span>
              </button>
            </div>
          ) : (
            <>
              {/* Torch Toggle */}
              <button
                type="button"
                onClick={toggleTorch}
                disabled={cameraState !== 'active'}
                className={`flex flex-col items-center gap-1 transition-opacity ${
                  torchOn ? 'text-amber-300' : 'text-white/70 hover:text-white'
                } disabled:opacity-30 cursor-pointer`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {torchOn ? 'flashlight_on' : 'flashlight_off'}
                </span>
                <span className="text-[10px] font-medium">{torchOn ? 'Flash On' : 'Flash'}</span>
              </button>

              {/* Upload Image from Gallery */}
              <label className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[22px]">photo_library</span>
                <span className="text-[10px] font-medium">Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Flip Camera */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                disabled={cameraState !== 'active'}
                className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">flip_camera_ios</span>
                <span className="text-[10px] font-medium">Flip</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
