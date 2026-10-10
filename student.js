/* صفحة الطالب — تُشغَّل بـ StudentApp.start() */
(function(){
'use strict';

/* ============================================================
   مسودة الطالب
   ============================================================ */

const LS_DRAFT = "ethics_draft_v1";
let S = newDraft();
function newDraft(){
  return { student:{name:"",email:"",phone:"",degree:"",thesis:""},
           dept:"", cat:"", protocol:{}, application:{},
           editing:null, view:"start" };
}
function saveDraft(){ try{ localStorage.setItem(LS_DRAFT, JSON.stringify(S)); pulseDraft(); }catch(e){} }
function loadDraft(){
  try{ const r=localStorage.getItem(LS_DRAFT); if(r){ const d=JSON.parse(r); if(d&&d.student) S=Object.assign(newDraft(),d);} }catch(e){}
}
/* ============================================================
   بناء الحقول
   ============================================================ */
function buildForm(schema, store, formId){
  const wrap = el("div");
  let cur = null, pend = [];
  const flushHalves = ()=>{
    if(pend.length){
      const row = el("div","frow");
      pend.forEach(n=>row.appendChild(n));
      (cur||wrap).appendChild(row); pend=[];
    }
  };
  schema.forEach(f=>{
    if(f.sec){
      if(f.when && f.when.indexOf(S.cat)<0){ cur=null; return; }
      flushHalves();
      cur = el("section","fsec");
      const h = el("div","fsec-h");
      h.appendChild(el("h3",null,esc(f.sec)));
      if(f.tag) h.appendChild(el("span","tag",esc(f.tag)));
      cur.appendChild(h);
      if(f.note) cur.appendChild(el("p","fsec-note",esc(f.note)));
      wrap.appendChild(cur);
      return;
    }
    if(!visible(f,S.cat)) return;
    const node = buildField(f, store, formId);
    if(f.half){ pend.push(node); if(pend.length===2) flushHalves(); }
    else { flushHalves(); (cur||wrap).appendChild(node); }
  });
  flushHalves();
  return wrap;
}

function buildField(f, store, formId){
  const g = el("div","fgroup");
  g.dataset.k = f.k;

  if(f.t!=="chk"){
    const lab = el("label","fl");
    lab.setAttribute("for", formId+"_"+f.k);
    lab.innerHTML = esc(f.l) + (f.req?'<span class="req">*</span>':"") + (f.en?'<span class="en">'+esc(f.en)+'</span>':"");
    g.appendChild(lab);
    if(f.ar) g.appendChild(el("p","fhint",esc(f.ar)));
  }

  const commit = (v)=>{ store[f.k]=v; saveDraft(); };

  if(f.t==="table"){
    g.appendChild(buildTable(f, store, commit));
    return g;
  }
  if(f.t==="sig"){
    g.appendChild(buildSig(f, store, commit));
    return g;
  }
  if(f.t==="chk"){
    const row = el("label","tile"+(store[f.k]?" on":""));
    row.style.cursor="pointer";
    const box = el("span","ti","✓");
    const txt = el("span",null, esc(f.l)+(f.req?'<span class="req">*</span>':""));
    const input = el("input"); input.type="checkbox"; input.id=formId+"_"+f.k;
    input.checked=!!store[f.k]; input.style.display="none";
    input.addEventListener("change",()=>{ row.classList.toggle("on",input.checked); commit(input.checked); });
    row.appendChild(input); row.appendChild(box); row.appendChild(txt);
    g.appendChild(row);
    return g;
  }

  let input;
  if(f.t==="ta"){ input=el("textarea"); input.rows=f.rows||3; }
  else if(f.t==="sel"){
    input=el("select");
    input.appendChild(new Option("— اختر —",""));
    (f.opts||[]).forEach(o=>input.appendChild(new Option(o,o)));
  }
  else { input=el("input"); input.type = f.t==="date"?"date" : f.t==="email"?"email" : f.t==="tel"?"tel" : "text"; }
  input.id = formId+"_"+f.k;
  input.value = store[f.k]||"";
  if(f.t!=="sel" && f.t!=="date") input.placeholder = f.ph||"";
  input.addEventListener("input", ()=>{ input.classList.remove("bad"); commit(input.value); });
  input.addEventListener("change", ()=>commit(input.value));
  g.appendChild(input);
  return g;
}

function buildTable(f, store, commit){
  if(!Array.isArray(store[f.k])) store[f.k] = Array.from({length:f.min||1},()=>({}));
  const box = el("div");
  const shell = el("div","rtable"); const sc = el("div","rtable-scroll");
  const tbl = el("table");
  const thead = el("thead"); const trh = el("tr");
  f.cols.forEach(c=>trh.appendChild(el("th",null,esc(c.l))));
  trh.appendChild(el("th","act",""));
  thead.appendChild(trh); tbl.appendChild(thead);
  const tb = el("tbody"); tbl.appendChild(tb);
  sc.appendChild(tbl); shell.appendChild(sc); box.appendChild(shell);

  const addBtn = el("button","btn ghost sm","＋ إضافة صف");
  addBtn.type="button";
  addBtn.addEventListener("click",()=>{
    if(store[f.k].length >= (f.max||8)) return toast("وصلت للحد الأقصى من الصفوف", true);
    store[f.k].push({}); render(); commit(store[f.k]);
  });
  box.appendChild(addBtn);

  function render(){
    tb.innerHTML="";
    store[f.k].forEach((row,i)=>{
      const tr=el("tr");
      f.cols.forEach(c=>{
        const td=el("td"); const inp=el("input"); inp.type="text";
        inp.value=row[c.k]||""; inp.setAttribute("aria-label", c.l);
        inp.addEventListener("input",()=>{ row[c.k]=inp.value; commit(store[f.k]); });
        td.appendChild(inp); tr.appendChild(td);
      });
      const td=el("td","act");
      if(store[f.k].length > (f.min||1)){
        const b=el("button","rowdel","×"); b.type="button"; b.title="حذف الصف";
        b.addEventListener("click",()=>{ store[f.k].splice(i,1); render(); commit(store[f.k]); });
        td.appendChild(b);
      }
      tr.appendChild(td); tb.appendChild(tr);
    });
  }
  render();
  return box;
}

function buildSig(f, store, commit){
  const wrap = el("div","sigwrap"+(store[f.k]?" has":""));
  const cv = el("canvas");
  const ph = el("div","sigph","وقّع هنا");
  wrap.appendChild(cv); wrap.appendChild(ph);
  const box = el("div"); box.appendChild(wrap);
  const bar = el("div"); bar.style.cssText="display:flex;gap:10px;margin-top:9px;align-items:center";
  const clr = el("button","btn ghost sm","مسح التوقيع"); clr.type="button";
  bar.appendChild(clr); box.appendChild(bar);

  let ctx, drawing=false, last=null;
  function setup(){
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    const data = store[f.k];
    cv.width = Math.max(1, r.width*dpr); cv.height = Math.max(1, r.height*dpr);
    ctx = cv.getContext("2d"); ctx.scale(dpr,dpr);
    ctx.lineWidth=2.2; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.strokeStyle="#0F2B21";
    if(data){ const im=new Image(); im.onload=()=>ctx.drawImage(im,0,0,r.width,r.height); im.src=data; }
  }
  const pos = e=>{ const r=cv.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:p.clientX-r.left,y:p.clientY-r.top}; };
  const start = e=>{ e.preventDefault(); drawing=true; last=pos(e); wrap.classList.add("has"); };
  const move = e=>{ if(!drawing) return; e.preventDefault(); const p=pos(e);
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; };
  const end = ()=>{ if(!drawing) return; drawing=false; commit(cv.toDataURL("image/png")); };
  cv.addEventListener("pointerdown",start); cv.addEventListener("pointermove",move);
  window.addEventListener("pointerup",end);
  clr.addEventListener("click",()=>{ const r=cv.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height); wrap.classList.remove("has"); commit(""); });
  requestAnimationFrame(setup);
  return box;
}
/* ============================================================
   التحقق
   ============================================================ */
