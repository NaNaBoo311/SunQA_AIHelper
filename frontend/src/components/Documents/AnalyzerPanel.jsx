import { useState, useEffect } from 'react';
import { runAnalyzer } from '../../services/documentService';
import toast from 'react-hot-toast';

// ─── Small reusable UI pieces ────────────────────────────────────────────────

const Badge = ({ color, children }) => {
  const colors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    functional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'non-functional': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    other: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${colors[color] || colors.other}`}>
      {children}
    </span>
  );
};

const SectionCard = ({ title, icon, children, accent }) => {
  const [open, setOpen] = useState(true);
  const accents = {
    blue: 'border-blue-400 dark:border-blue-500',
    red: 'border-red-400 dark:border-red-500',
    purple: 'border-purple-400 dark:border-purple-500',
  };
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 border-l-4 ${accents[accent] || accents.blue} shadow-sm overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
          <span className="text-lg">{icon}</span> {title}
        </span>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
};

// ─── Domain Shard card ────────────────────────────────────────────────────────

const DomainShardCard = ({ shard }) => {
  const { domain, requirements = [], uncertainties } = shard;
  const ambiguities = uncertainties?.ambiguity || [];

  return (
    <SectionCard title={`Domain: ${domain}`} icon="🗂️" accent="blue">
      {requirements.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Requirements</h4>
          <div className="space-y-2">
            {requirements.map((req) => (
              <div key={req.id} className="bg-gray-50 dark:bg-slate-900/60 rounded-lg p-3 border border-gray-100 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400">{req.id}</span>
                  <Badge color={req.type === 'functional' ? 'functional' : 'non-functional'}>{req.type}</Badge>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{req.summary}</p>
                {req.depends_on?.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    <span className="font-semibold">Depends on:</span> {req.depends_on.join(', ')}
                  </p>
                )}
                {req.external_context && (
                  <p className="text-xs text-slate-400 mt-1 italic">{req.external_context}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {ambiguities.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2">⚠ Ambiguities</h4>
          <div className="space-y-2">
            {ambiguities.map((a, i) => (
              <div key={i} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={a.severity}>{a.severity}</Badge>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{a.detail}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">❓ {a.questions}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {requirements.length === 0 && ambiguities.length === 0 && (
        <p className="text-sm text-slate-400 italic">No requirements or ambiguities found for this domain.</p>
      )}
    </SectionCard>
  );
};

// ─── Missing Data Report card ─────────────────────────────────────────────────

const MissingDataReport = ({ report }) => {
  const items = report?.missing_data || [];
  if (items.length === 0) return null;

  return (
    <SectionCard title="Missing Data Report" icon="🚨" accent="red">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800/40">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.category}</span>
              <Badge color="other">{item.issue_type}</Badge>
              <Badge color={item.severity}>{item.severity}</Badge>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200">{item.detail}</p>
            <div className="mt-2 bg-white dark:bg-slate-900 rounded p-2 border border-red-100 dark:border-red-800/30">
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold">📩 Request to PM:</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{item.request_to_pm}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

// ─── Main AnalyzerPanel ───────────────────────────────────────────────────────

const AnalyzerPanel = ({ disabled = false, refreshTrigger = 0 }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('structured'); // 'structured', 'raw', 'input'
  const [activeTab, setActiveTab] = useState('roster');
  const [missingAlert, setMissingAlert] = useState(false); // banner visibility

  // Load on mount, and re-load whenever refreshTrigger changes (pipeline rerun)
  useEffect(() => {
    import('../../services/documentService').then(({ getAnalyzerResult }) => {
      getAnalyzerResult().then((data) => {
        if (data && data.result) {
          setResult(data.result);
          if (data.result?.missing_data_report?.missing_data?.length > 0) {
            setActiveTab('missing');
          } else if (data.result?.domain_shards?.length > 0) {
            setActiveTab('domain_0');
          } else {
            setActiveTab('roster');
          }
        }
      });
    });
  }, [refreshTrigger]);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    setMissingAlert(false);
    try {
      const data = await runAnalyzer();
      setResult(data.result);

      // Select the first available tab intelligently
      if (data.result?.missing_data_report?.missing_data?.length > 0) {
        setActiveTab('missing');
        setMissingAlert(true); // show banner
      } else if (data.result?.domain_shards?.length > 0) {
        setActiveTab('domain_0');
      } else {
        setActiveTab('roster');
      }

      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    toast.success('Result copied as JSON');
  };

  const extractedRoster = result?.extracted_team_roster || [];
  const domainShards = result?.domain_shards || [];
  const missingReport = result?.missing_data_report;
  const hasMissingData = missingReport?.missing_data?.length > 0;

  // Build a list of tabs based on available data
  const tabs = [];
  if (extractedRoster.length > 0) {
    tabs.push({ id: 'roster', label: `Team Roster (${extractedRoster.length})`, icon: '👥' });
  }
  if (hasMissingData) {
    tabs.push({ id: 'missing', label: `Missing Data (${missingReport.missing_data.length})`, icon: '🚨' });
  }
  domainShards.forEach((shard, idx) => {
    tabs.push({ id: `domain_${idx}`, label: `Domain: ${shard.domain}`, icon: '🗂️' });
  });

  // Ensure active tab is valid when switching raw view or reloading
  if (result && viewMode === 'structured' && !tabs.find(t => t.id === activeTab) && tabs.length > 0) {
    setActiveTab(tabs[0].id);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Analyzer Agent A — GDD Analyzer
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Reads all uploaded documents, automatically extracts the team roster, and audits the GDD using AI.
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={loading || disabled}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 font-semibold rounded-lg shadow-sm hover:bg-blue-50 focus:ring-4 focus:ring-blue-500/30 transition-all disabled:opacity-70 whitespace-nowrap"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Analyzing…</span>
              </>
            ) : (
              <span>▶ Run Analyzer</span>
            )}
          </button>
        </div>

        {/* Missing Data Report Alert Banner */}
        {missingAlert && hasMissingData && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700">
            <span className="text-2xl mt-0.5">🚨</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800 dark:text-red-300">
                Missing Data Detected — {missingReport.missing_data.length} issue{missingReport.missing_data.length !== 1 ? 's' : ''} found
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                The GDD contains hollow headers, unresolved references, or missing domain content.
                These will generate <strong>⚠️ BLOCKER</strong> warnings in subsequent agents.
                Review the <strong>Missing Data</strong> tab below and notify your PM before proceeding.
              </p>
            </div>
            <button
              onClick={() => setMissingAlert(false)}
              className="ml-auto text-red-400 hover:text-red-600 text-xl leading-none"
            >×</button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6">
          {/* Loading state */}
          {loading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-6 text-center">
              <div className="animate-pulse text-blue-600 dark:text-blue-400 font-semibold">
                🤖 Agent A is reading your documents and reasoning through the GDD…
              </div>
              <p className="text-xs text-slate-400 mt-2">This may take 15–60 seconds depending on document size.</p>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">
                  Analysis Results
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {extractedRoster.length} members · {domainShards.length} domains · {missingReport?.missing_data?.length || 0} issues
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
                      Input
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
                <pre className="bg-slate-900 text-green-400 text-xs p-5 rounded-xl overflow-auto max-h-[60vh] font-mono whitespace-pre-wrap">
                  {JSON.stringify(result, (k, v) => (k === '_system_prompt' || k === '_user_input') ? undefined : v, 2)}
                </pre>
              ) : viewMode === 'system' ? (
                <pre className="bg-slate-900 text-yellow-300 text-xs p-5 rounded-xl overflow-auto max-h-[60vh] font-mono whitespace-pre-wrap">
                  {result?._system_prompt || "System prompt not available."}
                </pre>
              ) : viewMode === 'input' ? (
                <pre className="bg-slate-900 text-blue-300 text-xs p-5 rounded-xl overflow-auto max-h-[60vh] font-mono whitespace-pre-wrap">
                  {result?._user_input || "User input not available."}
                </pre>
              ) : (
                <div className="space-y-4">
                  {/* Tabs Navigation */}
                  {tabs.length > 0 && (
                    <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-white text-slate-600 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                            }`}
                        >
                          <span className="mr-2">{tab.icon}</span>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab Content */}
                  <div className="min-h-[200px]">
                    {activeTab === 'roster' && extractedRoster.length > 0 && (
                      <SectionCard title="Extracted Team Roster" icon="👥" accent="purple">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {extractedRoster.map((member, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-slate-900/60 p-4 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{member.name}</span>
                                <Badge color="functional">{member.role}</Badge>
                              </div>
                              {member.role_description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2">
                                  {member.role_description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {activeTab === 'missing' && hasMissingData && (
                      <MissingDataReport report={missingReport} />
                    )}

                    {activeTab.startsWith('domain_') && (
                      <DomainShardCard shard={domainShards[parseInt(activeTab.split('_')[1])]} />
                    )}

                    {/* Raw parse error fallback */}
                    {result._raw_response && (
                      <SectionCard title="Raw Agent Response (Parse Error)" icon="⚠️" accent="red">
                        <pre className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono">
                          {result._raw_response}
                        </pre>
                      </SectionCard>
                    )}
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

export default AnalyzerPanel;
