import React, { useState, useEffect } from 'react';
import { AthleteRecord, LIFTING_EXERCISES, GYMNASTICS_EXERCISES, MONO_EXERCISES, User } from '../types';
import { 
  Save, Ruler, Weight, Activity, Timer, Dumbbell, ShieldCheck, Zap, 
  Award, Flame, Camera, UploadCloud, Loader2, CheckCircle2, AlertCircle, 
  User as UserIcon, LogOut, RefreshCw, Sparkles, Image as ImageIcon, FolderCheck, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import * as ImagePicker from '../lib/expoImagePicker';

// Target Supabase Storage Bucket Name
const PROFILE_BUCKET = 'fotosPerfil';

interface AthleteProfileProps {
  userId: string;
  user?: User | null;
  records: AthleteRecord[];
  onSaveRecord: (category: 'BIOMETRICS' | 'LIFTING' | 'GYMNASTICS' | 'MONO', exercise: string, value: string, unit: string) => Promise<void>;
  onUpdateAvatar?: (newUrl: string | null) => void;
  onLogout?: () => void;
  isCoachView?: boolean;
}

/**
 * Automatically detects the MIME type and normalized file extension.
 * Supports File/Blob objects, URI strings, and raw filenames.
 */
const detectMimeAndExtension = (
  fileOrBlob?: File | Blob | null,
  fileName?: string | null,
  mimeHint?: string | null,
  uri?: string | null
): { mimeType: string; extension: string } => {
  let detectedMime = fileOrBlob?.type || mimeHint || '';

  // Extract from data URI if provided
  if (!detectedMime && uri && uri.startsWith('data:')) {
    const match = uri.match(/^data:([^;]+);/);
    if (match) detectedMime = match[1];
  }

  // Extract extension from filename
  let detectedExt = '';
  if (fileName && fileName.includes('.')) {
    const parts = fileName.split('.');
    detectedExt = parts[parts.length - 1].toLowerCase().trim();
  }

  const mimeToExtMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/pjpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
  };

  const extToMimeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'avif': 'image/avif',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
  };

  // Determine final extension and mimeType
  if (detectedMime && mimeToExtMap[detectedMime.toLowerCase()]) {
    detectedExt = mimeToExtMap[detectedMime.toLowerCase()];
  } else if (detectedExt && extToMimeMap[detectedExt]) {
    detectedMime = extToMimeMap[detectedExt];
  } else {
    detectedMime = detectedMime || 'image/jpeg';
    detectedExt = detectedExt || 'jpg';
  }

  return { mimeType: detectedMime, extension: detectedExt };
};

/**
 * Generates an ultra-unique filename with athlete identifier, timestamp,
 * and random hash to guarantee collision-free storage and cache-busting.
 */
const generateUniqueFileName = (userId: string, extension: string): string => {
  const timestamp = Date.now();
  let randomHash = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    randomHash = crypto.randomUUID().replace(/-/g, '').substring(0, 10);
  } else {
    randomHash = Math.random().toString(36).substring(2, 12);
  }
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `athlete_${sanitizedUserId}_${timestamp}_${randomHash}.${extension}`;
};

