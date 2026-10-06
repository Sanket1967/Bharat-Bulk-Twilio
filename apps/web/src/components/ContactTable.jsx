import React, { useState } from 'react';
import { Search, Trash2, Edit, MoreVertical, ToggleLeft, ToggleRight, CheckSquare, XSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ContactTable = ({ contacts, onEdit, onDelete, onSearch, loading, onToggleOptIn, onBulkOptIn, onBulkOptOut }) => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [optInFilter, setOptInFilter] = useState('all');

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContacts(contacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (id, checked) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, id]);
    } else {
      setSelectedContacts(selectedContacts.filter(cid => cid !== id));
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query, optInFilter === 'all' ? '' : optInFilter);
  };

  const handleFilterChange = (value) => {
    setOptInFilter(value);
    onSearch(searchQuery, value === 'all' ? '' : value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleBulkAction = (action) => {
    if (action === 'opt-in' && window.confirm(`Opt-in ${selectedContacts.length} contacts?`)) {
      onBulkOptIn(selectedContacts);
      setSelectedContacts([]);
    } else if (action === 'opt-out' && window.confirm(`Opt-out ${selectedContacts.length} contacts?`)) {
      onBulkOptOut(selectedContacts);
      setSelectedContacts([]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 border-accent/20 focus-visible:ring-primary"
            />
          </div>
          <Select value={optInFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[140px] border-accent/20 focus:ring-primary">
              <SelectValue placeholder="Opt-in Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="true">Opted In</SelectItem>
              <SelectItem value="false">Opted Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedContacts.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkAction('opt-in')} className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
              <CheckSquare className="h-4 w-4 mr-2" />
              Opt-in
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction('opt-out')} className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <XSquare className="h-4 w-4 mr-2" />
              Opt-out
            </Button>
            <Button variant="destructive" size="sm" onClick={() => {
              if(window.confirm('Delete selected?')){
                 selectedContacts.forEach(id => onDelete(id));
                 setSelectedContacts([]);
              }
            }}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedContacts.length}
            </Button>
          </div>
        )}
      </div>

      <div className="border border-accent/20 rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-accent hover:bg-accent">
              <TableHead className="w-12 text-accent-foreground">
                <Checkbox
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-accent-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </TableHead>
              <TableHead className="text-accent-foreground">Name</TableHead>
              <TableHead className="text-accent-foreground">Phone</TableHead>
              <TableHead className="text-accent-foreground">Status</TableHead>
              <TableHead className="text-accent-foreground">List</TableHead>
              <TableHead className="text-accent-foreground">Added</TableHead>
              <TableHead className="w-12 text-accent-foreground"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No contacts found
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id} className={!contact.opted_in ? 'opacity-75 bg-muted/20' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) => handleSelectContact(contact.id, checked)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-accent">{contact.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{contact.email || ''}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onToggleOptIn(contact.id, !contact.opted_in)}
                        className="focus:outline-none transition-transform hover:scale-105 active:scale-95"
                        title={contact.opted_in ? 'Click to opt out' : 'Click to opt in'}
                      >
                        {contact.opted_in ? (
                          <ToggleRight className="h-6 w-6 text-secondary" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                      <Badge variant="outline" className={!contact.opted_in ? 'bg-muted text-muted-foreground border-muted-foreground/20' : 'bg-secondary/10 text-secondary border-secondary/20'}>
                        {contact.opted_in ? 'Subscribed' : 'Opted Out'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {contact.expand?.list_id?.name || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(contact.created)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-accent hover:text-primary">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(contact)} className="hover:text-primary">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(contact.id)}
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ContactTable;