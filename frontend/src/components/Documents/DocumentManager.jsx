import { useEffect, useState, useCallback } from 'react';
import { useDocuments } from '../../hooks/useDocuments';
import DocumentCard from './DocumentCard';
import MarkdownViewer from './MarkdownViewer';
import AnalyzerPanel from './AnalyzerPanel';
import TaskBuilderPanel from './TaskBuilderPanel';
import GeneratorPanel from './GeneratorPanel';
import ValidatorPanel from './ValidatorPanel';
import FinalSyncTablePanel from './FinalSyncTablePanel';
import PipelineVisualizer from './PipelineVisualizer';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import Alert from '../Common/Alert';
import toast from 'react-hot-toast';
import Modal from '../Common/Modal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { runAnalyzer, runTaskBuilder, runGenerator, runValidator, applyFixes } from '../../services/documentService';

const DocumentManager = ({ refreshTrigger }) => {
  const { documents, loading, error, fetchDocuments, deleteDoc, refreshContext, getCombinedMarkdown } = useDocuments();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [combinedContext, setCombinedContext] = useState('');
  const [loadingContext, setLoadingContext] = useState(false);
  const [viewModeContext, setViewModeContext] = useState('preview');

  // ── Pipeline orchestration state ──────────────────────────────────────────
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState('');   // human-readable current step
  const [panelRefresh, setPanelRefresh] = useState(0);   // increment to trigger re-fetch in panels
  const [pipelinePrompt, setPipelinePrompt] = useState(null); // mid-pipeline user confirmation

  const STEPS = [
    { label: 'Agent A — Analyzer', fn: runAnalyzer },
    { label: 'Agent B — Task Builder', fn: runTaskBuilder },
    { label: 'Agent C — Generator', fn: runGenerator },
    { label: 'Agent D — Validator', fn: runValidator },
  ];

  const runAllAgents = useCallback(async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    try {
      for (const step of STEPS) {
        setPipelineStep(step.label);
        toast.loading(`Running ${step.label}…`, { id: 'run-all' });
        
        const data = await step.fn();
        
        // Increment panelRefresh so each panel re-fetches after its agent completes
        setPanelRefresh(prev => prev + 1);

        // Halt pipeline if Analyzer detects missing data
        if (step.label.includes('Analyzer') && data?.result?.missing_data_report?.missing_data?.length > 0) {
          const proceed = await new Promise(resolve => {
            setPipelinePrompt({
              title: "Missing Data Detected",
              message: `Analyzer found ${data.result.missing_data_report.missing_data.length} missing/ambiguous items in the GDD. Do you want to proceed to the Task Builder, or halt the pipeline to review?`,
              resolve
            });
          });
          
          setPipelinePrompt(null);
          
          if (!proceed) {
            throw new Error('Pipeline Halted by User: Please review Agent A for missing data.');
          }
        }
      }
      // Auto-fix if validator passes
      setPipelineStep('Applying fixes…');
      try { await applyFixes(); } catch (_) { /* non-fatal */ }
      setPanelRefresh(prev => prev + 1);
      
      setPipelineStep('Done!');
      toast.success('All agents complete!', { id: 'run-all' });
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      toast.error(err.message || 'Pipeline failed', { id: 'run-all' });
    } finally {
      setPipelineRunning(false);
      setPipelineStep('');
    }
  }, [pipelineRunning]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  const handleView = (doc) => {
    setSelectedDoc(doc);
    setIsViewerOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      const success = await deleteDoc(id);
      if (success) {
        toast.success('Document deleted successfully');
      } else {
        toast.error('Failed to delete document');
      }
    }
  };

  const handleViewContext = async () => {
    setIsContextModalOpen(true);
    setLoadingContext(true);
    setViewModeContext('preview');
    const context = await getCombinedMarkdown();
    setCombinedContext(context || '_No context available._');
    setLoadingContext(false);
  };
  
  const handleRefreshContext = async () => {
    await refreshContext();
    toast.success("Refreshed documents list");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* ── Pipeline Visualization Overlay ── */}
      <PipelineVisualizer step={pipelineStep} isVisible={pipelineRunning} />

      {/* ── Mid-Pipeline Prompt Overlay ── */}
      {pipelinePrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md transition-opacity">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/50 p-8 max-w-md w-full text-center animate-slide-up">
            <div className="text-5xl mb-4 animate-bounce">🚨</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{pipelinePrompt.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {pipelinePrompt.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" onClick={() => pipelinePrompt.resolve(false)} className="w-full">
                🛑 Halt Pipeline
              </Button>
              <Button onClick={() => pipelinePrompt.resolve(true)} className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-500">
                ⚠️ Keep Proceeding
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Management Section ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 tracking-tight">Document Library</h2>
            <p className="text-sm font-medium text-blue-600/80 dark:text-blue-400 mt-1">Manage and view your uploaded documents</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={handleRefreshContext} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={handleViewContext} disabled={loading || documents.length === 0}>
              View Combined Context
            </Button>
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        {loading && documents.length === 0 ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 p-10 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No documents</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload documents to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map(doc => (
              <DocumentCard 
                key={doc.id} 
                document={doc} 
                onView={handleView} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Single Document Viewer */}
      <MarkdownViewer 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        documentId={selectedDoc?.id} 
        title={selectedDoc?.filename || 'Document Viewer'} 
      />

      {/* ── Run All button + pipeline step indicator ── */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-3 shadow-sm">
        <button
          onClick={runAllAgents}
          disabled={pipelineRunning || documents.length === 0}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm whitespace-nowrap"
        >
          {pipelineRunning ? (
            <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Running…</>
          ) : '⚡ Run All Agents'}
        </button>
        {pipelineRunning && pipelineStep && (
          <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
            Step: <span className="font-semibold text-violet-600 dark:text-violet-400">{pipelineStep}</span>
          </span>
        )}
        {!pipelineRunning && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Runs Agent A → B → C → D in sequence, then auto-applies fixes
          </span>
        )}
      </div>

      {/* ── Analyzer Agent A ── */}
      <div className="mt-8">
        <AnalyzerPanel disabled={pipelineRunning} refreshTrigger={panelRefresh} />
      </div>

      {/* ── Task Builder Agent B ── */}
      <div>
        <TaskBuilderPanel disabled={pipelineRunning} refreshTrigger={panelRefresh} />
      </div>

      {/* ── Generator Agent C ── */}
      <div>
        <GeneratorPanel disabled={pipelineRunning} refreshTrigger={panelRefresh} />
      </div>

      {/* ── Validator Agent D ── */}
      <div>
        <ValidatorPanel disabled={pipelineRunning} refreshTrigger={panelRefresh} />
      </div>

      {/* ── Final Notion Sync Table ── */}
      <div>
        <FinalSyncTablePanel
          disabled={pipelineRunning}
          refreshTrigger={panelRefresh}
          onPipelineComplete={() => setPanelRefresh(prev => prev + 1)}
        />
      </div>

      {/* Combined Context Modal */}
      <Modal 
        isOpen={isContextModalOpen} 
        onClose={() => setIsContextModalOpen(false)} 
        title="Combined Document Context" 
        size="xl"
      >
        <div className="relative min-h-[200px]">
          {loadingContext ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                {/* View mode toggle */}
                <div className="flex space-x-2 bg-blue-50 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setViewModeContext('preview')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewModeContext === 'preview'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-slate-600'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Preview Rendered
                  </button>
                  <button
                    onClick={() => setViewModeContext('raw')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewModeContext === 'raw'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-slate-600'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Raw Plain Text
                  </button>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    navigator.clipboard.writeText(combinedContext);
                    toast.success('Context copied to clipboard');
                  }} 
                  className="text-xs"
                >
                  Copy All Context
                </Button>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-md border border-gray-200 dark:border-slate-700 max-h-[60vh] overflow-auto">
                {viewModeContext === 'preview' ? (
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{combinedContext}</ReactMarkdown>
                  </div>
                ) : (
                  <pre className="font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                    {combinedContext}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DocumentManager;
