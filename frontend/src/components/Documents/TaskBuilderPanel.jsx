import { useState, useEffect } from 'react';
import { runTaskBuilder, getTaskBuilderResult } from '../../services/documentService';
import toast from 'react-hot-toast';

const Badge = ({ color, children }) => {
  const colors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    functional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    nonfunctional: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    default: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300',
  };
  const clr = colors[color] || colors.default;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${clr}`}>
      {children}
    </span>
  );
};

const SectionCard = ({ title, icon, accent, children }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden`}>
      <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-3`}>
        <div className={`p-2 rounded-lg bg-${accent}-50 dark:bg-${accent}-900/20 text-${accent}-500 dark:text-${accent}-400`}>
          <span className="text-xl leading-none">{icon}</span>
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};

const TaskBuilderPanel = ({ disabled = false, refreshTrigger = 0 }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('structured'); // 'structured', 'raw', 'input'
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    getTaskBuilderResult().then((data) => {
      if (data && data.result) {
        setResult(data.result);
        if (data.result?.task_breakdown?.length > 0) {
          setActiveTab(`domain_0`);
        }
      }
    });
  }, [refreshTrigger]);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      toast.loading('Agent B is breaking down tasks...', { id: 'task-builder' });
      const data = await runTaskBuilder();
      setResult(data.result);
      if (data.result?.task_breakdown?.length > 0) {
        setActiveTab(`domain_0`);
      }
      toast.success('Task breakdown completed!', { id: 'task-builder' });
    } catch (error) {
      toast.error(error.message || 'Task Builder agent failed', { id: 'task-builder' });
    } finally {
      setLoading(false);
    }
  };

  const hasResult = result && result.task_breakdown;
  const breakdown = hasResult ? result.task_breakdown : [];

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Agent B — QA Planner</h2>
              <p className="text-emerald-100 text-sm mt-0.5">Decomposes Agent A Ready Shards into testable tasks</p>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading || disabled}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 font-semibold rounded-lg shadow-sm hover:bg-emerald-50 focus:ring-4 focus:ring-emerald-500/30 transition-all disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Building Tasks...</span>
              </>
            ) : (
              <>
                <span>▶ Run Task Builder</span>
              </>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">


          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <div className="animate-pulse flex space-x-2">
                <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                <div className="w-3 h-3 bg-emerald-400 rounded-full animation-delay-200"></div>
                <div className="w-3 h-3 bg-emerald-400 rounded-full animation-delay-400"></div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Decomposing requirements...</p>
            </div>
          )}

          {hasResult && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* View Toggle */}
              <div className="flex justify-end">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex">
                  <button
                    onClick={() => setViewMode('structured')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'structured' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Structured View
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'raw' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Raw JSON
                  </button>
                  <button
                    onClick={() => setViewMode('system')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'system' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    System Prompt
                  </button>
                  <button
                    onClick={() => setViewMode('input')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'input' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    User Input
                  </button>
                </div>
              </div>

              {viewMode === 'raw' ? (
                <div className="bg-slate-900 rounded-xl p-5 overflow-auto max-h-[600px] border border-slate-800">
                  <pre className="text-emerald-400 text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(result, (k, v) => (k === '_system_prompt' || k === '_user_input') ? undefined : v, 2)}
                  </pre>
                </div>
              ) : viewMode === 'system' ? (
                <div className="bg-slate-900 rounded-xl p-5 overflow-auto max-h-[600px] border border-slate-800 space-y-6">
                  {breakdown.length > 0 && (
                    <div>
                      <h4 className="text-yellow-500 font-bold mb-2 pb-1 border-b border-slate-800">System Prompt</h4>
                      <pre className="text-yellow-300 text-xs font-mono whitespace-pre-wrap">
                        {breakdown[0]._system_prompt || "System prompt not available."}
                      </pre>
                    </div>
                  )}
                </div>
              ) : viewMode === 'input' ? (
                <div className="bg-slate-900 rounded-xl p-5 overflow-auto max-h-[600px] border border-slate-800 space-y-6">
                  {breakdown.map((shard, i) => (
                    <div key={i}>
                      <h4 className="text-blue-400 font-bold mb-2 pb-1 border-b border-slate-800">User Input for Domain: {shard.domain}</h4>
                      <pre className="text-blue-300 text-xs font-mono whitespace-pre-wrap">
                        {shard._user_input || "User input not available."}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Tabs Nav */}
                  <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-200 dark:border-slate-800">
                    <div className="flex space-x-1 pb-[-1px]">
                      {breakdown.map((shard, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveTab(`domain_${i}`)}
                          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                            ${activeTab === `domain_${i}`
                              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10'
                              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
                            }`}
                        >
                          <span className="text-lg">🗂️</span>
                          {shard.domain}
                          <span className="ml-2 py-0.5 px-2 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-500">
                            {shard.tasks?.length || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tabs Content */}
                  <div className="min-h-[200px]">
                    {breakdown.map((shard, i) => {
                      if (activeTab !== `domain_${i}`) return null;

                      return (
                        <div key={i} className="space-y-4">
                          {(!shard.tasks || shard.tasks.length === 0) ? (
                            <div className="text-center py-8 text-slate-500">No tasks generated for this domain.</div>
                          ) : (
                            shard.tasks.map((task, j) => (
                              <div key={j} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                      {task.task_id || `T-${j}`}
                                    </span>
                                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">{task.title}</h4>
                                  </div>
                                  <Badge color={task.priority?.toLowerCase() === 'high' ? 'high' : task.priority?.toLowerCase() === 'medium' ? 'medium' : 'low'}>
                                    {task.priority || 'Medium'}
                                  </Badge>
                                </div>

                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                                  {task.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                  {task.requirement_ref && task.requirement_ref.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                      <span className="font-semibold">Covers:</span>
                                      <div className="flex gap-1">
                                        {task.requirement_ref.map((ref, k) => (
                                          <span key={k} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{ref}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {task.dependencies && task.dependencies.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                      <span className="font-semibold">Depends on:</span>
                                      <div className="flex gap-1">
                                        {task.dependencies.map((dep, k) => (
                                          <span key={k} className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800">{dep}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {task.warning && (
                                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-500 text-sm text-red-700 dark:text-red-400 rounded-r-lg">
                                    <span className="font-bold mr-2">⚠️ Warning:</span>
                                    {task.warning}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskBuilderPanel;
