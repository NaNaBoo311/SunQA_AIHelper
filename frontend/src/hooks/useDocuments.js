import { useState, useCallback } from 'react';
import { fetchAllDocuments, removeDocument, fetchCombinedContext } from '../services/documentService';

export const useDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchAllDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDoc = useCallback(async (id) => {
    try {
      await removeDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const getCombinedMarkdown = useCallback(async () => {
    try {
      const context = await fetchCombinedContext();
      return context;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // alias refreshContext to fetchDocs
  const refreshContext = fetchDocs;

  return { documents, loading, error, fetchDocuments: fetchDocs, deleteDoc, refreshContext, getCombinedMarkdown };
};
