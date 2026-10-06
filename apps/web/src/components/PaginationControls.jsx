import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PaginationControls = ({ 
  page, 
  setPage, 
  perPage, 
  setPerPage, 
  totalItems 
}) => {
  const totalPages = Math.ceil(totalItems / perPage) || 1;
  const startItem = totalItems === 0 ? 0 : ((page - 1) * perPage) + 1;
  const endItem = Math.min(page * perPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm py-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground whitespace-nowrap">Show</span>
        <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
          <SelectTrigger className="w-[80px] border-border focus:ring-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground whitespace-nowrap">entries</span>
        <span className="text-muted-foreground ml-4 hidden sm:inline">
          Showing {startItem} to {endItem} of {totalItems} entries
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-border text-navy disabled:opacity-50"
          onClick={() => setPage(1)}
          disabled={page === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-border text-navy disabled:opacity-50"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="px-4 py-1.5 rounded-md bg-navy text-navy-foreground font-medium text-sm mx-1">
          {page}
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-border text-navy disabled:opacity-50"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-border text-navy disabled:opacity-50"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;