function validate(schema, store, formId){
  let first=null, bad=0;
  fieldsOf(schema,S.cat).forEach(f=>{
    if(!f.req) return;
    const v = store[f.k];
    let empty;
    if(f.t==="table") empty = !Array.isArray(v) || !v.length || !v.some(r=>Object.values(r).some(x=>String(x||"").trim()));
    else if(f.t==="chk") empty = !v;
    else empty = !String(v==null?"":v).trim();
    if(empty){
      bad++;
      const node = document.querySelector('[data-k="'+f.k+'"]');
      if(node){
        const inp = node.querySelector("input,textarea,select");
        if(inp) inp.classList.add("bad");
        if(!first) first=node;
      }
    }
  });
  if(first) first.scrollIntoView({behavior:"smooth",block:"center"});
  return bad;
}
/* ============================================================
   الشاشات
   ============================================================ */
function go(v){ S.view=v; saveDraft(); render(); window.scrollTo({top:0,behavior:"smooth"}); }

function stepper(active){
  const names=["البيانات والقسم","البروتوكول","الأبليكيشن","الإرسال"];
  const w=el("div","stepper");
  names.forEach((n,i)=>{
    if(i) w.appendChild(el("span","sep"));
    const cls = i<active?"st done" : i===active?"st on":"st";
    w.appendChild(el("span",cls,"<b>"+(i+1)+"</b><span>"+n+"</span>"));
  });
  return w;
}

