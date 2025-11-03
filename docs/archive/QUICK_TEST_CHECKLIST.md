# Learnora - Quick Testing Checklist
**Version:** 1.0.0 | **Date:** November 2, 2025

---

## ⚡ 10-Minute Quick Test

### **1. Start Servers (2 min)**
```powershell
# Terminal 1 - Backend
cd core-service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend  
cd learner-web-app
npm run dev
```

### **2. Authentication (1 min)**
- [ ] Open http://localhost:5173/
- [ ] Sign in with test account
- [ ] Redirects to home dashboard
- [ ] No errors in console

### **3. Feature Tour (5 min)**
Visit each page and verify MUI styling:

- [ ] 🏠 **Home** - Stats cards display with gradients
- [ ] 📊 **Assessment** - Dialog opens with MUI components
- [ ] 🗺️ **Learning Path** - Graph renders, dropdown works
- [ ] 🔍 **Knowledge Graph** - vis-network displays
- [ ] 📚 **Content Discovery** - Search interface loads
- [ ] 🧠 **User Knowledge** - Charts/table display
- [ ] ⚙️ **Concept Management** - Table loads

### **4. Dark Mode (1 min)**
- [ ] Toggle dark mode icon (top right)
- [ ] All pages switch themes instantly
- [ ] No contrast issues

### **5. Basic Operations (1 min)**
- [ ] Create something (concept/search)
- [ ] Edit something
- [ ] Delete something
- [ ] All operations complete successfully

---

## ✅ Pass Criteria

**All checks must be ✅:**
- [ ] 0 TypeScript errors in console
- [ ] 0 Network errors (401/403/500)
- [ ] All pages use MUI (no Tailwind visible)
- [ ] Dark mode works everywhere
- [ ] All buttons/inputs functional
- [ ] Navigation smooth

**If ALL pass → 🎉 PRODUCTION READY!**

---

## 🧪 Critical Features Test (30 min)

### **Authentication ✅**
- [ ] Sign in/out works
- [ ] Token persists on refresh
- [ ] Protected routes redirect

### **Home Dashboard ✅**
- [ ] 4 stat cards display real data
- [ ] Quick actions navigate correctly
- [ ] Recent activity shows (if any)

### **Content Discovery ✅**
- [ ] Search returns results
- [ ] Filters work (type, difficulty)
- [ ] Strategy toggle works (BM25/Dense/Hybrid)

### **User Knowledge ✅**
- [ ] Summary cards accurate
- [ ] Pie/Bar charts render
- [ ] Filters apply (mastery, sort)
- [ ] Edit modal saves changes
- [ ] Sync button works

### **Learning Path ✅**
- [ ] Dropdown lists paths
- [ ] Graph renders with nodes/edges
- [ ] Node click opens detail panel
- [ ] Layout toggle works

### **Assessment (CAT) ✅**
- [ ] Wizard opens (3 steps)
- [ ] Skill domain input required
- [ ] Questions display with options
- [ ] Answer submission works
- [ ] Completion shows dashboard

### **Knowledge Graph ✅**
- [ ] Graph interactive (zoom, pan, drag)
- [ ] Node selection works
- [ ] Categories filter (if available)

### **Concept Management ✅**
- [ ] List displays concepts
- [ ] Add creates new concept
- [ ] Edit updates concept
- [ ] Delete removes concept

---

## 🎨 MUI Verification

**Check on Every Page:**
- [ ] No `className="..."` with Tailwind
- [ ] All components are MUI
- [ ] Theme colors used (not hardcoded)
- [ ] Responsive breakpoints work
- [ ] Animations smooth

**Theme Colors to Verify:**
```typescript
✅ text.primary       // Main text
✅ text.secondary     // Labels
✅ background.default // Page bg
✅ background.paper   // Cards
✅ primary.main       // Brand color
✅ action.hover       // Hover states
```

---

## 🔌 API Health Check

**Verify These Endpoints:**
```bash
# Health check
curl http://localhost:8000/health

# Dashboard (need auth token)
curl http://localhost:8000/api/v1/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Token:**
```javascript
// Browser console
localStorage.getItem('auth_token')
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Backend won't start | Check port 8000, kill process if needed |
| Frontend won't start | `npm install` then `npm run dev` |
| 401 errors | Clear localStorage, sign in again |
| CORS errors | Check backend CORS_ORIGINS setting |
| Dark mode broken | Check for hardcoded colors |
| Charts not rendering | Check Recharts import |
| Graph not showing | Check vis-network import |

---

## 📊 Test Results

**Date:** _______________  
**Tester:** _______________

| Feature | Status | Issues |
|---------|--------|--------|
| Auth | ⬜ | |
| Home | ⬜ | |
| Content Discovery | ⬜ | |
| User Knowledge | ⬜ | |
| Learning Path | ⬜ | |
| Assessment | ⬜ | |
| Knowledge Graph | ⬜ | |
| Concepts | ⬜ | |

**Overall:** ⬜ PASS / ⬜ FAIL

**Notes:**
```




```

---

## 🎯 Success!

**If all features pass:**
- ✅ Platform is 100% complete
- ✅ MUI migration successful  
- ✅ API alignment perfect
- ✅ Production ready!

**🎉 Congratulations! 🎉**

---

**See TESTING_GUIDE.md for detailed step-by-step instructions.**
