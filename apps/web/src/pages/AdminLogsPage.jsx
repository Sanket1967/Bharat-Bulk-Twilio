import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import pb from '@/lib/pocketbaseClient';

const AdminLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        let filter = '';
        if (search) {
          filter = `action_type ~ "${search}" || details ~ "${search}"`;
        }
        const res = await pb.collection('system_logs').getList(1, 100, {
          sort: '-created',
          filter,
          $autoCancel: false
        });
        setLogs(res.items);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    const debounce = setTimeout(() => fetchLogs(), 400);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <>
      <Helmet>
        <title>Audit Logs - Bharat Bulk SMS</title>
        <meta name="description" content="System audit logs for Bharat Bulk SMS" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <div className="bg-accent text-accent-foreground py-8 mb-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Bharat Bulk SMS Audit Logs</h1>
            <p className="text-accent-foreground/80">Review chronological system events and administrative actions</p>
          </div>
        </div>

        <main className="flex-1 pb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="mb-6 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter by action or details..." 
                className="pl-10 border-accent/20 focus-visible:ring-primary"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="bg-card rounded-xl border border-accent/20 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-accent hover:bg-accent">
                    <TableHead className="w-[180px] text-accent-foreground">Timestamp</TableHead>
                    <TableHead className="w-[150px] text-accent-foreground">Action</TableHead>
                    <TableHead className="text-accent-foreground">User ID</TableHead>
                    <TableHead className="text-accent-foreground">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                     <TableRow><TableCell colSpan={4} className="text-center py-8">Fetching logs...</TableCell></TableRow>
                  ) : logs.length === 0 ? (
                     <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No logs matched your search</TableCell></TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {new Date(log.created).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium text-accent">
                          {log.action_type}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.user_id || 'System'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminLogsPage;