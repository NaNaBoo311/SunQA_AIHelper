import PropTypes from 'prop-types';
import Button from '../Common/Button';
import { formatFileSize, formatDate } from '../../services/documentService';

const getFileIcon = (type) => {
  switch (type.toLowerCase()) {
    case 'pdf':
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    case 'doc':
    case 'docx':
      return (
        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    case 'txt':
    case 'md':
      return (
        <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
  }
};

const DocumentCard = ({ document, onView, onDelete }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-blue-100 dark:border-slate-700 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 overflow-hidden flex flex-col h-full border-t-4 border-t-blue-500 relative group">
      <div className="p-5 flex-grow">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getFileIcon(document.file_type)}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]" title={document.filename}>
                {document.filename}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatFileSize(document.size)} • {document.file_type.toUpperCase()}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            document.status === 'completed' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {document.status}
          </span>
        </div>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Uploaded: {formatDate(document.upload_time)}
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-slate-700/30 px-5 py-3 border-t border-gray-200 dark:border-slate-700 flex justify-between">
        <Button 
          variant="secondary" 
          onClick={() => onView(document)}
          disabled={document.status !== 'completed'}
          className="text-xs py-1 px-3"
        >
          View Markdown
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => onDelete(document.id)}
          className="text-xs py-1 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Delete
        </Button>
      </div>
    </div>
  );
};

DocumentCard.propTypes = {
  document: PropTypes.shape({
    id: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
    file_type: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    upload_time: PropTypes.string.isRequired,
  }).isRequired,
  onView: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default DocumentCard;
