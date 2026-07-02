import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Clock, Image as ImageIcon, Play, Zap } from 'lucide-react';
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
    const loadingToast = toast.loading('Running full pipeline...');
    try {
      await api.post('/automation/run');
      toast.success('Pipeline completed!', { id: loadingToast });
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Pipeline failed', { id: loadingToast });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f5]">Overview</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Today's automated processing pipeline and statistics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#a1a1aa]">Today's Status</h3>
            <Activity size={16} className="text-[#a1a1aa]" />
          </div>
          <div className="mt-auto">
            {todayPost ? <StatusBadge status={todayPost.status} /> : <StatusBadge status="pending" />}
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#a1a1aa]">Next Run</h3>
            <Clock size={16} className="text-[#a1a1aa]" />
          </div>
          <div className="mt-auto">
            <span className="text-lg font-semibold tracking-tight text-[#f4f4f5]">
              {autoStatus?.automationEnabled ? autoStatus.nextRun : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#a1a1aa]">Actions</h3>
            <Zap size={16} className="text-[#a1a1aa]" />
          </div>
          <button 
            onClick={handleRunPipeline}
            disabled={running || autoStatus?.isRunning}
            className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {running || autoStatus?.isRunning ? (
              <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            Force Pipeline Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="card flex flex-col h-[500px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#27272a] flex justify-between items-center bg-[#18181b]">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon size={16} className="text-[#a1a1aa]" />
              Selected Source Image
            </h2>
          </div>
          <div className="p-5 flex-1 bg-[#09090b] flex items-center justify-center relative group">
            {todayPost ? (
              <>
                <img 
                  src={todayPost.image_url} 
                  alt="Original" 
                  className="max-h-full object-contain rounded-md shadow-lg"
                />
                <a 
                  href={todayPost.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-5 right-5 btn-secondary px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100"
                >
                  View Original
                </a>
              </>
            ) : (
              <div className="text-center text-[#71717a] flex flex-col items-center">
                <ImageIcon size={24} className="mb-3 opacity-50" />
                <p className="text-sm">No image selected for today.</p>
                <Link to="/candidates" className="text-[#f4f4f5] font-medium text-xs mt-3 underline underline-offset-4 decoration-[#3f3f46] hover:decoration-[#f4f4f5] transition-colors">
                  Browse Candidates
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="h-[500px]">
          {todayPost ? (
            <div className="card h-full overflow-hidden p-0">
               <img src={todayPost.ascii_output_path} alt="ASCII Render" className="w-full h-full object-cover" />
            </div>
          ) : (
             <AsciiPreview text="" loading={false} />
          )}
        </div>
      </div>
    </div>
  );
}
