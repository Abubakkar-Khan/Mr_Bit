import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import ImageCard from '../components/ImageCard';
import toast from 'react-hot-toast';
import { Search, RefreshCw } from 'lucide-react';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/images/candidates');
      setCandidates(res.data);
    } catch (error) {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchNew = async () => {
    setFetching(true);
    const t = toast.loading('Discovering new images from APIs...');
    try {
      const res = await api.post('/images/fetch');
      setCandidates(res.data.candidates);
      toast.success(`Found ${res.data.candidates.length} candidates!`, { id: t });
    } catch (error) {
      toast.error('Fetch failed', { id: t });
    } finally {
      setFetching(false);
    }
  };

  const handleSelect = async (id) => {
    const t = toast.loading('Generating retro image and publishing to Facebook...');
    try {
      await api.post(`/images/select/${id}`);
      toast.success('Published to Facebook successfully!', { id: t });
      loadCandidates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to publish candidate', { id: t });
    }
  };

  const handleReject = async (id) => {
    try {
      await api.delete(`/images/candidates/${id}`);
      setCandidates(candidates.filter(c => c.id !== id));
      toast.success('Candidate rejected');
    } catch (error) {
      toast.error('Failed to reject candidate');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f5]">Gallery</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Review and curate discovered imagery.</p>
        </header>
        
        <button 
          onClick={handleFetchNew}
          disabled={fetching}
          className="btn-secondary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
          {fetching ? 'Syncing...' : 'Sync Sources'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-6 h-6 border-2 border-[#27272a] border-t-white rounded-full animate-spin"></div>
        </div>
      ) : candidates.length === 0 ? (
        <div className="card p-16 text-center text-[#a1a1aa] flex flex-col items-center">
          <Search size={32} className="mb-4 opacity-30" />
          <h3 className="text-base font-semibold text-[#f4f4f5] mb-1">No Candidates Found</h3>
          <p className="text-sm mb-6">The system hasn't synced any images today.</p>
          <button 
            onClick={handleFetchNew}
            className="btn-primary px-5 py-2 text-sm"
          >
            Sync Sources Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {candidates.map((candidate, i) => (
            <div key={candidate.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <ImageCard 
                candidate={candidate} 
                onSelect={handleSelect}
                onReject={handleReject}
                isSelected={candidate.status === 'selected'}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
