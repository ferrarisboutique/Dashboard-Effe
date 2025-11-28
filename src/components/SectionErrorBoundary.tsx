import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureError } from '../utils/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary specifico per sezioni dell'app.
 * Cattura errori nei componenti figli e mostra un fallback user-friendly.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      sectionName: this.props.sectionName,
    });
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Section Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Errore nella sezione {this.props.sectionName || 'della dashboard'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si è verificato un errore imprevisto. Il team è stato notificato automaticamente.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="text-xs bg-muted p-3 rounded-md">
                <summary className="cursor-pointer font-medium mb-2">
                  Dettagli errore (solo in development)
                </summary>
                <pre className="overflow-auto whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="ghost" 
                size="sm"
              >
                Ricarica pagina
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC per wrappare componenti con error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  sectionName: string
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <SectionErrorBoundary sectionName={sectionName}>
      <WrappedComponent {...props} />
    </SectionErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}


