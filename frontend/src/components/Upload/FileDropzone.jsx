import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import PropTypes from 'prop-types';

const FileDropzone = ({ onFilesDrop }) => {
  const onDrop = useCallback(acceptedFiles => {
    onFilesDrop(acceptedFiles);
  }, [onFilesDrop]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ease-in-out relative overflow-hidden group
        ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02] shadow-lg shadow-blue-500/10' : 'border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 hover:shadow-md'}
        ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center space-y-4">
        <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {isDragActive ? (
          <p className="text-lg font-medium text-qa-blue">Drop files here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Drag & drop files here, or click to select</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supported formats: PDF, DOC, DOCX, TXT, MD
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Maximum file size: 10MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

FileDropzone.propTypes = {
  onFilesDrop: PropTypes.func.isRequired,
};

export default FileDropzone;
