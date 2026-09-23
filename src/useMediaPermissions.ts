import { useState, useEffect, useCallback } from 'react';

export type PermissionStateStatus = 'granted' | 'prompt' | 'denied' | 'unsupported';

export interface MediaPermissions {
  cameraStatus: PermissionStateStatus;
  gallerySupported: boolean;
  requestCameraPermission: () => Promise<boolean>;
  openGalleryPicker: (onFileSelected: (file: File) => void) => void;
  checkCameraPermission: () => Promise<PermissionStateStatus>;
  errorMessage: string | null;
  clearError: () => void;
}

export function useMediaPermissions(): MediaPermissions {
  const [cameraStatus, setCameraStatus] = useState<PermissionStateStatus>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gallery file picker is standard web feature
  const gallerySupported = typeof window !== 'undefined' && typeof document !== 'undefined';

  const checkCameraPermission = useCallback(async (): Promise<PermissionStateStatus> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      return 'unsupported';
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        // Query permissions API if available in browser
        const status = await navigator.permissions.query({ name: 'camera' as any });
        const mapped = status.state as PermissionStateStatus;
        setCameraStatus(mapped);

        // Listen for user changes in browser settings
        status.onchange = () => {
          setCameraStatus(status.state as PermissionStateStatus);
        };
        return mapped;
      }
    } catch {
      // Some browsers (e.g. Safari / iOS) throw on querying 'camera'
    }

    // Default to prompt if cannot pre-query
    return 'prompt';
  }, []);

  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  // Request camera access explicitly
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setErrorMessage('Seu dispositivo ou navegador não suporta acesso à câmera.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      // Stop stream immediately after verifying access
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus('granted');
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage('Permissão de câmera negada. Desbloqueie o acesso nas configurações do navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('unsupported');
        setErrorMessage('Nenhuma câmera foi detectada neste dispositivo.');
      } else {
        setErrorMessage('Não foi possível inicializar a câmera. Tente novamente ou use a galeria.');
      }
      return false;
    }
  }, []);

  // Helper to trigger mobile gallery selection
  const openGalleryPicker = useCallback((onFileSelected: (file: File) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    };
    input.click();
  }, []);

  return {
    cameraStatus,
    gallerySupported,
    requestCameraPermission,
    openGalleryPicker,
    checkCameraPermission,
    errorMessage,
    clearError: () => setErrorMessage(null),
  };
}
