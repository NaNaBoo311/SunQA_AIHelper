import { useState, useCallback } from 'react';
import { uploadDocuments } from '../services/documentService';

export const useFileUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);

  const addFiles = useCallback((newFiles) => {
    // Validate
    const validExtensions = ['.pdf', '.doc', '.docx', '.md', '.txt'];
    const maxSize = 10 * 1024 * 1024;
    
    const validFiles = newFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(ext)) {
        setError(`Invalid file type: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}`);
        return false;
      }
      // check duplicates by name
      if (files.some(f => f.name === file.name)) {
        setError(`Duplicate file: ${file.name}`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  }, [files]);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  }, []);

  const uploadAll = useCallback(async () => {
    if (files.length === 0) return [];
    
    setUploading(true);
    setError(null);
    try {
      const responses = await uploadDocuments(files, (percent) => {
        // Since we upload all at once in one request, progress is combined
        const p = {};
        files.forEach((_, i) => p[i] = percent);
        setProgress(p);
      });
      setFiles([]);
      setProgress({});
      return responses;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setUploading(false);
    }
  }, [files]);

  return { files, uploading, progress, error, addFiles, removeFile, uploadAll };
};
