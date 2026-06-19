<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<!-- Replace __API_URL__ with your render backend URL when deploying to Vercel -->
<meta name="iqac-api-url" content="https://iqac-backend-fb98.onrender.com">
<title>IQAC Portal</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<style>
:root{
  --bg:#eef2f9;--bg2:#fff;--bg3:#f4f6fc;--card:#fff;
  --border:rgba(0,0,0,0.09);--border2:rgba(0,0,0,0.14);
  --text:#1a2035;--text2:#4e5d78;--text3:#94a3b8;
  --accent:#3b6ef5;--accent2:#6c4ef5;--accent3:#10b981;
  --warn:#f59e0b;--danger:#ef4444;--success:#22c55e;
  --shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05);
  --r:12px;--r2:8px;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
/* ═══ AUTH SCREENS ═══ */
.auth-wrap{display:none;min-height:100vh}

/* LOGIN: full split layout */
#scr-login{display:none}
#scr-login.show{
  display:grid !important;
  grid-template-columns:58% 42%;
  min-height:100vh;
}

/* ── LEFT PANEL ── */
.auth-left{
  background:linear-gradient(160deg,#0a3d35 0%,#0f6b5e 40%,#148f75 70%,#1abc9c 100%);
  display:flex;flex-direction:column;justify-content:space-between;
  padding:52px 56px;position:relative;overflow:hidden;min-height:100vh;
}
.auth-left::before{
  content:'';position:absolute;top:-100px;right:-100px;width:400px;height:400px;
  border-radius:50%;background:rgba(255,255,255,.05);z-index:0;
}
.auth-left::after{
  content:'';position:absolute;bottom:-60px;left:-60px;width:300px;height:300px;
  border-radius:50%;background:rgba(0,0,0,.08);z-index:0;
}
.al-header{position:relative;z-index:1;display:flex;align-items:center;gap:18px;margin-bottom:48px}
.al-hkbk-logo{width:70px;height:70px;border-radius:50%;object-fit:contain;padding:6px;
  background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.3);flex-shrink:0;
  box-shadow:0 4px 20px rgba(0,0,0,.25);}
.al-college-name{font-family:'Outfit',sans-serif;font-size:20px;font-weight:700;color:#fff;line-height:1.25;text-shadow:0 2px 8px rgba(0,0,0,.3)}
.al-college-sub{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;letter-spacing:.04em}
.al-mid{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center;padding:20px 0}
.al-iqac-label{font-size:10.5px;font-weight:700;color:rgba(127,255,212,.7);letter-spacing:.2em;text-transform:uppercase;margin-bottom:14px}
.al-main-title{font-family:'Outfit',sans-serif;font-size:48px;font-weight:800;color:#fff;line-height:1.05;margin-bottom:8px;text-shadow:0 4px 24px rgba(0,0,0,.3)}
.al-main-sub{font-family:'Outfit',sans-serif;font-size:22px;font-weight:400;color:rgba(127,255,212,.85);margin-bottom:20px}
.al-desc{font-size:14px;color:rgba(255,255,255,.6);line-height:1.8;max-width:380px;margin-bottom:36px}
.al-pills{display:flex;flex-wrap:wrap;gap:9px}
.al-pill{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:50px;
  padding:7px 16px;font-size:12px;color:rgba(255,255,255,.85);backdrop-filter:blur(6px)}
.al-bottom{position:relative;z-index:1}
.al-quote-block{border-left:3px solid rgba(127,255,212,.6);padding:16px 20px;
  background:rgba(255,255,255,.07);border-radius:0 10px 10px 0;margin-bottom:24px}
.al-quote-block p{font-size:13px;color:rgba(255,255,255,.75);font-style:italic;line-height:1.65;margin-bottom:6px}
.al-quote-block cite{font-size:11px;color:rgba(127,255,212,.8);font-style:normal;font-weight:600}
.al-dev{font-size:11px;color:rgba(255,255,255,.4);line-height:1.7}
.al-dev strong{color:rgba(255,255,255,.75);font-size:13px;display:block}
.al-dev span{color:rgba(127,255,212,.7)}

/* ── RIGHT PANEL ── */
.auth-right{
  background:#fafffe;display:flex;align-items:center;justify-content:center;
  padding:52px 48px;position:relative;overflow:hidden;
}
.auth-right::before{
  content:'';position:absolute;inset:0;
  background-image:radial-gradient(circle,rgba(17,122,101,.06) 1.5px,transparent 1.5px);
  background-size:28px 28px;pointer-events:none;
}
.auth-right::after{
  content:'';position:absolute;bottom:-80px;right:-80px;
  width:260px;height:260px;border-radius:50%;
  background:radial-gradient(circle,rgba(26,188,156,.1),transparent 70%);
}

/* RIGHT FORM CARD */
.auth-right .abox{
  background:#fff;border:1px solid rgba(17,122,101,.12);border-radius:20px;
  padding:40px 40px;width:100%;max-width:390px;z-index:1;position:relative;
  box-shadow:0 8px 40px rgba(17,122,101,.1),0 2px 8px rgba(0,0,0,.04);
  max-height:none;overflow-y:visible;
}
.auth-right .alogo{display:none}
.ar-eyebrow{font-size:10.5px;font-weight:700;color:#1abc9c;letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px}
.auth-right .atitle{font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;color:#0a3d35;margin-bottom:6px}
.auth-right .asub{font-size:13px;color:#64748b;margin-bottom:26px;line-height:1.65}
.auth-right .fg input:focus,.auth-right .fg select:focus{
  border-color:#0f6b5e;box-shadow:0 0 0 3px rgba(15,107,94,.1);background:#fff}
.auth-right .btn-pri{
  background:linear-gradient(135deg,#0f6b5e 0%,#1abc9c 100%);
  box-shadow:0 4px 20px rgba(15,107,94,.35);
}
.auth-right .btn-pri:hover{
  background:linear-gradient(135deg,#0a5549 0%,#17a589 100%);
  transform:translateY(-1px);box-shadow:0 6px 28px rgba(15,107,94,.4);
}
.auth-right .aswitch a{color:#0f6b5e}

/* OTHER SCREENS (register/forgot/reset) */
#scr-register.show,#scr-forgot.show,#scr-reset.show{
  display:flex !important;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#d8e8f8 0%,#e4dcf8 100%);
}
.abox{background:#fff;border:1px solid var(--border2);border-radius:20px;padding:40px 44px;
  width:480px;z-index:1;position:relative;box-shadow:0 8px 48px rgba(59,110,245,.13);
  max-height:93vh;overflow-y:auto;scrollbar-width:thin}

@media(max-width:860px){
  #scr-login.show{grid-template-columns:1fr !important}
  .auth-left{display:none !important}
  .auth-right{padding:36px 24px}
}
.alogo{display:flex;align-items:center;gap:11px;margin-bottom:22px}
.lico{width:40px;height:40px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
.alogo h1{font-family:'Outfit',sans-serif;font-size:18px;font-weight:700;color:var(--text)}
.alogo p{font-size:10px;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
.atitle{font-size:22px;font-weight:700;margin-bottom:3px;font-family:'Outfit',sans-serif}
.asub{font-size:12.5px;color:var(--text2);margin-bottom:18px}
.fg{margin-bottom:13px;position:relative}
.fg label{display:block;font-size:10.5px;font-weight:700;color:var(--text2);margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
.fg input,.fg select{width:100%;background:#f4f6fc;border:1px solid var(--border2);border-radius:var(--r2);padding:9px 13px;color:var(--text);font-family:inherit;font-size:13px;outline:none;transition:border-color .2s,background .2s}
.fg input:focus,.fg select:focus{border-color:var(--accent);background:#fff}
.fg select option{background:#fff}
.fg-row{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:13px}
.fg-row .fg{margin-bottom:0}
.ferr{font-size:11px;color:var(--danger);margin-top:3px;display:none}
.ferr.on{display:block}
.inp-err{border-color:var(--danger)!important}
.pmeter{height:3px;border-radius:2px;background:#e5e7eb;margin-top:5px;overflow:hidden}
.pmbar{height:100%;border-radius:2px;transition:width .3s,background .3s}
.phint{font-size:10.5px;color:var(--text3);margin-top:3px}
.adiv{font-size:10.5px;font-weight:700;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;padding:12px 0 8px;border-bottom:1px solid var(--border);margin-bottom:12px}
.gerr{background:#fef2f2;border:1px solid #fca5a5;border-radius:7px;padding:8px 12px;font-size:12px;color:#991b1b;margin-bottom:10px;display:none}
.gerr.on{display:block}
.gok{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:7px;padding:8px 12px;font-size:12px;color:#065f46;margin-bottom:10px;display:none}
.gok.on{display:block}
.btn-pri{width:100%;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:var(--r2);padding:11px;color:#fff;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:transform .15s,box-shadow .15s;margin-top:4px}
.btn-pri:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,110,245,.32)}
.btn-pri:disabled{opacity:.6;cursor:not-allowed;transform:none}
.aswitch{text-align:center;margin-top:15px;font-size:12.5px;color:var(--text3)}
.aswitch a{color:var(--accent);cursor:pointer;font-weight:600}
/* APP */
#app{display:none;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;height:100vh;width:242px;background:#fff;border-right:1px solid var(--border);display:flex;flex-direction:column;z-index:100;box-shadow:2px 0 10px rgba(0,0,0,.05)}
.sbl{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:9px}
.sbl .lico{width:32px;height:32px;font-size:14px}
.sbl span{font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:var(--text)}
.snav{flex:1;padding:10px 9px;overflow-y:auto;scrollbar-width:thin}
.ns{font-size:9.5px;font-weight:700;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;padding:9px 8px 4px;margin-top:3px}
.ni{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--r2);cursor:pointer;transition:background .15s,color .15s;font-size:12.5px;font-weight:500;color:var(--text2);margin-bottom:1px}
.ni:hover{background:#eef2ff;color:var(--accent)}
.ni.active{background:#eef2ff;color:var(--accent);font-weight:600}
.ni svg{flex-shrink:0;opacity:.7}
.ni.active svg{opacity:1}
.ndot{display:none;width:6px;height:6px;border-radius:50%;background:var(--danger);margin-left:4px;vertical-align:middle}
.sfoot{padding:12px 15px;border-top:1px solid var(--border)}
.ubadge{display:flex;align-items:center;gap:8px}
.uav{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;color:#fff}
.uname{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;color:var(--text)}
.urole{font-size:10px;color:var(--text3)}
.lbtn{background:none;border:none;color:var(--text3);cursor:pointer;padding:3px;border-radius:5px;transition:color .15s}
.lbtn:hover{color:var(--danger)}
.main{margin-left:242px;min-height:100vh;padding:24px 28px;background:var(--bg)}
.page{display:none}
.page.active{display:block}
.ph{margin-bottom:20px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px}
.ph h2{font-family:'Outfit',sans-serif;font-size:22px;font-weight:700;margin-bottom:2px;color:var(--text)}
.ph p{color:var(--text2);font-size:12.5px}
.ph-act{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
/* CARDS */
.sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.scard{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;position:relative;overflow:hidden;box-shadow:var(--shadow)}
.scard::after{content:'';position:absolute;top:-16px;right:-16px;width:60px;height:60px;border-radius:50%;opacity:.07}
.sc-b::after{background:var(--accent)}.sc-g::after{background:var(--accent3)}.sc-p::after{background:var(--accent2)}.sc-w::after{background:var(--warn)}
.slbl{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.sval{font-size:24px;font-weight:700;font-family:'Outfit',sans-serif;line-height:1;color:var(--text)}
.ssub{font-size:11px;color:var(--text3);margin-top:4px}
.sico{position:absolute;top:14px;right:14px;opacity:.22}
.card{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:20px;box-shadow:var(--shadow)}
.dg{display:grid;grid-template-columns:1.4fr 1fr;gap:15px;margin-bottom:18px}
.cw{position:relative;height:250px}
.dtbl{width:100%;border-collapse:collapse}
.dtbl th{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;padding:6px 9px;border-bottom:1px solid var(--border);text-align:left}
.dtbl td{font-size:12px;padding:7px 9px;border-bottom:1px solid var(--border);color:var(--text2)}
.dtbl td:first-child{color:var(--text);font-weight:500}
.dtbl tr:hover td{background:#f8faff}
/* PILLS */
.pill{display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px}
.pb{background:#dbeafe;color:#1d4ed8}.pg{background:#dcfce7;color:#15803d}.pw{background:#fef9c3;color:#a16207}.pr{background:#fee2e2;color:#b91c1c}.pp{background:#f3e8ff;color:#7e22ce}.pt{background:#ccfbf1;color:#0f766e}
.sbadge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px}
.sbadge::before{content:'';width:4px;height:4px;border-radius:50%;display:inline-block;flex-shrink:0}
.sb-ok{background:#dcfce7;color:#166534}.sb-ok::before{background:#16a34a}
.sb-pend{background:#fef9c3;color:#92400e}.sb-pend::before{background:#d97706}
.sb-rej{background:#fee2e2;color:#991b1b}.sb-rej::before{background:#dc2626}
/* FLOW */
.fwrap{display:flex;align-items:center;margin:10px 0 18px}
.fstep{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
.fdot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid transparent}
.fd-done{background:#dcfce7;border-color:#16a34a;color:#166534}
.fd-act{background:#dbeafe;border-color:var(--accent);color:var(--accent)}
.fd-pend{background:#f3f4f6;border-color:#d1d5db;color:#9ca3af}
.flbl{font-size:9.5px;font-weight:600;color:var(--text3);text-align:center;line-height:1.3}
.fline{flex:1;height:2px;background:#e5e7eb;margin-bottom:18px;max-width:32px}
.fl-done{background:#16a34a}
/* FORMS */
.fsec{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-bottom:14px;box-shadow:var(--shadow)}
.fsec h3{font-size:13px;font-weight:700;margin-bottom:13px;display:flex;align-items:center;gap:7px;color:var(--text);padding-bottom:9px;border-bottom:1px solid var(--border)}
.fr{display:grid;gap:12px;margin-bottom:12px}
.c1{grid-template-columns:1fr}.c2{grid-template-columns:1fr 1fr}.c3{grid-template-columns:1fr 1fr 1fr}
.f label{display:block;font-size:10px;font-weight:700;color:var(--text2);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em}
.f input,.f select,.f textarea{width:100%;background:#f4f6fc;border:1px solid var(--border2);border-radius:var(--r2);padding:8px 11px;color:var(--text);font-family:inherit;font-size:12.5px;outline:none;transition:border-color .2s,background .2s}
.f input:focus,.f select:focus,.f textarea:focus{border-color:var(--accent);background:#fff}
.f select option{background:#fff}
.f textarea{resize:vertical;min-height:70px}
.uz{border:2px dashed #c7d2e8;border-radius:var(--r2);padding:13px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;position:relative;min-height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#fafbfd}
.uz:hover{border-color:var(--accent);background:#eef2ff}
.uz input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.uz p{color:var(--text3);font-size:11.5px;pointer-events:none}
/* BUTTONS */
.btn-sub{background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:var(--r2);padding:9px 22px;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:transform .15s,box-shadow .15s}
.btn-sub:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(59,110,245,.28)}
.btn-sub:disabled{opacity:.6;cursor:not-allowed;transform:none}
.btn-out{background:#fff;border:1px solid var(--border2);border-radius:var(--r2);padding:8px 15px;color:var(--text2);font-family:inherit;font-size:12.5px;font-weight:500;cursor:pointer;transition:border-color .2s,color .2s}
.btn-out:hover{border-color:var(--accent);color:var(--accent)}
.btn-xl{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:var(--r2);padding:6px 13px;color:#059669;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.btn-xl:hover{background:#d1fae5}
.btn-wd{background:#eff6ff;border:1px solid #93c5fd;border-radius:var(--r2);padding:6px 13px;color:#2563eb;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.btn-wd:hover{background:#dbeafe}
.btn-vd{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:6px;padding:4px 10px;color:#7c3aed;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px}
.btn-vd:hover{background:#ede9fe}
.btn-edit{background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:4px 10px;color:#2563eb;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px}
.btn-edit:hover{background:#dbeafe}
.btn-del{background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:4px 10px;color:#dc2626;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px}
.btn-del:hover{background:#fee2e2}
.btn-app{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:6px;padding:4px 11px;color:#059669;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
.btn-app:hover{background:#d1fae5}
.btn-rej{background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:4px 11px;color:#dc2626;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
.btn-rej:hover{background:#fee2e2}
.fac-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px;padding-top:9px;border-top:1px solid var(--border)}
/* TABLES */
.tbl{width:100%;border-collapse:collapse}
.tbl th{font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;padding:8px 11px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap;background:#f8faff}
.tbl td{font-size:12px;padding:9px 11px;border-bottom:1px solid var(--border);vertical-align:middle;color:var(--text2)}
.tbl td.b{color:var(--text);font-weight:500}
.tbl tr:hover td{background:#f8faff}
/* FACULTY GRID */
.fgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.fc{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:16px;transition:border-color .2s,box-shadow .2s;box-shadow:var(--shadow)}
.fc:hover{border-color:#93c5fd;box-shadow:0 4px 20px rgba(59,110,245,.1)}
.fcav{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;margin-bottom:8px;color:#fff}
.fcname{font-size:13px;font-weight:700;margin-bottom:1px;color:var(--text)}
.fcdept{font-size:11px;color:var(--accent);margin-bottom:7px;font-weight:600}
.fcmeta{font-size:11px;color:var(--text3);line-height:1.9}
.fcdocs{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}
/* STABS */
.stabs{display:flex;gap:2px;margin-bottom:16px;background:#eef2f9;border:1px solid var(--border);border-radius:8px;padding:3px;width:fit-content}
.stab{padding:5px 13px;border-radius:6px;border:none;background:transparent;color:var(--text2);font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:background .15s,color .15s}
.stab.active{background:#fff;color:var(--accent);box-shadow:0 1px 5px rgba(0,0,0,.1);font-weight:600}
/* MISC */
.sbar{display:flex;align-items:center;gap:7px;background:#f4f6fc;border:1px solid var(--border2);border-radius:var(--r2);padding:6px 11px;width:210px}
.sbar input{background:none;border:none;color:var(--text);font-family:inherit;font-size:12.5px;outline:none;flex:1}
.ib{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:9px 13px;margin-bottom:14px;display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#3730a3}
.empty{text-align:center;padding:42px 24px;color:var(--text3)}
.empty svg{margin:0 auto 10px;display:block;opacity:.22}
.empty p{font-size:13.5px;font-weight:600;color:var(--text2);margin-bottom:3px}
.empty span{font-size:12px}
.si{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-radius:8px;border:1px solid var(--border);background:#fafbfd;margin-bottom:7px}
.si:hover{background:#f0f4ff;border-color:#c7d2fe}
.si-name{font-size:12.5px;font-weight:600;color:var(--text);flex:1;min-width:0;margin-right:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.si-meta{font-size:10.5px;color:var(--text3);margin-top:2px}
/* TOAST */
.toast{position:fixed;bottom:22px;right:22px;background:#fff;border:1px solid var(--border2);border-radius:9px;padding:10px 15px;font-size:12.5px;font-weight:600;z-index:9999;transform:translateY(70px);opacity:0;transition:transform .3s,opacity .3s;display:flex;align-items:center;gap:7px;max-width:290px;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.12)}
.toast.show{transform:translateY(0);opacity:1}
.toast.success{border-color:#6ee7b7;color:#065f46}.toast.warn{border-color:#fcd34d;color:#92400e}.toast.error{border-color:#fca5a5;color:#991b1b}
/* LOADING SPINNER */
.spinner-overlay{position:fixed;inset:0;background:rgba(238,242,249,.8);z-index:8000;display:none;align-items:center;justify-content:center}
.spinner-overlay.show{display:flex}
.spinner{width:40px;height:40px;border:3px solid #dbeafe;border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
/* MODALS */
.moverlay{position:fixed;inset:0;background:rgba(15,20,40,.45);z-index:500;display:flex;align-items:center;justify-content:center}
.mbox{background:#fff;border-radius:16px;padding:26px;width:520px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 12px 48px rgba(0,0,0,.18)}
.mbox h3{font-size:16px;font-weight:700;margin-bottom:3px;color:var(--text)}
.msub{font-size:12.5px;color:var(--text2);margin-bottom:16px}
.dlist{display:flex;flex-direction:column;gap:7px}
.ditem{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;background:#f8faff;border:1px solid var(--border);border-radius:8px}
.ditem-name{font-size:12.5px;font-weight:600;color:var(--text)}
.ditem-tag{font-size:10.5px;color:var(--text3);margin-top:1px}
.mbtn{background:#f3f4f6;border:1px solid var(--border);border-radius:7px;padding:7px 16px;color:var(--text2);font-family:inherit;font-size:12.5px;cursor:pointer;margin-top:16px;font-weight:500}
.mbtn:hover{background:#e5e7eb}
/* FAC STATS */
.fsgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
.fscard{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:15px 17px;box-shadow:var(--shadow)}
.fsval{font-size:28px;font-weight:700;font-family:'Outfit',sans-serif;color:var(--text)}
.fslbl{font-size:10px;color:var(--text3);margin-top:3px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
@media(max-width:1000px){.sgrid{grid-template-columns:repeat(2,1fr)}.dg{grid-template-columns:1fr}.fgrid{grid-template-columns:repeat(2,1fr)}.c3{grid-template-columns:1fr 1fr}}


/* ═════════ PREMIUM IQAC LOGIN THEME - layout only ═════════ */
#scr-login.show{
  display:grid !important;
  grid-template-columns:minmax(560px,1.15fr) minmax(420px,.85fr);
  min-height:100vh;
  background:
    radial-gradient(circle at 12% 18%, rgba(16,185,129,.24), transparent 34%),
    radial-gradient(circle at 88% 82%, rgba(59,130,246,.22), transparent 36%),
    linear-gradient(135deg,#102949 0%,#17446f 42%,#188a7a 100%);
  position:relative;
  overflow:hidden;
}
#scr-login.show::before{
  content:'';position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size:42px 42px;
  mask-image:linear-gradient(90deg,rgba(0,0,0,.9),rgba(0,0,0,.35));
  pointer-events:none;
}
#scr-login.show::after{
  content:'';position:absolute;width:620px;height:620px;border-radius:50%;
  right:-220px;top:-240px;background:rgba(255,255,255,.08);filter:blur(2px);pointer-events:none;
}
#scr-login .auth-left{
  background:transparent !important;
  padding:54px 64px 50px;
  min-height:100vh;
  justify-content:space-between;
}
#scr-login .auth-left::before{
  width:360px;height:360px;top:12%;right:8%;
  background:radial-gradient(circle,rgba(255,255,255,.14),transparent 68%);
  border:1px solid rgba(255,255,255,.12);
}
#scr-login .auth-left::after{
  width:240px;height:240px;left:7%;bottom:9%;
  background:radial-gradient(circle,rgba(16,185,129,.20),transparent 70%);
}
#scr-login .al-header{
  background:rgba(255,255,255,.09);
  border:1px solid rgba(255,255,255,.16);
  border-radius:22px;
  padding:14px 16px;
  width:max-content;
  max-width:100%;
  backdrop-filter:blur(16px);
  box-shadow:0 18px 60px rgba(0,0,0,.16);
}
#scr-login .al-hkbk-logo{
  width:62px;height:62px;background:#fff;border:0;padding:7px;
  box-shadow:0 14px 34px rgba(0,0,0,.22);
}
#scr-login .al-college-name{font-size:19px;letter-spacing:.01em}
#scr-login .al-college-sub{color:rgba(226,252,245,.76)}
#scr-login .al-mid{max-width:680px;padding-top:10px}
#scr-login .al-iqac-label{
  display:inline-flex;align-items:center;gap:9px;width:max-content;
  background:rgba(16,185,129,.14);border:1px solid rgba(110,231,183,.28);
  padding:8px 14px;border-radius:999px;color:#b7fff0;letter-spacing:.18em;
  box-shadow:0 10px 34px rgba(16,185,129,.12);
}
#scr-login .al-iqac-label::before{content:'✦';font-size:12px;color:#67e8f9;letter-spacing:0}
#scr-login .al-main-title{
  font-size:76px;line-height:.9;margin-top:22px;margin-bottom:8px;
  letter-spacing:-.055em;
  background:linear-gradient(90deg,#fff 0%,#dffcf5 50%,#8be9ff 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:none;
}
#scr-login .al-main-sub{font-size:30px;font-weight:700;color:#d1fae5;letter-spacing:-.02em;margin-bottom:18px}
#scr-login .al-desc{font-size:15px;color:rgba(241,245,249,.74);max-width:560px;line-height:1.8;margin-bottom:30px}
#scr-login .al-pills{display:grid;grid-template-columns:repeat(2,minmax(190px,1fr));gap:12px;max-width:560px}
#scr-login .al-pill{
  display:flex;align-items:center;min-height:52px;
  background:rgba(255,255,255,.105);
  border:1px solid rgba(255,255,255,.18);
  border-radius:16px;padding:12px 15px;
  color:rgba(255,255,255,.92);font-weight:600;
  box-shadow:0 12px 38px rgba(0,0,0,.12);
}
#scr-login .al-quote-block{
  max-width:620px;border-left:0;border-radius:20px;
  background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.16);
  padding:18px 22px;backdrop-filter:blur(14px);
}
#scr-login .al-quote-block p{font-size:13.5px;color:rgba(255,255,255,.82)}
#scr-login .al-quote-block cite{color:#a7f3d0}
#scr-login .al-dev{padding-left:6px;color:rgba(255,255,255,.55)}
#scr-login .al-dev strong{font-size:13.5px;color:#fff}
#scr-login .al-dev span{color:#9cf4d9}
#scr-login .auth-right{
  background:rgba(255,255,255,.12) !important;
  min-height:100vh;
  padding:48px;
  backdrop-filter:blur(22px);
  border-left:1px solid rgba(255,255,255,.16);
}
#scr-login .auth-right::before{
  background:
    radial-gradient(circle at 50% 18%,rgba(255,255,255,.26),transparent 32%),
    linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.02));
}
#scr-login .auth-right::after{
  width:340px;height:340px;right:-130px;bottom:-120px;
  background:radial-gradient(circle,rgba(20,184,166,.30),transparent 70%);
}
#scr-login .auth-right .abox{
  max-width:430px;width:100%;border-radius:28px;
  padding:42px 42px 36px;
  background:rgba(255,255,255,.94);
  border:1px solid rgba(255,255,255,.72);
  box-shadow:0 30px 90px rgba(2,6,23,.28), inset 0 1px 0 rgba(255,255,255,.9);
  overflow:hidden;
}
#scr-login .auth-right .abox::before{
  content:'';position:absolute;left:0;right:0;top:0;height:6px;
  background:linear-gradient(90deg,#0f766e,#22c55e,#3b82f6);
}
#scr-login .ar-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;
  padding:7px 12px;border-radius:999px;margin-bottom:16px;letter-spacing:.12em;
}
#scr-login .ar-eyebrow::before{content:'●';font-size:8px;color:#22c55e}
#scr-login .auth-right .atitle{font-size:31px;color:#071c2f;letter-spacing:-.03em;margin-bottom:8px}
#scr-login .auth-right .asub{font-size:13.5px;color:#64748b;margin-bottom:24px}
#scr-login .auth-right .fg{margin-bottom:16px}
#scr-login .auth-right .fg label{color:#334155;font-size:10px;letter-spacing:.09em}
#scr-login .auth-right .fg input,
#scr-login .auth-right .fg select{
  background:#f8fafc;border:1px solid #dbe5ef;border-radius:14px;
  padding:12px 14px;font-size:13.5px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.75);
}
#scr-login .auth-right .fg input:focus,
#scr-login .auth-right .fg select:focus{
  background:#fff;border-color:#0f766e;box-shadow:0 0 0 4px rgba(15,118,110,.12);
}
#scr-login .auth-right .btn-pri{
  border-radius:15px;padding:13px 16px;font-size:14px;font-weight:800;
  background:linear-gradient(135deg,#064e3b 0%,#0f766e 45%,#2563eb 100%);
  box-shadow:0 16px 34px rgba(15,118,110,.32);
}
#scr-login .auth-right .btn-pri:hover{box-shadow:0 20px 42px rgba(15,118,110,.38);transform:translateY(-2px)}
#scr-login .auth-right .aswitch{margin-top:18px;color:#64748b}
#scr-login .auth-right .aswitch a{color:#0f766e;font-weight:800}
#scr-login #li-ge{border-radius:14px;padding:10px 12px}
#scr-login #li-pw + a{color:#0f766e!important;top:2px!important}
@media(max-width:980px){
  #scr-login.show{grid-template-columns:1fr!important;background:linear-gradient(135deg,#06172f,#0f766e)}
  #scr-login .auth-left{display:none!important}
  #scr-login .auth-right{padding:28px 20px;border-left:0;background:transparent!important}
  #scr-login .auth-right .abox{max-width:460px;padding:34px 26px}
}
/* ═════════ END PREMIUM IQAC LOGIN THEME ═════════ */


/* === FINAL VIEWPORT FIT OVERRIDE - login only === */
html,body{height:100%;}
#scr-login.show{
  height:100vh !important;
  min-height:100vh !important;
  overflow:hidden !important;
  grid-template-columns:minmax(540px,1.12fr) minmax(410px,.88fr) !important;
}
#scr-login .auth-left{
  min-height:100vh !important;
  height:100vh !important;
  padding:30px 52px 26px !important;
}
#scr-login .auth-right{
  min-height:100vh !important;
  height:100vh !important;
  padding:28px 36px !important;
}
#scr-login .al-header{
  margin-bottom:16px !important;
  padding:10px 13px !important;
  border-radius:18px !important;
}
#scr-login .al-hkbk-logo{
  width:52px !important;
  height:52px !important;
}
#scr-login .al-college-name{
  font-size:17px !important;
  line-height:1.15 !important;
}
#scr-login .al-college-sub{
  font-size:10px !important;
  margin-top:2px !important;
}
#scr-login .al-mid{
  padding:4px 0 !important;
  justify-content:center !important;
}
#scr-login .al-iqac-label{
  font-size:9px !important;
  padding:6px 11px !important;
  margin-bottom:8px !important;
}
#scr-login .al-main-title{
  font-size:56px !important;
  line-height:.9 !important;
  margin-top:10px !important;
  margin-bottom:5px !important;
}
#scr-login .al-main-sub{
  font-size:23px !important;
  margin-bottom:8px !important;
}
#scr-login .al-desc{
  font-size:13px !important;
  line-height:1.45 !important;
  margin-bottom:14px !important;
  max-width:560px !important;
}
#scr-login .al-pills{
  gap:7px !important;
  max-width:540px !important;
}
#scr-login .al-pill{
  min-height:38px !important;
  padding:8px 12px !important;
  font-size:11px !important;
  border-radius:13px !important;
}
#scr-login .al-quote-block{
  padding:10px 15px !important;
  margin-bottom:10px !important;
  border-radius:15px !important;
}
#scr-login .al-quote-block p{
  font-size:11.5px !important;
  line-height:1.35 !important;
  margin-bottom:3px !important;
}
#scr-login .al-quote-block cite{
  font-size:10.5px !important;
}
#scr-login .al-dev{
  font-size:10px !important;
  line-height:1.35 !important;
}
#scr-login .al-dev strong{
  font-size:12px !important;
}
#scr-login .auth-right .abox{
  max-width:405px !important;
  padding:28px 32px 24px !important;
  border-radius:24px !important;
}
#scr-login .ar-eyebrow{
  font-size:9px !important;
  padding:6px 10px !important;
  margin-bottom:10px !important;
}
#scr-login .auth-right .atitle{
  font-size:26px !important;
  margin-bottom:5px !important;
}
#scr-login .auth-right .asub{
  font-size:12px !important;
  line-height:1.4 !important;
  margin-bottom:14px !important;
}
#scr-login .auth-right .fg{
  margin-bottom:10px !important;
}
#scr-login .auth-right .fg label{
  font-size:9px !important;
  margin-bottom:4px !important;
}
#scr-login .auth-right .fg input,
#scr-login .auth-right .fg select{
  padding:9px 12px !important;
  font-size:12.5px !important;
  border-radius:12px !important;
}
#scr-login .auth-right .btn-pri{
  padding:11px 14px !important;
  border-radius:13px !important;
}
#scr-login .auth-right .aswitch{
  margin-top:10px !important;
  font-size:12px !important;
}
@media(max-height:700px){
  #scr-login .al-desc{display:none !important;}
  #scr-login .al-quote-block{display:none !important;}
  #scr-login .al-main-title{font-size:48px !important;}
  #scr-login .al-pills{grid-template-columns:repeat(2,minmax(160px,1fr)) !important;}
}


/* Keep HKBK College of Engineering in one full line */
#scr-login .al-header{
  width:auto !important;
  min-width:520px !important;
  max-width:720px !important;
}
#scr-login .al-college-name{
  white-space:nowrap !important;
  overflow:visible !important;
  text-overflow:clip !important;
}
@media(max-width:980px){
  #scr-login .al-header{min-width:0 !important;}
  #scr-login .al-college-name{white-space:normal !important;}
}


/* Final requested login corrections */
#scr-login .al-header{
  width:max-content !important;
  min-width:720px !important;
  max-width:calc(100vw - 820px) !important;
}
#scr-login .al-college-name{
  white-space:nowrap !important;
  font-size:20px !important;
  line-height:1.1 !important;
}
#scr-login .al-iqac-label{
  font-size:12px !important;
  padding:7px 15px !important;
  margin-bottom:8px !important;
}
#scr-login .al-main-title{
  margin-top:6px !important;
}
#scr-login .al-main-sub{
  margin-top:8px !important;
}
#scr-login .al-desc{
  margin-top:14px !important;
}
#scr-login .al-pills{
  margin-top:6px !important;
}
#scr-login .al-quote-block{
  margin-top:14px !important;
}
#scr-login .al-quote-block p{
  font-size:15px !important;
  line-height:1.55 !important;
}
#scr-login .al-quote-block cite{
  font-size:12.5px !important;
}
@media(max-width:980px){
  #scr-login .al-header{min-width:0 !important;max-width:100% !important;}
  #scr-login .al-college-name{white-space:normal !important;}
}

/* Formats tab */
#formats-list .btn-vd,
#formats-list .btn-del{margin-right:6px}


/* Formats upload visibility */
#formats-upload-card{
  border:1px solid #bfdbfe !important;
  background:linear-gradient(135deg,#ffffff,#f8fbff) !important;
}
#formats-upload-card::before{
  content:'IQAC Coordinator Upload Area';
  display:inline-block;
  background:#eff6ff;
  border:1px solid #bfdbfe;
  color:#1d4ed8;
  font-size:10px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  border-radius:999px;
  padding:5px 10px;
  margin-bottom:10px;
}

</style>
</head>
<body>

<!-- ══ LOGIN ══ -->
<div id="scr-login" class="auth-wrap show">

  <!-- ═══ LEFT PANEL ═══ -->
  <div class="auth-left">
    <div class="al-header">
      <img src="data:image/png;base64,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" alt="HKBK Logo" class="al-hkbk-logo">
      <div>
        <div class="al-college-name">HKBK College of Engineering</div>
        <div class="al-college-sub">Affiliated to VTU Belagavi</div>
      </div>
    </div>

    <div class="al-mid">
      <div class="al-iqac-label">Internal Quality Assurance Cell</div>
      <div class="al-main-title">IQAC</div>
      <div class="al-main-sub">Management Portal</div>
      <div class="al-desc">A unified platform to streamline academic event approvals, faculty records, accreditation documents and quality analytics.</div>
      <div class="al-pills">
        <div class="al-pill">📋 Multi-level Event Workflow</div>
        <div class="al-pill">👩‍🏫 Faculty Profiles</div>
        <div class="al-pill">🏅 NBA · NAAC · NIRF</div>
        <div class="al-pill">📊 Live Dashboard</div>
        <div class="al-pill">🔐 Role-Based Access</div>
      </div>
    </div>

    <div class="al-bottom">
      <div class="al-quote-block">
        <p>"Quality in education is not an act — it is a habit built through consistent effort, honest review and collective commitment."</p>
        <cite>— IQAC, HKBK College of Engineering</cite>
      </div>
      <div class="al-dev">
        <strong>Dr. Zahira Tabassum</strong>
        <span>Professor In Charge · IQAC</span>
      </div>
    </div>
  </div>

  <!-- ═══ RIGHT PANEL ═══ -->
  <div class="auth-right">
    <div class="abox">
      <div class="ar-eyebrow">Secure Access Portal</div>
      <div class="atitle">Good to see you.</div>
      <div class="asub">Sign in to continue — every step here contributes to academic quality at HKBK.</div>
      <div class="gerr" id="li-ge"></div>
      <div class="fg">
        <label>Employee ID</label>
        <input type="text" id="li-id" placeholder="e.g. 10099" onkeydown="if(event.key==='Enter')doLogin()">
        <div class="ferr" id="li-ie">Required.</div>
      </div>
      <div class="fg">
        <label>Role / Cadre *</label>
        <select id="li-role" onkeydown="if(event.key==='Enter')doLogin()">
          <option value="">Select Role</option>
          <option value="faculty">Faculty</option>
          <option value="hod">HOD</option>
          <option value="iqac_dept">IQAC Dept Coordinator</option>
          <option value="iqac">IQAC Coordinator</option>
          <option value="principal">Principal</option>
        </select>
        <div class="ferr" id="li-re">Select role.</div>
      </div>
      <div class="fg">
        <label>Password</label>
        <input type="password" id="li-pw" placeholder="••••••••" onkeydown="if(event.key==='Enter')doLogin()">
        <a onclick="goTo('scr-forgot')" style="position:absolute;right:0;top:0;font-size:11px;color:#0f6b5e;cursor:pointer;font-weight:600">Forgot password?</a>
        <div class="ferr" id="li-pe">Required.</div>
      </div>
      <button class="btn-pri" id="li-btn" onclick="doLogin()">Sign In →</button>
      <p class="aswitch">Need a different role? <a onclick="goTo('scr-register')">Register role account</a></p>
    </div>
  </div>

</div>

<!-- ══ REGISTER ══ -->
<div id="scr-register" class="auth-wrap">
  <div class="abox">
    <div class="alogo"><div class="lico">🎓</div><div><h1>IQAC Portal</h1><p>Quality Management System</p></div></div>
    <div class="atitle">Add Role Account</div><div class="asub">Same Employee ID &amp; email can register under different roles — e.g. Faculty in ECE and IQAC Coordinator.</div>
    <div class="gerr" id="rg-ge"></div>
    <div class="adiv">Account Details</div>
    <div class="fg"><label>Employee ID *</label><input type="text" id="rg-id" placeholder="FAC2024001"><div class="ferr" id="rg-ie">Required.</div></div>
    <div class="fg"><label>Email ID *</label><input type="email" id="rg-em" placeholder="name@institution.edu.in"><div class="ferr" id="rg-ee">Valid email required.</div></div>
    <div class="fg-row">
      <div class="fg"><label>Role / Cadre *</label>
        <select id="rg-role" onchange="toggleDept()">
          <option value="">— Select —</option>
          <option value="faculty">Faculty</option>
          <option value="hod">HOD</option>
          <option value="iqac">IQAC Coordinator</option>
          <option value="iqac_dept">IQAC Dept Coordinator</option>
          <option value="principal">Principal</option>
          <option value="accounts">Accounts</option>
        </select>
        <div class="ferr" id="rg-re">Required.</div>
      </div>
      <div class="fg" id="rg-dw" style="display:none">
        <label>Department *</label>
        <select id="rg-dept"><option value="">— Select —</option><option>CSE</option><option>ISE</option><option>ECE</option><option>AIML</option><option>ME</option><option>Humanities</option><option>Physics</option><option>Chemistry</option><option>Maths</option><option>IQAC</option></select>
        <div class="ferr" id="rg-de">Required.</div>
      </div>
    </div>
    <div class="adiv">Set Password</div>
    <div class="fg"><label>Password * (min 8 chars)</label>
      <input type="password" id="rg-pw" oninput="pwStr(this.value,'pm-bar','pm-hint')">
      <div class="pmeter"><div class="pmbar" id="pm-bar" style="width:0%"></div></div>
      <div class="phint" id="pm-hint"></div>
      <div class="ferr" id="rg-pe">Min 8 characters.</div>
    </div>
    <div class="fg"><label>Confirm Password *</label><input type="password" id="rg-pw2"><div class="ferr" id="rg-p2e">Passwords do not match.</div></div>
    <button class="btn-pri" id="rg-btn" onclick="doRegister()">Create Account →</button>
    <p class="aswitch">Already registered? <a onclick="goTo('scr-login')">Sign in</a></p>
  </div>
</div>

<!-- ══ FORGOT PASSWORD ══ -->
<div id="scr-forgot" class="auth-wrap">
  <div class="abox">
    <div class="alogo"><div class="lico">🎓</div><div><h1>IQAC Portal</h1><p>Quality Management System</p></div></div>
    <div class="atitle">Forgot Password</div><div class="asub">Verify your identity to reset your password</div>
    <div class="gerr" id="fp-ge"></div>
    <div class="gok" id="fp-ok"></div>
    <div class="fg"><label>Employee ID *</label><input type="text" id="fp-id" placeholder="FAC2024001"><div class="ferr" id="fp-ie">Required.</div></div>
    <div class="fg"><label>Registered Email *</label><input type="email" id="fp-em" placeholder="name@institution.edu.in"><div class="ferr" id="fp-ee">Required.</div></div>
    <button class="btn-pri" id="fp-btn" onclick="doForgot()">Verify Identity →</button>
    <p class="aswitch"><a onclick="goTo('scr-login')">← Back to Sign In</a></p>
  </div>
</div>

<!-- ══ RESET PASSWORD ══ -->
<div id="scr-reset" class="auth-wrap">
  <div class="abox">
    <div class="alogo"><div class="lico">🎓</div><div><h1>IQAC Portal</h1><p>Quality Management System</p></div></div>
    <div class="atitle">Reset Password</div>
    <div class="asub" id="reset-sub">Set a new password for your account</div>
    <div class="gerr" id="rp-ge"></div>
    <div class="fg"><label>New Password * (min 8 chars)</label>
      <input type="password" id="rp-pw" oninput="pwStr(this.value,'pm-bar2','pm-hint2')">
      <div class="pmeter"><div class="pmbar" id="pm-bar2" style="width:0%"></div></div>
      <div class="phint" id="pm-hint2"></div>
      <div class="ferr" id="rp-pe">Min 8 characters.</div>
    </div>
    <div class="fg"><label>Confirm New Password *</label><input type="password" id="rp-pw2"><div class="ferr" id="rp-p2e">Passwords do not match.</div></div>
    <button class="btn-pri" id="rp-btn" onclick="doResetPw()">Save New Password →</button>
    <p class="aswitch"><a onclick="goTo('scr-login')">← Back to Sign In</a></p>
  </div>
</div>

<!-- ══ APP ══ -->
<div id="app">
  <aside class="sidebar">
    <div class="sbl"><div class="lico">🎓</div><span>IQAC Portal</span></div>
    <div class="snav">
      <div class="ns">Main</div>
      <div class="ni active" id="ni-dash" onclick="showPage('dashboard',this)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Dashboard</div>
      <div class="ns" id="ns-ev">Events</div>
      <div class="ni" id="ni-ereq" onclick="showPage('ereq',this)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Event Requisition</div>
      <div class="ni" id="ni-approv" onclick="showPage('approv',this)" style="display:none"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>Approvals <span class="ndot" id="ndot"></span></div>
      <div class="ni" id="ni-ereg" onclick="showPage('ereg',this)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Events Registry</div>
      <div class="ns" id="ns-fac">Faculty</div>
      <div class="ni" id="ni-att" onclick="showPage('attended',this)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>Events Attended</div>
      <div class="ni" id="ni-fac" onclick="showPage('faculty',this)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>Faculty</div>
     <div class="ni" id="ni-acc" onclick="showPage('accreditations',this)" style="display:none">
  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <path d="M14 2v6h6"/>
  </svg>
  Accreditations
</div>
<div class="ni" id="ni-intel" onclick="showPage('intelligence',this)" style="display:none">
  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M12 2v20M2 12h20"/>
  </svg>
Intelligence
</div>
	 
<div class="ni" id="ni-formats" onclick="showPage('formats',this)">
  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <path d="M14 2v6h6M8 13h8M8 17h5"/>
  </svg>
  Formats
</div>

	 <div id="ni-adm-wrap" style="display:none">
        <div class="ns">Admin</div>
        <div class="ni" onclick="showPage('users',this)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M3 20a9 9 0 0118 0"/></svg>User Management</div>
      </div>
    </div>
    <div class="sfoot">
      <div class="ubadge">
        <div class="uav" id="sb-av">?</div>
        <div style="flex:1;min-width:0"><div class="uname" id="sb-nm">—</div><div class="urole" id="sb-rl">—</div></div>
        <button class="lbtn" onclick="doLogout()"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>
      </div>
    </div>
  </aside>


  <main class="main">
    <!-- DASHBOARD -->
    <div id="page-dashboard" class="page active">
      <div id="dash-inst">
        <div class="ph"><div><h2 id="dash-h2">Dashboard</h2><p id="dash-sub">Loading…</p></div><div class="ph-act" id="dash-dl" style="display:none"><button class="btn-xl" onclick="dlDashXL()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Excel</button><button class="btn-wd" onclick="dlDashWD()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>Word</button></div></div>
        <div class="sgrid">
          <div class="scard sc-b"><div class="slbl">Total Events</div><div class="sval" id="ds-ev">—</div><div class="ssub" id="ds-ev-s">—</div><div class="sico"><svg width="24" height="24" fill="none" stroke="var(--accent)" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div></div>
          <div class="scard sc-g"><div class="slbl">Faculty Profiles</div><div class="sval" id="ds-fac">—</div><div class="ssub" id="ds-fac-s">—</div><div class="sico"><svg width="24" height="24" fill="none" stroke="var(--accent3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div></div>
          <div class="scard sc-p"><div class="slbl">Events Attended</div><div class="sval" id="ds-att">—</div><div class="ssub">Faculty development</div><div class="sico"><svg width="24" height="24" fill="none" stroke="var(--accent2)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg></div></div>
          <div class="scard sc-w"><div class="slbl">Pending Approvals</div><div class="sval" id="ds-pend">—</div><div class="ssub" id="ds-pend-s">—</div><div class="sico"><svg width="24" height="24" fill="none" stroke="var(--warn)" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div></div>
        </div>
        <div class="dg">
          <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:7px"><div><div style="font-size:13px;font-weight:700;color:var(--text)">Activities by Department</div></div><div class="stabs" style="margin-bottom:0"><button class="stab active" onclick="swChart('bar',this)">Bar</button><button class="stab" onclick="swChart('radar',this)">Radar</button></div></div><div class="cw"><canvas id="deptChart"></canvas></div></div>
          <div class="card"><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px">Department Summary</div><div style="font-size:11px;color:var(--text3);margin-bottom:12px">Faculty · Events · Attended</div><table class="dtbl"><thead><tr><th>Dept</th><th>Faculty</th><th>Events</th><th>Attended</th></tr></thead><tbody id="dept-tbody"></tbody></table></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
          <div class="card"><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">Event Type Distribution</div><div class="cw" style="height:185px"><canvas id="typeChart"></canvas></div></div>
          <div class="card"><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">Approval Pipeline</div><div class="cw" style="height:185px"><canvas id="statusChart"></canvas></div></div>
        </div>
      </div>
      <div id="dash-fac" style="display:none">
        <div class="ph"><div><h2>My Dashboard</h2><p>Your personal activity summary</p></div></div>
        <div class="fsgrid">
          <div class="fscard" style="border-left:4px solid var(--accent)"><div class="fsval" id="fds-ev">0</div><div class="fslbl">Events Applied</div></div>
          <div class="fscard" style="border-left:4px solid var(--accent3)"><div class="fsval" id="fds-att">0</div><div class="fslbl">Events Attended</div></div>
          <div class="fscard" style="border-left:4px solid var(--success)"><div class="fsval" id="fds-appr">0</div><div class="fslbl">Approved Events</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
          <div class="card"><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">📋 My Event Applications</div><div id="fac-ev-status"></div></div>
          <div class="card"><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">🎓 My Events Attended</div><div id="fac-att-list"></div></div>
        </div>
      </div>
    </div>

    <!-- EVENT REQUISITION -->
    <div id="page-ereq" class="page">
      <div class="ph"><div><h2>Event Requisition</h2><p>Submit a new event for approval</p></div></div>
      <div class="ib"><svg width="14" height="14" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span>Submitted events pass through <strong>HOD → IQAC → Principal</strong> approval.</span></div>
      <div class="fwrap"><div class="fstep"><div class="fdot fd-done">✓</div><div class="flbl">Faculty<br>Submit</div></div><div class="fline fl-done"></div><div class="fstep"><div class="fdot fd-act">2</div><div class="flbl">HOD<br>Review</div></div><div class="fline"></div><div class="fstep"><div class="fdot fd-pend">3</div><div class="flbl">IQAC<br>Review</div></div><div class="fline"></div><div class="fstep"><div class="fdot fd-pend">4</div><div class="flbl">Principal<br>Approve</div></div><div class="fline"></div><div class="fstep"><div class="fdot fd-pend">✓</div><div class="flbl">Registered</div></div></div>
      <form id="evForm" onsubmit="submitEv(event)">
        <div class="fsec">
          <h3><svg width="13" height="13" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Event Details</h3>
          <div class="fr c2"><div class="f"><label>Event Name *</label><input type="text" id="ev-name" required placeholder="e.g. National Hackathon 2025"></div><div class="f"><label>Department *</label><select id="ev-dept" required><option value="">Select</option><option>CSE</option><option>ISE</option><option>ECE</option><option>AIML</option><option>ME</option><option>Humanities</option><option>Physics</option><option>Chemistry</option><option>Maths</option><option>IQAC</option></select></div></div>
          <div class="fr c3"><div class="f"><label>Type *</label><select id="ev-type" required><option value="">Select</option><option>VAC</option><option>FDP</option><option>Hackathon</option><option>Guest Lecture</option><option>Celebration</option><option>Project Expo</option><option>Symposium</option></select></div><div class="f"><label>Beneficiary *</label><select id="ev-bene" required><option value="">Select</option><option>Students</option><option>Faculty</option><option>Both</option><option>Industry</option></select></div><div class="f"><label>Participants *</label><input type="number" id="ev-part" placeholder="150" required min="1"></div></div>
          <div class="fr c3"><div class="f"><label>Event Date *</label><input type="date" id="ev-date" required></div><div class="f"><label>Academic Year *</label><select id="ev-ay"><option>2024-25</option><option>2025-26</option><option>2026-27</option><option>2023-24</option></select></div><div class="f"><label>Coordinator *</label><input type="text" id="ev-coord" required placeholder="Dr. / Prof. Name"></div></div>
          <div class="fr c1"><div class="f"><label>Remarks</label><textarea id="ev-rmk" placeholder="Venue, requirements…"></textarea></div></div>
        </div>
        <div class="fsec">
          <h3><svg width="13" height="13" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Documents</h3>
          <div class="fr c2">
            <div class="f"><label>Brochure</label><div class="uz"><input type="file" id="ev-brochure" accept=".pdf,.jpg,.png" onchange="setFL('evb-lbl',this)"><svg width="20" height="20" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg><p id="evb-lbl">Upload Brochure</p></div></div>
            <div class="f"><label>Budget File</label><div class="uz"><input type="file" id="ev-budgetf" accept=".pdf,.xlsx" onchange="setFL('evbf-lbl',this)"><svg width="20" height="20" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><p id="evbf-lbl">Upload Budget PDF/Excel</p></div></div>
          </div>
        </div>
        <div style="display:flex;gap:9px"><button type="submit" class="btn-sub" id="ev-btn">Submit for Approval →</button><button type="button" class="btn-out" onclick="resetEvForm()">Clear</button></div>
      </form>
    </div>

    <!-- APPROVALS -->
    <div id="page-approv" class="page">
      <div class="ph"><div><h2>Approval Workflow</h2><p>Review pending events at your level</p></div></div>
      <div id="approv-body"></div>
    </div>

    <!-- EVENTS REGISTRY -->
    <div id="page-ereg" class="page">
      <div class="ph"><div><h2>Events Registry</h2><p>All events and approval status</p></div><div class="ph-act" id="ereg-dl" style="display:none"><button class="btn-xl" onclick="dlEvsXL()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Excel</button><button class="btn-wd" onclick="dlEvsWD()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>Word</button></div></div>
      <div class="card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;flex-wrap:wrap;gap:8px"><div class="sbar"><svg width="12" height="12" fill="none" stroke="var(--text3)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" placeholder="Search…" oninput="loadEvents()"></div><select id="ev-fst" onchange="loadEvents()" style="background:#f4f6fc;border:1px solid var(--border2);border-radius:var(--r2);padding:6px 10px;color:var(--text2);font-family:inherit;font-size:12px;outline:none"><option value="">All Status</option><option>Approved</option><option>Pending HOD</option><option>Pending IQAC</option><option>Pending Principal</option><option>Rejected</option></select></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Event Name</th><th>Dept</th><th>Type</th><th>Date</th><th>Coordinator</th><th>Participants</th><th>Status</th></tr></thead><tbody id="ev-tbody"></tbody></table></div></div>
    </div>

    <!-- EVENTS ATTENDED -->
    <div id="page-attended" class="page">
      <div class="ph"><div><h2>Events Attended</h2><p>Log FDPs, conferences and development activities</p></div><div class="ph-act" id="att-dl" style="display:none"><button class="btn-xl" onclick="dlAttXL()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Excel</button><button class="btn-wd" onclick="dlAttWD()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>Word</button></div></div>
      <div class="stabs"><button class="stab active" onclick="swTab('att-add',this)">Add Entry</button><button class="stab" onclick="swTab('att-view',this)">View Records</button></div>
      <div id="att-add">
        <form id="attForm" onsubmit="submitAtt(event)">
          <div class="fsec">
            <h3><svg width="13" height="13" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>Faculty Event Entry</h3>
            <div class="fr c2"><div class="f"><label>Name of Faculty *</label><input type="text" id="at-name" required placeholder="Dr. / Prof. Full Name"></div><div class="f"><label>Department *</label><select id="at-dept" required><option value="">Select</option><option>CSE</option><option>ISE</option><option>ECE</option><option>AIML</option><option>ME</option><option>Humanities</option><option>Physics</option><option>Chemistry</option><option>Maths</option><option>IQAC</option></select></div></div>
            <div class="fr c3"><div class="f"><label>Date *</label><input type="date" id="at-date" required></div><div class="f"><label>Academic Year *</label><select id="at-ay"><option>2024-25</option><option>2025-26</option><option>2026-27</option><option>2023-24</option></select></div><div class="f"><label>Type *</label><select id="at-type" required onchange="toggleOtherAttendedType()"><option value="">Select</option><option>FDP</option><option>Panel Member/Examiner</option><option>Conference</option><option>Consultancy</option><option>BOS</option><option>Workshop/FDP</option><option>Seminar</option><option>Research Review</option><option>Industry Visit</option><option>others</option></select><input
    type="text"id="at-type-other"placeholder="Enter other event type"style="display:none;margin-top:8px"  ></div></div>
            <div class="fr c1"><div class="f"><label>Event Title *</label><input type="text" id="at-evname" required placeholder="Full name of the event"></div></div>
            <div class="fr c1"><div class="f"><label>Upload Proof</label><div class="uz"><input type="file" id="at-proof" accept=".pdf,.jpg,.png" onchange="setFL('at-proof-lbl',this)"><svg width="20" height="20" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg><p id="at-proof-lbl">Click to upload · PDF, JPG, PNG</p></div></div></div>
          </div>
          <div style="display:flex;gap:9px"><button type="submit" class="btn-sub" id="att-btn">Save Record →</button><button type="button" class="btn-out" onclick="resetAtt()">Clear</button></div>
        </form>
      </div>
      <div id="att-view" style="display:none"><div class="card"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Faculty Name</th><th>Dept</th><th>Event Title</th><th>Type</th><th>Date</th><th>AY</th><th>Proof</th></tr></thead><tbody id="att-tbody"></tbody></table></div></div></div>
    </div>

    <!-- FACULTY -->
    <div id="page-faculty" class="page">
      <div class="ph"><div><h2>Faculty Management</h2><p>Comprehensive profiles and documents</p></div><div class="ph-act" id="fac-dl" style="display:none"><button class="btn-xl" onclick="dlFacXL()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Excel</button><button class="btn-wd" onclick="dlFacWD()"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>Word</button></div></div>
      <div class="stabs"><button class="stab active" onclick="swTab('fac-add',this)">Add Faculty</button><button class="stab" onclick="swTab('fac-dir',this)">Faculty Directory</button></div>
      <div id="fac-add">
        <form id="facForm" onsubmit="submitFac(event)">
          <div class="fsec">
            <h3><svg width="13" height="13" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>Personal &amp; Professional Details</h3>
            <div class="fr c2"><div class="f"><label>Full Name *</label><input type="text" id="fc-name" required placeholder="Dr. / Prof. Full Name"></div><div class="f"><label>Department *</label><select id="fc-dept" required><option value="">Select</option><option>CSE</option><option>ISE</option><option>ECE</option><option>AIML</option><option>ME</option><option>Humanities</option><option>Physics</option><option>Chemistry</option><option>Maths</option><option>IQAC</option></select></div></div>
            <div class="fr c3"><div class="f"><label>Employee ID *</label><input type="text" id="fc-empid" required placeholder="FAC2024001"></div><div class="f"><label>Contact *</label><input type="tel" id="fc-phone" required placeholder="+91 9XXXXXXXXX"></div><div class="f"><label>Designation *</label><select id="fc-desig" required><option value="">Select</option><option>Professor</option><option>Associate Professor</option><option>Assistant Professor</option></select></div></div>
            <div class="fr c3"><div class="f"><label>Date of Birth *</label><input type="date" id="fc-dob" required></div><div class="f"><label>Date of Joining *</label><input type="date" id="fc-doj" required></div><div class="f"><label>Date of Relieving</label><input type="date" id="fc-dor" disabled></div></div>
            <div class="fr c3"><div class="f"><label>Qualification *</label><select id="fc-qual" required><option value="">Select</option><option>Ph.D</option><option>M.Tech</option><option>M.E</option><option>M.Sc</option><option>M.Phil</option><option>MBA</option></select></div><div class="f"><label>Specialization</label><input type="text" id="fc-spec" placeholder="Machine Learning"></div><div class="f"><label>Status</label><select id="fc-status"onchange="toggleRelievingDate()"><option value="serving">Serving</option><option value="relieved">Relieved</option><option value="retired">Retired</option></select></div></div>
            <div class="fr c3"><div class="f"><label>Aadhar No.</label><input type="text" id="fc-aadhar" placeholder="XXXX XXXX XXXX" maxlength="14"></div><div class="f"><label>PAN No.</label><input type="text" id="fc-pan" placeholder="AAAAA9999A" maxlength="10"></div><div class="f"></div></div>
            <div class="fr c3"><div class="f"><label>Teaching Exp (Yrs) *</label><input type="number" id="fc-texp" required placeholder="8" min="0"></div><div class="f"><label>Research Exp (Yrs)</label><input type="number" id="fc-rexp" placeholder="4" min="0"></div><div class="f"><label>Industry Exp (Yrs)</label><input type="number" id="fc-iexp" placeholder="2" min="0"></div></div>
          </div>
          <div class="fsec">
            <h3><svg width="13" height="13" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>Document Uploads</h3>
            <div class="fr c3">
              <div class="f"><label>Appointment Order</label><div class="uz"><input type="file" name="doc_appt" accept=".pdf,.jpg,.png" onchange="setFL('fc-appt-l',this)"><svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><p id="fc-appt-l">Upload PDF / Image</p></div></div>
              <div class="f"><label>PAN Card</label><div class="uz"><input type="file" name="doc_pan" accept=".pdf,.jpg,.png" onchange="setFL('fc-pan-l',this)"><svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><p id="fc-pan-l">Upload PDF / Image</p></div></div>
              <div class="f"><label>Aadhar Card</label><div class="uz"><input type="file" name="doc_aadhar" accept=".pdf,.jpg,.png" onchange="setFL('fc-aadh-l',this)"><svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><p id="fc-aadh-l">Upload PDF / Image</p></div></div>
            </div>
            <div class="fr c2">
              <div class="f"><label>Experience Certificates</label><div class="uz"><input type="file" name="doc_exp_certs" multiple accept=".pdf,.jpg,.png" onchange="setFL('fc-exp-l',this,true)"><svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><p id="fc-exp-l">Upload (multiple allowed)</p></div></div>
              <div class="f"><label>Resume / CV</label><div class="uz"><input type="file" name="doc_resume" accept=".pdf,.doc,.docx" onchange="setFL('fc-res-l',this)"><svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg><p id="fc-res-l">Upload PDF / Word</p></div></div>
            </div>
          </div>
          <div style="display:flex;gap:9px"><button type="submit" class="btn-sub" id="fac-btn">Add Faculty →</button><button type="button" class="btn-out" onclick="document.getElementById('facForm').reset();resetFacDocs()">Clear</button></div>
        </form>
      </div>
      <div id="fac-dir" style="display:none"><div class="fgrid" id="fac-grid"></div><div id="fac-empty" class="empty" style="display:none"><svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>No faculty profiles yet</p><span>Use Add Faculty tab.</span></div></div>
    </div>

<!-- ACCREDITATIONS -->
<div id="page-accreditations" class="page">
  <div class="ph">
    <div>
      <h2>Accreditations</h2>
      <p>Upload and manage NBA, NAAC and NIRF documents</p>
    </div>
  </div>

  <div class="stabs">
    <button class="stab active" onclick="swAccTab('NBA',this)">NBA</button>
    <button class="stab" onclick="swAccTab('NAAC',this)">NAAC</button>
    <button class="stab" onclick="swAccTab('NIRF',this)">NIRF</button>
  </div>

  <div class="fsec">
    <h3>📁 Upload Accreditation Document</h3>

    <div class="fr c2">
      <div class="f">
        <label>Document Title *</label>
        <input type="text" id="acc-title" placeholder="SAR / Certificate / Audit Report / NIRF DCS">
      </div>

      <div class="f">
        <label>Upload File *</label>
        <div class="uz">
          <input type="file" id="acc-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onchange="setFL('acc-file-lbl',this)">
          <p id="acc-file-lbl">Upload PDF / Word / Excel / Image</p>
        </div>
      </div>
    </div>

    <button class="btn-sub" onclick="uploadAccFile()">Upload File →</button>
  </div>

  <div class="card">
    <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px" id="acc-heading">
      NBA Documents
    </div>
    <div id="acc-list"></div>
  </div>
</div>

<!-- IQAC INTELLIGENCE -->
<div id="page-intelligence" class="page">
  <div class="ph">
    <div>
     <h2 id="intel-title">Accreditation Intelligence</h2>
      <p id="intel-subtitle">
Department-wise NBA/NAAC readiness, strengths, weaknesses and improvement suggestions
</p>
    </div>
    <div class="ph-act">
    <button class="btn-sub" onclick="downloadIntelligenceReport()">Generate Report</button>
    </div>
  </div>

  <div class="sgrid">
    <div class="scard sc-b">
      <div class="slbl">Departments Reviewed</div>
      <div class="sval" id="ir-depts">0</div>
      <div class="ssub">Based on available data</div>
    </div>

    <div class="scard sc-g">
      <div class="slbl">Average Score</div>
      <div class="sval" id="ir-score">0</div>
      <div class="ssub">Quality readiness</div>
    </div>

    <div class="scard sc-p">
      <div class="slbl">Strong Departments</div>
      <div class="sval" id="ir-strong">0</div>
      <div class="ssub">Score above 70</div>
    </div>

    <div class="scard sc-w">
      <div class="slbl">Needs Attention</div>
      <div class="sval" id="ir-weak">0</div>
      <div class="ssub">Score below 50</div>
    </div>
  </div>

  <div id="intel-report"></div>
</div>


    <!-- FORMATS -->
    <div id="page-formats" class="page">
      <div class="ph">
        <div>
          <h2>Formats</h2>
          <p>Standard IQAC, NAAC, NBA and academic documentation formats</p>
        </div>
      </div>

      <div class="card" id="formats-upload-card" style="display:none;margin-bottom:16px">
        <h3 style="font-size:14px;margin-bottom:12px">Upload / Add Format</h3>
        <div class="fr c3">
          <div class="f">
            <label>Select Existing Category</label>
            <select id="fmt-up-category"></select>
          </div>
          <div class="f">
            <label>Or Add New Category</label>
            <input id="fmt-new-category" placeholder="e.g. Faculty Feedback">
          </div>
          <div class="f">
            <label>Format Title</label>
            <input id="fmt-title" placeholder="e.g. Lesson Plan Format">
          </div>
        </div>
        <div class="fr c1">
          <div class="f">
            <label>Upload File</label>
            <input id="fmt-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip">
          </div>
        </div>
        <button class="btn-sub" onclick="uploadFormat()">Upload Format</button>
      </div>

      
      <div class="card" id="formats-category-card" style="display:none;margin-bottom:16px">
        <h3 style="font-size:14px;margin-bottom:12px">Manage Format Categories</h3>
        <div class="fr c2">
          <div class="f">
            <label>Select Category to Delete</label>
            <select id="fmt-del-category"></select>
          </div>
          <div class="f" style="display:flex;align-items:end">
            <button class="btn-del" onclick="deleteFormatCategory()">Delete Selected Category</button>
          </div>
        </div>
        <div class="ib" style="margin-bottom:0">
          Deleting a category will also remove all uploaded formats under that category.
        </div>
      </div>

      <div class="card">
        <div class="fr c2">
          <div class="f">
            <label>Search by Category</label>
            <select id="fmt-filter" onchange="renderFormats()"></select>
          </div>
          <div class="f">
            <label>Search by Title</label>
            <input id="fmt-search" placeholder="Search lesson plan, survey, feedback..." oninput="renderFormats()">
          </div>
        </div>
        <div id="formats-list"></div>
      </div>
    </div>

    <!-- USER MANAGEMENT -->
    <div id="page-users" class="page">
      <div class="ph"><div><h2>User Management</h2><p>All registered users</p></div></div>
      <div class="card"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Employee ID</th><th>Email</th><th>Role</th><th>Department</th><th>Registered</th><th>Action</th></tr></thead><tbody id="users-tbody"></tbody></table></div></div>
    </div>
  </main>
</div>

<!-- DOCS MODAL -->
<div class="moverlay" id="docs-modal" style="display:none" onclick="if(event.target===this)sd('docs-modal','none')">
  <div class="mbox"><h3 id="modal-title">Faculty Documents</h3><div class="msub" id="modal-sub"></div><div class="dlist" id="modal-docs"></div><button class="mbtn" onclick="sd('docs-modal','none')">Close</button></div>
</div>

<!-- EDIT FACULTY MODAL -->
<div class="moverlay" id="edit-fac-modal" style="display:none" onclick="if(event.target===this)sd('edit-fac-modal','none')">
  <div class="mbox" style="width:680px;max-width:96vw">
    <h3>Edit Faculty Profile</h3><div class="msub" id="edit-fac-sub"></div>
    <input type="hidden" id="edit-fac-id">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="f"><label>Full Name *</label><input type="text" id="ef-name"></div>
      <div class="f"><label>Department *</label><select id="ef-dept"><option value="">Select</option><option>CSE</option><option>ISE</option><option>ECE</option><option>AIML</option><option>ME</option><option>Humanities</option><option>Physics</option><option>Chemistry</option><option>Maths</option><option>IQAC</option></select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="f"><label>Employee ID *</label><input type="text" id="ef-empid"></div>
      <div class="f"><label>Contact</label><input type="tel" id="ef-phone"></div>
      <div class="f"><label>Designation *</label><select id="ef-desig"><option value="">Select</option><option>Professor</option><option>Associate Professor</option><option>Assistant Professor</option><option>Senior Lecturer</option><option>Lecturer</option></select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="f"><label>Date of Birth</label><input type="date" id="ef-dob"></div>
      <div class="f"><label>Date of Joining</label><input type="date" id="ef-doj"></div>
      <div class="f"><label>Date of Relieving</label><input type="date" id="ef-dor"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="f"><label>Qualification</label><select id="ef-qual"><option value="">Select</option><option>Ph.D</option><option>M.Tech</option><option>M.E</option><option>M.Sc</option><option>M.Phil</option><option>MBA</option></select></div>
      <div class="f"><label>Specialization</label><input type="text" id="ef-spec"></div>
      <div class="f"><label>Status</label><select id="ef-status"><option value="serving">Serving</option><option value="relieved">Relieved</option><option value="retired">Retired</option></select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="f"><label>Aadhar No.</label><input type="text" id="ef-aadhar" maxlength="14"></div>
      <div class="f"><label>PAN No.</label><input type="text" id="ef-pan" maxlength="10"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="f"><label>Teaching Exp (Yrs)</label><input type="number" id="ef-texp" min="0"></div>
      <div class="f"><label>Research Exp (Yrs)</label><input type="number" id="ef-rexp" min="0"></div>
      <div class="f"><label>Industry Exp (Yrs)</label><input type="number" id="ef-iexp" min="0"></div>
    </div>
<div class="fsec" style="margin-bottom:16px">
  <h3>🔄 Re-upload Documents</h3>

  <div class="fr c2">
    <div class="f">
      <label>Appointment Order</label>
      <div class="uz">
        <input type="file" id="ef-doc-appt" name="doc_appt" accept=".pdf,.jpg,.jpeg,.png" onchange="setFL('ef-appt-l',this)">
        <p id="ef-appt-l">Re-upload Appointment Order</p>
      </div>
    </div>

    <div class="f">
      <label>PAN Card</label>
      <div class="uz">
        <input type="file" id="ef-doc-pan" name="doc_pan" accept=".pdf,.jpg,.jpeg,.png" onchange="setFL('ef-pan-l',this)">
        <p id="ef-pan-l">Re-upload PAN Card</p>
      </div>
    </div>

    <div class="f">
      <label>Aadhar Card</label>
      <div class="uz">
        <input type="file" id="ef-doc-aadhar" name="doc_aadhar" accept=".pdf,.jpg,.jpeg,.png" onchange="setFL('ef-aadhar-l',this)">
        <p id="ef-aadhar-l">Re-upload Aadhar Card</p>
      </div>
    </div>

    <div class="f">
      <label>Resume / CV</label>
      <div class="uz">
        <input type="file" id="ef-doc-resume" name="doc_resume" accept=".pdf,.doc,.docx" onchange="setFL('ef-resume-l',this)">
        <p id="ef-resume-l">Re-upload Resume / CV</p>
      </div>
    </div>
  </div>
</div>
    <div style="display:flex;gap:9px"><button class="btn-sub" onclick="saveEditFac()">Save Changes →</button><button class="mbtn" onclick="sd('edit-fac-modal','none')">Cancel</button></div>
  </div>
</div>

<!-- DELETE CONFIRM MODAL -->
<div class="moverlay" id="del-modal" style="display:none" onclick="if(event.target===this)sd('del-modal','none')">
  <div class="mbox" style="width:400px">
    <h3 style="color:var(--danger)">Delete Faculty Profile</h3>
    <div style="font-size:13.5px;color:var(--text);margin:10px 0 12px" id="del-modal-sub"></div>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;font-size:12.5px;color:#991b1b;margin-bottom:18px">⚠️ This cannot be undone. All data will be permanently deleted.</div>
    <input type="hidden" id="del-fac-id">
    <div style="display:flex;gap:9px"><button class="btn-rej" style="padding:9px 20px;font-size:13px" onclick="confirmDelFac()">Yes, Delete</button><button class="mbtn" onclick="sd('del-modal','none')">Cancel</button></div>
  </div>
</div>

<div class="spinner-overlay" id="spinner"><div class="spinner"></div></div>
<div class="toast" id="toast"><span id="t-i">✓</span><span id="t-m">Done</span></div>

<script>
// ══ CONFIG ══
// Auto-detect API URL:
// - If IQAC_API_URL meta tag is set (injected at build/deploy time), use it
// - Else if served from the same origin as the backend, use relative /api
// - Else fall back to localhost for local development
const _metaApi = document.querySelector('meta[name="iqac-api-url"]')?.content;
const API = _metaApi && _metaApi !== '__API_URL__'
  ? _metaApi
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : window.location.origin + '/api';

// ══ STATE ══
let TOKEN = localStorage.getItem('iqac_token') || '';
let CU    = JSON.parse(localStorage.getItem('iqac_user') || 'null');
let _resetToken = '';
let _dashData   = null;
let chD=null, chT=null, chS=null;
const DEPTS = ['CSE','ISE','ECE','AIML','ME','Humanities','Physics','Chemistry','Maths'];
const DC    = ['#3b6ef5','#6c4ef5','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#f97316','#0ea5e9'];
const RLBL  = {faculty:'Faculty',hod:'HOD',iqac:'IQAC Coordinator',iqac_dept:'IQAC Dept Coord.',principal:'Principal',accounts:'Accounts'};

// ══ API HELPER ══
function apiUrl(path) {
  const base = API.endsWith('/api') ? API.slice(0, -4) : API.replace(/\/$/, '');
  const fixedPath = path.startsWith('/api/')
    ? path
    : `/api${path.startsWith('/') ? path : '/' + path}`;
  return base + fixedPath;
}

async function api(path, opts = {}) {
  const token =
    localStorage.getItem('iqac_token') ||
    localStorage.getItem('token') ||
    '';

  const headers = opts.headers ? { ...opts.headers } : {};

  let body = opts.body;

  if (body instanceof FormData) {
    // Do not set Content-Type for FormData
  } else if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  } else {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(apiUrl(path), {
    ...opts,
    headers,
    body
  });

  const text = await res.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid server response');
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }

  return data;
}

// ══ HELPERS ══
function goTo(id) { document.querySelectorAll('.auth-wrap').forEach(s=>s.classList.remove('show')); document.getElementById(id).classList.add('show'); clrE(); }
function clrE() { document.querySelectorAll('.ferr').forEach(e=>e.classList.remove('on')); document.querySelectorAll('.gerr,.gok').forEach(e=>e.classList.remove('on')); document.querySelectorAll('.inp-err').forEach(e=>e.classList.remove('inp-err')); }
function fe(eid,iid) { const e=document.getElementById(eid); if(e)e.classList.add('on'); const i=document.getElementById(iid); if(i)i.classList.add('inp-err'); }
function ge(id,msg,cls='gerr') { const e=document.getElementById(id); if(e){e.textContent=msg;e.classList.add('on');} }
function gv(id) { const e=document.getElementById(id); return e?e.value.trim():''; }
function gp(id) { const e=document.getElementById(id); return e?e.value:''; }
function sd(id,v) { const e=document.getElementById(id); if(e)e.style.display=v; }
function st(id,v) { const e=document.getElementById(id); if(e)e.textContent=v; }
function fmtD(d) { if(!d)return'—'; try{return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}catch{return d;} }
function scls(s) { if(s==='Approved')return'sb-ok'; if(s==='Rejected')return'sb-rej'; return'sb-pend'; }
function setFL(lblId,inp,multi=false) { const lbl=document.getElementById(lblId); if(!lbl)return; if(multi&&inp.files.length>1)lbl.textContent=`📎 ${inp.files.length} files`; else if(inp.files[0])lbl.textContent='📎 '+inp.files[0].name; }
function toggleDept() { const r=gv('rg-role'),need=['faculty','hod','iqac_dept'].includes(r); sd('rg-dw',need?'block':'none'); }

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showSpinner(v) { sd('spinner',v?'flex':'none'); }
function toast(msg,type='success') {
  const t=document.getElementById('toast');
  document.getElementById('t-i').textContent=type==='success'?'✓':type==='error'?'✕':'⚠';
  document.getElementById('t-m').textContent=msg;
  t.className=`toast ${type} show`; clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3400);
}
function pwStr(v,barId,hintId) {
  const b=document.getElementById(barId),h=document.getElementById(hintId);
  if(!v){b.style.width='0%';h.textContent='';return;}
  let s=0;if(v.length>=8)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
  const lb=['','Weak','Fair','Good','Strong'],cl=['','#ef4444','#f59e0b','#a3e635','#22c55e'];
  b.style.width=(s*25)+'%';b.style.background=cl[s];
  h.textContent=s?'Strength: '+lb[s]:'';h.style.color=cl[s];
}

