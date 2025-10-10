import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Upload, Database, FileText } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  action,
  icon: Icon = Database 
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <Icon className="w-12 h-12 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        </div>
        {action || (actionLabel && onAction && (
          <Button onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

export function EmptyDataState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <EmptyState
      icon={Upload}
      title="Nessun dato disponibile"
      description="Non sono ancora stati caricati dati di vendita. Inizia caricando i dati dei tuoi negozi per vedere le statistiche e i grafici."
      actionLabel="Carica Dati Vendite"
      onAction={onUploadClick}
    />
  );
}

export function EmptyInventoryState({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="Inventario vuoto"
      description="Non sono presenti prodotti nell'inventario. Carica un file CSV o XLSX per popolare l'inventario con i tuoi prodotti."
      actionLabel={onUploadClick ? "Carica Inventario" : undefined}
      onAction={onUploadClick}
    />
  );
}