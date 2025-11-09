import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface UnmappedPaymentMethodsAlertProps {
  unmappedMethods: string[];
  onNavigateToMapping?: () => void;
}

export function UnmappedPaymentMethodsAlert({ unmappedMethods, onNavigateToMapping }: UnmappedPaymentMethodsAlertProps) {
  if (unmappedMethods.length === 0) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Metodi di Pagamento Non Mappati</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Sono stati rilevati {unmappedMethods.length} metodi di pagamento non ancora mappati. 
          Per visualizzare correttamente la ripartizione tra Sito e Marketplace, è necessario mappare questi metodi.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {unmappedMethods.map((method) => (
            <Badge key={method} variant="outline">
              {method}
            </Badge>
          ))}
        </div>
        {onNavigateToMapping && (
          <Button
            onClick={onNavigateToMapping}
            variant="default"
            size="sm"
          >
            Vai al Mapping Pagamenti
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