// ══ AUTH ══
async function doRegister() {
  clrE(); let ok=true;
  const id=gv('rg-id'),em=gv('rg-em'),role=gv('rg-role'),dept=gv('rg-dept'),p=gp('rg-pw'),p2=gp('rg-pw2');
  if(!id){fe('rg-ie','rg-id');ok=false;} if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){fe('rg-ee','rg-em');ok=false;}
  if(!role){fe('rg-re','rg-role');ok=false;} if(['faculty','hod','iqac_dept'].includes(role)&&!dept){fe('rg-de','rg-dept');ok=false;}
  if(p.length<8){fe('rg-pe','rg-pw');ok=false;} if(p!==p2){fe('rg-p2e','rg-pw2');ok=false;}
  if(!ok)return;
  const btn=document.getElementById('rg-btn'); btn.disabled=true; btn.textContent='Creating…';
  try {
    await api('/auth/register',{method:'POST',body:{empid:id,email:em,role,department:dept||'—',password:p}});
    toast('Account created! Please sign in.','success');
    ['rg-id','rg-em','rg-pw','rg-pw2'].forEach(x=>{const el=document.getElementById(x);if(el)el.value='';});
    document.getElementById('rg-role').value=''; document.getElementById('rg-dept').value='';
    sd('rg-dw','none'); document.getElementById('pm-bar').style.width='0%';
    goTo('scr-login');
  } catch(err){ ge('rg-ge',err.message); }
  finally { btn.disabled=false; btn.textContent='Create Account →'; }
}

