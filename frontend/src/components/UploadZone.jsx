import { useState, useRef } from 'react';
import { uploadCsv } from '../lib/api';
import { cn } from '../lib/utils';

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
  
  const getTypeColor = (type) => {
    const t = type.toLowerCase();
    if (t.includes('date') || t.includes('time')) {
      return 'text-blue-400 bg-blue-900/20 border border-blue-800/50';
    }
    if (t.includes('int') || t.includes('bigint')) {
      return 'text-emerald-400 bg-emerald-900/20 border border-emerald-800/50';
    }
    if (t.includes('float') || t.includes('decimal') || t.includes('double') || t.includes('numeric')) {
      return 'text-orange-400 bg-orange-900/20 border border-orange-800/50';
    }
    // varchar / string / text / default
    return 'text-purple-400 bg-purple-900/20 border border-purple-800/50';
  };

  return (
    <>
      <div 
        className={cn(
          "border-2 border-dashed border-indigo-accent rounded-md p-xl flex flex-col items-center justify-center bg-indigo-accent/5 hover:bg-indigo-accent/10 transition-colors cursor-pointer mb-lg group shrink-0",
          isDragging && "bg-indigo-accent/20"
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
        <span className="material-symbols-outlined text-4xl mb-sm text-indigo-accent group-hover:scale-110 transition-transform">
          cloud_upload
        </span>
        <p className="font-body-md text-body-md text-on-surface font-medium">
          {isUploading ? 'Uploading...' : 'Drag & Drop CSV or Excel'}
        </p>
        <p className="font-body-md text-label-sm text-on-surface-variant mt-xs">
          {isUploading ? 'Processing your file...' : 'or click to browse files'}
        </p>
        {error && (
          <div className="mt-4 text-sm text-error bg-error-container px-3 py-1.5 rounded-md border border-error/50">
            {error}
          </div>
        )}
      </div>

      {uploadData && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-sm border-b surface-border pb-sm shrink-0">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Schema Preview</h3>
            <span className="px-sm py-[2px] rounded bg-surface-variant text-label-sm text-on-surface font-label-sm flex items-center">
              Ready
            </span>
          </div>
          <div className="flex-1 overflow-y-auto border surface-border rounded-md bg-surface shadow-premium">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface z-10 border-b surface-border shadow-sm">
                <tr>
                  <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant font-medium">Column Name</th>
                  <th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md divide-y surface-border">
                {uploadData.schema.map((col, idx) => (
                  <tr key={idx} className="hover:bg-surface-variant transition-colors">
                    <td className="py-sm px-md text-on-surface font-code text-code">{col.name}</td>
                    <td className="py-sm px-md">
                      <span className={cn("px-xs py-[2px] rounded-sm font-code text-[11px]", getTypeColor(col.type))}>
                        {col.type.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
