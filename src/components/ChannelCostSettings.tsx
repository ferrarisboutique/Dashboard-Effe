import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Save, Percent, Euro, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ChannelCostSettings as ChannelCostSettingsType } from "../types/dashboard";
import { API_BASE_URL, publicAnonKey as ANON_KEY } from "../utils/supabase/info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface PaymentMapping {
  paymentMethod: string;
  macroArea: 'Marketplace' | 'Sito' | 'Altro';
  channel: 'ecommerce' | 'marketplace';
}

interface ChannelCostSettingsProps {
  paymentMappings: Record<string, { macroArea: string; channel: string }>;
  onCostsChange?: () => void;
}

export function ChannelCostSettings({ paymentMappings, onCostsChange }: ChannelCostSettingsProps) {
  const [costs, setCosts] = useState<Record<string, ChannelCostSettingsType>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get channels that need cost settings (Marketplace and Sito only)
  const relevantChannels = React.useMemo(() => {
    return Object.entries(paymentMappings)
      .filter(([_, mapping]) => mapping.macroArea === 'Marketplace' || mapping.macroArea === 'Sito')
      .map(([paymentMethod, mapping]) => ({
        paymentMethod,
        macroArea: mapping.macroArea as 'Marketplace' | 'Sito',
        channel: mapping.channel
      }));
  }, [paymentMappings]);

  // Load existing costs
  useEffect(() => {
    loadCosts();
  }, []);

  const loadCosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/channel-costs`, {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.costs) {
          setCosts(data.costs);
        }
      }
    } catch (error) {
      console.error('Error loading channel costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCosts = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sales/channel-costs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ costs })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Impostazioni costi salvate con successo!');
          onCostsChange?.();
        } else {
          toast.error('Errore nel salvataggio');
        }
      } else {
        toast.error('Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Error saving channel costs:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const updateCost = (
    paymentMethod: string, 
    field: keyof ChannelCostSettingsType, 
    value: number | boolean | string | undefined
  ) => {
    setCosts(prev => {
      const existing = prev[paymentMethod] || {
        paymentMethod,
        macroArea: paymentMappings[paymentMethod]?.macroArea as 'Marketplace' | 'Sito' | 'Altro' || 'Altro',
        applyOnVatIncluded: true
      };
      return {
        ...prev,
        [paymentMethod]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  const getCostValue = (paymentMethod: string, field: keyof ChannelCostSettingsType): any => {
    return costs[paymentMethod]?.[field];
  };

  if (relevantChannels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Impostazioni Costi Canale
          </CardTitle>
          <CardDescription>
            Configura commissioni e costi per ogni canale di vendita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Nessun canale mappato come Marketplace o Sito. 
            Vai alla sezione "Mapping Pagamenti" per configurare i canali.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Impostazioni Costi Canale
        </CardTitle>
        <CardDescription>
          Configura commissioni e costi per ogni canale di vendita. Le commissioni verranno sottratte dalla marginalità.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canale</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Commissione %</TableHead>
                    <TableHead className="text-center">Extra Comm. %</TableHead>
                    <TableHead className="text-center">Costo Fisso €</TableHead>
                    <TableHead className="text-center">Costo Reso €</TableHead>
                    <TableHead className="text-center">Su IVA Inclusa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relevantChannels.map(({ paymentMethod, macroArea }) => (
                    <TableRow key={paymentMethod}>
                      <TableCell className="font-medium">
                        {paymentMethod}
                      </TableCell>
                      <TableCell>
                        <Badge variant={macroArea === 'Marketplace' ? 'default' : 'secondary'}>
                          {macroArea}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="0"
                            className="w-20 text-center"
                            value={getCostValue(paymentMethod, 'commissionPercent') ?? ''}
                            onChange={(e) => updateCost(
                              paymentMethod, 
                              'commissionPercent', 
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="0"
                            className="w-20 text-center"
                            value={getCostValue(paymentMethod, 'extraCommissionPercent') ?? ''}
                            onChange={(e) => updateCost(
                              paymentMethod, 
                              'extraCommissionPercent', 
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            className="w-20 text-center"
                            value={getCostValue(paymentMethod, 'fixedCost') ?? ''}
                            onChange={(e) => updateCost(
                              paymentMethod, 
                              'fixedCost', 
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )}
                          />
                          <Euro className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {macroArea === 'Marketplace' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              className="w-20 text-center"
                              value={getCostValue(paymentMethod, 'returnCost') ?? ''}
                              onChange={(e) => updateCost(
                                paymentMethod, 
                                'returnCost', 
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )}
                            />
                            <Euro className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-center block">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={getCostValue(paymentMethod, 'applyOnVatIncluded') ?? true}
                            onCheckedChange={(checked) => updateCost(
                              paymentMethod, 
                              'applyOnVatIncluded', 
                              checked
                            )}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p><strong>Commissione %:</strong> Percentuale trattenuta dal marketplace (es. 30%)</p>
                <p><strong>Extra Comm. %:</strong> Commissione aggiuntiva (es. fee pagamento 3%)</p>
                <p><strong>Costo Fisso:</strong> Costo per transazione in Euro</p>
                <p><strong>Costo Reso:</strong> Costo per ogni reso (solo Marketplace)</p>
                <p><strong>Su IVA Inclusa:</strong> Se attivo, calcola le commissioni sul prezzo lordo</p>
              </div>
              <Button
                onClick={saveCosts}
                disabled={saving || loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvataggio...' : 'Salva Impostazioni'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