async function doLogin() {
  clrE();
  let ok = true;

  const id = gv('li-id');
  const role = gv('li-role');
  const p = gp('li-pw');

  if (!id) { fe('li-ie','li-id'); ok = false; }
  if (!role) { fe('li-re','li-role'); ok = false; }
  if (!p) { fe('li-pe','li-pw'); ok = false; }

  if (!ok) return;

  const btn = document.getElementById('li-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: {
        empid: id,
        role: role,
        password: p
      }
    });

    const token = data.token || data.accessToken;
    if (!token) throw new Error('Backend did not return a token');

    TOKEN = token;
    CU = data.user;

    localStorage.setItem('iqac_token', TOKEN);
    localStorage.setItem('iqac_user', JSON.stringify(CU));

    launch();

  } catch (err) {
    console.error('Login error:', err);
    ge('li-ge', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In →';
  }
}

async function doForgot() {
  clrE();
  const id=gv('fp-id'),em=gv('fp-em');
  if(!id){fe('fp-ie','fp-id');return;} if(!em){fe('fp-ee','fp-em');return;}
  const btn=document.getElementById('fp-btn'); btn.disabled=true; btn.textContent='Verifying…';
  try {
    const data = await api('/auth/forgot-password',{method:'POST',body:{empid:id,email:em}});
    _resetToken = data.reset_token;
    document.getElementById('reset-sub').textContent = `Setting new password for: ${id}`;
    ge('fp-ok','Identity verified! Redirecting to reset password…','gok');
    document.getElementById('fp-ok').classList.add('on');
    setTimeout(()=>goTo('scr-reset'),1200);
  } catch(err){ ge('fp-ge',err.message); }
  finally { btn.disabled=false; btn.textContent='Verify Identity →'; }
}

