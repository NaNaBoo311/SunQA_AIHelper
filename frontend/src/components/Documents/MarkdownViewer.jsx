import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '../Common/Modal';
import Spinner from '../Common/Spinner';
import Button from '../Common/Button';
import { fetchDocumentMarkdown } from '../../services/documentService';
import toast from 'react-hot-toast';

const MarkdownViewer = ({ isOpen, onClose, documentId, title }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('preview');

  useEffect(() => {
    if (isOpen && documentId) {
      const loadContent = async () => {
        setLoading(true);
        try {
          const markdown = await fetchDocumentMarkdown(documentId);
          setContent(markdown);
        } catch (error) {
          toast.error('Failed to load document content');
          setContent('_Error loading content._');
        } finally {
          setLoading(false);
        }
      };
      loadContent();
    } else if (!isOpen) {
      setContent('');
      setViewMode('preview');
    }
  }, [isOpen, documentId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="relative">
        {loading ? (
          <div className="py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-2 bg-blue-50 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    viewMode === 'preview' 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-slate-600' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Preview Rendered
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    viewMode === 'raw' 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-slate-600' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Raw Plain Text
                </button>
              </div>
              <Button variant="secondary" onClick={copyToClipboard} className="text-xs">
                Copy Markdown
              </Button>
            </div>
            
            <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-md border border-gray-200 dark:border-slate-700 min-h-[300px] overflow-auto">
              {viewMode === 'preview' ? (
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                  {content}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

MarkdownViewer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  documentId: PropTypes.string,
  title: PropTypes.string,
};

export default MarkdownViewer;
