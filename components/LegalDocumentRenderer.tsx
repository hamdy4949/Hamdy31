import React from 'react';
import ReactMarkdown from 'react-markdown';
import { GroundingChunk } from '../types';
import { BookOpen, Plane, ExternalLink, Download, Map, Ticket } from 'lucide-react';

interface Props {
  content: string;
  groundingChunks?: GroundingChunk[];
}

export const LegalDocumentRenderer: React.FC<Props> = ({ content, groundingChunks }) => {
  // Heuristic to detect if the content is an Itinerary or Flight Option List
  const isItinerary = content.includes('رحلة') || content.includes('إقلاع') || content.includes('سعر') || content.includes('Price') || content.includes('Itinerary');

  const handleDownloadItinerary = () => {
    // Generate an HTML-based Itinerary for download
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>FlightGenius Itinerary</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: left; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #000; }
          .meta { font-size: 12px; color: #555; }
          h1, h2, h3 { color: #0056b3; }
          .box { background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #ddd; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">FlightGenius Itinerary</div>
          <div class="meta">Official Booking Reference / Quotation</div>
        </div>
      `;
    
    const container = document.getElementById(`doc-content-${content.substring(0, 10)}`);
    const innerHTML = container ? container.innerHTML : content;
    
    const footer = "</body></html>";
    const sourceHTML = header + innerHTML + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'FlightGenius_Itinerary.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className="prose prose-invert max-w-none font-sans">
      <div className={`relative bg-[#121212] p-6 rounded-2xl border ${isItinerary ? 'border-flight-sky/30' : 'border-gray-800'}`}>
        
        {/* Header for Itineraries */}
        {isItinerary && (
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800/50">
            <div className="flex items-center text-flight-sky opacity-90">
              <Plane className="w-5 h-5 ml-2" />
              <span className="text-sm font-bold tracking-widest uppercase font-eng">Confirmed Data</span>
            </div>
            
            <button 
              onClick={handleDownloadItinerary}
              className="flex items-center gap-2 bg-flight-sky/10 hover:bg-flight-sky/20 text-flight-sky text-xs px-3 py-1.5 rounded-lg transition-colors border border-flight-sky/20"
              title="Save Itinerary"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الجدول</span>
            </button>
          </div>
        )}

        {/* Content Container */}
        <div id={`doc-content-${content.substring(0, 10)}`}>
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-flight-gold text-center mb-6 mt-4 font-eng" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-white mb-4 mt-6 flex items-center gap-2" {...props} />,
              strong: ({node, ...props}) => <strong className="text-flight-sky font-bold" {...props} />,
              a: ({node, ...props}) => <a className="text-flight-gold underline hover:text-white transition-colors" target="_blank" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-gray-300" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Citations / Booking Links */}
        {groundingChunks && groundingChunks.length > 0 && (
          <div className="mt-8 pt-4 border-t border-dashed border-gray-700">
            <h4 className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 font-eng">
              <ExternalLink className="w-4 h-4 ml-2" />
              Direct Booking Sources
            </h4>
            <div className="flex flex-wrap gap-2">
              {groundingChunks.map((chunk, idx) => {
                if (chunk.web) {
                  return (
                    <a 
                      key={idx} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-flight-sky rounded-full text-xs text-gray-400 hover:text-flight-sky transition-all duration-300 group"
                    >
                      <Ticket className="w-3 h-3 ml-1 group-hover:rotate-12 transition-transform" />
                      {chunk.web.title}
                    </a>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};