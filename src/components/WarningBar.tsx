import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button";

interface WarningBarProps {
  message: string;
  count?: number;
  onDismiss?: () => void;
}

export function WarningBar({ message, count, onDismiss }: WarningBarProps) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {message}
              {count !== undefined && count > 0 && (
                <span className="ml-1">({count} {count === 1 ? 'valore' : 'valori'})</span>
              )}
            </p>
          </div>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}



