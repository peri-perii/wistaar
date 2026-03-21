import { motion } from "framer-motion";
import { ReactNode, useState, useEffect } from "react";
import PageProgressBar from "./PageProgressBar";

interface PageTransitionProps {
  children: ReactNode;
  showSkeleton?: boolean;
  skeleton?: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -4,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  duration: 0.3,
};

const spinnerVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const PageTransition = ({ children, showSkeleton = false, skeleton }: PageTransitionProps) => {
  const [isLoading, setIsLoading] = useState(showSkeleton);

  useEffect(() => {
    if (showSkeleton) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showSkeleton]);

  if (isLoading) {
    return (
      <>
        <PageProgressBar />
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={spinnerVariants}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="min-h-screen flex items-center justify-center bg-background"
        >
          {skeleton || (
            <div className="relative">
              <div className="w-6 h-6 border-2 border-muted rounded-full" />
              <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-foreground/70 rounded-full animate-spin" />
            </div>
          )}
        </motion.div>
      </>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
