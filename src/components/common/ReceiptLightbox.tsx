import React, { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { downloadFile } from '../../utils/platform';

interface ReceiptLightboxProps {
  receiptBlob: Blob | null;
  onClose: () => void;
  title?: string;
}

export const ReceiptLightbox: React.FC<ReceiptLightboxProps> = ({
  receiptBlob,
  onClose,
  title = 'Receipt Photo',
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  useEffect(() => {
    if (!receiptBlob) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(receiptBlob);
    setImageUrl(url);
    setZoom(1);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [receiptBlob]);

  if (!receiptBlob || !imageUrl) return null;

  const handleDownload = () => {
    downloadFile(receiptBlob, `receipt_${Date.now()}.jpg`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      {/* Top Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between pb-3 text-white border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-slate-400">Offline stored receipt</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition ml-2"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div className="flex-1 w-full max-w-3xl flex items-center justify-center overflow-auto p-4">
        <img
          src={imageUrl}
          alt="Receipt Attachment"
          style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease' }}
          className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800"
        />
      </div>
    </div>
  );
};
