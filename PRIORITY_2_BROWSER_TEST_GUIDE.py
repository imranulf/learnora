"""
Priority 2: Rating System - Manual Testing Guide
================================================

This guide walks through testing the Priority 2 Rating System implementation
in the browser. Follow each step and check off completed items.
"""

print("""
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║           Priority 2: Rating System - Browser Testing Guide               ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

PREREQUISITES:
━━━━━━━━━━━━
✅ Backend server running on http://localhost:8000
✅ Frontend dev server running on http://localhost:5174
✅ User logged in to the application
✅ Database initialized and migrated


STEP 1: Navigate to Content Discovery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Open browser and go to: http://localhost:5174
[ ] Log in if not already logged in
[ ] Navigate to "Content Discovery" page
[ ] Search for content (e.g., "Python tutorial")
[ ] Verify content cards display


STEP 2: Visual Inspection - Rating Component
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Each content card shows 5 empty stars at the bottom
[ ] Stars are positioned in the card footer
[ ] Stars have consistent size and spacing
[ ] Stars are in the "warning" color (orange/yellow)


STEP 3: Interaction - Hover Behavior
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Hover over stars - they should highlight in lighter color
[ ] Hovering highlights all stars up to hover position
[ ] Tooltip appears: "Rate this content"
[ ] Moving mouse out returns stars to original state


STEP 4: Rating Submission - Single Star
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Click on the 1st star (1-star rating)
[ ] Star fills with color immediately
[ ] Snackbar appears at bottom-center: "Rating saved successfully!"
[ ] Snackbar auto-hides after 2 seconds
[ ] No errors in browser console (F12 → Console tab)


STEP 5: Rating Submission - Multiple Stars
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Click on the 5th star on another content item (5-star rating)
[ ] All 5 stars fill with color
[ ] Success Snackbar appears again
[ ] Rating visually persists in UI


STEP 6: API Request Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Open DevTools (F12) → Network tab
[ ] Clear network log
[ ] Rate another content item (3 stars)
[ ] Look for POST request to: /api/v1/preferences/interactions
[ ] Click on the request to inspect

   Request should include:
   [ ] content_id: (number)
   [ ] interaction_type: "rated"
   [ ] rating: 3
   [ ] completion_percentage: 0
   [ ] time_spent: 0

   Response should be:
   [ ] Status: 200 OK
   [ ] Response body contains interaction ID


STEP 7: Multiple Ratings
━━━━━━━━━━━━━━━━━━━━━━
[ ] Rate 5 different content items with different ratings:
    [ ] Item 1: 5 stars
    [ ] Item 2: 4 stars
    [ ] Item 3: 3 stars
    [ ] Item 4: 2 stars
    [ ] Item 5: 1 star
[ ] Each shows success Snackbar
[ ] All Network requests succeed (200 OK)
[ ] No console errors


STEP 8: Rating Persistence (Optional - May Not Be Implemented Yet)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Refresh the page (F5)
[ ] Navigate back to Content Discovery
[ ] Check if previously rated items still show selected stars
   Note: This may require localStorage implementation


STEP 9: Edge Cases
━━━━━━━━━━━━━━━━━
[ ] Click on same star twice (try to unrate)
    - Does it clear the rating or stay?
[ ] Click rapidly on different stars
    - Does UI handle rapid clicks gracefully?
[ ] Rate content while offline (disable network in DevTools)
    - Does it show error message?


STEP 10: Preference Evolution Validation (Advanced)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This tests if high ratings affect future content recommendations:

[ ] Rate 3 "video" content items with 5 stars each
[ ] Rate 3 "article" content items with 2 stars each
[ ] Wait 30 seconds for preference evolution to process
[ ] Clear search and search again for general topic
[ ] Check if video content ranks higher in results
[ ] Check backend logs for preference evolution trigger


STEP 11: Console Error Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Open Console tab (F12 → Console)
[ ] Verify NO errors related to:
    - Rating component
    - trackInteraction function
    - State management
    - API calls
[ ] Warnings are acceptable, but no red errors


STEP 12: Database Verification (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If you have database access:

[ ] Open database file or connect to database
[ ] Query: SELECT * FROM content_interaction WHERE interaction_type = 'rated'
[ ] Verify ratings are saved correctly
[ ] Check timestamp fields are populated
[ ] Verify user_id matches logged-in user


STEP 13: Preference Service Check (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Rate content with format "video" and rating 5
[ ] Check backend logs for preference evolution
[ ] Look for log: "High rating (≥4) detected, boosting preference weight"
[ ] Query preferences table to see if "video" weight increased


RESULTS SUMMARY:
━━━━━━━━━━━━━━━
Total Steps: 13
Completed: _____ / 13
Success Rate: _____% 

Critical Tests (Must Pass):
- [ ] Step 4: Single star rating works
- [ ] Step 5: Multiple star rating works
- [ ] Step 6: API request succeeds
- [ ] Step 7: Multiple ratings all succeed
- [ ] Step 11: No console errors

Optional Tests:
- [ ] Step 8: Rating persistence
- [ ] Step 10: Preference evolution
- [ ] Step 12: Database verification
- [ ] Step 13: Preference service check


TROUBLESHOOTING:
━━━━━━━━━━━━━━━━

Issue: Stars don't appear
→ Check: ContentCard.tsx has Rating component import
→ Check: Material-UI @mui/material installed
→ Check: Browser console for import errors

Issue: Rating doesn't save
→ Check: Backend server is running
→ Check: User is logged in (session.access_token exists)
→ Check: Network tab shows 401 Unauthorized → login issue
→ Check: Network tab shows 500 Error → backend issue

Issue: No success Snackbar
→ Check: showRatingSuccess state variable exists
→ Check: setShowRatingSuccess(true) is called after API success
→ Check: Snackbar component is rendered in ContentCard

Issue: Console errors
→ Check: Error message for specific issue
→ Check: trackInteraction function exists in preferences service
→ Check: API URL is correct: /api/v1/preferences/interactions


QUICK VERIFICATION (30 seconds):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If you just want to quickly verify Priority 2 is working:

1. Open http://localhost:5174/content-discovery
2. Search for any content
3. Click 5 stars on first result
4. See "Rating saved successfully!" message
5. Check Network tab: POST to /preferences/interactions with 200 OK

If all above work → ✅ Priority 2 is WORKING!


EXPECTED OUTCOME:
━━━━━━━━━━━━━━━━━
✅ All critical tests pass (Steps 4, 5, 6, 7, 11)
✅ Users can rate content easily
✅ Ratings save to backend successfully
✅ Success feedback is clear and immediate
✅ No errors or crashes
✅ Preference evolution happens in background
✅ System feels responsive and polished


REPORT ISSUES:
━━━━━━━━━━━━━━
If any test fails, note:
- Which step failed
- Error message (if any)
- Browser console output
- Network request details (status code, response)
- Expected vs actual behavior


NEXT STEPS AFTER TESTING:
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ If all tests pass → Priority 2 is production-ready!
⚠️  If some tests fail → Review error logs and fix issues
📊 Collect metrics → Track rating submission success rate
🔄 Iterate → Improve based on user feedback


Happy Testing! 🎯
""")
