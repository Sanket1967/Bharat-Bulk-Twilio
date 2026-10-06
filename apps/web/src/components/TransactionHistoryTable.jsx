import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { format } from 'date-fns';

const TransactionHistoryTable = ({ userId, refreshTrigger }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('created');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchTransactions();
  }, [userId, page, perPage, sortField, sortDirection, refreshTrigger]);

  const fetchTransactions = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const sortString = sortDirection === 'desc' ? `-${sortField}` : sortField;
      const result = await pb.collection('user_credits_log').getList(page, perPage, {
        filter: `user_id = "${userId}"`,
        sort: sortString,
        $autoCancel: false
      });
      
      setTransactions(result.items);
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalPages = Math.ceil(totalItems / perPage);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return '—';
    }
  };

  const getCreditTypeLabel = (transaction) => {
    const typeLabels = {
      'sms': 'SMS (Domestic)',
      'transactional': 'Transactional',
      'promotional': 'Promotional',
      'voice': 'Voice',
      'misscall': 'MissCall',
      'international': 'International SMS',
    };
    const type = transaction.credit_type;
    if (type && typeLabels[type]) return typeLabels[type];
    if (type) return type;
    // Legacy entries without a credit_type fall back to the action.
    return transaction.action === 'spent' ? 'Credit Spent' : 'Credit Added';
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-teal-600 text-white">
          <div className="grid grid-cols-5 gap-4 p-3 font-semibold text-sm">
            <div>Date</div>
            <div>Funds</div>
            <div>Credit Type</div>
            <div>Unit Per SMS</div>
            <div>Remarks</div>
          </div>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          Loading transaction history...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-teal-600">
            <TableRow className="hover:bg-teal-700 border-b-0">
              <TableHead 
                className="text-white cursor-pointer hover:text-white/90"
                onClick={() => handleSort('created')}
              >
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead 
                className="text-white cursor-pointer hover:text-white/90"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  Funds
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead 
                className="text-white cursor-pointer hover:text-white/90"
                onClick={() => handleSort('action')}
              >
                <div className="flex items-center gap-1">
                  Credit Type
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-white">
                Unit Per SMS
              </TableHead>
              <TableHead className="text-white">
                Remarks
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No transaction history found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {formatDate(transaction.created)}
                  </TableCell>
                  <TableCell className={transaction.action === 'added' ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                    {transaction.action === 'added' ? '+' : '-'}{transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {getCreditTypeLabel(transaction)}
                  </TableCell>
                  <TableCell>
                    {transaction.unit_per_sms || '1.00'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {transaction.remarks || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalItems > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({totalItems} total)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryTable;