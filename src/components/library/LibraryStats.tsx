import { motion } from "framer-motion";
import { BookOpen, CheckCircle, TrendingUp, Clock } from "lucide-react";

interface LibraryStatsProps {
  totalBooks: number;
  completedBooks: number;
  inProgressBooks: number;
  purchasedCount: number;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function LibraryStats({ totalBooks, completedBooks, inProgressBooks, purchasedCount }: LibraryStatsProps) {
  if (totalBooks === 0 && purchasedCount === 0) return null;

  const stats = [
    { icon: BookOpen, label: "Total Books", value: totalBooks + purchasedCount, color: "text-primary" },
    { icon: TrendingUp, label: "In Progress", value: inProgressBooks, color: "text-amber-500" },
    { icon: CheckCircle, label: "Completed", value: completedBooks, color: "text-emerald-500" },
    { icon: Clock, label: "Purchased", value: purchasedCount, color: "text-blue-500" },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={item}
          className="bg-card border border-border rounded-lg p-3 sm:p-4 flex items-center gap-3"
        >
          <div className={`p-1.5 sm:p-2 rounded-md bg-muted ${stat.color}`}>
            <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-display font-medium text-foreground">{stat.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