function render(){
  const a=APP(); a.innerHTML="";
  const v=S.view;
  if(v==="start")        a.appendChild(viewStart());
  else if(v==="protocol")a.appendChild(viewForm("protocol"));
  else if(v==="app")     a.appendChild(viewForm("app"));
  else if(v==="review")  a.appendChild(viewReview());
  else if(v==="done")    a.appendChild(viewDone());
  else if(v==="track")   a.appendChild(viewTrack());
  else a.appendChild(viewStart());
}

/* ---------- 1) شاشة البداية: الثلاث أيقونات ---------- */
function viewStart(){
  const w=el("div");
  w.appendChild(stepper(0));
  const grid=el("div","steps3");

  /* --- أيقونة 1: بيانات الطالب --- */
  const c1=el("div","scard active");
  c1.appendChild(el("div","scard-h",
    '<span class="scard-n">1</span><div><h3>بيانات الطالب</h3><small>الاسم والبريد والدرجة وعنوان الرسالة</small></div>'));
  [["name","الاسم الثلاثي","text","مثال: محمد أحمد عبد الرحمن"],
   ["email","البريد الإلكتروني","email","name@std.mans.edu.eg"],
   ["phone","رقم المحمول","tel","01xxxxxxxxx"]].forEach(([k,l,t,ph])=>{
    const g=el("div","fgroup");
    g.appendChild(el("label","fl",esc(l)+'<span class="req">*</span>'));
    const i=el("input"); i.type=t; i.value=S.student[k]||""; i.placeholder=ph;
    i.addEventListener("input",()=>{ S.student[k]=i.value; i.classList.remove("bad"); saveDraft(); });
    g.appendChild(i); c1.appendChild(g);
  });
  const gd=el("div","fgroup");
  gd.appendChild(el("label","fl",'الدرجة العلمية<span class="req">*</span>'));
  const sel=el("select"); sel.appendChild(new Option("— اختر —",""));
  DEGREES.forEach(d=>sel.appendChild(new Option(d,d)));
  sel.value=S.student.degree||"";
  sel.addEventListener("change",()=>{ S.student.degree=sel.value; sel.classList.remove("bad"); saveDraft(); });
  gd.appendChild(sel); c1.appendChild(gd);
  const gt=el("div","fgroup");
  gt.appendChild(el("label","fl",'عنوان الرسالة<span class="req">*</span>'));
  const ta=el("textarea"); ta.rows=2; ta.value=S.student.thesis||"";
  ta.addEventListener("input",()=>{ S.student.thesis=ta.value; ta.classList.remove("bad"); saveDraft(); });
  gt.appendChild(ta); c1.appendChild(gt);
  grid.appendChild(c1);

  /* --- أيقونة 2: القسم --- */
  const c2=el("div","scard"+(S.dept?" active":""));
  c2.appendChild(el("div","scard-h",
    '<span class="scard-n">2</span><div><h3>القسم العلمي</h3><small>اختر قسمك — وما بعده يفتح تلقائياً</small></div>'));
  const t2=el("div","tiles");
  Object.keys(DEPTS).forEach(k=>{
    const d=DEPTS[k];
    const b=el("button","tile"+(S.dept===k?" on":""));
    b.type="button";
    b.innerHTML='<span class="ti">'+d.ico+'</span><span>'+esc(d.ar)+'</span><span class="tcheck">✓</span>';
    b.addEventListener("click",()=>{
      if(S.dept!==k){ S.dept=k; S.cat=""; saveDraft(); render(); }
    });
    t2.appendChild(b);
  });
  c2.appendChild(t2); grid.appendChild(c2);

  /* --- أيقونة 3: يتغير حسب القسم --- */
  const c3=el("div","scard"+(S.dept?" active":" locked"));
  const cats = S.dept ? DEPTS[S.dept].cats : [];
  const sub = !S.dept ? "اختر القسم أولاً" : (cats.length? "اختر حالة بحثك" : "النماذج المطلوبة");
  c3.appendChild(el("div","scard-h",
    '<span class="scard-n">3</span><div><h3>'+(cats.length?"حالة البحث":"النماذج المطلوبة")+'</h3><small>'+esc(sub)+'</small></div>'));

  if(!S.dept){
    c3.appendChild(el("p","fsec-note","بمجرد اختيارك للقسم في الخانة رقم 2 سيظهر هنا ما يخص قسمك."));
  } else if(cats.length){
    const t3=el("div","tiles");
    cats.forEach(ck=>{
      const c=CATS[ck];
      const b=el("button","tile"+(S.cat===ck?" on":"")); b.type="button";
      b.innerHTML='<span class="ti">'+c.ico+'</span><span>'+esc(c.ar)+'</span><span class="tcheck">✓</span>';
      b.addEventListener("click",()=>{ S.cat=ck; saveDraft(); render(); });
      t3.appendChild(b);
    });
    c3.appendChild(t3);
  } else {
    c3.appendChild(el("p","fsec-note","قسمك يحتاج استيفاء النموذجين مباشرةً دون اختيارات إضافية."));
  }

  if(S.dept && (!cats.length || S.cat)){
    const list=el("div"); list.style.marginTop="12px";
    [["📄","البروتوكول","Protocol — نموذج إلكتروني"],["📝","الأبليكيشن","Application — استمارة التقدم"]]
      .forEach(([i,n,s])=>{
        const r=el("div","tile"); r.style.cursor="default";
        r.innerHTML='<span class="ti">'+i+'</span><span>'+esc(n)+'<br><small style="color:var(--ink-3);font-size:11px">'+esc(s)+'</small></span><span class="tcheck" style="opacity:1">✓</span>';
        list.appendChild(r);
      });
    c3.appendChild(list);
  }
  grid.appendChild(c3);
  w.appendChild(grid);

  /* --- زر البدء --- */
  const row=el("div","btn-row");
  const go1=el("button","btn","ابدأ ملء البروتوكول ←"); go1.type="button";
  const ready = S.dept && (!DEPTS[S.dept].cats.length || S.cat);
  go1.disabled = !ready;
  go1.addEventListener("click",()=>{
    const need=["name","email","phone","degree","thesis"];
    const inputs=c1.querySelectorAll("input,select,textarea");
    let bad=0, first=null;
    need.forEach((k,i)=>{
      if(!String(S.student[k]||"").trim()){
        bad++; const n=inputs[i];
        if(n){ n.classList.add("bad"); if(!first) first=n; }
      }
    });
    if(bad){
      toast("من فضلك أكمل بيانات الطالب في الخانة رقم 1", true);
      if(first){ first.scrollIntoView({behavior:"smooth",block:"center"}); first.focus(); }
      return;
    }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(S.student.email)){
      inputs[1].classList.add("bad"); inputs[1].focus();
      return toast("البريد الإلكتروني غير صحيح — سيصلك عليه قرار اللجنة", true);
    }
    go("protocol");
  });
  row.appendChild(go1);
  const trk=el("button","btn ghost","متابعة طلب سابق"); trk.type="button";
  trk.addEventListener("click",()=>go("track"));
  row.appendChild(trk);
  row.appendChild(el("span","spacer"));
  if(localStorage.getItem(LS_DRAFT)){
    const clr=el("button","btn ghost sm","مسح المسودة والبدء من جديد"); clr.type="button";
    clr.addEventListener("click",()=>{ if(confirm("سيتم مسح كل ما كتبته. متأكد؟")){
      localStorage.removeItem(LS_DRAFT); S=newDraft(); render(); } });
    row.appendChild(clr);
  }
  w.appendChild(row);
  return w;
}

