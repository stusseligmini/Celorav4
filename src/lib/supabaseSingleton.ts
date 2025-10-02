'use client';

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserClient } from './supabase-browser';

let connectionAttempts = 0;
const maxConnectionAttempts = 5;

/**
 * Gets a singleton instance of the Supabase client
 * 
 * This is an application-level wrapper that provides a consistent API.
 * All singleton logic is handled by supabaseClient.ts (the single source of truth)
 * 
 * Use this function throughout your application for consistency.
 */
export function getSupabaseClient(): SupabaseClient {
  console.log('📞 [APP] Getting Supabase client via application singleton wrapper');
  // Delegate to browser client, which delegates to the main singleton
  return getBrowserClient() as unknown as SupabaseClient;
}

/**
 * Tests the Supabase connection and attempts to recover it if needed
 */
export async function testSupabaseConnection() {
  try {
    const supabase = getSupabaseClient();
    
    // Try a simple query
    const { count, error } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      if (connectionAttempts < maxConnectionAttempts) {
        connectionAttempts++;
        console.log(`Reconnection attempt ${connectionAttempts}/${maxConnectionAttempts}`);
        
  // Recreate via unified singleton
  return getSupabaseClient();
      } else {
        throw new Error('Failed to connect to Supabase after multiple attempts');
      }
    }
    
    // Reset connection attempts on success
    connectionAttempts = 0;
    return supabase;
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
    throw err;
  }
}

/**
 * Sets up a Supabase realtime channel with proper error handling
 * Use this when subscribing to realtime channels to ensure robust error handling
 */
export function setupRealtimeChannel(
  supabase: SupabaseClient, 
  channelName: string
): RealtimeChannel {
  // Create the channel
  const channel = supabase.channel(channelName);
  
  // Add comprehensive error handlers
  channel.on(
    'system', 
    { event: 'disconnect' },
    (payload: any) => {
      console.warn('Realtime channel disconnected:', payload);
    }
  );
  
  channel.on(
    'system', 
    { event: 'error' },
    (payload: any) => {
      console.error('Realtime channel error:', payload);
    }
  );
  
  // Handle connection state
  channel.on(
    'system', 
    { event: 'connect' },
    (payload: any) => {
      console.log('Realtime channel connected');
    }
  );
  
  // Add reconnection logic
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const baseDelay = 1000; // 1 second
  
  function attemptReconnect() {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      const delay = baseDelay * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
      
      setTimeout(() => {
        try {
          channel.subscribe();
        } catch (err) {
          console.error('Error reconnecting channel:', err);
          attemptReconnect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
  
  // Reset attempts on successful connection
  channel.on(
    'system', 
    { event: 'connect' },
    () => {
      reconnectAttempts = 0;
    }
  );
  
  return channel;
}