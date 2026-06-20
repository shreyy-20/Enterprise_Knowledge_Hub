import { useState, useCallback } from 'react';
import { documentsApi } from '../api/documents';
import type { Document, DocumentChunk, PaginatedResponse } from '../types';
import type { GetDocumentsParams } from '../api/documents';
import toast from 'react-hot-toast';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const fetchDocuments = useCallback(async (params: GetDocumentsParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<Document> = await documentsApi.getDocuments(params);
      setDocuments(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocument = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const doc = await documentsApi.getDocument(id);
      setCurrentDocument(doc);
      return doc;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch document');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChunks = useCallback(async (documentId: string) => {
    try {
      const chunksList = await documentsApi.getDocumentChunks(documentId);
      setChunks(chunksList);
    } catch {
      setChunks([]);
    }
  }, []);

  const uploadDocument = useCallback(async (formData: FormData) => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const doc = await documentsApi.uploadDocument(formData, (progress) => {
        setUploadProgress(progress);
      });
      toast.success('Document uploaded successfully');
      return doc;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      await documentsApi.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document deleted');
      return true;
    } catch {
      toast.error('Failed to delete document');
      return false;
    }
  }, []);

  const updateDocument = useCallback(async (id: string, data: Partial<Document>) => {
    try {
      const updated = await documentsApi.updateDocument(id, data);
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setCurrentDocument(updated);
      toast.success('Document updated');
      return updated;
    } catch {
      toast.error('Failed to update document');
      return null;
    }
  }, []);

  const summarizeDocument = useCallback(async (id: string) => {
    setSummarizing(true);
    setSummary(null);
    try {
      const result = await documentsApi.summarizeDocument(id);
      setSummary(result.summary);
      return result.summary;
    } catch {
      toast.error('Failed to generate summary');
      return null;
    } finally {
      setSummarizing(false);
    }
  }, []);

  return {
    documents,
    currentDocument,
    chunks,
    total,
    loading,
    error,
    uploadProgress,
    uploading,
    summary,
    summarizing,
    fetchDocuments,
    fetchDocument,
    fetchChunks,
    uploadDocument,
    deleteDocument,
    updateDocument,
    summarizeDocument,
  };
}
