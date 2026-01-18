import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ViewMode } from '@/types/scheduler';

interface SettingsPanelProps {
  defaultViewMode: ViewMode;
  onDefaultViewModeChange: (mode: ViewMode) => void;
}

export function SettingsPanel({ defaultViewMode, onDefaultViewModeChange }: SettingsPanelProps) {
  const isShiftDefault = defaultViewMode === 'shift';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="shift-toggle" className="text-sm font-medium">
                Shift View Default
              </Label>
              <p className="text-xs text-muted-foreground">
                Open scheduler in 6-6 shift view
              </p>
            </div>
            <Switch
              id="shift-toggle"
              checked={isShiftDefault}
              onCheckedChange={(checked) => 
                onDefaultViewModeChange(checked ? 'shift' : 'calendar')
              }
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
