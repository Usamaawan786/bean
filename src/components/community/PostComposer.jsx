import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image, X, Loader2, Video } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { motion, AnimatePresence } from "framer-motion";

export default function PostComposer({ onPost, userName }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    return localStorage.getItem("bean_terms_accepted") === "true";
  });

  const withTermsCheck = (action) => {
    if (hasAcceptedTerms) {
      action();
    } else {
      setPendingAction(() => action);
      setShowTermsModal(true);
    }
  };

  const handleAcceptTerms = () => {
    localStorage.setItem("bean_terms_accepted", "true");
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const uploadFileFromBlob = async (blob, filename) => {
    const file = new File([blob], filename, { type: blob.type });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const doCapturePhoto = async () => {
    if (isUploadingImage) return;

    // On web, use a plain file input — Camera API hangs on web
    if (!Capacitor.isNativePlatform()) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingImage(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setImageUrl(file_url);
          toast.success("Photo uploaded!");
        } catch {
          toast.error("Failed to upload photo. Please try again.");
        } finally {
          setIsUploadingImage(false);
        }
      };
      input.click();
      return;
    }

    setIsUploadingImage(true);
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        saveToGallery: false,
      });
      if (!photo?.base64String) { setIsUploadingImage(false); return; }
      const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
      const byteCharacters = atob(photo.base64String);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: mimeType });
      const url = await uploadFileFromBlob(blob, `photo_${Date.now()}.${photo.format || 'jpg'}`);
      setImageUrl(url);
      toast.success("Photo uploaded!");
    } catch (error) {
      const msg = error?.message || String(error);
      if (!msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("user cancelled")) {
        toast.error("Failed to capture photo. Please try again.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const doVideoFromGallery = async () => {
    if (isUploadingVideo) return;
    setIsUploadingVideo(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const permissions = await Camera.checkPermissions();
        if (permissions.photos !== 'granted') {
          const result = await Camera.requestPermissions({ permissions: ['photos'] });
          if (result.photos !== 'granted' && result.photos !== 'limited') {
            toast.error("Gallery access is required to upload videos");
            return;
          }
        }
        // Use FilePicker for gallery video on native
        const result = await FilePicker.pickMedia({ multiple: false });
        const fileData = result.files[0];
        if (!fileData) return;
        const videoSrc = fileData.webPath || fileData.path;
        if (!videoSrc) throw new Error("Could not get video path");
        const response = await fetch(videoSrc);
        const blob = await response.blob();
        const url = await uploadFileFromBlob(blob, fileData.name || `video_${Date.now()}.mp4`);
        setVideoUrl(url);
        toast.success("Video uploaded!");
      } else {
        // Web fallback: file input
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) { setIsUploadingVideo(false); return; }
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setVideoUrl(file_url);
          toast.success("Video uploaded!");
          setIsUploadingVideo(false);
        };
        input.click();
        return; // don't hit finally yet
      }
    } catch (error) {
      const msg = error?.message || String(error);
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error("Failed to upload video. Please try again.");
      }
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleImageClick = () => withTermsCheck(doCapturePhoto);
  const handleVideoClick = () => withTermsCheck(doVideoFromGallery);

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
    <>
      {/* Terms Modal — shown only once */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#F5EBE8] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image className="h-8 w-8 text-[#8B7355]" />
                </div>
                <h3 className="text-xl font-bold text-[#5C4A3A] mb-2">Community Guidelines</h3>
                <p className="text-sm text-[#8B7355] leading-relaxed">
                  By posting, you agree that your content will not include hate speech, spam, profanity, threats, harassment, or any objectionable material. Violations may result in content removal and account suspension.
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => { setShowTermsModal(false); setPendingAction(null); }} variant="outline" className="flex-1 rounded-xl border-[#E8DED8]">Cancel</Button>
                <Button onClick={handleAcceptTerms} className="flex-1 rounded-xl bg-gradient-to-r from-[#8B7355] to-[#6B5744]">I Agree</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      <div className="bg-white my-4 px-5 py-5 rounded-3xl border border-[#E8DED8] shadow-sm">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your coffee moment..."
          className="min-h-[100px] border-[#E8DED8] rounded-2xl resize-none focus:ring-[#8B7355] focus:border-[#8B7355]"
        />

        {imageUrl && (
          <div className="mt-3 relative inline-block">
            <img src={imageUrl} alt="Upload" className="h-24 rounded-xl object-cover" />
            <button onClick={() => setImageUrl("")} className="absolute -top-2 -right-2 bg-[#5C4A3A] text-white rounded-full p-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {videoUrl && (
          <div className="mt-3 relative inline-block">
            <video src={videoUrl} controls className="h-32 rounded-xl" />
            <button onClick={() => setVideoUrl("")} className="absolute -top-2 -right-2 bg-[#5C4A3A] text-white rounded-full p-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {!hasAcceptedTerms && (
          <p className="mt-3 text-xs text-[#C9B8A6] italic">You'll be asked to agree to community guidelines before your first post or upload.</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImageClick}
              disabled={isUploadingImage || !!videoUrl}
              className={`flex items-center gap-1 transition-colors ${videoUrl ? "text-[#E8DED8] cursor-not-allowed" : "text-[#C9B8A6] hover:text-[#8B7355]"}`}
            >
              {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              <span className="text-xs">Photo</span>
            </button>

            <button
              type="button"
              onClick={handleVideoClick}
              disabled={isUploadingVideo || !!imageUrl}
              className={`flex items-center gap-1 transition-colors ${imageUrl ? "text-[#E8DED8] cursor-not-allowed" : "text-[#C9B8A6] hover:text-[#8B7355]"}`}
            >
              {isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              <span className="text-xs">Video</span>
            </button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || !hasAcceptedTerms || isPosting}
            size="sm"
            className="rounded-xl bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:from-[#6B5744] hover:to-[#5C4A3A] flex-shrink-0"
          >
            {isPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Post
          </Button>
        </div>
      </div>
    </>
  );
}