/* ---------- 2 و 3) نماذج البروتوكول والأبليكيشن ---------- */
function viewForm(which){
  const isP = which==="protocol";
  const schema = isP?PROTOCOL:APPLICATION;
  const store  = isP?S.protocol:S.application;
  const w=el("div");
  w.appendChild(stepper(isP?1:2));

  const p=el("div","panel");
  const d=DEPTS[S.dept], c=S.cat?CATS[S.cat]:null;
  p.appendChild(el("div","panel-head",
    '<span class="pico">'+(isP?"📄":"📝")+'</span><div class="grow"><h2>'+
    (isP?"البروتوكول — Protocol":"الأبليكيشن — استمارة التقدم")+'</h2><p>'+
    esc(S.student.name)+" · "+esc(d?d.ar:"")+(c?" · "+esc(c.ar):"")+'</p></div>'+
    '<span class="chip pend">'+(isP?"الخطوة 2 من 3":"الخطوة 3 من 3")+'</span>'));

  if(isP){
    // تعبئة ذكية من بيانات الطالب
    if(!store.title_ar && S.student.thesis) store.title_ar = S.student.thesis;
    if(!Array.isArray(store.pi) || !store.pi.length) store.pi=[{}];
    if(!Array.isArray(store.co) || !store.co.length) store.co=[{}];
  } else {
    if(!store.researcher) store.researcher = S.student.name;
    if(!store.applicant)  store.applicant  = S.student.name;
    if(!store.ack_name)   store.ack_name   = S.student.name;
    if(!store.ack_dept)   store.ack_dept   = DEPTS[S.dept]?DEPTS[S.dept].ar:"";
    if(!store.email2)     store.email2     = S.student.email;
    if(!store.phone)      store.phone      = S.student.phone;
    if(!store.research_title) store.research_title = S.student.thesis;
    if(!store.approval_for)   store.approval_for   = S.student.degree;
    if(!store.app_date)   store.app_date   = today();
  }

  p.appendChild(buildForm(schema, store, which));

  const row=el("div","btn-row");
  const back=el("button","btn ghost","→ رجوع"); back.type="button";
  back.addEventListener("click",()=>go(isP?"start":"protocol"));
  const next=el("button","btn", isP?"التالي: الأبليكيشن ←":"مراجعة وإرسال ←"); next.type="button";
  next.addEventListener("click",()=>{
    const bad=validate(schema, store, which);
    if(bad) return toast("فيه "+bad+" حقل مطلوب فاضي — الحقول المعلّمة بالأحمر", true);
    go(isP?"app":"review");
  });
  row.appendChild(back); row.appendChild(el("span","spacer")); row.appendChild(next);
  p.appendChild(row);
  w.appendChild(p);
  return w;
}

