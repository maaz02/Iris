import { useState, useRef } from 'react';
import { UploadCloud, FileType, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadCsv } from '../lib/api';

export default function UploadZone({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadData, setUploadData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    const filename = file?.name?.toLowerCase() || '';
    if (!filename.endsWith('.csv') && !filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
      setError('Please upload a valid CSV or Excel file.');
      return;
    }

    setError(null);
    setIsUploading(true);
    
    try {
      const data = await uploadCsv(file);
      setUploadData(data);
      onUploadSuccess(data.session_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full mb-8">
      {!uploadData ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out flex flex-col items-center justify-center cursor-pointer group",
            isDragging 
              ? "border-accent-500 bg-accent-950/50" 
              : "border-zinc-800 hover:border-accent-700 hover:bg-zinc-900/50 bg-zinc-900"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <div className={cn(
            "p-4 rounded-full mb-4 transition-colors",
            isDragging ? "bg-accent-900/50 text-accent-400" : "bg-zinc-800 text-zinc-400 group-hover:bg-accent-900/30 group-hover:text-accent-400"
          )}>
            <UploadCloud size={32} />
          </div>
          <h3 className="text-lg font-medium text-zinc-100 mb-1">
            {isUploading ? 'Uploading...' : 'Upload your data'}
          </h3>
          <p className="text-sm text-zinc-400 text-center max-w-sm">
            {isUploading 
              ? 'Processing your file...' 
              : 'Drag and drop a CSV or Excel file here, or click to browse'}
          </p>
          {error && (
            <div className="mt-4 text-sm text-red-400 bg-red-950/50 px-3 py-1.5 rounded-md border border-red-900/50">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-950/50 text-emerald-400 p-2 rounded-full">
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-100">Data ready</h3>
                <p className="text-xs text-zinc-400">Schema successfully inferred</p>
                {uploadData.sheet_used && (
                  <p className="text-xs text-accent-400 mt-1">Loaded from sheet: {uploadData.sheet_used}</p>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                setUploadData(null);
                onUploadSuccess(null);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Upload different file
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-zinc-800/30 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Column</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {uploadData.schema.map((col, idx) => {
                  const sampleObj = uploadData.samples.find(s => s.column === col.name);
                  return (
                    <tr key={idx} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-zinc-100">{col.name}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
                          {col.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-400 truncate max-w-xs">
                        {sampleObj?.samples?.join(', ') || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
