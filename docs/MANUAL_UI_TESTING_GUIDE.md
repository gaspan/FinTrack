# 🧪 Manual UI Testing Guide - FinTrack Charts

**Quick Reference untuk Manual Check UI semua chart baru**

---

## 🚀 QUICK START - 3 Steps

### Step 1: Run App
```bash
cd /Volumes/GenturMini/genturariyadi/Desktop/FinTrack
npx expo start
```

### Step 2: Open Test Screen
```
Buka di browser/device:
→ http://localhost:8081 (atau scan QR code)
→ Navigate ke: /test-charts
```

### Step 3: Start Testing
✓ Lihat 4 chart render dengan mock data  
✓ Toggle antara chart dengan tombol di atas  
✓ Check visual sesuai expected  
✓ Test dark/light mode  

---

## 📋 Test Screen Features

```
test-charts.tsx memberikan:

1. ✅ KONTROL PANEL
   - Toggle setiap chart on/off
   - Visual checkbox untuk tracking

2. ✅ VISUAL CHECKLIST
   - Reminder checklist items
   - Quick reference points

3. ✅ 4 CHART DEMOS
   - BurnRateChart (dengan mock data)
   - CashFlowSparklineChart (30 hari data)
   - BudgetBulletChart (6 kategori)
   - MonthlyTrendComboChart (6 bulan trend)

4. ✅ TEST NOTES
   - Expected behavior untuk setiap chart
   - Visual indicators

5. ✅ PROCEDURES
   - Step-by-step testing guide
   - Interaction tests

6. ✅ QUICK FIXES
   - Common issues & solutions
   - Troubleshooting tips
```

---

## 🎯 What to Check

### BurnRateChart ✓
```
☐ Garis target pace (dashed grey) terlihat
☐ Garis actual spending (solid biru/merah) terlihat
☐ Warning banner muncul jika overspend
☐ Summary stats: Hari X | Target Pace | Remaining
☐ Smooth animation saat load
☐ Colors konsisten dark/light mode
```

### CashFlowSparklineChart ✓
```
☐ Sparkline dengan area fill gradient
☐ 3-metric summary visible: Saldo | Perubahan | Volatilitas
☐ Min/Max range di bawah chart
☐ Trend indicator (📈/📉/→) ada
☐ Smooth rendering
☐ Dark/light mode ok
```

### BudgetBulletChart ✓
```
☐ Overall summary bar di atas
☐ 6 category bullets dengan warna:
   - Hijau (<75%)
   - Kuning (75-90%)
   - Merah (>=90%)
☐ Status text ada
☐ Legend di bawah
☐ Sorted by spending %
☐ Dark/light mode ok
```

### MonthlyTrendComboChart ✓
```
☐ Grouped bars (income + expense)
☐ Line overlay (net savings)
☐ 6 bulan data visible
☐ Table breakdown ada
☐ Summary stats ada
☐ Info banner menunjukkan avg
☐ Smooth animation
☐ Dark/light mode ok
```

---

## 🔄 Device Tests

### Screen Sizes
```
☐ iPhone SE (small) - text readable, no cutoff
☐ iPhone 14 (normal) - all visible, good spacing
☐ iPad (large) - scales properly, proportional
```

### Orientations
```
☐ Portrait - chart fit dengan baik
☐ Landscape - chart tetap visible, no overflow
```

### Themes
```
☐ Light mode - terang, text gelap, visible
☐ Dark mode - gelap, text terang, readable
☐ Toggle smooth - no flickering
```

---

## ⚡ Performance Checks

```
Saat scroll/interact:
☐ FPS stable (target 60fps)
☐ No lag atau jank
☐ Smooth animations
☐ Memory stable

Dengan data besar:
☐ 100+ months masih smooth
☐ 500+ transactions ok
☐ No crashes
```

---

## 🎨 Visual Verification Checklist

Print & check:
```
BURN RATE CHART:
☐ 2 garis visible (target dashed, actual solid)
☐ Colors appropriate (grey target, colored actual)
☐ Warning banner shows when overspending
☐ Summary metrics correct

CASH FLOW SPARKLINE:
☐ Sparkline chart rendered dengan area fill
☐ Trend indicator visible
☐ 3 metrics (current, change, volatility) showing
☐ Min/Max info visible
☐ Warning jika balance below minimum

BUDGET BULLET:
☐ Overall progress bar at top
☐ 6 category bars dengan warna sesuai %
☐ Status indicators (Safe/Caution/Over)
☐ Legend explanation ada

MONTHLY TREND:
☐ Grouped bars (2 per month)
☐ Line overlay showing net savings
☐ Table dengan breakdown
☐ Summary stats accurate
☐ Average savings banner visible
```

---

## 🔧 If Issues Found

### Chart not rendering
```
1. Check console for errors
2. Verify mock data is not empty
3. Check date format: YYYY-MM-DD
4. Clear cache: npx expo start -c
```

### Colors wrong
```
1. Verify theme is loaded
2. Check theme.colors being used
3. Toggle dark/light mode
4. Restart app
```

### Performance lag
```
1. Check data size (should be < 60 days)
2. Verify memoization working
3. Use React DevTools Profiler
4. Check FPS with Expo DevTools
```

### Text overlap/cutoff
```
1. Test different screen sizes
2. Check font size (min 12pt)
3. Verify padding/margins
4. Test landscape/portrait
```

---

## 📱 Testing on Real Device

### iOS (via Xcode)
```bash
npx expo run:ios
# Scan QR or open in simulator
```

### Android (via Android Studio)
```bash
npx expo run:android
# Opens on emulator
```

### Expo Go App
```bash
npx expo start
# Scan QR code dengan Expo Go app
```

---

## ✅ Checklist Completion

When all checks pass:
```
✅ Visual verification done
✅ Theme tested (dark/light)
✅ Responsive tested (sizes/orientations)
✅ Performance verified (60fps, smooth)
✅ Interaction tested (tap, scroll)
✅ Empty states tested
✅ Error handling verified
✅ Accessibility checked

→ Ready for code review! 🎉
```

---

## 📚 Documentation Reference

- **Quick Reference:** docs/CHARTS_QUICK_REFERENCE.md
- **Implementation:** docs/FINANCIAL_CHARTS_IMPLEMENTATION_SUMMARY.md
- **Integration Guide:** docs/FINANCIAL_CHARTS_INTEGRATION_GUIDE.md
- **Deployment:** docs/DEPLOYMENT_CHECKLIST.md

---

## 🎯 Testing Timeline

```
Total time: ~30-45 minutes

Visual Check:         5-10 min
Theme Testing:        5 min
Responsive Testing:   5-10 min
Performance Check:    5 min
Interaction Testing:  5 min
Edge Cases:           5 min
Documentation:        2 min

TOTAL:               ~30-45 min
```

---

## 🚀 After Testing

When complete:
1. ✅ All visual checks passed
2. ✅ No performance issues
3. ✅ All themes working
4. ✅ Responsive on all sizes

→ Ready for production deployment! 🎉

---

**Test Screen Location:** `src/app/test-charts.tsx`  
**Last Updated:** September 11, 2026, 13:50 UTC
