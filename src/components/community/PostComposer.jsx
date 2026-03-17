import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image, X, Loader2, Video, Plus, Coffee } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { motion, AnimatePresence } from "framer-motion";

export default function PostComposer({ onPost, userName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [hasAcceptedTerms] = useState(() => {
    return localStorage.getItem("bean_terms_accepted") === "true";
  });

  const handleImageUpload = async () => {
    if (isUploadingImage) return;
    setIsUploadingImage(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const permissions = await Camera.checkPermissions();
        if (permissions.photos !== 'granted') {
          const result = await Camera.requestPermissions({ permissions: ['photos'] });
          if (result.photos !== 'granted' && result.photos !== 'limited') {
            toast.error("Gallery access is required to upload photos");
            return;
          }
        }
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Photos,
          saveToGallery: false
        });
        if (!image?.webPath) return;
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.${image.format}`, { type: blob.type });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setImageUrl(file_url);
      } else {
        // Web fallback
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setImageUrl(file_url);
          toast.success("Photo uploaded!");
        };
        input.click();
        return;
      }
      toast.success("Photo uploaded!");
    } catch (error) {
      const msg = error?.message || String(error);
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error("Failed to upload image. Please try again.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVideoUpload = async () => {
    if (isUploadingVideo) return;
    setIsUploadingVideo(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FilePicker.pickMedia({ types: ['video/*'], multiple: false });
        const fileData = result.files[0];
        if (!fileData) return;
        const videoSrc = fileData.webPath || fileData.path;
        if (!videoSrc) throw new Error("Could not get video path");
        const response = await fetch(videoSrc);
        const blob = await response.blob();
        const file = new File([blob], fileData.name || `video_${Date.now()}.mp4`, { type: fileData.mimeType || 'video/mp4' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setVideoUrl(file_url);
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setVideoUrl(file_url);
          toast.success("Video uploaded!");
        };
        input.click();
        return;
      }
      toast.success("Video uploaded!");
    } catch (error) {
      if (error?.message?.includes("canceled")) return;
      toast.error("Failed to upload video. Please try again.");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    if (!localStorage.getItem("bean_terms_accepted")) {
      localStorage.setItem("bean_terms_accepted", "true");
    }
    await onPost({
      content: content.trim(),
      post_type: imageUrl ? "photo" : "general",
      image_url: imageUrl || undefined,
      video_url: videoUrl || undefined,
      author_name: userName
    });
    setContent("");
    setImageUrl("");
    setVideoUrl("");
    setIsPosting(false);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setContent("");
    setImageUrl("");
    setVideoUrl("");
  };

  return (
    <>
      {/* Floating Compose Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 bg-white border border-[#E8DED8] rounded-3xl px-5 py-4 shadow-sm hover:shadow-md transition-all text-left"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B7355] to-[#6B5744] flex items-center justify-center flex-shrink-0">
          <Coffee className="h-4 w-4 text-white" />
        </div>
        <span className="text-[#C9B8A6] flex-1">Share your coffee moment...</span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B7355] to-[#6B5744] flex items-center justify-center">
          <Plus className="h-4 w-4 text-white" />
        </div>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F5F1ED]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B7355] to-[#6B5744] flex items-center justify-center">
                    <Coffee className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[#5C4A3A] text-sm">{userName || "Coffee Lover"}</p>
                    <p className="text-xs text-[#C9B8A6]">Sharing with the community</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-[#F5F1ED] flex items-center justify-center text-[#8B7355] hover:bg-[#EDE8E3] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Text area */}
              <div className="px-5 pt-4 pb-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's your coffee story today? ☕"
                  className="min-h-[120px] border-none shadow-none resize-none focus-visible:ring-0 text-[#5C4A3A] placeholder:text-[#C9B8A6] text-base p-0"
                  autoFocus
                />
              </div>

              {/* Image / Video preview */}
              {(imageUrl || videoUrl) && (
                <div className="px-5 pb-3">
                  {imageUrl && (
                    <div className="relative inline-block">
                      <img src={imageUrl} alt="Upload" className="h-32 rounded-2xl object-cover" />
                      <button
                        onClick={() => setImageUrl("")}
                        className="absolute -top-2 -right-2 bg-[#5C4A3A] text-white rounded-full p-1 shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {videoUrl && (
                    <div className="relative inline-block">
                      <video src={videoUrl} controls className="h-32 rounded-2xl" />
                      <button
                        onClick={() => setVideoUrl("")}
                        className="absolute -top-2 -right-2 bg-[#5C4A3A] text-white rounded-full p-1 shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-4 border-t border-[#F5F1ED] flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={isUploadingImage || !!videoUrl}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      videoUrl
                        ? "text-[#E8DED8] cursor-not-allowed"
                        : "text-[#8B7355] hover:bg-[#F5EBE8] bg-[#F5F1ED]"
                    }`}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Image className="h-4 w-4" />
                    )}
                    Photo
                  </button>

                  <button
                    type="button"
                    onClick={handleVideoUpload}
                    disabled={isUploadingVideo || !!imageUrl}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      imageUrl
                        ? "text-[#E8DED8] cursor-not-allowed"
                        : "text-[#8B7355] hover:bg-[#F5EBE8] bg-[#F5F1ED]"
                    }`}
                  >
                    {isUploadingVideo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                    Video
                  </button>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || isPosting}
                  className="rounded-xl bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] px-6"
                >
                  {isPosting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  Post
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}