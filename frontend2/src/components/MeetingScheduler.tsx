import { useState } from "react";
import { apiClient } from '../api/client';

// ─── Config ──────────────────────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  teams: {
    name: "Microsoft Teams",
    icon: (<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M19.5 8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="#5059C9"/><path d="M13 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="#7B83EB"/><path d="M21.5 10h-4a1.5 1.5 0 0 0-1.5 1.5v5a4 4 0 0 0 7 2.646V11.5A1.5 1.5 0 0 0 21.5 10z" fill="#5059C9"/><path d="M13.5 10H5a2 2 0 0 0-2 2v6a5 5 0 0 0 10 0v-6a2 2 0 0 0-2-2z" fill="#7B83EB"/></svg>),
    color: "#5059C9", accent: "#7B83EB",
    gradient: "linear-gradient(135deg, #5059C9, #7B83EB)",
  },
  zoom: {
    name: "Zoom",
    icon: (<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect width="24" height="24" rx="4" fill="#2D8CFF"/><path d="M4 8.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z" fill="white"/><path d="M15 10.5l4-2.5v8l-4-2.5v-3z" fill="white"/></svg>),
    color: "#2D8CFF", accent: "#0E71EB",
    gradient: "linear-gradient(135deg, #2D8CFF, #0E71EB)",
  },
};

