import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import AlertBanner from '@/components/AlertBanner.jsx';
import TemplateTable from '@/components/TemplateTable.jsx';
import PaginationControls from '@/components/PaginationControls.jsx';
import AddEditTemplateModal from '@/components/AddEditTemplateModal.jsx';
import DeleteTemplateDialog from '@/components/DeleteTemplateDialog.jsx';
import { useTemplates } from '@/hooks/useTemplates.js';
import { toast } from 'sonner';

const ManageTemplatePage = () => {
  const { 
    data, 
    loading, 
    totalItems, 
    pagination, 
    sorting, 
    filters, 
    actions 
  } = useTemplates();

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
    actions.fetchTemplates();
  }, [actions.fetchTemplates]);

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
      await actions.updateTemplate(selectedItem.id, formData);
    } else {
      await actions.createTemplate(formData);
    }
  };

  const handleConfirmDelete = async (id) => {
    await actions.deleteTemplate(id);
  };

  const handleDownload = () => {
    toast.success("Download feature coming soon.");
  };

  return (
    <>
      <Helmet>
        <title>Manage Template - Bharat Bulk SMS</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            
            {/* Breadcrumb */}
            <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Link to="/" className="hover:text-navy transition-colors">Home</Link>
              <span>/</span>
              <Link to="/dashboard" className="hover:text-navy transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-navy font-medium">Manage Template</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold text-navy">Manage Template</h1>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleDownload} className="border-border text-navy hover:bg-muted">
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
                <Button onClick={handleAdd} className="bg-navy text-navy-foreground hover:bg-navy/90">
                  <Plus className="h-4 w-4 mr-2" /> Add New Template
                </Button>
              </div>
            </div>

            <AlertBanner message="Alert! For all promotional campaigns, please use RCS messages instead of SMS. RCS ensures richer content." />

            <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-end items-center">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Templates..."
                  value={debouncedSearch}
                  onChange={(e) => setDebouncedSearch(e.target.value)}
                  className="pl-9 border-border focus-visible:ring-primary w-full"
                />
              </div>
            </div>

            <TemplateTable 
              data={data}
              loading={loading}
              sorting={sorting}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
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

      <AddEditTemplateModal 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen}
        onSubmit={handleFormSubmit}
        initialData={selectedItem}
      />

      <DeleteTemplateDialog 
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        templateItem={selectedItem}
      />
    </>
  );
};

export default ManageTemplatePage;