/* ---------- 4) المراجعة قبل الإرسال ---------- */
function viewReview(){
  const w=el("div");
  w.appendChild(stepper(3));
  const p=el("div","panel");
  p.appendChild(el("div","panel-head",
    '<span class="pico">🔍</span><div class="grow"><h2>مراجعة أخيرة قبل الإرسال</h2>'+
    '<p>راجع بياناتك جيداً. بعد الإرسال لن تتمكن من التعديل إلا إذا طلبت منك اللجنة ذلك.</p></div>'));
  p.appendChild(renderDoc({ student:S.student, dept:S.dept, cat:S.cat,
                            protocol:S.protocol, application:S.application,
                            createdAt:new Date().toISOString(), code:"—" }, true));
  const row=el("div","btn-row");
  const back=el("button","btn ghost","→ رجوع للتعديل"); back.type="button";
  back.addEventListener("click",()=>go("app"));
  const send=el("button","btn gold","إرسال إلى اللجنة ✓"); send.type="button";
  send.addEventListener("click",()=>submit(send));
  row.appendChild(back); row.appendChild(el("span","spacer")); row.appendChild(send);
  p.appendChild(row);
  w.appendChild(p);
  return w;
}

async function submit(btn){
  btn.disabled=true; btn.textContent="جارٍ الإرسال…";
  const rec = {
    student:S.student, dept:S.dept, cat:S.cat,
    protocol:S.protocol, application:S.application,
    createdAt:new Date().toISOString(), status:"pending"
  };
  const ed = S.editing;
  try{
    if(LIVE){
      rec.docHtml = docHtmlFor(rec);
      if(ed){
        const r = await api("resubmit", { code:ed.code, email:ed.email, record:rec });
        S.lastCode = ed.code; S.lastVersion = r.version;
      } else {
        const r = await api("submit", { record: rec });
        S.lastCode = r.code; S.lastVersion = 1;
      }
    } else {
      const list = localSubs();
      if(ed){
        const t = list.filter(x=>x.code===ed.code)[0];
        if(!t) throw new Error("الطلب غير موجود");
        t.history = t.history || [];
        t.history.push({ version:t.version||1, submittedAt:t.updatedAt||t.createdAt,
                         status:"revision", reviewedAt:t.reviewedAt, reviewedBy:t.reviewedBy,
                         reviewNote:t.reviewNote, student:t.student, dept:t.dept, cat:t.cat,
                         protocol:t.protocol, application:t.application });
        t.student=rec.student; t.dept=rec.dept; t.cat=rec.cat;
        t.protocol=rec.protocol; t.application=rec.application;
        t.version=(t.version||1)+1; t.updatedAt=new Date().toISOString();
        t.status="pending"; t.reviewedAt=""; t.reviewedBy=""; t.reviewNote="";
        localSave(list);
        S.lastCode = t.code; S.lastVersion = t.version;
      } else {
        rec.id = "L"+Date.now();
        rec.code = "SCI-" + new Date().getFullYear() + "-" + String(list.length+1).padStart(4,"0");
        rec.version = 1; rec.updatedAt = rec.createdAt; rec.history = [];
        list.unshift(rec); localSave(list);
        S.lastCode = rec.code; S.lastVersion = 1;
      }
    }
    localStorage.removeItem(LS_DRAFT);
    S.editing = null;
    go("done");
  }catch(e){
    btn.disabled=false; btn.textContent="إرسال إلى اللجنة ✓";
    toast("تعذّر الإرسال: "+e.message, true);
  }
}

