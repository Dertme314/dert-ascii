import React, { useState, useRef, ChangeEvent } from 'react';
import { AsciiConfig, PlayerState } from './types';
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from './constants';
import AsciiProcessor, { AsciiProcessorRef } from './components/AsciiProcessor';
import { Upload, Film, Settings, Video, Palette, Square, Circle } from 'lucide-react';

export default function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.IDLE);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState(false);
  
  const processorRef = useRef<AsciiProcessorRef>(null);

  const [config, setConfig] = useState<AsciiConfig>({
    width: DEFAULT_WIDTH,
    contrast: 0.1,
    inverted: false,
    color: false,
  });

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.indexOf('video/') === -1) {
        alert('Please upload a valid MP4 video file.');
        return;
      }
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setPlayerState(PlayerState.PLAYING);
    }
  };

  const toggleRecording = () => {
    if (!processorRef.current) return;
    
    if (isRecording) {
      processorRef.current.stopRecording();
      setIsRecording(false);
    } else {
      processorRef.current.startRecording();
      setIsRecording(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden relative">
      
      {/* Main Viewport */}
      <main 
        className="flex-1 flex items-center justify-center relative z-0"
        onMouseEnter={() => setShowControls(true)}
      >
        {!videoSrc ? (
          <div className="text-center p-8 border-2 border-dashed border-green-900 rounded-lg max-w-lg bg-green-900/10">
            <Film className="w-16 h-16 mx-auto text-green-700 mb-4" />
            <h1 className="text-2xl font-bold text-green-500 font-mono mb-2">ASCII VIDEO DECK</h1>
            <p className="text-green-800 font-mono text-sm mb-6">Made By Dert</p>
            
            <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-green-700 hover:bg-green-600 text-black font-bold font-mono rounded transition-colors shadow-[0_0_15px_rgba(0,255,0,0.3)]">
              <Upload className="w-5 h-5 mr-2" />
              INSERT TAPE (MP4)
              <input 
                type="file" 
                accept="video/mp4,video/webm" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
            <p className="mt-4 text-xs text-green-900/50 font-mono">Drag & drop not supported. Use the button.</p>
          </div>
        ) : (
          <AsciiProcessor 
            ref={processorRef}
            videoSrc={videoSrc} 
            config={config} 
            onStateChange={setPlayerState}
          />
        )}
      </main>

      {/* Control Deck */}
      {videoSrc && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 transition-transform duration-300 z-10 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}
          onMouseLeave={() => setShowControls(false)}
        >
          <div className="max-w-4xl mx-auto bg-gray-900/90 border border-green-900/50 backdrop-blur-md rounded-xl p-4 shadow-2xl text-green-500 font-mono">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Status Display */}
              <div className="flex items-center space-x-4 w-full md:w-auto">
                <div className={`w-3 h-3 rounded-full ${playerState === PlayerState.PLAYING ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#0f0]' : 'bg-red-500'}`}></div>
                <span className="text-xs tracking-widest uppercase text-green-400">
                    {playerState === PlayerState.PLAYING ? 'RUNNING' : 'HALTED'}
                </span>
                <button 
                  onClick={() => setVideoSrc(null)}
                  className="ml-auto text-xs text-red-400 hover:text-red-300 underline"
                >
                  EJECT
                </button>
              </div>

              {/* Sliders */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                 {/* Resolution */}
                 <div className="flex flex-col space-y-1">
                    <div className="flex justify-between text-xs">
                        <span>DENSITY</span>
                        <span>{config.width} CHARS</span>
                    </div>
                    <input 
                        type="range" 
                        min={MIN_WIDTH} 
                        max={MAX_WIDTH} 
                        value={config.width}
                        onChange={(e) => setConfig(prev => ({ ...prev, width: Number(e.target.value) }))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                 </div>

                 {/* Contrast */}
                 <div className="flex flex-col space-y-1">
                    <div className="flex justify-between text-xs">
                        <span>CONTRAST</span>
                        <span>{(config.contrast * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="-0.5" 
                        max="0.8" 
                        step="0.05"
                        value={config.contrast}
                        onChange={(e) => setConfig(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                 </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center space-x-3">
                 <button 
                    onClick={() => setConfig(prev => ({ ...prev, inverted: !prev.inverted }))}
                    className={`p-2 rounded border transition-colors ${config.inverted ? 'bg-green-500 text-black border-green-500' : 'bg-transparent text-green-500 border-green-800 hover:border-green-500'}`}
                    title="Invert Colors"
                 >
                    <Settings className="w-4 h-4" />
                 </button>

                 <button 
                    onClick={() => setConfig(prev => ({ ...prev, color: !prev.color }))}
                    className={`p-2 rounded border transition-colors ${config.color ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-green-500 border-green-800 hover:border-green-500'}`}
                    title="Color Mode"
                 >
                    <Palette className="w-4 h-4" />
                 </button>

                 <div className="h-6 w-px bg-green-900/50 mx-2"></div>

                 <button 
                    onClick={toggleRecording}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded border transition-all ${
                        isRecording 
                        ? 'bg-red-500 text-white border-red-500 animate-pulse' 
                        : 'bg-transparent text-green-500 border-green-800 hover:border-green-500'
                    }`}
                    title="Record to MP4/WebM"
                 >
                    {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Circle className="w-4 h-4 fill-current" />}
                    <span className="text-xs font-bold">{isRecording ? 'STOP' : 'REC'}</span>
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CRT Scanline Overlay Effect */}
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden opacity-10">
        <div className="w-full h-full" style={{
            background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
            backgroundSize: '100% 2px, 3px 100%'
        }}></div>
      </div>
    </div>
  );
}
