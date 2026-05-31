import { useState, useRef } from "react";
import { X, Type, Image as ImageIcon, BarChart2, Plus, Trash2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCreatePost, uploadPostImage, type PostType } from "@/hooks/useAuthorPosts";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface PostComposerProps {
  authorName: string;
  onClose: () => void;
}

const TAB_ICONS = {
  text: Type,
  image: ImageIcon,
  poll: BarChart2,
};

const MAX_CHARS = 500;
const DURATIONS = [
  { label: "1 day", value: 1 },
  { label: "3 days", value: 3 },
  { label: "7 days", value: 7 },
];

export default function PostComposer({ authorName, onClose }: PostComposerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createPost = useCreatePost();

  const [activeTab, setActiveTab] = useState<PostType>("text");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState(7);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabs: PostType[] = ["text", "image", "poll"];

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addOption = () => {
    if (pollOptions.length < 4) setPollOptions((prev) => [...prev, ""]);
  };

  const removeOption = (i: number) => {
    if (pollOptions.length > 2) setPollOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, val: string) => {
    setPollOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  };

  const isValid = () => {
    if (activeTab === "text") return content.trim().length > 0 && content.length <= MAX_CHARS;
    if (activeTab === "image") return imageFile !== null;
    if (activeTab === "poll") {
      return (
        pollQuestion.trim().length > 0 &&
        pollOptions.filter((o) => o.trim().length > 0).length >= 2
      );
    }
    return false;
  };

  const handlePublish = async () => {
    if (!user || !isValid()) return;
    setUploading(true);

    try {
      let imageUrl: string | undefined;

      if (activeTab === "image" && imageFile) {
        imageUrl = await uploadPostImage(imageFile, user.id);
      }

      await createPost.mutateAsync({
        post_type: activeTab,
        content: activeTab === "text" ? content : activeTab === "image" ? caption : pollQuestion,
        image_url: imageUrl,
        poll_options: activeTab === "poll" ? pollOptions.filter((o) => o.trim()) : undefined,
        poll_duration_days: activeTab === "poll" ? pollDuration : undefined,
        author_name: authorName,
      });

      toast({ title: "Published!", description: "Your post is now live." });
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to publish", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-lg bg-[#111111] border border-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <h2 className="font-serif text-lg font-semibold text-white">New Community Post</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#888888] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 px-5 pt-4">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-[#c84b2f] text-white"
                    : "text-[#888888] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 min-h-[180px]">
          <AnimatePresence mode="wait">
            {activeTab === "text" && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <Textarea
                  placeholder="Share an update, writing snippet, or announcement…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={MAX_CHARS}
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#888888] resize-none min-h-[140px] focus-visible:ring-[#c84b2f]/50"
                  autoFocus
                />
                <p className={`text-xs text-right ${content.length > MAX_CHARS * 0.9 ? "text-[#c84b2f]" : "text-[#888888]"}`}>
                  {content.length}/{MAX_CHARS}
                </p>
              </motion.div>
            )}

            {activeTab === "image" && (
              <motion.div
                key="image"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImagePick}
                />
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#1e1e1e] group">
                    <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 border border-dashed border-[#1e1e1e] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#c84b2f]/50 hover:bg-[#c84b2f]/5 transition-all text-[#888888] hover:text-white"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Click to upload image</span>
                    <span className="text-xs">JPEG, PNG, WebP, GIF · max 5MB</span>
                  </button>
                )}
                <Input
                  placeholder="Optional caption…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#888888] focus-visible:ring-[#c84b2f]/50"
                />
              </motion.div>
            )}

            {activeTab === "poll" && (
              <motion.div
                key="poll"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <Input
                  placeholder="Ask your readers something…"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#888888] focus-visible:ring-[#c84b2f]/50 font-medium"
                  autoFocus
                />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border border-[#1e1e1e] flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-[#888888]">{i + 1}</span>
                      </div>
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        className="bg-[#0a0a0a] border-[#1e1e1e] text-white placeholder:text-[#888888] focus-visible:ring-[#c84b2f]/50 h-9"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => removeOption(i)}
                          className="text-[#888888] hover:text-[#c84b2f] transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <button
                      onClick={addOption}
                      className="flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors py-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add option
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#888888]">Duration:</span>
                  <div className="flex gap-1">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setPollDuration(d.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          pollDuration === d.value
                            ? "bg-[#c84b2f] text-white"
                            : "bg-[#0a0a0a] border border-[#1e1e1e] text-[#888888] hover:text-white"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#1e1e1e]">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#888888] hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!isValid() || uploading || createPost.isPending}
            className="bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold px-6 gap-2"
          >
            {(uploading || createPost.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
            Publish
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
