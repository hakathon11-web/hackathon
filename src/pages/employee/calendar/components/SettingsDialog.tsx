import { X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useState } from 'react';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, updateSettings, resetSettings, isLoading, isError } = useSettings();
  const [local, setLocal] = useState(settings);
  const presetPalette = ['#22c55e', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#a855f7', '#10b981', '#eab308'];
  const statusLabels: Record<'available' | 'soon' | 'occupied' | 'soonAvailable', string> = {
    available: 'Available',
    soon: 'Soon Occupied',
    occupied: 'Occupied',
    soonAvailable: 'Soon Available',
  };
  const minuteStepOptions = Array.from({ length: 60 }, (_, i) => i + 1).filter(n => 60 % n === 0);

  if (!open) return null;

  // Show loading state in dialog
  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content settings-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Venue Settings</h3>
            <button onClick={onClose} className="close-button">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    // Basic validation
    const start = Math.max(0, Math.min(23, Number(local.scheduleStartHour)));
    const end = Math.max(0, Math.min(23, Number(local.scheduleEndHour)));
    const candidateStep = Number(local.minuteStep);
    const minuteStep = (Number.isFinite(candidateStep) && candidateStep > 0 && candidateStep <= 60 && 60 % candidateStep === 0)
      ? candidateStep
      : 5;
    const defaultDuration = Math.max(0.5, Math.min(24, Number(local.defaultEventDurationHours)));
    updateSettings({
      scheduleStartHour: start,
      scheduleEndHour: end,
      minuteStep,
      defaultEventDurationHours: defaultDuration,
      durationStepMinutes: Number(local.durationStepMinutes) || 30,
      resourceSoonThresholdMinutes: Math.max(5, Math.min(240, Number(local.resourceSoonThresholdMinutes) || 60)),
      resourceSoonAvailableThresholdMinutes: Math.max(5, Math.min(240, Number(local.resourceSoonAvailableThresholdMinutes) || 60)),
      resourceColors: local.resourceColors,
    });
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Venue Settings</h3>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Minute Step</label>
              <select
                value={local.minuteStep}
                onChange={(e) => setLocal({ ...local, minuteStep: Number(e.target.value) })}
              >
                {minuteStepOptions.map(step => (
                  <option key={step} value={step}>{step} minutes</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Duration Step</label>
              <select
                value={local.durationStepMinutes}
                onChange={(e) => setLocal({ ...local, durationStepMinutes: Number(e.target.value) })}
              >
                {[15, 30, 60].map(step => (
                  <option key={step} value={step}>{step} minutes</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Default Event Duration</label>
            <select
              value={local.defaultEventDurationHours}
              onChange={(e) => setLocal({ ...local, defaultEventDurationHours: Number(e.target.value) })}
            >
              {[0.5,1,1.5,2,3,4,6,8,12,24].map(d => (
                <option key={d} value={d}>{d} hours</option>
              ))}
            </select>
          </div>

          

          

          <div className="form-group">
            <label>Resource Colors</label>
            <div className="color-picker" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(['available','soon','occupied','soonAvailable'] as const).map(key => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: 130, fontSize: '0.85rem', color: '#6b7280' }}>{statusLabels[key]}</span>
                  <div className="swatch selected" style={{ backgroundColor: local.resourceColors[key], width: 24, height: 24 }} title={`${statusLabels[key]} color`} />
                  <div className="swatch-row" style={{ flex: 1, minWidth: 0 }}>
                    {presetPalette.map(hex => (
                      <button
                        key={hex}
                        type="button"
                        className={`swatch ${local.resourceColors[key] === hex ? 'selected' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => setLocal({ ...local, resourceColors: { ...local.resourceColors, [key]: hex } })}
                        title={`${statusLabels[key]}: ${hex}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div className="form-group">
                <label>Soon Occupied (coloring, min)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={local.resourceSoonThresholdMinutes}
                  onChange={(e) => setLocal({ ...local, resourceSoonThresholdMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Soon Available (coloring, min)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={local.resourceSoonAvailableThresholdMinutes}
                  onChange={(e) => setLocal({ ...local, resourceSoonAvailableThresholdMinutes: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleReset} className="secondary-button">Reset</button>
          <button type="button" onClick={handleSave} className="primary-button">Save</button>
        </div>
      </div>
    </div>
  );
}


