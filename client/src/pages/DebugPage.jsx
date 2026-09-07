import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  Terminal, Play, RefreshCw, Trash2, Filter, AlertCircle, 
  CheckCircle2, XCircle, ArrowRight, Eye, Layers, Image as ImageIcon,
  Cpu, Activity, Zap
} from 'lucide-react';

export default function DebugPage() {
  const [logs, setLogs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [pipelineStatus, setPipelineStatus] = useState({ activeRunId: null, currentPipelineStage: 'IDLE' });
  const [selectedStageTab, setSelectedStageTab] = useState('all');
  const [logLevelFilter, setLogLevelFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const logsEndRef = useRef(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchLogsAndStatus();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchLogsAndStatus(), fetchCandidates()]);
    setLoading(false);
  };

  const fetchLogsAndStatus = async () => {
    try {
      const [logsRes, statusRes] = await Promise.all([
        api.get('/logs?limit=150'),
        api.get('/logs/status')
      ]);
      setLogs(logsRes.data || []);
      setPipelineStatus(statusRes.data || { activeRunId: null, currentPipelineStage: 'IDLE' });
      if (statusRes.data?.currentPipelineStage && statusRes.data.currentPipelineStage !== 'IDLE') {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    } catch (err) {
      console.error('Debug poll error:', err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/images/debug/candidates?limit=120');
      setCandidates(res.data || []);
    } catch (err) {
      console.error('Failed to load debug candidates:', err);
    }
  };

  const triggerPipeline = async () => {
    setIsRunning(true);
    toast.loading('Starting Pinterest discovery & 3-stage scoring...', { id: 'pipe-toast' });
    try {
      await api.post('/automation/run');
      toast.success('Pipeline finished successfully!', { id: 'pipe-toast' });
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Pipeline execution failed', { id: 'pipe-toast' });
    } finally {
      setIsRunning(false);
      fetchLogsAndStatus();
      fetchCandidates();
    }
  };

  const clearLogHistory = async () => {
    try {
      await api.delete('/logs');
      setLogs([]);
      toast.success('Diagnostic logs cleared');
    } catch (err) {
      toast.error('Failed to clear logs');
    }
  };

  // Funnel counts calculation
  const totalScraped = candidates.length;
  const stage1Rejected = candidates.filter(c => c.filter_stage === 'rejected_stage_1').length;
  const stage2Rejected = candidates.filter(c => c.filter_stage === 'rejected_stage_2').length;
  const stage3Rejected = candidates.filter(c => c.filter_stage === 'rejected_stage_3').length;
  const allPassed = candidates.filter(c => c.filter_stage === 'passed_all_stages').length;

  // Filter candidates by tab
  const filteredCandidates = candidates.filter(c => {
    if (selectedStageTab === 'all') return true;
    if (selectedStageTab === 'passed') return c.filter_stage === 'passed_all_stages';
    if (selectedStageTab === 'stage_1') return c.filter_stage === 'rejected_stage_1';
    if (selectedStageTab === 'stage_2') return c.filter_stage === 'rejected_stage_2';
    if (selectedStageTab === 'stage_3') return c.filter_stage === 'rejected_stage_3';
    return true;
  });

  // Filter console logs
  const filteredLogs = logs.filter(entry => {
    const matchesLevel = logLevelFilter === 'ALL' || entry.level === logLevelFilter;
    const matchesSearch = !logSearch || 
      entry.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      (entry.stage && entry.stage.toLowerCase().includes(logSearch.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const getStageColor = (stage) => {
    switch (stage) {
      case 'SCRAPE': return 'text-purple-400 border-purple-900/50 bg-purple-950/20';
      case 'STAGE_1_ENGAGEMENT': return 'text-blue-400 border-blue-900/50 bg-blue-950/20';
      case 'STAGE_2_OPENCV': return 'text-amber-400 border-amber-900/50 bg-amber-950/20';
      case 'STAGE_3_ONNX': return 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20';
      case 'DITHER': return 'text-cyan-400 border-cyan-900/50 bg-cyan-950/20';
      case 'PUBLISH': return 'text-pink-400 border-pink-900/50 bg-pink-950/20';
      default: return 'text-zinc-400 border-zinc-800 bg-zinc-900/40';
    }
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'ERROR': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-900 font-mono font-bold">ERR</span>;
      case 'WARN': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-900 font-mono font-bold">WRN</span>;
      case 'DEBUG': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">DBG</span>;
      default: return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900 font-mono font-bold">INF</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Terminal size={24} className="text-[#10b981]" />
              Pipeline Debug & Observability
            </h1>
            <span className={`px-2 py-0.5 text-xs rounded-full border ${
              isRunning ? 'bg-amber-950/50 text-amber-400 border-amber-800 animate-pulse' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}>
              {isRunning ? `RUNNING [${pipelineStatus.currentPipelineStage}]` : 'IDLE'}
            </span>
          </div>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Real-time inspection of Pinterest harvesting, 3-tier filtering gates, and live diagnostic logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs rounded-md border flex items-center gap-1.5 transition-colors ${
              autoRefresh ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            <Activity size={14} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto-polling (2.5s)' : 'Polling Paused'}
          </button>

          <button
            onClick={triggerPipeline}
            disabled={isRunning}
            className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-black disabled:opacity-50"
          >
            <Play size={14} fill="currentColor" />
            {isRunning ? 'Processing Pipeline...' : 'Trigger Pipeline Now'}
          </button>
        </div>
      </div>

      {/* 3-Tier Filter Gate Funnel Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Pinterest Scraped</span>
            <ImageIcon size={14} />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalScraped}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Raw image pins</div>
        </div>

        <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Gate 1: Saves/Bounds</span>
            <Layers size={14} />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">-{stage1Rejected}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Oversized / Low saves</div>
        </div>

        <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Gate 2: OpenCV</span>
            <Activity size={14} />
          </div>
          <div className="text-2xl font-bold text-orange-400 font-mono">-{stage2Rejected}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Blurry / Low contrast</div>
        </div>

        <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a]">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Gate 3: ONNX Model</span>
            <Cpu size={14} />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">-{stage3Rejected}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Aesthetic score &lt; threshold</div>
        </div>

        <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>Qualified Finalists</span>
            <CheckCircle2 size={14} />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{allPassed}</div>
          <div className="text-[11px] text-emerald-500 mt-1">Passed all 3 gates</div>
        </div>
      </div>

      {/* Main Content Layout: Candidate Gate Matrix + Diagnostic Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate Filter Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              {[
                { id: 'all', label: `All (${candidates.length})` },
                { id: 'passed', label: `Qualified (${allPassed})` },
                { id: 'stage_1', label: `Gate 1 Fail (${stage1Rejected})` },
                { id: 'stage_2', label: `Gate 2 Fail (${stage2Rejected})` },
                { id: 'stage_3', label: `Gate 3 Fail (${stage3Rejected})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStageTab(tab.id)}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                    selectedStageTab === tab.id
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchCandidates}
              className="p-1.5 text-zinc-400 hover:text-white rounded border border-zinc-800 hover:border-zinc-700 text-xs flex items-center gap-1 self-end sm:self-auto"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Candidate Cards Grid */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center rounded-lg border border-[#27272a] bg-[#18181b]/40 text-zinc-500 text-sm">
                No candidates in this gate. Run the pipeline to discover pins!
              </div>
            ) : (
              filteredCandidates.map((candidate) => {
                const isPassed = candidate.filter_stage === 'passed_all_stages';
                return (
                  <div
                    key={candidate.id}
                    className={`p-3.5 rounded-lg border flex flex-col sm:flex-row gap-3.5 transition-all ${
                      isPassed 
                        ? 'bg-[#18181b] border-emerald-900/60 hover:border-emerald-700' 
                        : 'bg-[#121215] border-[#27272a] opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="w-full sm:w-28 h-28 shrink-0 rounded bg-black overflow-hidden relative border border-zinc-800">
                      <img
                        src={candidate.thumbnail_path ? `http://localhost:5000/temp/${candidate.thumbnail_path.split(/[\\/]/).pop()}` : candidate.image_url}
                        alt={candidate.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = candidate.image_url;
                        }}
                      />
                      <span className={`absolute top-1 left-1 text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isPassed ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        #{candidate.id}
                      </span>
                    </div>

                    {/* Metadata & Analysis Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-zinc-200 truncate" title={candidate.title}>
                            {candidate.title || 'Untitled Pin'}
                          </h3>
                          {isPassed ? (
                            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-medium">
                              PASS ALL
                            </span>
                          ) : (
                            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded bg-red-950/70 text-red-400 border border-red-900 font-medium">
                              REJECTED
                            </span>
                          )}
                        </div>

                        {/* Metrics Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            📌 {candidate.saves_count || 0} saves
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            📐 {candidate.width || '?'}x{candidate.height || '?'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            ⚡ Sharpness: {candidate.opencv_sharpness || 'N/A'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-zinc-900 text-purple-300 border border-purple-900/40">
                            🧠 ONNX: {candidate.onnx_aesthetic_score ? `${candidate.onnx_aesthetic_score}/10` : 'N/A'}
                          </span>
                          {candidate.quality_score > 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-900 font-bold">
                              ⭐ Score: {candidate.quality_score}/100
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reason & Link Footer */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                        <span className={`text-[11px] truncate ${isPassed ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          {candidate.filter_reason || 'Pending evaluation'}
                        </span>
                        <a
                          href={candidate.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 ml-2 shrink-0"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Diagnostic Console / Log Terminal (5 cols) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col h-[680px]">
          <div className="bg-[#18181b] p-3 rounded-lg border border-[#27272a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-[#10b981]" />
              <span className="text-xs font-semibold text-zinc-200">Execution Log Stream</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearLogHistory}
                className="p-1.5 text-zinc-400 hover:text-red-400 rounded border border-zinc-800 hover:border-zinc-700 text-xs flex items-center gap-1"
                title="Clear Logs"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Search & Level Filter */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Search logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <select
              value={logLevelFilter}
              onChange={(e) => setLogLevelFilter(e.target.value)}
              className="bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO Only</option>
              <option value="WARN">WARN Only</option>
              <option value="ERROR">ERROR Only</option>
              <option value="DEBUG">DEBUG Only</option>
            </select>
          </div>

          {/* Monospace Terminal Body */}
          <div className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg p-3 font-mono text-[11px] overflow-y-auto space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-zinc-600 text-center py-12">
                No logs matching filters. Trigger the pipeline to stream events!
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <div key={entry.id} className="leading-relaxed border-b border-zinc-900/80 pb-1.5 break-words">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-zinc-600 text-[10px]">
                      {entry.created_at ? entry.created_at.substring(11, 19) : ''}
                    </span>
                    {getLevelBadge(entry.level)}
                    <span className={`text-[10px] px-1 rounded border ${getStageColor(entry.stage)}`}>
                      {entry.stage}
                    </span>
                  </div>
                  <div className="text-zinc-300 pl-1 font-mono">
                    {entry.message}
                  </div>
                  {entry.metadata && (
                    <div className="text-[10px] text-zinc-500 pl-2 bg-zinc-950/50 rounded p-1 mt-0.5 overflow-x-auto">
                      {entry.metadata}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
