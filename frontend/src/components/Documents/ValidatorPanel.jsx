import { useState, useEffect } from 'react';
import { runValidator, getValidatorResult } from '../../services/documentService';
import toast from 'react-hot-toast';

// ─── Sub-components ───────────────────────────────────────────────────────────

const ConfidenceMeter = ({ rate, decision }) => {
  const color =
    rate >= 95 ? '#22c55e' :
    rate >= 80 ? '#eab308' :
    rate >= 60 ? '#f97316' : '#ef4444';

  const label =
    decision === 'READY_FOR_SYNC'        ? '✅ Ready for Notion Sync' :
    decision === 'MANUAL_REVIEW_REQUIRED' ? '⚠️ Manual Review Required' :
                                            '❌ Reject & Re-run Pipeline';

  const labelColor =
    decision === 'READY_FOR_SYNC'        ? 'text-green-600 dark:text-green-400' :
    decision === 'MANUAL_REVIEW_REQUIRED' ? 'text-yellow-600 dark:text-yellow-400' :
                                            'text-red-600 dark:text-red-400';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular meter */}
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10"
            className="dark:stroke-slate-700" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - rate / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold" style={{ color }}>{rate}%</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Confidence</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${labelColor}`}>{label}</span>
    </div>
  );
};

const TypeBadge = ({ type }) => {
  const styles = {
    HALLUCINATION:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    COVERAGE_GAP:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    MISASSIGNMENT:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  };
  const icons = { HALLUCINATION: '🧠', COVERAGE_GAP: '🕳️', MISASSIGNMENT: '👤' };
  const labels = { HALLUCINATION: 'Hallucination', COVERAGE_GAP: 'Coverage Gap', MISASSIGNMENT: 'Misassignment' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${styles[type] || 'bg-slate-100 text-slate-600'}`}>
      {icons[type]} {labels[type] || type}
    </span>
  );
};

const AttackCard = ({ item, index }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <TypeBadge type={item.type} />
      <span className="text-xs text-slate-400 dark:text-slate-500">#{index + 1}</span>
    </div>
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.target}</p>
    <p className="text-sm text-slate-600 dark:text-slate-300">{item.finding}</p>
    <div className="mt-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-3 py-2">
      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">💡 Fix: </span>
      <span className="text-xs text-blue-700 dark:text-blue-300">{item.guideline}</span>
    </div>
  </div>
);

const WarningValidationCard = ({ item }) => (
  <div className={`rounded-xl border p-4 flex flex-col gap-1 ${
    item.is_valid_warning
      ? 'border-orange-200 bg-orange-50 dark:border-orange-800/40 dark:bg-orange-900/10'
      : 'border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10'
  }`}>
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.task_title}</span>
      <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
        item.is_valid_warning
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
          : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      }`}>
        {item.is_valid_warning ? '⚠️ Valid Blocker' : '✅ False Warning'}
      </span>
    </div>
    <p className="text-xs text-slate-600 dark:text-slate-400">{item.reasoning}</p>
  </div>
);

// ─── Main Panel ───────────────────────────────────────────────────────────────

const ValidatorPanel = ({ disabled = false, refreshTrigger = 0 }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('structured'); // 'structured' | 'raw'

  useEffect(() => {
    getValidatorResult().then((data) => {
      if (data?.result) setResult(data.result);
    });
  }, [refreshTrigger]);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      toast.loading('Agent D is auditing the QA plan...', { id: 'validator' });
      const data = await runValidator();
      setResult(data.result);
      toast.success('Audit complete!', { id: 'validator' });
    } catch (error) {
      toast.error(error.message || 'Validator agent failed', { id: 'validator' });
    } finally {
      setLoading(false);
    }
  };

  const summary = result?.audit_summary;
  const attackLog = result?.attack_log || [];
  const coverage = result?.coverage_check;
  const warningValidation = result?.warning_validation || [];

  const hallucinations = attackLog.filter(i => i.type === 'HALLUCINATION');
  const coverageGaps   = attackLog.filter(i => i.type === 'COVERAGE_GAP');
  const misassignments = attackLog.filter(i => i.type === 'MISASSIGNMENT');

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* ── Header card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-red-600 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Agent D — Red Team Auditor</h2>
              <p className="text-red-100 text-sm mt-0.5">Adversarial audit: hallucinations, coverage gaps, misassignments & warning validation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <>
                <div className="flex bg-black/20 rounded-lg p-0.5 text-xs font-medium">
                  {['structured', 'raw'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)}
                      className={`px-3 py-1.5 rounded-md transition-colors capitalize ${
                        viewMode === m
                          ? 'bg-white text-red-600 shadow-sm'
                          : 'text-white/70 hover:text-white'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success('Copied!'); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
                >
                  Copy JSON
                </button>
              </>
            )}
            <button
              onClick={handleRun}
              disabled={loading || disabled}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 font-semibold rounded-lg shadow-sm hover:bg-red-50 focus:ring-4 focus:ring-red-500/30 transition-all disabled:opacity-70"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Auditing…</>
              ) : '🔴 Run Audit'}
            </button>
          </div>
        </div>

        {/* ── Raw view ── */}
        {result && viewMode === 'raw' && (
          <div className="p-6">
            <pre className="text-xs font-mono text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* ── Structured view — top summary ── */}
        {result && viewMode === 'structured' && summary && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Confidence meter */}
            <div className="flex justify-center md:col-span-1">
              <ConfidenceMeter rate={summary.confidence_rate} decision={summary.decision} />
            </div>
            {/* Stats */}
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Attack Points', value: summary.total_attack_points, color: 'red' },
                { label: 'Hallucinations',       value: hallucinations.length,       color: 'red' },
                { label: 'Coverage Gaps',        value: coverageGaps.length,         color: 'orange' },
                { label: 'Misassignments',       value: misassignments.length,       color: 'yellow' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl border border-${color}-100 dark:border-${color}-900/40 bg-${color}-50 dark:bg-${color}-900/10 p-4 text-center`}>
                  <div className={`text-3xl font-extrabold text-${color}-600 dark:text-${color}-400`}>{value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Structured view — detail panels ── */}
      {result && viewMode === 'structured' && (
        <>
          {/* Attack log */}
          {attackLog.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <span className="text-xl">⚔️</span>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Attack Log</h3>
                <span className="ml-auto text-xs px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-semibold">
                  {attackLog.length} issue{attackLog.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {attackLog.map((item, i) => <AttackCard key={i} item={item} index={i} />)}
              </div>
            </div>
          )}

          {/* Coverage check */}
          {coverage && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <span className="text-xl">🗺️</span>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Coverage Analysis</h3>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">GDD requirements found: <strong className="text-slate-800 dark:text-slate-100">{coverage.gdd_requirements_found}</strong></span>
                  <span className="text-slate-500 dark:text-slate-400">Covered by tasks: <strong className="text-slate-800 dark:text-slate-100">{coverage.tasks_covering_requirements}</strong></span>
                </div>
                {coverage.missing_elements?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2">Missing Coverage:</p>
                    <ul className="flex flex-col gap-1.5">
                      {coverage.missing_elements.map((el, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <span className="mt-0.5 text-orange-400">🕳️</span>{el}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning validation */}
          {warningValidation.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <span className="text-xl">🧪</span>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Warning Validation</h3>
                <span className="ml-auto text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full font-semibold">
                  {warningValidation.length} reviewed
                </span>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {warningValidation.map((item, i) => <WarningValidationCard key={i} item={item} />)}
              </div>
            </div>
          )}

          {attackLog.length === 0 && (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              ✅ No attack points found — the plan passed the audit.
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default ValidatorPanel;
