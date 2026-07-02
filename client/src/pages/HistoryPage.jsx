import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { ExternalLink, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      await api.post(`/posts/${id}/retry`);
      toast.success('Retry successful!');
      loadHistory();
    } catch (error) {
      toast.error('Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f5]">History</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Record of all generated ASCII art and publishing attempts.</p>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181b] border-b border-[#27272a]">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Image</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider w-full">Caption</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a] bg-[#09090b]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-[#71717a]">
                    <div className="flex justify-center"><div className="w-5 h-5 border-2 border-[#27272a] border-t-white rounded-full animate-spin"></div></div>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-[#71717a] text-sm">No records found.</td>
                </tr>
              ) : (
                posts.map(post => (
                  <tr key={post.id} className="hover:bg-[#18181b]/50 transition-colors">
                    <td className="px-5 py-4 text-[#a1a1aa] text-sm">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      {post.ascii_output_path ? (
                        <a href={post.ascii_output_path} target="_blank" rel="noopener noreferrer" className="block w-12 h-12 rounded overflow-hidden border border-[#27272a] hover:border-[#a1a1aa] transition-colors">
                          <img src={post.ascii_output_path} alt="ASCII" className="w-full h-full object-cover" />
                        </a>
                      ) : <span className="text-[#71717a]">-</span>}
                    </td>
                    <td className="px-5 py-4 text-[#f4f4f5] whitespace-normal">
                      <p className="line-clamp-2 text-sm">{post.caption || <span className="text-[#71717a] italic">No caption</span>}</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={post.status} />
                      {post.status === 'failed' && post.error_message && (
                        <p className="text-[10px] text-[#ef4444] mt-1 line-clamp-1 max-w-[150px]" title={post.error_message}>
                          {post.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {post.status === 'failed' ? (
                        <button 
                          onClick={() => handleRetry(post.id)}
                          disabled={retryingId === post.id}
                          className="text-[#f4f4f5] bg-[#27272a] px-3 py-1.5 rounded text-xs font-medium hover:bg-[#3f3f46] transition-colors flex items-center justify-end gap-1.5 ml-auto disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={retryingId === post.id ? 'animate-spin' : ''} />
                          Retry
                        </button>
                      ) : post.status === 'posted' && post.facebook_post_id ? (
                        <a 
                          href={`https://facebook.com/${post.facebook_post_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#a1a1aa] hover:text-[#f4f4f5] text-xs font-medium flex items-center justify-end gap-1 ml-auto"
                        >
                          View <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