export const AthleteProfile: React.FC<AthleteProfileProps> = ({ 
  userId, 
  user, 
  records, 
  onSaveRecord, 
  onUpdateAvatar,
  onLogout,
  isCoachView = false 
}) => {
  const [localRecords, setLocalRecords] = useState<Record<string, string>>({});
  const [liftUnit, setLiftUnit] = useState<'lbs' | 'kg'>('lbs');
  const [saving, setSaving] = useState<string | null>(null);

  // Photo Upload States
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sync current avatar if user prop updates
  useEffect(() => {
    if (user?.avatarUrl !== undefined) {
      setCurrentAvatar(user.avatarUrl);
    }
  }, [user?.avatarUrl]);

  useEffect(() => {
    const map: Record<string, string> = {};
    records.forEach(r => {
      let valNum = parseFloat(r.value);
      if (r.category === 'LIFTING' && r.unit !== liftUnit && !isNaN(valNum)) {
        const multiplier = liftUnit === 'kg' ? (1 / 2.20462) : 2.20462;
        map[r.exercise] = Math.round(valNum * multiplier).toString();
      } else {
        map[r.exercise] = r.value;
      }
    });
    setLocalRecords(prev => ({ ...prev, ...map }));
  }, [records, liftUnit]);

  const handleInputChange = (exercise: string, value: string) => {
    setLocalRecords(prev => ({ ...prev, [exercise]: value }));
  };

  const handleToggleUnit = (newUnit: 'lbs' | 'kg') => {
    if (newUnit === liftUnit) return;
    const multiplier = newUnit === 'kg' ? (1 / 2.20462) : 2.20462;
    const updatedRecords = { ...localRecords };
    LIFTING_EXERCISES.forEach(ex => {
      const val = parseFloat(updatedRecords[ex]);
      if (!isNaN(val)) {
        updatedRecords[ex] = Math.round(val * multiplier).toString();
      }
    });
    setLocalRecords(updatedRecords);
    setLiftUnit(newUnit);
  };

  const handleSaveCategory = async (category: 'BIOMETRICS' | 'LIFTING' | 'GYMNASTICS' | 'MONO', exercises: string[], unitOverride?: string) => {
    setSaving(category);
    try {
      const promises = exercises.map(ex => {
        const val = localRecords[ex];
        const unit = unitOverride || (category === 'LIFTING' ? liftUnit : category === 'GYMNASTICS' ? 'reps' : 'time');
        return (val !== undefined && val !== '') ? onSaveRecord(category, ex, val, unit) : Promise.resolve();
      });
      await Promise.all(promises);
    } catch (e) { 
      console.error(e); 
      alert('Error al guardar marcas personales.'); 
    } finally { 
      setSaving(null); 
    }
  };

  /**
   * Helper function: Identifies and deletes any previous profile photo
   * from Supabase Storage before uploading a new one.
   */
  const removePreviousPhotoIfExists = async (oldUrlHint?: string | null) => {
    try {
      // 1. Fetch current avatar_url in the database to be 100% up-to-date
      let targetUrl = oldUrlHint;
      if (!targetUrl) {
        const { data: dbUser } = await supabase
          .from('app_users')
          .select('avatar_url')
          .eq('id', userId)
          .single();
        targetUrl = dbUser?.avatar_url || currentAvatar || user?.avatarUrl;
      }

      // 2. If an existing URL is found, parse and delete the exact file
      if (targetUrl && typeof targetUrl === 'string') {
        // Protect brand logo from being deleted
        if (!targetUrl.includes('WildBlood.png')) {
          const storageMatch = targetUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
          if (storageMatch) {
            const bucket = storageMatch[1];
            const rawPath = storageMatch[2];
            const filePath = decodeURIComponent(rawPath.split('?')[0]);
            
            console.log(`[Storage Cleanup] Eliminando foto previa: Bucket='${bucket}', Path='${filePath}'`);
            const { error: removeErr } = await supabase.storage.from(bucket).remove([filePath]);
            if (removeErr) {
              console.warn(`[Storage Cleanup] Error al eliminar de ${bucket}:`, removeErr.message);
            } else {
              console.log(`[Storage Cleanup] Foto previa eliminada exitosamente de ${bucket}.`);
            }
          }
        }
      }

      // 3. Search & sweep any remaining previous files for this user across standard buckets
      const candidateBuckets = [PROFILE_BUCKET, 'FotosPerfil', 'fotosperfil', 'images', 'imagenes', 'avatars'];
      const candidateFolders = ['profile', 'avatars', ''];

      for (const b of candidateBuckets) {
        for (const folder of candidateFolders) {
          try {
            const { data: fileList } = await supabase.storage
              .from(b)
              .list(folder, {
                search: userId,
                limit: 50,
              });

            if (fileList && fileList.length > 0) {
              const filesToDelete = fileList
                .filter(item => item.name && (item.name.includes(userId) || item.name.startsWith(`athlete_${userId}`) || item.name.startsWith(`avatar_${userId}`)))
                .map(item => folder ? `${folder}/${item.name}` : item.name);

              if (filesToDelete.length > 0) {
                console.log(`[Storage Cleanup] Limpiando archivos obsoletos en '${b}':`, filesToDelete);
                await supabase.storage.from(b).remove(filesToDelete);
              }
            }
          } catch (listErr) {
            // Ignore list permission errors on optional fallback buckets
          }
        }
      }
    } catch (cleanupError) {
      console.warn('Error durante la verificación/eliminación de foto anterior:', cleanupError);
    }
  };

  /**
   * Upload function using Expo Image Picker:
   * 1. Opens Expo Image Picker
   * 2. Automatically detects file MIME type and extension
   * 3. Assigns a unique filename (athlete_{userId}_{timestamp}_{hash}.{ext})
   * 4. Checks & deletes previous photo from Supabase Storage
   * 5. Uploads new photo to 'fotosPerfil' bucket
   * 6. Updates database with new avatar_url
   */
  const handlePickAndUploadImage = async () => {
    setPhotoError(null);
    setPhotoSuccess(null);

    try {
      // 1. Request media permissions using Expo Image Picker
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setPhotoError('Se requiere permiso para acceder a la galería de fotos.');
        return;
      }

      // 2. Launch Expo Image Picker
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const selectedAsset = pickerResult.assets[0];
      setUploadingPhoto(true);

      // 3. Prepare file / blob for Supabase Storage
      let uploadPayload: Blob | File;
      if (selectedAsset.file) {
        uploadPayload = selectedAsset.file;
      } else {
        const response = await fetch(selectedAsset.uri);
        uploadPayload = await response.blob();
      }

      // 4. AUTOMATICALLY DETECT MIME TYPE & EXTENSION
      const { mimeType: detectedMime, extension: detectedExt } = detectMimeAndExtension(
        selectedAsset.file || uploadPayload,
        selectedAsset.fileName,
        selectedAsset.mimeType,
        selectedAsset.uri
      );

      // 5. ASSIGN ULTRA-UNIQUE FILENAME
      const uniqueFileName = generateUniqueFileName(userId, detectedExt);
      const filePath = `profile/${uniqueFileName}`;

      console.log(`[Photo Upload] Tipo detectado: ${detectedMime}, Extensión: .${detectedExt}, Nombre único: ${uniqueFileName}`);

      // 6. VERIFY AND DELETE PREVIOUS PHOTO FROM SUPABASE STORAGE
      await removePreviousPhotoIfExists(currentAvatar);

      // 7. Upload new photo to Supabase Storage in 'fotosPerfil' bucket
      let targetBucket = PROFILE_BUCKET; // 'fotosPerfil'
      let { data: uploadData, error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(filePath, uploadPayload, {
          cacheControl: '3600',
          upsert: true,
          contentType: detectedMime
        });

      // Resilient fallback if bucket name has different capitalization
      if (uploadError) {
        console.warn(`Subida al bucket '${targetBucket}' falló (${uploadError.message}). Intentando 'FotosPerfil'...`);
        targetBucket = 'FotosPerfil';
        const retry1 = await supabase.storage
          .from(targetBucket)
          .upload(filePath, uploadPayload, {
            cacheControl: '3600',
            upsert: true,
            contentType: detectedMime
          });

        if (retry1.error) {
          console.warn(`Subida a 'FotosPerfil' falló. Intentando 'fotosperfil'...`);
          targetBucket = 'fotosperfil';
          const retry2 = await supabase.storage
            .from(targetBucket)
            .upload(filePath, uploadPayload, {
              cacheControl: '3600',
              upsert: true,
              contentType: detectedMime
            });

          if (retry2.error) {
            throw new Error(`Error en Supabase Storage (Bucket ${targetBucket}): ${uploadError.message || retry2.error.message}`);
          }
        }
      }

      // 8. Retrieve Public URL from Supabase Storage
      const { data: publicUrlData } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(filePath);

      const publicPhotoUrl = publicUrlData?.publicUrl;
      if (!publicPhotoUrl) {
        throw new Error('No se pudo obtener la URL pública de la foto en Supabase Storage.');
      }

      // 9. Update athlete's user profile in the database (app_users table)
      const { error: dbError } = await supabase
        .from('app_users')
        .update({ avatar_url: publicPhotoUrl })
        .eq('id', userId);

      if (dbError) {
        console.error('Error al actualizar avatar_url en app_users:', dbError);
        if (dbError.message?.includes('avatar_url') || dbError.code === 'PGRST204') {
          throw new Error('Falta la columna avatar_url en la tabla app_users. Ejecuta en Supabase SQL Editor: ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;');
        }
        throw new Error(`Error al actualizar la base de datos: ${dbError.message}`);
      }

      // 10. Update UI state & propagate
      setCurrentAvatar(publicPhotoUrl);
      setPhotoSuccess(`¡Foto (.${detectedExt.toUpperCase()}) guardada con éxito en ${targetBucket}!`);
      if (onUpdateAvatar) {
        onUpdateAvatar(publicPhotoUrl);
      }

      setTimeout(() => {
        setPhotoSuccess(null);
      }, 5000);

    } catch (err: any) {
      console.error('Error during image pick & upload:', err);
      setPhotoError(err.message || 'Error al procesar la foto con Expo Image Picker.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  /**
   * Delete current photo function
   */
  const handleDeleteCurrentPhoto = async () => {
    if (!currentAvatar || uploadingPhoto) return;
    if (!window.confirm('¿Deseas eliminar tu foto de perfil actual?')) return;

    setUploadingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    try {
      // 1. Delete previous photo from Supabase Storage
      await removePreviousPhotoIfExists(currentAvatar);

      // 2. Update database to null
      const { error: dbError } = await supabase
        .from('app_users')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (dbError) throw dbError;

      setCurrentAvatar(null);
      setPhotoSuccess('Foto de perfil eliminada correctamente.');
      if (onUpdateAvatar) onUpdateAvatar(null);

      setTimeout(() => setPhotoSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error al eliminar foto:', err);
      setPhotoError(err.message || 'Error al eliminar la foto de perfil.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Direct drop handler (with automatic type/extension detection and unique filename)
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Por favor arrastra un archivo de imagen válido.');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    try {
      // 1. Delete previous photo
      await removePreviousPhotoIfExists(currentAvatar);

      // 2. Automatically detect type & extension
      const { mimeType: detectedMime, extension: detectedExt } = detectMimeAndExtension(file, file.name, file.type);
      const uniqueFileName = generateUniqueFileName(userId, detectedExt);
      const filePath = `profile/${uniqueFileName}`;

      let targetBucket = PROFILE_BUCKET; // 'fotosPerfil'
      let { error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(filePath, file, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: detectedMime
        });

      if (uploadError) {
        targetBucket = 'FotosPerfil';
        const retry1 = await supabase.storage
          .from(targetBucket)
          .upload(filePath, file, { 
            cacheControl: '3600', 
            upsert: true,
            contentType: detectedMime 
          });

        if (retry1.error) {
          targetBucket = 'fotosperfil';
          await supabase.storage
            .from(targetBucket)
            .upload(filePath, file, { 
              cacheControl: '3600', 
              upsert: true,
              contentType: detectedMime
            });
        }
      }

      const { data: publicUrlData } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(filePath);

      const publicPhotoUrl = publicUrlData?.publicUrl;
      if (!publicPhotoUrl) throw new Error('No se pudo obtener la URL de la imagen.');

      const { error: dbDropError } = await supabase
        .from('app_users')
        .update({ avatar_url: publicPhotoUrl })
        .eq('id', userId);

      if (dbDropError) {
        console.error('Error al actualizar avatar_url en app_users:', dbDropError);
        if (dbDropError.message?.includes('avatar_url') || dbDropError.code === 'PGRST204') {
          throw new Error('Falta la columna avatar_url en la tabla app_users. Ejecuta en Supabase SQL Editor: ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;');
        }
        throw new Error(`Error al actualizar la base de datos: ${dbDropError.message}`);
      }

      setCurrentAvatar(publicPhotoUrl);
      setPhotoSuccess(`¡Foto previa reemplazada con éxito (${uniqueFileName}) en ${targetBucket}!`);
      if (onUpdateAvatar) onUpdateAvatar(publicPhotoUrl);
      setTimeout(() => setPhotoSuccess(null), 5000);
    } catch (err: any) {
      setPhotoError(err.message || 'Error al subir la imagen.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const filledRecordsCount = Object.values(localRecords).filter(v => v && v.trim() !== '' && v !== '0').length;

  const renderSection = (title: string, icon: React.ReactNode, category: string, exercises: string[], unitLabel?: string) => (
    <div className="bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-white/5 pb-5 gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-2xl bg-blood-950/60 border border-blood-900/40 text-blood-400">
               {icon}
             </div>
             <div>
               <span className="text-[10px] font-mono font-bold uppercase text-blood-400 tracking-widest block">
                 CATEGORÍA DE RENDIMIENTO
               </span>
               <h3 className="text-xl md:text-2xl font-display font-black text-white italic uppercase tracking-wider leading-tight">
                  {title}
               </h3>
             </div>
          </div>
          {!isCoachView && (
             <button 
                onClick={() => handleSaveCategory(category as any, exercises)} 
                disabled={saving === category} 
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blood-700 to-blood-600 hover:from-blood-600 hover:to-blood-500 text-white px-6 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-widest transition-all shadow-glow-sm disabled:opacity-50 min-w-[160px] active:scale-95"
             >
                <Save size={15} />
                <span>{saving === category ? 'Guardando...' : 'Guardar Sección'}</span>
             </button>
          )}
       </div>

       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {exercises.map(ex => (
             <div key={ex} className="space-y-2 bg-dark-950/80 p-4 rounded-2xl border border-white/5 group hover:border-white/15 transition-all">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 group-hover:text-blood-400 transition-colors block truncate">
                  {ex}
                </label>
                <div className="relative">
                   <input 
                     type="text" 
                     value={localRecords[ex] || ''} 
                     onChange={(e) => handleInputChange(ex, e.target.value)}
                     placeholder="0"
                     className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white font-mono text-lg font-black focus:border-blood-500 focus:outline-none transition-all pr-12 shadow-inner"
                   />
                   <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-500 uppercase pointer-events-none">
                      {unitLabel || (category === 'LIFTING' ? liftUnit : 'unit')}
                   </span>
                </div>
             </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in pb-24 px-2 md:px-4">
      
      {/* ATHLETE HERO HEADER & EXPO IMAGE PICKER */}
      <div 
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        className={`relative p-6 md:p-8 bg-gradient-to-br from-dark-850 via-dark-900 to-dark-950 rounded-3xl border transition-all duration-300 shadow-2xl overflow-hidden ${
          isDragOver ? 'border-blood-500 ring-4 ring-blood-500/20 bg-dark-800' : 'border-white/10'
        }`}
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blood-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blood-900/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-6 text-center sm:text-left">
            
            {/* EXPO IMAGE PICKER AVATAR */}
            <div className="relative group shrink-0">
              <div 
                onClick={() => !uploadingPhoto && handlePickAndUploadImage()}
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden cursor-pointer relative border-2 transition-all duration-300 shadow-glow-md flex items-center justify-center ${
                  currentAvatar 
                    ? 'border-blood-500/60 group-hover:border-blood-400 group-hover:scale-105' 
                    : 'bg-gradient-to-tr from-blood-700 via-blood-600 to-blood-500 border-white/20 group-hover:scale-105'
                }`}
                title="Seleccionar foto de perfil con Expo Image Picker"
              >
                {currentAvatar ? (
                  <img 
                    src={currentAvatar} 
                    alt={user?.fullName || 'Atleta'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white">
                    <UserIcon size={44} strokeWidth={2.5} />
                  </div>
                )}

                {/* Uploading / Hover Overlay */}
                <div className={`absolute inset-0 bg-dark-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1 transition-opacity ${
                  uploadingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {uploadingPhoto ? (
                    <>
                      <Loader2 size={24} className="text-blood-400 animate-spin" />
                      <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider">Detectando y Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={22} className="text-white" />
                      <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider text-center px-1">
                        {currentAvatar ? 'Cambiar Foto' : 'Subir Foto'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Camera Action Badge */}
              <button
                type="button"
                onClick={() => !uploadingPhoto && handlePickAndUploadImage()}
                disabled={uploadingPhoto}
                className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-blood-600 hover:bg-blood-500 text-white border-2 border-dark-900 shadow-lg transition-transform active:scale-95 group-hover:scale-110"
                title="Abrir selector de fotos (Expo Image Picker)"
              >
                {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
            </div>

            {/* ATHLETE IDENTITY INFO */}
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-blood-600/20 border border-blood-500/30 text-[10px] font-mono font-black uppercase text-blood-400 tracking-wider">
                  WILD BLOOD ATLETA
                </span>
                <span className="px-2 py-0.5 rounded-full bg-dark-950 border border-white/10 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  {user?.role || 'ATHLETE'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white italic uppercase tracking-tight leading-tight">
                {user?.fullName || 'Perfil de Atleta'}
              </h2>
              
              <div className="text-xs text-slate-400 font-mono mt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {user?.username && <span className="text-blood-400 font-bold">@{user.username}</span>}
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck size={14} /> Acceso Verificado
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 font-mono">{filledRecordsCount} Marcas Registradas</span>
              </div>

              {/* Photo Selector Trigger Buttons */}
              <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <button
                  type="button"
                  onClick={handlePickAndUploadImage}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blood-700 to-blood-600 hover:from-blood-600 hover:to-blood-500 text-white text-[11px] font-display font-black uppercase tracking-wider transition-all shadow-glow-sm active:scale-95 disabled:opacity-50"
                >
                  <Camera size={14} />
                  <span>{uploadingPhoto ? 'Procesando formato...' : (currentAvatar ? 'Cambiar Foto (Expo Picker)' : 'Seleccionar Foto (fotosPerfil)')}</span>
                </button>

                {currentAvatar && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentPhoto}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-950/80 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-900/40 text-[11px] font-display font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Eliminar foto de perfil actual"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar Foto</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Button */}
          {onLogout && (
            <div className="flex items-center justify-center md:justify-end gap-3 shrink-0">
              <button 
                onClick={onLogout} 
                className="flex items-center gap-2.5 bg-dark-800/80 hover:bg-blood-900/30 hover:border-blood-600/50 text-slate-300 hover:text-blood-400 px-5 py-3 rounded-2xl transition-all border border-white/5 font-display font-bold uppercase text-xs tracking-widest active:scale-95 shadow-lg"
              >
                <LogOut size={16} /> 
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>

        {/* FEEDBACK BANNERS */}
        {photoSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2.5 animate-fade-in shadow-lg">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span className="font-semibold">{photoSuccess}</span>
          </div>
        )}

        {photoError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2.5 animate-fade-in shadow-lg">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span className="font-semibold">{photoError}</span>
          </div>
        )}
      </div>

      {/* BIOMETRICS & LOCKER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
         
         {/* BIOMETRICS CARD */}
         <div className="md:col-span-7 bg-dark-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-white/5">
              <Activity size={18} className="text-blood-400" />
              <h3 className="text-xs font-display font-bold text-slate-200 uppercase tracking-widest">
                Biometría Vital del Atleta
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 my-2">
               <div className="space-y-2 bg-dark-950 p-4 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Peso Corporal</label>
                  <div className="relative">
                     <input 
                       type="text" 
                       value={localRecords['Weight'] || ''} 
                       onChange={(e) => handleInputChange('Weight', e.target.value)} 
                       className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white font-mono text-base font-bold pr-10 focus:border-blood-500 focus:outline-none" 
                       placeholder="Ej: 82 kg"
                     />
                     <Weight size={16} className="absolute right-3 top-3.5 text-slate-500"/>
                  </div>
               </div>
               <div className="space-y-2 bg-dark-950 p-4 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Estatura / Altura</label>
                  <div className="relative">
                     <input 
                       type="text" 
                       value={localRecords['Height'] || ''} 
                       onChange={(e) => handleInputChange('Height', e.target.value)} 
                       className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white font-mono text-base font-bold pr-10 focus:border-blood-500 focus:outline-none" 
                       placeholder="Ej: 1.78 m"
                     />
                     <Ruler size={16} className="absolute right-3 top-3.5 text-slate-500"/>
                  </div>
               </div>
            </div>

            <button 
              onClick={() => handleSaveCategory('BIOMETRICS', ['Weight', 'Height'], 'unit')} 
              className="mt-5 w-full py-3.5 bg-dark-950 hover:bg-dark-800 text-slate-200 hover:text-white text-xs font-display font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10 shadow-md active:scale-98"
            >
              Guardar Biometría
            </button>
         </div>

         {/* ATHLETE STATS BADGE */}
         <div className="md:col-span-5 bg-gradient-to-br from-blood-950/40 via-dark-900 to-dark-950 border border-blood-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center text-center">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-blood-600/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-blood-600/20 border border-blood-500/40 flex items-center justify-center text-blood-400 mb-4 shadow-glow-sm">
               <ShieldCheck size={32} />
            </div>
            
            <span className="text-[10px] font-mono font-black text-blood-400 uppercase tracking-[0.25em] mb-1">
              STATUS ATLETA // WILD BLOOD
            </span>
            <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-wider mb-2">
              Locker de Récords
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-xs">
              Tus marcas alimentan automáticamente la calculadora de 1RM y el seguimiento de progresión.
            </p>
         </div>
      </div>

      {/* UNIT SELECTOR */}
      <div className="flex justify-center my-6">
         <div className="flex bg-dark-900 p-1.5 rounded-2xl border border-white/10 shadow-xl">
            <button 
               onClick={() => handleToggleUnit('lbs')} 
               className={`px-8 py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-widest transition-all ${
                 liftUnit === 'lbs' ? 'bg-blood-600 text-white shadow-glow-sm' : 'text-slate-400 hover:text-white'
               }`}
            >
               Libras (LBS)
            </button>
            <button 
               onClick={() => handleToggleUnit('kg')} 
               className={`px-8 py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-widest transition-all ${
                 liftUnit === 'kg' ? 'bg-blood-600 text-white shadow-glow-sm' : 'text-slate-400 hover:text-white'
               }`}
            >
               Kilogramos (KG)
            </button>
         </div>
      </div>

      {/* BENCHMARK CATEGORIES */}
      {renderSection('Fuerza Máxima (Weightlifting & Power)', <Dumbbell size={20} />, 'LIFTING', LIFTING_EXERCISES)}
      {renderSection('Dominios Gimnásticos (Gymnastics)', <Activity size={20} />, 'GYMNASTICS', GYMNASTICS_EXERCISES, 'reps')}
      {renderSection('Capacidad Aeróbica & Cíclica (Monostructural)', <Timer size={20} />, 'MONO', MONO_EXERCISES)}

    </div>
  );
};
