// Client-safe exports for browser environments
export { SupabaseService } from './supabaseService';
export type { CrossPlatformTransaction } from './crossPlatformService';
export { logger } from './logger';
export * from './crypto';
export * from './celoraSecurity';

// Types only (no implementations that use Node.js modules)
export type { 
  EncryptionResult, 
  RotationResult,
  KeyVersion 
} from './kmsService';
export type { ActiveKeyInfo } from './keyRegistry';