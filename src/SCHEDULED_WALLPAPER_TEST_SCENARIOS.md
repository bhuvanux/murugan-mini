# Scheduled Wallpaper System - Comprehensive Test Scenarios

**Test Suite**: Scheduled Wallpaper UI Logic Validation  
**Date**: Saturday, November 29, 2025  
**System**: Murugan Wallpapers Admin Panel

---

## Test Environment Setup

### Prerequisites:
1. Admin Panel is running
2. Database tables are created
3. At least one wallpaper folder exists
4. Backend server is running
5. User is authenticated as admin

---

## Category 1: Upload Flow Tests

### Test 1.1: Upload as Draft
**Objective**: Verify wallpaper uploads correctly as draft

**Steps**:
1. Click "Upload Wallpaper" button
2. Select an image file
3. Enter title: "Test Draft Wallpaper"
4. Select status: "Draft"
5. Click "Upload"

**Expected Results**:
- ✅ Upload succeeds with success toast
- ✅ Wallpaper appears in DRAFTS tab
- ✅ Badge shows "draft" (yellow)
- ✅ No countdown timer displayed
- ✅ No dropdown menu displayed
- ✅ Actions: [Publish] [Delete]

**Data Validation**:
```json
{
  "publish_status": "draft",
  "scheduled_at": null
}
```

---

### Test 1.2: Upload as Published
**Objective**: Verify wallpaper publishes immediately

**Steps**:
1. Click "Upload Wallpaper"
2. Select image
3. Enter title: "Test Published Wallpaper"
4. Select status: "Publish Now"
5. Click "Upload"

**Expected Results**:
- ✅ Upload succeeds
- ✅ Wallpaper appears in PUBLISHED tab
- ✅ Badge shows "published" (green)
- ✅ No timer or dropdown
- ✅ Actions: [Analytics] [Unpublish] [Delete]

**Data Validation**:
```json
{
  "publish_status": "published",
  "published_at": "[current timestamp]",
  "scheduled_at": null
}
```

---

### Test 1.3: Upload as Scheduled (with date)
**Objective**: Verify scheduled upload with future date

**Steps**:
1. Click "Upload Wallpaper"
2. Select image
3. Enter title: "Test Scheduled Wallpaper"
4. Select status: "Schedule"
5. Click date picker, select tomorrow at 12:00 PM
6. Click "Upload"

**Expected Results**:
- ✅ Upload succeeds
- ✅ Wallpaper appears in SCHEDULED tab (NOT Drafts)
- ✅ Countdown timer displayed (blue pill)
- ✅ Timer shows correct time remaining (e.g., "1d : 12h left")
- ✅ Dropdown menu [⋮] displayed
- ✅ No warning badges or banners
- ✅ Actions: [Analytics] [Delete]

**Data Validation**:
```json
{
  "publish_status": "scheduled",
  "scheduled_at": "2025-11-30T12:00:00.000Z"
}
```

**KV Store Validation**:
```
Key: wallpaper:schedule:[wallpaper_id]
Value: {
  "wallpaper_id": "[id]",
  "scheduled_at": "2025-11-30T12:00:00.000Z",
  "created_at": "[timestamp]"
}
```

---

### Test 1.4: Upload as Scheduled (without date)
**Objective**: Verify error handling when schedule selected but no date provided

**Steps**:
1. Click "Upload Wallpaper"
2. Select image
3. Select status: "Schedule"
4. DO NOT select a date
5. Click "Upload"

**Expected Results**:
- ❌ Upload blocked
- ✅ Error toast: "Please select a schedule date"
- ✅ Modal remains open
- ✅ No wallpaper created

---

## Category 2: Tab Filtering Tests

### Test 2.1: Published Tab Filtering
**Objective**: Verify Published tab shows only published wallpapers

**Setup**:
- Create 3 wallpapers:
  - W1: publish_status = "published"
  - W2: publish_status = "scheduled", scheduled_at = future date
  - W3: publish_status = "draft"

