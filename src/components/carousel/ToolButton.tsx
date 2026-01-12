import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ToolButton({ icon: Icon, label, active, onClick, disabled }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'tool-btn',
            active && 'active',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Icon className="w-5 h-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-popover border-border">
        <p className="text-sm">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
