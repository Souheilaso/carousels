import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, Image, Type } from 'lucide-react';
import { Layer } from '@/types/carousel';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayers: (layers: Layer[]) => void;
}

export function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
}: LayersPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">Layers</div>
      <div className="panel-content p-0">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No layers yet. Add an image or text to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                  selectedLayerId === layer.id 
                    ? 'bg-primary/10' 
                    : 'hover:bg-muted/50'
                )}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                {layer.type === 'image' ? (
                  <Image className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Type className="w-4 h-4 text-muted-foreground" />
                )}
                
                <span className={cn(
                  'flex-1 text-sm truncate',
                  !layer.visible && 'text-muted-foreground'
                )}>
                  {layer.name}
                </span>

                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  className="p-1 hover:bg-muted rounded"
                >
                  {layer.visible ? (
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                  className="p-1 hover:bg-muted rounded"
                >
                  {layer.locked ? (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                  className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
