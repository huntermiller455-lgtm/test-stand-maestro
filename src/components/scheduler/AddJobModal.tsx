import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Machine, TestType, Job, JobStatus } from '@/types/scheduler';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface AddJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machines: Machine[];
  testTypes: TestType[];
  existingJob?: Job | null;
  onSave: (job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'test_type' | 'machine' | 'created_by'>) => void;
  onDelete?: (id: string) => void;
}

export function AddJobModal({
  open,
  onOpenChange,
  machines,
  testTypes,
  existingJob,
  onSave,
  onDelete,
}: AddJobModalProps) {
  const [serialNumber, setSerialNumber] = useState('');
  const [testTypeId, setTestTypeId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [laneIndex, setLaneIndex] = useState(0);
  const [startDatetime, setStartDatetime] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [status, setStatus] = useState<JobStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [useNow, setUseNow] = useState(true);

  const selectedMachine = machines.find(m => m.id === machineId);
  const selectedTestType = testTypes.find(t => t.id === testTypeId);
  const isDualCapacity = selectedMachine?.capacity === 2;

  useEffect(() => {
    if (existingJob) {
      setSerialNumber(existingJob.serial_number);
      setTestTypeId(existingJob.test_type_id);
      setMachineId(existingJob.machine_id);
      setLaneIndex(existingJob.lane_index);
      setStartDatetime(format(new Date(existingJob.start_datetime), "yyyy-MM-dd'T'HH:mm"));
      setDurationHours(existingJob.duration_hours.toString());
      setStatus(existingJob.status);
      setNotes(existingJob.notes || '');
      setUseNow(false);
    } else {
      resetForm();
    }
  }, [existingJob, open]);

  useEffect(() => {
    if (selectedTestType && !existingJob) {
      // Check if scheduling concurrent on ETT2/ETT4
      if (selectedTestType.concurrent_duration_hours && isDualCapacity) {
        setDurationHours(selectedTestType.concurrent_duration_hours.toString());
      } else {
        setDurationHours(selectedTestType.default_duration_hours.toString());
      }
    }
  }, [selectedTestType, isDualCapacity, existingJob]);

  function resetForm() {
    setSerialNumber('');
    setTestTypeId('');
    setMachineId('');
    setLaneIndex(0);
    setStartDatetime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setDurationHours('1');
    setStatus('scheduled');
    setNotes('');
    setUseNow(true);
  }

  function handleSave() {
    if (!serialNumber.trim() || !testTypeId || !machineId) return;
    
    // Validate input lengths to match database constraints
    const trimmedSerial = serialNumber.trim();
    const trimmedNotes = notes.trim() || null;
    
    if (trimmedSerial.length > 100) {
      return; // Serial number too long
    }
    if (trimmedNotes && trimmedNotes.length > 1000) {
      return; // Notes too long
    }
    
    const duration = parseFloat(durationHours);
    if (duration <= 0 || duration > 720) {
      return; // Duration out of valid range
    }

    const startTime = useNow ? new Date() : new Date(startDatetime);
    
    onSave({
      serial_number: trimmedSerial,
      test_type_id: testTypeId,
      machine_id: machineId,
      lane_index: laneIndex,
      start_datetime: startTime.toISOString(),
      duration_hours: duration,
      status,
      notes: trimmedNotes,
    });
    
    onOpenChange(false);
    resetForm();
  }

  function handleDelete() {
    if (existingJob && onDelete) {
      onDelete(existingJob.id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {existingJob ? 'Edit Job' : 'Add New Job'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Serial Number */}
          <div className="grid gap-2">
            <Label htmlFor="serial">Shop Order / Serial Number *</Label>
            <Input
              id="serial"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Enter serial number"
              className="font-mono"
            />
          </div>

          {/* Test Type */}
          <div className="grid gap-2">
            <Label>Test Type *</Label>
            <Select value={testTypeId} onValueChange={setTestTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select test type" />
              </SelectTrigger>
              <SelectContent>
                {testTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.default_duration_hours}h)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTestType?.requires_manual_duration && (
              <p className="text-xs text-muted-foreground">
                Manual Tune requires you to enter duration manually
              </p>
            )}
          </div>

          {/* Machine */}
          <div className="grid gap-2">
            <Label>Machine *</Label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger>
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map(machine => (
                  <SelectItem key={machine.id} value={machine.id}>
                    <span className={machine.is_down ? 'text-destructive' : ''}>
                      {machine.name}
                      {machine.is_down && ' (DOWN)'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMachine?.is_down && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                This machine is currently down: {selectedMachine.down_note}
              </div>
            )}
          </div>

          {/* Lane selection for dual-capacity machines */}
          {isDualCapacity && (
            <div className="grid gap-2">
              <Label>Lane</Label>
              <Select value={laneIndex.toString()} onValueChange={(v) => setLaneIndex(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Lane 1 (Top)</SelectItem>
                  <SelectItem value="1">Lane 2 (Bottom)</SelectItem>
                </SelectContent>
              </Select>
              {selectedTestType?.name === 'ETT' && (
                <p className="text-xs text-status-scheduled">
                  Concurrent ETT runs use {selectedTestType.concurrent_duration_hours}h duration
                </p>
              )}
            </div>
          )}

          {/* Start Time */}
          <div className="grid gap-2">
            <Label>Start Time</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={useNow ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseNow(true)}
              >
                Now
              </Button>
              <Button
                type="button"
                variant={!useNow ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseNow(false)}
              >
                Custom
              </Button>
            </div>
            {!useNow && (
              <Input
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
              />
            )}
          </div>

          {/* Duration */}
          <div className="grid gap-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              step="0.25"
              min="0.25"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Status (only for editing) */}
          {existingJob && (
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {existingJob && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!serialNumber.trim() || !testTypeId || !machineId}>
            {existingJob ? 'Save Changes' : 'Add Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
