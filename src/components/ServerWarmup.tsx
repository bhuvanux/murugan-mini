/**
 * Server Warmup Component
 * 
 * Pings the backend periodically to keep edge functions warm
 * and prevent cold starts that cause timeout errors.
 * 
 * Usage: Add to App.tsx to run in background
 */

import { useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const WARMUP_INTERVAL = 5 * 60 * 1000; // Ping every 5 minutes
const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

export function ServerWarmup() {
  useEffect(() => {
    console.log('[ServerWarmup] Starting background warmup pings...');
    
    // Ping server to keep it warm
    const pingServer = async () => {
      try {
        // Use a lightweight endpoint - just check if server is alive
        const response = await fetch(`${SERVER_URL}/banners/list?type=home`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          // Short timeout for warmup - we don't care if it fails
          signal: AbortSignal.timeout(3000),
        });
        
        if (response.ok) {
          console.log('[ServerWarmup] ✅ Server is warm');
        }
      } catch (error) {
        // Silently ignore errors - warmup is best-effort
        console.log('[ServerWarmup] Ping failed (server may be cold)');
      }
    };
    
    // Initial ping after 10 seconds (let the app load first)
    const initialTimeout = setTimeout(pingServer, 10000);
    
    // Then ping every 5 minutes
    const interval = setInterval(pingServer, WARMUP_INTERVAL);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      console.log('[ServerWarmup] Stopped warmup pings');
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}
