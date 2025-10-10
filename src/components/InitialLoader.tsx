interface InitialLoaderProps {
  message?: string;
  submessage?: string;
}

export function InitialLoader({ 
  message = "Caricamento...", 
  submessage 
}: InitialLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h3 className="text-lg font-medium">{message}</h3>
        {submessage && (
          <p className="text-sm text-muted-foreground">{submessage}</p>
        )}
      </div>
    </div>
  );
}