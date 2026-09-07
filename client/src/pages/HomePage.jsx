import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Clock, Image as ImageIcon, Play, Zap, ExternalLink, Sparkles } from 'lucide-react';
import api from '../lib/api';
import AsciiPreview from '../components/AsciiPreview';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [todayPost, setTodayPost] = useState(null);
  const [autoStatus, setAutoStatus] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [postRes, statusRes] = await Promise.all([
        api.get('/posts/today'),
        api.get('/automation/status')
      ]);
      setTodayPost(postRes.data);
      setAutoStatus(statusRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    }
  };

  const handleRunPipeline = async () => {
    setRunning(true);
    const loadingToast = toast.loading('Harvesting Pinterest pins & evaluating 3 quality gates...');
    try {
      const res = await api.post('/automation/run');
      toast.success(res.data?.message || 'New Pinterest art discovered and selected!', { id: loadingToast });
      await fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Pipeline execution failed', { id: loadingToast });
    } finally {
      setRunning(false);
      fetchDashboardData();
    }
  };

  const getRenderPath = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path; // proxied by Vite, or can fallback to http://localhost:3001
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl pb-12">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f5] flex items-center gap-2">
            <Sparkles size={24} className="text-[#10b981]" />
            Pinterest Art Studio Overview
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Automated Pinterest trending art discovery, 3-tier scoring, and 1-bit retro CRT publication.
          </p>
        </div>

        <button 
          onClick={handleRunPipeline}
          disabled={running || autoStatus?.isRunning}
          className="btn-primary px-5 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#059669] text-black rounded-md disabled:opacity-50 transition-all shadow-md"
        >
          {running || autoStatus?.isRunning ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
          {running || autoStatus?.isRunning ? 'Running Discovery & Scoring...' : 'Force Pipeline Run'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="card p-5 flex flex-col gap-4 bg-[#18181b] border border-[#27272a] rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Latest Selection</h3>
            <Activity size={16} className="text-[#10b981]" />
          </div>
          <div className="mt-auto flex items-center gap-2">
            {todayPost ? <StatusBadge status={todayPost.status} /> : <StatusBadge status="pending" />}
            {todayPost && (
              <span className="text-xs font-mono text-zinc-400">
                Post #{todayPost.id}
              </span>
            )}
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-4 bg-[#18181b] border border-[#27272a] rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Daemon Schedule</h3>
            <Clock size={16} className="text-[#10b981]" />
          </div>
          <div className="mt-auto">
            <span className="text-base font-semibold tracking-tight text-[#f4f4f5]">
              {autoStatus?.automationEnabled ? autoStatus.nextRun : 'Cron Daemon Disabled'}
            </span>
          </div>
        </div>

        <div className="card p-5 flex flex-col justify-between bg-[#18181b] border border-[#27272a] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Quick Links</h3>
            <Zap size={16} className="text-[#10b981]" />
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/debug" className="text-[#10b981] hover:underline font-medium">
              View Debug Gate Logs &rarr;
            </Link>
            <span className="text-zinc-600">|</span>
            <Link to="/candidates" className="text-zinc-300 hover:text-white hover:underline">
              Pinterest Gallery &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {/* Source Pinterest Image */}
        <div className="card flex flex-col h-[520px] overflow-hidden bg-[#18181b] border border-[#27272a] rounded-lg">
          <div className="px-5 py-4 border-b border-[#27272a] flex justify-between items-center bg-[#18181b]">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
              <ImageIcon size={16} className="text-[#10b981]" />
              Selected Pinterest Art
            </h2>
            {todayPost && (
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300 font-mono">
                Pinterest Source
              </span>
            )}
          </div>
          <div className="p-5 flex-1 bg-[#09090b] flex items-center justify-center relative group overflow-hidden">
            {todayPost ? (
              <>
                <img 
                  src={todayPost.image_url} 
                  alt="Original Pinterest Art" 
                  className="max-h-full max-w-full object-contain rounded-md shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <a 
                  href={todayPost.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-5 right-5 btn-secondary px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-[#18181b]/90 backdrop-blur-md border border-[#27272a] text-white rounded transition-opacity"
                >
                  <ExternalLink size={13} />
                  <span>Inspect High-Res</span>
                </a>
              </>
            ) : (
              <div className="text-center text-[#71717a] flex flex-col items-center">
                <ImageIcon size={28} className="mb-3 opacity-40 text-zinc-500" />
                <p className="text-sm text-zinc-400 font-medium">No image selected yet.</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Click "Force Pipeline Run" above to discover and select today's trending Pinterest art.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Retro 1-Bit Dithered Render */}
        <div className="card flex flex-col h-[520px] overflow-hidden bg-[#18181b] border border-[#27272a] rounded-lg">
          <div className="px-5 py-4 border-b border-[#27272a] flex justify-between items-center bg-[#18181b]">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
              <Zap size={16} className="text-[#10b981]" />
              1-Bit Atkinson Retro CRT Render
            </h2>
            <span className="text-[11px] text-zinc-400 font-mono">Output Artifact</span>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-2">
            {todayPost && todayPost.ascii_output_path ? (
              <img 
                src={getRenderPath(todayPost.ascii_output_path)} 
                alt="1-Bit Retro CRT Render" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  if (!e.target.src.includes(':3001')) {
                    e.target.src = 'http://localhost:3001' + todayPost.ascii_output_path;
                  }
                }}
              />
            ) : (
              <AsciiPreview text="" loading={false} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
