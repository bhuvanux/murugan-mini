export const generateVideoThumbnail = (videoFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 1; // Capture at 1 second to avoid black frames at 0s

        video.onloadeddata = () => {
            // Seek to 1s if duration allows, otherwise 0
            if (video.duration < 1) {
                video.currentTime = 0;
            }
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Canvas context is null"));
                    return;
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const thumbnailFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
                        resolve(thumbnailFile);
                    } else {
                        reject(new Error("Thumbnail blob generation failed"));
                    }
                    // Clean up
                    URL.revokeObjectURL(video.src);
                    video.remove();
                }, "image/jpeg", 0.75); // 75% quality JPEG
            } catch (e) {
                reject(e);
            }
        };

        video.onerror = (e) => {
            URL.revokeObjectURL(video.src);
            reject(new Error("Video loading failed"));
        };
    });
};
