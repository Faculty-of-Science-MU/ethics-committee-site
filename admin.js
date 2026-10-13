/* لوحة اللجنة — تُشغَّل بـ AdminApp.start() */
(function(){
'use strict';

/* ============================================================
   حالة صفحة اللجنة
   ============================================================ */

let AV = "login";
function go(v){ AV = v; render(); window.scrollTo({top:0,behavior:"smooth"}); }
function render(){
  const a = APP(); a.innerHTML = "";
  if(!ADMIN_OK)                a.appendChild(viewLogin());
  else if(AV==="one" && CUR)   a.appendChild(viewOne());
  else if(AV==="stats")        a.appendChild(viewStats());
  else if(AV==="report")       a.appendChild(viewReport());
  else                         a.appendChild(viewAdmin());
}
/* ============================================================
   لوحة اللجنة
   ============================================================ */
let ADMIN_OK=false, ADMIN_CODE="", MEMBER="", SUBS=[], TAB="all", CUR=null;
let VER=null;   /* النسخة المعروضة حالياً في شاشة الطلب (null = الحالية) */

function viewLogin(){
  const w=el("div","panel"); w.style.maxWidth="440px"; w.style.margin="40px auto 0";
  w.appendChild(el("div","panel-head",
    '<span class="pico">🔐</span><div class="grow"><h2>دخول اللجنة</h2><p>هذه الصفحة مخصصة لأعضاء لجنة أخلاقيات البحث العلمي.</p></div>'));
  if(!LIVE){
    w.appendChild(el("div","head-note",
      '<span class="ico">&#9888;</span><div><b>وضع تجريبي:</b> لا يوجد خادم متصل، '+
      'فأي كود يفتح اللوحة. في الموقع الحقيقي يتحقق الخادم من كود كل عضو.</div>'));
  }
  const g=el("div","fgroup");
  g.appendChild(el("label","fl","كود الدخول"));
  const i=el("input"); i.type="password"; i.placeholder="••••••••"; i.autocomplete="current-password";
  g.appendChild(i); w.appendChild(g);
  const row=el("div","btn-row");
  const b=el("button","btn","دخول"); b.type="button";
  const back=el("button","btn ghost","→ رجوع لصفحة الطالب"); back.type="button";
  back.addEventListener("click",()=>{ if(window.ADMIN_BACK) window.ADMIN_BACK(); else location.href="index.html"; });
  const doLogin=async()=>{
    const code=i.value.trim();
    if(!code) return toast("اكتب كود الدخول", true);
    b.disabled=true; b.textContent="جارٍ التحقق…";
    try{
      if(LIVE){
        const r=await api("list",{code:code});
        SUBS=r.items||[]; MEMBER=r.member||"";
      } else {
        /* وضع تجريبي بلا خادم: لا توجد بيانات حقيقية، فأي كود يفتح اللوحة.
           في الوضع الحقيقي يتحقق Apps Script من الكود ولا يصل إلى المتصفح أبداً. */
        let L = localSubs();
        if(!L.length){ L = demoSeed(); localSave(L); }
        SUBS=L; MEMBER="عضو تجريبي";
      }
      ADMIN_OK=true; ADMIN_CODE=code; go("admin");
      toast("أهلاً بك، "+MEMBER);
    }catch(e){ toast(e.message==="offline"?"غير متصل":"كود غير صحيح", true); }
    b.disabled=false; b.textContent="دخول";
  };
  b.addEventListener("click",doLogin);
  i.addEventListener("keydown",e=>{ if(e.key==="Enter") doLogin(); });
  row.appendChild(b); row.appendChild(el("span","spacer")); row.appendChild(back);
  w.appendChild(row);
  setTimeout(()=>i.focus(),100);
  return w;
}

async function refreshSubs(){
  if(LIVE){ try{ const r=await api("list",{code:ADMIN_CODE}); SUBS=r.items||[]; }catch(e){ toast("تعذّر التحديث",true); } }
  else SUBS=localSubs();
}

function viewAdmin(){
  const w=el("div");
  const bar=el("div","admin-bar");
  bar.innerHTML='<b>لوحة لجنة أخلاقيات البحث العلمي</b>'+
    (MEMBER?'<span class="chip ok" style="background:rgba(255,255,255,.14);color:#CFEADD">'+esc(MEMBER)+'</span>':'')+
    '<span style="font-size:12px;opacity:.75">'+(LIVE?"متصل بقاعدة البيانات":"وضع تجريبي — البيانات على هذا الجهاز فقط")+'</span>'+
    '<span class="spacer"></span>';
  const stBtn=el("button",null,"📊 إحصائيات الجودة");
  stBtn.addEventListener("click",()=>go("stats"));
  bar.appendChild(stBtn);
  const ex=el("button",null,"⤓ Excel");
  ex.addEventListener("click",()=>exportCsv());
  bar.appendChild(ex);
  const exPdf=el("button",null,"⤓ PDF");
  exPdf.addEventListener("click",()=>exportPdf());
  bar.appendChild(exPdf);
  const exWord=el("button",null,"⤓ Word");
  exWord.addEventListener("click",()=>exportWord());
  bar.appendChild(exWord);
  const rf=el("button",null,"⟳ تحديث"); rf.addEventListener("click",async()=>{ await refreshSubs(); render(); toast("تم التحديث"); });
  const out=el("button",null,"خروج"); out.addEventListener("click",()=>{ ADMIN_OK=false; ADMIN_CODE=""; SUBS=[]; CUR=null; go("login"); });
  bar.appendChild(rf); bar.appendChild(out);
  w.appendChild(bar);

  const counts={ all:SUBS.length, approved:0, revision:0, pending:0 };
  SUBS.forEach(s=>{ counts[s.status||"pending"]=(counts[s.status||"pending"]||0)+1; });

  const tabs=el("div","tabs");
  [["all","📋 كل الطلبات"],["pending","🕓 في انتظار المراجعة"],
   ["approved","✓ الملفات مستوفاة"],["revision","✎ الملفات غير مستوفاة"]].forEach(([k,l])=>{
    const b=el("button","tab"+(TAB===k?" on":"")); b.type="button"; b.dataset.k=k;
    b.innerHTML="<span>"+l+"</span><u>"+(counts[k]||0)+"</u>";
    b.addEventListener("click",()=>{ TAB=k; render(); });
    tabs.appendChild(b);
  });
  w.appendChild(tabs);

  const list = TAB==="all"?SUBS:SUBS.filter(s=>(s.status||"pending")===TAB);
  const p=el("div","panel"); p.style.padding="16px";
  if(!list.length){
    p.appendChild(el("div","empty",'<div class="e-ico">📭</div><div>لا توجد طلبات في هذه الخانة بعد.</div>'));
  } else {
    const sc=el("div","scroll-x"); sc.style.border="0";
    const t=el("table","dtable");
    t.innerHTML='<thead><tr><th>الكود</th><th>الطالب</th><th>القسم / الحالة</th><th>الدرجة</th><th>تاريخ التقديم</th><th>الحالة</th><th></th></tr></thead>';
    const tb=el("tbody");
    list.forEach(s=>{
      const d=DEPTS[s.dept], c=s.cat?CATS[s.cat]:null;
      const st=s.status||"pending";
      const chip = st==="approved"?'<span class="chip ok">✓ مستوفاة</span>'
                 : st==="revision"?'<span class="chip rev">✎ غير مستوفاة</span>'
                 : '<span class="chip pend">🕓 قيد المراجعة</span>';
      const tr=el("tr");
      tr.innerHTML =
        '<td class="mono">'+esc(s.code||"—")+((s.version||1)>1?'<br><span class="chip rev" style="font-size:10px;padding:1px 7px">نسخة '+(s.version)+'</span>':'')+'</td>'+
        '<td class="nm">'+esc(s.student.name)+'<small>'+esc(s.student.email)+'</small></td>'+
        '<td>'+esc(d?d.ar:"—")+(c?'<br><small style="color:var(--ink-3);font-size:11px">'+esc(c.ar)+'</small>':"")+'</td>'+
        '<td style="font-size:12px">'+esc(s.student.degree||"—")+'</td>'+
        '<td class="mono">'+esc(fmtDateTime(s.createdAt))+'</td>'+
        '<td>'+chip+'</td>';
      const td=el("td");
      const b=el("button","btn ghost sm","فتح الملف"); b.type="button";
      b.addEventListener("click",()=>{ CUR=s; VER=null; go("one"); });
      td.appendChild(b); tr.appendChild(td); tb.appendChild(tr);
    });
    t.appendChild(tb); sc.appendChild(t); p.appendChild(sc);
  }
  w.appendChild(p);
  return w;
}

function viewOne(){
  const s=CUR; const w=el("div");
  const bar=el("div","admin-bar");
  bar.innerHTML='<b>'+esc(s.student.name)+'</b><span style="font-size:12px;opacity:.75">'+esc(s.code||"")+'</span><span class="spacer"></span>';
  const back=el("button",null,"→ رجوع للقائمة"); back.addEventListener("click",()=>go("admin"));
  const prt=el("button",null,"🖨️ طباعة / حفظ PDF"); prt.addEventListener("click",()=>window.print());
  bar.appendChild(prt); bar.appendChild(back);
  w.appendChild(bar);

  const st=s.status||"pending";
  if(st!=="pending"){
    const note=el("div","panel"); note.style.cssText="padding:16px 20px;margin-top:14px";
    note.innerHTML = '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">'+
      (st==="approved"?'<span class="chip ok">✓ تم اعتماد الملفات كمستوفاة</span>':'<span class="chip rev">✎ طُلب تعديل الملفات</span>')+
      '<span style="font-size:12.5px;color:var(--ink-3)">بتاريخ '+esc(fmtDateTime(s.reviewedAt))+
      (s.reviewedBy?' — بمعرفة <b style="color:var(--green-800)">'+esc(s.reviewedBy)+'</b>':'')+'</span></div>'+
      (s.reviewNote?'<div style="margin-top:12px;font-size:13px;white-space:pre-wrap;background:var(--mint);padding:11px 14px;border-radius:10px;border-inline-start:3px solid var(--gold)"><b style="color:var(--gold-deep)">التعديل المطلوب الذي أُرسل للطالب:</b><br>'+esc(s.reviewNote)+'</div>':"");
    w.appendChild(note);
  }

  // متصفّح النسخ السابقة
  const hist = s.history || [];
  if(hist.length){
    const hb=el("div","panel"); hb.style.cssText="padding:14px 18px;margin-top:14px";
    const rowv=el("div"); rowv.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap";
    rowv.appendChild(el("b",null,"نسخ هذا الطلب:"));
    rowv.firstChild.style.cssText="font-size:12.5px;color:var(--ink-3);font-weight:600";
    hist.forEach(h=>{
      const b=el("button","btn ghost sm","النسخة "+h.version); b.type="button";
      if(VER===h.version) b.className="btn sm";
      b.addEventListener("click",()=>{ VER=h.version; render(); });
      rowv.appendChild(b);
    });
    const cb=el("button", VER===null?"btn sm":"btn ghost sm","النسخة "+(s.version||1)+" (الحالية)");
    cb.type="button"; cb.addEventListener("click",()=>{ VER=null; render(); });
    rowv.appendChild(cb);
    hb.appendChild(rowv);
    const cur = VER===null ? null : hist.filter(h=>h.version===VER)[0];
    if(cur){
      hb.appendChild(el("p","fsec-note",
        "تعرض الآن نسخة سابقة أُرسلت في "+esc(fmtDateTime(cur.submittedAt))+
        (cur.reviewNote?" وطُلب فيها: "+esc(cur.reviewNote):"")));
    }
    w.appendChild(hb);
  }

  const shown = (VER===null) ? s
    : Object.assign({}, s, (hist.filter(h=>h.version===VER)[0]||{}),
                    { code:s.code, student:(hist.filter(h=>h.version===VER)[0]||{}).student||s.student });
  w.appendChild(renderDoc(shown,false));

  const row=el("div","btn-row no-print");
  const ok=el("button","btn","✓ الملفات مستوفاة — أرسل الإشعار"); ok.type="button";
  ok.addEventListener("click",()=>decide(s,"approved",""));
  const no=el("button","btn rose","✎ الملفات غير مستوفاة — اكتب التعديل"); no.type="button";
  no.addEventListener("click",()=>askRevision(s));
  row.appendChild(ok); row.appendChild(el("span","spacer")); row.appendChild(no);
  w.appendChild(row);
  return w;
}

function askRevision(s){
  const m=el("div","modal");
  const b=el("div","modal-box");
  b.appendChild(el("h3",null,"المطلوب تعديله"));
  b.appendChild(el("p","m-sub","اكتبي بالتفصيل ما يجب على الطالب تعديله — سيصله نصك كما هو داخل الرسالة الرسمية."));
  const ta=el("textarea"); ta.rows=7;
  ta.placeholder="مثال:\n1- لم يتم توضيح طريقة حساب حجم العينة في البند b.\n2- يجب إرفاق تفاصيل ظروف الإيواء (Housing) كاملة.\n3- عنوان البحث بالعربية لا يطابق العنوان بالإنجليزية.";
  ta.value = s.reviewNote||"";
  b.appendChild(ta);
  const row=el("div","btn-row");
  const send=el("button","btn rose","إرسال طلب التعديل للطالب"); send.type="button";
  const cancel=el("button","btn ghost","إلغاء"); cancel.type="button";
  cancel.addEventListener("click",()=>m.remove());
  send.addEventListener("click",()=>{
    const v=ta.value.trim();
    if(!v){ ta.classList.add("bad"); return toast("اكتبي التعديل المطلوب أولاً", true); }
    m.remove(); decide(s,"revision",v);
  });
  row.appendChild(send); row.appendChild(el("span","spacer")); row.appendChild(cancel);
  b.appendChild(row); m.appendChild(b);
  m.addEventListener("click",e=>{ if(e.target===m) m.remove(); });
  document.body.appendChild(m);
  setTimeout(()=>ta.focus(),80);
}

async function decide(s, status, note){
  const label = status==="approved"?"إشعار الاستيفاء":"طلب التعديل";
  try{
    if(LIVE){
      await api("decide",{ code:ADMIN_CODE, id:s.id, status, note });
      await refreshSubs();
      CUR = SUBS.find(x=>x.id===s.id) || s;
    } else {
      const list=localSubs();
      const t=list.find(x=>x.id===s.id);
      if(t){ t.status=status; t.reviewNote=note; t.reviewedAt=new Date().toISOString(); t.reviewedBy=MEMBER; }
      localSave(list); SUBS=list; CUR=t||s;
    }
    toast(LIVE ? ("تم إرسال "+label+" إلى "+s.student.email)
               : ("تم تسجيل القرار — في الوضع الحقيقي يُرسَل "+label+" إلى "+s.student.email));
    render();
  }catch(e){ toast("تعذّر الحفظ: "+e.message, true); }
}

/* ============================================================
   التشغيل
   ============================================================ */


/* ---------- تصدير كل الطلبات إلى Excel ---------- */
function exportCsv(){
  if(!SUBS.length) return toast("لا توجد طلبات للتصدير", true);
  const AR = { pending:"قيد المراجعة", approved:"مستوفاة", revision:"غير مستوفاة" };
  const head = ["الرقم الكودي","اسم الطالب","البريد الإلكتروني","رقم المحمول","الدرجة العلمية",
                "القسم","حالة البحث","عنوان الرسالة","تاريخ التقديم","رقم النسخة",
                "الحالة","تاريخ المراجعة","بمعرفة","المطلوب تعديله"];
  const cell = v => '"' + String(v==null?"":v).replace(/"/g,'""').replace(/\r?\n/g," / ") + '"';
  const rows = SUBS.map(s=>{
    const d=DEPTS[s.dept], c=s.cat?CATS[s.cat]:null;
    return [ s.code, s.student.name, s.student.email, s.student.phone, s.student.degree,
             d?d.ar:"", c?c.ar:"", s.student.thesis,
             fmtDateTime(s.createdAt), s.version||1,
             AR[s.status||"pending"]||"", s.reviewedAt?fmtDateTime(s.reviewedAt):"",
             s.reviewedBy||"", s.reviewNote||"" ].map(cell).join(",");
  });
  const csv = "﻿" + [head.map(cell).join(",")].concat(rows).join("\r\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "طلبات-لجنة-الأخلاقيات-" + new Date().toISOString().slice(0,10) + ".csv";
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); }, 400);
  toast("تم تصدير " + SUBS.length + " طلب");
}

/* ---------- تصدير تقرير PDF (طباعة المتصفح) ---------- */
function exportPdf(){
  if(!SUBS.length) return toast("لا توجد طلبات للتصدير", true);
  go("report");
}

function viewReport(){
  const w=el("div");
  const bar=el("div","admin-bar no-print");
  bar.innerHTML='<b>تقرير الطلبات — نسخة للطباعة / PDF</b><span class="spacer"></span>';
  const back=el("button",null,"→ رجوع"); back.type="button"; back.addEventListener("click",()=>go("admin"));
  const prt=el("button",null,"🖨️ طباعة / حفظ PDF"); prt.type="button"; prt.addEventListener("click",()=>window.print());
  bar.appendChild(prt); bar.appendChild(back);
  w.appendChild(bar);

  const doc=el("div","doc");
  const srcOf=id=>{ const n=$("#"+id); return (n&&n.tagName==="IMG")?n.src:""; };
  const slot=(id,txt)=>{ const s=srcOf(id); return s?'<img class="logo" src="'+s+'" alt="">':'<div class="logo-ph">'+txt+'</div>'; };
  const head=el("div","doc-head");
  head.innerHTML='<div class="dh-row">'+slot("logoUni","شعار<br>الجامعة")+
    '<div><h2>تقرير إجمالي بطلبات لجنة أخلاقيات البحث العلمي</h2>'+
    '<div class="sub">كلية العلوم — جامعة المنصورة · بتاريخ '+esc(fmtDateTime(new Date().toISOString()))+
    ' · إجمالي '+SUBS.length+' طلب</div></div>'+slot("logoFac","شعار<br>الكلية")+'</div>';
  doc.appendChild(head);

  const AR = { pending:"قيد المراجعة", approved:"مستوفاة", revision:"غير مستوفاة" };
  const sc=el("div","scroll-x"); sc.style.cssText="border:0;margin-top:6px";
  const t=el("table","report-table");
  t.innerHTML='<thead><tr><th>#</th><th>الكود</th><th>الاسم</th><th>القسم</th><th>الدرجة</th>'+
    '<th>تاريخ التقديم</th><th>الحالة</th></tr></thead>';
  const tb=el("tbody");
  SUBS.forEach((s,i)=>{
    const d=DEPTS[s.dept];
    const tr=el("tr");
    tr.innerHTML='<td>'+(i+1)+'</td><td class="mono">'+esc(s.code)+'</td><td>'+esc(s.student.name)+'</td>'+
      '<td>'+esc(d?d.ar:"—")+'</td><td>'+esc(s.student.degree||"—")+'</td>'+
      '<td class="mono">'+esc(fmtDateTime(s.createdAt))+'</td><td>'+esc(AR[s.status||"pending"])+'</td>';
    tb.appendChild(tr);
  });
  t.appendChild(tb); sc.appendChild(t); doc.appendChild(sc);
  w.appendChild(doc);

  setTimeout(()=>window.print(), 300);
  return w;
}

/* ---------- تصدير تقرير Word ---------- */
function exportWord(){
  if(!SUBS.length) return toast("لا توجد طلبات للتصدير", true);
  const AR = { pending:"قيد المراجعة", approved:"مستوفاة", revision:"غير مستوفاة" };
  const rows = SUBS.map((s,i)=>{
    const d=DEPTS[s.dept];
    return "<tr>"+
      "<td>"+(i+1)+"</td><td>"+esc(s.code)+"</td><td>"+esc(s.student.name)+"</td>"+
      "<td>"+esc(s.student.email)+"</td><td>"+esc(d?d.ar:"—")+"</td>"+
      "<td>"+esc(s.student.degree||"—")+"</td><td>"+esc(fmtDateTime(s.createdAt))+"</td>"+
      "<td>"+esc(AR[s.status||"pending"])+"</td>"+
    "</tr>";
  }).join("");
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" '+
    'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'+
    '<head><meta charset="utf-8"><title>تقرير طلبات اللجنة</title>'+
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>'+
    '<w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->'+
    "<style>"+
      "body{font-family:Arial,Tahoma,sans-serif;direction:rtl}"+
      "table{border-collapse:collapse;width:100%;font-size:11pt}"+
      "th,td{border:1px solid #999;padding:5px 8px;text-align:right}"+
      "th{background:#E6F4EC;color:#17694A}"+
      "h1{font-size:16pt;color:#0F2B21;margin-bottom:2px}"+
      ".sub{color:#555;font-size:10pt;margin-bottom:14px}"+
    "</style></head><body>"+
    "<h1>تقرير إجمالي بطلبات لجنة أخلاقيات البحث العلمي</h1>"+
    '<div class="sub">كلية العلوم — جامعة المنصورة · بتاريخ '+fmtDateTime(new Date().toISOString())+
    " · إجمالي "+SUBS.length+" طلب</div>"+
    "<table><thead><tr><th>#</th><th>الكود</th><th>الاسم</th><th>البريد الإلكتروني</th>"+
    "<th>القسم</th><th>الدرجة</th><th>تاريخ التقديم</th><th>الحالة</th></tr></thead>"+
    "<tbody>"+rows+"</tbody></table></body></html>";
  const blob = new Blob(["﻿"+html], { type:"application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "تقرير-طلبات-لجنة-الأخلاقيات-" + new Date().toISOString().slice(0,10) + ".doc";
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); }, 400);
  toast("تم تصدير " + SUBS.length + " طلب بصيغة Word");
}

/* ============================================================
   إحصائيات الجودة
   ============================================================ */
const DEPT_SHORT = { physics:"الفيزياء", math:"الرياضيات", geology:"الجيولوجيا",
  zoology:"علم الحيوان", chemistry:"الكيمياء", botany:"النبات" };

function computeStats(subs){
  const total = subs.length;
  const byStatus = { pending:0, approved:0, revision:0 };
  const byDept = {}; Object.keys(DEPTS).forEach(k=>byDept[k]=0);
  const byDay = {};
  let revisedCount = 0, turnArounds = [];
  subs.forEach(s=>{
    const st = s.status || "pending";
    byStatus[st] = (byStatus[st]||0) + 1;
    if(byDept[s.dept] != null) byDept[s.dept]++;
    const day = String(s.createdAt||"").slice(0,10);
    if(day) byDay[day] = (byDay[day]||0) + 1;
    if((s.version||1) > 1) revisedCount++;
    if(s.reviewedAt && s.createdAt){
      const diff = (new Date(s.reviewedAt) - new Date(s.createdAt)) / 86400000;
      if(diff >= 0) turnArounds.push(diff);
    }
  });
  const decided = byStatus.approved + byStatus.revision;
  const approvalRate = decided ? Math.round(byStatus.approved/decided*100) : null;
  const days = Object.keys(byDay).sort();
  const span = days.length ? Math.round((new Date(days[days.length-1]) - new Date(days[0]))/86400000) + 1 : 0;
  const avgPerDay = span ? total/span : total;
  const avgTurn = turnArounds.length ? turnArounds.reduce((a,b)=>a+b,0)/turnArounds.length : null;
  const topDeptKey = Object.keys(byDept).sort((a,b)=>byDept[b]-byDept[a])[0];
  return { total, byStatus, byDept, byDay, approvalRate, span, avgPerDay, revisedCount, avgTurn, topDeptKey, decided };
}

function buildNarrative(st){
  const top = DEPT_SHORT[st.topDeptKey] || "—";
  const rate = st.approvalRate!=null ? st.approvalRate+"٪" : "—";
  const turn = st.avgTurn==null ? "—" : (st.avgTurn<1 ? "أقل من يوم" : (Math.round(st.avgTurn*10)/10)+" يوم");
  return (
    "<p><b>تقرير الجودة — لجنة أخلاقيات البحث العلمي.</b> " +
    "يأتي هذا التقرير الآلي ضمن منظومة متابعة الجودة الإلكترونية بالكلية، تماشياً مع التحول الرقمي " +
    "ومعايير الاعتماد المؤسسي، وانسجاماً مع محاور رؤية مصر 2030 في التعليم والبحث العلمي.</p>" +
    "<p>تلقّت اللجنة حتى الآن <b>"+st.total+"</b> طلباً، بمعدل <b>"+st.avgPerDay.toFixed(1)+"</b> طلب يومياً تقريباً. " +
    "بلغت نسبة الطلبات التي اعتُمدت مباشرة كملفات مستوفاة <b>"+rate+"</b> من إجمالي الطلبات التي تم البت فيها " +
    "("+st.decided+" طلب)، بمتوسط زمن مراجعة قدره <b>"+esc(turn)+"</b>.</p>" +
    "<p>يُعد قسم <b>"+esc(top)+"</b> الأكثر تقديماً للطلبات حتى الآن. كما رجع <b>"+st.revisedCount+"</b> " +
    "من الطلبات بعد طلب تعديل وأُعيد تقديمها، وهو ما يعكس فاعلية آلية المتابعة والتعديل داخل الموقع.</p>"
  );
}

