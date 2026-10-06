import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ContactTable from '@/components/ContactTable.jsx';
import CSVImporter from '@/components/CSVImporter.jsx';
import TagInput from '@/components/TagInput.jsx';
import { useContacts } from '@/hooks/useContacts.js';
import { useContactLists } from '@/hooks/useContactLists.js';

const ContactsPage = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', tags: [], list_id: '' });
  
  const { 
    contacts, 
    loading, 
    pagination, 
    fetchContacts, 
    createContact, 
    updateContact, 
    deleteContact, 
    importContacts, 
    searchContacts,
    toggleOptIn,
    bulkOptIn,
    bulkOptOut
  } = useContacts();
  
  const { lists, fetchLists } = useContactLists();

  useEffect(() => {
    fetchContacts();
    fetchLists();
  }, [fetchContacts, fetchLists]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const contactData = {
        ...formData,
        tags: formData.tags.join(',')
      };

      if (editingContact) {
        await updateContact(editingContact.id, contactData);
      } else {
        await createContact(contactData);
      }

      setCreateDialogOpen(false);
      setEditingContact(null);
      setFormData({ name: '', phone: '', email: '', tags: [], list_id: '' });
      fetchContacts();
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      phone: contact.phone,
      email: contact.email || '',
      tags: contact.tags ? contact.tags.split(',') : [],
      list_id: contact.list_id || ''
    });
    setCreateDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact(id);
        fetchContacts();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleImport = async (contactsData) => {
    try {
      await importContacts(contactsData);
      setImportDialogOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleToggleOptIn = async (id, status) => {
    await toggleOptIn(id, status);
    fetchContacts(pagination.page, pagination.perPage);
  };

  const handleBulkOptIn = async (ids) => {
    await bulkOptIn(ids);
    fetchContacts(pagination.page, pagination.perPage);
  };

  const handleBulkOptOut = async (ids) => {
    await bulkOptOut(ids);
    fetchContacts(pagination.page, pagination.perPage);
  };

  return (
    <>
      <Helmet>
        <title>Contacts - Bharat Bulk SMS</title>
        <meta name="description" content="Manage your Bharat Bulk SMS campaign contacts" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight text-accent">Bharat Bulk SMS Contacts</h1>
                <p className="text-muted-foreground">
                  Showing {pagination.totalItems} total contacts in your database
                </p>
              </div>
              <div className="flex gap-3">
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-background border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl border-accent/20">
                    <CSVImporter onImport={handleImport} onClose={() => setImportDialogOpen(false)} />
                  </DialogContent>
                </Dialog>

                <Dialog open={createDialogOpen} onOpenChange={(open) => {
                  setCreateDialogOpen(open);
                  if (!open) {
                    setEditingContact(null);
                    setFormData({ name: '', phone: '', email: '', tags: [], list_id: '' });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-accent/20">
                    <DialogHeader>
                      <DialogTitle className="text-accent">
                        {editingContact ? 'Edit contact' : 'Add new contact'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-accent font-semibold">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Maya Chen"
                          className="text-foreground border-accent/20 focus-visible:ring-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-accent font-semibold">Phone number *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1234567890"
                          required
                          className="text-foreground border-accent/20 focus-visible:ring-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-accent font-semibold">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="maya@example.com"
                          className="text-foreground border-accent/20 focus-visible:ring-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="list" className="text-accent font-semibold">Contact list</Label>
                        <Select value={formData.list_id} onValueChange={(value) => setFormData({ ...formData, list_id: value })}>
                          <SelectTrigger className="border-accent/20 focus:ring-primary">
                            <SelectValue placeholder="Select a list" />
                          </SelectTrigger>
                          <SelectContent>
                            {lists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                {list.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <TagInput
                        tags={formData.tags}
                        onChange={(tags) => setFormData({ ...formData, tags })}
                      />

                      <div className="flex gap-3 pt-4">
                        <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                          {editingContact ? 'Update contact' : 'Add contact'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <ContactTable
              contacts={contacts}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSearch={searchContacts}
              loading={loading}
              onToggleOptIn={handleToggleOptIn}
              onBulkOptIn={handleBulkOptIn}
              onBulkOptOut={handleBulkOptOut}
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ContactsPage;