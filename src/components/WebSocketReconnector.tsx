'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { featureFlags } from '@/lib/featureFlags';

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected'
}

export interface WebSocketReconnectorProps {
  url: string; // WebSocket URL to connect to
  className?: string; // Additional CSS classes
  reconnectInterval?: number; // Time in ms between reconnection attempts
  maxReconnectAttempts?: number; // Maximum number of reconnect attempts
  onMessage?: (data: any) => void; // Callback for message events
  onStatusChange?: (status: ConnectionStatus) => void; // Callback for connection status changes
  children?: React.ReactNode; // Optional children to render
  autoConnect?: boolean; // Whether to connect automatically on mount
}

export const WebSocketReconnector: React.FC<WebSocketReconnectorProps> = ({
  url,
  className,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5,
  onMessage,
  onStatusChange,
  children,
  autoConnect = true
}) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update the status and notify via callback
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  }, [onStatusChange]);

  // Close the current socket connection
  const closeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.onclose = null; // Remove the onclose handler to prevent reconnection
      socketRef.current.close();
      socketRef.current = null;
    }
    
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Attempt to connect to the WebSocket
  const connect = useCallback(() => {
    if (!url) return;
    
    try {
      // Check if real-time updates are enabled
      if (!featureFlags.isEnabled('real_time_rates', { defaultValue: true })) {
        console.log('Real-time rates updates are disabled');
        return;
      }
      
      // Close any existing connection
      closeSocket();
      
      // Create new WebSocket connection
      updateStatus(ConnectionStatus.CONNECTING);
      const socket = new WebSocket(url);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        updateStatus(ConnectionStatus.CONNECTED);
        setReconnectAttempt(0);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
          setLastMessageTime(new Date());
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket closed (code ${event.code}): ${event.reason || 'No reason provided'}`);
        
        // Only try to reconnect if it wasn't a normal closure
        if (event.code !== 1000) {
          if (reconnectAttempt < maxReconnectAttempts) {
            updateStatus(ConnectionStatus.RECONNECTING);
            setReconnectAttempt(prev => prev + 1);
            
            // Schedule reconnection
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectInterval);
          } else {
            console.error(`Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
            updateStatus(ConnectionStatus.DISCONNECTED);
          }
        } else {
          updateStatus(ConnectionStatus.DISCONNECTED);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      updateStatus(ConnectionStatus.DISCONNECTED);
    }
  }, [url, closeSocket, onMessage, reconnectAttempt, maxReconnectAttempts, reconnectInterval, updateStatus]);

  // Connect when component mounts if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      closeSocket();
    };
  }, [autoConnect, connect, closeSocket]);

  // Reconnect when online after being offline
  useEffect(() => {
    const handleOnline = () => {
      if (status === ConnectionStatus.DISCONNECTED) {
        setReconnectAttempt(0);
        connect();
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [status, connect]);
  
  // Manually reconnect
  const reconnect = useCallback(() => {
    setReconnectAttempt(0);
    connect();
  }, [connect]);

  // Disconnect manually
  const disconnect = useCallback(() => {
    closeSocket();
    updateStatus(ConnectionStatus.DISCONNECTED);
  }, [closeSocket, updateStatus]);

  // Send data through the WebSocket
  const send = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Render status indicator if no children provided
  if (!children) {
    let statusMessage = '';
    let statusColor = '';
    
    switch (status) {
      case ConnectionStatus.CONNECTED:
        statusMessage = 'Connected';
        statusColor = 'bg-green-500';
        break;
      case ConnectionStatus.CONNECTING:
        statusMessage = 'Connecting';
        statusColor = 'bg-blue-500';
        break;
      case ConnectionStatus.RECONNECTING:
        statusMessage = `Reconnecting (${reconnectAttempt}/${maxReconnectAttempts})`;
        statusColor = 'bg-yellow-500';
        break;
      case ConnectionStatus.DISCONNECTED:
        statusMessage = 'Disconnected';
        statusColor = 'bg-red-500';
        break;
    }

    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <div className={cn("h-2 w-2 rounded-full", statusColor)}></div>
        <span>{statusMessage}</span>
        {status === ConnectionStatus.DISCONNECTED && (
          <button 
            onClick={reconnect}
            className="text-xs px-2 py-0.5 bg-slate-200 rounded hover:bg-slate-300"
          >
            Reconnect
          </button>
        )}
        {lastMessageTime && (
          <span className="text-xs text-slate-500">
            Last update: {lastMessageTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  }

  // Render children with connection control props
  return React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        connectionStatus: status,
        reconnect,
        disconnect,
        send,
        lastMessageTime
      });
    }
    return child;
  });
};

export default WebSocketReconnector;
