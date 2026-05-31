import { cn } from "@/lib/utils";

// shadcn-compatible skeleton — no animation, #1e1e1e background.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md bg-[#1e1e1e]", className)}
      {...props}
    />
  );
}

export { Skeleton };
export default Skeleton;