async function doResetPw() {
  clrE();
  const p=gp('rp-pw'),p2=gp('rp-pw2');
  if(p.length<8){fe('rp-pe','rp-pw');return;} if(p!==p2){fe('rp-p2e','rp-pw2');return;}
  const btn=document.getElementById('rp-btn'); btn.disabled=true; btn.textContent='Saving…';
  try {
    await api('/auth/reset-password',{method:'POST',body:{token:_resetToken,password:p}});
    _resetToken='';
    ['rp-pw','rp-pw2'].forEach(x=>{const el=document.getElementById(x);if(el)el.value='';});
    document.getElementById('pm-bar2').style.width='0%';
    toast('Password reset! Please sign in.','success');
    goTo('scr-login');
  } catch(err){ ge('rp-ge',err.message); }
  finally { btn.disabled=false; btn.textContent='Save New Password →'; }
}

let ACC_CAT = 'NBA';

function swAccTab(cat, btn) {
  ACC_CAT = cat;

  document.querySelectorAll('#page-accreditations .stab').forEach(b => {
    b.classList.remove('active');
  });

  btn.classList.add('active');

  document.getElementById('acc-heading').textContent = cat + ' Documents';
  loadAccFiles();
}

async function loadAccFiles() {
  try {
    const list = await api(`/accreditations/${ACC_CAT}`);

    const box = document.getElementById('acc-list');

    if (!list.length) {
      box.innerHTML = '<div class="empty"><p>No files uploaded.</p><span>Upload accreditation documents here.</span></div>';
      return;
    }

    box.innerHTML = list.map(f => `
      <div class="si">
        <div>
          <div class="si-name">📎 ${f.title}</div>
          <div class="si-meta">${f.category} · Uploaded by ${f.uploaded_by || '—'} · ${fmtD(f.uploaded_at)}</div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-vd" onclick="viewAccFile(${f.id})">👁 View</button>
          <button class="btn-edit" onclick="downloadAccFile(${f.id},'${f.file_name}')">⬇ Download</button>
          <button class="btn-del" onclick="deleteAccFile(${f.id})">🗑 Delete</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    toast(err.message, 'error');
  }
}

async function uploadAccFile() {
  const title = document.getElementById('acc-title').value.trim();
  const file = document.getElementById('acc-file').files[0];

  if (!title || !file) {
    toast('Please enter title and select file.', 'warn');
    return;
  }

  const fd = new FormData();
  fd.append('title', title);
  fd.append('file', file);

  try {
    await api(`/accreditations/${ACC_CAT}/upload`, {
      method: 'POST',
      body: fd
    });

    toast('Accreditation file uploaded successfully.', 'success');

    document.getElementById('acc-title').value = '';
    document.getElementById('acc-file').value = '';
    document.getElementById('acc-file-lbl').textContent = 'Upload PDF / Word / Excel / Image';

    loadAccFiles();

  } catch (err) {
    toast(err.message, 'error');
  }
}

async function viewAccFile(id) {
  try {
    const res = await fetch(apiUrl(`/accreditations/download/${id}`), {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!res.ok) throw new Error('Unable to view file');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    window.open(url, '_blank');

  } catch (err) {
    toast(err.message, 'error');
  }
}

async function downloadAccFile(id, filename) {
  try {
    const res = await fetch(apiUrl(`/accreditations/download/${id}`), {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!res.ok) throw new Error('Unable to download file');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'accreditation-file';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteAccFile(id) {
  if (!confirm('Delete this accreditation file?')) return;

  try {
    await api(`/accreditations/${id}`, {
      method: 'DELETE'
    });

    toast('File deleted successfully.', 'success');
    loadAccFiles();

  } catch (err) {
    toast(err.message, 'error');
  }
}
let INTEL_DATA = [];

async function loadIntelligenceReport() {
  try {
    const role = String(CU.role || '').toLowerCase();
    const dept = CU.department && CU.department !== '—' ? CU.department : '';

    if (document.getElementById('intel-title')) {
      document.getElementById('intel-title').textContent =
        ['hod','iqac_dept'].includes(role)
          ? `${dept} Department Intelligence`
          : 'Institution Accreditation Intelligence';
    }

    if (document.getElementById('intel-subtitle')) {
      document.getElementById('intel-subtitle').textContent =
        ['hod','iqac_dept'].includes(role)
          ? 'Faculty strength, cadre distribution, NBA and NAAC contribution analysis for your department'
          : 'Department-wise NBA/NAAC readiness, strengths, weaknesses and improvement suggestions';
    }

    const data = await api(`/intelligence/department-report?department=${encodeURIComponent(dept)}`);

    console.log('INTELLIGENCE DATA:', data);

    INTEL_DATA = data;
    renderIntelligenceReport(data);

  } catch (err) {
    console.error('Intelligence error:', err);
    toast(err.message, 'error');
  }
}
async function loadMyContribution() {
  const body =
    document.getElementById('intel-report') ||
    document.getElementById('intel-body') ||
    document.getElementById('intelligence-body');

  if (!body) {
    toast('Faculty intelligence section not found in frontend.', 'error');
    return;
  }

  body.innerHTML = `
    <div class="card">
      <div style="font-size:14px;font-weight:800;margin-bottom:8px">
        Loading your NBA/NAAC contribution...
      </div>
    </div>
  `;

  try {
    const data = await api('/intelligence/my-contribution');

    const f = data.faculty || {};
    const s = data.summary || {};
    const organized = data.organized || [];
    const attended = data.attended || [];
    const suggestions = data.suggestions || [];
    const missing = data.missing_documents || [];

    body.innerHTML = `
      <div class="ph">
        <div>
          <h2>My Contributions</h2>
          <p>Your individual NBA/NAAC contribution based on organized and attended activities</p>
        </div>
      </div>

      <div class="sgrid">
        <div class="scard sc-b">
          <div class="slbl">Events Organized</div>
          <div class="sval">${s.organized_count || 0}</div>
          <div class="ssub">Mapped to NBA/NAAC</div>
        </div>

        <div class="scard sc-g">
          <div class="slbl">Events Attended</div>
          <div class="sval">${s.attended_count || 0}</div>
          <div class="ssub">FDP / Conference / Workshop</div>
        </div>

        <div class="scard sc-p">
          <div class="slbl">Designation</div>
          <div class="sval" style="font-size:18px">${f.designation || '—'}</div>
          <div class="ssub">${f.qualification || '—'}</div>
        </div>

        <div class="scard sc-w">
          <div class="slbl">Missing Docs</div>
          <div class="sval">${s.missing_documents || 0}</div>
          <div class="ssub">${missing.length ? missing.join(', ') : 'Complete'}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div style="font-size:15px;font-weight:800;margin-bottom:10px">
          Suggested Next Contributions
        </div>
        ${
          suggestions.length
          ? suggestions.map(x => `
              <div class="si">
                <div class="si-name" style="font-size:14px;white-space:normal;line-height:1.5">
                  💡 ${x}
                </div>
              </div>
            `).join('')
          : `
              <div class="empty">
                <p>No suggestions pending.</p>
                <span>Your contribution evidence looks good.</span>
              </div>
            `
        }
      </div>

      <div class="card" style="margin-bottom:16px">
        <div style="font-size:15px;font-weight:800;margin-bottom:10px">
          Events Organized / Applied
        </div>
        ${
          organized.length
          ? organized.map(x => `
              <div class="si" style="align-items:flex-start">
                <div>
                  <div class="si-name" style="font-size:15px;font-weight:800;white-space:normal">
                    ${x.title || '—'}
                  </div>
                  <div class="si-meta" style="font-size:13px;margin-top:4px">
                    ${x.type || '—'} · ${fmtD(x.date)} · ${x.status || '—'}
                  </div>
                  <div style="margin-top:7px;font-size:13px;color:#1d4ed8;line-height:1.6">
                    <b>NBA:</b> ${(x.nba || []).join(' | ')}
                  </div>
                  <div style="margin-top:5px;font-size:13px;color:#047857;line-height:1.6">
                    <b>NAAC:</b> ${(x.naac || []).join(' | ')}
                  </div>
                </div>
              </div>
            `).join('')
          : `
              <div class="empty">
                <p>No organized events found.</p>
                <span>Submit event requisitions to build accreditation contribution.</span>
              </div>
            `
        }
      </div>

      <div class="card">
        <div style="font-size:15px;font-weight:800;margin-bottom:10px">
          Events Attended
        </div>
        ${
          attended.length
          ? attended.map(x => `
              <div class="si" style="align-items:flex-start">
                <div>
                  <div class="si-name" style="font-size:15px;font-weight:800;white-space:normal">
                    ${x.title || '—'}
                  </div>
                  <div class="si-meta" style="font-size:13px;margin-top:4px">
                    ${x.type || '—'} · ${fmtD(x.date)} · ${x.academic_year || '—'}
                  </div>
                  <div style="margin-top:7px;font-size:13px;color:#1d4ed8;line-height:1.6">
                    <b>NBA:</b> ${(x.nba || []).join(' | ')}
                  </div>
                  <div style="margin-top:5px;font-size:13px;color:#047857;line-height:1.6">
                    <b>NAAC:</b> ${(x.naac || []).join(' | ')}
                  </div>
                </div>
              </div>
            `).join('')
          : `
              <div class="empty">
                <p>No attended events found.</p>
                <span>Add FDP, conference, workshop or seminar details.</span>
              </div>
            `
        }
      </div>
    `;

  } catch (err) {
    body.innerHTML = `
      <div class="card">
        <div class="empty">
          <p>Unable to load faculty intelligence.</p>
          <span>${err.message}</span>
        </div>
      </div>
    `;
  }
}

function downloadIntelligenceReport() {
  if (!INTEL_DATA || !INTEL_DATA.length) {
    toast('Please wait, report data is loading.', 'warn');
    return;
  }

  let html = `
    <html>
    <head>
      <title>IQAC Intelligence Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#111827}
        h1{color:#1e3a8a}
        h2{color:#2563eb;margin-top:28px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
        th{background:#eef2ff}
        .score{font-size:24px;font-weight:bold}
        .good{color:#16a34a}
        .avg{color:#f59e0b}
        .bad{color:#dc2626}
        li{margin-bottom:6px}
      </style>
    </head>
    <body>
      <h1>IQAC Intelligence Report</h1>
      <p><b>Generated On:</b> ${new Date().toLocaleString()}</p>
      <p>This report analyses department-wise NBA/NAAC readiness based on events organised, events attended by faculty, faculty qualification strength and cadre profile.</p>
  `;

  INTEL_DATA.forEach(d => {
    const cls = d.quality_score >= 70 ? 'good' : d.quality_score >= 50 ? 'avg' : 'bad';

    html += `
      <h2>${d.department}</h2>
      <p class="score ${cls}">Quality Score: ${d.quality_score}</p>

      <table>
        <tr>
          <th>Total Faculty</th>
          <th>Professor</th>
          <th>Associate Professor</th>
          <th>Assistant Professor</th>
          <th>Ph.D Faculty</th>
          <th>Ph.D %</th>
          <th>Events Organised</th>
          <th>Events Attended</th>
          <th>Missing Docs</th>
        </tr>
        <tr>
          <td>${d.total_faculty}</td>
          <td>${d.prof_count}</td>
          <td>${d.assoc_count}</td>
          <td>${d.asst_count}</td>
          <td>${d.phd_count}</td>
          <td>${d.phd_percent}%</td>
          <td>${d.total_events}</td>
          <td>${d.attended_count}</td>
          <td>${d.missing_docs}</td>
        </tr>
      </table>

      <h3>Strengths</h3>
      <ul>${(d.strengths || []).map(x => `<li>${x}</li>`).join('') || '<li>No major strength detected.</li>'}</ul>

      <h3>Weaknesses / Gaps</h3>
      <ul>${(d.weaknesses || []).map(x => `<li>${x}</li>`).join('') || '<li>No major weakness detected.</li>'}</ul>

      <h3>Recommendations for NBA / NAAC Improvement</h3>
      <ul>${(d.recommendations || []).map(x => `<li>${x}</li>`).join('')}</ul>
    `;
  });

  html += `
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'IQAC_Intelligence_Report.html';
  document.body.appendChild(a);
  a.click();
  a.remove();

  toast('IQAC Intelligence Report downloaded.', 'success');
}
function renderIntelligenceReport(data) {
  const box = document.getElementById('intel-report');

  if (!box) {
    toast('intel-report container not found.', 'error');
    return;
  }

  if (!data || !data.length) {
    box.innerHTML = `
      <div class="card">
        <div class="empty">
          <p>No intelligence data available.</p>
          <span>Add faculty profiles, events organised and events attended records first.</span>
        </div>
      </div>
    `;
    return;
  }

  const avg = Math.round(
    data.reduce((s,d)=>s + (d.quality_score || 0),0) / data.length
  );

  const strong = data.filter(d => (d.quality_score || 0) >= 70).length;
  const weak = data.filter(d => (d.quality_score || 0) < 50).length;

  if (document.getElementById('ir-depts')) document.getElementById('ir-depts').textContent = data.length;
  if (document.getElementById('ir-score')) document.getElementById('ir-score').textContent = avg || 0;
  if (document.getElementById('ir-strong')) document.getElementById('ir-strong').textContent = strong;
  if (document.getElementById('ir-weak')) document.getElementById('ir-weak').textContent = weak;

  const isHod = ['hod','iqac_dept'].includes(String(CU.role || '').toLowerCase());

  box.innerHTML = `
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#eef2ff,#ecfdf5)">
      <div style="font-size:18px;font-weight:800;color:var(--text)">
        ${isHod ? 'Department Accreditation Intelligence' : 'Institutional Accreditation Intelligence'}
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">
        Faculty strength, cadre distribution, Ph.D percentage, event contribution and NBA/NAAC criteria mapping.
      </div>
    </div>

    ${data.map(d => `
      <div class="card" style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div>
            <div style="font-size:18px;font-weight:800;color:var(--text)">${d.department}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:3px">
              Intake: ${d.intake || 'NA'} · Faculty: ${d.total_faculty || 0} · FSR: ${d.fsr || 'NA'}
            </div>
          </div>

          <div style="text-align:center">
            <div style="font-size:28px;font-weight:800;color:${(d.quality_score || 0) >= 70 ? '#16a34a' : (d.quality_score || 0) >= 50 ? '#f59e0b' : '#dc2626'}">
              ${d.quality_score || 0}
            </div>
            <div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase">
              Evidence Score
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px">
          <div class="si"><div><div class="si-name">Total Faculty</div><div class="si-meta">${d.total_faculty || 0}</div></div></div>
          <div class="si"><div><div class="si-name">Professors</div><div class="si-meta">${d.prof_count || 0}</div></div></div>
          <div class="si"><div><div class="si-name">Associate Professors</div><div class="si-meta">${d.assoc_count || 0}</div></div></div>
          <div class="si"><div><div class="si-name">Assistant Professors</div><div class="si-meta">${d.asst_count || 0}</div></div></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px">
          <div class="si"><div><div class="si-name">Ph.D Faculty</div><div class="si-meta">${d.phd_count || 0} (${d.phd_percent || 0}%)</div></div></div>
          <div class="si"><div><div class="si-name">Avg Teaching Exp</div><div class="si-meta">${d.avg_teaching_exp || 0} yrs</div></div></div>
          <div class="si"><div><div class="si-name">Missing Docs</div><div class="si-meta">${d.missing_docs || 0}</div></div></div>
          <div class="si"><div><div class="si-name">Faculty Attended</div><div class="si-meta">${d.attended_count || 0}</div></div></div>
        </div>

        <div style="margin-top:16px">
          <div style="font-size:13px;font-weight:800;margin-bottom:8px">Activity Evidence</div>
          <table class="dtbl">
            <thead>
              <tr>
                <th>Total Events</th>
                <th>VAC</th>
                <th>FDP</th>
                <th>Guest Lecture</th>
                <th>Hackathon</th>
                <th>Project Expo</th>
                <th>Symposium</th>
                <th>Conference Attended</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${d.total_events || 0}</td>
                <td>${d.vac_count || 0}</td>
                <td>${d.fdp_count || 0}</td>
                <td>${d.guest_count || 0}</td>
                <td>${d.hackathon_count || 0}</td>
                <td>${d.project_count || 0}</td>
                <td>${d.symposium_count || 0}</td>
                <td>${d.conference_count || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:16px">
          <div>
            <div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#1d4ed8">
              NBA Tier-II Criteria Contribution
            </div>
            ${
              d.criterion_coverage && d.criterion_coverage.nba && d.criterion_coverage.nba.length
              ? d.criterion_coverage.nba.map(x => `<span class="pill pb" style="margin:3px">${x}</span>`).join('')
              : `<div class="si">No NBA criteria mapping available from current data.</div>`
            }
          </div>

          <div>
            <div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#15803d">
              NAAC Criteria Contribution
            </div>
            ${
              d.criterion_coverage && d.criterion_coverage.naac && d.criterion_coverage.naac.length
              ? d.criterion_coverage.naac.map(x => `<span class="pill pg" style="margin:3px">${x}</span>`).join('')
              : `<div class="si">No NAAC criteria mapping available from current data.</div>`
            }
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:16px">
          <div>
            <div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#15803d">Strengths</div>
            ${
              d.strengths && d.strengths.length
              ? d.strengths.map(x=>`<div class="si">✅ ${x}</div>`).join('')
              : '<div class="si">No major strength detected from current data.</div>'
            }
          </div>

          <div>
            <div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#dc2626">Weaknesses / Gaps</div>
            ${
              d.weaknesses && d.weaknesses.length
              ? d.weaknesses.map(x=>`<div class="si">⚠️ ${x}</div>`).join('')
              : '<div class="si">No major weakness detected from current data.</div>'
            }
          </div>
        </div>

        <div style="margin-top:16px">
          <div style="font-size:13px;font-weight:800;margin-bottom:8px;color:var(--accent)">
            Suggested Improvements
          </div>
          ${
            d.recommendations && d.recommendations.length
            ? d.recommendations.map(x=>`<div class="si">🎯 ${x}</div>`).join('')
            : '<div class="si">No recommendations generated.</div>'
          }
        </div>
      </div>
    `).join('')}
  `;
}

function doLogout() {
  TOKEN=''; CU=null;
  localStorage.removeItem('iqac_token'); localStorage.removeItem('iqac_user');
  sd('app','none'); goTo('scr-login');
}

// ══ LAUNCH ══
const R = {
  fullDash: r=>['iqac','principal'].includes(r),
  facDash:  r=>r==='faculty',
  ereq:     r=>r!=='iqac_dept',
  approv:   r=>['hod','iqac','principal'].includes(r),
  ereg:     r=>r!=='faculty',
  facTab:   r=>true,
 accTab: r=>['iqac','principal'].includes(String(r || '').trim().toLowerCase()),
  userMgmt: r=>['iqac','principal'].includes(r),
  download: r=>['iqac','principal'].includes(r),
  canManage:r=>['faculty','hod','iqac','iqac_dept','principal'].includes(r),
 canViewDocs:r=>['faculty','hod','iqac','iqac_dept','principal'].includes(r)
};

function launch() {
  document.querySelectorAll('.auth-wrap').forEach(s=>s.classList.remove('show'));
  sd('app','block');
  document.getElementById('sb-av').textContent = CU.empid[0].toUpperCase();
 document.getElementById('sb-nm').textContent = CU.empid;
loadSidebarFacultyName();
  document.getElementById('sb-rl').textContent = (RLBL[CU.role]||CU.role) + (CU.department&&CU.department!=='—'?' · '+CU.department:'');
  const r=CU.role, dl=R.download(r);
  sd('ni-ereq',    R.ereq(r)?'flex':'none');
  sd('ni-approv',  R.approv(r)?'flex':'none');
  sd('ni-ereg',    R.ereg(r)?'flex':'none');
  sd('ni-fac',     R.facTab(r)?'flex':'none');
  sd('ns-fac',     R.facTab(r)?'block':'none');
  sd('ni-adm-wrap',R.userMgmt(r)?'block':'none');
  sd('dash-dl',    dl?'flex':'none');
  sd('ereg-dl',    dl?'flex':'none');
  sd('att-dl',     dl?'flex':'none');
  sd('fac-dl',     dl?'flex':'none');
sd('ni-acc', ['iqac','principal'].includes(String(CU.role || '').trim().toLowerCase()) ? 'flex' : 'none');
sd('ni-intel', ['iqac','principal','hod','iqac_dept','faculty'].includes(String(CU.role || '').trim().toLowerCase()) ? 'flex' : 'none');
  prefill();
  showPage('dashboard', document.getElementById('ni-dash'));
}

async function loadSidebarFacultyName() {
  try {
    if (!CU || !CU.empid) return;

    let facultyName = '';

    if (String(CU.role || '').toLowerCase() === 'faculty') {
      try {
        const data = await api('/intelligence/my-contribution');
        facultyName = data?.faculty?.name || '';
      } catch (e) {
        console.log('Name from my-contribution failed:', e.message);
      }
    }

    if (!facultyName) {
      const list = await api('/faculty');
      const me = list.find(f =>
        String(f.empid || '').trim().toLowerCase() ===
        String(CU.empid || '').trim().toLowerCase()
      );

      if (me && me.name) facultyName = me.name;
    }

    if (facultyName) {
      document.getElementById('sb-nm').textContent = facultyName;
      document.getElementById('sb-av').textContent = facultyName[0].toUpperCase();
    }

  } catch (err) {
    console.log('Faculty name not loaded:', err.message);
  }
}
function prefill() {
  if(!CU)return;
  const d=CU.department&&CU.department!=='—'?CU.department:'';
  if(d){const e1=document.getElementById('ev-dept');if(e1)e1.value=d;const e2=document.getElementById('at-dept');if(e2)e2.value=d;}
}

// ══ NAVIGATION ══
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));

  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');

  if (el) el.classList.add('active');

  if (id === 'approv') loadApprovals();
  if (id === 'ereg') loadEvents();
  if (id === 'dashboard') loadDashboard();
  if (id === 'users') loadUsers();
  if (id === 'faculty') loadFaculty();
  if (id === 'attended') loadAttended();
  if (id === 'accreditations') loadAccFiles();
  if (id === 'formats') loadFormats();

  if (id === 'intelligence') {
    const role = String(CU.role || '').toLowerCase();

    if (role === 'faculty') {
      if (document.getElementById('intel-title')) {
        document.getElementById('intel-title').style.display = 'none';
      }

      if (document.getElementById('intel-subtitle')) {
        document.getElementById('intel-subtitle').style.display = 'none';
      }

      const topCards = document.querySelector('#page-intelligence > .sgrid');
      if (topCards) {
        topCards.style.display = 'none';
      }

      loadMyContribution();
    } else {
      if (document.getElementById('intel-title')) {
        document.getElementById('intel-title').style.display = 'block';
      }

      if (document.getElementById('intel-subtitle')) {
        document.getElementById('intel-subtitle').style.display = 'block';
      }

      const topCards = document.querySelector('#page-intelligence > .sgrid');
      if (topCards) {
        topCards.style.display = 'grid';
      }

      loadIntelligenceReport();
    }
  }
}


// ══ FORMATS ══
let _formats = [];
let _formatCategories = [];
const DEFAULT_FORMAT_CATEGORIES = [
  'Lesson Plan',
  'Course File Index',
  'Satisfaction Survey - NAAC',
  'Satisfaction Survey - NBA',
  'Exit Survey',
  'Faculty Feedback',
  'Student Feedback',
  'Employer Feedback',
  'Alumni Feedback'
];

function isIQACRole() {
  const r = String(CU?.role || '').trim().toLowerCase();
  return ['iqac','iqac_coordinator','iqac coordinator'].includes(r);
}

function formatCategories() {
  const cats = new Set(_formatCategories.length ? _formatCategories : DEFAULT_FORMAT_CATEGORIES);
  (_formats || []).forEach(f => { if (f.category) cats.add(f.category); });
  return Array.from(cats).sort((a,b)=>a.localeCompare(b));
}

function fillFormatDropdowns() {
  const cats = formatCategories();

  const filter = document.getElementById('fmt-filter');
  if (filter) {
    const current = filter.value || 'All';
    filter.innerHTML = '<option value="All">All Formats</option>' +
      cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    filter.value = cats.includes(current) || current === 'All' ? current : 'All';
  }

  const up = document.getElementById('fmt-up-category');
  if (up) {
    const current = up.value || cats[0] || '';
    up.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (cats.includes(current)) up.value = current;
  }

  const del = document.getElementById('fmt-del-category');
  if (del) {
    const current = del.value || cats[0] || '';
    del.innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (cats.includes(current)) del.value = current;
  }
}

async function loadFormats() {
  sd('formats-upload-card', isIQACRole() ? 'block' : 'none');
  sd('formats-category-card', isIQACRole() ? 'block' : 'none');

  if (!Array.isArray(_formats)) _formats = [];
  fillFormatDropdowns();
  renderFormats();

  showSpinner(true);
  try {
    try {
      const catsData = await api('/formats/categories');
      _formatCategories = Array.isArray(catsData) ? catsData.map(x => x.category || x).filter(Boolean) : [];
    } catch(e) {
      _formatCategories = [];
    }

    const data = await api('/formats');
    _formats = Array.isArray(data) ? data : (data.rows || data.formats || []);
    fillFormatDropdowns();
    renderFormats();
  } catch (err) {
    console.error('Formats load error:', err);
    toast('Formats backend/table not ready. Upload area is visible for IQAC.', 'warn');
  } finally {
    showSpinner(false);
  }
}

function renderFormats() {
  fillFormatDropdowns();

  const box = document.getElementById('formats-list');
  if (!box) return;

  const cat = document.getElementById('fmt-filter')?.value || 'All';
  const q = (document.getElementById('fmt-search')?.value || '').toLowerCase().trim();

  let rows = (_formats || []).filter(f => {
    const okCat = cat === 'All' || f.category === cat;
    const hay = `${f.title || ''} ${f.category || ''} ${f.original_name || ''}`.toLowerCase();
    return okCat && (!q || hay.includes(q));
  });

  if (!rows.length) {
    box.innerHTML = `<div class="empty"><p>No formats found</p><span>IQAC Coordinator can upload formats from this tab.</span></div>`;
    return;
  }

  box.innerHTML = `
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Category</th>
            <th>Title</th>
            <th>File</th>
            <th>Uploaded</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((f,i)=>`
            <tr>
              <td>${i+1}</td>
              <td><span class="pill pp">${esc(f.category || '-')}</span></td>
              <td class="b">${esc(f.title || '-')}</td>
              <td>${esc(f.original_name || f.filename || 'Format file')}</td>
              <td>${f.created_at ? new Date(f.created_at).toLocaleDateString() : '-'}</td>
              <td>
                <button class="btn-vd" onclick="downloadFormat(${Number(f.id)})">Download</button>
                ${isIQACRole() ? `<button class="btn-del" onclick="deleteFormat(${Number(f.id)})">Delete</button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function uploadFormat() {
  if (!isIQACRole()) return toast('Only IQAC Coordinator can upload formats', 'error');

  const category = (document.getElementById('fmt-new-category')?.value || '').trim()
    || document.getElementById('fmt-up-category')?.value || '';
  const title = (document.getElementById('fmt-title')?.value || '').trim();
  const file = document.getElementById('fmt-file')?.files?.[0];

  if (!category) return toast('Select or enter category', 'error');
  if (!title) return toast('Enter format title', 'error');
  if (!file) return toast('Select a file to upload', 'error');

  const fd = new FormData();
  fd.append('category', category);
  fd.append('title', title);
  fd.append('formatFile', file);

  showSpinner(true);
  try {
    await api('/formats', { method:'POST', body: fd });
    document.getElementById('fmt-new-category').value = '';
    document.getElementById('fmt-title').value = '';
    document.getElementById('fmt-file').value = '';
    toast('Format uploaded successfully');
    await loadFormats();
  } catch (err) {
    toast(err.message || 'Upload failed', 'error');
  } finally {
    showSpinner(false);
  }
}


async function deleteFormatCategory() {
  if (!isIQACRole()) return toast('Only IQAC Coordinator can delete categories', 'error');

  const category = document.getElementById('fmt-del-category')?.value || '';
  if (!category) return toast('Select a category', 'error');

  if (!confirm(`Delete category "${category}" and all formats under it?`)) return;

  showSpinner(true);
  try {
    await api(`/formats/categories/${encodeURIComponent(category)}`, { method:'DELETE' });
    toast('Category deleted');
    await loadFormats();
  } catch (err) {
    toast(err.message || 'Unable to delete category', 'error');
  } finally {
    showSpinner(false);
  }
}

function downloadFormat(id) {
  const token = localStorage.getItem('iqac_token') || localStorage.getItem('token') || '';
  window.open(apiUrl(`/formats/${id}/download`) + (token ? `?token=${encodeURIComponent(token)}` : ''), '_blank');
}

async function deleteFormat(id) {
  if (!isIQACRole()) return toast('Only IQAC Coordinator can delete formats', 'error');
  if (!confirm('Delete this format?')) return;

  showSpinner(true);
  try {
    await api(`/formats/${id}`, { method:'DELETE' });
    toast('Format deleted');
    await loadFormats();
  } catch (err) {
    toast(err.message || 'Delete failed', 'error');
  } finally {
    showSpinner(false);
  }
}

// ══ DASHBOARD ══
async function loadDashboard() {
  showSpinner(true);
  try {
    const data = await api('/dashboard');
    _dashData = data;
    sd('dash-inst', R.facDash(CU.role)?'none':'block');
    sd('dash-fac',  R.facDash(CU.role)?'block':'none');
    if(R.facDash(CU.role)) renderFacDash(data);
    else renderInstDash(data);
    updDot(data.stats?.pending||0);
  } catch(err){ toast(err.message,'error'); }
  finally { showSpinner(false); }
}

function renderInstDash(data) {
  const full = R.fullDash(CU.role);
  document.getElementById('dash-h2').textContent = full?'Institutional Dashboard':(CU.department&&CU.department!=='—'?CU.department+' Dashboard':'Dashboard');
  document.getElementById('dash-sub').textContent = full?'Institutional overview · AY 2024–25':`${CU.department||''} overview · AY 2024–25`;
  const s = data.stats||{};
  st('ds-ev',  s.events||0);   st('ds-ev-s',  s.events?`${s.approved||0} approved`:'No events');
  st('ds-fac', s.faculty||0);  st('ds-fac-s', s.faculty?`${s.faculty} profiles`:'No profiles');
  st('ds-att', s.attended||0); st('ds-pend', s.pending||0);
  st('ds-pend-s', s.pending?`${s.pending} awaiting action`:'All up to date');

  const vd = data.depts||DEPTS;
  const vc = vd.map(d=>DC[DEPTS.indexOf(d)%DC.length]);
const TYPES = [  'VAC',  'FDP',  'Hackathon',  'Guest Lecture',  'Celebration',  'Project Expo',  'Symposium']; 
document.getElementById('dept-tbody').innerHTML =
  vd.map(d=>`<tr>
    <td>${d}</td>
    <td>${data.facByDept?.[d]||0}</td>
    <td>${data.evByDept?.[d]||0}</td>
    <td>${data.attByDept?.[d]||0}</td>
  </tr>`).join('');

  if(chD)chD.destroy();

const EVENT_COLORS = {
  'VAC': '#3b82f6',
  'FDP': '#8b5cf6',
  'Hackathon': '#10b981',
  'Guest Lecture': '#f59e0b',
  'Celebration': '#ef4444',
  'Project Expo': '#06b6d4',
  'Symposium': '#7c3aed'
};

const deptCategoryDatasets = TYPES.map(t=>({
  label: t,
  data: vd.map(d=>data.evByDeptType?.[d]?.[t]||0),
  backgroundColor: EVENT_COLORS[t] + '55',
  borderColor: EVENT_COLORS[t],
  borderWidth: 1,
  borderRadius: 4,
  barPercentage: 0.7,
  categoryPercentage: 0.8
}));

chD = new Chart(document.getElementById('deptChart').getContext('2d'), {
  type: 'bar',
  data: {
    labels: vd.map(d=>d.length>6?d.slice(0,5)+'…':d),
    datasets: deptCategoryDatasets
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color:'#4e5d78', font:{size:10}, boxWidth:10 }
      }
    },
    scales: {
      x: {
        stacked: false,
        grid: { color:'rgba(0,0,0,.04)' },
        ticks: { color:'#3b82f6', font:{size:10} }
      },
      y: {
        stacked: false,
        beginAtZero: true,
        grid: { color:'rgba(0,0,0,.04)' },
        ticks: { color:'#3b82f6', font:{size:10}, stepSize:1 }
      }
    }
  }
});
  const typeMap = data.evByType||{};
  
  if(chT)chT.destroy();
  chT = new Chart(document.getElementById('typeChart').getContext('2d'),{type:'doughnut',
    data:{labels:TYPES,datasets:[{data:TYPES.map(t=>typeMap[t]||0),backgroundColor:DC.map(c=>c+'55'),borderColor:DC,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'right',labels:{color:'#4e5d78',font:{size:10},boxWidth:10,padding:7}}}}});

  const stMap=data.evByStatus||{};
  const STATS=['Approved','Pending HOD','Pending IQAC','Pending Principal','Rejected'];
  const SC=['#22c55e','#f59e0b','#3b6ef5','#6c4ef5','#ef4444'];
  if(chS)chS.destroy();
  chS = new Chart(document.getElementById('statusChart').getContext('2d'),{type:'bar',
    data:{labels:STATS.map(s=>s.replace('Pending ','')),datasets:[{data:STATS.map(s=>stMap[s]||0),backgroundColor:SC.map(c=>c+'44'),borderColor:SC,borderWidth:2,borderRadius:5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#94a3b8',font:{size:10}}},y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{color:'#94a3b8',font:{size:10},stepSize:1}}}}});
}
function facultyRemarksView(e) {
  const rows = [];

  if (e.hod_remarks) {
    rows.push(`<div style="font-size:11px;color:#92400e;margin-top:4px"><b>HOD:</b> ${e.hod_remarks}</div>`);
  }

  if (e.iqac_remarks) {
    rows.push(`<div style="font-size:11px;color:#1d4ed8;margin-top:4px"><b>IQAC:</b> ${e.iqac_remarks}</div>`);
  }

  if (e.principal_remarks) {
    rows.push(`<div style="font-size:11px;color:#166534;margin-top:4px"><b>Principal:</b> ${e.principal_remarks}</div>`);
  }

  if (e.final_remarks) {
    rows.push(`<div style="font-size:11px;color:#dc2626;margin-top:4px"><b>Final Remark:</b> ${e.final_remarks}</div>`);
  }

  if (!rows.length) return '';

  return `
    <div style="margin-top:8px;padding:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px">
      <div style="font-size:11px;font-weight:700;color:#9a3412;margin-bottom:3px">Approval Remarks</div>
      ${rows.join('')}
    </div>
  `;
}
function renderFacDash(data) {
  const s=data.stats||{};
  st('fds-ev',s.events||0); st('fds-att',s.attended||0); st('fds-appr',s.approved||0);
  const evDiv=document.getElementById('fac-ev-status');
  const evs = data.myEvents||[];
 evDiv.innerHTML = evs.length ?
  evs.map(e => `
    <div class="si" style="display:block">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div>
          <div class="si-name">${e.name}</div>
          <div class="si-meta">${e.department} · ${e.type} · ${fmtD(e.event_date)}</div>
        </div>
        <span class="sbadge ${scls(e.status)}">${e.status}</span>
      </div>

      ${facultyRemarksView(e)}
    </div>
  `).join('')
  :
  `<div class="empty">
    <p>No event applications yet.</p>
    <span>Submit an event requisition to see status here.</span>
  </div>`;
  const atDiv=document.getElementById('fac-att-list');
  const atts = data.myAttended||[];
  atDiv.innerHTML = atts.length ? atts.map(a=>`<div class="si"><div><div class="si-name">${a.event_name}</div><div class="si-meta">${a.event_type} · ${fmtD(a.event_date)} · ${a.academic_year}</div></div><span class="pill pt">${a.academic_year}</span></div>`).join('') :
    '<div class="empty"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg><p>No records yet</p><span>Log your attended events.</span></div>';
}

function swChart(type,btn){
  document.querySelectorAll('.stabs .stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');

  if(!_dashData) return;

  renderInstDash(_dashData);
}

// ══ EVENT REQUISITION ══
async function submitEv(e) {
  e.preventDefault();
  const fd = new FormData();
  fd.append('name',gv('ev-name')); fd.append('department',gv('ev-dept'));
  fd.append('type',gv('ev-type')); fd.append('beneficiary',gv('ev-bene'));
  fd.append('participants',gv('ev-part')); fd.append('event_date',gv('ev-date'));
  fd.append('academic_year',gv('ev-ay')); fd.append('coordinator',gv('ev-coord'));
  fd.append('remarks',gv('ev-rmk'));
  const brochure=document.getElementById('ev-brochure').files[0]; if(brochure)fd.append('brochure',brochure);
  const budgetf=document.getElementById('ev-budgetf').files[0]; if(budgetf)fd.append('budget_file',budgetf);
  const btn=document.getElementById('ev-btn'); btn.disabled=true; btn.textContent='Submitting…';
  try {
    await api('/events',{method:'POST',body:fd});
    resetEvForm(); toast('Event submitted — awaiting HOD approval.','success');
    loadDashboard();
  } catch(err){ toast(err.message,'error'); }
  finally { btn.disabled=false; btn.textContent='Submit for Approval →'; }
}
function resetEvForm() {
  document.getElementById('evForm').reset();
  st('evb-lbl','Upload Brochure'); st('evbf-lbl','Upload Budget PDF/Excel'); prefill();
}

// ══ EVENTS TABLE ══
async function loadEvents() {
  const search = document.querySelector('#page-ereg .sbar input')?.value||'';
  const status = document.getElementById('ev-fst')?.value||'';
  const params = new URLSearchParams();
  if(search)params.set('search',search); if(status)params.set('status',status);
  try {
    const rows = await api('/events?'+params);
    const tb=document.getElementById('ev-tbody');
    if(!rows.length){tb.innerHTML=`<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:34px">No events found.</td></tr>`;return;}
    tb.innerHTML=rows.map((e,i)=>`<tr><td style="color:var(--text3)">${i+1}</td><td class="b">${e.name}</td><td><span class="pill pb">${e.department}</span></td><td>${e.type}</td><td>${fmtD(e.event_date)}</td><td>${e.coordinator}</td><td style="text-align:center">${e.participants}</td><td><span class="sbadge ${scls(e.status)}">${e.status}</span></td>
<td>${eventDocsBlock(e) || '—'}</td></tr>`).join('');
  } catch(err){ toast(err.message,'error'); }
}

// ══ APPROVALS ══
function updDot(n) { const d=document.getElementById('ndot'); if(d)d.style.display=n>0?'inline-block':'none'; }
function eventDocsBlock(e) {
  const docs = [];

  if (e.brochure_file && e.brochure_file !== '—') {
    docs.push(`<button class="btn-vd" onclick="viewEventDoc(${e.id},'brochure')">📄 View Brochure</button>`);
  }

  if (e.budget_file && e.budget_file !== '—') {
    docs.push(`<button class="btn-vd" onclick="viewEventDoc(${e.id},'budget')">📊 View Budget</button>`);
  }

  if (!docs.length) return '';

  return `
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      ${docs.join('')}
    </div>
  `;
}
async function viewEventDoc(id, type) {
  try {
    const res = await fetch(apiUrl(`/events/${id}/docs/${type}`), {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unable to view document' }));
      throw new Error(err.error || 'Unable to view document');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

  } catch (err) {
    toast(err.message, 'error');
  }
}
function approvalRemarksBlock(e) {
  const rows = [];

  if (e.hod_remarks) {
    rows.push(`<div class="si">👤 <b>HOD Remarks:</b> ${e.hod_remarks}</div>`);
  }

  if (e.iqac_remarks) {
    rows.push(`<div class="si">🏛️ <b>IQAC Remarks:</b> ${e.iqac_remarks}</div>`);
  }

  if (e.principal_remarks) {
    rows.push(`<div class="si">🎓 <b>Principal Remarks:</b> ${e.principal_remarks}</div>`);
  }

  if (!rows.length) return '';

  return `
    <div style="margin-top:10px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px">
        Previous Approval Remarks
      </div>
      ${rows.join('')}
    </div>
  `;
}
async function loadApprovals() {
  showSpinner(true);
  try {
    const all = await api('/events');
    const r=CU.role, d=CU.department&&CU.department!=='—'?CU.department:null;
    const pend = all.filter(e=>{
      if(r==='hod')       return e.status==='Pending HOD'&&(!d||e.department===d);
      if(r==='iqac')      return e.status==='Pending IQAC'&&(!d||e.department===d);
      if(r==='principal') return e.status==='Pending Principal';
      return false;
    });
    updDot(pend.length);
    const body=document.getElementById('approv-body');
    if(!pend.length){body.innerHTML=`<div class="card empty"><svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg><p>All caught up!</p><span>No pending approvals.</span></div>`;return;}
    body.innerHTML = pend.map(e=>`<div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:11px">
      <div style="flex:1;min-width:0">
        <div style="font-size:13.5px;font-weight:700;margin-bottom:5px;color:var(--text)">${e.name}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"><span class="pill pb">${e.department}</span><span class="pill pw">${e.type}</span><span style="font-size:11px;color:var(--text3)">${fmtD(e.event_date)}</span></div>
        <div style="font-size:11.5px;color:var(--text2)">Coordinator: <strong style="color:var(--text)">${e.coordinator}</strong> · Participants: <strong style="color:var(--text)">${e.participants}</strong></div>
        ${e.remarks?`<div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">"${e.remarks}"</div>`:''}
        ${eventDocsBlock(e)}
      </div>
      <div style="margin-top:12px">
  ${approvalRemarksBlock(e)}

  <textarea
    id="appr-remarks-${e.id}"
    placeholder="Enter approval / rejection remarks"
    style="width:100%;min-height:60px;margin-top:8px;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-family:inherit"
  ></textarea>

  <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
    <button class="btn-app" onclick="approveEv(${e.id})">✓ Approve</button>
    <button class="btn-rej" onclick="rejectEv(${e.id})">✕ Reject</button>
  </div>
</div>
    </div>
    <div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--border)"><span class="sbadge ${scls(e.status)}">${e.status}</span></div></div>`).join('');
  } catch(err){ toast(err.message,'error'); }
  finally { showSpinner(false); }
}
async function approveEv(id) {
  const remarks = document.getElementById(`appr-remarks-${id}`)?.value || '';

  try {
    await api(`/events/${id}/approve`, {
      method: 'PATCH',
      body: { remarks }
    });

    toast('Event approved successfully', 'success');
    loadApprovals();
    loadDashboard();

  } catch (err) {
    toast(err.message, 'error');
  }
}
async function rejectEv(id) {
  const remarks = document.getElementById(`appr-remarks-${id}`)?.value || '';

  if (!remarks.trim()) {
    toast('Please enter rejection remarks.', 'warn');
    return;
  }

  try {
    await api(`/events/${id}/reject`, {
      method: 'PATCH',
      body: { remarks }
    });

    toast('Event rejected successfully', 'success');
    loadApprovals();
    loadDashboard();

  } catch (err) {
    toast(err.message, 'error');
  }
}

// ══ EVENTS ATTENDED ══
async function submitAtt(e) {
  e.preventDefault();
  const fd=new FormData();
  fd.append('faculty_name',gv('at-name')); fd.append('department',gv('at-dept'));
  fd.append('event_name',gv('at-evname')); fd.append('event_type',gv('at-type'));
  fd.append('event_date',gv('at-date')); fd.append('academic_year',gv('at-ay'));
  const proof=document.getElementById('at-proof').files[0]; if(proof)fd.append('proof',proof);
  const btn=document.getElementById('att-btn'); btn.disabled=true; btn.textContent='Saving…';
  try {
    await api('/attended',{method:'POST',body:fd});
    resetAtt(); loadAttended(); loadDashboard(); toast('Record saved.','success');
  } catch(err){ toast(err.message,'error'); }
  finally { btn.disabled=false; btn.textContent='Save Record →'; }
}
function resetAtt() { document.getElementById('attForm').reset(); st('at-proof-lbl','Click to upload · PDF, JPG, PNG'); prefill(); }
async function loadAttended() {
  try {
    const rows=await api('/attended');
    const tb=document.getElementById('att-tbody');
    if(!rows.length){tb.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:34px">No records yet.</td></tr>`;return;}
    tb.innerHTML=rows.map((r,i)=>`<tr><td style="color:var(--text3)">${i+1}</td><td class="b">${r.faculty_name}</td><td><span class="pill pb">${r.department}</span></td><td>${r.event_name}</td><td><span class="pill pw">${r.event_type}</span></td><td>${fmtD(r.event_date)}</td><td>${r.academic_year}</td><td style="color:#059669;font-size:11px">${r.proof_file!=='—'?`<a href="${API.replace('/api','')}/uploads/${r.proof_file}" target="_blank" style="color:#059669">📎 View</a>`:'—'}</td></tr>`).join('');
  } catch(err){ toast(err.message,'error'); }
}

// ══ FACULTY ══
async function submitFac(e) {
  e.preventDefault();
  const form=document.getElementById('facForm');
  const fd=new FormData(form);
  // Add text fields
  ['fc-name','fc-dept','fc-empid','fc-phone','fc-desig','fc-dob','fc-doj','fc-dor','fc-status',
   'fc-qual','fc-spec','fc-aadhar','fc-pan','fc-texp','fc-rexp','fc-iexp'].forEach(id=>{
    const fieldMap={
      'fc-name':'name','fc-dept':'department','fc-empid':'empid','fc-phone':'phone',
      'fc-desig':'designation','fc-dob':'dob','fc-doj':'doj','fc-dor':'dor','fc-status':'emp_status',
      'fc-qual':'qualification','fc-spec':'specialization','fc-aadhar':'aadhar_no','fc-pan':'pan_no',
      'fc-texp':'teaching_exp','fc-rexp':'research_exp','fc-iexp':'industry_exp'
    };
    fd.set(fieldMap[id]||id, gv(id));
  });
  const btn=document.getElementById('fac-btn'); btn.disabled=true; btn.textContent='Saving…';
  try {
    await api('/faculty',{method:'POST',body:fd});
    form.reset(); resetFacDocs(); loadFaculty(); loadDashboard(); toast('Faculty profile created!','success');
  } catch(err){ toast(err.message,'error'); }
  finally { btn.disabled=false; btn.textContent='Add Faculty →'; }
}
function toggleRelievingDate() {
  const status = document.getElementById('fc-status').value;
  const dor = document.getElementById('fc-dor');

  if (status === 'relieved' || status === 'retired') {
    dor.disabled = false;
    dor.required = true;
  } else {
    dor.value = '';
    dor.disabled = true;
    dor.required = false;
  }
}
function resetFacDocs() {
  [['fc-appt-l','Upload PDF / Image · Max 10 MB'],
   ['fc-pan-l','Upload PDF / Image · Max 10 MB'],
   ['fc-aadh-l','Upload PDF / Image · Max 10 MB'],
   ['fc-exp-l','Upload multiple files · Max 10 MB each'],
   ['fc-res-l','Upload PDF / Word · Max 10 MB']
  ].forEach(([id,t])=>st(id,t));
}
 async function loadFaculty() {
  try {
    console.log('Calling faculty API:', API + '/faculty');
let list = await api('/faculty');
console.log('Faculty API result:', list);

    if (!Array.isArray(list)) list = [];

    const grid = document.getElementById('fac-grid');
    const emp = document.getElementById('fac-empty');

    if (!grid || !emp) {
      toast('Faculty Directory section not found.', 'error');
      return;
    }

    const role = String(CU.role || '').trim().toLowerCase();
    const empid = String(CU.empid || '').trim().toLowerCase();

    if (role === 'faculty') {
      list = list.filter(f =>
        String(f.empid || '').trim().toLowerCase() === empid ||
        String(f.created_by || '').trim().toLowerCase() === empid
      );
    }

    if (!list.length) {
      grid.innerHTML = '';
      emp.style.display = 'block';
      return;
    }

    emp.style.display = 'none';

    const canManage = ['hod','iqac','iqac_dept','principal'].includes(role);
    const canEditOwn = role === 'faculty';
    const canViewDocs = ['faculty','hod','iqac','iqac_dept','principal'].includes(role);

    grid.innerHTML = list.map((f, i) => {
      const ini = (f.name || 'F')
        .split(' ')
        .filter(w => w && /[A-Za-z]/.test(w[0]))
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');

      const c = DC[i % DC.length];
      const c2 = DC[(i + 1) % DC.length];

      const hasDocs =
        (f.doc_appt && f.doc_appt !== '—') ||
        (f.doc_pan && f.doc_pan !== '—') ||
        (f.doc_aadhar && f.doc_aadhar !== '—') ||
        (f.doc_resume && f.doc_resume !== '—');

      const statusBadge = f.dor
        ? `<span class="pill pr">Relieved: ${fmtD(f.dor)}</span>`
        : `<span class="pill pg">Serving</span>`;

      return `
        <div class="fc">
          <div class="fcav" style="background:linear-gradient(135deg,${c},${c2})">
            ${ini || 'F'}
          </div>

          <div class="fcname">${f.name || '—'}</div>
          <div class="fcdept">${f.department || '—'} · ${f.designation || '—'}</div>

          <div class="fcmeta">
            🆔 ${f.empid || '—'}<br>
            📱 ${f.phone || '—'}<br>
            🎓 ${f.qualification || '—'}${f.specialization ? ' — ' + f.specialization : ''}<br>
            📅 Joined: ${fmtD(f.doj)}
            ${f.dor ? `<br>🚪 Relieved: ${fmtD(f.dor)}` : ''}
            <br>⏱ Teach: ${f.teaching_exp || 0}y${f.research_exp ? ` | Res: ${f.research_exp}y` : ''}${f.industry_exp ? ` | Ind: ${f.industry_exp}y` : ''}
          </div>

          <div class="fcdocs" style="margin-top:7px">
            ${statusBadge}
            <span class="pill pt">PAN: ${f.pan_no || '—'}</span>
          </div>

          <div class="fac-actions">
            ${
              canViewDocs && hasDocs
              ? `<button class="btn-vd" onclick="openDocsModal(${f.id},'${String(f.name || '').replace(/'/g,"\\'")}','${f.doc_appt || '—'}','${f.doc_pan || '—'}','${f.doc_aadhar || '—'}','${f.doc_resume || '—'}')">📂 View Docs</button>`
              : ''
            }

            ${
              canManage || canEditOwn
              ? `<button class="btn-edit" onclick="openEditModal(${JSON.stringify(f).replace(/"/g,'&quot;')})">✏️ Edit / Re-upload Docs</button>`
              : ''
            }

            ${
              canManage
              ? `<button class="btn-del" onclick="openDelModal(${f.id},'${String(f.name || '').replace(/'/g,"\\'")}')">🗑 Delete</button>`
              : ''
            }
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    toast('Unable to load faculty directory: ' + err.message, 'error');
  }
}

function openDocsModal(id,name,appt,pan,aadhar,resume) {
  document.getElementById('modal-title').textContent = name + ' — Documents';
  document.getElementById('modal-sub').textContent = 'View, download or delete uploaded documents';

  const docs = [
    {label:'Appointment Order', file:appt},
    {label:'PAN Card', file:pan},
    {label:'Aadhar Card', file:aadhar},
    {label:'Resume / CV', file:resume}
  ].filter(d => d.file && d.file !== '—');

  const dl = document.getElementById('modal-docs');

  dl.innerHTML = docs.length ? docs.map(d => `
    <div class="ditem">
      <div>
        <div class="ditem-name">📎 ${d.file}</div>
        <div class="ditem-tag">${d.label}</div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap">

        <button class="btn-vd"
          onclick="viewFacultyDoc(${id},'${docTypeKey(d.label)}')">
          👁 View
        </button>

        <button class="btn-edit"
          onclick="downloadFacultyDoc(${id},'${docTypeKey(d.label)}','${d.file}')">
          ⬇ Download
        </button>

        <button class="btn-del"
          onclick="deleteFacultyDoc(${id},'${docTypeKey(d.label)}')">
          🗑 Delete
        </button>

      </div>
    </div>
  `).join('') : '<div class="empty">No documents uploaded.</div>';

  sd('docs-modal','flex');
}

async function viewFacultyDoc(id, docType) {
  try {
    const res = await fetch(apiUrl(`/faculty/${id}/docs/${docType}`), {
      headers: { Authorization: `Bearer ${localStorage.getItem('iqac_token')}` }
    });

    if (!res.ok) throw new Error('Unable to view document');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

  } catch (err) {
    toast(err.message, 'error');
  }
}

async function downloadFacultyDoc(id, docType, filename) {
  try {
    const res = await fetch(apiUrl(`/faculty/${id}/docs/${docType}`), {
     headers: { Authorization: `Bearer ${localStorage.getItem('iqac_token')}` }
    });

    if (!res.ok) throw new Error('Unable to download document');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

  } catch (err) {
    toast(err.message, 'error');
  }
}

function docTypeKey(label) {
  const m={'Appointment Order':'doc_appt','PAN Card':'doc_pan','Aadhar Card':'doc_aadhar','Resume / CV':'doc_resume'};
  return m[label]||'doc_appt';
}

function openEditModal(fRaw) {
  const f = typeof fRaw==='string' ? JSON.parse(fRaw.replace(/&quot;/g,'"')) : fRaw;
  document.getElementById('edit-fac-id').value = f.id;
  document.getElementById('edit-fac-sub').textContent = `Editing profile for: ${f.name}`;
  const setV=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||'';};
  setV('ef-name',f.name); setV('ef-dept',f.department); setV('ef-empid',f.empid);
  setV('ef-phone',f.phone); setV('ef-desig',f.designation);
  setV('ef-dob',f.dob?.split('T')[0]||''); setV('ef-doj',f.doj?.split('T')[0]||'');
  setV('ef-dor',f.dor?.split('T')[0]||''); setV('ef-status',f.emp_status||'serving');
  setV('ef-qual',f.qualification); setV('ef-spec',f.specialization);
  setV('ef-aadhar',f.aadhar_no); setV('ef-pan',f.pan_no);
  setV('ef-texp',f.teaching_exp); setV('ef-rexp',f.research_exp); setV('ef-iexp',f.industry_exp);
  sd('edit-fac-modal','flex');
}
async function saveEditFac() {
  const id = document.getElementById('edit-fac-id').value;

  const fd = new FormData();

  fd.append('name', gv('ef-name'));
  fd.append('department', gv('ef-dept'));
  fd.append('empid', gv('ef-empid'));
  fd.append('phone', gv('ef-phone'));
  fd.append('designation', gv('ef-desig'));
  fd.append('dob', gv('ef-dob'));
  fd.append('doj', gv('ef-doj'));
  fd.append('dor', gv('ef-dor'));
  fd.append('emp_status', gv('ef-status'));
  fd.append('qualification', gv('ef-qual'));
  fd.append('specialization', gv('ef-spec'));
  fd.append('aadhar_no', gv('ef-aadhar'));
  fd.append('pan_no', gv('ef-pan'));
  fd.append('teaching_exp', gv('ef-texp'));
  fd.append('research_exp', gv('ef-rexp'));
  fd.append('industry_exp', gv('ef-iexp'));

  const appt = document.getElementById('ef-doc-appt').files[0];
  const pan = document.getElementById('ef-doc-pan').files[0];
  const aadhar = document.getElementById('ef-doc-aadhar').files[0];
  const resume = document.getElementById('ef-doc-resume').files[0];

  if (appt) fd.append('doc_appt', appt);
  if (pan) fd.append('doc_pan', pan);
  if (aadhar) fd.append('doc_aadhar', aadhar);
  if (resume) fd.append('doc_resume', resume);

  if (!gv('ef-name') || !gv('ef-dept') || !gv('ef-empid') || !gv('ef-desig')) {
    toast('Name, Dept, Emp ID and Designation are required.', 'error');
    return;
  }

  try {
    await api(`/faculty/${id}`, {
      method: 'PUT',
      body: fd
    });

    sd('edit-fac-modal', 'none');
    loadFaculty();
    toast('Faculty profile and documents updated!', 'success');

  } catch (err) {
    toast(err.message, 'error');
  }
}
function openDelModal(id,name) {
  document.getElementById('del-fac-id').value=id;
  document.getElementById('del-modal-sub').textContent=`Are you sure you want to delete the profile of "${name}"?`;
  sd('del-modal','flex');
}
async function confirmDelFac() {
  const id=document.getElementById('del-fac-id').value;
  try {
    await api(`/faculty/${id}`,{method:'DELETE'});
    sd('del-modal','none'); loadFaculty(); loadDashboard(); toast('Faculty profile deleted.','warn');
  } catch(err){ toast(err.message,'error'); }
}
async function deleteFacultyDoc(id, docType) {

  if(!confirm('Delete this document?')) return;

  try {

    await api(`/faculty/${id}/docs/${docType}`,{
      method:'DELETE'
    });

    toast('Document deleted successfully','success');

    loadFaculty();

    sd('docs-modal','none');

  } catch(err) {

    toast(err.message,'error');

  }
}

// ══ USER MANAGEMENT ══
async function loadUsers() {
  try {
    const rows=await api('/users');
    const tb=document.getElementById('users-tbody');
    const rp={faculty:'pg',hod:'pb',iqac:'pw',iqac_dept:'pt',principal:'pr',accounts:'pp'};
    tb.innerHTML=rows.map((u,i)=>`<tr><td style="color:var(--text3)">${i+1}</td><td class="b">${u.empid}</td><td>${u.email}</td><td><span class="pill ${rp[u.role]||'pb'}">${RLBL[u.role]||u.role}</span></td><td>${u.department||'—'}</td><td style="color:var(--text3);font-size:11px">${fmtD(u.created_at?.slice(0,10))}</td><td><button class="btn-del" onclick="delUser(${u.id},'${u.empid}')">🗑</button></td></tr>`).join('');
  } catch(err){ toast(err.message,'error'); }
}
async function delUser(id,empid) {
  if(!confirm(`Delete user ${empid}?`))return;
  try { await api(`/users/${id}`,{method:'DELETE'}); loadUsers(); toast('User deleted.','warn'); } catch(err){ toast(err.message,'error'); }
}

// ══ STABS ══
function swTab(id, btn) {
  const page = btn.closest('.page');

  if (page) {
    page.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  }

  btn.classList.add('active');

  ['fac-add', 'fac-dir', 'att-add', 'att-view'].forEach(s => {
    const e = document.getElementById(s);
    if (e) e.style.display = s === id ? 'block' : 'none';
  });

  if (id === 'fac-dir') {
    console.log('Opening Faculty Directory...');
    loadFaculty();
  }

  if (id === 'att-view') {
    loadAttended();
  }
}

// ══ DOWNLOADS ══
function toXL(sheets,fname){const wb=XLSX.utils.book_new();sheets.forEach(({n,d})=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(d),n));XLSX.writeFile(wb,fname+'_'+new Date().toISOString().slice(0,10)+'.xlsx');}
function toWD(title,body){const html=`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='UTF-8'><style>body{font-family:Calibri,sans-serif;font-size:11pt}h1{font-size:16pt;color:#1a3a6b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:5px 9px;font-size:10pt}th{background:#e8edf5;font-weight:bold}</style></head><body>${body}</body></html>`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff',html],{type:'application/msword'}));a.download='IQAC_'+title+'_'+new Date().toISOString().slice(0,10)+'.doc';a.click();}
async function dlDashXL(){if(_dashData){const vd=_dashData.depts||DEPTS;toXL([{n:'Summary',d:[['Dept','Faculty','Events','Attended'],...vd.map(d=>[d,_dashData.facByDept?.[d]||0,_dashData.evByDept?.[d]||0,_dashData.attByDept?.[d]||0])]}],'IQAC_Dashboard');}}
async function dlDashWD(){if(_dashData){const vd=_dashData.depts||DEPTS;const rows=vd.map(d=>`<tr><td>${d}</td><td>${_dashData.facByDept?.[d]||0}</td><td>${_dashData.evByDept?.[d]||0}</td><td>${_dashData.attByDept?.[d]||0}</td></tr>`).join('');toWD('Dashboard',`<h1>IQAC Dashboard Report</h1><table><tr><th>Department</th><th>Faculty</th><th>Events</th><th>Attended</th></tr>${rows}</table>`);}}
async function dlEvsXL(){try{const evs=await api('/events');toXL([{n:'Events',d:[['#','Name','Dept','Type','Date','Coordinator','Participants','Status'],...evs.map((e,i)=>[i+1,e.name,e.department,e.type,e.event_date,e.coordinator,e.participants,e.status])]}],'IQAC_Events');}catch{}}
async function dlEvsWD(){try{const evs=await api('/events');const rows=evs.map((e,i)=>`<tr><td>${i+1}</td><td>${e.name}</td><td>${e.department}</td><td>${e.type}</td><td>${fmtD(e.event_date)}</td><td>${e.coordinator}</td><td>${e.participants}</td><td>${e.status}</td></tr>`).join('');toWD('Events',`<h1>Events Registry</h1><table><tr><th>#</th><th>Name</th><th>Dept</th><th>Type</th><th>Date</th><th>Coordinator</th><th>Participants</th><th>Status</th><th>Documents</th></tr>${rows}</table>`);}catch{}}
async function dlAttXL(){try{const rows=await api('/attended');toXL([{n:'Attended',d:[['#','Faculty','Dept','Event','Type','Date','AY'],...rows.map((r,i)=>[i+1,r.faculty_name,r.department,r.event_name,r.event_type,r.event_date,r.academic_year])]}],'IQAC_EventsAttended');}catch{}}
async function dlAttWD(){try{const rows=await api('/attended');const r2=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.faculty_name}</td><td>${r.department}</td><td>${r.event_name}</td><td>${r.event_type}</td><td>${fmtD(r.event_date)}</td></tr>`).join('');toWD('Events_Attended',`<h1>Events Attended</h1><table><tr><th>#</th><th>Faculty</th><th>Dept</th><th>Event</th><th>Type</th><th>Date</th></tr>${r2}</table>`);}catch{}}
async function dlFacXL(){try{const list=await api('/faculty');toXL([{n:'Faculty',d:[['#','Name','Dept','EmpID','Phone','Designation','DOB','DOJ','DOR','Qualification','Specialization','Teaching','Research','Industry','Aadhar','PAN'],...list.map((f,i)=>[i+1,f.name,f.department,f.empid,f.phone,f.designation,f.dob,f.doj,f.dor||'—',f.qualification,f.specialization,f.teaching_exp,f.research_exp,f.industry_exp,f.aadhar_no,f.pan_no])]}],'IQAC_Faculty');}catch{}}
async function dlFacWD(){try{const list=await api('/faculty');const rows=list.map((f,i)=>`<tr><td>${i+1}</td><td>${f.name}</td><td>${f.department}</td><td>${f.empid}</td><td>${f.designation}</td><td>${f.qualification}</td><td>${f.teaching_exp}y</td><td>${fmtD(f.doj)}</td></tr>`).join('');toWD('Faculty',`<h1>Faculty Directory</h1><table><tr><th>#</th><th>Name</th><th>Dept</th><th>Emp ID</th><th>Designation</th><th>Qual</th><th>Teaching Exp</th><th>DOJ</th></tr>${rows}</table>`);}catch{}}

// ══ SESSION RESTORE ══
(function init(){
  if(TOKEN&&CU){
    // Verify token is still valid
    api('/auth/me').then(()=>launch()).catch(()=>{
      localStorage.removeItem('iqac_token'); localStorage.removeItem('iqac_user');
      goTo('scr-login');
    });
  } else { goTo('scr-login'); }
})();
</script>
</body>
</html>
