import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  initiatePinterestOAuth, 
  isPinterestAuthenticated, 
  logoutPinterest,
  exchangePinterestCode 
} from '@/lib/pinterest';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PinterestAuthProps {
  onAuthChange?: (authenticated: boolean) => void;
}

export function PinterestAuth({ onAuthChange }: PinterestAuthProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isPinterestAuthenticated();
      setAuthenticated(isAuth);
      onAuthChange?.(isAuth);
    };

    checkAuth();

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      toast.error('Pinterest authentication failed', {
        description: urlParams.get('error_description') || error,
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      handleOAuthCallback(code);
    }
  }, [onAuthChange]);

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    try {
      await exchangePinterestCode(code);
      setAuthenticated(true);
      onAuthChange?.(true);
      toast.success('Successfully connected to Pinterest!');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Pinterest OAuth error:', err);
      toast.error('Failed to connect Pinterest account', {
        description: errorMessage,
        duration: 10000, // Show longer for debugging
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    // Check if manual token is configured
    const manualToken = import.meta.env.VITE_PINTEREST_ACCESS_TOKEN;
    if (manualToken) {
      toast.info('Using manual access token from environment variables');
      setAuthenticated(true);
      onAuthChange?.(true);
      return;
    }

    // Otherwise, initiate OAuth flow
    try {
      setLoading(true);
      await initiatePinterestOAuth();
    } catch (err) {
      toast.error('Failed to initiate Pinterest connection', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    logoutPinterest();
    setAuthenticated(false);
    onAuthChange?.(false);
    toast.success('Disconnected from Pinterest');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (authenticated) {
    const manualToken = import.meta.env.VITE_PINTEREST_ACCESS_TOKEN;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Connected to Pinterest</span>
          {!manualToken && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="border-border"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Disconnect
            </Button>
          )}
        </div>
        {manualToken && (
          <p className="text-xs text-muted-foreground">
            Using access token from environment
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Connect your Pinterest account for better search results (optional)
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnect}
        className="w-full border-border"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Connect Pinterest
      </Button>
      <p className="text-xs text-muted-foreground">
        You can search Pinterest without connecting, but connecting may improve results.
      </p>
    </div>
  );
}