/* ---------- أدوات رسم بسيطة (SVG بلا مكتبات خارجية) ---------- */
function niceMax(v){
  if(v<=0) return 4;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const steps=[1,2,2.5,5,10];
  for(let i=0;i<steps.length;i++){ if(v<=steps[i]*mag) return steps[i]*mag; }
  return Math.ceil(v/mag)*mag;
}

/* رسم أعمدة (بار تشارت عادي لو سلسلة واحدة، أو مجمّع لو أكثر من سلسلة) */
function svgGroupedBars(groups, seriesKeys, seriesColors, opts){
  opts = opts || {};
  const W = opts.w || 640, H = opts.h || 260;
  const padL=38, padR=14, padT=18, padB=38;
  const plotW = W-padL-padR, plotH = H-padT-padB;
  let maxV = 0;
  groups.forEach(g=> seriesKeys.forEach(k=>{ maxV = Math.max(maxV, g[k]||0); }));
  const yMax = niceMax(maxV || 1);
  const n = Math.max(groups.length, 1);
  const groupW = plotW / n;
  const barGap = 10;
  const seriesN = seriesKeys.length;
  const barW = Math.max(5, (groupW - barGap*2 - (seriesN-1)*3) / seriesN);
  const yTicks = 4;
  let svg = '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="رسم بياني">';
  for(let i=0;i<=yTicks;i++){
    const v = yMax*i/yTicks;
    const y = padT + plotH - (v/yMax)*plotH;
    svg += '<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+y.toFixed(1)+'" stroke="#E3F0E8" stroke-width="1"/>';
    svg += '<text x="'+(padL-7)+'" y="'+(y+3.5).toFixed(1)+'" font-size="10" text-anchor="end">'+Math.round(v)+'</text>';
  }
  groups.forEach((g,gi)=>{
    const gx = padL + gi*groupW;
    seriesKeys.forEach((k,si)=>{
      const v = g[k]||0;
      const bh = (v/yMax)*plotH;
      const bx = gx + barGap + si*(barW+3);
      const by = padT+plotH-bh;
      svg += '<rect x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+
             '" rx="3" fill="'+seriesColors[si]+'"/>';
      if(v>0) svg += '<text x="'+(bx+barW/2).toFixed(1)+'" y="'+(by-4).toFixed(1)+
             '" font-size="10" font-weight="700" text-anchor="middle" fill="'+seriesColors[si]+'">'+v+'</text>';
    });
    const cx = gx + groupW/2;
    const lbl = String(g.label||"");
    svg += '<text x="'+cx.toFixed(1)+'" y="'+(padT+plotH+18)+'" font-size="11" text-anchor="middle">'+esc(lbl)+'</text>';
  });
  svg += '<line x1="'+padL+'" y1="'+(padT+plotH)+'" x2="'+(W-padR)+'" y2="'+(padT+plotH)+'" stroke="#CFE7DA" stroke-width="1.5"/>';
  svg += '</svg>';
  return svg;
}

/* هيستوجرام زمني — أعمدة متلاصقة بلا فراغات، فرق بصري واضح عن البار تشارت */
function svgHistogram(byDay, opts){
  opts = opts || {};
  const W = opts.w || 640, H = opts.h || 220;
  const padL=38, padR=14, padT=18, padB=34;
  const plotW = W-padL-padR, plotH = H-padT-padB;
  const days = Object.keys(byDay).sort();
  const n = Math.max(days.length, 1);
  const vals = days.map(d=>byDay[d]);
  const yMax = niceMax((vals.length?Math.max.apply(null,vals):1) || 1);
  const binW = plotW/n;
  const yTicks = 4;
  let svg = '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="هيستوجرام">';
  for(let i=0;i<=yTicks;i++){
    const v = yMax*i/yTicks;
    const y = padT + plotH - (v/yMax)*plotH;
    svg += '<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+y.toFixed(1)+'" stroke="#E3F0E8" stroke-width="1"/>';
    svg += '<text x="'+(padL-7)+'" y="'+(y+3.5).toFixed(1)+'" font-size="10" text-anchor="end">'+Math.round(v)+'</text>';
  }
  days.forEach((d,i)=>{
    const v = byDay[d];
    const bh = (v/yMax)*plotH;
    const bx = padL + i*binW;
    const by = padT+plotH-bh;
    svg += '<rect x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+Math.max(1,binW-1).toFixed(1)+
           '" height="'+bh.toFixed(1)+'" fill="#A37E2C"/>';
    if(v>0) svg += '<text x="'+(bx+binW/2).toFixed(1)+'" y="'+(by-4).toFixed(1)+
           '" font-size="10" font-weight="700" text-anchor="middle" fill="#A37E2C">'+v+'</text>';
    const dt = new Date(d+"T00:00:00");
    const lbl = isNaN(dt) ? d : (dt.getDate()+"/"+(dt.getMonth()+1));
    svg += '<text x="'+(bx+binW/2).toFixed(1)+'" y="'+(padT+plotH+16)+'" font-size="9.5" text-anchor="middle">'+lbl+'</text>';
  });
  svg += '<line x1="'+padL+'" y1="'+(padT+plotH)+'" x2="'+(W-padR)+'" y2="'+(padT+plotH)+'" stroke="#CFE7DA" stroke-width="1.5"/>';
  svg += '</svg>';
  return svg;
}

