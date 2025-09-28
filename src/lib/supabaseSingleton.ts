'use client';

import { createBrowserClient } from './supabaseClient';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Gets a singleton instance of the Supabase client
 * This prevents multiple instances from being created which could cause issues with
 * real-time subscriptions and authentication state
 */
export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  
  try {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    return supabaseInstance;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
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