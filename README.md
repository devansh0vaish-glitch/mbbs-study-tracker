# MBBS Study Tracker V7

Static GitHub Pages app. Keep these four files together in the repository root:
- index.html
- app.js
- style.css
- syllabus.js

The syllabus file is independent of progress storage. This version uses a fresh localStorage key (`MBBS_STUDY_TRACKER_V7`) so old broken state is not reused.

V26 change: account display names are stored under Supabase Auth user metadata as `display_name`. Existing `username` metadata is supported as a fallback for older accounts.
