import React from 'react';
import { ChevronUp, ChevronDown, Edit, Trash2, RotateCw, Check, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SenderIDTable = ({ 
  data, 
  loading, 
  sorting, 
  onEdit, 
  onDelete,
  isAdmin = false,
  onApprove,
  onReject,
}) => {
  const { sortColumn, sortDirection, setSortColumn, setSortDirection } = sorting;

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return <ChevronUp className="h-3 w-3 opacity-30 ml-1 inline-block" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1 inline-block text-primary" /> : 
      <ChevronDown className="h-3 w-3 ml-1 inline-block text-primary" />;
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="table-header-navy">
            <TableRow className="hover:bg-transparent border-b-0">
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('senderid')}>
                SenderID <SortIcon column="senderid" />
              </TableHead>
              {isAdmin && (
                <TableHead className="text-navy-foreground whitespace-nowrap">Owner</TableHead>
              )}
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('purpose')}>
                Purpose <SortIcon column="purpose" />
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('type')}>
                Type <SortIcon column="type" />
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('status')}>
                Status <SortIcon column="status" />
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('is_default')}>
                Is Default <SortIcon column="is_default" />
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('dlt_entity_id')}>
                DLT-EntityId <SortIcon column="dlt_entity_id" />
              </TableHead>
              <TableHead className="text-navy-foreground text-center whitespace-nowrap">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center items-center gap-2">
                    <RotateCw className="h-5 w-5 animate-spin text-primary" /> Loading Sender IDs...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground font-medium">
                  No data available in table
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-navy">{item.senderid}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate" title={item.userId}>
                      {item.userId || '—'}
                    </TableCell>
                  )}
                  <TableCell className="text-sm">{item.purpose}</TableCell>
                  <TableCell className="text-sm">{item.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      item.status === 'Approved' ? 'bg-success/10 text-success border-success/20' :
                      item.status === 'Rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    }>
                      {item.status || 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.is_default ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        Default
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {item.dlt_entity_id || '—'}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {isAdmin && item.status !== 'Approved' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Approve"
                        className="text-success hover:bg-success/10 h-8 w-8 mr-1"
                        onClick={() => onApprove?.(item)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && item.status !== 'Rejected' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reject"
                        className="text-destructive hover:bg-destructive/10 h-8 w-8 mr-1"
                        onClick={() => onReject?.(item)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-navy hover:text-primary hover:bg-primary/10 h-8 w-8 mr-1"
                      onClick={() => onEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SenderIDTable;
