import { useState, useRef, useCallback } from "react";
import { Upload, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ImageUploadZoneProps {
  title: string;
  onImageSelect: (file: File | null, url: string | null) => void;
  previewUrl?: string | null;
}

export const ImageUploadZone = ({ title, onImageSelect, previewUrl }: ImageUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      onImageSelect(files[0], null);
      setShowUrlInput(false);
      setUrlValue("");
    }
  }, [onImageSelect]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelect(files[0], null);
      setShowUrlInput(false);
      setUrlValue("");
    }
  }, [onImageSelect]);

  const handleUrlSubmit = useCallback(() => {
    if (urlValue.trim()) {
      onImageSelect(null, urlValue.trim());
      setShowUrlInput(false);
    }
  }, [urlValue, onImageSelect]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      
      {!previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            glass-effect rounded-lg p-8 transition-all duration-300
            ${isDragging ? "border-accent glow-effect scale-[1.02]" : "border-border/50"}
            cursor-pointer group hover:border-accent/50 hover:glow-effect
          `}
          onClick={() => !showUrlInput && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-all duration-300">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                Drop your image here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>

            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {!showUrlInput ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUrlInput(true);
                }}
                className="gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                Paste URL
              </Button>
            ) : (
              <div className="w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  className="glass-effect"
                  onKeyPress={(e) => e.key === "Enter" && handleUrlSubmit()}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUrlSubmit}
                    className="flex-1"
                  >
                    Use URL
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowUrlInput(false);
                      setUrlValue("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="glass-effect rounded-lg p-2 luxury-shadow">
            <img
              src={previewUrl}
              alt={title}
              className="w-full h-64 object-cover rounded-md"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onImageSelect(null, null);
              setUrlValue("");
            }}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
};
