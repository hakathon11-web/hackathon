import { useSettings } from '../context/SettingsContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SettingsPanel() {
  const { settings, updateSettings, resetSettings, isLoading, isError, error } = useSettings();
  const [local, setLocal] = useState(settings);
  
  // Update local state when settings change
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Calendar Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Loading your calendar preferences...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Calendar Settings
          </h2>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Failed to load settings
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error?.message || 'An error occurred while loading calendar settings.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const presetPalette = ['#22c55e', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#a855f7', '#10b981', '#eab308'];
  const statusLabels: Record<'available' | 'soon' | 'occupied' | 'soonAvailable', string> = {
    available: 'Available',
    soon: 'Soon Occupied',
    occupied: 'Occupied',
    soonAvailable: 'Soon Available',
  };
  const minuteStepOptions = Array.from({ length: 60 }, (_, i) => i + 1).filter(n => 60 % n === 0);

  const handleSave = () => {
    // Basic validation
    const start = Math.max(0, Math.min(23, Number(local.scheduleStartHour)));
    const end = Math.max(0, Math.min(23, Number(local.scheduleEndHour)));
    const candidateStep = Number(local.minuteStep);
    const minuteStep = (Number.isFinite(candidateStep) && candidateStep > 0 && candidateStep <= 60 && 60 % candidateStep === 0)
      ? candidateStep
      : 5;
    const defaultDuration = Math.max(0.5, Math.min(24, Number(local.defaultEventDurationHours)));
    const rowHeight = Math.max(40, Math.min(200, Number(local.rowHeight) || 80));
    updateSettings({
      scheduleStartHour: start,
      scheduleEndHour: end,
      minuteStep,
      defaultEventDurationHours: defaultDuration,
      durationStepMinutes: Number(local.durationStepMinutes) || 30,
      resourceSoonThresholdMinutes: Math.max(5, Math.min(240, Number(local.resourceSoonThresholdMinutes) || 60)),
      resourceSoonAvailableThresholdMinutes: Math.max(5, Math.min(240, Number(local.resourceSoonAvailableThresholdMinutes) || 60)),
      rowHeight,
      resourceColors: local.resourceColors,
    });
  };

  const handleReset = () => {
    resetSettings();
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Calendar Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure your calendar preferences and appearance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Time Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minuteStep">Minute Step</Label>
                <Select
                  value={local.minuteStep.toString()}
                  onValueChange={(value) => setLocal({ ...local, minuteStep: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteStepOptions.map(step => (
                      <SelectItem key={step} value={step.toString()}>
                        {step} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="durationStep">Duration Step</Label>
                <Select
                  value={local.durationStepMinutes.toString()}
                  onValueChange={(value) => setLocal({ ...local, durationStepMinutes: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 60].map(step => (
                      <SelectItem key={step} value={step.toString()}>
                        {step} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="defaultDuration">Default Event Duration</Label>
              <Select
                value={local.defaultEventDurationHours.toString()}
                onValueChange={(value) => setLocal({ ...local, defaultEventDurationHours: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 24].map(d => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} hours
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rowHeight">Row Height</Label>
              <Select
                value={local.rowHeight.toString()}
                onValueChange={(value) => setLocal({ ...local, rowHeight: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[40, 60, 80, 100, 120, 140].map(value => (
                    <SelectItem key={value} value={value.toString()}>
                      {value}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resource Status Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Status Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="soonThreshold">Soon Occupied (minutes)</Label>
              <Input
                id="soonThreshold"
                type="number"
                min={5}
                max={240}
                value={local.resourceSoonThresholdMinutes}
                onChange={(e) => setLocal({ ...local, resourceSoonThresholdMinutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="soonAvailableThreshold">Soon Available (minutes)</Label>
              <Input
                id="soonAvailableThreshold"
                type="number"
                min={5}
                max={240}
                value={local.resourceSoonAvailableThresholdMinutes}
                onChange={(e) => setLocal({ ...local, resourceSoonAvailableThresholdMinutes: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(['available', 'soon', 'occupied', 'soonAvailable'] as const).map(key => (
              <div key={key} className="flex items-center gap-4">
                <div className="w-32">
                  <Label className="text-sm font-medium">{statusLabels[key]}</Label>
                </div>
                <div 
                  className="w-8 h-8 rounded border-2 border-gray-300" 
                  style={{ backgroundColor: local.resourceColors[key] }}
                  title={`${statusLabels[key]} color`}
                />
                <div className="flex gap-1 flex-wrap">
                  {presetPalette.map(hex => (
                    <button
                      key={hex}
                      type="button"
                      className={`w-6 h-6 rounded border-2 ${
                        local.resourceColors[key] === hex 
                          ? 'border-gray-800' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: hex }}
                      onClick={() => setLocal({ ...local, resourceColors: { ...local.resourceColors, [key]: hex } })}
                      title={`${statusLabels[key]}: ${hex}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
