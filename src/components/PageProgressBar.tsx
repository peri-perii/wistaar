import { motion } from "framer-motion";

const PageProgressBar = () => {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-0.5 bg-primary/20 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="h-full bg-primary/60"
        initial={{ width: "0%" }}
        animate={{ width: "90%" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </motion.div>
  );
};

export default PageProgressBar;
