import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Search, Filter, Download, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
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

interface InventoryTableOptimizedProps {
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

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function InventoryTableOptimized({ 
  inventory, 
  loading, 
  pagination, 
  filters, 
  onRefresh 
}: InventoryTableOptimizedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pageSize, setPageSize] = useState(50);

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Effect to trigger refresh when filters change
  useEffect(() => {
    const params = {
      page: 1, // Reset to first page when filters change
      limit: pageSize,
      search: debouncedSearchTerm || undefined,
      brand: brandFilter !== 'all' ? brandFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined
    };
    
    onRefresh(params);
  }, [debouncedSearchTerm, brandFilter, categoryFilter, pageSize, onRefresh]);

  // Memoized calculation for margin
  const calculateMargin = useCallback((sellPrice: number, purchasePrice: number) => {
    if (sellPrice === 0) return '0.0';
    return ((sellPrice - purchasePrice) / sellPrice * 100).toFixed(1);
  }, []);

  // Memoized page change handler
  const handlePageChange = useCallback((newPage: number) => {
    const params = {
      page: newPage,
      limit: pageSize,
      search: debouncedSearchTerm || undefined,
      brand: brandFilter !== 'all' ? brandFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined
    };
    
    onRefresh(params);
  }, [pageSize, debouncedSearchTerm, brandFilter, categoryFilter]); // Remove onRefresh from dependencies

  // Memoized export handler
  const handleExport = useCallback(() => {
    // TODO: Implement CSV export
    console.log('Export functionality to be implemented');
  }, []);

  // Generate pagination buttons
  const paginationButtons = useMemo(() => {
    const buttons = [];
    const maxButtons = 7; // Show max 7 buttons
    const { page, totalPages } = pagination;
    
    if (totalPages <= maxButtons) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      if (page <= 4) {
        buttons.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        buttons.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        buttons.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    
    return buttons;
  }, [pagination]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Inventario Prodotti
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {pagination.total} prodotti totali
            </span>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Esporta CSV
            </Button>
          </div>
        </CardTitle>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, SKU o brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Brand Filter */}
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtra per brand" />
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtra per categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {filters.categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
              <SelectItem value="empty">Senza categoria</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Page Size Selector */}
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                // Loading skeleton
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
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
                    <TableCell>€{item.sellPrice.toFixed(2)}</TableCell>
                    <TableCell>{calculateMargin(item.sellPrice, item.purchasePrice)}%</TableCell>
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Pagina {pagination.page} di {pagination.totalPages} • 
              Mostrando {inventory.length} di {pagination.total} prodotti
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
              
              <div className="flex items-center gap-1">
                {paginationButtons.map((button, index) => (
                  button === '...' ? (
                    <Button key={index} variant="ghost" size="sm" disabled>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      key={index}
                      variant={button === pagination.page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(button as number)}
                      disabled={loading}
                    >
                      {button}
                    </Button>
                  )
                ))}
              </div>
              
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