function viewStats(){
  const w=el("div");
  const bar=el("div","admin-bar");
  bar.innerHTML='<b>📊 إحصائيات الجودة</b><span class="spacer"></span>';
  const back=el("button",null,"→ رجوع للوحة"); back.type="button"; back.addEventListener("click",()=>go("admin"));
  bar.appendChild(back);
  w.appendChild(bar);

  const st = computeStats(SUBS);
  if(!st.total){
    const p=el("div","panel"); p.style.padding="16px";
    p.appendChild(el("div","empty",'<div class="e-ico">📊</div><div>لا توجد طلبات كافية بعد لعرض إحصائيات الجودة.</div>'));
    w.appendChild(p); return w;
  }

  const cards=el("div","stat-cards");
  const mk=(v,l,cls)=> el("div","stat-card"+(cls?(" "+cls):""), '<div class="sv">'+v+'</div><div class="sl">'+esc(l)+'</div>');
  cards.appendChild(mk(st.total, "إجمالي الطلبات المقدَّمة"));
  cards.appendChild(mk(st.byStatus.approved||0, "ملفات مستوفاة", "ok"));
  cards.appendChild(mk(st.byStatus.revision||0, "طلبات تعديل", "rev"));
  cards.appendChild(mk(st.byStatus.pending||0, "قيد المراجعة"));
  cards.appendChild(mk(st.approvalRate!=null ? st.approvalRate+"٪" : "—", "نسبة الاعتماد المباشر"));
  cards.appendChild(mk(st.avgPerDay.toFixed(1), "متوسط الطلبات / يوم"));
  w.appendChild(cards);

  const nar=el("div","narrative"); nar.innerHTML = buildNarrative(st);
  w.appendChild(nar);

  const p1=el("div","chart-panel");
  p1.innerHTML = '<h3>عدد الطلبات حسب القسم العلمي</h3><p class="ch-sub">بار تشارت — إجمالي الطلبات في كل قسم</p>';
  const deptGroups = Object.keys(DEPTS).map(k=>({ label:DEPT_SHORT[k], v: st.byDept[k]||0 }));
  p1.innerHTML += svgGroupedBars(deptGroups, ["v"], ["#2E9B6E"], {h:260});
  w.appendChild(p1);

  const p2=el("div","chart-panel");
  p2.innerHTML = '<h3>توزيع الطلبات عبر الأيام</h3><p class="ch-sub">هيستوجرام — عدد الطلبات المقدَّمة في كل يوم</p>';
  p2.innerHTML += svgHistogram(st.byDay, {h:220});
  if(Object.keys(st.byDay).length < 2){
    p2.innerHTML += '<p class="ch-sub" style="margin-top:8px">* البيانات الحالية ليوم واحد فقط — يتّضح التوزيع أكثر مع تراكم الطلبات على مدار أيام متعددة.</p>';
  }
  w.appendChild(p2);

  const p3=el("div","chart-panel");
  p3.innerHTML = '<h3>حالة المراجعة داخل كل قسم</h3>'+
    '<p class="ch-sub">ثلاثة أبعاد في رسم واحد: القسم (أفقي) × عدد الطلبات (رأسي) × حالة المراجعة (اللون)</p>';
  const matrix = Object.keys(DEPTS).map(k=>{
    const c = { pending:0, approved:0, revision:0 };
    SUBS.filter(s=>s.dept===k).forEach(s=>{ const st2=s.status||"pending"; c[st2]=(c[st2]||0)+1; });
    return Object.assign({ label: DEPT_SHORT[k] }, c);
  });
  p3.innerHTML += svgGroupedBars(matrix, ["pending","approved","revision"], ["#17694A","#146B4C","#9A5A12"], {h:260});
  p3.innerHTML += '<div class="chart-legend">'+
    '<span><i style="background:#17694A"></i>قيد المراجعة</span>'+
    '<span><i style="background:#146B4C"></i>مستوفاة</span>'+
    '<span><i style="background:#9A5A12"></i>غير مستوفاة</span></div>';
  w.appendChild(p3);

  return w;
}


/* ============================================================
   بيانات تجريبية — تظهر فقط في الوضع التجريبي (بدون خادم متصل).
   بمجرد وضع API_URL لا يُقرأ هذا الجزء إطلاقاً، والبيانات الحقيقية
   تأتي من جوجل شيت الخاص باللجنة.
   ============================================================ */
