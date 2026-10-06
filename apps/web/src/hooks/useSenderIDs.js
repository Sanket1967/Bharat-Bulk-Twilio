import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const useSenderIDs = () => {
  const [data, setData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('created');
  const [sortDirection, setSortDirection] = useState('desc');

  const isAdmin = pb.authStore.model?.role === 'admin';

  const fetchSenderIDs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parts = [];
      if (!isAdmin) {
        parts.push(`userId = "${pb.authStore.model?.id}"`);
      }
      if (search) {
        const searchLower = search.toLowerCase().replace(/"/g, '');
        parts.push(`(senderid ~ "${searchLower}" || purpose ~ "${searchLower}")`);
      }
      if (statusFilter && statusFilter !== 'all') {
        parts.push(`status = "${statusFilter}"`);
      }

      const filterString = parts.length ? parts.join(' && ') : '';
      let sortString = sortDirection === 'desc' ? '-' : '+';
      sortString += sortColumn;

      const result = await pb.collection('senderids').getList(page, perPage, {
        filter: filterString || undefined,
        sort: sortString,
        $autoCancel: false,
      });

      setData(result.items);
      setTotalItems(result.totalItems);
    } catch (err) {
      console.error('Fetch SenderIDs error:', err);
      setError(err);
      toast.error('Failed to load Sender IDs');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter, sortColumn, sortDirection, isAdmin]);

  const createSenderID = async (recordData) => {
    try {
      const payload = {
        ...recordData,
        userId: pb.authStore.model.id,
        // Non-admins always create as Pending; admins may set status explicitly.
        status: isAdmin && recordData.status ? recordData.status : 'Pending',
      };
      if (!isAdmin) {
        payload.status = 'Pending';
      }
      const record = await pb.collection('senderids').create(payload, { $autoCancel: false });
      toast.success(
        isAdmin && payload.status === 'Approved'
          ? 'Sender ID created and approved'
          : 'Sender ID submitted for admin approval',
      );
      fetchSenderIDs();
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to create Sender ID');
      throw err;
    }
  };

  const updateSenderID = async (id, recordData) => {
    try {
      const payload = { ...recordData };
      if (!isAdmin) {
        // Users cannot change approval status
        delete payload.status;
      }
      const record = await pb.collection('senderids').update(id, payload, { $autoCancel: false });
      toast.success('Sender ID updated successfully');
      fetchSenderIDs();
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to update Sender ID');
      throw err;
    }
  };

  const setSenderIDStatus = async (id, status) => {
    if (!isAdmin) {
      toast.error('Only admins can approve Sender IDs');
      throw new Error('Admin only');
    }
    try {
      const record = await pb.collection('senderids').update(id, { status }, { $autoCancel: false });
      toast.success(
        status === 'Approved'
          ? 'Sender ID approved'
          : status === 'Rejected'
            ? 'Sender ID rejected'
            : 'Sender ID status updated',
      );
      fetchSenderIDs();
      return record;
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
      throw err;
    }
  };

  const deleteSenderID = async (id) => {
    try {
      await pb.collection('senderids').delete(id, { $autoCancel: false });
      toast.success('Sender ID deleted successfully');
      fetchSenderIDs();
    } catch (err) {
      toast.error(err.message || 'Failed to delete Sender ID');
      throw err;
    }
  };

  return {
    data,
    totalItems,
    loading,
    error,
    isAdmin,
    pagination: { page, perPage, setPage, setPerPage },
    sorting: { sortColumn, sortDirection, setSortColumn, setSortDirection },
    filters: { search, setSearch, statusFilter, setStatusFilter },
    actions: {
      fetchSenderIDs,
      createSenderID,
      updateSenderID,
      deleteSenderID,
      setSenderIDStatus,
    },
  };
};
