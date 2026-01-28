import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { motion } from "framer-motion";
import { X, Check, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function ImageCropModal({ imageSrc, onComplete, onClose }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const maxSize = 1024;
      canvas.width = maxSize;
      canvas.height = maxSize;

      ctx.translate(maxSize / 2, maxSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-maxSize / 2, -maxSize / 2);

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        maxSize,
        maxSize
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.9);
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleSave = async () => {
    const croppedBlob = await createCroppedImage();
    if (croppedBlob) {
      const file = new File([croppedBlob], "profile-picture.jpg", { type: "image/jpeg" });
      onComplete(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden"
      >
        <div className="bg-[#8B7355] text-white p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Adjust Your Photo</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative h-96 bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#5C4A3A]">Zoom</label>
              <span className="text-xs text-[#8B7355]">{Math.round(zoom * 100)}%</span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#5C4A3A]">Rotate</label>
              <span className="text-xs text-[#8B7355]">{rotation}°</span>
            </div>
            <Slider
              value={[rotation]}
              onValueChange={(value) => setRotation(value[0])}
              min={0}
              max={360}
              step={1}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] rounded-xl"
            >
              <Check className="h-4 w-4 mr-2" />
              Save Photo
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}