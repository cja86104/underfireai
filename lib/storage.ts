/**
 * Supabase Storage Helper
 * 
 * Handles file uploads for resumes.
 * 
 * SETUP: Create bucket in Supabase Dashboard:
 * 1. "resumes" - for resume PDF/text uploads
 */

import { type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const RESUME_BUCKET = 'resumes';
const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB

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