/* ---------- متابعة طلب سابق ---------- */
let TRACK = null;

function viewTrack(){
  const w=el("div");
  const p=el("div","panel");
  p.appendChild(el("div","panel-head",
    '<span class="pico">&#128270;</span><div class="grow"><h2>متابعة طلبي</h2>'+
    '<p>اكتب الرقم الكودي الذي وصلك على بريدك عند التقديم، مع نفس البريد الإلكتروني.</p></div>'));

  const row=el("div","frow");
  const g1=el("div","fgroup");
  g1.appendChild(el("label","fl",'الرقم الكودي<span class="req">*</span>'));
  const i1=el("input"); i1.type="text"; i1.placeholder="SCI-2026-0001";
  i1.style.fontFamily="var(--font-m)"; i1.value=(TRACK&&TRACK.code)||"";
  g1.appendChild(i1); row.appendChild(g1);

  const g2=el("div","fgroup");
  g2.appendChild(el("label","fl",'البريد الإلكتروني<span class="req">*</span>'));
  const i2=el("input"); i2.type="email"; i2.placeholder="name@std.mans.edu.eg";
  i2.value=(TRACK&&TRACK.email)||"";
  g2.appendChild(i2); row.appendChild(g2);
  p.appendChild(row);

  const res=el("div"); p.appendChild(res);
  if(TRACK && TRACK.item) res.appendChild(trackCard(TRACK.item));

  const bar=el("div","btn-row");
  const find=el("button","btn","بحث"); find.type="button";
  const back=el("button","btn ghost","&#8592; رجوع"); back.type="button";
  back.addEventListener("click",()=>{ TRACK=null; go("start"); });
  const doFind=async()=>{
    const code=i1.value.trim(), email=i2.value.trim();
    if(!code||!email){ toast("اكتب الرقم الكودي والبريد الإلكتروني", true); return; }
    find.disabled=true; find.textContent="جارٍ البحث…";
    try{
      let item;
      if(LIVE){ item=(await api("status",{code:code,email:email})).item; }
      else{
        const t=localSubs().filter(x=>
          String(x.code||"").toUpperCase()===code.toUpperCase() &&
          String(x.student.email||"").toLowerCase()===email.toLowerCase())[0];
        if(!t) throw new Error("لا يوجد طلب بهذا الرقم الكودي مع هذا البريد الإلكتروني");
        item={ code:t.code, name:t.student.name, dept:t.dept, cat:t.cat,
               degree:t.student.degree, thesis:t.student.thesis,
               createdAt:t.createdAt, updatedAt:t.updatedAt||t.createdAt,
               version:t.version||1, status:t.status||"pending",
               reviewedAt:t.reviewedAt||"", reviewNote:t.reviewNote||"",
               canEdit:(t.status||"")==="revision",
               record:{ student:t.student, dept:t.dept, cat:t.cat,
                        protocol:t.protocol, application:t.application } };
      }
      TRACK={ code:code, email:email, item:item }; render();
    }catch(e){
      find.disabled=false; find.textContent="بحث";
      toast(e.message==="offline"?"غير متصل":e.message, true);
    }
  };
  find.addEventListener("click",doFind);
  i2.addEventListener("keydown",e=>{ if(e.key==="Enter") doFind(); });
  bar.appendChild(find); bar.appendChild(el("span","spacer")); bar.appendChild(back);
  p.appendChild(bar);
  w.appendChild(p);
  setTimeout(()=>{ if(!TRACK) i1.focus(); },80);
  return w;
}

