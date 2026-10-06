import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Trash2, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useContactLists } from '@/hooks/useContactLists.js';

const ContactListsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  const { lists, loading, fetchLists, createList, updateList, deleteList } = useContactLists();

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingList) {
        await updateList(editingList.id, formData);
      } else {
        await createList(formData);
      }

      setDialogOpen(false);
      setEditingList(null);
      setFormData({ name: '', description: '' });
      fetchLists();
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (list) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this list? Contacts in this list will not be deleted.')) {
      try {
        await deleteList(id);
        fetchLists();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Contact Lists - Bharat Bulk SMS</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Contact Lists - Bharat Bulk SMS</title>
        <meta name="description" content="Organize your contacts into lists for Bharat Bulk SMS campaigns" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-accent">Bharat Bulk SMS Contact Lists</h1>
                <p className="text-muted-foreground">
                  {lists.length} {lists.length === 1 ? 'list' : 'lists'}
                </p>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingList(null);
                  setFormData({ name: '', description: '' });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create list
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-accent/20">
                  <DialogHeader>
                    <DialogTitle className="text-accent">
                      {editingList ? 'Edit list' : 'Create new list'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-accent font-semibold">List name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VIP customers"
                        required
                        className="text-foreground border-accent/20 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-accent font-semibold">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="High-value customers for exclusive offers"
                        className="resize-none text-foreground border-accent/20 focus-visible:ring-primary"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                        {editingList ? 'Update list' : 'Create list'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {lists.length === 0 ? (
              <Card className="text-center py-12 border-accent/20">
                <CardContent>
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-accent">No lists yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first contact list to organize your contacts
                  </p>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first list
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.map((list) => (
                  <Card key={list.id} className="border-accent/20 hover:border-accent/40 hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-accent">{list.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="text-accent hover:text-primary" onClick={() => handleEdit(list)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(list.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {list.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {list.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-accent font-medium">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{list.contact_count || 0} contacts</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ContactListsPage;