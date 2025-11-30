import React, { useState } from "react";
import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface PublishResult {
  success: boolean;
  message: string;
  results?: {
    wallpapers: { published: number; total: number };
    banners: { published: number; total: number };
  };
}

interface ScheduledPublisherButtonProps {
  contentType?: 'wallpaper' | 'banner' | 'media' | 'sparkle';
  onPublish?: () => void;
}

export function ScheduledPublisherButton({ contentType, onPublish }: ScheduledPublisherButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastResult, setLastResult] = useState<PublishResult | null>(null);

  const publishScheduledContent = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/publish-scheduled`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        const totalPublished =
          (result.results?.wallpapers?.published || 0) +
          (result.results?.banners?.published || 0);

        if (totalPublished > 0) {
          toast.success(`Published ${totalPublished} scheduled item(s)!`);
          // Refresh data if callback provided
          if (onPublish) {
            onPublish();
          }
        } else {
          toast.info("No scheduled content due for publishing");
        }
      } else {
        toast.error(result.message || "Failed to publish scheduled content");
      }
    } catch (error: any) {
      console.error("[Scheduled Publisher] Error:", error);
      toast.error("Failed to publish: " + error.message);
      setLastResult({
        success: false,
        message: error.message,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900 text-inter-semibold-16">
              Scheduled Content Publisher
            </h3>
            <p className="text-xs text-blue-600 text-inter-regular-14">
              Manually publish scheduled wallpapers and banners
            </p>
          </div>
        </div>
        <button
          onClick={publishScheduledContent}
          disabled={isPublishing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-inter-medium-16"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              Publish Now
            </>
          )}
        </button>
      </div>

      {lastResult && (
        <div
          className={`p-3 rounded-lg border ${
            lastResult.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {lastResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span
              className={`text-sm font-medium ${
                lastResult.success ? "text-green-800" : "text-red-800"
              } text-inter-medium-16`}
            >
              {lastResult.message}
            </span>
          </div>
          {lastResult.results && (
            <div className="text-xs space-y-1 ml-6 text-inter-regular-14">
              <p className="text-green-700">
                Wallpapers: {lastResult.results.wallpapers.published} of{" "}
                {lastResult.results.wallpapers.total} published
              </p>
              <p className="text-green-700">
                Banners: {lastResult.results.banners.published} of{" "}
                {lastResult.results.banners.total} published
              </p>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-blue-600 text-inter-regular-14">
        <strong>Note:</strong> Click "Publish Now" to manually check and publish all scheduled
        content that has reached its scheduled time. For automatic publishing, set up a cron job to
        call the API endpoint periodically.
      </div>
    </div>
  );
}
