import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  Settings, Save, Clock, Power, Sparkles, Filter, 
  Layers, Sliders, Hash, Plus, X, ShieldAlert, Cpu
} from 'lucide-react';

export default function AutomationPage() {
  const [settings, setSettings] = useState({
    automation_enabled: 0,
    posting_time: '10:00',
    posts_per_day: 1,
    predefined_caption: '',
    min_saves: 50,
    min_dimension: 600,
    max_dimension: 2048,
    min_sharpness: 20.0,
    min_aesthetic_score: 5.0
  });

  const [pinterestQueries, setPinterestQueries] = useState([
    'digital art trending',
    'concept art',
    'cyberpunk landscape',
    'retro anime aesthetic'
  ]);
  const [newQuery, setNewQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
      if (res.data.pinterest_queries) {
        try {
          const parsed = JSON.parse(res.data.pinterest_queries);
          if (Array.isArray(parsed)) setPinterestQueries(parsed);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        ...settings,
        pinterest_queries: JSON.stringify(pinterestQueries)
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleAutomation = async () => {
    try {
      const enabled = settings.automation_enabled === 1 ? 0 : 1;
      await api.post('/automation/toggle', { enabled: enabled === 1 });
      setSettings({ ...settings, automation_enabled: enabled });
      toast.success(`Automation ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to toggle automation');
    }
  };

  const addQuery = (e) => {
    e?.preventDefault();
    const trimmed = newQuery.trim().toLowerCase();
    if (!trimmed) return;
    if (pinterestQueries.includes(trimmed)) {
      toast.error('Query tag already exists');
      return;
    }
    setPinterestQueries([...pinterestQueries, trimmed]);
    setNewQuery('');
  };

  const removeQuery = (queryToRemove) => {
    if (pinterestQueries.length <= 1) {
      toast.error('Keep at least one search query');
      return;
    }
    setPinterestQueries(pinterestQueries.filter(q => q !== queryToRemove));
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings size={24} className="text-[#10b981]" />
          Pinterest Pipeline & Automation
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1">
          Configure Pinterest trending discovery, 3-tier quality gates (Saves, OpenCV, Quantized Model), and daily publication schedule.
        </p>
      </header>

      {/* Master Switch Banner */}
      <div className="card p-5 border-l-4 border-l-[#10b981] bg-[#18181b]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 text-white">
              <Power size={16} className={settings.automation_enabled ? "text-[#10b981]" : "text-zinc-500"} />
              Automation Master Switch
            </h2>
            <p className="text-xs text-[#a1a1aa] mt-1">
              When enabled, the daemon runs the Pinterest discovery & 3-stage scoring pipeline automatically on schedule.
            </p>
          </div>
          <button 
            onClick={toggleAutomation}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.automation_enabled === 1 ? 'bg-[#10b981]' : 'bg-zinc-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.automation_enabled === 1 ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Schedule & Volume */}
        <div className="card p-6 space-y-6 bg-[#18181b] border border-[#27272a] rounded-lg">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-white">
              <Clock size={16} className="text-[#10b981]" />
              Publishing Schedule & Daily Volume
            </h2>

            {/* Posts Per Day */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-[#a1a1aa] mb-2">
                Posts Each Day
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSettings({ ...settings, posts_per_day: num })}
                    className={`flex-1 py-1.5 text-xs font-mono font-medium rounded border transition-colors ${
                      settings.posts_per_day === num
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-[#09090b] text-zinc-400 border-[#27272a] hover:text-white'
                    }`}
                  >
                    {num}x/day
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Automatically spaces out posts evenly throughout daytime hours.
              </p>
            </div>

            {/* Base Posting Time */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Start / Anchor Posting Time (Server Time)
              </label>
              <input 
                type="time" 
                value={settings.posting_time}
                onChange={(e) => setSettings({...settings, posting_time: e.target.value})}
                className="input-field w-full px-3 py-2 text-sm bg-[#09090b] border border-[#27272a] rounded text-white"
              />
            </div>

            {/* Default Caption */}
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Default Caption Template
              </label>
              <textarea 
                rows={3}
                value={settings.predefined_caption}
                onChange={(e) => setSettings({...settings, predefined_caption: e.target.value})}
                className="input-field w-full px-3 py-2 text-sm bg-[#09090b] border border-[#27272a] rounded text-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Card: Pinterest Discovery Tags */}
        <div className="card p-6 bg-[#18181b] border border-[#27272a] rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 text-white">
              <Hash size={16} className="text-[#10b981]" />
              Pinterest Search Topics & Style Queries
            </h2>
            <p className="text-xs text-[#a1a1aa] mb-4">
              The scraper explores trending pins matching these keywords:
            </p>

            {/* Tag List */}
            <div className="flex flex-wrap gap-2 mb-4">
              {pinterestQueries.map((query) => (
                <span
                  key={query}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#09090b] border border-[#27272a] text-xs text-zinc-300 font-medium"
                >
                  #{query}
                  <button
                    type="button"
                    onClick={() => removeQuery(query)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Tag Input */}
            <form onSubmit={addQuery} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. dark fantasy art, retro sci-fi..."
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-[#09090b] border border-[#27272a] rounded text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 flex items-center gap-1"
              >
                <Plus size={13} />
                Add Tag
              </button>
            </form>
          </div>

          <div className="mt-6 p-3 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
            💡 <strong>Tip:</strong> Search terms like <em>"concept art"</em>, <em>"digital illustration"</em>, or <em>"matte painting"</em> discover the highest engagement visual art.
          </div>
        </div>
      </div>

      {/* 3-Tier Filter & Dimension Bounds Configuration */}
      <div className="card p-6 bg-[#18181b] border border-[#27272a] rounded-lg space-y-6">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-1 text-white">
            <Sliders size={16} className="text-[#10b981]" />
            3-Tier Quality & Dimension Safety Gates
          </h2>
          <p className="text-xs text-[#a1a1aa]">
            Control exact acceptance thresholds across the 3 sequential evaluation gates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gate 1: Saves & Dimensions */}
          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 border-b border-zinc-800/80 pb-2">
              <Layers size={14} />
              Gate 1: Saves & Max Bounds
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Min Pinterest Saves / Repins
              </label>
              <input
                type="number"
                min="0"
                max="10000"
                value={settings.min_saves}
                onChange={(e) => setSettings({ ...settings, min_saves: parseInt(e.target.value, 10) || 0 })}
                className="input-field w-full px-2.5 py-1.5 text-xs bg-[#18181b] border border-zinc-800 rounded text-white font-mono"
              />
              <span className="text-[10px] text-zinc-500">Filters out unpopular / low-engagement pins</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Max Dimension (px) - Safety Cap
              </label>
              <input
                type="number"
                min="1000"
                max="4096"
                step="128"
                value={settings.max_dimension}
                onChange={(e) => setSettings({ ...settings, max_dimension: parseInt(e.target.value, 10) || 2048 })}
                className="input-field w-full px-2.5 py-1.5 text-xs bg-[#18181b] border border-zinc-800 rounded text-white font-mono"
              />
              <span className="text-[10px] text-zinc-500">Prevents downloading massive 4K/8K images</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Min Dimension (px)
              </label>
              <input
                type="number"
                min="300"
                max="1200"
                step="50"
                value={settings.min_dimension}
                onChange={(e) => setSettings({ ...settings, min_dimension: parseInt(e.target.value, 10) || 600 })}
                className="input-field w-full px-2.5 py-1.5 text-xs bg-[#18181b] border border-zinc-800 rounded text-white font-mono"
              />
              <span className="text-[10px] text-zinc-500">Skips small, blurry thumbnails</span>
            </div>
          </div>

          {/* Gate 2: OpenCV Quality Metrics */}
          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 border-b border-zinc-800/80 pb-2">
              <ShieldAlert size={14} />
              Gate 2: OpenCV Computer Vision
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Min Laplacian Sharpness (Variance)
              </label>
              <input
                type="number"
                min="5"
                max="150"
                step="5"
                value={settings.min_sharpness}
                onChange={(e) => setSettings({ ...settings, min_sharpness: parseFloat(e.target.value) || 20 })}
                className="input-field w-full px-2.5 py-1.5 text-xs bg-[#18181b] border border-zinc-800 rounded text-white font-mono"
              />
              <span className="text-[10px] text-zinc-500">Penalizes blurry screenshots or out-of-focus art (Standard: 20-30)</span>
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 leading-relaxed">
              OpenCV computes edge gradient variance and Hasler-Süsstrunk dynamic colorfulness directly on the downloaded image buffer.
            </div>
          </div>

          {/* Gate 3: Quantized Model Evaluation */}
          <div className="p-4 rounded-lg bg-[#09090b] border border-[#27272a] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 border-b border-zinc-800/80 pb-2">
              <Cpu size={14} />
              Gate 3: Quantized Model Aesthetic
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Min Aesthetic Score (Scale 1.0 - 10.0)
              </label>
              <input
                type="number"
                min="1.0"
                max="9.5"
                step="0.5"
                value={settings.min_aesthetic_score}
                onChange={(e) => setSettings({ ...settings, min_aesthetic_score: parseFloat(e.target.value) || 5.0 })}
                className="input-field w-full px-2.5 py-1.5 text-xs bg-[#18181b] border border-zinc-800 rounded text-white font-mono"
              />
              <span className="text-[10px] text-zinc-500">Evaluates visual composition and lighting balance</span>
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 leading-relaxed">
              Runs an ultra-lightweight INT8 quantized vision model on CPU without GPU overhead.
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-black font-semibold rounded-md disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Saving Settings...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
