// Google OAuth handler for frontend
import { ApiResponse } from './client';

export interface GoogleAuthPayload {
  credential: string; // JWT token from Google
  clientId: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: GoogleUser;
  isNewUser: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Send Google OAuth credential to backend for verification and token exchange
 */
export async function authenticateWithGoogle(
  credential: string
): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Google authentication failed",
      };
    }

    // Store tokens in localStorage
    if (data.data?.accessToken) {
      localStorage.setItem("authToken", data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem("refreshToken", data.data.refreshToken);
      }
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("Google OAuth error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Decode Google credential (JWT) to get user info
 * Used for displaying user data while backend processes authentication
 */
export function decodeGoogleCredential(
  credential: string
): GoogleUser | null {
  try {
    // Credential is a JWT in format: header.payload.signature
    const parts = credential.split(".");
    if (parts.length !== 3) return null;

    // Decode payload (add padding if needed)
    const payloadStr = parts[1];
    const padded = payloadStr + "=".repeat((4 - (payloadStr.length % 4)) % 4);
    const decoded = atob(padded);
    const payload = JSON.parse(decoded);

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified,
    };
  } catch (error) {
    console.error("Failed to decode credential:", error);
    return null;
  }
}
