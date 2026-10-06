import React, { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CSVImporter = ({ onImport, onClose }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain headers and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const contacts = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const contact = {};

      headers.forEach((header, index) => {
        if (values[index]) {
          contact[header] = values[index];
        }
      });

      if (contact.phone) {
        contacts.push(contact);
      }
    }

    return contacts;
  };

  const handleFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const text = await selectedFile.text();
      const contacts = parseCSV(text);
      
      if (contacts.length === 0) {
        toast.error('No valid contacts found in CSV');
        setParsing(false);
        return;
      }

      toast.success(`Found ${contacts.length} contacts`);
      onImport(contacts);
      setParsing(false);
    } catch (error) {
      toast.error('Failed to parse CSV file');
      console.error('CSV parse error:', error);
      setParsing(false);
    }
  }, [onImport]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Import contacts from CSV</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="csv-upload"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />
        
        <label htmlFor="csv-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            {file ? (
              <FileText className="h-16 w-16 text-primary" />
            ) : (
              <Upload className="h-16 w-16 text-muted-foreground" />
            )}
            
            {file ? (
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Drop your CSV file here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
            )}
          </div>
        </label>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-sm">
        <p className="font-medium mb-2">CSV format requirements:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• First row must contain headers: phone, name, email, tags</li>
          <li>• Phone number is required for each contact</li>
          <li>• Other fields are optional</li>
        </ul>
      </div>

      {parsing && (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Parsing CSV...</p>
        </div>
      )}
    </div>
  );
};

export default CSVImporter;