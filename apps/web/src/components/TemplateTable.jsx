import React from 'react';
import { ChevronUp, ChevronDown, Edit, Trash2, RotateCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const TemplateTable = ({ 
  data, 
  loading, 
  sorting, 
  onEdit, 
  onDelete 
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="table-header-navy">
            <TableRow className="hover:bg-transparent border-b-0">
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('template_name')}>
                Template Name <SortIcon column="template_name" />
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('senderid')}>
                SenderID <SortIcon column="senderid" />
              </TableHead>
              <TableHead className="text-navy-foreground min-w-[250px]">
                Template
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('last_modified')}>
                Last Modified <SortIcon column="last_modified" />
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('status')}>
                Status <SortIcon column="status" />
              </TableHead>
              <TableHead className="text-navy-foreground cursor-pointer whitespace-nowrap" onClick={() => handleSort('dlt_template_id')}>
                DLT Template ID <SortIcon column="dlt_template_id" />
              </TableHead>
              <TableHead className="text-navy-foreground whitespace-nowrap">
                Remarks
              </TableHead>
              <TableHead className="text-navy-foreground text-center whitespace-nowrap">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center items-center gap-2">
                    <RotateCw className="h-5 w-5 animate-spin text-primary" /> Loading Templates...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-medium">
                  No data available in table
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-navy whitespace-nowrap">{item.template_name}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">{item.senderid}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="max-w-[250px] truncate" title={item.template_content}>
                      {item.template_content}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(item.last_modified || item.updated)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      item.status === 'Active' ? 'bg-success/10 text-success border-success/20' :
                      item.status === 'Inactive' ? 'bg-muted text-muted-foreground border-border' :
                      'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    }>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {item.dlt_template_id || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={item.remarks}>
                    {item.remarks || '—'}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
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

export default TemplateTable;