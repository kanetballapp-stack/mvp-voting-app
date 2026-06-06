import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const PLAYERS = ["Layla","Lilly","Olivia","Mahli","Zoe","Chloe","Manha","Heidi","Indi","Zara"];
const TOTAL_ROUNDS = 19;
const PIN = "3743";
const VOTE_OPTIONS = [3, 2, 1];
const DOC_REF = doc(db, "mvp", "votes");

export default function App() {
  const [screen, setScreen] = useState("home");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentVoter, setCurrentVoter] = useState(null);
  const [votes, setVotes] = useState({});
  const [roundVotes, setRoundVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pinMode, setPinMode] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [shake, setShake] = useState(false);

  // Live sync from Firestore
  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        setVotes(snap.data().rounds || {});
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const saveVotes = async (newVotes) => {
    setSaving(true);
    try {
      await setDoc(DOC_REF, { rounds: newVotes });
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
  };

  const getVotedPlayers = (round) => Object.keys(votes[round] || {});

  const submitVote = async () => {
    const counts = VOTE_OPTIONS.reduce((acc, v) => {
      acc[v] = Object.values(roundVotes).filter(x => x === v).length;
      return acc;
    }, {});
    if (counts[3] !== 1 || counts[2] !== 1 || counts[1] !== 1) return;
    const newVotes = {
      ...votes,
      [currentRound]: { ...(votes[currentRound] || {}), [currentVoter]: { ...roundVotes } }
    };
    setVotes(newVotes);
    await saveVotes(newVotes);
    setScreen("done");
  };

  const toggleVote = (player, points) => {
    if (player === currentVoter) return;
    setRoundVotes(prev => {
      const next = { ...prev };
      if (next[player] === points) {
        delete next[player];
      } else {
        Object.keys(next).forEach(k => { if (next[k] === points) delete next[k]; });
        next[player] = points;
      }
      return next;
    });
  };

  const getResults = () => {
    const totals = {};
    PLAYERS.forEach(p => totals[p] = 0);
    Object.values(votes).forEach(rd => {
      Object.values(rd).forEach(ballot => {
        Object.entries(ballot).forEach(([p, pts]) => { totals[p] = (totals[p] || 0) + pts; });
      });
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  };

  const openPin = (mode) => { setPinMode(mode); setPinInput(""); setPinError(false); };
  const closePin = () => { setPinMode(null); setPinInput(""); setPinError(false); };

  const tryPin = async () => {
    if (pinInput === PIN) {
      if (pinMode === "results") { closePin(); setScreen("results"); }
      else if (pinMode === "reset") {
        const empty = {};
        setVotes(empty);
        await saveVotes(empty);
        closePin();
      }
    } else {
      setPinError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPinInput("");
    }
  };

  const voteReady = () => {
    const counts = VOTE_OPTIONS.reduce((acc, v) => {
      acc[v] = Object.values(roundVotes).filter(x => x === v).length;
      return acc;
    }, {});
    return counts[3] === 1 && counts[2] === 1 && counts[1] === 1;
  };

  if (loading) return (
    <div style={{...s.page, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div style={s.bgPattern}/>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48, marginBottom:16}}>⭐</div>
        <p style={{color:"#a259ff", fontSize:24, letterSpacing:3}}>LOADING...</p>
      </div>
    </div>
  );

  if (pinMode) return (
    <div style={s.overlay}>
      <div style={{...s.pinBox, animation: shake ? "shake 0.5s" : "none"}}>
        <div style={s.pinIcon}>{pinMode === "reset" ? "🗑️" : "🔒"}</div>
        <h2 style={{...s.pinTitle, color: pinMode === "reset" ? "#ff4b78" : "#a259ff"}}>
          {pinMode === "reset" ? "Reset Votes" : "Results PIN"}
        </h2>
        <p style={s.pinSub}>
          {pinMode === "reset"
            ? "Enter PIN to reset ALL votes across all rounds"
            : "Enter the 4-digit PIN to view results"}
        </p>
        <input
          style={{...s.pinInput, borderColor: pinError ? "#ff4b78" : pinMode === "reset" ? "#ff4b78" : "#a259ff"}}
          type="password"
          maxLength={4}
          value={pinInput}
          onChange={e => { setPinInput(e.target.value); setPinError(false); }}
          onKeyDown={e => e.key === "Enter" && tryPin()}
          autoFocus
          placeholder="••••"
        />
        {pinError && <p style={s.pinErr}>Incorrect PIN</p>}
        <button
          style={{...s.pinBtn, background: pinMode === "reset" ? "linear-gradient(135deg,#ff4b78,#ff9a3c)" : "linear-gradient(135deg,#a259ff,#ff4b78)"}}
          onClick={tryPin}
        >
          {pinMode === "reset" ? "Reset All Votes" : "Unlock"}
        </button>
        <button style={s.backLink} onClick={closePin}>Cancel</button>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );

  if (screen === "home") return (
    <div style={s.page}>
      <div style={s.bgPattern}/>
      <div style={s.homeWrap}>
        <div style={s.badge}>⚽ NETBALL MVP</div>
        <h1 style={s.title}>VOTE YOUR<br/><span style={s.titleAccent}>MVP</span></h1>
        <p style={s.subtitle}>Season Voting · {TOTAL_ROUNDS} Rounds</p>
        {saving && <p style={{color:"#a259ff", fontSize:13, fontFamily:"Georgia,serif", fontStyle:"italic"}}>Saving...</p>}
        <div style={s.roundSelector}>
          <label style={s.roundLabel}>SELECT ROUND</label>
          <div style={s.roundGrid}>
            {Array.from({length: TOTAL_ROUNDS}, (_, i) => i + 1).map(r => {
              const voted = getVotedPlayers(r);
              const full = voted.length === PLAYERS.length;
              return (
                <button
                  key={r}
                  style={{...s.roundBtn, ...(currentRound === r ? s.roundBtnActive : {}), ...(full ? s.roundBtnFull : {})}}
                  onClick={() => setCurrentRound(r)}
                >
                  {r}
                  {full && <span style={s.roundCheck}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <button style={s.mainBtn} onClick={() => setScreen("select")}>
          START ROUND {currentRound}
        </button>
        <button style={s.resultsLink} onClick={() => openPin("results")}>📊 View Results</button>
        <button style={s.resetLink} onClick={() => openPin("reset")}>🗑 Reset All Votes</button>
      </div>
    </div>
  );

  if (screen === "select") {
    const voted = getVotedPlayers(currentRound);
    return (
      <div style={s.page}>
        <div style={s.bgPattern}/>
        <div style={s.selectWrap}>
          <button style={s.backBtn} onClick={() => setScreen("home")}>← Back</button>
          <div style={s.roundPill}>ROUND {currentRound}</div>
          <h2 style={s.selectTitle}>Who are you?</h2>
          <p style={s.selectSub}>Select your name to cast your vote</p>
          <div style={s.playerGrid}>
            {PLAYERS.map(p => {
              const done = voted.includes(p);
              return (
                <button
                  key={p}
                  style={{...s.playerCard, ...(done ? s.playerDone : {})}}
                  onClick={() => { if (done) return; setCurrentVoter(p); setRoundVotes({}); setScreen("vote"); }}
                  disabled={done}
                >
                  <span style={s.playerAvatar}>{p[0]}</span>
                  <span style={s.playerName}>{p}</span>
                  {done && <span style={s.doneTag}>✓ Voted</span>}
                </button>
              );
            })}
          </div>
          <p style={s.voteCount}>{voted.length}/{PLAYERS.length} players voted</p>
        </div>
      </div>
    );
  }

  if (screen === "vote") return (
    <div style={s.page}>
      <div style={s.bgPattern}/>
      <div style={s.voteWrap}>
        <button style={s.backBtn} onClick={() => setScreen("select")}>← Back</button>
        <div style={s.voteHeader}>
          <div style={s.roundPill}>ROUND {currentRound}</div>
          <h2 style={s.voteTitle}><span style={s.voterName}>{currentVoter}</span>, cast your votes</h2>
          <p style={s.voteSub}>Assign 3, 2 and 1 points — one each, not to yourself</p>
        </div>
        <div style={s.pointsGuide}>
          {VOTE_OPTIONS.map(v => {
            const assigned = Object.entries(roundVotes).find(([,pts]) => pts === v);
            return (
              <div key={v} style={{...s.pointsPill, ...(assigned ? s.pointsPillDone : {})}}>
                <span style={s.pointsNum}>{v}</span>
                <span style={s.pointsTxt}>{assigned ? assigned[0] : "—"}</span>
              </div>
            );
          })}
        </div>
        <div style={s.candidateList}>
          {PLAYERS.map(p => {
            const isSelf = p === currentVoter;
            const assignedPts = roundVotes[p];
            return (
              <div key={p} style={{...s.candidateRow, ...(isSelf ? s.selfRow : {})}}>
                <div style={s.candidateInfo}>
                  <span style={{...s.candidateAvatar, ...(isSelf ? s.selfAvatar : {})}}>{p[0]}</span>
                  <span style={s.candidateName}>{p}{isSelf ? " (you)" : ""}</span>
                </div>
                <div style={s.voteButtons}>
                  {VOTE_OPTIONS.map(v => (
                    <button
                      key={v}
                      disabled={isSelf}
                      style={{...s.voteBtn, ...(assignedPts === v ? s.voteBtnActive[v] : {}), ...(isSelf ? s.voteBtnDisabled : {})}}
                      onClick={() => toggleVote(p, v)}
                    >{v}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <button
          style={{...s.submitBtn, ...(voteReady() ? {} : s.submitBtnDisabled)}}
          onClick={submitVote}
          disabled={!voteReady()}
        >
          {voteReady() ? "✓ SUBMIT VOTE" : "Assign 3, 2 & 1 points"}
        </button>
      </div>
    </div>
  );

  if (screen === "done") return (
    <div style={s.page}>
      <div style={s.bgPattern}/>
      <div style={s.doneWrap}>
        <div style={s.doneStar}>⭐</div>
        <h2 style={s.doneTitle}>Vote Submitted!</h2>
        <p style={s.doneSub}><strong>{currentVoter}</strong>'s votes for Round {currentRound} recorded.</p>
        <div style={s.doneVotes}>
          {Object.entries(roundVotes).sort((a,b) => b[1]-a[1]).map(([p,pts]) => (
            <div key={p} style={s.doneVoteRow}>
              <span style={s.donePoints}>{pts} pts</span>
              <span style={s.donePlayer}>{p}</span>
            </div>
          ))}
        </div>
        <button style={s.mainBtn} onClick={() => { setCurrentVoter(null); setRoundVotes({}); setScreen("select"); }}>Next Player</button>
        <button style={s.homeLink} onClick={() => { setCurrentVoter(null); setRoundVotes({}); setScreen("home"); }}>Back to Home</button>
      </div>
    </div>
  );

  if (screen === "results") {
    const results = getResults();
    const roundBreakdown = Array.from({length: TOTAL_ROUNDS}, (_, i) => i + 1).map(r => {
      const rData = votes[r] || {};
      const totals = {};
      PLAYERS.forEach(p => totals[p] = 0);
      Object.values(rData).forEach(ballot => {
        Object.entries(ballot).forEach(([p, pts]) => { totals[p] = (totals[p] || 0) + pts; });
      });
      return { round: r, totals, voterCount: Object.keys(rData).length };
    });
    const medals = ["🥇","🥈","🥉"];
    return (
      <div style={s.page}>
        <div style={s.bgPattern}/>
        <div style={s.resultsWrap}>
          <button style={s.backBtn} onClick={() => setScreen("home")}>← Home</button>
          <h2 style={s.resultsTitle}>📊 MVP RESULTS</h2>
          <p style={s.resultsSub}>All rounds combined</p>
          <div style={s.leaderboard}>
            {results.map(([player, total], idx) => (
              <div key={player} style={{...s.lbRow, ...(idx===0?s.lbFirst:idx===1?s.lbSecond:idx===2?s.lbThird:{})}}>
                <span style={s.lbRank}>{medals[idx] || idx+1}</span>
                <span style={s.lbAvatar}>{player[0]}</span>
                <span style={s.lbName}>{player}</span>
                <span style={s.lbTotal}>{total} pts</span>
              </div>
            ))}
          </div>
          <h3 style={s.breakdownTitle}>Round Breakdown</h3>
          <div style={s.breakdownTable}>
            <div style={s.breakdownHeader}>
              <span style={s.bhCell}>Rnd</span>
              {PLAYERS.map(p => <span key={p} style={s.bhCell}>{p.slice(0,4)}</span>)}
              <span style={s.bhCell}>Voted</span>
            </div>
            {roundBreakdown.map(({round, totals, voterCount}) => (
              <div key={round} style={s.breakdownRow}>
                <span style={s.bdCell}>{round}</span>
                {PLAYERS.map(p => (
                  <span key={p} style={{...s.bdCell, color: totals[p] > 0 ? "#ff9a3c" : "#555"}}>
                    {totals[p] || "—"}
                  </span>
                ))}
                <span style={s.bdCell}>{voterCount}/{PLAYERS.length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

const s = {
  page: { minHeight:"100vh",background:"#0a0d14",position:"relative",overflowX:"hidden",fontFamily:"'Bebas Neue','Impact',sans-serif" },
  bgPattern: { position:"fixed",inset:0,zIndex:0,pointerEvents:"none",background:`radial-gradient(ellipse at 10% 15%,rgba(162,89,255,0.18) 0%,transparent 50%),radial-gradient(ellipse at 90% 10%,rgba(255,75,120,0.14) 0%,transparent 45%),radial-gradient(ellipse at 80% 85%,rgba(0,210,180,0.12) 0%,transparent 50%),radial-gradient(ellipse at 20% 80%,rgba(74,158,255,0.10) 0%,transparent 45%)` },
  overlay: { position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 },
  pinBox: { background:"#121620",border:"2px solid #a259ff",borderRadius:16,padding:"40px 36px",width:320,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12,boxShadow:"0 0 40px rgba(162,89,255,0.2)" },
  pinIcon: { fontSize:40,marginBottom:4 },
  pinTitle: { fontSize:28,margin:0,letterSpacing:2 },
  pinSub: { color:"#888",fontSize:13,margin:0,fontFamily:"Georgia,serif",fontStyle:"italic" },
  pinInput: { width:"100%",padding:"14px",fontSize:28,textAlign:"center",background:"#0a0d14",border:"2px solid #a259ff",borderRadius:10,color:"#fff",letterSpacing:10,outline:"none",boxSizing:"border-box" },
  pinErr: { color:"#ff4b78",fontSize:13,margin:0,fontFamily:"Georgia,serif" },
  pinBtn: { width:"100%",padding:"14px",border:"none",borderRadius:10,fontSize:20,cursor:"pointer",color:"#fff",fontFamily:"'Bebas Neue',Impact,sans-serif",letterSpacing:2 },
  backLink: { background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:14,fontFamily:"Georgia,serif" },
  homeWrap: { position:"relative",zIndex:1,maxWidth:480,margin:"0 auto",padding:"40px 20px 60px",display:"flex",flexDirection:"column",alignItems:"center",gap:16 },
  badge: { background:"linear-gradient(135deg,#ff4b78,#ff9a3c)",color:"#fff",padding:"6px 18px",borderRadius:20,fontSize:13,letterSpacing:3,fontFamily:"Georgia,serif" },
  title: { color:"#fff",fontSize:72,lineHeight:1,margin:0,textAlign:"center",letterSpacing:4 },
  titleAccent: { background:"linear-gradient(135deg,#a259ff 0%,#ff4b78 50%,#ff9a3c 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:88 },
  subtitle: { color:"#666",fontSize:16,margin:0,letterSpacing:2,fontFamily:"Georgia,serif" },
  roundSelector: { width:"100%",background:"rgba(18,22,32,0.8)",border:"1px solid #1e2535",borderRadius:16,padding:20,marginTop:8 },
  roundLabel: { color:"#00d2b4",fontSize:13,letterSpacing:3,display:"block",marginBottom:12 },
  roundGrid: { display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8 },
  roundBtn: { padding:"12px 0",background:"#1a1f2e",border:"2px solid transparent",borderRadius:10,color:"#ccc",fontSize:18,cursor:"pointer",position:"relative",transition:"all 0.15s" },
  roundBtnActive: { background:"linear-gradient(135deg,#a259ff,#ff4b78)",color:"#fff",border:"2px solid transparent" },
  roundBtnFull: { borderColor:"#00d2b4",color:"#00d2b4" },
  roundCheck: { position:"absolute",top:2,right:4,fontSize:9,color:"#00d2b4" },
  mainBtn: { width:"100%",padding:"18px",background:"linear-gradient(135deg,#a259ff,#ff4b78)",border:"none",borderRadius:12,fontSize:24,cursor:"pointer",color:"#fff",letterSpacing:3,fontFamily:"'Bebas Neue',Impact,sans-serif",marginTop:8,boxShadow:"0 4px 20px rgba(162,89,255,0.35)" },
  resultsLink: { background:"none",border:"1px solid #2a3040",borderRadius:10,color:"#888",padding:"12px 24px",fontSize:15,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:1 },
  resetLink: { background:"none",border:"1px solid rgba(255,75,120,0.25)",borderRadius:10,color:"rgba(255,75,120,0.5)",padding:"10px 24px",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:1 },
  backBtn: { background:"none",border:"none",color:"#4a9eff",fontSize:14,cursor:"pointer",alignSelf:"flex-start",padding:"0 0 4px",letterSpacing:1,fontFamily:"'Bebas Neue',Impact,sans-serif" },
  roundPill: { background:"rgba(162,89,255,0.15)",border:"1px solid #a259ff",color:"#a259ff",padding:"3px 12px",borderRadius:20,fontSize:12,letterSpacing:3,display:"inline-block" },
  selectWrap: { position:"relative",zIndex:1,maxWidth:520,margin:"0 auto",padding:"30px 20px 60px",display:"flex",flexDirection:"column",gap:12 },
  selectTitle: { color:"#fff",fontSize:48,margin:0,letterSpacing:3 },
  selectSub: { color:"#666",fontSize:14,margin:0,fontFamily:"Georgia,serif",fontStyle:"italic" },
  playerGrid: { display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8 },
  playerCard: { background:"rgba(18,22,32,0.9)",border:"2px solid #1e2535",borderRadius:14,padding:"16px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",transition:"all 0.15s",position:"relative" },
  playerDone: { background:"rgba(0,210,180,0.06)",border:"2px solid #00d2b4",opacity:0.75,cursor:"not-allowed" },
  playerAvatar: { width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#a259ff,#ff4b78)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:"bold",lineHeight:"48px",textAlign:"center" },
  playerName: { color:"#fff",fontSize:20,letterSpacing:1 },
  doneTag: { position:"absolute",top:8,right:10,fontSize:11,color:"#00d2b4",fontFamily:"Georgia,serif" },
  voteCount: { color:"#555",fontSize:13,textAlign:"center",fontFamily:"Georgia,serif",marginTop:8 },
  voteWrap: { position:"relative",zIndex:1,maxWidth:560,margin:"0 auto",padding:"16px 16px 72px",display:"flex",flexDirection:"column",gap:6 },
  voteHeader: { display:"flex",flexDirection:"column",gap:2 },
  voteTitle: { color:"#fff",fontSize:22,margin:0,letterSpacing:1 },
  voterName: { background:"linear-gradient(135deg,#a259ff,#ff4b78)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" },
  voteSub: { color:"#666",fontSize:11,fontFamily:"Georgia,serif",fontStyle:"italic" },
  pointsGuide: { display:"flex",gap:8,marginTop:2 },
  pointsPill: { flex:1,background:"rgba(18,22,32,0.8)",border:"2px solid #1e2535",borderRadius:8,padding:"6px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"all 0.15s" },
  pointsPillDone: { border:"2px solid #a259ff",background:"rgba(162,89,255,0.12)" },
  pointsNum: { color:"#ff9a3c",fontSize:20 },
  pointsTxt: { color:"#aaa",fontSize:10,fontFamily:"Georgia,serif",textAlign:"center",letterSpacing:0.5 },
  candidateList: { display:"flex",flexDirection:"column",gap:4 },
  candidateRow: { background:"rgba(18,22,32,0.85)",borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",border:"2px solid transparent",transition:"all 0.15s" },
  selfRow: { opacity:0.35,border:"2px solid #1e2535" },
  candidateInfo: { display:"flex",alignItems:"center",gap:8 },
  candidateAvatar: { width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#4a9eff,#00d2b4)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,lineHeight:"28px",textAlign:"center",flexShrink:0 },
  selfAvatar: { background:"#2a2a2a",color:"#555" },
  candidateName: { color:"#fff",fontSize:15,letterSpacing:0.5 },
  voteButtons: { display:"flex",gap:6 },
  voteBtn: { width:36,height:36,borderRadius:8,border:"2px solid #2a3040",background:"#1a1f2e",color:"#666",fontSize:16,cursor:"pointer",transition:"all 0.15s",fontFamily:"'Bebas Neue',Impact,sans-serif" },
  voteBtnActive: {
    3: { background:"linear-gradient(135deg,#ff4b78,#ff9a3c)",color:"#fff",border:"2px solid #ff4b78" },
    2: { background:"linear-gradient(135deg,#a259ff,#4a9eff)",color:"#fff",border:"2px solid #a259ff" },
    1: { background:"linear-gradient(135deg,#00d2b4,#4a9eff)",color:"#fff",border:"2px solid #00d2b4" },
  },
  voteBtnDisabled: { opacity:0.25,cursor:"not-allowed" },
  submitBtn: { position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 40px)",maxWidth:520,padding:"18px",background:"linear-gradient(135deg,#a259ff,#ff4b78,#ff9a3c)",border:"none",borderRadius:14,fontSize:22,cursor:"pointer",color:"#fff",letterSpacing:3,fontFamily:"'Bebas Neue',Impact,sans-serif",zIndex:10,boxShadow:"0 4px 24px rgba(162,89,255,0.4)" },
  submitBtnDisabled: { background:"#1a1f2e",color:"#3a3a4a",cursor:"not-allowed",boxShadow:"none" },
  doneWrap: { position:"relative",zIndex:1,maxWidth:400,margin:"0 auto",padding:"60px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:16,textAlign:"center" },
  doneStar: { fontSize:72 },
  doneTitle: { background:"linear-gradient(135deg,#a259ff,#ff4b78)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:56,margin:0,letterSpacing:4 },
  doneSub: { color:"#aaa",fontSize:16,fontFamily:"Georgia,serif",fontStyle:"italic" },
  doneVotes: { background:"rgba(18,22,32,0.9)",border:"1px solid #1e2535",borderRadius:14,padding:"20px 30px",width:"100%",display:"flex",flexDirection:"column",gap:10,marginTop:8 },
  doneVoteRow: { display:"flex",alignItems:"center",gap:16 },
  donePoints: { background:"linear-gradient(135deg,#ff4b78,#ff9a3c)",color:"#fff",borderRadius:8,padding:"4px 14px",fontSize:22,minWidth:60,textAlign:"center" },
  donePlayer: { color:"#fff",fontSize:24,letterSpacing:1 },
  homeLink: { background:"none",border:"none",color:"#555",fontSize:15,cursor:"pointer",fontFamily:"Georgia,serif" },
  resultsWrap: { position:"relative",zIndex:1,maxWidth:700,margin:"0 auto",padding:"30px 20px 60px",display:"flex",flexDirection:"column",gap:16 },
  resultsTitle: { background:"linear-gradient(135deg,#a259ff,#ff4b78,#ff9a3c)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:52,margin:0,letterSpacing:4 },
  resultsSub: { color:"#666",fontSize:14,fontFamily:"Georgia,serif",fontStyle:"italic",marginTop:-8 },
  leaderboard: { display:"flex",flexDirection:"column",gap:8 },
  lbRow: { background:"rgba(18,22,32,0.85)",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,border:"2px solid transparent" },
  lbFirst: { border:"2px solid #ff4b78",background:"rgba(255,75,120,0.08)",boxShadow:"0 0 20px rgba(255,75,120,0.15)" },
  lbSecond: { border:"2px solid #a259ff",background:"rgba(162,89,255,0.08)" },
  lbThird: { border:"2px solid #00d2b4",background:"rgba(0,210,180,0.06)" },
  lbRank: { fontSize:24,width:32,textAlign:"center" },
  lbAvatar: { width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#a259ff,#ff4b78)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,lineHeight:"40px",textAlign:"center",flexShrink:0 },
  lbName: { color:"#fff",fontSize:26,letterSpacing:2,flex:1 },
  lbTotal: { background:"linear-gradient(135deg,#ff9a3c,#ff4b78)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:26,letterSpacing:1 },
  breakdownTitle: { color:"#fff",fontSize:28,margin:"8px 0 0",letterSpacing:3 },
  breakdownTable: { overflowX:"auto",background:"rgba(18,22,32,0.85)",border:"1px solid #1e2535",borderRadius:14,padding:"4px" },
  breakdownHeader: { display:"flex",borderBottom:"2px solid #1e2535",padding:"8px 0" },
  bhCell: { flex:1,minWidth:44,color:"#a259ff",fontSize:11,textAlign:"center",letterSpacing:1,padding:"4px 2px",fontFamily:"Georgia,serif" },
  breakdownRow: { display:"flex",borderBottom:"1px solid #1a1f2e",padding:"6px 0" },
  bdCell: { flex:1,minWidth:44,color:"#aaa",fontSize:13,textAlign:"center",padding:"4px 2px",fontFamily:"Georgia,serif" },
};
