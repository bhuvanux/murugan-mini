# Scheduled Wallpaper System - Quick Reference Card

**Last Updated**: Saturday, November 29, 2025  
**Version**: 2.0 (With Fixed Tab Logic)

---

## 🎯 Quick State Reference

| State | publish_status | scheduled_at | Tab | Badge | Timer | Dropdown |
|-------|---------------|--------------|-----|-------|-------|----------|
| **Draft** | `"draft"` | `null` | Drafts | Yellow | ❌ | ❌ |
| **Published** | `"published"` | `null` | Published | Green | ❌ | ❌ |
| **Scheduled** | `"scheduled"` | Valid date | Scheduled | ❌ | ✅ Blue | ✅ |
| **Broken Scheduled** | `"scheduled"` | `null` | **Drafts** | Red ⚠️ | ❌ | ❌ |

---

## 📊 Tab Filtering Logic

```javascript
// ✅ CORRECT Implementation (Fixed)

if (activeTab === "published") {
  return wallpaper.publish_status === "published";
}

if (activeTab === "scheduled") {
  return wallpaper.publish_status === "scheduled" && wallpaper.scheduled_at;
}

if (activeTab === "draft") {
  return wallpaper.publish_status === "draft" || 
         (wallpaper.publish_status === "scheduled" && !wallpaper.scheduled_at);
}
```

**Key Point**: Scheduled wallpapers WITHOUT `scheduled_at` appear in **DRAFTS**, not Scheduled tab!

---

## ⏱️ Countdown Timer Formats

| Time Remaining | Display Format | Example |
|---------------|----------------|---------|
| > 1 day | `"Xd : Yh left"` | `"2d : 14h left"` |
| 1-24 hours | `"HH:MM:SS left"` | `"12:34:56 left"` |
| < 1 hour | `"MM:SS left"` | `"14:22 left"` |
| Expired | `"Publishing..."` | Green background |

**Update Frequency**: Every 1 second  
**Auto-Publish**: Triggers when timer hits `00:00:00`

---

## 🔄 Action Flow Chart

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTIONS                         │
└─────────────────────────────────────────────────────────┘

Upload Wallpaper
├─ Select "Draft" → Appears in DRAFTS tab
├─ Select "Publish Now" → Appears in PUBLISHED tab
└─ Select "Schedule" + Pick Date → Appears in SCHEDULED tab
   └─ (If no date selected) → Error: "Please select date"


Scheduled Wallpaper Actions (Dropdown ⋮)
├─ Reschedule
│  └─ Modal opens → Pick new date → Timer updates → Stays in SCHEDULED
│
├─ Publish Now
│  └─ Immediate publish → Moves to PUBLISHED tab → Timer disappears
│
└─ Cancel Schedule
   └─ Confirmation → Moves to DRAFTS tab → Badge changes to "draft"


Timer Expiration (Auto)
└─ 00:00:00 → "Publishing..." → Auto-publish → Moves to PUBLISHED tab


Broken Scheduled Wallpaper (in Drafts tab)
├─ Banner Action: "Schedule All for Tomorrow"
│  └─ All broken → Scheduled for noon tomorrow → Move to SCHEDULED
│
├─ Banner Action: "Convert All to Drafts"
│  └─ publish_status = "draft" → Warnings disappear
│
└─ Card Action: "Set Schedule Date"
   └─ Modal opens → Pick date → Moves to SCHEDULED tab


Draft Wallpaper
├─ Click "Publish" → Moves to PUBLISHED tab
└─ Click "Delete" → Deleted


Published Wallpaper
├─ Click "Unpublish" → Moves to DRAFTS tab
└─ Click "Delete" → Deleted
```

---

## ⚠️ Warning System

### Banner Warning (Drafts Tab Only)
**Appears When**: One or more wallpapers have `publish_status = "scheduled"` but `scheduled_at = null`

**Location**: Top of Drafts tab, below controls

**Visual**: Orange border, orange background

**Text**: `"⚠️ X Wallpaper(s) Marked as Scheduled but Missing Schedule Date"`

**Actions**:
- `[Schedule All for Tomorrow]` → Sets all to noon tomorrow
- `[Convert All to Drafts]` → Changes `publish_status` to `"draft"`

### Card Warning (Individual Wallpaper)
**Appears When**: Wallpaper has `publish_status = "scheduled"` but `scheduled_at = null`

**Location**: Inside wallpaper card, below title

**Visual**: Red border, red background

**Badge**: `"⚠️ No schedule"` (red pill)

**Action**: `[Set Schedule Date]` → Opens reschedule modal

---

## 🔧 Developer Notes

### Data Storage
- **Database**: `wallpapers` table (publish_status, title, image_url, etc.)
- **KV Store**: `wallpaper:schedule:{id}` → Stores `scheduled_at` as **OBJECT**

```javascript
// ✅ Correct KV Store Format
{
  wallpaper_id: "abc123",
  scheduled_at: "2025-11-30T12:00:00.000Z",
  updated_at: "2025-11-29T10:30:00.000Z"
}

