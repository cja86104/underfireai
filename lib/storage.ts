/**
 * Supabase Storage Helper
 * 
 * Handles file uploads for resumes and session recordings.
 * 
 * SETUP: Create buckets in Supabase Dashboard:
 * 1. "resumes" - for resume PDF/text uploads
 * 2. "session-recordings" - for interview audio recordings
 */

import { type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const RESUME_BUCKET = 'resumes';
const RECORDINGS_BUCKET = 'session-recordings';
const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RECORDING_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a resume file to Supabase Storage
 */
export async function uploadResume(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File
): Promise<UploadResult> {
  if (file.size > MAX_RESUME_SIZE) {
    return { success: false, error: 'File size exceeds 5MB limit' };
  }

  const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Only PDF, TXT, DOC, and DOCX files are allowed' };
  }

  const timestamp = Date.now();
  const ext = file.name.split('.').pop() ?? 'pdf';
  const filePath = `${userId}/${timestamp}-resume.${ext}`;

  try {
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('[Storage] Resume upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(RESUME_BUCKET)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('[Storage] Resume upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload a session recording
 */
export async function uploadSessionRecording(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  audioBlob: Blob
): Promise<UploadResult> {
  if (audioBlob.size > MAX_RECORDING_SIZE) {
    return { success: false, error: 'Recording exceeds 50MB limit' };
  }

  const timestamp = Date.now();
  const filePath = `${userId}/${sessionId}/${timestamp}-recording.webm`;

  try {
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(filePath, audioBlob, {
        cacheControl: '3600',
        contentType: 'audio/webm',
        upsert: false,
      });

    if (error) {
      console.error('[Storage] Recording upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(RECORDINGS_BUCKET)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('[Storage] Recording upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  supabase: SupabaseClient<Database>,
  bucket: 'resumes' | 'session-recordings',
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('[Storage] Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    return false;
  }
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrl(
  supabase: SupabaseClient<Database>,
  bucket: 'resumes' | 'session-recordings',
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('[Storage] Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[Storage] Signed URL failed:', error);
    return null;
  }
}

/**
 * Get file type category
 */
export function getFileType(filename: string): 'resume' | 'audio' | 'other' {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  
  const resumeExts = ['pdf', 'doc', 'docx', 'txt'];
  const audioExts = ['webm', 'mp3', 'wav', 'm4a', 'ogg'];
  
  if (resumeExts.includes(ext)) return 'resume';
  if (audioExts.includes(ext)) return 'audio';
  return 'other';
}
