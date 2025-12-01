import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { AsciiConfig, PlayerState } from '../types';
import { ASCII_RAMPS } from '../constants';

interface AsciiProcessorProps {
  videoSrc: string;
  config: AsciiConfig;
  onStateChange: (state: PlayerState) => void;
}

export interface AsciiProcessorRef {
  startRecording: () => void;
  stopRecording: () => void;
}

const FONT_SIZE = 12;
const CHAR_WIDTH = FONT_SIZE * 0.6; // Approximation for monospace
const CHAR_HEIGHT = FONT_SIZE;

const AsciiProcessor = forwardRef<AsciiProcessorRef, AsciiProcessorProps>(({ videoSrc, config, onStateChange }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    startRecording: () => {
      const canvas = outputCanvasRef.current;
      if (!canvas) return;

      const stream = canvas.captureStream(30); // 30 FPS
      const mimeTypes = ['video/mp4', 'video/webm'];
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

      if (!mimeType) {
        alert('Video recording is not supported in this browser.');
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ascii-capture.${mimeType === 'video/mp4' ? 'mp4' : 'webm'}`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
    },
    stopRecording: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }));

  const getChar = useCallback((brightness: number, ramp: string) => {
    // Apply contrast
    const contrastFactor = (259 * (config.contrast * 255 + 255)) / (255 * (259 - config.contrast * 255));
    let adjustedBrightness = contrastFactor * (brightness - 128) + 128;
    
    // Clamp
    adjustedBrightness = Math.max(0, Math.min(255, adjustedBrightness));
    
    if (config.inverted) {
        adjustedBrightness = 255 - adjustedBrightness;
    }

    const index = Math.floor((adjustedBrightness / 255) * (ramp.length - 1));
    return ramp[index];
  }, [config.contrast, config.inverted]);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const outputCanvas = outputCanvasRef.current;
    
    if (!video || !hiddenCanvas || !outputCanvas || video.paused || video.ended) {
      return;
    }

    const ctxHidden = hiddenCanvas.getContext('2d', { willReadFrequently: true });
    const ctxOutput = outputCanvas.getContext('2d');
    if (!ctxHidden || !ctxOutput) return;

    // Calculate dimensions
    const aspectRatio = video.videoHeight / video.videoWidth;
    const charsX = config.width;
    const charsY = Math.floor(charsX * aspectRatio * 0.5); // 0.5 corrects for char aspect ratio

    // Setup hidden canvas for pixel sampling
    hiddenCanvas.width = charsX;
    hiddenCanvas.height = charsY;
    ctxHidden.drawImage(video, 0, 0, charsX, charsY);

    // Setup output canvas for rendering text
    const outWidth = charsX * CHAR_WIDTH;
    const outHeight = charsY * CHAR_HEIGHT;
    
    // Resize output canvas only if dimensions changed to avoid flickering
    if (outputCanvas.width !== outWidth || outputCanvas.height !== outHeight) {
        outputCanvas.width = outWidth;
        outputCanvas.height = outHeight;
    }

    // Clear output
    ctxOutput.fillStyle = '#000000';
    ctxOutput.fillRect(0, 0, outWidth, outHeight);
    
    ctxOutput.font = `${FONT_SIZE}px monospace`;
    ctxOutput.textBaseline = 'top';

    const imageData = ctxHidden.getImageData(0, 0, charsX, charsY);
    const data = imageData.data;
    const ramp = ASCII_RAMPS.STANDARD;

    // We can optimize color switching by batching, but for simplicity/robustness we set it per char
    // or use a default if color is off.
    if (!config.color) {
        ctxOutput.fillStyle = '#33ff00';
    }

    for (let y = 0; y < charsY; y++) {
      for (let x = 0; x < charsX; x++) {
        const offset = (y * charsX + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        
        // Luminosity
        const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const char = getChar(brightness, ramp);

        if (config.color) {
            ctxOutput.fillStyle = `rgb(${r},${g},${b})`;
        }

        ctxOutput.fillText(char, x * CHAR_WIDTH, y * CHAR_HEIGHT);
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [config, getChar]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        video.play().then(() => {
            onStateChange(PlayerState.PLAYING);
            animationRef.current = requestAnimationFrame(processFrame);
        }).catch(e => {
            console.error("Autoplay prevented", e);
            onStateChange(PlayerState.PAUSED);
        });
    }

    return () => {
        if(animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [videoSrc, processFrame, onStateChange]);

  const handleEnded = () => {
     if(animationRef.current) cancelAnimationFrame(animationRef.current);
     if(mediaRecorderRef.current?.state === 'recording') {
         mediaRecorderRef.current.stop();
     }
     onStateChange(PlayerState.IDLE);
  };

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black relative">
      <video
        ref={videoRef}
        src={videoSrc}
        className="hidden"
        onEnded={handleEnded}
        onPlay={() => onStateChange(PlayerState.PLAYING)}
        onPause={() => onStateChange(PlayerState.PAUSED)}
        muted
        loop
        playsInline
      />
      <canvas ref={hiddenCanvasRef} className="hidden" />
      
      {error ? (
        <div className="text-red-500 font-mono">{error}</div>
      ) : (
        <canvas 
            ref={outputCanvasRef}
            className="w-full h-full object-contain"
            style={{ 
                imageRendering: 'pixelated',
                filter: config.color ? 'none' : 'drop-shadow(0 0 5px rgba(51, 255, 0, 0.5))'
            }}
        />
      )}
    </div>
  );
});

export default AsciiProcessor;
