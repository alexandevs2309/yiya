import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        free: "bg-status-free-bg text-status-free-text",
        occupied: "bg-status-occupied-bg text-status-occupied-text",
        billing: "bg-status-billing-bg text-status-billing-text",
        pending: "bg-muted text-text-secondary",
        ready: "bg-status-free-bg text-status-free-text",
      },
    },
    defaultVariants: { variant: "pending" },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
