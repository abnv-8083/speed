import { useEffect, useRef, useCallback, useState } from 'react';
import { getToken } from '../api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Derive WebSocket URL from API URL
function getWsUrl() {
  const httpBase = BASE_URL.replace(/\/+$/, '');
  if (httpBase.startsWith('https://')) {
    return httpBase.replace('https://', 'wss://') + '/ws';
  }
  return httpBase.replace('http://', 'ws://') + '/ws';
}

/**
 * useWebSocket — React hook for real-time data via WebSocket
 * 
 * @param {string[]} channels - Channels to subscribe to (e.g. ['products', 'invoices'])
 * @param {function} onMessage - Callback: (channel, event, data, timestamp) => void
 * @param {object} options - { autoConnect: true, reconnectInterval: 3000, maxReconnectAttempts: 50 }
 * @returns {{ connected, reconnect, disconnect }}
 */
export function useWebSocket(channels = [], onMessage, options = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 50,
  } = options;

  const wsRef = useRef(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef(null);
  const channelsRef = useRef(channels);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);

  // Keep refs up to date
  channelsRef.current = channels;
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    // Don't connect if no token
    const token = getToken();
    if (!token) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌  WebSocket connected');
        setConnected(true);
        reconnectCount.current = 0;

        // Subscribe to all requested channels
        for (const ch of channelsRef.current) {
          ws.send(JSON.stringify({ type: 'subscribe', channel: ch }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'update' && onMessageRef.current) {
            onMessageRef.current(msg.channel, msg.event, msg.data, msg.timestamp);
          } else if (msg.type === 'subscribed') {
            // Confirmation — no action needed
          } else if (msg.type === 'pong') {
            // Heartbeat response
          } else if (msg.type === 'error') {
            console.warn('WebSocket error message:', msg.message);
          }
        } catch (err) {
          console.warn('WebSocket parse error:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌  WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        wsRef.current = null;

        // Reconnect unless auth failed
        if (event.code !== 4001 && reconnectCount.current < maxReconnectAttempts) {
          reconnectTimer.current = setTimeout(() => {
            reconnectCount.current++;
            const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectCount.current - 1), 30000);
            console.log(`🔄  WebSocket reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectCount.current})...`);
            connect();
          }, delay);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
    }
  }, [reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    reconnectCount.current = maxReconnectAttempts; // Prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, [maxReconnectAttempts]);

  const reconnect = useCallback(() => {
    reconnectCount.current = 0;
    connect();
  }, [connect]);

  // Send a subscribe/unsubscribe message
  const subscribe = useCallback((channel) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }, []);

  const unsubscribe = useCallback((channel) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  // Re-subscribe when channels change
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      for (const ch of channels) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', channel: ch }));
      }
    }
  }, [channels]);

  return { connected, reconnect, disconnect, subscribe, unsubscribe };
}

/**
 * useWsChannel — Convenience hook for a single channel
 * Returns the latest event data and a way to listen for events.
 */
export function useWsChannel(channel, onEvent) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const handleMessage = useCallback((ch, event, data, timestamp) => {
    if (ch === channel && onEventRef.current) {
      onEventRef.current(event, data, timestamp);
    }
  }, [channel]);

  return useWebSocket([channel], handleMessage);
}
