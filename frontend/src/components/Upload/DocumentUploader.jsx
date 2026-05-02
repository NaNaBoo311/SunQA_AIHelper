import PropTypes from 'prop-types';
import FileDropzone from './FileDropzone';
import { useFileUpload } from '../../hooks/useFileUpload';
import Button from '../Common/Button';
import Alert from '../Common/Alert';
import { formatFileSize } from '../../services/documentService';
import toast from 'react-hot-toast';

const DocumentUploader = ({ onUploadComplete }) => {
  const { files, uploading, progress, error, addFiles, removeFile, uploadAll } = useFileUpload();

  const handleUpload = async () => {
    const responses = await uploadAll();
    
    let successCount = 0;
    let failCount = 0;
    
    responses.forEach(res => {
      if (res.success) {
        successCount++;
      } else {
        failCount++;
        toast.error(`Failed: ${res.message}`);
      }
    });

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document(s)`);
      if (onUploadComplete) onUploadComplete();
    }
  };

  return (
    <div className="space-y-6">
      <FileDropzone onFilesDrop={addFiles} />
      
      {error && <Alert type="error" message={error} />}

      {files.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 dark:border-slate-700 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Selected Files ({files.length})
            </h3>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload All'}
            </Button>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-slate-700">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col flex-1 truncate">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </span>
                    
                    {progress[index] !== undefined && (
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-2">
                        <div 
                          className="bg-qa-blue h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${progress[index]}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  
                  {!uploading && (
                    <button 
                      onClick={() => removeFile(index)}
                      className="ml-4 text-gray-400 hover:text-qa-red focus:outline-none"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

DocumentUploader.propTypes = {
  onUploadComplete: PropTypes.func,
};

export default DocumentUploader;
