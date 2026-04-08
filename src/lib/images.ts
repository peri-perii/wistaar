/**
 * ImageOptimizer: Handles automatic resizing and format selection for images.
 * Integrates with Cloudinary/Imglabs or generic CDNs.
 */
export class ImageOptimizer {
  /**
   * Generates an optimized image URL based on the provider.
   * Currently supports Cloudinary transformation patterns.
   */
  public static getOptimizedUrl(
    url: string, 
    options: { width?: number; height?: number; quality?: number } = {}
  ): string {
    if (!url) return "";

    // If it's already a Cloudinary URL, we can inject transformations
    if (url.includes("cloudinary.com")) {
      const parts = url.split("/upload/");
      if (parts.length === 2) {
        const { width = "auto", height = "auto", quality = "auto" } = options;
        const transform = `w_${width},h_${height},q_${quality},f_auto`;
        return `${parts[0]}/upload/${transform}/${parts[1]}`;
      }
    }

    // Default: return original URL if no provider strategy matches
    return url;
  }

  /**
   * Generates a blurring placeholder URL for lazy loading.
   */
  public static getPlaceholderUrl(url: string): string {
    return this.getOptimizedUrl(url, { width: 20, height: 20, quality: 10 });
  }
}
