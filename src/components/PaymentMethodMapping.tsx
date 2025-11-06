import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Sale } from "../types/dashboard";

const API_BASE_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || 'https://sbtkymupbjyikfwjeumk.supabase.co/functions/v1/make-server-49468be0';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo';

interface PaymentMapping {
  paymentMethod: string;
  macroArea: 'Marketplace' | 'Sito' | 'Altro';
  channel: 'ecommerce' | 'marketplace';
}

interface PaymentMethodMappingProps {
  sales: Sale[];
  onMappingChange?: () => void;
}

export function PaymentMethodMapping({ sales, onMappingChange }: PaymentMethodMappingProps) {
  const [mappings, setMappings] = useState<Record<string, PaymentMapping>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newMacroArea, setNewMacroArea] = useState<'Marketplace' | 'Sito' | 'Altro'>('Altro');

  // Extract unique payment methods from sales
  const uniquePaymentMethods = React.useMemo(() => {
    const methods = new Set<string>();
    sales.forEach(sale => {
      if (sale.paymentMethod) {
        methods.add(sale.paymentMethod);
      }
    });
    return Array.from(methods).sort();
  }, [sales]);

  // Load existing mappings
  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/payment-mappings`, {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.mappings) {
          setMappings(data.mappings);
        }
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMappings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/payment-mappings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mappings })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Mapping salvato con successo!');
          onMappingChange?.();
        } else {
          toast.error('Errore nel salvataggio');
        }
      } else {
        toast.error('Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const updateMapping = (paymentMethod: string, macroArea: 'Marketplace' | 'Sito' | 'Altro') => {
    const channel = macroArea === 'Sito' ? 'ecommerce' : macroArea === 'Marketplace' ? 'marketplace' : 'ecommerce';
    setMappings(prev => ({
      ...prev,
      [paymentMethod]: { paymentMethod, macroArea, channel }
    }));
  };

  const addNewMapping = () => {
    if (!newPaymentMethod.trim()) {
      toast.error('Inserisci un metodo di pagamento');
      return;
    }
    if (mappings[newPaymentMethod]) {
      toast.error('Mapping già esistente');
      return;
    }
    updateMapping(newPaymentMethod.trim(), newMacroArea);
    setNewPaymentMethod('');
    setNewMacroArea('Altro');
  };

  const removeMapping = (paymentMethod: string) => {
    setMappings(prev => {
      const updated = { ...prev };
      delete updated[paymentMethod];
      return updated;
    });
  };

  const unmappedMethods = uniquePaymentMethods.filter(method => !mappings[method]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mapping Metodi di Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new mapping */}
          <div className="flex items-center gap-2 p-4 border rounded-lg">
            <Input
              placeholder="Metodo di pagamento (es: miinto, Zalando)"
              value={newPaymentMethod}
              onChange={(e) => setNewPaymentMethod(e.target.value)}
              className="flex-1"
            />
            <Select value={newMacroArea} onValueChange={(v: 'Marketplace' | 'Sito' | 'Altro') => setNewMacroArea(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Marketplace">Marketplace</SelectItem>
                <SelectItem value="Sito">Sito</SelectItem>
                <SelectItem value="Altro">Altro</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addNewMapping} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Aggiungi
            </Button>
          </div>

          {/* Existing mappings */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Mapping esistenti</h3>
            {Object.keys(mappings).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun mapping configurato</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(mappings).map(([method, mapping]) => (
                  <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{method}</Badge>
                    <Select
                      value={mapping.macroArea}
                      onValueChange={(v: 'Marketplace' | 'Sito' | 'Altro') => updateMapping(method, v)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Marketplace">Marketplace</SelectItem>
                        <SelectItem value="Sito">Sito</SelectItem>
                        <SelectItem value="Altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMapping(method)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Unmapped methods */}
          {unmappedMethods.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-yellow-600">Metodi non mappati ({unmappedMethods.length})</h3>
              <div className="flex flex-wrap gap-2">
                {unmappedMethods.map(method => (
                  <Badge key={method} variant="outline" className="bg-yellow-50">
                    {method}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={saveMappings}
            disabled={saving || loading}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvataggio...' : 'Salva Mapping'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

