import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchases";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import UpgradeToAuthor from "@/components/UpgradeToAuthor";
import { User, Calendar, Loader2, Camera, Key, Eye, EyeOff, Trash2, Download, ArrowLeft, AtSign, CheckCircle2, XCircle, Feather } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: string | null;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export default function ReaderProfile() {
  const { user, loading: authLoading } = useAuth();
  const { data: purchases = [], refetch: refetchPurchases } = usePurchases();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({ display_name: null, avatar_url: null, username: null, role: "reader" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wistiesBalance, setWistiesBalance] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Password change states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Transaction history states
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);

  // Real-time clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, username, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setUsername(data.username ?? "");
      }

      // Fetch Wisties balance
      const { data: wistiesData } = await supabase
        .from("wisties_balance")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setWistiesBalance(wistiesData?.balance ?? 0);
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Load book titles for transactions
  useEffect(() => {
    if (purchases.length === 0) {
      setIsLoadingBooks(false);
      return;
    }

    const fetchBookTitles = async () => {
      try {
        const bookIds = purchases.map(p => p.book_id);
        const { data, error } = await supabase
          .from("book_submissions")
          .select("id, title")
          .in("id", bookIds);

        if (error) {
          console.error("Error fetching books:", error);
          const placeholderMap = bookIds.reduce((acc, id) => {
            acc[id] = "Book Title";
            return acc;
          }, {} as Record<string, string>);
          setBookTitles(placeholderMap);
        } else if (data && data.length > 0) {
          const titlesMap = data.reduce((acc, book) => {
            acc[book.id] = book.title;
            return acc;
          }, {} as Record<string, string>);
          setBookTitles(titlesMap);
        }
      } catch (err) {
        console.error("Unexpected error fetching books:", err);
      } finally {
        setIsLoadingBooks(false);
      }
    };

    fetchBookTitles();
  }, [purchases]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // ── Validate MIME type (jpg / png / webp only) ──────────────────────────
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPG, PNG, or WEBP image.",
        variant: "destructive",
      });
      return;
    }

    // ── Validate size (< 2 MB) ──────────────────────────────────────────────
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2 MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Stable path: {userId}/avatar.{ext} — upsert replaces old avatar
      const ext = file.name.split(".").pop() ?? 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")              // ← correct bucket
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")             // ← correct bucket
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast({ title: "Avatar uploaded", description: "Don't forget to save changes to update your profile." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }

    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast({ title: "Error", description: "Current password is incorrect.", variant: "destructive" });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast({ title: "Error", description: "Failed to update password.", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordDialog(false);
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteTransaction = async (purchaseId: string) => {
    try {
      const { error } = await supabase
        .from("book_purchases")
        .delete()
        .eq("id", purchaseId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({ title: "Success", description: "Transaction deleted." });
      refetchPurchases();
      setDeleteTransactionId(null);
    } catch {
      toast({ title: "Error", description: "Failed to delete transaction.", variant: "destructive" });
    }
  };

  const handleDownloadReceipt = (purchase: any) => {
    const receiptContent = `
WISTAAR - PURCHASE RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${new Date(purchase.purchased_at).toLocaleDateString()}
Transaction ID: ${purchase.id}

Book: ${bookTitles[purchase.book_id] || "Unknown"}
Amount: ₹${purchase.amount.toFixed(2)}
Status: ${purchase.payment_status.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for your purchase!
    `;

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(receiptContent));
    element.setAttribute("download", `receipt-${purchase.id}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const checkUsernameAvailability = useCallback((value: string) => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    
    if (value === (profile.username ?? "")) {
      setUsernameError(null);
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    if (!value) {
      setUsernameError(null);
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    if (!USERNAME_REGEX.test(value)) {
      setUsernameError("3-30 characters, letters, numbers, and underscores only");
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    setUsernameError(null);
    setIsCheckingUsername(true);

    usernameTimerRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("username", value)
          .maybeSingle();

        if (error) throw error;

        if (data && data.user_id !== user?.id) {
          setUsernameAvailable(false);
          setUsernameError("Username already exists");
        } else {
          setUsernameAvailable(true);
          setUsernameError(null);
        }
      } catch {
        setUsernameError("Could not check availability");
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);
  }, [profile.username, user?.id]);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    checkUsernameAvailability(value);
  };

  const handleSave = async () => {
    if (!user) return;

    const trimmedUsername = username.trim() || null;
    if (trimmedUsername && !USERNAME_REGEX.test(trimmedUsername)) {
      toast({ title: "Invalid username", description: "Username must be 3-30 characters, alphanumeric or underscores.", variant: "destructive" });
      return;
    }
    if (usernameError) {
      toast({ title: "Username issue", description: usernameError, variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        username: trimmedUsername,
      })
      .eq("user_id", user.id);

    setIsSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      setProfile(prev => ({ ...prev, display_name: displayName || null, avatar_url: avatarUrl || null, username: trimmedUsername }));
      setUsernameAvailable(null);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
  };

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();
  const usernameChanged = username !== (profile.username ?? "");
  const hasUsernameIssue = usernameChanged && (!!usernameError || isCheckingUsername);
  const hasChanges =
    displayName !== (profile.display_name ?? "") ||
    avatarUrl !== (profile.avatar_url ?? "") ||
    usernameChanged;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <main className="container-main pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl font-serif font-medium tracking-tight">Profile Settings</h1>
            <p className="text-muted-foreground text-sm font-sans">Manage your reader preferences and settings.</p>
          </div>

          {/* User Hero Section */}
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border/30 bg-muted/30">
            <div className="relative group shrink-0">
              <Avatar className="w-16 h-16 border border-border/40 shadow-sm">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-[#c84b2f]/10 text-[#c84b2f] text-lg font-serif">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg font-medium truncate">{displayName || "Wistaar Reader"}</p>
              {profile.username && (
                <p className="text-sm font-medium text-[#c84b2f]">@{profile.username}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Wisties Balance Card */}
          <Card 
            onClick={() => navigate('/profile/wisties')}
            className="bg-card border-border/40 hover:border-[#c84b2f]/30 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store Credit</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-[#c84b2f]">
                    ₹{wistiesBalance !== null ? wistiesBalance : '...'}
                  </span>
                  <span className="text-sm text-foreground/80 font-sans">Wisties Balance</span>
                </div>
              </div>
              <div className="flex items-center text-[#c84b2f] font-semibold text-sm gap-1 hover:translate-x-1 transition-transform">
                Top Up <ArrowLeft className="w-4 h-4 rotate-180" />
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Settings / History */}
          <Tabs defaultValue="profile" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-muted border border-border/30 p-1">
              <TabsTrigger value="profile" className="font-sans font-medium">Profile Details</TabsTrigger>
              <TabsTrigger value="transactions" className="font-sans font-medium">Transaction History</TabsTrigger>
            </TabsList>

            {/* Profile Settings Content */}
            <TabsContent value="profile" className="space-y-6 outline-none">
              <Card className="border-border/30 bg-card">
                <CardHeader className="pb-3 border-b border-border/20">
                  <CardTitle className="text-lg font-serif font-medium">Edit Profile Info</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="flex items-center gap-2 text-sm text-foreground/80">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name"
                      className="bg-muted/50 border-border/30 h-11 focus-visible:ring-[#c84b2f]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2 text-sm text-foreground/80">
                      <AtSign className="w-4 h-4 text-muted-foreground" />
                      Username
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="your_username"
                        maxLength={30}
                        className={`bg-muted/50 border-border/30 h-11 pr-10 focus-visible:ring-[#c84b2f] ${
                          usernameError ? 'border-destructive focus-visible:ring-destructive' :
                          usernameAvailable === true ? 'border-green-500/50 focus-visible:ring-green-500' : ''
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        {!isCheckingUsername && usernameAvailable === true && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {!isCheckingUsername && usernameError && username && (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    {usernameError && username && (
                      <p className="text-xs text-destructive">{usernameError}</p>
                    )}
                    {!isCheckingUsername && usernameAvailable === true && (
                      <p className="text-xs text-green-500">Username is available</p>
                    )}
                    {!username && !usernameError && (
                      <p className="text-xs text-muted-foreground font-sans">Letters, numbers, and underscores (3-30 chars).</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/20">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      {" · "}
                      {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving || !hasChanges || hasUsernameIssue}
                      className="bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white px-6 font-semibold"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Password Change Security */}
              <Card className="border-border/30 bg-card">
                <CardHeader className="pb-3 border-b border-border/20">
                  <CardTitle className="text-lg font-serif font-medium">Security settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                    Keep your account secure by periodically updating your credentials.
                  </p>
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-10 border-border/40 font-semibold text-sm">
                        <Key className="w-4 h-4 mr-2" />
                        Update Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-card border border-border/40 text-foreground">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-xl">Change Password</DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground font-sans">
                          Enter your current password and choose a new secure one.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="current-password"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                              className="bg-muted/50 border-border/30 pr-10 focus-visible:ring-[#c84b2f]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min. 8 characters"
                              className="bg-muted/50 border-border/30 pr-10 focus-visible:ring-[#c84b2f]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input
                            id="confirm-password"
                            type={showNewPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="bg-muted/50 border-border/30 focus-visible:ring-[#c84b2f]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowPasswordDialog(false)}
                          disabled={isChangingPassword}
                          className="font-semibold"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                          className="bg-[#c84b2f] hover:bg-[#c84b2f]/90 text-white font-semibold"
                        >
                          {isChangingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Update
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Content */}
            <TabsContent value="transactions" className="outline-none">
              <Card className="border-border/30 bg-card">
                <CardHeader className="pb-3 border-b border-border/20">
                  <CardTitle className="text-lg font-serif font-medium">Purchase History</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {isLoadingBooks ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : purchases.length === 0 ? (
                    <p className="text-center text-muted-foreground font-sans py-12">No book purchases on record.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {purchases.map((purchase) => (
                        <div
                          key={purchase.id}
                          className="flex items-center justify-between p-4 border border-border/30 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-serif font-medium truncate">{bookTitles[purchase.book_id] || "Digital Title"}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {new Date(purchase.purchased_at).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right shrink-0 pr-4">
                            <p className="font-serif font-semibold text-[#c84b2f]">₹{purchase.amount.toFixed(2)}</p>
                            <p className="text-[10px] text-green-500 font-bold tracking-wider uppercase">
                              {purchase.payment_status === "completed" ? "Completed" : purchase.payment_status}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDownloadReceipt(purchase)}
                              className="w-9 h-9 text-muted-foreground hover:text-foreground"
                              title="Download receipt"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <AlertDialog open={deleteTransactionId === purchase.id}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-9 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTransactionId(purchase.id)}
                                title="Delete transaction record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <AlertDialogContent className="bg-card border border-border/40 text-foreground">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-serif text-xl">Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm text-muted-foreground font-sans">
                                    Are you sure you want to delete this receipt record from your local history? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-3 justify-end pt-4">
                                  <AlertDialogCancel onClick={() => setDeleteTransactionId(null)} className="font-semibold">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => purchase.id && handleDeleteTransaction(purchase.id)}
                                    className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Muted subtle upgrade link at bottom */}
          <div className="text-center pt-4">
            {profile.role !== "author" ? (
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="text-xs text-muted-foreground/60 hover:text-[#c84b2f]/90 transition-colors font-sans flex items-center justify-center gap-1.5 mx-auto hover:underline"
              >
                <Feather className="w-3.5 h-3.5" />
                Publish on Wistaar
              </button>
            ) : (
              <button
                onClick={() => navigate('/author/dashboard')}
                className="text-xs text-muted-foreground/60 hover:text-[#c84b2f]/90 transition-colors font-sans flex items-center justify-center gap-1.5 mx-auto hover:underline"
              >
                <Feather className="w-3.5 h-3.5" />
                Author Portal Dashboard
              </button>
            )}
          </div>

        </div>
      </main>

      {/* Upgrade to Author Modal Dialog */}
      {user && (
        <UpgradeToAuthor 
          isOpen={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          userId={user.id}
          onSuccess={fetchProfile}
        />
      )}

      <Footer />
    </div>
  );
}
