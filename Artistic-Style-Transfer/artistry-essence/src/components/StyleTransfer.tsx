import { useState, useEffect } from "react";
import { ImageUploadZone } from "./ImageUploadZone";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const StyleTransfer = () => {
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [styleUrl, setStyleUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [contentPreview, setContentPreview] = useState<string | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (contentFile) {
      const url = URL.createObjectURL(contentFile);
      setContentPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (contentUrl) {
      setContentPreview(contentUrl);
    } else {
      setContentPreview(null);
    }
  }, [contentFile, contentUrl]);

  useEffect(() => {
    if (styleFile) {
      const url = URL.createObjectURL(styleFile);
      setStylePreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (styleUrl) {
      setStylePreview(styleUrl);
    } else {
      setStylePreview(null);
    }
  }, [styleFile, styleUrl]);

  const handleContentSelect = (file: File | null, url: string | null) => {
    setContentFile(file);
    setContentUrl(url);
  };

  const handleStyleSelect = (file: File | null, url: string | null) => {
    setStyleFile(file);
    setStyleUrl(url);
  };

  const isReadyToTransfer = () => {
    const hasContent = contentFile || contentUrl;
    const hasStyle = styleFile || styleUrl;
    return hasContent && hasStyle && !isProcessing;
  };

  const handleStyleTransfer = async () => {
    if (!isReadyToTransfer()) return;

    setIsProcessing(true);
    setResultImage(null);

    try {
      const formData = new FormData();
      
      if (contentFile) {
        formData.append("content_file", contentFile);
      } else if (contentUrl) {
        formData.append("content_url", contentUrl);
      }
      
      if (styleFile) {
        formData.append("style_file", styleFile);
      } else if (styleUrl) {
        formData.append("style_url", styleUrl);
      }

      const response = await fetch("http://127.0.0.1:8000/style-transfer/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("image")) {
        throw new Error("Response is not an image");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setResultImage(imageUrl);

      toast({
        title: "Success",
        description: "Style transfer completed successfully",
      });
    } catch (error) {
      console.error("Style transfer error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process style transfer",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
            Artistic Style Transfer
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Transform your images with the elegance of neural style transfer
          </p>
        </div>

        {/* Upload Zones */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12 animate-scale-in">
          <ImageUploadZone
            title="Content Image"
            onImageSelect={handleContentSelect}
            previewUrl={contentPreview}
          />
          <ImageUploadZone
            title="Style Image"
            onImageSelect={handleStyleSelect}
            previewUrl={stylePreview}
          />
        </div>

        {/* Transfer Button */}
        <div className="flex justify-center mb-12 animate-fade-in">
          <Button
            onClick={handleStyleTransfer}
            disabled={!isReadyToTransfer()}
            size="lg"
            className={`
              px-8 py-6 text-lg font-medium rounded-xl
              bg-gradient-to-r from-accent to-accent/90
              hover:from-accent/90 hover:to-accent
              disabled:from-muted disabled:to-muted
              transition-all duration-300 gap-3
              ${isReadyToTransfer() ? "luxury-shadow hover:scale-105 animate-glow-pulse" : "opacity-50"}
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Apply Style Transfer
              </>
            )}
          </Button>
        </div>

        {/* Result Display */}
        {resultImage && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Your Masterpiece
              </h2>
              <p className="text-muted-foreground">
                The fusion of content and style
              </p>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent to-accent/50 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
              <div className="relative glass-effect rounded-2xl p-4 luxury-shadow">
                <img
                  src={resultImage}
                  alt="Style Transfer Result"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
