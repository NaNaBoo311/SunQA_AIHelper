import { useState, useEffect } from 'react';
import { runGenerator, getGeneratorResult } from '../../services/documentService';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Badge = ({ color, children }) => {
  const colors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    unassigned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
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

const GeneratorPanel = ({ disabled = false, refreshTrigger = 0 }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('structured'); // 'structured', 'raw', 'system'

  useEffect(() => {
    getGeneratorResult().then((data) => {
      if (data && data.result) {
        setResult(data.result);
      }
    });
  }, [refreshTrigger]);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      toast.loading('Agent C is generating specifications...', { id: 'generator' });
      const data = await runGenerator();
      setResult(data.result);
      toast.success('Specifications generated!', { id: 'generator' });
    } catch (error) {
      toast.error(error.message || 'Generator agent failed', { id: 'generator' });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      toast.success('JSON copied to clipboard');
    }
  };

  const notionPackages = result?.notion_sync_package || [];
  const reviewPackages = result?.need_review || [];
  const packages = [...notionPackages, ...reviewPackages];

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Agent C — Test Case Generator</h2>
              <p className="text-orange-100 text-sm mt-0.5">Transforms tasks into a master list of executable test specs for Notion</p>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading || disabled}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 font-semibold rounded-lg shadow-sm hover:bg-orange-50 focus:ring-4 focus:ring-orange-500/30 transition-all disabled:opacity-70 whitespace-nowrap"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <span>▶ Run Generator</span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {loading && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl p-6 text-center">
              <div className="animate-pulse text-orange-600 dark:text-orange-400 font-semibold">
                📝 Agent C is synthesizing test cases...
              </div>
              <p className="text-xs text-slate-400 mt-2">Creating Gherkin format tests based on tasks.</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">
                  Notion Sync Package
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {packages.length} specs generated
                  </span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex mb-1 flex-wrap">
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
                  <button
                    onClick={copyResult}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors h-fit mt-1"
                  >
                    Copy JSON
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
                  <div>
                    <h4 className="text-yellow-500 font-bold mb-2 pb-1 border-b border-slate-800">System Prompt</h4>
                    <pre className="text-yellow-300 text-xs font-mono whitespace-pre-wrap">
                      {result._system_prompt || "System prompt not available."}
                    </pre>
                  </div>
                </div>
              ) : viewMode === 'input' ? (
                <div className="bg-slate-900 rounded-xl p-5 overflow-auto max-h-[600px] border border-slate-800 space-y-6">
                  <div>
                    <h4 className="text-blue-400 font-bold mb-2 pb-1 border-b border-slate-800">User Input</h4>
                    <pre className="text-blue-300 text-xs font-mono whitespace-pre-wrap">
                      {result._user_input || "User input not available."}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {packages.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                      <p className="text-slate-500">No specifications generated.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="px-4 py-3 font-semibold w-1/4">Task Title</th>
                            <th className="px-4 py-3 font-semibold w-1/5">Details</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Priority & Est.</th>
                            <th className="px-4 py-3 font-semibold">Assignee</th>
                            <th className="px-4 py-3 font-semibold w-1/3">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                          {packages.map((pkg, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors align-top">
                              <td className="px-4 py-4">
                                <div className="font-bold text-slate-800 dark:text-slate-100 mb-1">{pkg["Task title"]}</div>
                                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> {pkg.Status}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                                <div className="flex flex-col"><span className="font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider text-[10px]">Feature</span> <span>{pkg["Feature name"]}</span></div>
                                <div className="flex flex-col mt-1"><span className="font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider text-[10px]">Epic</span> <span>{pkg["Epic / Story"]}</span></div>
                                <div className="flex flex-col mt-1"><span className="font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider text-[10px]">Module</span> <span>{pkg["Module / screen"]}</span></div>
                              </td>
                              <td className="px-4 py-4 space-y-2">
                                <div>
                                  <Badge color={pkg.Priority?.toLowerCase()}>{pkg.Priority || "No Priority"}</Badge>
                                </div>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-2 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-1 rounded-md">
                                  ⏱️ {pkg.Estimate || "TBD"}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <Badge color={pkg["Suggested assignee"]?.includes("UNASSIGNED") ? "unassigned" : "functional"}>
                                  {pkg["Suggested assignee"] || "Unknown"}
                                </Badge>
                              </td>
                              <td className="px-4 py-4">
                                <div className="prose dark:prose-invert prose-sm max-w-none prose-h3:text-blue-600 dark:prose-h3:text-blue-400 prose-h3:text-sm prose-h3:mt-0 prose-h3:mb-2 prose-p:text-xs prose-p:leading-relaxed max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {pkg.Description || "*No description provided.*"}
                                  </ReactMarkdown>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {result._error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                      <span className="font-bold">Error:</span> {result._error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratorPanel;
