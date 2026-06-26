import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Card({ className, header, footer, children, ...props }: CardProps) {
  return (
    <div className={cn("rounded-2xl bg-panel shadow-card", className)} {...props}>
      {header && <div className="px-5 py-4 border-b border-border">{header}</div>}
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="px-5 py-4 border-t border-border">{footer}</div>}
    </div>
  );
}
