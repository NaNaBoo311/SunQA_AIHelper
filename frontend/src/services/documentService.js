import * as api from './api';


export const uploadDocuments = async (files, onProgress) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  try {
    const response = await api.uploadFiles(formData, onProgress);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Upload failed');
  }
};

export const fetchAllDocuments = async () => {
  try {
    const response = await api.getDocuments();
    return response.data.documents;
  } catch (error) {
    throw new Error('Failed to fetch documents');
  }
};

export const fetchDocumentMarkdown = async (id) => {
  try {
    const response = await api.getDocumentMarkdown(id);
    return response.data.markdown_content;
  } catch (error) {
    throw new Error('Failed to fetch markdown');
  }
};

export const fetchCombinedContext = async () => {
  try {
    const response = await api.getCombinedContext();
    return response.data.combined_markdown;
  } catch (error) {
    throw new Error('Failed to fetch context');
  }
};

export const removeDocument = async (id) => {
  try {
    const response = await api.deleteDocument(id);
    return response.data;
  } catch (error) {
    throw new Error('Failed to delete document');
  }
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (isoString) => {
  return new Date(isoString).toLocaleString();
};

export const runAnalyzer = async () => {
  try {
    const response = await api.postAnalyze();
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail || 'Analyzer agent failed';
    throw new Error(detail);
  }
};

export const getAnalyzerResult = async () => {
  try {
    const response = await api.getAnalyze();
    return response.data;
  } catch (error) {
    console.error('Failed to fetch previous analysis result', error);
    return { result: null };
  }
};

export const runTaskBuilder = async () => {
  try {
    const response = await api.postTaskBuilder();
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail || 'Task Builder agent failed';
    throw new Error(detail);
  }
};

export const getTaskBuilderResult = async () => {
  try {
    const response = await api.getTaskBuilder();
    return response.data;
  } catch (error) {
    console.error('Failed to fetch previous task builder result', error);
    return { result: null };
  }
};

export const runGenerator = async () => {
  try {
    const response = await api.postGenerator();
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail || 'Generator agent failed';
    throw new Error(detail);
  }
};

export const getGeneratorResult = async () => {
  try {
    const response = await api.getGenerator();
    return response.data;
  } catch (error) {
    console.error('Failed to fetch previous generator result', error);
    return { result: null };
  }
};

export const runValidator = async () => {
  try {
    const response = await api.postValidator();
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail || 'Validator agent failed';
    throw new Error(detail);
  }
};

export const getValidatorResult = async () => {
  try {
    const response = await api.getValidator();
    return response.data;
  } catch (error) {
    console.error('Failed to fetch previous validator result', error);
    return { result: null };
  }
};

export const applyFixes = async () => {
  try {
    const response = await api.postApplyFixes();
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Auto-fix failed');
  }
};

export const fetchFinalTable = async () => {
  try {
    const response = await api.getFinalTable();
    return response.data;
  } catch (error) {
    console.error('Failed to fetch final table', error);
    return { result: null };
  }
};

export const saveFinalTable = async (notion_sync_package, need_review) => {
  try {
    await api.putFinalTable({ notion_sync_package, need_review });
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to save final table');
  }
};

export const fetchGuidelines = async () => {
  try {
    const response = await api.getGuidelines();
    return response.data.guidelines || '';
  } catch (error) {
    return '';
  }
};

export const saveGuidelines = async (guidelines) => {
  try {
    await api.putGuidelines(guidelines);
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to save guidelines');
  }
};

export const rerunPipeline = async () => {
  try {
    const response = await api.postRerunPipeline();
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Pipeline re-run failed');
  }
};



