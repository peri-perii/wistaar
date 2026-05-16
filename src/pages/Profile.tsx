import { useState, useEffect, useRef } from "react";
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
import { User, Calendar, Loader2, Camera, Key, Eye, EyeOff, Trash2, Download } from "lucide-react";
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
}

interface Book {
  id: string;
  title: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: purchases = [] } = usePurchases();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>({ display_name: null, avatar_url: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [now, setNow] = useState(new Date());

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

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
      setIsLoading(false);
    };

    fetchProfile();
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
        
        // Fetch books with error logging
        const { data, error } = await supabase
          .from("book_submissions")
          .select("id, title")
          .in("id", bookIds);

        if (error) {
          console.error("Error fetching books:", error);
          // Set placeholder titles if query fails
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
        } else {
          console.log("No books found. Purchase data:", purchases);
          // If no books found, try fetching the first book to check table structure
          const { data: sampleData } = await supabase
            .from("book_submissions")
            .select("*")
            .limit(1);
          console.log("Sample book structure:", sampleData);
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

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(urlWithCacheBust);
    setIsUploading(false);
    toast({ title: "Avatar uploaded", description: "Don't forget to save your changes." });
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
        setIsChangingPassword(false);
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
    } catch (error) {
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
      setDeleteTransactionId(null);
    } catch (error) {
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

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
      })
      .eq("user_id", user.id);

    setIsSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      setProfile({ display_name: displayName || null, avatar_url: avatarUrl || null });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
  };

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();
  const hasChanges =
    displayName !== (profile.display_name ?? "") ||
    avatarUrl !== (profile.avatar_url ?? "");

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container-main pt-24 pb-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-serif mb-1">Profile</h1>
            <p className="text-muted-foreground text-sm">Manage your account details</p>
          </div>

          {/* Avatar with upload */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-accent text-accent-foreground text-lg font-serif">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-background animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-background" />
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
            <div>
              <p className="font-medium">{displayName || "No name set"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Tabs for Edit Profile and Transaction History */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile Settings</TabsTrigger>
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            </TabsList>

            {/* Profile Settings Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Edit Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {now.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      {" · "}
                      {now.toLocaleTimeString()}
                    </p>
                    <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Keep your account secure by regularly updating your password.</p>
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Key className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and choose a new one.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Current Password */}
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="current-password"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
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

                        {/* New Password */}
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password (min 8 characters)"
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

                        {/* Confirm Password */}
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input
                            id="confirm-password"
                            type={showNewPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setShowPasswordDialog(false)}
                          disabled={isChangingPassword}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Update Password
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transaction History Tab */}
            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Purchase History</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBooks ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : purchases.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No purchases yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {purchases.map((purchase) => (
                        <div
                          key={purchase.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{bookTitles[purchase.book_id] || "Loading..."}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(purchase.purchased_at).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right mr-4">
                            <p className="font-medium">₹{purchase.amount.toFixed(2)}</p>
                            <p className="text-xs text-green-600 font-medium">
                              {purchase.payment_status === "completed" ? "Completed" : purchase.payment_status}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadReceipt(purchase)}
                              title="Download receipt"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <AlertDialog open={deleteTransactionId === purchase.id}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTransactionId(purchase.id)}
                                title="Delete transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this transaction? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-3 justify-end">
                                  <AlertDialogCancel onClick={() => setDeleteTransactionId(null)}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => purchase.id && handleDeleteTransaction(purchase.id)}
                                    className="bg-destructive hover:bg-destructive/90"
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
