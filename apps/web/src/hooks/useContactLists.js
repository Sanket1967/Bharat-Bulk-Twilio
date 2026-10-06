import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const useContactLists = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pb.collection('contact_lists').getFullList({
        sort: '-created',
        $autoCancel: false
      });
      setLists(result);
    } catch (error) {
      toast.error('Failed to load contact lists');
      console.error('Fetch lists error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createList = useCallback(async (listData) => {
    try {
      const userId = pb.authStore.model?.id;
      const newList = await pb.collection('contact_lists').create({
        ...listData,
        userId,
        contact_count: 0
      }, { $autoCancel: false });
      
      toast.success('List created successfully');
      return newList;
    } catch (error) {
      toast.error('Failed to create list');
      console.error('Create list error:', error);
      throw error;
    }
  }, []);

  const updateList = useCallback(async (id, listData) => {
    try {
      const updated = await pb.collection('contact_lists').update(id, listData, { $autoCancel: false });
      toast.success('List updated successfully');
      return updated;
    } catch (error) {
      toast.error('Failed to update list');
      console.error('Update list error:', error);
      throw error;
    }
  }, []);

  const deleteList = useCallback(async (id) => {
    try {
      await pb.collection('contact_lists').delete(id, { $autoCancel: false });
      toast.success('List deleted successfully');
    } catch (error) {
      toast.error('Failed to delete list');
      console.error('Delete list error:', error);
      throw error;
    }
  }, []);

  const getListContacts = useCallback(async (listId) => {
    try {
      const contacts = await pb.collection('contacts').getFullList({
        filter: `list_id = "${listId}"`,
        sort: '-created',
        $autoCancel: false
      });
      return contacts;
    } catch (error) {
      toast.error('Failed to load list contacts');
      console.error('Get list contacts error:', error);
      throw error;
    }
  }, []);

  const updateListContactCount = useCallback(async (listId) => {
    try {
      const contacts = await getListContacts(listId);
      await pb.collection('contact_lists').update(listId, {
        contact_count: contacts.length
      }, { $autoCancel: false });
    } catch (error) {
      console.error('Update list count error:', error);
    }
  }, [getListContacts]);

  return {
    lists,
    loading,
    fetchLists,
    createList,
    updateList,
    deleteList,
    getListContacts,
    updateListContactCount
  };
};