import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WebSocketContext = createContext(null);

/**
 * WebSocketProvider — Wraps the app and provides a shared WebSocket connection.
 * 
 * Usage:
 *   const { connected, subscribe, unsubscribe, on } = useWs();
 *   
 *   // Subscribe to events
 *   useEffect(() => {
 *     const unsub = on('products', (event, data) => {
 *       // Handle product created/updated/deleted
 *     });
 *     return unsub;
 *   }, []);
 */
export function WebSocketProvider({ children }) {
  // All registered event handlers: Map<channel, Set<callback>>
  const handlersRef = useRef(new Map());
  const [connected, setConnected] = useState(false);

  // All channels that have at least one handler
  const [activeChannels, setActiveChannels] = useState(new Set());

  const handleMessage = useCallback((channel, event, data, timestamp) => {
    const channelHandlers = handlersRef.current.get(channel);
    if (channelHandlers) {
      for (const handler of channelHandlers) {
        try {
          handler(event, data, timestamp);
        } catch (err) {
          console.error(`WebSocket handler error for [${channel}]:`, err);
        }
      }
    }

    // Also fire wildcard handlers
    const wildcardHandlers = handlersRef.current.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(event, data, channel, timestamp);
        } catch (err) {
          console.error('WebSocket wildcard handler error:', err);
        }
      }
    }
  }, []);

  const { connected: wsConnected, subscribe, unsubscribe } = useWebSocket(
    Array.from(activeChannels),
    handleMessage,
    { autoConnect: true }
  );

  useEffect(() => {
    setConnected(wsConnected);
  }, [wsConnected]);

  /**
   * Register an event handler for a channel.
   * Returns an unsubscribe function.
   */
  const on = useCallback((channel, handler) => {
    if (!handlersRef.current.has(channel)) {
      handlersRef.current.set(channel, new Set());
    }
    handlersRef.current.get(channel).add(handler);

    // Track active channels for subscription
    setActiveChannels(prev => {
      const next = new Set(prev);
      next.add(channel);
      return next;
    });

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          handlersRef.current.delete(channel);
          // Remove from active channels
          setActiveChannels(prev => {
            const next = new Set(prev);
            next.delete(channel);
            return next;
          });
        }
      }
    };
  }, []);

  const value = {
    connected,
    on,
    subscribe,
    unsubscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * useWs — Hook to access the WebSocket context.
 */
export function useWs() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWs must be used within a WebSocketProvider');
  }
  return ctx;
}
