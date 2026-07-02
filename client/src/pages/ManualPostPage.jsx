import React, { useState } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ManualPostPage() {
  const [inputType, setInputType] = useState('url'); // 'url' or 'file'
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  
  const [converting, setConverting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const handleConvert = async () => {
    if (inputType === 'url' && !url) return toast.error('Enter a URL');
    if (inputType === 'file' && !file) return toast.error('Select a file');

    setConverting(true);
    setImageUrl(null);

    try {
      const formData = new FormData();
      if (inputType === 'file') {
        formData.append('image', file);
      } else {
        formData.append('imageUrl', url);
      }
      formData.append('cols', '120');
      if (title) formData.append('title', title);

      const response = await api.post('/ascii/convert', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImageUrl(response.data.imageUrl);
      toast.success('Image generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handlePublish = async () => {
    if (!imageUrl) return;
    setPublishing(true);
    try {
      await api.post('/posts/publish-manual', {
        imageUrl,
        caption: title
      });
      toast.success('Successfully published to Facebook!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to publish to Facebook');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-[#E6EDF3] tracking-tight">Create Manual Post</h1>
        <p className="text-sm text-[#7d8590] mt-1">Upload an image to test the 1-bit dithering engine</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="card p-6">
            <div className="flex gap-1 mb-6 p-1 bg-[#09090b] rounded-md border border-[#27272a]">
              <button
                className={`flex-1 py-1.5 text-xs font-medium rounded flex items-center justify-center gap-2 transition-colors ${inputType === 'url' ? 'bg-[#27272a] text-white shadow-sm' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={() => setInputType('url')}
              >
                <LinkIcon size={14} /> URL
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-medium rounded flex items-center justify-center gap-2 transition-colors ${inputType === 'file' ? 'bg-[#27272a] text-white shadow-sm' : 'text-[#a1a1aa] hover:text-white'}`}
                onClick={() => setInputType('file')}
              >
                <Upload size={14} /> File
              </button>
            </div>

            {inputType === 'url' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Direct Image URL</label>
                  <input 
                    type="url" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="input-field w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Upload File</label>
                <div className="border border-dashed border-[#3f3f46] rounded-md p-6 text-center hover:bg-[#18181b] transition-colors bg-[#09090b]">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden" 
                    id="file-upload" 
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <ImageIcon size={24} className="text-[#a1a1aa] mb-2" />
                    <span className="text-white text-sm font-medium hover:underline underline-offset-2">Browse files</span>
                    <span className="text-[11px] text-[#71717a] mt-1">{file ? file.name : 'JPG, PNG up to 10MB'}</span>
                  </label>
                </div>
              </div>
            )}

            <div className="mt-5">
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Caption</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional caption for the output"
                className="input-field w-full px-3 py-2 text-sm"
              />
            </div>

            <button 
              onClick={handleConvert}
              disabled={converting || (inputType === 'url' && !url) || (inputType === 'file' && !file)}
              className="btn-primary w-full mt-6 py-2 text-sm flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {converting ? (
                <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
              ) : 'Generate Retro Image'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 h-[500px] flex flex-col gap-4">
          {converting && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[400px] border-dashed bg-transparent">
               <div className="w-8 h-8 border-4 border-[#39D353]/30 border-t-[#39D353] rounded-full animate-spin mb-4" />
               <p className="text-[#a1a1aa] text-sm font-medium">Processing 1-bit dither...</p>
            </div>
          )}

          {!converting && imageUrl && (
             <div className="flex flex-col gap-6">
               <div className="relative rounded-lg p-2 bg-[#09090b] border-2 border-[#27272a] shadow-[0_0_20px_rgba(57,255,20,0.1)] group">
                 <img 
                   src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:3001${imageUrl}`} 
                   alt="Retro preview" 
                   className="w-full h-auto object-contain rounded"
                   style={{ maxHeight: '600px' }}
                 />
                 <a 
                   href={imageUrl.startsWith('http') ? imageUrl : `http://localhost:3001${imageUrl}`} 
                   target="_blank"
                   rel="noopener noreferrer"
                   className="absolute top-4 right-4 px-3 py-1.5 bg-[#27272a]/80 backdrop-blur-sm text-white text-xs font-medium rounded-md hover:bg-[#39FF14] hover:text-black transition-all opacity-0 group-hover:opacity-100"
                 >
                   Open Full Res
                 </a>
               </div>
               
               <button 
                 onClick={handlePublish}
                 disabled={publishing}
                 className="btn-primary w-full py-2.5 text-sm flex justify-center items-center gap-2 disabled:opacity-50"
               >
                 {publishing ? (
                   <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
                 ) : 'Publish to Facebook'}
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
