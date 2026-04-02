// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── CONFIG ────────────────────────────────────────────────────────────────
const SUPA_URL  = "https://prkjwrmjccthysskaxev.supabase.co";
const ANON_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBya2p3cm1qY2N0aHlzc2theGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzUwNjEsImV4cCI6MjA4MjUxMTA2MX0.NlHyMGsr5bIXq2TAwp02NOdr5Vf3nKPu7SFtEV781K4";
const FN_URL    = `${SUPA_URL}/functions/v1/uniconnect-api`;
const DEFAULT_PASS = "passer25";

// Token state
let _token: string | null = null;
const getToken = (): string | null => _token;
const setToken = (t: string | null) => { _token = t; };

// Session helpers
const SS_KEY = "uc_sess";
interface SessionData { access_token?: string; user?: any; [key: string]: any; }
const saveSession  = (s: SessionData | null) => { try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch {} if (s?.access_token) setToken(s.access_token); };
const clearSession = () => { try { sessionStorage.removeItem(SS_KEY); } catch {} setToken(null); };
const loadSession  = (): SessionData | null => { try { const s = sessionStorage.getItem(SS_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };

const supabase = createClient(SUPA_URL, ANON_KEY);

type ApiAction = "signin" | "signup" | "update-password" | "select" | "insert" | "update" | "delete" | "mark-all-read";
type ApiOptions = { table?: string; match?: Record<string, any>; id?: string; body?: any };

async function api(action: ApiAction, opts: ApiOptions = {}) {
  const { table = "", match = {}, id = "", body = {} } = opts;

  switch (action) {
    case "signin": {
      const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
      if (error) throw error;
      return { access_token: data.session?.access_token, user: data.user, session: data.session };
    }
    case "signup": {
      const { data, error } = await supabase.auth.signUp({ email: body.email, password: body.password, options: { data: { name: body.name || "" } } });
      if (error) throw error;
      return { access_token: data.session?.access_token, user: data.user, session: data.session };
    }
    case "update-password": {
      const { error } = await supabase.auth.updateUser({ password: body.password });
      if (error) throw error;
      return { updated: true };
    }
    case "select": {
      let query = supabase.from(table).select("*");
      if (Object.keys(match).length > 0) query = query.match(match);
      query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    case "insert": {
      const { data, error } = await supabase.from(table).insert(body).select().single();
      if (error) throw error;
      return data;
    }
    case "update": {
      const { data, error } = await supabase.from(table).update(body).eq("id", id).select().single();
      if (error) throw error;
      return data;
    }
    case "delete": {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return { deleted: true };
    }
    case "mark-all-read": {
      const { error } = await supabase.from(table).update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
      return { updated: true };
    }
    default:
      throw new Error(`Action inconnue: ${action}`);
  }
}

// ── COLORS ────────────────────────────────────────────────────────────────
const C = {
  primary:"#6C63FF", primaryDark:"#4B44CC", primaryLight:"#EEF0FF",
  accent:"#00C896", accentLight:"#E0FAF4",
  danger:"#FF4757", warning:"#FFA502", info:"#3B8BEB",
  text:"#1A1A2E", muted:"#6B7280", border:"#E5E7EB", bg:"#F4F6FB", success:"#10B981",
};

const fmtDate = (d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) => d ? new Date(d).toLocaleDateString("fr-FR", opts) : "—";
const daysLeft = (d: string | Date) => Math.ceil((new Date(d).getTime() - new Date().getTime()) / 864e5);

// ── UI COMPONENTS ─────────────────────────────────────────────────────────
const Avatar = ({i,size=34,bg=C.primary}) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*.33,flexShrink:0}}>{i||"?"}</div>
);
const Badge = ({label,bg,color}) => (
  <span style={{background:bg,color,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{label}</span>
);
const PriBadge = ({p}) => {
  const m={urgent:{bg:"#FEE2E2",c:"#991B1B",l:"Urgent"},important:{bg:"#FEF3C7",c:"#92400E",l:"Important"},normal:{bg:"#E0FAF4",c:"#065F46",l:"Normal"}};
  const x=m[p]||m.normal; return <Badge label={x.l} bg={x.bg} color={x.c}/>;
};
const RoleBadge = ({r}) => {
  const m={STUDENT:{bg:C.primaryLight,c:C.primary,l:"Étudiant"},DELEGATE:{bg:"#FEF3C7",c:"#92400E",l:"Délégué"},ADMIN:{bg:"#FEE2E2",c:"#991B1B",l:"Admin"}};
  const x=m[r]||m.STUDENT; return <Badge label={x.l} bg={x.bg} color={x.c}/>;
};
const Card = ({children,style={}}) => (
  <div style={{background:"#fff",borderRadius:16,border:`1px solid ${C.border}`,padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",...style}}>{children}</div>
);
const Btn = ({children,onClick,variant="primary",sm,disabled}) => {
  const s={primary:{background:C.primary,color:"#fff",border:"none"},secondary:{background:C.primaryLight,color:C.primary,border:"none"},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},danger:{background:"#FEE2E2",color:C.danger,border:"none"}};
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],borderRadius:9,padding:sm?"5px 12px":"8px 16px",fontSize:sm?12:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.6:1}}>{children}</button>;
};
const Inp = ({placeholder,value,onChange,type="text"}) => (
  <input type={type} placeholder={placeholder} value={value||""} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,color:C.text,background:"#fff",outline:"none",boxSizing:"border-box"}}/>
);
const Sel = ({value,onChange,options}) => (
  <select value={value||""} onChange={e=>onChange(e.target.value)}
    style={{padding:"9px 12px",borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,color:C.text,background:"#fff",outline:"none",width:"100%"}}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const Modal = ({title,onClose,children}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(15,15,26,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
    <div style={{background:"#fff",borderRadius:18,padding:28,width:490,maxWidth:"94vw",maxHeight:"82vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:700,color:C.text}}>{title}</h3>
        <button onClick={onClose} style={{background:C.bg,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:15,color:C.muted}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const Spinner = ({msg=""}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 0",gap:14}}>
    <div style={{width:32,height:32,border:`3px solid ${C.primaryLight}`,borderTop:`3px solid ${C.primary}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    {msg&&<p style={{margin:0,color:C.muted,fontSize:13}}>{msg}</p>}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
const ErrBox = ({msg,onRetry}) => (
  <div style={{background:"#FEE2E2",borderRadius:12,padding:"14px 18px",color:"#991B1B",fontSize:13,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
    <span>⚠️ {msg}</span>
    {onRetry&&<Btn sm variant="danger" onClick={onRetry}>Réessayer</Btn>}
  </div>
);
const SectionHeader = ({title,action,onAction}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
    <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{title}</h2>
    {action&&<Btn onClick={onAction} sm>{action}</Btn>}
  </div>
);

function useData(table, match={}) {
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const load=useCallback(async()=>{
    setLoading(true);setError(null);
    try{setData(await api("select",{table,match}));}
    catch(e){setError(e.message);}
    finally{setLoading(false);}
  },[table,JSON.stringify(match)]);
  useEffect(()=>{load();},[load]);
  return {data,setData,loading,error,reload:load};
}

// ── VIEWS ─────────────────────────────────────────────────────────────────
function Dashboard({setView,user}) {
  const cn=user.class_name||"GI3";
  const {data:ann}=useData("announcements",{class_name:cn});
  const {data:exams}=useData("exams",{class_name:cn});
  const {data:meets}=useData("meet_links",{class_name:cn});
  const {data:polls}=useData("polls",{class_name:cn});
  const next=[...exams].sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  const activePoll=polls.find(p=>p.is_active);
  return (
    <div>
      <div style={{marginBottom:24}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,color:C.text}}>Bonjour, {(user.name||"").split(" ")[0]} 👋</h2>
        <p style={{margin:"4px 0 0",color:C.muted,fontSize:14}}>{fmtDate(new Date(),{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:22}}>
        {[{label:"Annonces",val:ann.length,icon:"📢",c:C.primary},{label:"Examens",val:exams.length,icon:"📝",c:C.danger},{label:"Réunions",val:meets.length,icon:"🎥",c:C.info},{label:"Sondages actifs",val:polls.filter(p=>p.is_active).length,icon:"📊",c:C.accent}].map(s=>(
          <div key={s.label} style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:s.c+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.icon}</div>
            <div><p style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{s.val}</p><p style={{margin:0,fontSize:11,color:C.muted}}>{s.label}</p></div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:600,color:C.text}}>Prochain examen</h3>
          {next?(<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <p style={{margin:0,fontWeight:700,color:C.text,fontSize:15}}>{next.subject}</p>
              <span style={{background:"#FEE2E2",color:"#991B1B",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{daysLeft(next.date)}j</span>
            </div>
            <p style={{margin:"0 0 10px",color:C.muted,fontSize:13}}>{fmtDate(next.date,{day:"numeric",month:"long"})} · {next.duration} · {next.room}</p>
            <div style={{height:6,borderRadius:6,background:C.bg}}><div style={{width:`${Math.min(95,Math.max(5,100-daysLeft(next.date)*2))}%`,height:"100%",background:C.danger,borderRadius:6}}/></div>
          </>):<p style={{color:C.muted,fontSize:13,margin:0}}>Aucun examen à venir.</p>}
        </Card>
        <Card>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:600,color:C.text}}>Annonces récentes</h3>
          {ann.slice(0,3).map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:a.color||C.primary,flexShrink:0}}/>
              <p style={{margin:0,fontSize:13,flex:1,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.title}</p>
              <PriBadge p={a.priority}/>
            </div>
          ))}
          {!ann.length&&<p style={{color:C.muted,fontSize:13,margin:0}}>Aucune annonce.</p>}
          <button onClick={()=>setView("annonces")} style={{marginTop:8,background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",padding:0}}>Voir toutes →</button>
        </Card>
      </div>
      {activePoll&&(
        <Card style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:600,color:C.text}}>Sondage actif</h3>
            <Badge label="Ouvert" bg={C.accentLight} color={C.accent}/>
          </div>
          <p style={{margin:"0 0 10px",fontSize:14,color:C.text}}>{activePoll.question}</p>
          <button onClick={()=>setView("sondages")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",padding:0}}>Voter →</button>
        </Card>
      )}
      {meets.length>0&&(
        <Card>
          <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600,color:C.text}}>Réunions à venir</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {meets.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,background:C.bg,borderRadius:10,padding:"10px 14px"}}>
                <span style={{fontSize:18}}>🎥</span>
                <div><p style={{margin:0,fontSize:13,fontWeight:500,color:C.text}}>{m.title}</p><p style={{margin:0,fontSize:11,color:C.muted}}>{m.platform}·{m.time}</p></div>
                <Btn sm variant="secondary">Rejoindre</Btn>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Annonces({user}) {
  const cn=user.class_name||"GI3";
  const {data,setData,loading,error,reload}=useData("announcements",{class_name:cn});
  const [modal,setModal]=useState(false);
  const [filter,setFilter]=useState("all");
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({title:"",content:"",priority:"normal",class_name:cn,color:C.primary});
  const canPost=user.role==="DELEGATE"||user.role==="ADMIN";
  const submit=async()=>{
    if(!form.title||!form.content)return; setSaving(true);
    try{const row=await api("insert",{table:"announcements",body:{...form,author:user.name,user_id:user.id}});setData(p=>[row,...p]);setModal(false);setForm({title:"",content:"",priority:"normal",class_name:cn,color:C.primary});}catch(e){alert(e.message);}
    setSaving(false);
  };
  const del=async(id)=>{if(!confirm("Supprimer ?"))return;try{await api("delete",{table:"announcements",id});setData(p=>p.filter(x=>x.id!==id));}catch(e){alert(e.message);}};
  const filtered=filter==="all"?data:data.filter(a=>a.priority===filter);
  return (
    <div>
      <SectionHeader title="Annonces" action={canPost?"+ Nouvelle annonce":null} onAction={()=>setModal(true)}/>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {["all","urgent","important","normal"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?C.primary:C.bg,color:filter===f?"#fff":C.muted,border:"none",borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:500,cursor:"pointer",textTransform:"capitalize"}}>{f==="all"?"Tous":f}</button>
        ))}
      </div>
      {loading&&<Spinner msg="Chargement..."/>}{error&&<ErrBox msg={error} onRetry={reload}/>}
      {!loading&&!error&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {filtered.length===0&&<p style={{color:C.muted,textAlign:"center",padding:24}}>Aucune annonce.</p>}
          {filtered.map(a=>(
            <Card key={a.id} style={{borderLeft:`4px solid ${a.color||C.primary}`,paddingLeft:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <h3 style={{margin:0,fontSize:15,fontWeight:600,color:C.text}}>{a.title}</h3>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <PriBadge p={a.priority}/>
                  {(user.role==="ADMIN"||(canPost&&a.user_id===user.id))&&<button onClick={()=>del(a.id)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:14}}>🗑</button>}
                </div>
              </div>
              <p style={{margin:"0 0 10px",color:C.muted,fontSize:14,lineHeight:1.6}}>{a.content}</p>
              <div style={{display:"flex",gap:14,fontSize:12,color:C.muted,flexWrap:"wrap"}}>
                <span>👤 {a.author}</span>
                <span>📅 {fmtDate(a.created_at,{day:"numeric",month:"long",year:"numeric"})}</span>
                <span style={{background:C.primaryLight,color:C.primary,padding:"1px 8px",borderRadius:10,fontWeight:500}}>{a.class_name}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {modal&&(
        <Modal title="Nouvelle annonce" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Titre</label><Inp placeholder="Titre" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))}/></div>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Contenu</label>
              <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Contenu..." style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,minHeight:80,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}}/>
            </div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Priorité</label><Sel value={form.priority} onChange={v=>setForm(f=>({...f,priority:v}))} options={[{value:"normal",label:"Normal"},{value:"important",label:"Important"},{value:"urgent",label:"Urgent"}]}/></div>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Classe</label><Sel value={form.class_name} onChange={v=>setForm(f=>({...f,class_name:v}))} options={["GI3","GI2","RT2","IDA1"].map(c=>({value:c,label:c}))}/></div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
              <Btn variant="ghost" onClick={()=>setModal(false)}>Annuler</Btn>
              <Btn onClick={submit} disabled={saving}>{saving?"Publication...":"Publier"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Examens({user}) {
  const cn=user.class_name||"GI3";
  const {data,setData,loading,error,reload}=useData("exams",{class_name:cn});
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({subject:"",date:"",duration:"2h",room:"",notes:"",class_name:cn});
  const canAdd=user.role==="DELEGATE"||user.role==="ADMIN";
  const cols=[C.primary,C.danger,C.accent,C.warning,C.info];
  const submit=async()=>{
    if(!form.subject||!form.date)return; setSaving(true);
    try{const row=await api("insert",{table:"exams",body:{...form,user_id:user.id}});setData(p=>[...p,row]);setModal(false);setForm({subject:"",date:"",duration:"2h",room:"",notes:"",class_name:cn});}catch(e){alert(e.message);}
    setSaving(false);
  };
  const del=async(id)=>{if(!confirm("Supprimer ?"))return;try{await api("delete",{table:"exams",id});setData(p=>p.filter(x=>x.id!==id));}catch(e){alert(e.message);}};
  const sorted=[...data].sort((a,b)=>new Date(a.date)-new Date(b.date));
  return (
    <div>
      <SectionHeader title="Examens à venir" action={canAdd?"+ Ajouter":null} onAction={()=>setModal(true)}/>
      {loading&&<Spinner msg="Chargement..."/>}{error&&<ErrBox msg={error} onRetry={reload}/>}
      {!loading&&!error&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
          {sorted.map((e,i)=>{const dl=daysLeft(e.date);return(
            <Card key={e.id} style={{borderTop:`3px solid ${cols[i%5]}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{width:38,height:38,borderRadius:9,background:cols[i%5]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>📝</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{background:dl<=7?"#FEE2E2":C.primaryLight,color:dl<=7?"#991B1B":C.primary,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{dl}j</span>
                  {canAdd&&<button onClick={()=>del(e.id)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:13}}>🗑</button>}
                </div>
              </div>
              <p style={{margin:"0 0 3px",fontWeight:700,fontSize:14,color:C.text}}>{e.subject}</p>
              <p style={{margin:"0 0 10px",fontSize:13,color:C.muted}}>{fmtDate(e.date,{weekday:"long",day:"numeric",month:"long"})}</p>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                <span style={{background:C.bg,color:C.muted,fontSize:11,padding:"3px 9px",borderRadius:7}}>⏱ {e.duration}</span>
                <span style={{background:C.bg,color:C.muted,fontSize:11,padding:"3px 9px",borderRadius:7}}>📍 {e.room}</span>
              </div>
              {e.notes&&<p style={{margin:"8px 0 0",fontSize:12,color:C.muted,fontStyle:"italic"}}>💡 {e.notes}</p>}
            </Card>
          );})}
          {sorted.length===0&&<p style={{color:C.muted,padding:24}}>Aucun examen.</p>}
        </div>
      )}
      {modal&&(
        <Modal title="Ajouter un examen" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Matière</label><Inp placeholder="ex: Algorithmique" value={form.subject} onChange={v=>setForm(f=>({...f,subject:v}))}/></div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Date</label><Inp type="date" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))}/></div>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Durée</label><Inp placeholder="2h" value={form.duration} onChange={v=>setForm(f=>({...f,duration:v}))}/></div>
            </div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Salle</label><Inp placeholder="Amphi A" value={form.room} onChange={v=>setForm(f=>({...f,room:v}))}/></div>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Classe</label><Sel value={form.class_name} onChange={v=>setForm(f=>({...f,class_name:v}))} options={["GI3","GI2","RT2","IDA1"].map(c=>({value:c,label:c}))}/></div>
            </div>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Notes</label><Inp placeholder="Documents autorisés..." value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))}/></div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
              <Btn variant="ghost" onClick={()=>setModal(false)}>Annuler</Btn>
              <Btn onClick={submit} disabled={saving}>{saving?"Ajout...":"Ajouter"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MeetLinks({user}) {
  const cn=user.class_name||"GI3";
  const {data,setData,loading,error,reload}=useData("meet_links",{class_name:cn});
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({title:"",platform:"Zoom",url:"",time:"",class_name:cn});
  const canAdd=user.role==="DELEGATE"||user.role==="ADMIN";
  const platC={"Google Meet":"#00C896","Zoom":"#3B8BEB","Teams":"#6C63FF","Other":C.muted};
  const submit=async()=>{
    if(!form.title||!form.url)return; setSaving(true);
    try{const row=await api("insert",{table:"meet_links",body:{...form,user_id:user.id}});setData(p=>[row,...p]);setModal(false);setForm({title:"",platform:"Zoom",url:"",time:"",class_name:cn});}catch(e){alert(e.message);}
    setSaving(false);
  };
  const del=async(id)=>{try{await api("delete",{table:"meet_links",id});setData(p=>p.filter(x=>x.id!==id));}catch(e){alert(e.message);}};
  return (
    <div>
      <SectionHeader title="Liens de réunion" action={canAdd?"+ Ajouter":null} onAction={()=>setModal(true)}/>
      {loading&&<Spinner msg="Chargement..."/>}{error&&<ErrBox msg={error} onRetry={reload}/>}
      {!loading&&!error&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
          {data.map(m=>(
            <Card key={m.id} style={{borderTop:`3px solid ${platC[m.platform]||C.muted}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <Badge label={m.platform} bg={(platC[m.platform]||C.muted)+"18"} color={platC[m.platform]||C.muted}/>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.muted}}>{m.time}</span>
                  {canAdd&&<button onClick={()=>del(m.id)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:13}}>🗑</button>}
                </div>
              </div>
              <p style={{margin:"0 0 14px",fontWeight:600,fontSize:15,color:C.text}}>{m.title}</p>
              <Btn onClick={()=>window.open(m.url,"_blank")}>Rejoindre</Btn>
            </Card>
          ))}
          {data.length===0&&<p style={{color:C.muted,padding:24}}>Aucune réunion.</p>}
        </div>
      )}
      {modal&&(
        <Modal title="Ajouter un lien" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Titre</label><Inp placeholder="ex: Cours OS" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))}/></div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Plateforme</label><Sel value={form.platform} onChange={v=>setForm(f=>({...f,platform:v}))} options={["Zoom","Google Meet","Teams","Other"].map(x=>({value:x,label:x}))}/></div>
              <div style={{flex:1}}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Horaire</label><Inp placeholder="Lun. 10:00" value={form.time} onChange={v=>setForm(f=>({...f,time:v}))}/></div>
            </div>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>URL</label><Inp placeholder="https://..." value={form.url} onChange={v=>setForm(f=>({...f,url:v}))}/></div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
              <Btn variant="ghost" onClick={()=>setModal(false)}>Annuler</Btn>
              <Btn onClick={submit} disabled={saving}>{saving?"Ajout...":"Ajouter"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Sondages({user}) {
  const cn=user.class_name||"GI3";
  const {data:polls,setData,loading,error,reload}=useData("polls",{class_name:cn});
  const [voted,setVoted]=useState({});
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({question:"",options:["","",""],class_name:cn});
  const canCreate=user.role==="DELEGATE"||user.role==="ADMIN";
  const vote=async(poll,optionId)=>{
    if(voted[poll.id])return;
    setVoted(p=>({...p,[poll.id]:optionId}));
    const newOpts=poll.options.map(o=>o.id===optionId?{...o,votes:(o.votes||0)+1}:o);
    try{await api("update",{table:"polls",id:poll.id,body:{options:newOpts,total_votes:(poll.total_votes||0)+1}});setData(p=>p.map(x=>x.id===poll.id?{...x,options:newOpts,total_votes:(x.total_votes||0)+1}:x));}catch{}
  };
  const submit=async()=>{
    const opts=form.options.filter(o=>o.trim());if(!form.question||opts.length<2)return;setSaving(true);
    try{const row=await api("insert",{table:"polls",body:{question:form.question,options:opts.map((l,i)=>({id:String.fromCharCode(97+i),label:l,votes:0})),class_name:form.class_name,is_active:true,total_votes:0,user_id:user.id}});setData(p=>[row,...p]);setModal(false);setForm({question:"",options:["","",""],class_name:cn});}catch(e){alert(e.message);}
    setSaving(false);
  };
  return (
    <div>
      <SectionHeader title="Sondages" action={canCreate?"+ Créer":null} onAction={()=>setModal(true)}/>
      {loading&&<Spinner msg="Chargement..."/>}{error&&<ErrBox msg={error} onRetry={reload}/>}
      {!loading&&!error&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {polls.map(p=>{const myV=voted[p.id];const total=p.total_votes||1;return(
            <Card key={p.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <h3 style={{margin:0,fontSize:15,fontWeight:600,color:C.text}}>{p.question}</h3>
                <Badge label={p.is_active?"Actif":"Fermé"} bg={p.is_active?C.accentLight:C.bg} color={p.is_active?C.accent:C.muted}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {(p.options||[]).map(o=>{const pct=Math.round(((o.votes||0)/total)*100);const isMine=myV===o.id;return(
                  <div key={o.id}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:13,color:C.text,fontWeight:isMine?600:400}}>{o.label}{isMine?" ✓":""}</span>
                      <span style={{fontSize:12,color:C.muted}}>{pct}%·{o.votes||0}</span>
                    </div>
                    <div style={{height:8,borderRadius:8,background:C.bg,overflow:"hidden",cursor:(!myV&&p.is_active)?"pointer":"default"}} onClick={()=>p.is_active&&vote(p,o.id)}>
                      <div style={{width:`${pct}%`,height:"100%",background:isMine?C.accent:C.primary,borderRadius:8,transition:"width 0.4s"}}/>
                    </div>
                  </div>
                );})}
              </div>
              <p style={{margin:"10px 0 0",fontSize:12,color:C.muted}}>Total:{p.total_votes||0} votes {!myV&&p.is_active&&"· Cliquer pour voter"}</p>
            </Card>
          );})}
          {polls.length===0&&<p style={{color:C.muted,textAlign:"center",padding:24}}>Aucun sondage.</p>}
        </div>
      )}
      {modal&&(
        <Modal title="Créer un sondage" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Question</label><Inp placeholder="Votre question..." value={form.question} onChange={v=>setForm(f=>({...f,question:v}))}/></div>
            {form.options.map((o,i)=>(<div key={i}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Option {i+1}</label><Inp placeholder={`Option ${i+1}`} value={o} onChange={v=>setForm(f=>({...f,options:f.options.map((x,j)=>j===i?v:x)}))}/></div>))}
            <button onClick={()=>setForm(f=>({...f,options:[...f.options,""]}))} style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:9,padding:"8px",fontSize:13,color:C.muted,cursor:"pointer"}}>+ Option</button>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
              <Btn variant="ghost" onClick={()=>setModal(false)}>Annuler</Btn>
              <Btn onClick={submit} disabled={saving}>{saving?"Création...":"Créer"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Notifications({user}) {
  const {data:notifs,setData,loading,error,reload}=useData("notifications");
  const icons={alert:"🔴",info:"🔵",success:"🟢",warning:"🟡"};
  const unread=notifs.filter(n=>!n.is_read).length;
  const markAll=async()=>{setData(p=>p.map(x=>({...x,is_read:true})));try{await api("mark-all-read",{table:"notifications"});}catch{}};
  const markOne=async(id)=>{setData(p=>p.map(x=>x.id===id?{...x,is_read:true}:x));try{await api("update",{table:"notifications",id,body:{is_read:true}});}catch{}};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>Notifications</h2>
          {unread>0&&<p style={{margin:"2px 0 0",fontSize:13,color:C.muted}}>{unread} non lue{unread>1?"s":""}</p>}
        </div>
        <Btn sm variant="secondary" onClick={markAll}>Tout marquer lu</Btn>
      </div>
      {loading&&<Spinner msg="Chargement..."/>}{error&&<ErrBox msg={error} onRetry={reload}/>}
      {!loading&&!error&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {notifs.map(n=>(
            <div key={n.id} onClick={()=>markOne(n.id)} style={{display:"flex",alignItems:"center",gap:14,background:n.is_read?"#fff":"#EEF0FF",borderRadius:14,border:`1px solid ${n.is_read?C.border:C.primary+"40"}`,padding:"14px 16px",cursor:"pointer"}}>
              <span style={{fontSize:20}}>{icons[n.type]||"🔵"}</span>
              <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:n.is_read?400:600,color:C.text}}>{n.title}</p><p style={{margin:0,fontSize:13,color:C.muted}}>{n.message}</p></div>
              <span style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtDate(n.created_at)}</span>
              {!n.is_read&&<div style={{width:8,height:8,borderRadius:"50%",background:C.primary,flexShrink:0}}/>}
            </div>
          ))}
          {notifs.length===0&&<p style={{color:C.muted,textAlign:"center",padding:24}}>Aucune notification.</p>}
        </div>
      )}
    </div>
  );
}

function Profil({user,setUser,onLogout}) {
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:user.name,class_name:user.class_name||"GI3"});
  const [pwSection,setPwSection]=useState(false);
  const [pwForm,setPwForm]=useState({current:"",next:"",confirm:""});
  const [pwMsg,setPwMsg]=useState("");
  const [pwSaving,setPwSaving]=useState(false);
  const [showPw,setShowPw]=useState(false);
  const isDefaultPw=!user.password_changed;

  const save=async()=>{
    setSaving(true);
    try{await api("update",{table:"users",id:user.id,body:form});setUser(u=>({...u,...form}));setEditing(false);}catch(e){alert(e.message);}
    setSaving(false);
  };

  const changePassword=async()=>{
    setPwMsg("");
    if(!pwForm.current){setPwMsg("Entrez votre mot de passe actuel.");return;}
    if(pwForm.next.length<6){setPwMsg("Min. 6 caractères.");return;}
    if(pwForm.next!==pwForm.confirm){setPwMsg("Les mots de passe ne correspondent pas.");return;}
    if(pwForm.next===DEFAULT_PASS){setPwMsg("Choisissez un mot de passe différent du défaut.");return;}
    setPwSaving(true);
    try{
      await api("signin",{body:{email:user.email,password:pwForm.current}});
      await api("update-password",{body:{password:pwForm.next}});
      await api("update",{table:"users",id:user.id,body:{password_changed:true}});
      setUser(u=>({...u,password_changed:true}));
      setPwMsg("✅ Mot de passe modifié !");
      setPwForm({current:"",next:"",confirm:""});
      setTimeout(()=>{setPwSection(false);setPwMsg("");},2000);
    }catch(e){setPwMsg(e.message.toLowerCase().includes("invalid")?"Mot de passe actuel incorrect.":e.message);}
    setPwSaving(false);
  };

  return (
    <div style={{maxWidth:500}}>
      <SectionHeader title="Mon profil" action={editing?null:"Modifier"} onAction={()=>setEditing(true)}/>
      {isDefaultPw&&(
        <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>⚠️</span>
          <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:600,color:"#92400E"}}>Mot de passe par défaut actif</p><p style={{margin:"2px 0 0",fontSize:12,color:"#92400E"}}>Changez le mot de passe <strong>{DEFAULT_PASS}</strong></p></div>
          <Btn sm variant="ghost" onClick={()=>setPwSection(true)}>Changer</Btn>
        </div>
      )}
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:22}}>{user.avatar||user.name?.slice(0,2).toUpperCase()}</div>
          <div>
            <p style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>{user.name}</p>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <RoleBadge r={user.role}/>
              {!isDefaultPw&&<Badge label="🔒 Sécurisé" bg="#E0FAF4" color={C.accent}/>}
            </div>
          </div>
        </div>
        {editing?(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Nom</label><Inp value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/></div>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Classe</label><Sel value={form.class_name} onChange={v=>setForm(f=>({...f,class_name:v}))} options={["GI3","GI2","RT2","IDA1"].map(c=>({value:c,label:c}))}/></div>
            <div style={{display:"flex",gap:10,marginTop:6}}>
              <Btn onClick={save} disabled={saving}>{saving?"Sauvegarde...":"Sauvegarder"}</Btn>
              <Btn variant="ghost" onClick={()=>setEditing(false)}>Annuler</Btn>
            </div>
          </div>
        ):(
          [["Nom",user.name],["Email",user.email],["École",user.school_name||"ESP Dakar"],["Classe",user.class_name],["Rôle",user.role]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${C.border}`}}>
              <span style={{fontSize:14,color:C.muted}}>{k}</span>
              <span style={{fontSize:14,fontWeight:500,color:C.text}}>{v||"—"}</span>
            </div>
          ))
        )}
      </Card>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><p style={{margin:0,fontSize:14,fontWeight:600,color:C.text}}>Mot de passe</p><p style={{margin:"2px 0 0",fontSize:12,color:C.muted}}>{isDefaultPw?"Défaut actif":"Personnalisé"}</p></div>
          <Btn sm variant={pwSection?"ghost":"secondary"} onClick={()=>{setPwSection(s=>!s);setPwMsg("");}}>{pwSection?"Annuler":"Changer"}</Btn>
        </div>
        {pwSection&&(
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10}}>
            <div>
              <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Mot de passe actuel</label>
              <div style={{position:"relative"}}>
                <Inp type={showPw?"text":"password"} placeholder={`Défaut: ${DEFAULT_PASS}`} value={pwForm.current} onChange={v=>setPwForm(f=>({...f,current:v}))}/>
                <button onClick={()=>setShowPw(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.muted}}>{showPw?"🙈":"👁"}</button>
              </div>
            </div>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Nouveau mot de passe</label><Inp type="password" placeholder="Min. 6 caractères" value={pwForm.next} onChange={v=>setPwForm(f=>({...f,next:v}))}/></div>
            <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Confirmer</label><Inp type="password" placeholder="Répétez" value={pwForm.confirm} onChange={v=>setPwForm(f=>({...f,confirm:v}))}/></div>
            {pwMsg&&<div style={{background:pwMsg.startsWith("✅")?"#E0FAF4":"#FEE2E2",color:pwMsg.startsWith("✅")?"#065F46":"#991B1B",fontSize:12,padding:"8px 12px",borderRadius:8}}>{pwMsg}</div>}
            <Btn onClick={changePassword} disabled={pwSaving}>{pwSaving?"Modification...":"Modifier le mot de passe"}</Btn>
          </div>
        )}
      </Card>
      <Btn variant="danger" onClick={onLogout}>Se déconnecter</Btn>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [tab,setTab]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState(DEFAULT_PASS);
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const [showPass,setShowPass]=useState(false);

  const login=async()=>{
    setMsg("");setLoading(true);
    try{
      const d=await api("signin",{body:{email,password:pass}});
      setToken(d.access_token);saveSession(d);
      await new Promise(r=>setTimeout(r,400));
      const rows=await api("select",{table:"users",match:{id:d.user.id}});
      onLogin(rows[0]||{id:d.user.id,name:email.split("@")[0],email,role:"STUDENT",class_name:"GI3",avatar:email.slice(0,2).toUpperCase()});
    }catch(e){setMsg(e.message);}
    setLoading(false);
  };

  const signup=async()=>{
    setMsg("");if(!name||!email){setMsg("Remplissez tous les champs.");return;}setLoading(true);
    try{
      const d=await api("signup",{body:{email,password:pass||DEFAULT_PASS,name}});
      if(d?.session?.access_token||d?.access_token){
        const tok=d?.session?.access_token||d?.access_token;
        setToken(tok);saveSession({...d?.session||d,access_token:tok,user:d.user});
        await new Promise(r=>setTimeout(r,1200));
        const rows=await api("select",{table:"users",match:{id:d.user.id}});
        onLogin(rows[0]||{id:d.user.id,name,email,role:"STUDENT",class_name:"GI3",avatar:name.slice(0,2).toUpperCase()});
      }else{
        setMsg("✅ Compte créé ! Vérifiez votre email puis connectez-vous.");
        setTab("login");setPass(DEFAULT_PASS);
      }
    }catch(e){
      const m=e.message.toLowerCase();
      if(m.includes("already")){setMsg("Email déjà utilisé. Connectez-vous.");setTab("login");}
      else setMsg(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{width:400,background:"#fff",borderRadius:20,padding:"36px 32px",boxShadow:"0 8px 40px rgba(108,99,255,0.12)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",color:"#fff",fontWeight:800,fontSize:18}}>UC</div>
          <h1 style={{margin:0,fontSize:22,fontWeight:700,color:C.text}}>UniConnect ESP</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.muted}}>Plateforme universitaire</p>
        </div>
        <div style={{display:"flex",background:C.bg,borderRadius:10,padding:3,marginBottom:16,gap:3}}>
          {["login","signup"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setMsg("");setPass(DEFAULT_PASS);}} style={{flex:1,background:tab===t?"#fff":"transparent",border:tab===t?`1px solid ${C.border}`:"none",borderRadius:8,padding:"7px",fontSize:13,fontWeight:tab===t?600:400,color:tab===t?C.text:C.muted,cursor:"pointer"}}>
              {t==="login"?"Connexion":"Inscription"}
            </button>
          ))}
        </div>
        <div style={{background:"#F0EFFF",borderRadius:10,padding:"9px 13px",marginBottom:14,fontSize:12,color:C.primary,display:"flex",gap:8,alignItems:"center"}}>
          <span>🔑</span><span>Mot de passe par défaut : <strong>{DEFAULT_PASS}</strong></span>
        </div>
        {msg&&<div style={{background:msg.startsWith("✅")?"#E0FAF4":"#FEE2E2",color:msg.startsWith("✅")?"#065F46":"#991B1B",fontSize:12,padding:"9px 12px",borderRadius:8,marginBottom:12}}>{msg}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {tab==="signup"&&<div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Nom complet</label><Inp placeholder="Prénom Nom" value={name} onChange={setName}/></div>}
          <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Email</label><Inp type="email" placeholder="votre@esp.sn" value={email} onChange={setEmail}/></div>
          <div>
            <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:4}}>Mot de passe</label>
            <div style={{position:"relative"}}>
              <Inp type={showPass?"text":"password"} placeholder="Mot de passe" value={pass} onChange={setPass}/>
              <button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.muted}}>{showPass?"🙈":"👁"}</button>
            </div>
          </div>
          <button onClick={tab==="login"?login:signup} disabled={loading}
            style={{background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,color:"#fff",border:"none",borderRadius:10,padding:"11px",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,marginTop:4}}>
            {loading?"Chargement...":(tab==="login"?"Se connecter":"Créer mon compte")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",icon:"⊞",label:"Tableau de bord"},
  {id:"annonces",icon:"📢",label:"Annonces"},
  {id:"examens",icon:"📝",label:"Examens"},
  {id:"meets",icon:"🎥",label:"Réunions"},
  {id:"sondages",icon:"📊",label:"Sondages"},
  {id:"notifications",icon:"🔔",label:"Notifications"},
  {id:"profil",icon:"👤",label:"Profil"},
];

