import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const useTemplates = () => {
  const [data, setData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('created');
  const [sortDirection, setSortDirection] = useState('desc');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let filterString = `userId = "${pb.authStore.model?.id}"`;
      
      if (search) {
        const searchLower = search.toLowerCase();
        filterString += ` && (template_name ~ "${searchLower}" || template_content ~ "${searchLower}" || senderid ~ "${searchLower}")`;
      }

      let sortString = sortDirection === 'desc' ? '-' : '+';
      sortString += sortColumn;

      const result = await pb.collection('templates').getList(page, perPage, {
        filter: filterString,
        sort: sortString,
        $autoCancel: false
      });

      setData(result.items);
      setTotalItems(result.totalItems);
    } catch (err) {
      console.error('Fetch Templates error:', err);
      setError(err);
      toast.error('Failed to load Templates');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, sortColumn, sortDirection]);

  const createTemplate = async (recordData) => {
    try {
      recordData.userId = pb.authStore.model.id;
      const record = await pb.collection('templates').create(recordData, { $autoCancel: false });
      toast.success('Template created successfully');
      fetchTemplates();
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to create Template');
      throw err;
    }
  };

  const updateTemplate = async (id, recordData) => {
    try {
      const record = await pb.collection('templates').update(id, recordData, { $autoCancel: false });
      toast.success('Template updated successfully');
      fetchTemplates();
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to update Template');
      throw err;
    }
  };

  const deleteTemplate = async (id) => {
    try {
      await pb.collection('templates').delete(id, { $autoCancel: false });
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || 'Failed to delete Template');
      throw err;
    }
  };

  return {
    data,
    totalItems,
    loading,
    error,
    pagination: { page, perPage, setPage, setPerPage },
    sorting: { sortColumn, sortDirection, setSortColumn, setSortDirection },
    filters: { search, setSearch },
    actions: { fetchTemplates, createTemplate, updateTemplate, deleteTemplate }
  };
};