// ❌ WRONG - Do NOT store as JSON string
'{"scheduled_at": "2025-11-30T12:00:00.000Z"}'
```

### Key Functions

**getFilteredWallpapers()**
- Filters wallpapers by tab logic
- Applied AFTER folder filtering

**handleAutoPublish(wallpaperId)**
- Called by CountdownTimerBadge when timer expires
- Updates publish_status to "published"
- Deletes from KV store
- Reloads wallpapers

**handleReschedule(wallpaperId, newDate)**
- Updates scheduled_at in KV store
- Reloads wallpapers
- Timer auto-refreshes

**handleCancelSchedule(wallpaper)**
- Sets publish_status to "draft"
- Removes scheduled_at
- Deletes from KV store

### Component Hierarchy
```
AdminWallpaperManager
├── UploadModal (with schedule date picker)
├── RescheduleDialog
├── WallpaperAnalyticsDrawer
├── FolderDropdown
└── For each wallpaper:
    ├── CountdownTimerBadge (if scheduled + has date)
    └── ScheduleActionDropdown (if scheduled + has date)
```

---

## 📝 Common Debugging Scenarios

### Issue: Scheduled wallpaper not showing timer
**Check**:
1. Is `publish_status = "scheduled"`? ✅
2. Is `scheduled_at` not null? ✅
3. Is `scheduled_at` a valid ISO date string? ✅
4. Check console: `[AdminWallpaperManager] 🕐 Wallpaper X: { will_show_timer: true/false }`

**Solution**: If `will_show_timer: false`, check KV store data format (should be object, not string)

---

### Issue: Scheduled wallpaper appears in wrong tab
**Check**:
- If in Drafts but should be Scheduled → `scheduled_at` is probably `null`
- If in Scheduled but should be Drafts → Check `scheduled_at` value

**Debug**:
```javascript
console.log({
  publish_status: wallpaper.publish_status,
  scheduled_at: wallpaper.scheduled_at,
  scheduled_at_type: typeof wallpaper.scheduled_at,
  is_valid: wallpaper.scheduled_at && !isNaN(new Date(wallpaper.scheduled_at).getTime())
});
```

---

### Issue: Timer not counting down
**Check**:
1. Open browser console - any errors?
2. Check CountdownTimerBadge useEffect running
3. Verify setInterval is active
4. Check `scheduledAt` prop is valid

**Solution**: Ensure `scheduledAt` is ISO string, not Date object or null

---

### Issue: Auto-publish not working
**Check**:
1. Is `onTimeUp` callback provided to CountdownTimerBadge?
2. Is `wallpaperId` passed correctly?
3. Check console for auto-publish logs

**Solution**: Verify `handleAutoPublish` is bound correctly

---

## 🎨 UI Color Codes

| Element | Color | Hex |
|---------|-------|-----|
| Draft Badge | Yellow | `#FEF3C7` bg, `#92400E` text |
| Published Badge | Green | `#D1FAE5` bg, `#065F46` text |
| Scheduled Timer | Blue | `#DBEAFE` bg, `#1E40AF` text |
| No Schedule Badge | Red | `#FEE2E2` bg, `#991B1B` text |
| Publishing Timer | Green | `#D1FAE5` bg, `#065F46` text |
| Warning Banner | Orange | `#FED7AA` bg, `#9A3412` text |
| Warning Card | Red | `#FEE2E2` bg, `#991B1B` text |

---

## 🚀 Quick Test Checklist

Before deploying:

- [ ] **Upload as Draft** → Appears in Drafts tab
- [ ] **Upload as Scheduled (with date)** → Appears in Scheduled tab with timer
- [ ] **Upload as Scheduled (no date)** → Error shown
- [ ] **Scheduled → Reschedule** → Timer updates, stays in Scheduled
- [ ] **Scheduled → Publish Now** → Moves to Published tab
- [ ] **Scheduled → Cancel** → Moves to Drafts tab
- [ ] **Timer Expiration** → Auto-publishes to Published tab
- [ ] **Broken Scheduled** → Appears in Drafts tab with warnings
- [ ] **Banner Actions** → Schedule All / Convert All works
- [ ] **Tab Counts** → Accurate (Scheduled excludes broken scheduled)

---

## 📞 Key Files Reference

| File | Purpose |
|------|---------|
| `/components/admin/AdminWallpaperManager.tsx` | Main manager component |
| `/components/admin/CountdownTimerBadge.tsx` | Timer display & auto-publish |
| `/components/admin/ScheduleActionDropdown.tsx` | Dropdown menu (⋮) |
| `/components/admin/RescheduleDialog.tsx` | Reschedule modal |
| `/components/admin/UploadModal.tsx` | Upload with scheduling |
| `/utils/adminAPI.ts` | API functions |
| `/supabase/functions/server/api-routes.tsx` | Backend routes |
| `/supabase/functions/server/kv_store.tsx` | KV storage utility |

---

## 🔑 Critical Success Criteria

✅ **Logic**:
- Scheduled WITH date → SCHEDULED tab
- Scheduled WITHOUT date → DRAFTS tab
- Draft → DRAFTS tab
- Published → PUBLISHED tab

✅ **Timer**:
- Updates every second
- Auto-publishes on expiry
- Correct format based on time remaining

✅ **Warnings**:
- Banner shown in Drafts if broken scheduled exist
- Card warning on individual broken scheduled
- Warnings disappear when fixed

✅ **Actions**:
- All dropdown actions work correctly
- Batch actions (banner) work
- State transitions refresh UI

---

**End of Quick Reference**
