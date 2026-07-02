import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Settings, Save, Clock, Server, Power } from 'lucide-react';

export default function AutomationPage() {
  const [settings, setSettings] = useState({
    automation_enabled: 0,
    posting_time: '10:00',
    predefined_caption: '',
    sources_config: '{}'
  });
  const [sources, setSources] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
      if (res.data.sources_config) {
        setSources(JSON.parse(res.data.sources_config));
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
        sources_config: JSON.stringify(sources)
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

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#f4f4f5]">Automation Settings</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Configure the daily pipeline for image fetching and publishing.</p>
      </header>

      <div className="card p-5 border-l-4 border-l-[#10b981]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 text-[#f4f4f5]">
              <Power size={16} className={settings.automation_enabled ? "text-[#10b981]" : "text-[#71717a]"} />
              Master Switch
            </h2>
            <p className="text-[13px] text-[#a1a1aa] mt-1">Enable or disable the daily automated process.</p>
          </div>
          <button 
            onClick={toggleAutomation}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.automation_enabled === 1 ? 'bg-[#10b981]' : 'bg-[#3f3f46]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.automation_enabled === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-[#f4f4f5]">
              <Clock size={16} className="text-[#a1a1aa]" />
              Schedule
            </h2>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Posting Time (Server Time)</label>
            <input 
              type="time" 
              value={settings.posting_time}
              onChange={(e) => setSettings({...settings, posting_time: e.target.value})}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Default Caption</label>
            <textarea 
              rows={4}
              value={settings.predefined_caption}
              onChange={(e) => setSettings({...settings, predefined_caption: e.target.value})}
              className="input-field w-full px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-[#f4f4f5]">
            <Server size={16} className="text-[#a1a1aa]" />
            Image Sources
          </h2>
          <p className="text-xs text-[#a1a1aa] mb-5">Select APIs to query for daily candidates.</p>
          
          <div className="space-y-2">
            {[
              { id: 'metmuseum', label: 'Metropolitan Museum (CC0)' },
              { id: 'artinstitute', label: 'Art Institute Chicago (CC0)' },
              { id: 'wikimedia', label: 'Wikimedia Commons' },
              { id: 'openverse', label: 'Openverse' }
            ].map(source => (
              <label key={source.id} className="flex items-center gap-3 p-3 bg-[#09090b] rounded-md border border-[#27272a] cursor-pointer hover:border-[#3f3f46] transition-colors">
                <input 
                  type="checkbox"
                  checked={sources[source.id] || false}
                  onChange={(e) => setSources({...sources, [source.id]: e.target.checked})}
                  className="w-4 h-4 rounded bg-[#18181b] border-[#3f3f46] text-[#10b981] focus:ring-[#10b981] focus:ring-offset-[#09090b]"
                />
                <span className="text-sm font-medium text-[#f4f4f5]">{source.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
