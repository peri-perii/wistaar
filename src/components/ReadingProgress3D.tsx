import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReadingProgress3DProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function ReadingProgress3D({
  percent,
  size = 80,
  strokeWidth = 6,
  className,
}: ReadingProgress3DProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size, perspective: "200px" }}
    >
      {/* 3D tilted ring */}
      <motion.div
        initial={{ rotateX: 25, rotateY: -15, scale: 0.85, opacity: 0 }}
        animate={{ rotateX: 25, rotateY: -15, scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-lg"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
      </motion.div>

      {/* Center label */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {Math.round(percent)}%
      </motion.span>
    </div>
  );
}
