import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { authenticateWithGoogle } from "@/integrations/api/oauth";
import { useState } from "react";

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export function GoogleLoginButton({
  onSuccess,
  onError,
}: GoogleLoginButtonProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const result = await authenticateWithGoogle(
        credentialResponse.credential
      );

      if (result.success && result.data) {
        toast({
          title: "Welcome!",
          description: `Logged in as ${result.data.user.email}`,
        });

        // Small delay to ensure token is stored
        setTimeout(() => {
          onSuccess?.();
          navigate("/");
        }, 500);
      } else {
        toast({
          title: "Authentication failed",
          description: result.error || "Could not authenticate with Google",
          variant: "destructive",
        });
        onError?.();
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      onError?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          toast({
            title: "Login failed",
            description: "Google login was cancelled or failed",
            variant: "destructive",
          });
          onError?.();
        }}
        theme="outline"
        size="large"
        width="350"
      />
    </div>
  );
}
