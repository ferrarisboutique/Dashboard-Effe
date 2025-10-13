import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { InventoryItem } from "../types/inventory";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterInfo {
  brands: string[];
  categories: string[];
}

interface InventoryTableSimpleProps {
  inventory: InventoryItem[];
  loading: boolean;
  pagination: PaginationInfo;
  filters: FilterInfo;
  onRefresh: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    brand?: string;
    category?: string;
  }) => Promise<void>;
}

export function InventoryTableSimple({ 
  inventory, 
  loading, 
  pagination, 
  filters, 
  onRefresh 
}: InventoryTableSimpleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sync currentPage with pagination from server
  useEffect(() => {
    if (pagination.page !== currentPage) {
      setCurrentPage(pagination.page);
    }
  }, [pagination.page, currentPage]);

  // Simple debounce for search - only trigger for non-empty search
  useEffect(() => {
    if (searchTerm.length === 0) return; // Don't auto-search on empty string
    
    const timer = setTimeout(() => {
      setCurrentPage(1);
      onRefresh({
        page: 1,
        limit: 50,
        search: searchTerm,
        brand: brandFilter !== 'all' ? brandFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined
      });
    }, 1200); // Increased debounce time to reduce requests

    return () => clearTimeout(timer);
  }, [searchTerm, brandFilter, categoryFilter, onRefresh]);

  // Handle filter changes - removed auto-refresh to prevent excessive requests
  // Filters will be applied when user clicks Search button

  // Calculate margin
  const calculateMargin = useCallback((sellPrice: number, purchasePrice: number) => {
    if (sellPrice === 0) return 'N/D';
    return ((sellPrice - purchasePrice) / sellPrice * 100).toFixed(1);
  }, []);

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    onRefresh({
      page: newPage,
      limit: 50,
      search: searchTerm || undefined,
      brand: brandFilter !== 'all' ? brandFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined
    });
  };

  // Search button handler
  const handleSearch = () => {
    setCurrentPage(1);
    onRefresh({
      page: 1,
      limit: 50,
      search: searchTerm || undefined,
      brand: brandFilter !== 'all' ? brandFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined
    });
  };

  // Clear filters and reload all data
  const clearFilters = () => {
    setSearchTerm('');
    setBrandFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
    // Explicitly reload without any filters to get all data
    onRefresh({ page: 1, limit: 50 });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Inventario Prodotti
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg font-bold">
              {pagination.total.toLocaleString()} prodotti totali
            </Badge>
            {pagination.total > 1000 && (
              <span className="text-xs text-muted-foreground">
                • Usa filtri per cercare
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setBrandFilter('all');
                setCategoryFilter('all');
                setCurrentPage(1);
                onRefresh({ page: 1, limit: 50 });
              }}
            >
              Aggiorna
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Esporta CSV
            </Button>
          </div>
        </CardTitle>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per SKU, brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          {/* Brand Filter */}
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i brand</SelectItem>
              {filters.brands.map(brand => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              {filters.categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
              <SelectItem value="empty">Senza categoria</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm" variant="default">
              🔍 Cerca
            </Button>
            <Button variant="outline" onClick={clearFilters} size="sm">
              ↺ Reset
            </Button>
          </div>
        </div>
        
        {/* Info Banner for Large Inventories */}
        {pagination.total > 1000 && (
          <div className="px-6 pb-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 font-semibold">ℹ️ Inventario Completo Caricato</div>
              </div>
              <p className="text-blue-700 mt-1">
                Tutti i <strong>{pagination.total.toLocaleString()} prodotti</strong> sono salvati nel database. 
                Usa la <strong>paginazione</strong> sotto la tabella per navigare, oppure usa i <strong>filtri</strong> sopra per cercare prodotti specifici.
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Collezione</TableHead>
                <TableHead>Prezzo Acquisto</TableHead>
                <TableHead>Prezzo Vendita</TableHead>
                <TableHead>Margine %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton with better messaging
                <>
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        <span>Caricamento inventario...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : inventory.length > 0 ? (
                inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>
                      {item.category || <span className="text-muted-foreground italic">Nessuna categoria</span>}
                    </TableCell>
                    <TableCell>
                      {item.collection ? (
                        <Badge variant="outline">{item.collection}</Badge>
                      ) : (
                        <span className="text-muted-foreground italic">Nessuna collezione</span>
                      )}
                    </TableCell>
                    <TableCell>€{item.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.sellPrice === 0 ? (
                        <span className="text-muted-foreground italic">Non definito</span>
                      ) : (
                        `€${item.sellPrice.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>
                      {item.sellPrice === 0 ? (
                        <span className="text-muted-foreground">N/D</span>
                      ) : (
                        `${calculateMargin(item.sellPrice, item.purchasePrice)}%`
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nessun prodotto trovato con i filtri selezionati.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Simple Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm font-medium">
              Pagina <Badge variant="outline">{pagination.page}</Badge> di <Badge variant="outline">{pagination.totalPages}</Badge> • 
              Mostrando <span className="font-bold">{inventory.length}</span> di <span className="font-bold text-blue-600">{pagination.total.toLocaleString()}</span> prodotti totali
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Precedente
              </Button>
              
              <span className="text-sm px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext || loading}
              >
                Successiva
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}