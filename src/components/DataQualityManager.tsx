import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSalesData } from "../hooks/useSalesData";

export function DataQualityManager() {
  const { fetchOrphans, bulkUpdateSales, learnMappings } = useSalesData(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [brandMap, setBrandMap] = React.useState<Record<string, string>>({});
  const [channelMap, setChannelMap] = React.useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const data = await fetchOrphans();
    setRows(data);
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const updateLocal = (id: string, patch: Partial<any>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const onSave = async () => {
    const updates = rows.filter(r => r.brand || r.channel).map(r => ({ id: r.id, brand: r.brand, channel: r.channel }));
    if (updates.length === 0) return;
    setLoading(true);
    await bulkUpdateSales(updates);
    setLoading(false);
    await load();
  };

  const onLearn = async () => {
    const brandMappings = Object.entries(brandMap).map(([sku, brand]) => ({ sku, brand })).filter(m => m.brand);
    const channelMappings = Object.entries(channelMap).map(([user, channel]) => ({ user, channel })).filter(m => m.channel);
    await learnMappings({ brandMappings, channelMappings });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qualità Dati - Vendite Orfane</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button onClick={load} disabled={loading}>Ricarica</Button>
          <Button onClick={onSave} disabled={loading}>Salva Correzioni</Button>
          <Button variant="outline" onClick={onLearn} disabled={loading}>Apprendi Mapping</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Utente</TableHead>
              <TableHead>Canale</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Importo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.id}</TableCell>
                <TableCell>{new Date(row.date).toLocaleString('it-IT')}</TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <span>{row.user || '-'}</span>
                    <Input placeholder="mappa utente→canale (learn)" className="w-48" onChange={(e) => setChannelMap(prev => ({ ...prev, [row.user || '']: e.target.value }))} />
                  </div>
                </TableCell>
                <TableCell>
                  <Input value={row.channel || ''} onChange={(e) => updateLocal(row.id, { channel: e.target.value })} className="w-40" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-xs">{row.sku}</span>
                    <Input placeholder="mappa sku→brand (learn)" className="w-48" onChange={(e) => setBrandMap(prev => ({ ...prev, [row.sku]: e.target.value }))} />
                  </div>
                </TableCell>
                <TableCell>
                  <Input value={row.brand || ''} onChange={(e) => updateLocal(row.id, { brand: e.target.value })} className="w-40" />
                </TableCell>
                <TableCell>€{(row.amount || 0).toLocaleString('it-IT')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}