export default function App() {
  const [user,setUser]=useState(null);
  const [checking,setChecking]=useState(true);
  const [view,setView]=useState("dashboard");
  const [sideOpen,setSideOpen]=useState(true);

  useEffect(()=>{
    const s=loadSession();
    if(s?.access_token&&s?.user){
      setToken(s.access_token);
      api("select",{table:"users",match:{id:s.user.id}})
        .then(rows=>{setUser(rows[0]||{id:s.user.id,name:s.user.email?.split("@")[0],email:s.user.email,role:"STUDENT",class_name:"GI3",avatar:"U"});})
        .catch(()=>clearSession())
        .finally(()=>setChecking(false));
    }else{setChecking(false);}
  },[]);

  const logout=()=>{clearSession();setUser(null);setView("dashboard");};

  if(checking) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:"-apple-system,sans-serif"}}>
      <Spinner msg="Vérification de la session..."/>
    </div>
  );

  if(!user) return <Login onLogin={u=>{setUser(u);setView("dashboard");}}/>;

  const views={
    dashboard:<Dashboard setView={setView} user={user}/>,
    annonces:<Annonces user={user}/>,
    examens:<Examens user={user}/>,
    meets:<MeetLinks user={user}/>,
    sondages:<Sondages user={user}/>,
    notifications:<Notifications user={user}/>,
    profil:<Profil user={user} setUser={setUser} onLogout={logout}/>,
  };

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",overflow:"hidden"}}>
      <div style={{width:sideOpen?232:62,flexShrink:0,background:"#fff",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width 0.2s",overflow:"hidden"}}>
        <div style={{padding:"14px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,flexShrink:0}}>UC</div>
          {sideOpen&&<div style={{flex:1,minWidth:0}}><p style={{margin:0,fontWeight:700,fontSize:13,color:C.text}}>UniConnect</p><p style={{margin:0,fontSize:10,color:C.muted}}>ESP · {user.class_name}</p></div>}
          <button onClick={()=>setSideOpen(o=>!o)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:15,flexShrink:0,padding:4}}>☰</button>
        </div>
        <nav style={{flex:1,padding:"8px 6px",overflowY:"auto"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 10px",borderRadius:10,border:"none",background:view===n.id?"#EEF0FF":"transparent",color:view===n.id?C.primary:C.muted,fontWeight:view===n.id?600:400,fontSize:13,cursor:"pointer",marginBottom:2,whiteSpace:"nowrap"}}>
              <span style={{fontSize:16,width:22,textAlign:"center",flexShrink:0}}>{n.icon}</span>
              {sideOpen&&<span style={{flex:1,textAlign:"left"}}>{n.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:"10px 6px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:C.bg,cursor:"pointer"}} onClick={()=>setView("profil")}>
            <Avatar i={user.avatar||user.name?.slice(0,2).toUpperCase()} size={30}/>
            {sideOpen&&<div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:12,fontWeight:500,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</p>
              <p style={{margin:0,fontSize:10,color:C.muted}}>{user.role}</p>
            </div>}
          </div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"26px"}}>
        {views[view]||<Dashboard setView={setView} user={user}/>}
      </div>
    </div>
  );
}