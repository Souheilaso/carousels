import { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log real application errors (not extension errors)
    console.error('Application error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <div className="w-full max-w-md">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">
                  An unexpected error occurred. This might be a temporary issue.
                </p>
                {this.state.error && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm font-medium">
                      Error details
                    </summary>
                    <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                      {this.state.error.toString()}
                    </pre>
                  </details>
                )}
                <Button onClick={this.handleReset} className="w-full">
                  Reload Page
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


