import { useState } from 'react';
import { Machine } from '@/types/scheduler';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Settings2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MachineStatusPanelProps {
  machines: Machine[];
  onUpdateMachine: (update: { id: string; is_down: boolean; down_note?: string | null }) => void;
}

export function MachineStatusPanel({ machines, onUpdateMachine }: MachineStatusPanelProps) {
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [downNote, setDownNote] = useState('');

  const downCount = machines.filter(m => m.is_down).length;

  function handleToggle(machine: Machine) {
    if (machine.is_down) {
      // Bringing machine back up
      onUpdateMachine({ id: machine.id, is_down: false, down_note: null });
    } else {
      // Taking machine down - need note
      setEditingMachine(machine.id);
      setDownNote('');
    }
  }

  function confirmDown(machineId: string) {
    if (!downNote.trim()) return;
    onUpdateMachine({ id: machineId, is_down: true, down_note: downNote.trim() });
    setEditingMachine(null);
    setDownNote('');
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Machine Status
          {downCount > 0 && (
            <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-xs">
              {downCount} down
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Machine Status
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {machines.map(machine => (
            <div
              key={machine.id}
              className={cn(
                'p-4 rounded-lg border',
                machine.is_down ? 'border-destructive bg-destructive/10' : 'border-border bg-card'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'status-dot',
                    machine.is_down ? 'status-down' : 'status-operational'
                  )} />
                  <div>
                    <span className="font-mono font-bold">{machine.name}</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({machine.machine_group})
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    machine.is_down ? 'text-destructive' : 'text-status-operational'
                  )}>
                    {machine.is_down ? 'DOWN' : 'OPERATIONAL'}
                  </span>
                  <Switch
                    checked={!machine.is_down}
                    onCheckedChange={() => handleToggle(machine)}
                  />
                </div>
              </div>

              {machine.is_down && machine.down_note && (
                <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  {machine.down_note}
                </div>
              )}

              {editingMachine === machine.id && (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="down-note">Reason for downtime *</Label>
                    <Input
                      id="down-note"
                      value={downNote}
                      onChange={(e) => setDownNote(e.target.value)}
                      placeholder="Enter reason..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirmDown(machine.id)}
                      disabled={!downNote.trim()}
                    >
                      Confirm Down
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingMachine(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
