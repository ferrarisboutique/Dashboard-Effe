import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // TODO: Send to Sentry when integrated
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="mx-auto max-w-md mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Errore nell'applicazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si è verificato un errore imprevisto. Puoi provare a ricaricare la pagina.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Ricarica pagina
              </Button>
              <Button 
                variant="outline"
                onClick={() => this.setState({ hasError: false })}
              >
                Riprova
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs bg-muted p-2 rounded">
                <summary>Dettagli errore (dev)</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

