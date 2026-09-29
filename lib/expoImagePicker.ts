/**
 * Expo Image Picker compatible module for React Web application.
 * Implements the standard expo-image-picker interface.
 */

export enum MediaTypeOptions {
  All = 'All',
  Videos = 'Videos',
  Images = 'Images',
}

export interface ImagePickerOptions {
  mediaTypes?: MediaTypeOptions;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  base64?: boolean;
  exif?: boolean;
}

export interface ImagePickerAsset {
  uri: string;
  assetId?: string | null;
  width?: number;
  height?: number;
  type?: 'image' | 'video';
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
  base64?: string | null;
  file?: File;
}

export interface ImagePickerResult {
  canceled: boolean;
  assets?: ImagePickerAsset[] | null;
}

export interface PermissionResponse {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never' | number;
}

export const requestMediaLibraryPermissionsAsync = async (): Promise<PermissionResponse> => {
  return {
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  };
};

export const requestCameraPermissionsAsync = async (): Promise<PermissionResponse> => {
  return {
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  };
};

export const launchImageLibraryAsync = async (
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    if (options.mediaTypes === MediaTypeOptions.Videos) {
      input.accept = 'video/*';
    } else if (options.mediaTypes === MediaTypeOptions.All) {
      input.accept = 'image/*,video/*';
    } else {
      input.accept = 'image/png, image/jpeg, image/webp, image/gif, image/*';
    }

    if (options.allowsMultipleSelection) {
      input.multiple = true;
    }

    let isResolved = false;

    const cleanup = () => {
      document.body.removeChild(input);
      window.removeEventListener('focus', handleCancel);
    };

    const handleCancel = () => {
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve({ canceled: true, assets: null });
        }
      }, 500);
    };

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;

      if (!files || files.length === 0) {
        isResolved = true;
        cleanup();
        resolve({ canceled: true, assets: null });
        return;
      }

      const assets: ImagePickerAsset[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uri = URL.createObjectURL(file);

        let base64: string | null = null;
        if (options.base64) {
          base64 = await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        assets.push({
          uri,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          file,
          base64,
        });
      }

      isResolved = true;
      cleanup();
      resolve({
        canceled: false,
        assets,
      });
    };

    document.body.appendChild(input);
    window.addEventListener('focus', handleCancel, { once: true });
    input.click();
  });
};

export const launchCameraAsync = async (
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> => {
  return launchImageLibraryAsync(options);
};

export default {
  MediaTypeOptions,
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
};