function trackCard(it){
  const box=el("div"); box.style.marginTop="6px";
  const st=it.status||"pending";
  const head = st==="approved" ? ["&#10003;","ملفاتك مستوفاة","var(--ok)","var(--ok-bg)"]
             : st==="revision" ? ["&#9998;","مطلوب تعديل الملفات","var(--amber)","var(--amber-bg)"]
             : ["&#128339;","طلبك قيد المراجعة","var(--green-800)","var(--green-050)"];
  const banner=el("div");
  banner.style.cssText="display:flex;align-items:center;gap:11px;border-radius:14px;padding:14px 18px;"+
    "background:"+head[3]+";color:"+head[2]+";font-weight:600;font-size:15px;margin-bottom:16px";
  banner.innerHTML='<span style="font-size:20px">'+head[0]+'</span><span>'+head[1]+'</span>';
  box.appendChild(banner);

  const d=DEPTS[it.dept], c=it.cat?CATS[it.cat]:null;
  const meta=el("div","meta-grid");
  [["الرقم الكودي",it.code],["اسم الطالب",it.name],["القسم",d?d.ar:"—"],
   ["حالة البحث",c?c.ar:"— لا ينطبق —"],["تاريخ التقديم",fmtDateTime(it.createdAt)],
   ["رقم النسخة","النسخة "+(it.version||1)]].forEach(pair=>{
    meta.appendChild(el("div","meta-cell","<small>"+esc(pair[0])+"</small><b>"+esc(pair[1]||"—")+"</b>"));
  });
  box.appendChild(meta);

  if(st==="revision" && it.reviewNote){
    const n=el("div");
    n.style.cssText="background:var(--mint);border:1px solid var(--line-2);"+
      "border-inline-start:4px solid var(--amber);border-radius:12px;padding:14px 16px;margin-top:4px";
    n.innerHTML='<b style="color:var(--amber);font-size:13px">المطلوب تعديله:</b>'+
      '<div style="white-space:pre-wrap;font-size:13.5px;margin-top:6px;line-height:1.85">'+
      esc(it.reviewNote)+'</div>';
    box.appendChild(n);
  }
  if(st==="approved"){
    box.appendChild(el("p","fsec-note",
      "تم اعتماد ملفاتك بتاريخ "+esc(fmtDateTime(it.reviewedAt))+". لا يلزمك أي إجراء آخر."));
  }
  if(st==="pending"){
    box.appendChild(el("p","fsec-note",
      "سيصلك إشعار على بريدك فور صدور قرار اللجنة. لا حاجة لتقديم طلب جديد."));
  }

  if(it.canEdit && it.record){
    const bar=el("div"); bar.style.marginTop="16px";
    const b=el("button","btn gold","تعديل الطلب وإعادة الإرسال &#8592;"); b.type="button";
    b.addEventListener("click",()=>startEdit(it));
    bar.appendChild(b);
    bar.appendChild(el("p","fsec-note",
      "ستفتح لك بياناتك كما أرسلتها — عدّل المطلوب فقط وأعد الإرسال على نفس الرقم الكودي."));
    box.appendChild(bar);
  }
  return box;
}