const DURATIONS = [15, 30, 45, 60, 90];
const TIME_SLOTS = ["09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","01:00 PM","01:30 PM","02:00 PM","02:30 PM","03:00 PM","03:30 PM","04:00 PM","04:30 PM","05:00 PM"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect, bookedDates = [] }: { selectedDate: Date | null; onSelect: (date: Date) => void; bookedDates?: Date[] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };
  const isToday = (d: number) => d===today.getDate()&&viewMonth===today.getMonth()&&viewYear===today.getFullYear();
  const isPast = (d: number) => new Date(viewYear,viewMonth,d) < new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const isSelected = (d: number) => selectedDate&&selectedDate.getDate()===d&&selectedDate.getMonth()===viewMonth&&selectedDate.getFullYear()===viewYear;
  const isBooked = (d: number) => bookedDates.some(bd=>bd.getDate()===d&&bd.getMonth()===viewMonth&&bd.getFullYear()===viewYear);
  const isWeekend = (d: number) => { const day=new Date(viewYear,viewMonth,d).getDay(); return day===0||day===6; };

  const cells: (number | null)[] = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  return (
    <div style={{width:"100%"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button onClick={prevMonth} style={{width:28,height:28,borderRadius:8,border:"1px solid #e2e8f0",background:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{fontWeight:700,fontSize:14,color:"#1e1b4b"}}>{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{width:28,height:28,borderRadius:8,border:"1px solid #e2e8f0",background:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"#94a3b8",padding:"2px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={`e-${i}`}/>;
          const past=isPast(d),weekend=isWeekend(d),sel=isSelected(d),tod=isToday(d),booked=isBooked(d),disabled=past||weekend;
          return (
            <button key={d} disabled={disabled} onClick={()=>!disabled&&onSelect(new Date(viewYear,viewMonth,d))}
              style={{position:"relative",width:"100%",aspectRatio:"1",border:"none",borderRadius:7,cursor:disabled?"not-allowed":"pointer",fontSize:12,fontWeight:sel?700:tod?600:400,
                background:sel?"linear-gradient(135deg,#6d28d9,#8b5cf6)":tod&&!sel?"rgba(109,40,217,0.1)":"transparent",
                color:sel?"white":disabled?"#cbd5e1":tod?"#6d28d9":"#1e293b",transition:"all 0.15s",outline:"none",
                boxShadow:sel?"0 3px 10px rgba(109,40,217,0.35)":"none"}}>
              {d}
              {booked&&!sel&&<span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:3,height:3,borderRadius:"50%",background:"#f59e0b",display:"block"}}/>}
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",gap:12,marginTop:10,paddingTop:10,borderTop:"1px solid #f1f5f9"}}>
        {[{c:"linear-gradient(135deg,#6d28d9,#8b5cf6)",l:"Selected"},{c:"#f59e0b",l:"Has meetings"},{c:"#cbd5e1",l:"Unavailable"}].map(({c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#64748b"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:c,display:"inline-block",flexShrink:0}}/>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Scheduler ────────────────────────────────────────────────────────────
interface Meeting {
  id: number;
  candidateName: string;
  platform: string;
  date: string;
  time: string;
  duration: number;
}

interface MeetingSchedulerProps {
  candidateName: string;
  candidateEmail?: string;  // Optional: if provided, sends confirmation emails
  onClose: () => void;
}

export default function MeetingScheduler({ candidateName, candidateEmail, onClose }: MeetingSchedulerProps) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<keyof typeof PLATFORM_CONFIG | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState(`Interview with ${candidateName}`);
  const [agenda, setAgenda] = useState("");
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([
    {id:1,candidateName:"Alex Rivera",platform:"zoom",date:"Mar 12, 2026",time:"10:00 AM",duration:45},
    {id:2,candidateName:"Priya Patel",platform:"teams",date:"Mar 14, 2026",time:"2:30 PM",duration:30},
  ]);
  const [activeTab, setActiveTab] = useState<"schedule" | "upcoming">("schedule");
  const [animKey, setAnimKey] = useState(0);

  const cfg = platform ? PLATFORM_CONFIG[platform] : null;
  const bookedDates = meetings.map(m => { 
    const [mo,d,y]=m.date.split(" "); 
    const monthIdx = MONTHS.findIndex(mn=>mn.startsWith(mo));
    return new Date(parseInt(y), monthIdx, parseInt(d)); 
  });

  const goNext = () => { setAnimKey(k=>k+1); setStep(s=>s+1); };
  const goBack = () => { setAnimKey(k=>k+1); setStep(s=>s-1); };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !platform || sending) return;
    
    const formattedDate = selectedDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    const newMeeting = {
      id: Date.now(),
      candidateName,
      platform,
      date: formattedDate,
      time: selectedTime,
      duration
    };
    
    // Add to local state immediately for UI feedback
    setMeetings(prev=>[newMeeting,...prev]);
    
    // Call API to send confirmation emails if email is provided
    if (candidateEmail) {
      setSending(true);
      try {
        await apiClient.scheduleMeeting({
          candidate_email: candidateEmail,
          candidate_name: candidateName,
          platform,
          date: formattedDate,
          time: selectedTime,
          duration,
          topic,
          agenda
        });
        console.log('✅ Meeting scheduled and confirmation emails sent');
      } catch (error: any) {
        console.error('❌ Failed to send confirmation emails:', error);
        // Continue with success animation even if email fails
      } finally {
        setSending(false);
      }
    } else {
      console.log('ℹ️ Meeting scheduled locally (no email provided)');
    }
    
    // Show success animation and reset
    setSuccess(true);
    setTimeout(()=>{ 
      setSuccess(false); 
      setStep(1); 
      setPlatform(null); 
      setSelectedDate(null); 
      setSelectedTime(null); 
      setAgenda("");
      setActiveTab("upcoming"); 
    }, 2200);
  };

  const stepLabels = ["Platform","Schedule","Confirm"];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,12,41,0.7)",backdropFilter:"blur(10px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes fadeStep{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        .sched-modal{animation:slideUp 0.3s cubic-bezier(.16,1,.3,1)}
        .step-body{animation:fadeStep 0.25s ease}
        .slot-btn:hover{background:rgba(109,40,217,0.08)!important;border-color:#8b5cf6!important;color:#6d28d9!important}
        .pcard:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,0.13)!important}
        .dur-btn:hover{opacity:0.85}
        .join-btn:hover{opacity:0.85;transform:scale(1.02)}
      `}</style>
      <div className="sched-modal" style={{background:"#f8fafc",borderRadius:22,width:"100%",maxWidth:760,maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:"0 40px 100px rgba(0,0,0,0.3)"}}>

        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#4c1d95 0%,#6d28d9 55%,#7c3aed 100%)",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <div style={{color:"white",fontWeight:800,fontSize:17}}>Meeting Scheduler</div>
              <div style={{color:"rgba(255,255,255,0.65)",fontSize:12}}>{activeTab==="upcoming"?`${meetings.length} upcoming meetings`:`Scheduling with ${candidateName}`}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",background:"rgba(255,255,255,0.14)",borderRadius:11,padding:3,gap:2}}>
              {[{id:"schedule" as const,label:"📅 Schedule"},{id:"upcoming" as const,label:`🗓 Upcoming (${meetings.length})`}].map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"6px 13px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:activeTab===t.id?"white":"transparent",color:activeTab===t.id?"#6d28d9":"rgba(255,255,255,0.85)",transition:"all 0.2s",fontFamily:"inherit"}}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"22px 24px"}}>

          {/* SUCCESS */}
          {success && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"52px 20px",animation:"pop 0.5s ease"}}>
              <div style={{width:76,height:76,borderRadius:"50%",background:"linear-gradient(135deg,#059669,#10b981)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:"0 8px 28px rgba(16,185,129,0.45)"}}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 style={{fontWeight:800,fontSize:22,color:"#1e293b",margin:"0 0 8px",textAlign:"center"}}>Meeting Scheduled! 🎉</h3>
              <p style={{color:"#64748b",fontSize:13,margin:0,textAlign:"center",maxWidth:340}}>
                A {cfg?.name} invite is being sent to <strong>{candidateName}</strong> for {selectedDate?.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} at {selectedTime}.
              </p>
            </div>
          )}

          {/* UPCOMING */}
          {!success && activeTab==="upcoming" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}}>Upcoming Meetings</div>
              {meetings.length===0 ? (
                <div style={{textAlign:"center",padding:"48px 20px",color:"#cbd5e1"}}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{marginBottom:10,display:"block",margin:"0 auto 10px"}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <p style={{fontSize:13,margin:0}}>No meetings scheduled yet</p>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {meetings.map(m=>{
                    const mc=PLATFORM_CONFIG[m.platform as keyof typeof PLATFORM_CONFIG];
                    return (
                      <div key={m.id} style={{background:"white",borderRadius:14,padding:"14px 16px",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                        <div style={{width:42,height:42,borderRadius:11,background:mc.gradient,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 12px ${mc.color}30`}}>
                          {mc.icon}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:"#1e293b"}}>{m.candidateName}</div>
                          <div style={{fontSize:12,color:"#64748b",marginTop:3,display:"flex",gap:10}}>
                            <span>📅 {m.date}</span><span>🕐 {m.time}</span><span>⏱ {m.duration}min</span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:7,flexShrink:0}}>
                          <button className="join-btn" style={{padding:"7px 14px",borderRadius:9,background:mc.gradient,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}>
                            Join
                          </button>
                          <button onClick={()=>setMeetings(p=>p.filter(x=>x.id!==m.id))} style={{padding:"7px 10px",borderRadius:9,background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE FLOW */}
          {!success && activeTab==="schedule" && (
            <div>
              {/* Step indicator */}
              <div style={{display:"flex",alignItems:"center",marginBottom:22}}>
                {stepLabels.map((label,idx)=>{
                  const sn=idx+1,done=step>sn,active=step===sn;
                  return (
                    <div key={label} style={{display:"flex",alignItems:"center",flex:idx<stepLabels.length-1?1:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:done?"linear-gradient(135deg,#059669,#10b981)":active?"linear-gradient(135deg,#6d28d9,#8b5cf6)":"#e2e8f0",color:done||active?"white":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,boxShadow:active?"0 4px 12px rgba(109,40,217,0.3)":"none",transition:"all 0.3s"}}>
                          {done?"✓":sn}
                        </div>
                        <span style={{fontSize:12,fontWeight:done||active?600:400,color:done||active?"#1e293b":"#94a3b8",whiteSpace:"nowrap"}}>{label}</span>
                      </div>
                      {idx<stepLabels.length-1&&<div style={{flex:1,height:2,background:done?"linear-gradient(90deg,#10b981,#6d28d9)":"#e2e8f0",margin:"0 10px",borderRadius:2,transition:"all 0.5s"}}/>}
                    </div>
                  );
                })}
              </div>

              <div key={animKey} className="step-body">

                {/* STEP 1: Platform */}
                {step===1 && (
                  <div>
                    <h3 style={{fontWeight:700,fontSize:15,color:"#1e293b",margin:"0 0 4px"}}>Choose your meeting platform</h3>
                    <p style={{color:"#64748b",fontSize:12,margin:"0 0 18px"}}>Select where you'd like to host the interview with {candidateName}</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
                      {Object.entries(PLATFORM_CONFIG).map(([key,c])=>(
                        <button key={key} className="pcard" onClick={()=>setPlatform(key as keyof typeof PLATFORM_CONFIG)}
                          style={{border:platform===key?`2px solid ${c.color}`:"2px solid #e2e8f0",borderRadius:16,padding:22,background:platform===key?`${c.color}0a`:"white",cursor:"pointer",textAlign:"left",transition:"all 0.2s ease",boxShadow:platform===key?`0 8px 24px ${c.color}22`:"0 1px 4px rgba(0,0,0,0.04)",position:"relative",fontFamily:"inherit"}}>
                          {platform===key&&<div style={{position:"absolute",top:11,right:11,width:20,height:20,borderRadius:"50%",background:c.gradient,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                          <div style={{width:50,height:50,borderRadius:13,background:c.gradient,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,boxShadow:`0 6px 16px ${c.color}30`}}>{c.icon}</div>
                          <div style={{fontWeight:700,fontSize:14,color:"#1e293b",marginBottom:3}}>{c.name}</div>
                          <div style={{fontSize:11,color:"#64748b"}}>{key==="teams"?"Best for enterprise & Office 365":"Most popular video conferencing"}</div>
                        </button>
                      ))}
                    </div>
                    <div style={{marginBottom:18}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:9}}>Meeting Duration</div>
                      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                        {DURATIONS.map(d=>(
                          <button key={d} className="dur-btn" onClick={()=>setDuration(d)}
                            style={{padding:"8px 16px",borderRadius:9,border:duration===d?"2px solid #8b5cf6":"2px solid #e2e8f0",background:duration===d?"linear-gradient(135deg,#6d28d9,#8b5cf6)":"white",color:duration===d?"white":"#374151",fontWeight:duration===d?700:500,fontSize:12,cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}>
                            {d} min
                          </button>
                        ))}
                      </div>
                    </div>
                    <button disabled={!platform} onClick={goNext}
                      style={{width:"100%",padding:13,borderRadius:12,border:"none",background:platform?"linear-gradient(135deg,#6d28d9,#8b5cf6)":"#e2e8f0",color:platform?"white":"#94a3b8",fontWeight:700,fontSize:13,cursor:platform?"pointer":"not-allowed",fontFamily:"inherit",boxShadow:platform?"0 8px 20px rgba(109,40,217,0.3)":"none",transition:"all 0.2s"}}>
                      Continue to Schedule →
                    </button>
                  </div>
                )}

                {/* STEP 2: Calendar + Time */}
                {step===2 && (
                  <div>
                    <h3 style={{fontWeight:700,fontSize:15,color:"#1e293b",margin:"0 0 4px"}}>Pick a date & time</h3>
                    <p style={{color:"#64748b",fontSize:12,margin:"0 0 18px"}}>Select an available slot for your {cfg?.name} call</p>
                    <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:16,alignItems:"start"}}>
                      <div style={{background:"white",borderRadius:14,padding:18,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                        <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} bookedDates={bookedDates}/>
                      </div>
                      <div style={{background:"white",borderRadius:14,padding:18,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:11}}>
                          {selectedDate?selectedDate.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}):"Select a date first"}
                        </div>
                        {!selectedDate?(
                          <div style={{textAlign:"center",padding:"28px 10px",color:"#cbd5e1"}}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{display:"block",margin:"0 auto 8px"}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <p style={{fontSize:11,margin:0}}>Choose a date to see available time slots</p>
                          </div>
                        ):(
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,maxHeight:240,overflowY:"auto"}}>
                            {TIME_SLOTS.map(t=>(
                              <button key={t} className="slot-btn" onClick={()=>setSelectedTime(t)}
                                style={{padding:"8px 4px",borderRadius:8,border:selectedTime===t?"2px solid #8b5cf6":"2px solid #e2e8f0",background:selectedTime===t?"linear-gradient(135deg,#6d28d9,#8b5cf6)":"white",color:selectedTime===t?"white":"#374151",fontSize:11,fontWeight:selectedTime===t?700:500,cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}>
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:9,marginTop:16}}>
                      <button onClick={goBack} style={{flex:1,padding:13,borderRadius:12,border:"2px solid #e2e8f0",background:"white",color:"#64748b",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                      <button disabled={!selectedDate||!selectedTime} onClick={goNext}
                        style={{flex:2,padding:13,borderRadius:12,border:"none",background:selectedDate&&selectedTime?"linear-gradient(135deg,#6d28d9,#8b5cf6)":"#e2e8f0",color:selectedDate&&selectedTime?"white":"#94a3b8",fontWeight:700,fontSize:13,cursor:selectedDate&&selectedTime?"pointer":"not-allowed",fontFamily:"inherit",boxShadow:selectedDate&&selectedTime?"0 8px 20px rgba(109,40,217,0.3)":"none"}}>
                        Review Details →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Confirm */}
                {step===3 && (
                  <div>
                    <h3 style={{fontWeight:700,fontSize:15,color:"#1e293b",margin:"0 0 4px"}}>Confirm your meeting</h3>
                    <p style={{color:"#64748b",fontSize:12,margin:"0 0 16px"}}>Review details before sending the invite</p>
                    <div style={{background:"white",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",marginBottom:14}}>
                      <div style={{background:cfg?.gradient,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>{cfg?.icon}</div>
                        <div>
                          <div style={{color:"white",fontWeight:700,fontSize:14}}>{cfg?.name} Meeting</div>
                          <div style={{color:"rgba(255,255,255,0.72)",fontSize:11}}>A join link will be sent to both parties</div>
                        </div>
                      </div>
                      <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
                        {[
                          {icon:"👤",label:"Candidate",value:candidateName},
                          {icon:"📅",label:"Date",value:selectedDate?.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})},
                          {icon:"🕐",label:"Time",value:selectedTime},
                          {icon:"⏱",label:"Duration",value:`${duration} minutes`},
                        ].map(row=>(
                          <div key={row.label} style={{display:"flex",alignItems:"center",gap:11}}>
                            <span style={{width:30,height:30,borderRadius:8,background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{row.icon}</span>
                            <div>
                              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{row.label}</div>
                              <div style={{fontSize:13,color:"#1e293b",fontWeight:600}}>{row.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{marginBottom:14}}>
                      <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:7}}>Meeting Topic</label>
                      <input value={topic} onChange={e=>setTopic(e.target.value)}
                        style={{width:"100%",padding:"11px 13px",borderRadius:11,border:"2px solid #e2e8f0",fontSize:13,color:"#1e293b",background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.2s"}}
                        onFocus={e=>e.currentTarget.style.borderColor="#8b5cf6"} onBlur={e=>e.currentTarget.style.borderColor="#e2e8f0"}/>
                    </div>
                    <div style={{marginBottom:14}}>
                      <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:7}}>
                        Agenda <span style={{color:"#94a3b8",fontWeight:400}}>(Optional)</span>
                      </label>
                      <textarea value={agenda} onChange={e=>setAgenda(e.target.value)}
                        placeholder="Add discussion points, topics to cover, or preparation instructions..."
                        rows={3}
                        style={{width:"100%",padding:"11px 13px",borderRadius:11,border:"2px solid #e2e8f0",fontSize:12,color:"#1e293b",background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.2s",resize:"vertical"}}
                        onFocus={e=>e.currentTarget.style.borderColor="#8b5cf6"} onBlur={e=>e.currentTarget.style.borderColor="#e2e8f0"}/>
                    </div>
                    <div style={{display:"flex",gap:9}}>
                      <button onClick={goBack} style={{flex:1,padding:13,borderRadius:12,border:"2px solid #e2e8f0",background:"white",color:"#64748b",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                      <button onClick={handleSchedule} disabled={sending}
                        style={{flex:2,padding:13,borderRadius:12,border:"none",background:sending?"#94a3b8":cfg?.gradient,color:"white",fontWeight:700,fontSize:13,cursor:sending?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:sending?"none":`0 8px 20px ${cfg?.color}40`}}>
                        {sending ? "Sending..." : <>{cfg?.icon} Send {cfg?.name} Invite</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
