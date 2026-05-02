import { useState, useEffect, useCallback } from 'react';
import {
  applyFixes, fetchFinalTable, saveFinalTable,
  fetchGuidelines, saveGuidelines, rerunPipeline,
  getValidatorResult,
} from '../../services/documentService';
import toast from 'react-hot-toast';

// ─── Column config ────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'Task title',        label: 'Task Title',       width: 'w-52',  multiline: false },
  { key: 'Epic / Story',      label: 'Epic / Story',     width: 'w-36',  multiline: false },
  { key: 'Feature name',      label: 'Feature',          width: 'w-36',  multiline: false },
  { key: 'Module / screen',   label: 'Module / Screen',  width: 'w-32',  multiline: false },
  { key: 'Priority',          label: 'Priority',         width: 'w-24',  multiline: false },
  { key: 'Suggested assignee',label: 'Assignee',         width: 'w-28',  multiline: false },
  { key: 'Estimate',          label: 'Estimate',         width: 'w-20',  multiline: false },
  { key: 'Status',            label: 'Status',           width: 'w-24',  multiline: false },
  { key: 'Description',       label: 'Description',      width: 'w-96',  multiline: true  },
];

const PRIORITY_COLORS = {
  High:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Low:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

// ─── Inline editable cell ─────────────────────────────────────────────────────
const EditableCell = ({ value, multiline, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value ?? ''); setEditing(true); }}
        className="cursor-text min-h-[1.5rem] px-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap"
        title="Click to edit"
      >
        {value || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
      </div>
    );
  }

  return multiline ? (
    <textarea
      autoFocus
      rows={5}
      className="w-full text-sm p-1 rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
    />
  ) : (
    <input
      autoFocus
      type="text"
      className="w-full text-sm p-1 rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
    />
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
const CONFIDENCE_THRESHOLD = 90;

const FinalSyncTablePanel = ({ disabled = false, refreshTrigger = 0, onPipelineComplete }) => {
  const [tableData, setTableData] = useState(null);         // { notion_sync_package, need_review }
  const [guidelines, setGuidelines] = useState('');
  const [savedGuidelines, setSavedGuidelines] = useState('');
  const [confidence, setConfidence] = useState(null);       // integer 0-100
  const [decision, setDecision] = useState(null);
  const [autoFixApplied, setAutoFixApplied] = useState(false);
  const [activeTab, setActiveTab] = useState('sync');       // 'sync' | 'review'
  const [loading, setLoading] = useState(false);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [showManualAlert, setShowManualAlert] = useState(false);

  // ── On mount: load validator result, guidelines, and existing final table ───
  useEffect(() => {
    const init = async () => {
      const [valData, tableRes, guidelinesStr] = await Promise.all([
        getValidatorResult(),
        fetchFinalTable(),
        fetchGuidelines(),
      ]);

      // Set validator confidence
      const audit = valData?.result?.audit_summary;
      if (audit) {
        setConfidence(audit.confidence_rate);
        setDecision(audit.decision);

        if (audit.confidence_rate > CONFIDENCE_THRESHOLD) {
          // Auto-apply fixes if no final table saved yet
          if (!tableRes?.result?.notion_sync_package) {
            await triggerAutoFix();
            return;
          } else {
            setAutoFixApplied(true);
          }
        } else {
          setShowManualAlert(true);
        }
      }

      // Load table (final or fallback to generator)
      if (tableRes?.result) setTableData(tableRes.result);

      setGuidelines(guidelinesStr);
      setSavedGuidelines(guidelinesStr);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const triggerAutoFix = async () => {
    setLoading(true);
    try {
      toast.loading('Auto-fixing based on audit guidelines…', { id: 'autofix' });
      const data = await applyFixes();
      setTableData(data.result);
      setAutoFixApplied(true);
      toast.success('Auto-fix applied!', { id: 'autofix' });
    } catch (err) {
      toast.error(err.message || 'Auto-fix failed', { id: 'autofix' });
    } finally {
      setLoading(false);
    }
  };

  // ── Update a cell in the editable table ─────────────────────────────────────
  const updateCell = useCallback((packageKey, rowIndex, colKey, value) => {
    setTableData(prev => {
      const updated = { ...prev };
      const rows = [...(updated[packageKey] || [])];
      rows[rowIndex] = { ...rows[rowIndex], [colKey]: value };
      updated[packageKey] = rows;
      return updated;
    });
    setSavePending(true);
  }, []);

  // ── Save edited table to backend ─────────────────────────────────────────────
  const handleSaveTable = async () => {
    try {
      await saveFinalTable(
        tableData?.notion_sync_package || [],
        tableData?.need_review || [],
      );
      setSavePending(false);
      toast.success('Table saved!');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    }
  };

  // ── Save guidelines ───────────────────────────────────────────────────────────
  const handleSaveGuidelines = async () => {
    try {
      await saveGuidelines(guidelines);
      setSavedGuidelines(guidelines);
      toast.success('Guidelines saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save guidelines');
    }
  };

  // ── Re-run full pipeline ──────────────────────────────────────────────────────
  const handleRerun = async () => {
    // Auto-save guidelines first
    if (guidelines !== savedGuidelines) await saveGuidelines(guidelines);

    setRerunLoading(true);
    setShowManualAlert(false);
    try {
      toast.loading('Re-running full pipeline (A → B → C → D)…', { id: 'rerun' });
      const data = await rerunPipeline();

      const newAudit = data.validator_result?.audit_summary;
      if (newAudit) {
        setConfidence(newAudit.confidence_rate);
        setDecision(newAudit.decision);
        if (newAudit.confidence_rate > CONFIDENCE_THRESHOLD) {
          await triggerAutoFix();
        } else {
          setShowManualAlert(true);
          // Load the new generator result as the editable table
          const tableRes = await fetchFinalTable();
          if (tableRes?.result) setTableData(tableRes.result);
        }
      }
      toast.success('Pipeline complete!', { id: 'rerun' });
      if (onPipelineComplete) onPipelineComplete();
    } catch (err) {
      toast.error(err.message || 'Re-run failed', { id: 'rerun' });
    } finally {
      setRerunLoading(false);
    }
  };

  // ── Render table for one package key ─────────────────────────────────────────
  const renderTable = (packageKey) => {
    const rows = tableData?.[packageKey] || [];
    if (rows.length === 0) {
      return (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm italic">
          No tasks in this section.
        </div>
      );
    }
    return (
      <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`${col.width} px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap`}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-12">⚠️</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                  rowIdx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50/60 dark:bg-slate-800/40'
                } hover:bg-blue-50/40 dark:hover:bg-blue-900/10`}
              >
                {COLUMNS.map(col => (
                  <td key={col.key} className={`${col.width} px-3 py-2 align-top`}>
                    {col.key === 'Priority' ? (
                      <div className="flex items-center">
                        <select
                          value={row[col.key] || ''}
                          onChange={e => updateCell(packageKey, rowIdx, col.key, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-0.5 border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${PRIORITY_COLORS[row[col.key]] || 'bg-slate-100 text-slate-600'}`}
                        >
                          {['High', 'Medium', 'Low'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <EditableCell
                        value={row[col.key] ?? ''}
                        multiline={col.multiline}
                        onChange={(val) => updateCell(packageKey, rowIdx, col.key, val)}
                      />
                    )}
                  </td>
                ))}
                {/* Warning indicator for review tasks */}
                <td className="w-12 px-3 py-2 align-top text-center">
                  {packageKey === 'need_review' && (
                    <span title="Needs manual review" className="text-orange-500 text-base">⚠️</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const syncCount   = tableData?.notion_sync_package?.length ?? 0;
  const reviewCount = tableData?.need_review?.length ?? 0;

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-2xl leading-none">📋</div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Final Notion Sync Table</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Editable QA execution plan — click any cell to edit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Confidence badge */}
            {confidence !== null && (
              <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                confidence > 90
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : confidence > 70
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                Confidence: {confidence}%
              </div>
            )}

            {/* Auto-fix badge */}
            {autoFixApplied && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                ✅ Auto-fixed
              </span>
            )}

            {/* Re-apply fixes button */}
            {confidence > CONFIDENCE_THRESHOLD && (
              <button
                onClick={triggerAutoFix}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
              >
                ⚡ Re-apply Fixes
              </button>
            )}

            {/* Save table button */}
            {savePending && (
              <button
                onClick={handleSaveTable}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
              >
                💾 Save Changes
              </button>
            )}
          </div>
        </div>

        {/* ── Manual review alert ── */}
        {showManualAlert && (
          <div className="mx-6 mt-5 flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                Manual Review Required — Confidence {confidence}%
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                The audit confidence is below 90%. Auto-fixes were not applied.
                Please review the table manually or enter correction guidelines below and re-run the pipeline.
              </p>
            </div>
            <button onClick={() => setShowManualAlert(false)} className="ml-auto text-yellow-500 hover:text-yellow-700 text-lg leading-none">×</button>
          </div>
        )}

        {/* ── Loading spinner ── */}
        {loading && (
          <div className="flex items-center gap-3 px-6 py-4 text-sm text-blue-600 dark:text-blue-400">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Applying auto-fixes…
          </div>
        )}

        {/* ── Tabs ── */}
        {tableData && !loading && (
          <div className="px-6 pt-4 flex gap-1 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'sync'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-b-2 border-emerald-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              ✅ Ready for Sync
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                {syncCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'review'
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-b-2 border-orange-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              ⚠️ Needs Review
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                {reviewCount}
              </span>
            </button>
          </div>
        )}

        {/* ── Table content ── */}
        {tableData && !loading && (
          <div className="p-6">
            {activeTab === 'sync'
              ? renderTable('notion_sync_package')
              : renderTable('need_review')}
          </div>
        )}

        {!tableData && !loading && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">No table yet</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Run Agents A → B → C → D to generate the final sync table.
            </p>
          </div>
        )}
      </div>

      {/* ── Guidelines + Re-run section ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-2xl leading-none">🔁</div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Re-run Pipeline with Corrections</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter correction guidelines, then re-run all 4 agents. Your notes will be injected as high-priority context for Agents A and B.
            </p>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              📝 Correction Guidelines
            </label>
            <textarea
              rows={6}
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder={`Examples:\n- Reassign all economy tasks to Linh, not Ngoc Anh.\n- The daily spin reward cap is 100 coins per day — use this value instead of TBD.\n- Exclude the tutorial domain from the audit scope.\n- Add coverage for the Push Notification feature.`}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y placeholder-slate-400"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-400">
                {guidelines.length > 0 && guidelines !== savedGuidelines
                  ? '⚠️ Unsaved changes'
                  : guidelines.length > 0
                  ? '✅ Saved'
                  : ''}
              </span>
              <button
                onClick={handleSaveGuidelines}
                disabled={guidelines === savedGuidelines}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                Save Guidelines
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRerun}
              disabled={rerunLoading || disabled}
              className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 disabled:opacity-70 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              {rerunLoading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg> Running Pipeline…</>
              ) : '🔁 Re-run Full Pipeline (A → B → C → D)'}
            </button>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              This will re-run all agents and regenerate the table. Your guidelines will be used as context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalSyncTablePanel;
