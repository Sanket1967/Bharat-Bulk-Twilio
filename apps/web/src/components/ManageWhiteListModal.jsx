import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

const ManageWhiteListModal = ({ open, onOpenChange, userId }) => {
  const [whitelistNumbers, setWhitelistNumbers] = useState([]);
  const [newNumber, setNewNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchWhitelistNumbers();
    }
  }, [open, userId]);

  const fetchWhitelistNumbers = async () => {
    try {
      const user = await pb.collection('users').getOne(userId, { $autoCancel: false });
      const whitelist = user.whitelist_numbers || [];
      setWhitelistNumbers(Array.isArray(whitelist) ? whitelist : []);
    } catch (error) {
      console.error('Error fetching whitelist:', error);
    }
  };

  const handleAddNumber = async () => {
    if (!newNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(newNumber.trim())) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (whitelistNumbers.includes(newNumber.trim())) {
      toast.error('This number is already whitelisted');
      return;
    }

    setLoading(true);
    try {
      const updatedList = [...whitelistNumbers, newNumber.trim()];
      await pb.collection('users').update(userId, {
        whitelist_numbers: updatedList
      }, { $autoCancel: false });

      setWhitelistNumbers(updatedList);
      setNewNumber('');
      toast.success('Number added to whitelist');
    } catch (error) {
      console.error('Error adding number:', error);
      toast.error('Failed to add number');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNumber = async (numberToDelete) => {
    setLoading(true);
    try {
      const updatedList = whitelistNumbers.filter(num => num !== numberToDelete);
      await pb.collection('users').update(userId, {
        whitelist_numbers: updatedList
      }, { $autoCancel: false });

      setWhitelistNumbers(updatedList);
      toast.success('Number removed from whitelist');
    } catch (error) {
      console.error('Error deleting number:', error);
      toast.error('Failed to remove number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-navy">Manage WhiteList Numbers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter 10-digit phone number"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              maxLength={10}
              className="flex-1"
            />
            <Button 
              onClick={handleAddNumber} 
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <div className="border border-border rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
            {whitelistNumbers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No whitelisted numbers yet
              </div>
            ) : (
              <div className="space-y-2">
                {whitelistNumbers.map((number, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                    <Badge variant="outline" className="font-mono text-sm">
                      +91 {number}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteNumber(number)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageWhiteListModal;