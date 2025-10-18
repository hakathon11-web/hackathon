# Testing the Seat Rename Feature

## Test Steps

### 1. Access the Employee Dashboard
1. Navigate to `/employee/auth`
2. Log in with employee credentials
3. You should be redirected to `/employee/dashboard`

### 2. Open the Calendar View
1. The calendar tab should be active by default
2. You should see a list of seats/tables on the left side of the calendar
3. Each seat has a name like "Service Name 1", "Service Name 2", etc.

### 3. Test Hover Interaction
1. Hover your mouse over any seat name
2. You should see a small blue pencil icon appear on the right side of the name
3. The seat name should remain visible and the pencil icon should fade in smoothly

### 4. Test Inline Editing
1. Click on any seat name (or the pencil icon)
2. The name should become an editable input field
3. Two buttons should appear: a green checkmark (save) and a red X (cancel)
4. The input should be focused and the text should be selected

### 5. Test Save Functionality
1. Type a new name (e.g., "VIP Table", "Window Seat", "Corner Booth")
2. Press Enter OR click the green checkmark button
3. A success toast should appear saying "Seat renamed successfully"
4. The seat name should update immediately in the calendar
5. The editor should close and return to view mode

### 6. Test Cancel Functionality
1. Click on another seat name to edit it
2. Type some text but DON'T save it
3. Press Escape OR click the red X button
4. The editor should close without saving
5. The original name should remain unchanged

### 7. Test Persistence
1. Rename a seat to something unique
2. Refresh the page
3. The custom name should persist after the page reload
4. Navigate to another tab and back to the Calendar tab
5. The custom name should still be visible

### 8. Test Dark Mode
1. Toggle dark mode using the theme switcher in the header
2. The seat name editor should adapt to dark mode
3. Colors should remain readable and the edit icon should be visible

### 9. Test Validation
1. Try to save an empty name (delete all text and press Enter)
2. The save button should be disabled
3. Try to save a name with only spaces
4. It should be trimmed and treat as empty (save disabled)

### 10. Test Multiple Seats
1. Rename several different seats
2. Each should save independently
3. All custom names should persist together
4. The venue calendar settings should store all custom names

## Expected Behavior

### Visual Feedback
- **Hover**: Smooth fade-in of the pencil icon
- **Editing**: Input field with proper styling and focus
- **Saving**: Loading state during save, then success toast
- **Error**: Error toast if save fails

### Keyboard Shortcuts
- **Enter**: Save changes
- **Escape**: Cancel editing
- **Tab**: Not implemented (could be added for accessibility)

### Accessibility
- Input field should be keyboard accessible
- Focus should be managed properly
- Toast notifications provide screen reader feedback

## Common Issues and Solutions

### Issue: Changes Don't Persist
**Solution**: Check browser console for errors. Verify that:
- The employee has proper permissions
- The `venue_calendar_settings` table is accessible
- RLS policies allow the operation

### Issue: Pencil Icon Not Showing
**Solution**: 
- Check if CSS is loaded properly
- Verify dark mode styles if in dark mode
- Clear browser cache and refresh

### Issue: Can't Edit Name
**Solution**:
- Click directly on the name text or the pencil icon
- Check browser console for JavaScript errors
- Verify the employee is logged in properly

### Issue: Names Revert After Page Reload
**Solution**:
- Check if the save operation completed successfully
- Look for error messages in the toast notifications
- Verify database permissions in Supabase

## Database Verification

To verify the changes are saved correctly, run this query in Supabase:

```sql
SELECT settings 
FROM venue_calendar_settings 
WHERE venue_id = 'your-venue-id-here';
```

You should see a JSON structure like:

```json
{
  "seatNames": {
    "venue-xxx-seat-1": "VIP Table",
    "venue-xxx-seat-2": "Window Seat"
  }
}
```

## Performance Considerations

- Changes are optimistic (UI updates immediately)
- Background save to database
- Cache invalidation ensures consistency
- Real-time updates when calendar data refreshes

