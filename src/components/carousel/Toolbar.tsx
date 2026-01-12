import { 
  MousePointer2, 
  Type, 
  Image, 
  Layers, 
  Wand2,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Scissors
} from 'lucide-react';
import { ToolButton } from './ToolButton';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({ 
  activeTool, 
  onToolChange, 
  onUndo, 
  onRedo, 
  onExport,
  canUndo,
  canRedo
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-sidebar border-r border-border">
      {/* Selection Tools */}
      <div className="flex flex-col gap-1 pb-2 border-b border-border">
        <ToolButton 
          icon={MousePointer2} 
          label="Select" 
          active={activeTool === 'select'}
          onClick={() => onToolChange('select')}
        />
      </div>

      {/* Creation Tools */}
      <div className="flex flex-col gap-1 py-2 border-b border-border">
        <ToolButton 
          icon={Image} 
          label="Add Image" 
          active={activeTool === 'image'}
          onClick={() => onToolChange('image')}
        />
        <ToolButton 
          icon={Type} 
          label="Add Text" 
          active={activeTool === 'text'}
          onClick={() => onToolChange('text')}
        />
      </div>

      {/* Effects Tools */}
      <div className="flex flex-col gap-1 py-2 border-b border-border">
        <ToolButton 
          icon={Wand2} 
          label="Color Grade" 
          active={activeTool === 'grade'}
          onClick={() => onToolChange('grade')}
        />
        <ToolButton 
          icon={Scissors} 
          label="Remove Background" 
          active={activeTool === 'removebg'}
          onClick={() => onToolChange('removebg')}
        />
        <ToolButton 
          icon={Layers} 
          label="Layers" 
          active={activeTool === 'layers'}
          onClick={() => onToolChange('layers')}
        />
      </div>

      {/* View Controls */}
      <div className="flex flex-col gap-1 py-2 border-b border-border">
        <ToolButton 
          icon={ZoomIn} 
          label="Zoom In" 
          onClick={() => onToolChange('zoomin')}
        />
        <ToolButton 
          icon={ZoomOut} 
          label="Zoom Out" 
          onClick={() => onToolChange('zoomout')}
        />
      </div>

      {/* History */}
      <div className="flex flex-col gap-1 py-2 border-b border-border">
        <ToolButton 
          icon={Undo2} 
          label="Undo" 
          onClick={onUndo}
          disabled={!canUndo}
        />
        <ToolButton 
          icon={Redo2} 
          label="Redo" 
          onClick={onRedo}
          disabled={!canRedo}
        />
      </div>

      {/* Export */}
      <div className="flex flex-col gap-1 pt-2 mt-auto">
        <ToolButton 
          icon={Download} 
          label="Export" 
          onClick={onExport}
        />
      </div>
    </div>
  );
}
