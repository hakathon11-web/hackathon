import { useScheduler } from '../context/SchedulerContext';
import { useSettings } from '../context/SettingsContext';
import { useDeleteEmployeeEvent } from '@/hooks/useEmployeeEvents';
import type { Event } from '../types.ts';
import { useState } from 'react';

interface EventBlockProps {
  event: Event;
  onClick?: () => void;
  style?: React.CSSProperties;
  onDragStart?: (e: React.DragEvent, event: Event) => void;
  onDragEnd?: () => void;
  onResizeStart?: (e: React.MouseEvent, event: Event, handle: 'left' | 'right') => void;
  isDragging?: boolean;
}

export function EventBlock({ event, onClick, style, onDragStart, onDragEnd, onResizeStart, isDragging }: EventBlockProps) {
  const { dispatch } = useScheduler();
  const { settings } = useSettings();
  const deleteEmployeeEvent = useDeleteEmployeeEvent();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this event?')) {
      if (event.id.startsWith('employee-') && event.eventType === 'employee') {
        // Optimistic delete: remove from UI immediately for instant feedback
        dispatch({ type: 'DELETE_EVENT', payload: event.id });
        
        try {
          // Database deletion happens in background
          await deleteEmployeeEvent.mutateAsync(event.id);
          // Success! The optimistic delete was correct
        } catch (error) {
          console.error('Error deleting employee event:', error);
          // Error toast is already shown by the mutation hook
          // Query invalidation will restore the event if deletion failed
        }
      } else {
        // For non-employee events, just remove from local state
        dispatch({ type: 'DELETE_EVENT', payload: event.id });
      }
    }
  };

  // Calculate time until event ends
  const getTimeUntilEnd = () => {
    const now = new Date();
    
    if (event.isOpenDuration) {
      if (event.eventStatus === 'ended') {
        return 'Ended';
      }
      if (event.eventStatus === 'active') {
        return 'Active';
      }
      return 'Scheduled';
    }

    // For fixed duration events, calculate time until end
    const startTime = new Date(event.startDate);
    const [hours, minutes] = event.startTime.split(':').map(Number);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime.getTime() + event.duration * 60 * 60 * 1000);
    const timeDiff = endTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Ended';
    }
    
    const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m left`;
    } else {
      return `${minutesLeft}m left`;
    }
  };

  // Determine event type and status
  const isCustomerBooking = event.eventType === 'booking' || (event.bookingId && event.eventType !== 'employee');
  const isPendingBooking = event.status === 'pending';
  const isOpenDuration = event.isOpenDuration;
  const isActiveOpenDuration = isOpenDuration && event.eventStatus === 'active';
  const isEndedOpenDuration = isOpenDuration && event.eventStatus === 'ended';
  
  // Only allow dragging/resizing for employee events that are not open-duration or have ended
  const isDraggable = !isCustomerBooking && !isActiveOpenDuration;
  const isResizable = !isCustomerBooking && !isOpenDuration;

  // Get status indicator
  const getStatusIndicator = () => {
    if (isPendingBooking) return '⏳';
    if (isActiveOpenDuration) return '🟢';
    if (isEndedOpenDuration) return '🔴';
    return null;
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable || !onDragStart) return;
    e.stopPropagation();
    onDragStart(e, event);
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent, handle: 'left' | 'right') => {
    if (!isResizable || !onResizeStart) return;
    e.stopPropagation();
    e.preventDefault();
    onResizeStart(e, event, handle);
  };

  // Get main content - simplified without titles or price
  const getMainContent = () => {
    return (
      <div className="event-main-content">
        <div className="event-details">
          <span className="event-detail">
            {getStatusIndicator()} ⏱️ {getTimeUntilEnd()}
          </span>
        </div>
      </div>
    );
  };

  // Get products count
  const productsCount = Array.isArray(event.products)
    ? event.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
    : 0;

  // Calculate dynamic height based on row height setting
  const getEventBlockHeight = () => {
    const baseHeight = Math.max(30, settings.rowHeight - 20); // Leave some padding
    const minHeight = 30;
    const maxHeight = 200;
    return Math.max(minHeight, Math.min(maxHeight, baseHeight));
  };

  return (
    <div 
      className={`event-block ${event.status} ${isOpenDuration ? 'open-duration' : ''} ${isCustomerBooking ? 'booking-event' : 'employee-event'} ${isDragging ? 'is-dragging' : ''}`}
      style={{ 
        backgroundColor: isCustomerBooking ? '#000000' : (event.color || '#3b82f6'),
        borderLeft: isPendingBooking ? '4px solid #f59e0b' : undefined,
        minHeight: `${getEventBlockHeight()}px`,
        cursor: isDraggable ? 'move' : 'pointer',
        opacity: isDragging ? 0.5 : 1,
        ...style
      }}
      onClick={handleClick}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Resize handle - left (adjust start time) */}
      {isResizable && isHovered && (
        <div 
          className="event-resize-handle event-resize-handle-left"
          onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
          title="Drag to adjust start time"
        />
      )}
      
      {/* Main content */}
      {getMainContent()}

      {/* Products indicator */}
      {productsCount > 0 && (
        <div className="event-products-badge">
          🛒 {productsCount}
        </div>
      )}

      {/* Delete button for employee events */}
      {!isCustomerBooking && (
        <button 
          className="event-delete"
          onClick={handleDelete}
          aria-label="Delete event"
        >
          ×
        </button>
      )}
      
      {/* Resize handle - right (adjust end time/duration) */}
      {isResizable && isHovered && (
        <div 
          className="event-resize-handle event-resize-handle-right"
          onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
          title="Drag to adjust duration"
        />
      )}
    </div>
  );
}