function startEdit(it){
  const r=it.record||{};
  S = Object.assign(newDraft(), {
    student: r.student||{}, dept: r.dept||it.dept||"", cat: r.cat||it.cat||"",
    protocol: r.protocol||{}, application: r.application||{},
    editing: { code: it.code, email: (r.student&&r.student.email)||TRACK.email },
    view: "protocol"
  });
  saveDraft(); TRACK=null; render();
  window.scrollTo({top:0,behavior:"smooth"});
  toast("عدّل المطلوب فقط ثم أعد الإرسال — نفس الرقم الكودي "+it.code);
}

/* ---------- 5) تم الإرسال ---------- */
function viewDone(){
  const w=el("div","panel");
  const d=el("div","done-wrap");
  d.appendChild(el("div","done-mark","✓"));
  const isEdit = (S.lastVersion||1) > 1;
  d.appendChild(el("h2",null, isEdit ? "تم استلام النسخة المعدَّلة" : "تم استلام طلبك بنجاح"));
  d.appendChild(el("p",null, isEdit
    ? "وصلت النسخة المعدَّلة من طلبك إلى لجنة أخلاقيات البحث العلمي على نفس الرقم الكودي، وستُراجع من جديد."
    : "وصلت بياناتك ونموذجا البروتوكول والأبليكيشن إلى لجنة أخلاقيات البحث العلمي."));
  d.appendChild(el("p",null,"سيصلك على بريدك الإلكتروني إشعار بقرار اللجنة: استيفاء الملفات أو المطلوب تعديله."));
  const cb=el("div","code-box"); cb.innerHTML='<small>الرقم الكودي لطلبك</small><b>'+esc(S.lastCode||"—")+'</b>';
  d.appendChild(cb);
  d.appendChild(el("p",null,'<br><span style="font-size:12.5px;color:var(--ink-3)">احتفظ بالرقم الكودي للرجوع إليه عند مراجعة اللجنة.</span>'));
  const row=el("div","btn-row"); row.style.justifyContent="center";
  const again=el("button","btn ghost","تقديم طلب جديد"); again.type="button";
  again.addEventListener("click",()=>{ S=newDraft(); localStorage.removeItem(LS_DRAFT); go("start"); });
  row.appendChild(again);
  w.appendChild(d); w.appendChild(row);
  return w;
}

/* ============================================================
   التشغيل
   ============================================================ */

window.StudentApp = {
  start: function(){
    loadDraft();
    if(["done","login","admin","one","review"].indexOf(S.view)>-1) S.view="start";
    render();
  }
};

})();
