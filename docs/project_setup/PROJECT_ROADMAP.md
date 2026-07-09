# TalentgraphV2 Project Roadmap

## 📋 Project Status Board

### 🔥 Fix Now (Priority 1)
- [ ] **Schedule interview CORS** - Fix CORS configuration for interview scheduling endpoint
- [ ] **SMTP/Email sending** - Configure Gmail app password and test email delivery
- [ ] **Message bubble ownership** - Fix message rendering to show correct sender
- [ ] **Status save persistence** - Ensure recruiter notes and status changes persist correctly

### 🎯 Core Workflow (Priority 2)
- [ ] **Recruiter notes** - Ensure notes save and display properly
- [ ] **Scheduled status** - Status updates to "Scheduled" after interview scheduling
- [ ] **Reopen notifications** - Notify prior applicants when job is reposted
- [ ] **Lifecycle transitions** - Complete freeze → repost → reactivate → cancel flow

### 🎨 UI Polish (Priority 3)
- [ ] **Candidate dashboard cleanup** - Consistent card styles, remove playful graphics
- [ ] **Recruiter applications panel** - Professional design with clear hierarchy
- [ ] **Job posting builder** - Consistent form design and validation
- [ ] **Available jobs filter** - Toolbar consistency across views
- [ ] **Mutual matches cleanup** - Professional card design

### 🚀 Future Enhancements
- [ ] Attachments in messaging
- [ ] Calendar sync integration
- [ ] Payment/subscription system
- [ ] Analytics dashboard
- [ ] Automation workers
- [ ] Video provider integration

---

## 🔄 Complete Core Recruiter Workflow

This is the primary business flow that must work flawlessly:

1. ✅ Recruiter creates job
2. ✅ Recruiter browses candidates
3. ✅ Recruiter likes / asks to apply
4. ✅ Candidate applies
5. 🔧 Recruiter updates application status
6. 🔧 Recruiter schedules interview
7. 🔧 Recruiter saves notes
8. ✅ Candidate gets notification/email

**Current Status**: Steps 5-7 need stabilization

---

## 📝 Feature Development Checklist

Use this pattern for every new feature:

- [ ] **Step A**: Backend model (SQLAlchemy)
- [ ] **Step B**: Schema (Pydantic)
- [ ] **Step C**: API route (FastAPI)
- [ ] **Step D**: Frontend API client
- [ ] **Step E**: UI component (React)
- [ ] **Step F**: Validation (frontend + backend)
- [ ] **Step G**: Notification/update flow
- [ ] **Step H**: Test with real data

---

## 🎯 Immediate Action Items

### 1. Schedule Interview Flow (End-to-End Fix)
**Goal**: Working interview scheduling with email confirmation

- [ ] Fix CORS configuration in backend
- [ ] Verify SMTP environment variables
- [ ] Test valid payload structure
- [ ] Add recruiter UI success/error handling
- [ ] Ensure status becomes "Scheduled"
- [ ] Verify recruiter notes are saved
- [ ] Test email delivery to candidate

### 2. UI Consistency
**Goal**: Professional, consistent design system

Design System Rules:
- Same card styles across all views
- Same button hierarchy (primary/secondary/ghost)
- Same typography scale
- Same filter bar style
- Remove playful graphics/emojis/arrows
- Professional color palette

### 3. Job Lifecycle Workflow
**Goal**: Complete job state management

States to implement:
- Active → Frozen (paused, no new applications)
- Frozen → Reposted (new job ID, notify prior applicants)
- Active → Cancelled (soft delete, preserve applications)
- Cancelled → Reactivated (notify prior applicants)

---

## 🛑 Development Rules

### DO
✅ Fix one blocking issue completely before starting the next
✅ Test end-to-end workflow after each fix
✅ Follow the 8-step checklist for new features
✅ Keep UI consistent with design system
✅ Preserve data (applications, notes) during lifecycle changes

### DON'T
❌ Start multiple major features simultaneously
❌ Skip testing with real data
❌ Ignore CORS/security issues
❌ Mix design styles across dashboards
❌ Delete application data during job lifecycle changes

---

## 📊 Current Architecture Overview

### Backend (FastAPI)
- `/backend2/routers/` - API endpoints
- `/backend2/models/` - SQLAlchemy models
- `/backend2/schemas/` - Pydantic schemas
- `/backend2/utils/` - Helper functions

### Frontend (React)
- `/frontend2/src/components/` - React components
- `/frontend2/src/services/` - API client services
- `/frontend2/src/pages/` - Page components

### Key Areas Needing Attention
1. **Interview Scheduling**: CORS, SMTP, status updates
2. **Messaging**: Message ownership display
3. **Status Management**: Persistence of recruiter actions
4. **Job Lifecycle**: Freeze, repost, cancel, reactivate

---

## 🎯 Success Metrics

### Phase 1: Stabilization (Current)
- [ ] All Priority 1 issues resolved
- [ ] Core recruiter workflow works end-to-end
- [ ] Zero CORS/SMTP errors in production
- [ ] UI consistent across candidate/recruiter views

### Phase 2: Feature Complete
- [ ] Interview scheduling with calendar sync
- [ ] Messaging with attachments
- [ ] Analytics dashboard live
- [ ] Payment system integrated

### Phase 3: Scale & Optimize
- [ ] Automation workers running
- [ ] Performance optimized (< 2s page loads)
- [ ] 99.9% uptime
- [ ] User feedback incorporated

---

## 📅 Timeline Estimate

**Week 1-2**: Fix Priority 1 issues + Core workflow testing
**Week 3-4**: UI polish + Job lifecycle completion
**Week 5+**: Add features one at a time following checklist

---

*Last Updated: April 1, 2026*
