import { useState, useEffect } from "react";

export const usePageLoading = (delay: number = 0) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return isLoading;
};

export const useDataLoading = <T,>(
  data: T | undefined | null,
  minLoadingTime: number = 300
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [minLoadingTime]);

  useEffect(() => {
    if (!isLoading && data !== undefined) {
      setShowContent(true);
    }
  }, [isLoading, data]);

  return { isLoading: !showContent, showContent };
};
