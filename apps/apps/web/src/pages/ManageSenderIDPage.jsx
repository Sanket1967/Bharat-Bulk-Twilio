import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import AlertBanner from '@/components/AlertBanner.jsx';
import SenderIDTable from '@/components/SenderIDTable.jsx';
import PaginationControls from '@/components/PaginationControls.jsx';
import AddEditSenderIDModal from '@/components/AddEditSenderIDModal.jsx';
import DeleteSenderIDDialog from '@/components/DeleteSenderIDDialog.jsx';
import { useSenderIDs } from '@/hooks/useSenderIDs.js';

const ManageSenderIDPage = () => {
  const { 
    data, 
    loading, 
    totalItems, 
    pagination, 
    sorting, 
    filters, 
    actions,
    isAdmin,
  } = useSenderIDs();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      filters.setSearch(debouncedSearch);
      pagination.setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    actions.fetchSenderIDs();
  }, [actions.fetchSenderIDs]);

  const handleAdd = () => {
    setSelectedItem(null);
    setIsEditModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (selectedItem) {
      await actions.updateSenderID(selectedItem.id, formData);
    } else {
      await actions.createSenderID(formData);
    }
  };

  const handleConfirmDelete = async (id) => {
    await actions.deleteSenderID(id);
  };

  const handleApprove = async (item) => {
    await actions.setSenderIDStatus(item.id, 'Approved');
  };

  const handleReject = async (item) => {
    await actions.setSenderIDStatus(item.id, 'Rejected');
  };

  return (
    <>
      <Helmet>
        <title>Manage SenderID - Bharat Bulk SMS</title>
        <meta name="description" content="Submit and manage DLT Sender IDs. New IDs stay Pending until an admin approves them for SMS campaigns." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            
            <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Link to="/" className="hover:text-navy transition-colors">Home</Link>
              <span>/</span>
              <Link to="/dashboard" className="hover:text-navy transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-navy font-medium">Manage SenderID</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-navy">Manage SenderID</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin
                    ? 'Review pending requests and approve Sender IDs before users can send campaigns.'
                    : 'New Sender IDs require admin approval before they can be used in campaigns.'}
                </p>
              </div>
              <Button onClick={handleAdd} className="bg-navy text-navy-foreground hover:bg-navy/90">
                <Plus className="h-4 w-4 mr-2" /> Add New SenderID
              </Button>
            </div>

            <AlertBanner message="Alert! For all promotional campaigns, please use RCS messages instead of SMS. RCS ensures richer content." />

            <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-end items-center">
              <Select
                value={filters.statusFilter || 'all'}
                onValueChange={(v) => {
                  filters.setStatusFilter(v);
                  pagination.setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Sender IDs..."
                  value={debouncedSearch}
                  onChange={(e) => setDebouncedSearch(e.target.value)}
                  className="pl-9 border-border focus-visible:ring-primary w-full"
                />
              </div>
            </div>

            <SenderIDTable 
              data={data}
              loading={loading}
              sorting={sorting}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              isAdmin={isAdmin}
              onApprove={handleApprove}
              onReject={handleReject}
            />

            {!loading && totalItems > 0 && (
              <PaginationControls 
                page={pagination.page}
                setPage={pagination.setPage}
                perPage={pagination.perPage}
                setPerPage={pagination.setPerPage}
                totalItems={totalItems}
              />
            )}

          </div>
        </main>

        <Footer />
      </div>

      <AddEditSenderIDModal 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleFormSubmit}
        initialData={selectedItem}
      />

      <DeleteSenderIDDialog 
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        senderIdItem={selectedItem}
      />
    </>
  );
};

export default ManageSenderIDPage;