function demoSeed(){
  const day = n => new Date(Date.now() - n*86400000).toISOString();
  const S1 = {
    name:"محمد أحمد عبد الرحمن", email:"m.abdelrahman@std.mans.edu.eg",
    phone:"01012345678", degree:"رسالة ماجستير",
    thesis:"دراسة الخواص الضوئية لأغشية أكسيد الزنك النانومترية"
  };
  const S2 = {
    name:"سارة إبراهيم السيد", email:"sara.ibrahim@std.mans.edu.eg",
    phone:"01122334455", degree:"رسالة دكتوراه (فلسفة)",
    thesis:"تقييم النشاط المضاد للأكسدة لمستخلصات نبات الحلبة"
  };
  const S3 = {
    name:"كريم مصطفى شلبي", email:"k.shalaby@std.mans.edu.eg",
    phone:"01098765432", degree:"رسالة ماجستير",
    thesis:"أثر مستخلص البروبوليس على الخطوط الخلوية لسرطان الثدي"
  };
  const S4 = {
    name:"نورهان سمير فتحي", email:"n.samir@std.mans.edu.eg",
    phone:"01555667788", degree:"رسالة دكتوراه (فلسفة)",
    thesis:"التأثير الوقائي لفيتامين E على الكبد في ذكور الجرذان البيضاء"
  };

  const P = (o) => Object.assign({
    title_en:"", title_ar:"", pi:[{}], co:[{}], sponsor:"لا يوجد تمويل خارجي",
    site:"معامل كلية العلوم — جامعة المنصورة، ت: 0502200000",
    labs:"", background:"", literature:"", justification:"", use_findings:"",
    objectives:"", hypotheses:"", aim:"", design:"", procedures:"",
    n_total:"", n_calc:"", n_rep:"3", stats:"", general:"",
    funding:"لا يوجد", safety:"", dissemination:"", references:""
  }, o);

  const A = (o) => Object.assign({
    approval_for:"", researcher:"", specialty:"", job:"معيد",
    research_title:"", from_date:"2026-11-01", to_date:"2027-10-31",
    m1:"", m2:"", m3:"", m4:"", applicant:"", app_date:"2026-10-05",
    phone:"", email2:"", ack:true, ack_name:"", ack_dept:"", sig:""
  }, o);

  return [
    { id:"D4", code:"SCI-2026-0004-M7QK", version:1, status:"pending",
      createdAt:day(1), updatedAt:day(1), reviewedAt:"", reviewedBy:"", reviewNote:"",
      student:S1, dept:"physics", cat:"", history:[],
      protocol:P({ title_en:"Optical properties of nanostructured ZnO thin films",
        title_ar:S1.thesis,
        pi:[{name:"أ.د. هشام عبد المجيد",dept:"الفيزياء",role:"مشرف رئيسي",
             phone:"01001112233",email:"h.abdelmaged@mans.edu.eg"}],
        co:[{name:S1.name,dept:"الفيزياء",role:"باحث",phone:S1.phone,email:S1.email}],
        background:"تُعد أغشية أكسيد الزنك من أهم أشباه الموصلات ذات فجوة الطاقة الواسعة لما لها من تطبيقات في الخلايا الشمسية والكواشف الضوئية.",
        justification:"ندرة الدراسات المحلية على تأثير درجة حرارة الترسيب على الخواص الضوئية.",
        objectives:"تحضير أغشية ZnO بطريقة sol-gel ودراسة تأثير درجة حرارة المعالجة على فجوة الطاقة.",
        aim:"الوصول إلى الظروف المثلى للحصول على أعلى نفاذية ضوئية.",
        design:"دراسة معملية تجريبية على خمس مجموعات من العينات.",
        procedures:"تحضير المحلول، الترسيب بطريقة spin coating، المعالجة الحرارية، ثم القياس بـ UV-Vis و XRD و SEM.",
        n_total:"25 عينة — 5 عينات لكل مجموعة حرارية.",
        n_calc:"العدد كافٍ لحساب المتوسط والانحراف المعياري مع ثلاث تكرارات.",
        stats:"تحليل التباين ANOVA ثم اختبار Tukey عند مستوى معنوية 0.05.",
        safety:"لا يوجد تعامل مع كائنات حية. تُتبع اشتراطات السلامة المعملية الكيميائية.",
        dissemination:"النشر في مجلة علمية دولية محكمة، ويقود النشر الباحث الرئيسي.",
        references:"1. Klingshirn C. ZnO: material, physics and applications. ChemPhysChem. 2007." }),
      application:A({ approval_for:"رسالة ماجستير", researcher:S1.name, specialty:"فيزياء الجوامد",
        research_title:S1.thesis, m1:"تحضير الأغشية الرقيقة", m2:"القياسات الطيفية",
        applicant:S1.name, phone:S1.phone, email2:S1.email,
        ack_name:S1.name, ack_dept:"قسم الفيزياء" }) },

    { id:"D3", code:"SCI-2026-0003-B2XF", version:1, status:"pending",
      createdAt:day(3), updatedAt:day(3), reviewedAt:"", reviewedBy:"", reviewNote:"",
      student:S2, dept:"botany", cat:"plants", history:[],
      protocol:P({ title_en:"Antioxidant activity of Trigonella foenum-graecum extracts",
        title_ar:S2.thesis,
        pi:[{name:"أ.د. منى عبد الحميد",dept:"النبات",role:"مشرف رئيسي",
             phone:"01002223344",email:"m.abdelhamid@mans.edu.eg"}],
        co:[{name:S2.name,dept:"النبات",role:"باحث",phone:S2.phone,email:S2.email}],
        pl_species:"Trigonella foenum-graecum L.",
        pl_source:"مزارع كلية الزراعة — جامعة المنصورة",
        pl_permit:"لا يلزم تصريح — نبات مزروع غير محمي",
        pl_voucher:"عينة مرجعية رقم MANS-BOT-2026-118 بمعشبة قسم النبات",
        background:"تحتوي بذور الحلبة على مركبات فينولية وفلافونويدية ذات نشاط مضاد للأكسدة.",
        justification:"الحاجة إلى بدائل طبيعية لمضادات الأكسدة الصناعية.",
        objectives:"تقدير المحتوى الفينولي الكلي وتقييم النشاط المضاد للأكسدة بطريقتي DPPH و FRAP.",
        aim:"تحديد أنسب مذيب لاستخلاص المركبات الفعالة.",
        design:"تصميم عشوائي كامل بأربعة مذيبات وثلاث تكرارات.",
        procedures:"التجفيف والطحن، الاستخلاص بالمذيبات، ثم قياس DPPH و FRAP و TPC.",
        n_total:"12 عينة — 3 تكرارات لكل مذيب.",
        n_calc:"ثلاث تكرارات هي الحد الأدنى المعتمد في الدراسات المماثلة.",
        stats:"ANOVA أحادي الاتجاه ثم اختبار Duncan عند 0.05.",
        safety:"التعامل مع المذيبات العضوية داخل شفاط الأبخرة.",
        dissemination:"النشر في مجلة محكمة وعرض النتائج في مؤتمر القسم.",
        references:"1. Brand-Williams W. et al. LWT. 1995." }),
      application:A({ approval_for:"رسالة دكتوراه (فلسفة)", researcher:S2.name, specialty:"فسيولوجيا النبات",
        research_title:S2.thesis, m1:"استخلاص المركبات الفعالة", m2:"القياسات الطيفية",
        applicant:S2.name, phone:S2.phone, email2:S2.email,
        ack_name:S2.name, ack_dept:"قسم النبات" }) },

    { id:"D2", code:"SCI-2026-0002-R9TD", version:1, status:"approved",
      createdAt:day(9), updatedAt:day(9), reviewedAt:day(6),
      reviewedBy:"رئيس اللجنة", reviewNote:"", student:S3, dept:"chemistry", cat:"cellline",
      history:[],
      protocol:P({ title_en:"Effect of propolis extract on MCF-7 breast cancer cell line",
        title_ar:S3.thesis,
        pi:[{name:"أ.د. طارق الشربيني",dept:"الكيمياء",role:"مشرف رئيسي",
             phone:"01003334455",email:"t.elsherbiny@mans.edu.eg"}],
        co:[{name:S3.name,dept:"الكيمياء",role:"باحث",phone:S3.phone,email:S3.email}],
        cl_name:"MCF-7", cl_source:"ATCC — رقم الكتالوج HTB-22",
        cl_auth:"توثيق بطريقة STR profiling وفحص دوري للميكوبلازما كل شهر.",
        cl_handling:"الاستزراع في وسط DMEM داخل كابينة أمان حيوي من الفئة الثانية، والتخلص الآمن بالأوتوكلاف.",
        background:"يحتوي البروبوليس على مركبات فينولية أظهرت نشاطاً مضاداً للتكاثر في عدة خطوط خلوية.",
        justification:"تقييم فاعلية البروبوليس المصري تحديداً، وهو غير مدروس كفاية.",
        objectives:"تحديد قيمة IC50 ودراسة تأثير المستخلص على دورة الخلية.",
        aim:"تقييم إمكانية استخدام البروبوليس كعلاج مساعد.",
        design:"تجربة معملية على خط خلوي واحد بست تركيزات.",
        procedures:"اختبار MTT بعد 24 و48 و72 ساعة، ثم تحليل دورة الخلية بالـ flow cytometry.",
        n_total:"ست تركيزات × ثلاث تكرارات لكل زمن.",
        n_calc:"استناداً إلى الدراسات المنشورة لحساب IC50.",
        stats:"تحليل الانحدار اللاخطي لحساب IC50 باستخدام GraphPad Prism.",
        safety:"لا يوجد تعامل مع مرضى أو حيوانات. تُتبع اشتراطات الأمان الحيوي المستوى الثاني.",
        dissemination:"النشر في مجلة دولية محكمة.",
        references:"1. Mosmann T. J Immunol Methods. 1983." }),
      application:A({ approval_for:"رسالة ماجستير", researcher:S3.name, specialty:"الكيمياء الحيوية",
        research_title:S3.thesis, m1:"استزراع الخلايا", m2:"اختبار MTT", m3:"تحليل دورة الخلية",
        applicant:S3.name, phone:S3.phone, email2:S3.email,
        ack_name:S3.name, ack_dept:"قسم الكيمياء" }) },

    { id:"D1", code:"SCI-2026-0001-K3QF", version:2, status:"revision",
      createdAt:day(16), updatedAt:day(11), reviewedAt:day(4),
      reviewedBy:"مقرر اللجنة",
      reviewNote:"1- لم يتم توضيح طريقة حساب حجم العينة في البند (b) — برجاء إرفاق التحليل الإحصائي المستخدم.\n2- ظروف الإيواء (Housing) غير مكتملة: لم تُذكر دورة الإضاءة ودرجة الحرارة.\n3- يجب تحديد طريقة التخلص الإنساني من الحيوانات بعد انتهاء التجربة.",
      student:S4, dept:"zoology", cat:"animals",
      protocol:P({ title_en:"Hepatoprotective effect of vitamin E in male albino rats",
        title_ar:S4.thesis,
        pi:[{name:"أ.د. ليلى محمود",dept:"علم الحيوان",role:"مشرف رئيسي",
             phone:"01004445566",email:"l.mahmoud@mans.edu.eg"}],
        co:[{name:S4.name,dept:"علم الحيوان",role:"باحث",phone:S4.phone,email:S4.email}],
        an_species:"Rattus norvegicus", an_strain:"Wistar albino", an_sex:"Male",
        an_stage:"بالغ — 10 إلى 12 أسبوعاً", an_weight:"المتوسط 180 جم (المدى 160–200)",
        an_source:"بيت الحيوان — كلية الطب، جامعة المنصورة",
        an_genetic:"سلالة طبيعية غير معدلة وراثياً.",
        an_health:"خالية من الأمراض الظاهرية ولم تخضع لأي إجراءات سابقة.",
        an_housing:"أقفاص بلاستيكية قياسية، أربعة حيوانات لكل قفص، فرش نشارة خشب معقمة تُستبدل مرتين أسبوعياً.",
        an_husbandry:"غذاء قياسي وماء بلا تقييد.",
        an_welfare:"فترة أقلمة أسبوعين قبل بدء التجربة مع متابعة يومية للوزن.",
        allocation:"توزيع عشوائي بسيط باستخدام جدول أرقام عشوائية على أربع مجموعات متساوية.",
        background:"يُعد الإجهاد التأكسدي أحد الآليات الرئيسية في تلف خلايا الكبد.",
        justification:"الحاجة لتقييم جرعات مختلفة من فيتامين E كعامل وقائي.",
        objectives:"تقييم التأثير الوقائي لفيتامين E على إنزيمات الكبد والتركيب النسيجي.",
        aim:"تحديد الجرعة الأكثر فاعلية.",
        design:"أربع مجموعات: ضابطة، مُحدَثة التلف، وجرعتان علاجيتان، لمدة ثمانية أسابيع.",
        procedures:"إعطاء المادة بالتجريع الفموي يومياً، ثم سحب عينات الدم وفصل الكبد للفحص النسيجي.",
        n_total:"32 جرذاً — 8 حيوانات لكل مجموعة.",
        n_calc:"سيتم إرفاق حساب حجم العينة.",
        stats:"ANOVA ثم اختبار Tukey عند 0.05.",
        safety:"تُتبع المبادئ التوجيهية لرعاية حيوانات التجارب.",
        dissemination:"النشر في مجلة محكمة.",
        references:"1. Percie du Sert N. et al. ARRIVE guidelines 2.0. PLoS Biol. 2020." }),
      application:A({ approval_for:"رسالة دكتوراه (فلسفة)", researcher:S4.name, specialty:"فسيولوجيا الحيوان",
        research_title:S4.thesis, m1:"التجريع الفموي اليومي", m2:"سحب عينات الدم",
        m3:"الفحص النسيجي للكبد", applicant:S4.name, phone:S4.phone, email2:S4.email,
        ack_name:S4.name, ack_dept:"قسم علم الحيوان" }),
      history:[ { version:1, submittedAt:day(16), status:"revision", reviewedAt:day(13),
        reviewedBy:"رئيس اللجنة",
        reviewNote:"برجاء استكمال بيانات الحيوانات: السلالة والوزن ومصدر الحيوانات.",
        student:S4, dept:"zoology", cat:"animals",
        protocol:P({ title_en:"Hepatoprotective effect of vitamin E in male albino rats",
          title_ar:S4.thesis, an_species:"جرذان", an_strain:"", an_weight:"",
          an_source:"", an_housing:"أقفاص عادية",
          background:"يُعد الإجهاد التأكسدي أحد الآليات الرئيسية في تلف خلايا الكبد.",
          objectives:"تقييم التأثير الوقائي لفيتامين E.", aim:"تحديد الجرعة الأكثر فاعلية.",
          design:"أربع مجموعات لمدة ثمانية أسابيع.", procedures:"تجريع فموي يومي.",
          n_total:"32 جرذاً", n_calc:"", stats:"ANOVA",
          safety:"تُتبع المبادئ التوجيهية.", dissemination:"النشر في مجلة محكمة.",
          references:"—" }),
        application:A({ approval_for:"رسالة دكتوراه (فلسفة)", researcher:S4.name,
          specialty:"فسيولوجيا الحيوان", research_title:S4.thesis, m1:"التجريع الفموي اليومي",
          applicant:S4.name, phone:S4.phone, email2:S4.email,
          ack_name:S4.name, ack_dept:"قسم علم الحيوان" }) } ] }
  ];
}

window.AdminApp = { start: function(){ render(); } };

})();
