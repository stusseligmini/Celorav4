import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateFile } from '@/lib/secureFileHandling';
import { applyRateLimit, RateLimitOptions } from '@/lib/apiSecurity';
import { logSecurity } from '@/lib/logger';

/**
 * API endpoint for secure file uploads
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Apply rate limiting
    const options: RateLimitOptions = {
      limit: 10, // 10 uploads per minute
      windowMs: 60 * 1000, 
      keyPrefix: 'file_upload'
    };
    
    const rateLimitResult = await applyRateLimit(req, options);
    
    // If result is a NextResponse, rate limit was exceeded
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }
    
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set() {}, // No-op as we don't need to set cookies in this endpoint
          remove() {}, // No-op as we don't need to remove cookies in this endpoint
        },
      }
    );
    
    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check authentication
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    // Check if file exists
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get file category from form data or default to 'general'
    const category = formData.get('category') as string || 'general';
    
    // Validate file with strict security checks
    const validatedFile = await validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB max
      validateMimeType: true,
      // Allow different extensions based on category
      allowedExtensions: category === 'documents' 
        ? ['pdf', 'docx', 'xlsx', 'txt'] 
        : ['jpg', 'jpeg', 'png', 'webp']
    });
    
    // Check if file validation succeeded
    if (!validatedFile.isValid) {
      return NextResponse.json(
        { error: 'Invalid file', details: validatedFile.validationErrors },
        { status: 400 }
      );
    }
    
    // Log file upload for security auditing
    logSecurity('File upload initiated', {
      userId: user.id,
      action: 'file_upload',
      componentName: 'API',
    }, {
      filename: validatedFile.originalFilename,
      secureFilename: validatedFile.filename,
      contentType: validatedFile.contentType,
      size: validatedFile.size,
      category,
    });
    
    // Determine storage path based on category and user
    const storagePath = `${category}/${user.id}/${validatedFile.filename}`;
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('secure-uploads')
      .upload(storagePath, file, {
        contentType: validatedFile.contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }
    
    // Get a temporary URL for the file
    const { data: urlData } = await supabase.storage
      .from('secure-uploads')
      .createSignedUrl(storagePath, 60); // 60 seconds expiry
    
    // Create database entry for the file
    const { data: fileRecord, error: dbError } = await supabase
      .from('user_files')
      .insert({
        user_id: user.id,
        filename: validatedFile.sanitizedFilename,
        storage_path: storagePath,
        content_type: validatedFile.contentType,
        size_bytes: validatedFile.size,
        hash: validatedFile.hash,
        category: category,
        metadata: {
          originalName: validatedFile.originalFilename,
          extension: validatedFile.extension
        }
      })
      .select()
      .single();
    
    if (dbError) {
      // If database insert fails, delete the uploaded file to avoid orphaned files
      await supabase.storage
        .from('secure-uploads')
        .remove([storagePath]);
      
      return NextResponse.json({ error: 'Failed to save file information' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      filename: validatedFile.sanitizedFilename,
      url: urlData?.signedUrl || null,
      contentType: validatedFile.contentType,
      size: validatedFile.size,
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during file upload' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
