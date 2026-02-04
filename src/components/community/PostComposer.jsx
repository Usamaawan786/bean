import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image, X, Loader2, Video } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { FilePicker } from "@capawesome/capacitor-file-picker";

export default function PostComposer({ onPost, userName }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const handleImageUpload = async () => {
    try {
      setIsUploadingImage(true);

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        saveToGallery: false
      });

      if (!image.webPath) {
        return;
      }

      // Convert webPath to File object
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const file = new File([blob], `photo_${Date.now()}.${image.format}`, { type: blob.type });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast.success("Photo uploaded!");
    } catch (error) {
      const errorMsg = error?.message || String(error);
      
      // User cancelled - don't show error
      if (errorMsg.includes("cancel") || errorMsg.includes("Cancel")) {
        return;
      }

      console.error("Image upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVideoUpload = async () => {
    setIsUploadingVideo(true);
    try {
      // FilePicker will request permissions automatically and show native prompt
      const result = await FilePicker.pickMedia({
        types: ['video/*'],
        multiple: false
      });

      const fileData = result.files[0];
      if (!fileData) {
        setIsUploadingVideo(false);
        return;
      }

      const videoSrc = fileData.webPath || fileData.path;
      if (!videoSrc) throw new Error("Could not get video path");

      const response = await fetch(videoSrc);
      const blob = await response.blob();
      const file = new File([blob], fileData.name || `video_${Date.now()}.mp4`, { type: fileData.mimeType || 'video/mp4' });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVideoUrl(file_url);
      toast.success("Video uploaded!");
    } catch (error) {
      if (error.message && error.message.includes("canceled")) {
        setIsUploadingVideo(false);
        return;
      }

      console.error("Video upload error:", error);
      toast.error("Failed to upload video. Please try again.");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsPosting(true);
    await onPost({
      content: content.trim(),
      post_type: "general",
      image_url: imageUrl || undefined,
      video_url: videoUrl || undefined,
      author_name: userName
    });
    setContent("");
    setImageUrl("");
    setVideoUrl("");
    setIsPosting(false);
  };

  return (
    <div className="rounded-3xl bg-white border border-[#E8DED8] p-4 shadow-sm">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your coffee moment..."
        className="min-h-[100px] border-[#E8DED8] rounded-2xl resize-none focus:ring-[#8B7355] focus:border-[#8B7355]"
      />

      {imageUrl && (
        <div className="mt-3 relative inline-block">
          <img src={imageUrl} alt="Upload" className="h-24 rounded-xl object-cover" />
          <button
            onClick={() => setImageUrl("")}
            className="absolute -top-2 -right-2 bg-[#5C4A3A] text-white rounded-full p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {videoUrl && (
        <div className="mt-3 relative inline-block">
          <video src={videoUrl} controls className="h-32 rounded-xl" />
          <button
            onClick={() => setVideoUrl("")}
            className="absolute -top-2 -right-2 bg-[#5C4A3A] text-white rounded-full p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleImageUpload}
            disabled={isUploadingImage || videoUrl}
            className={`flex items-center gap-1 transition-colors ${videoUrl ? "text-[#E8DED8] cursor-not-allowed" : "text-[#C9B8A6] hover:text-[#8B7355]"
              }`}
          >
            {isUploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
            <span className="text-xs">Photo</span>
          </button>

          <button
            type="button"
            onClick={handleVideoUpload}
            disabled={isUploadingVideo || imageUrl}
            className={`flex items-center gap-1 transition-colors ${imageUrl ? "text-[#E8DED8] cursor-not-allowed" : "text-[#C9B8A6] hover:text-[#8B7355]"
              }`}
          >
            {isUploadingVideo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            <span className="text-xs">Video</span>
          </button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isPosting}
          size="sm"
          className="rounded-xl bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] flex-shrink-0"
        >
          {isPosting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1.5" />
          )}
          Post
        </Button>
      </div>
    </div>
  );
}