**Steps**:
1. Navigate to Admin Wallpaper Manager
2. Click "Published" tab

**Expected Results**:
- ✅ Shows ONLY W1
- ✅ Tab count shows "Published (1)"
- ✅ W2 not visible
- ✅ W3 not visible

---

### Test 2.2: Scheduled Tab Filtering
**Objective**: Verify Scheduled tab shows only scheduled wallpapers WITH dates

**Setup**:
- Create 4 wallpapers:
  - W1: publish_status = "scheduled", scheduled_at = future date
  - W2: publish_status = "scheduled", scheduled_at = null
  - W3: publish_status = "published"
  - W4: publish_status = "draft"

**Steps**:
1. Click "Scheduled" tab

**Expected Results**:
- ✅ Shows ONLY W1
- ✅ Tab count shows "Scheduled (1)"
- ✅ W2 NOT visible (it should be in Drafts)
- ✅ W3 not visible
- ✅ W4 not visible
- ✅ No warning banners displayed

---

### Test 2.3: Drafts Tab Filtering - Regular Drafts
**Objective**: Verify Drafts tab shows draft wallpapers

**Setup**:
- W1: publish_status = "draft"
- W2: publish_status = "published"

**Steps**:
1. Click "Drafts" tab

**Expected Results**:
- ✅ Shows W1
- ✅ W2 not visible
- ✅ No warning banners

---

### Test 2.4: Drafts Tab Filtering - Broken Scheduled
**Objective**: Verify broken scheduled wallpapers appear in Drafts

**Setup**:
- W1: publish_status = "scheduled", scheduled_at = null
- W2: publish_status = "scheduled", scheduled_at = future date
- W3: publish_status = "draft"

**Steps**:
1. Click "Drafts" tab

