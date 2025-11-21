
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCrop: (blob: Blob | null) => void;
}

const CROP_DIMENSION = 200; // The final output size (200x200)

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, onClose, imageSrc, onCrop }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.1); // Dynamic minimum zoom
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Reset state when a new image is loaded
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      // Zoom will be set by onImageLoad
    }
  }, [isOpen, imageSrc]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    // Calculate the scale required to cover the crop area (CROP_DIMENSION)
    // We want the smallest dimension of the image to fit the CROP_DIMENSION exactly at min zoom.
    const scaleWidth = CROP_DIMENSION / naturalWidth;
    const scaleHeight = CROP_DIMENSION / naturalHeight;
    const minScale = Math.max(scaleWidth, scaleHeight);

    setMinZoom(minScale);
    setZoom(minScale); // Start fully fitted
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const x = e.clientX - dragStart.x;
      const y = e.clientY - dragStart.y;
      setPosition({ x, y });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      const newZoom = zoom - e.deltaY * 0.001;
      setZoom(Math.max(minZoom, Math.min(minZoom * 10, newZoom)));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);


  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current) return;

    const image = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CROP_DIMENSION;
    canvas.height = CROP_DIMENSION;

    // Calculate the scaled image dimensions
    const scaledWidth = image.naturalWidth * zoom;
    const scaledHeight = image.naturalHeight * zoom;

    // Calculate the top-left corner of the image relative to the viewport
    // The viewport center is (position.x + canvas.width/2, position.y + canvas.height/2)
    // But simplified:
    // CSS Translate moves the image center.
    // Canvas drawImage needs the top-left coordinate of the source image on the canvas.
    
    // Center of canvas is CROP_DIMENSION / 2
    // Center of scaled image should be at (CROP_DIMENSION / 2) + position.x
    // Top-left of scaled image is Center - (scaledWidth / 2)
    
    const imageLeft = (canvas.width / 2) + position.x - (scaledWidth / 2);
    const imageTop = (canvas.height / 2) + position.y - (scaledHeight / 2);

    // Clear canvas and draw the scaled and translated image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Enable high quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(image, imageLeft, imageTop, scaledWidth, scaledHeight);

    canvas.toBlob((blob) => {
      onCrop(blob);
    }, 'image/png');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl m-4 w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-center text-slate-800 dark:text-slate-200">Editar Foto de Perfil</h3>
        </div>

        <div className="p-6">
            <div 
                className="relative w-full h-64 mx-auto overflow-hidden cursor-move bg-slate-100 dark:bg-slate-900"
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
            >
                <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Profile to crop"
                    onLoad={onImageLoad}
                    className="absolute top-1/2 left-1/2"
                    style={{
                        // CRITICAL FIX: maxWidth: 'none' ensures the CSS size matches the naturalWidth * zoom calculation used in Canvas
                        // Without this, CSS shrinks the image visually, but Canvas uses the full resolution, causing a "zoomed in" crop result.
                        maxWidth: 'none', 
                        maxHeight: 'none',
                        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        userSelect: 'none',
                        pointerEvents: 'none',
                    }}
                />
                {/* Dark overlay outside the circle */}
                <div className="absolute inset-0 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-full w-[200px] h-[200px] m-auto border-2 border-white/50"></div>
            </div>

            <div className="flex items-center gap-3 mt-4">
                <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm">zoom_out</span>
                <input
                    type="range"
                    min={minZoom}
                    max={minZoom * 5} // Allow zooming up to 5x the fit size
                    step={minZoom / 20}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                />
                 <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm">zoom_in</span>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">Arrastra para mover, usa el slider para zoom.</p>
            <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
            <button onClick={handleCrop} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Guardar</button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
