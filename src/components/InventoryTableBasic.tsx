import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Search, Download, Package } from "lucide-react";
import { InventoryItem } from "../types/inventory";

interface InventoryTableBasicProps {
  inventory: InventoryItem[];
}

export function InventoryTableBasic({ inventory }: InventoryTableBasicProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Calculate unique brands and categories
  const { brands, categories } = useMemo(() => {
    const brandsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    
    inventory.forEach(item => {
      brandsSet.add(item.brand);
      if (item.category && item.category.trim()) {
        categoriesSet.add(item.category);
      }
    });
    
    return {
      brands: Array.from(brandsSet).sort(),
      categories: Array.from(categoriesSet).sort()
    };
  }, [inventory]);

  // Filter and paginate data
  const filteredData = useMemo(() => {
    let filtered = inventory;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.sku.toLowerCase().includes(search) ||
        item.brand.toLowerCase().includes(search) ||
        (item.category && item.category.toLowerCase().includes(search))
      );
    }
    
    // Apply brand filter
    if (brandFilter !== 'all') {
      filtered = filtered.filter(item => item.brand === brandFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'empty') {
        filtered = filtered.filter(item => !item.category || item.category.trim() === '');
      } else {
        filtered = filtered.filter(item => item.category === categoryFilter);
      }
    }
    
    return filtered;
  }, [inventory, searchTerm, brandFilter, categoryFilter]);

  // Paginate filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Calculate margin
  const calculateMargin = useCallback((sellPrice: number, purchasePrice: number) => {
    if (sellPrice === 0) return 'N/D';
    return ((sellPrice - purchasePrice) / sellPrice * 100).toFixed(1);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setBrandFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Reset search when it's cleared
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (value === '') {
      setCurrentPage(1);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventario Prodotti
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredData.length} di {inventory.length} prodotti
            </span>
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
              placeholder="Cerca per SKU, brand, categoria..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
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
              {brands.map(brand => (
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
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
              <SelectItem value="empty">Senza categoria</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm">
              Cerca
            </Button>
            <Button variant="outline" onClick={clearFilters} size="sm">
              Reset
            </Button>
          </div>
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
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
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
                    {inventory.length === 0 
                      ? "Nessun prodotto nell'inventario. Carica i dati per iniziare."
                      : "Nessun prodotto trovato con i filtri selezionati."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Simple Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Pagina {currentPage} di {totalPages} • 
              Mostrando {paginatedData.length} di {filteredData.length} prodotti
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Precedente
              </Button>
              
              <span className="text-sm px-2">
                {currentPage} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Successiva
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}