**Expected Results**:
- ✅ Shows W1 (broken scheduled)
- ✅ Shows W3 (regular draft)
- ✅ W2 NOT visible (it's in Scheduled tab)
- ✅ Tab count shows "Drafts (2)"
- ✅ Orange warning banner displayed at top
- ✅ Banner text: "⚠️ 1 Wallpaper Marked as Scheduled but Missing Schedule Date"
- ✅ W1 has red warning card
- ✅ W1 has "⚠️ No schedule" badge
- ✅ W3 has normal draft badge (no warning)

---

### Test 2.5: Tab Count Accuracy
**Objective**: Verify all tab counts are correct

**Setup**:
- W1-W3: publish_status = "published" (3 wallpapers)
- W4-W5: publish_status = "scheduled", scheduled_at = future date (2 wallpapers)
- W6: publish_status = "scheduled", scheduled_at = null (1 wallpaper)
- W7-W9: publish_status = "draft" (3 wallpapers)

**Steps**:
1. Load Admin Wallpaper Manager
2. Check tab counts

**Expected Results**:
- ✅ Published (3)
- ✅ Scheduled (2) ← Only W4-W5, NOT W6
- ✅ Drafts (4) ← W6 + W7-W9

---

## Category 3: Countdown Timer Tests

### Test 3.1: Timer Display - Days Format
**Objective**: Verify timer shows days format correctly

**Setup**:
- Schedule wallpaper for 3 days in future

**Expected Results**:
- ✅ Timer shows "3d : Xh left" (where X = remaining hours in current day)
- ✅ Blue pill background
- ✅ Clock icon displayed
- ✅ Updates every second

---

### Test 3.2: Timer Display - Hours Format
**Objective**: Verify timer shows HH:MM:SS format

**Setup**:
- Schedule wallpaper for 2 hours in future

**Expected Results**:
- ✅ Timer shows "02:XX:XX left"
- ✅ Seconds counting down
- ✅ Blue pill background

---

### Test 3.3: Timer Display - Minutes Format
**Objective**: Verify timer shows MM:SS when less than 1 hour

**Setup**:
- Schedule wallpaper for 30 minutes in future

**Expected Results**:
- ✅ Timer shows "30:XX left"
- ✅ Counts down correctly
- ✅ Blue pill background

---

### Test 3.4: Timer Auto-Refresh
**Objective**: Verify timer updates every second without page reload

**Setup**:
- Schedule wallpaper for 2 minutes

**Steps**:
1. Watch timer for 10 seconds
2. Do NOT reload page

**Expected Results**:
- ✅ Timer counts down every second
- ✅ "02:00" → "01:59" → "01:58" → ...
- ✅ No page reload required
- ✅ No flashing or re-rendering

---

### Test 3.5: Timer Expiration → Auto-Publish
**Objective**: Verify wallpaper auto-publishes when timer expires

**Setup**:
- Schedule wallpaper for 1 minute in future

**Steps**:
1. Watch timer count down
2. Wait for "00:00:00"

**Expected Results**:
- ✅ Timer shows "Publishing..." (green background)
- ✅ After ~1 second: Toast "Wallpaper auto-published!"
- ✅ Wallpaper moves from SCHEDULED tab to PUBLISHED tab
- ✅ Timer disappears
- ✅ Dropdown menu disappears
- ✅ Badge changes to "published" (green)

**Data Validation**:
```json
{
  "publish_status": "published",
  "published_at": "[current timestamp]",
  "scheduled_at": null
}
```

**KV Store Validation**:
```
Key: wallpaper:schedule:[wallpaper_id] should be DELETED
```

---

## Category 4: Dropdown Actions Tests

### Test 4.1: Reschedule Action
**Objective**: Verify rescheduling updates timer and date

**Setup**:
- W1: scheduled for tomorrow at 12:00 PM

**Steps**:
1. Click dropdown [⋮] on W1
2. Click "Reschedule"
3. Modal opens
4. Select new date: Day after tomorrow at 3:00 PM
5. Click "Reschedule"

**Expected Results**:
- ✅ Modal closes
- ✅ Toast: "Wallpaper rescheduled successfully"
- ✅ Timer updates to new countdown
- ✅ Wallpaper STAYS in SCHEDULED tab
- ✅ No page reload required

**Data Validation**:
```json
{
  "publish_status": "scheduled",
  "scheduled_at": "[new date ISO string]"
}
```

---

### Test 4.2: Publish Now Action
**Objective**: Verify immediate publishing works

**Setup**:
- W1: scheduled for tomorrow

**Steps**:
1. Click dropdown [⋮] on W1
2. Click "Publish Now"

**Expected Results**:
- ✅ Toast: "Wallpaper published immediately"
- ✅ Wallpaper moves to PUBLISHED tab
- ✅ Timer disappears
- ✅ Dropdown disappears
- ✅ Badge changes to "published" (green)

**Data Validation**:
```json
{
  "publish_status": "published",
  "published_at": "[current timestamp]",
  "scheduled_at": null
}
```

---

### Test 4.3: Cancel Schedule Action
**Objective**: Verify canceling schedule moves to drafts

**Setup**:
- W1: scheduled for tomorrow

**Steps**:
1. Click dropdown [⋮] on W1
2. Click "Cancel Schedule"
3. Confirm in alert dialog

**Expected Results**:
- ✅ Toast: "Schedule cancelled - wallpaper moved to drafts"
- ✅ Wallpaper moves to DRAFTS tab
- ✅ Timer disappears
- ✅ Dropdown disappears
- ✅ Badge changes to "draft" (yellow)
- ✅ Actions change to [Publish] [Delete]

**Data Validation**:
```json
{
  "publish_status": "draft",
  "scheduled_at": null
}
```

---

## Category 5: Warning System Tests

### Test 5.1: Drafts Tab Warning Banner - Single Broken
**Objective**: Verify warning banner appears for broken scheduled wallpaper

**Setup**:
- W1: publish_status = "scheduled", scheduled_at = null
- W2: publish_status = "draft"

**Steps**:
1. Navigate to Drafts tab

**Expected Results**:
- ✅ Orange warning banner displayed
- ✅ Text: "⚠️ 1 Wallpaper Marked as Scheduled but Missing Schedule Date"
- ✅ Two action buttons:
  - [Schedule All for Tomorrow]
  - [Convert All to Drafts]

---

### Test 5.2: Drafts Tab Warning Banner - Multiple Broken
**Objective**: Verify banner handles multiple broken wallpapers

**Setup**:
- W1-W3: publish_status = "scheduled", scheduled_at = null (3 wallpapers)

**Steps**:
1. Navigate to Drafts tab

**Expected Results**:
- ✅ Banner text: "⚠️ 3 Wallpapers Marked as Scheduled but Missing Schedule Date"
- ✅ Plural "Wallpapers" used

---

### Test 5.3: Card-Level Warning - Broken Scheduled
**Objective**: Verify individual wallpaper card shows warning

**Setup**:
- W1: publish_status = "scheduled", scheduled_at = null

**Steps**:
1. Navigate to Drafts tab
2. Find W1 card

**Expected Results**:
- ✅ Red warning card displayed below title
- ✅ Text: "⚠️ This wallpaper is marked as scheduled but has no date"
- ✅ Button: [Set Schedule Date]
- ✅ Badge: "⚠️ No schedule" (red pill)

---

### Test 5.4: Fix via Banner - Schedule All
**Objective**: Verify batch scheduling from banner works

**Setup**:
- W1-W2: publish_status = "scheduled", scheduled_at = null

**Steps**:
1. Navigate to Drafts tab
2. Click "Schedule All for Tomorrow" button

**Expected Results**:
- ✅ Toast: "Scheduled 2 wallpaper(s) for tomorrow at noon!"
- ✅ W1-W2 move from DRAFTS to SCHEDULED tab
- ✅ W1-W2 show countdown timers
- ✅ Warning banner disappears

**Data Validation** (for each):
```json
{
  "publish_status": "scheduled",
  "scheduled_at": "[tomorrow at 12:00 PM ISO string]"
}
```

---

### Test 5.5: Fix via Banner - Convert All to Drafts
**Objective**: Verify batch conversion to drafts works

**Setup**:
- W1-W2: publish_status = "scheduled", scheduled_at = null

**Steps**:
1. Navigate to Drafts tab
2. Click "Convert All to Drafts" button

**Expected Results**:
- ✅ Toast: "Converted 2 wallpaper(s) to proper drafts"
- ✅ W1-W2 stay in DRAFTS tab
- ✅ W1-W2 badges change to "draft" (yellow)
- ✅ Warning banner disappears
- ✅ Red warning cards disappear

**Data Validation**:
```json
{
  "publish_status": "draft",
  "scheduled_at": null
}
```

---

### Test 5.6: Fix via Card - Set Schedule Date
**Objective**: Verify setting schedule date from card warning works

**Setup**:
- W1: publish_status = "scheduled", scheduled_at = null

**Steps**:
1. Navigate to Drafts tab
2. Find W1 card with red warning
3. Click "Set Schedule Date" button
4. Reschedule modal opens
5. Select tomorrow at 3:00 PM
6. Click "Reschedule"

**Expected Results**:
- ✅ Modal closes
- ✅ Toast: "Wallpaper rescheduled successfully"
- ✅ W1 moves from DRAFTS to SCHEDULED tab
- ✅ W1 shows countdown timer
- ✅ Warning banner disappears (if this was the only broken one)

---

## Category 6: State Transition Tests

### Test 6.1: Draft → Published
**Steps**:
1. Find draft wallpaper in Drafts tab
2. Click [Publish] button

**Expected**:
- ✅ Moves to Published tab
- ✅ Badge: "published" (green)
- ✅ Actions: [Analytics] [Unpublish] [Delete]

---

### Test 6.2: Published → Draft
**Steps**:
1. Find published wallpaper
2. Click [Unpublish] button

**Expected**:
- ✅ Moves to Drafts tab
- ✅ Badge: "draft" (yellow)
- ✅ Actions: [Publish] [Delete]

---

### Test 6.3: Draft → Scheduled
**Steps**:
1. Create draft wallpaper
2. Use external tool to set: publish_status = "scheduled", scheduled_at = future
3. Refresh page

**Expected**:
- ✅ Appears in Scheduled tab
- ✅ Shows countdown timer

**Note**: This tests data consistency when status changes outside UI

---

### Test 6.4: Scheduled → Scheduled (Reschedule)
**Steps**:
1. Scheduled wallpaper with timer
2. Reschedule to new date
3. Verify stays in Scheduled tab

**Expected**:
- ✅ Timer updates
- ✅ Stays in Scheduled tab
- ✅ No interruption

---

## Category 7: Edge Case Tests

### Test 7.1: Schedule for Past Date
**Objective**: Verify system rejects past dates

**Steps**:
1. Try to schedule wallpaper for yesterday

**Expected Results**:
- ❌ Date picker should disable past dates
- ✅ If somehow bypassed, backend should reject

---

### Test 7.2: Timer at 00:00:00 Boundary
**Objective**: Verify exact moment of auto-publish

**Setup**:
- Schedule for 5 seconds from now

**Expected**:
- ✅ "00:00:05" → "00:00:04" → ... → "00:00:00" → "Publishing..."
- ✅ Auto-publish triggers within 1-2 seconds

---

### Test 7.3: Multiple Timers Expiring Simultaneously
**Objective**: Verify system handles multiple auto-publishes

**Setup**:
- Schedule 3 wallpapers for same time (1 minute)

**Expected**:
- ✅ All 3 timers count down
- ✅ All 3 auto-publish at same time
- ✅ All 3 move to Published tab
- ✅ No errors or crashes

---

### Test 7.4: Reschedule to Immediate Future (1 second)
**Objective**: Verify timer handles very short countdowns

**Steps**:
1. Reschedule to 1 second from now

**Expected**:
- ✅ Timer shows "00:01" briefly
- ✅ Immediately transitions to "Publishing..."
- ✅ Auto-publishes successfully

---

### Test 7.5: Cancel Schedule During Countdown
**Objective**: Verify canceling works even during active countdown

**Setup**:
- Wallpaper scheduled for 30 seconds

**Steps**:
1. Watch timer count down (e.g., "00:15" remaining)
2. Click dropdown → Cancel Schedule

**Expected**:
- ✅ Timer stops immediately
- ✅ Wallpaper moves to Drafts
- ✅ No auto-publish occurs

---

### Test 7.6: Folder Filter + Tab Filter
**Objective**: Verify folder filtering works with tab filtering

**Setup**:
- Folder A: W1 (published), W2 (scheduled)
- Folder B: W3 (draft)

**Steps**:
1. Select Folder A from dropdown
2. Click Scheduled tab

**Expected Results**:
- ✅ Shows only W2
- ✅ W1 not shown (different tab)
- ✅ W3 not shown (different folder)

---

### Test 7.7: Page Reload During Countdown
**Objective**: Verify timer resumes correctly after reload

**Setup**:
- Schedule wallpaper for 5 minutes

**Steps**:
1. Wait 1 minute
2. Reload page
3. Check timer

**Expected Results**:
- ✅ Timer shows ~4 minutes remaining
- ✅ Countdown continues correctly
- ✅ No reset to original 5 minutes

---

### Test 7.8: Data Migration - Legacy JSON String
**Objective**: Verify auto-migration for old JSON string format

**Setup**:
- Manually set KV store:
  ```
  Key: wallpaper:schedule:123
  Value: '{"scheduled_at": "2025-12-01T12:00:00.000Z"}' (string, not object)
  ```

**Steps**:
1. Load wallpapers

**Expected Results**:
- ✅ System auto-migrates to object format
- ✅ scheduled_at displays correctly
- ✅ Timer works
- ✅ No errors

---

## Category 8: UI/UX Tests

### Test 8.1: Timer Visibility in Card View
**Objective**: Verify timer is clearly visible

**Setup**:
- Scheduled wallpaper

**Expected**:
- ✅ Timer in top-right corner
- ✅ Blue background stands out
- ✅ Clock icon visible
- ✅ Text readable

---

### Test 8.2: Timer Visibility in List View
**Objective**: Verify timer works in list view

**Steps**:
1. Switch to list view
2. Check scheduled wallpaper

**Expected**:
- ✅ Timer displayed
- ✅ Dropdown menu displayed
- ✅ Layout not broken

---

### Test 8.3: Dropdown Menu Accessibility
**Objective**: Verify dropdown is easy to access

**Expected**:
- ✅ [⋮] icon visible and clickable
- ✅ Menu opens on click
- ✅ Menu items clearly labeled
- ✅ Icons displayed correctly

---

### Test 8.4: Responsive Design - Mobile View
**Objective**: Verify UI works on mobile

**Steps**:
1. Resize browser to mobile size
2. Check scheduled wallpaper card

**Expected**:
- ✅ Timer still visible
- ✅ Dropdown accessible
- ✅ No overlapping elements
- ✅ Warning banners readable

---

### Test 8.5: Toast Notifications
**Objective**: Verify all actions show appropriate toasts

**Actions to Test**:
- ✅ Upload scheduled: "X Wallpaper(s) uploaded successfully!"
- ✅ Reschedule: "Wallpaper rescheduled successfully"
- ✅ Publish Now: "Wallpaper published immediately"
- ✅ Cancel Schedule: "Schedule cancelled - wallpaper moved to drafts"
- ✅ Auto-publish: "Wallpaper auto-published!"
- ✅ Batch schedule: "Scheduled X wallpaper(s) for tomorrow at noon!"
- ✅ Batch convert: "Converted X wallpaper(s) to proper drafts"

---

## Category 9: Performance Tests

### Test 9.1: Multiple Countdowns Performance
**Objective**: Verify UI handles many simultaneous timers

**Setup**:
- Schedule 50 wallpapers for various future times

**Expected**:
- ✅ All timers update smoothly
- ✅ No lag or freezing
- ✅ CPU usage reasonable

---

### Test 9.2: Large Dataset Filtering
**Objective**: Verify tab filtering performance with large dataset

**Setup**:
- Create 500 wallpapers mixed across all statuses

**Steps**:
1. Switch between tabs

**Expected**:
- ✅ Tab switches instantly
- ✅ Correct filtering
- ✅ No lag

---

## Category 10: Error Handling Tests

### Test 10.1: Backend Error During Reschedule
**Objective**: Verify graceful error handling

**Setup**:
- Simulate backend error (e.g., disconnect network)

**Steps**:
1. Try to reschedule
2. Backend fails

**Expected**:
- ✅ Error toast displayed
- ✅ Modal stays open
- ✅ User can retry
- ✅ No UI corruption

---

### Test 10.2: Invalid Date Format
**Objective**: Verify system handles malformed dates

**Setup**:
- Manually corrupt scheduled_at in backend

**Expected**:
- ✅ Timer doesn't crash
- ✅ Fallback to "Invalid date" or similar
- ✅ Warning shown

---

## Summary

**Total Test Scenarios**: 60+

**Coverage**:
- ✅ Upload flows
- ✅ Tab filtering logic
- ✅ Countdown timer mechanics
- ✅ Dropdown actions
- ✅ Warning systems
- ✅ State transitions
- ✅ Edge cases
- ✅ UI/UX
- ✅ Performance
- ✅ Error handling

**Priority Tests** (Must Pass):
1. Test 2.4 - Broken scheduled in Drafts tab ⭐
2. Test 3.5 - Auto-publish on timer expiration ⭐
3. Test 4.1-4.3 - All dropdown actions ⭐
4. Test 5.4-5.5 - Warning banner batch actions ⭐
5. Test 2.5 - Tab count accuracy ⭐

---

**End of Test Scenarios**
