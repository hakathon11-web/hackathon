import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SeatNameEditorProps {
  seatName: string;
  onSave: (newName: string) => void;
  isUpdating?: boolean;
}

export const SeatNameEditor: React.FC<SeatNameEditorProps> = ({
  seatName,
  onSave,
  isUpdating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(seatName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditedName(seatName);
  }, [seatName]);

  const handleSave = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== seatName) {
      onSave(trimmedName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(seatName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm px-2 py-1 flex-1 min-w-0"
          disabled={isUpdating}
          maxLength={50}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900"
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          disabled={isUpdating || !editedName.trim()}
          title="Save"
        >
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900"
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
          disabled={isUpdating}
          title="Cancel"
        >
          <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="flex-1 truncate" title={seatName}>{seatName}</span>
      <button
        className="seat-edit-btn p-0.5 rounded transition-all duration-200 opacity-0 hover:bg-blue-100 dark:hover:bg-blue-900"
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering the cell's quick add
          setIsEditing(true);
        }}
        title="Click to rename seat"
      >
        <Pencil className="h-3 w-3 text-blue-600 dark:text-blue-400" />
      </button>
    </div>
  );
};

