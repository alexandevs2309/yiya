import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle } from 'lucide-react';

export interface ChartContainerProps {
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

export function ChartContainer({
  height = 250,
  className = '',
  loading = false,
  error = null,
  children,
}: ChartContainerProps) {
  if (loading) {
    return (
      <div className={cn('relative w-full', className)} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('relative w-full', className)} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="text-center p-4">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      {children}
    </div>
  );
}
