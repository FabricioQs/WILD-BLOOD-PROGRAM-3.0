
import React from 'react';
import { ExternalLink } from 'lucide-react';

interface VideoContentProps {
  content: string;
  className?: string;
}

export const VideoContent: React.FC<VideoContentProps> = ({ content, className = "" }) => {
  // Regex to match YouTube URLs (standard, shortened, and embed)
  const youtubeRegex = /((?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}(?:[^\s]*))/g;
  
  const parts = content.split(youtubeRegex);
  
  if (parts.length === 1) {
    return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
  }

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, i) => {
        // Check if this part is a YouTube URL
        const videoMatch = part.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        
        if (videoMatch) {
          const videoId = videoMatch[1];
          return (
            <div key={i} className="my-6 animate-fade-in">
              <div className="relative pb-[56.25%] h-0 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-dark-800 bg-black group">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                {/* Overlay for better look when not playing */}
                <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-blood-600/30 transition-all rounded-2xl"></div>
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <a 
                  href={part} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-blood-600 dark:text-blood-500 hover:text-blood-700 dark:hover:text-blood-400 transition-colors flex items-center gap-1.5 font-black uppercase tracking-widest"
                >
                  <ExternalLink size={12} /> Ver en YouTube
                </a>
                <span className="text-[9px] text-slate-400 dark:text-gray-600 font-bold uppercase tracking-tighter">Video Tutorial</span>
              </div>
            </div>
          );
        }
        
        // Regular text part
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};
