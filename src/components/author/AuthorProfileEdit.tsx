import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Image, ArrowRight } from "lucide-react";

interface AuthorProfileEditProps {
  userId: string;
}

export default function AuthorProfileEdit({ userId }: AuthorProfileEditProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio, username, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (err: any) {
      toast({
        title: "Failed to load profile",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Validate username regex format (3-30 chars, alphanumeric or underscores)
      if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        throw new Error("Username must be between 3 and 30 characters and contain only letters, numbers, or underscores.");
      }

      // Check if username is taken by someone else
      if (username) {
        const { data: existingUser, error: checkError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", username)
          .neq("user_id", userId)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          throw new Error("This username is already taken by another author.");
        }
      }

      // Update public.profiles
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio,
          username: username || null,
          avatar_url: avatarUrl,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated successfully",
        description: "Your changes are now live on your public profile.",
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload image to profiles bucket
      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
      toast({
        title: "Avatar uploaded",
        description: "Click save changes to update your profile.",
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground py-10">Loading profile data...</div>;
  }

  return (
    <Card className="max-w-2xl border-border/60">
      <CardHeader>
        <CardTitle className="font-serif text-xl">Edit Public Profile</CardTitle>
        <CardDescription>
          Customize how you appear to readers on your public profile page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-4">
            <Avatar className="w-20 h-20 border-2 border-primary/20 shadow-sm">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xl font-serif">
                {(displayName || username || "A").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 text-center sm:text-left">
              <Label htmlFor="avatar-file" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary/40 transition-colors text-sm font-semibold">
                  <Image className="w-4 h-4" />
                  Upload profile picture
                </div>
                <input
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </Label>
              <p className="text-xs text-muted-foreground">JPG, PNG or WEBP. Max 2MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pen-name">Pen Name / Display Name</Label>
            <Input
              id="pen-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Amish Tripathi"
              className="h-11 bg-background border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username (URL path)</Label>
            <div className="flex items-center">
              <span className="bg-muted border border-r-0 border-border h-11 px-3 flex items-center rounded-l-md text-sm text-muted-foreground select-none">
                wistaar.in/author/
              </span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="pen_name"
                className="h-11 bg-background border-border rounded-l-none"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Only letters, numbers, and underscores are allowed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Author Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a brief description of your background, writing style, or inspiration..."
              className="min-h-[120px] bg-background border-border"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            {username && (
              <a
                href={`/author/${username}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
              >
                View Public Profile
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
            <Button type="submit" disabled={isSaving} className="ml-auto w-32">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
