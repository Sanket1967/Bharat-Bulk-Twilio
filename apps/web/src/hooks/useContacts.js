import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const useContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, perPage: 20, totalPages: 1, totalItems: 0 });

  const fetchContacts = useCallback(async (page = 1, perPage = 20, searchQuery = '', listId = '', optInStatus = '') => {
    setLoading(true);
    try {
      let filter = [];
      if (searchQuery) {
        filter.push(`(name ~ "${searchQuery}" || phone ~ "${searchQuery}" || email ~ "${searchQuery}")`);
      }
      if (listId) {
        filter.push(`list_id = "${listId}"`);
      }
      
      // Note: backend listRule may strictly enforce opted_in=true, but we still pass explicit filters if requested.
      if (optInStatus === 'true') {
        filter.push(`opted_in = true`);
      } else if (optInStatus === 'false') {
        filter.push(`opted_in = false`);
      }

      const filterString = filter.join(' && ');

      const result = await pb.collection('contacts').getList(page, perPage, {
        filter: filterString,
        sort: '-created',
        expand: 'list_id',
        $autoCancel: false
      });

      setContacts(result.items);
      setPagination({
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems
      });
    } catch (error) {
      toast.error('Failed to load contacts');
      console.error('Fetch contacts error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createContact = useCallback(async (contactData) => {
    try {
      const userId = pb.authStore.model?.id;
      const newContact = await pb.collection('contacts').create({
        ...contactData,
        userId,
        opted_in: true
      }, { $autoCancel: false });
      
      toast.success('Contact created successfully');
      return newContact;
    } catch (error) {
      toast.error('Failed to create contact');
      console.error('Create contact error:', error);
      throw error;
    }
  }, []);

  const updateContact = useCallback(async (id, contactData) => {
    try {
      const updated = await pb.collection('contacts').update(id, contactData, { $autoCancel: false });
      toast.success('Contact updated successfully');
      return updated;
    } catch (error) {
      toast.error('Failed to update contact');
      console.error('Update contact error:', error);
      throw error;
    }
  }, []);

  const deleteContact = useCallback(async (id) => {
    try {
      await pb.collection('contacts').delete(id, { $autoCancel: false });
      toast.success('Contact deleted successfully');
    } catch (error) {
      toast.error('Failed to delete contact');
      console.error('Delete contact error:', error);
      throw error;
    }
  }, []);

  const importContacts = useCallback(async (contactsArray, listId = null) => {
    const userId = pb.authStore.model?.id;
    const results = { success: 0, failed: 0, errors: [] };

    for (const contact of contactsArray) {
      try {
        await pb.collection('contacts').create({
          ...contact,
          userId,
          list_id: listId || contact.list_id,
          opted_in: true
        }, { $autoCancel: false });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ contact, error: error.message });
      }
    }

    if (results.success > 0) {
      toast.success(`Imported ${results.success} contacts successfully`);
      
      await pb.collection('system_logs').create({
        user_id: userId,
        action_type: 'contact_imported',
        details: `Imported ${results.success} contacts via CSV`
      }, { $autoCancel: false }).catch(() => {});
    }
    if (results.failed > 0) {
      toast.error(`Failed to import ${results.failed} contacts`);
    }

    return results;
  }, []);

  const toggleOptIn = useCallback(async (contactId, optedIn, reason = 'Manual toggle') => {
    try {
      const userId = pb.authStore.model?.id;
      await pb.collection('contacts').update(contactId, {
        opted_in: optedIn,
        opt_out_date: optedIn ? null : new Date().toISOString()
      }, { $autoCancel: false });

      await pb.collection('opt_in_history').create({
        contact_id: contactId,
        user_id: userId,
        action: optedIn ? 'opted_in' : 'opted_out',
        reason
      }, { $autoCancel: false });

      await pb.collection('system_logs').create({
        user_id: userId,
        action_type: 'opt_in_changed',
        details: `Contact ${contactId} ${optedIn ? 'opted in' : 'opted out'}`
      }, { $autoCancel: false }).catch(() => {});

      toast.success(`Contact successfully ${optedIn ? 'opted in' : 'opted out'}`);
    } catch (error) {
      toast.error('Failed to change opt-in status');
      console.error('Toggle opt-in error:', error);
      throw error;
    }
  }, []);

  const bulkOptIn = useCallback(async (contactIds) => {
    let successCount = 0;
    for (const id of contactIds) {
      try {
        await toggleOptIn(id, true, 'Bulk opt-in action');
        successCount++;
      } catch (err) {
        console.error(`Failed to bulk opt in contact ${id}`, err);
      }
    }
    toast.success(`Successfully opted in ${successCount} contacts`);
  }, [toggleOptIn]);

  const bulkOptOut = useCallback(async (contactIds) => {
    let successCount = 0;
    for (const id of contactIds) {
      try {
        await toggleOptIn(id, false, 'Bulk opt-out action');
        successCount++;
      } catch (err) {
        console.error(`Failed to bulk opt out contact ${id}`, err);
      }
    }
    toast.success(`Successfully opted out ${successCount} contacts`);
  }, [toggleOptIn]);

  const searchContacts = useCallback(async (query, optInStatus = '') => {
    return fetchContacts(1, 20, query, '', optInStatus);
  }, [fetchContacts]);

  return {
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
  };
};