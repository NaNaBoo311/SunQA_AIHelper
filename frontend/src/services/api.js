import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

export const axiosInstance = api;

export const uploadFiles = async (formData, onProgress) => {
  return api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
};

export const getDocuments = async () => {
  return api.get('/documents');
};

export const getDocumentMarkdown = async (id) => {
  return api.get(`/documents/${id}/markdown`);
};

export const getCombinedContext = async () => {
  return api.get('/retriever/context');
};

export const deleteDocument = async (id) => {
  return api.delete(`/documents/${id}`);
};

export const postAnalyze = async () => {
  return api.post('/analyzer/run');
};

export const getAnalyze = async () => {
  return api.get('/analyzer/result');
};

export const postTaskBuilder = async () => {
  return api.post('/task-builder/run');
};

export const getTaskBuilder = async () => {
  return api.get('/task-builder/result');
};

export const postGenerator = async () => {
  return api.post('/generator/run');
};

export const getGenerator = async () => {
  return api.get('/generator/result');
};

export const postValidator = async () => {
  return api.post('/validator/run');
};

export const getValidator = async () => {
  return api.get('/validator/result');
};

// Final table
export const postApplyFixes = async () => api.post('/final-table/apply-fixes');
export const getFinalTable = async () => api.get('/final-table');
export const putFinalTable = async (body) => api.put('/final-table', body);

// Guidelines
export const getGuidelines = async () => api.get('/guidelines');
export const putGuidelines = async (guidelines) => api.put('/guidelines', { guidelines });

// Pipeline rerun
export const postRerunPipeline = async () => api.post('/pipeline/rerun');

