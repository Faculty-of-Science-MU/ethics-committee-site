/* ملف مشترك بين صفحة الطالب وصفحة اللجنة — لا تعدّليه إلا عند تغيير الأسئلة */
/* ============================================================
   الإعدادات — غيّري السطرين دول بس بعد نشر Apps Script
   ============================================================ */
const CONFIG = {
  // بعد ما تعملي Deploy للـ Apps Script، حطي اللينك هنا بين علامتي التنصيص
  API_URL: "https://script.google.com/macros/s/AKfycbw41wa61-olWwYRB2U6nf21oaK4YC7MjXU1hGe7hfpMES-2BCbxwPfle2bq1UyjPdBeqw/exec",
  /* ملاحظة أمنية: لا تضعي أي كود دخول في هذا الملف إطلاقاً.
     ملفات الموقع يقرأها أي زائر. أكواد أعضاء اللجنة مكانها الوحيد
     هو CFG.MEMBERS داخل Apps Script على الخادم. */
  DUMMY: null
};
const LIVE = !!CONFIG.API_URL;
/* ============================================================
   الأقسام والتخصصات
   ============================================================ */
const DEPTS = {
  physics:   { ar:"قسم الفيزياء",    ico:"⚛️", cats:[] },
  math:      { ar:"قسم الرياضيات",   ico:"📐", cats:[] },
  geology:   { ar:"قسم الجيولوجيا",  ico:"🪨", cats:[] },
  zoology:   { ar:"قسم علم الحيوان", ico:"🐁", cats:["animals","patients","cellline"] },
  chemistry: { ar:"قسم الكيمياء",    ico:"🧪", cats:["animals","patients","cellline"] },
  botany:    { ar:"قسم النبات",      ico:"🌱", cats:["animals","patients","cellline","plants"] }
};
const CATS = {
  animals:  { ar:"في حالة التعامل مع حيوانات التجارب", ico:"🐁" },
  patients: { ar:"في حالة التعامل مع المرضى",          ico:"🩺" },
  cellline: { ar:"في حالة التعامل مع الـ Cell line",   ico:"🧫" },
  plants:   { ar:"في حالة التعامل مع النباتات",        ico:"🌿" }
};
const DEGREES = ["رسالة ماجستير","رسالة دكتوراه (فلسفة)","بحث حر","مشروع بحثي ممول"];
/* ============================================================
   نموذج البروتوكول — مبني حرفياً على ملف Protocol
   ============================================================ */
const PROTOCOL = [
 { sec:"1 — General information", note:"البيانات العامة للبروتوكول والفريق البحثي." },
 { k:"title_en", l:"Protocol title (English)", ar:"عنوان البروتوكول بالإنجليزية", t:"text", req:1 },
 { k:"title_ar", l:"عنوان البروتوكول بالعربية", t:"text", req:1 },
 { k:"pi", l:"الباحث الرئيسي", en:"Principal investigator(s)", t:"table", min:1, max:3,
   cols:[{k:"name",l:"اسم الباحث الرئيسي"},{k:"dept",l:"القسم العلمي"},{k:"role",l:"دوره في البحث"},{k:"phone",l:"رقم المحمول"},{k:"email",l:"البريد الإلكتروني"}] },
 { k:"co", l:"المشاركون في البحث", en:"Co-investigators", t:"table", min:1, max:8,
   cols:[{k:"name",l:"اسم المشارك"},{k:"dept",l:"القسم العلمي"},{k:"role",l:"دوره في البحث"},{k:"phone",l:"رقم المحمول"},{k:"email",l:"البريد الإلكتروني"}] },
 { k:"sponsor", l:"Name and address of the sponsor / funder", ar:"اسم وعنوان الجهة الممولة — اكتب «لا يوجد» إن لم توجد", t:"ta", rows:2 },
 { k:"site", l:"Name and address where the research will be conducted", ar:"اسم وعنوان مكان إجراء البحث، ورقم التليفون", t:"ta", rows:3, req:1 },
 { k:"labs", l:"Clinical laboratory(ies) / technical departments or institutions involved (if any)", ar:"المعامل أو الأقسام الفنية المشاركة — إن وُجدت", t:"ta", rows:2 },

 { sec:"2 — Introduction", note:"الخلفية العلمية وأهداف الدراسة." },
 { k:"background", l:"Background", ar:"خلفية علمية كافية (مع المراجع ذات الصلة) لفهم دوافع الدراسة وسياقها، مع شرح المنهج التجريبي ومبرراته.", t:"ta", rows:6, req:1 },
 { k:"literature", l:"Literature review / current state of knowledge", ar:"مراجعة الأدبيات والوضع الحالي للمعرفة في موضوع البحث.", t:"ta", rows:5 },
 { k:"justification", l:"Justification for the study", ar:"مبررات إجراء الدراسة.", t:"ta", rows:4, req:1 },
 { k:"use_findings", l:"Intended / potential use of study findings", ar:"الاستخدام المتوقع لنتائج الدراسة.", t:"ta", rows:3 },
 { k:"objectives", l:"Objectives", ar:"الأهداف الأساسية والفرعية للدراسة بوضوح.", t:"ta", rows:4, req:1 },
 { k:"hypotheses", l:"Hypotheses or questions", ar:"الفروض العلمية أو الأسئلة البحثية.", t:"ta", rows:3 },
 { k:"aim", l:"Aim of the work", ar:"الهدف العام من العمل.", t:"ta", rows:3, req:1 },

 { sec:"3 — Methods", note:"تصميم الدراسة والإجراءات التجريبية." },
 { k:"design", l:"Study design", ar:"تفاصيل مختصرة لتصميم كل تجربة. يمكن الاستعانة بمخطط زمني أو flow chart.", t:"ta", rows:5, req:1 },
 { k:"procedures", l:"Experimental procedures", ar:"تفاصيل دقيقة لكل الإجراءات في كل تجربة وكل مجموعة تجريبية، بما فيها المجموعات الضابطة.", t:"ta", rows:6, req:1 },

 { sec:"Experimental animals", tag:"للبروتوكولات التي تستخدم حيوانات تجارب",
   note:"For protocols using experimental animals — إذا كان بحثك لا يتضمن حيوانات تجارب اترك هذا القسم فارغاً." },
 { k:"an_species", l:"Species / النوع", t:"text", half:1 },
 { k:"an_strain", l:"Strain (international nomenclature) / السلالة", t:"text", half:1 },
 { k:"an_sex", l:"Sex / الجنس", t:"sel", opts:["Male","Female","Both"], half:1 },
 { k:"an_stage", l:"Developmental stage / age range — المرحلة العمرية", t:"text", half:1 },
 { k:"an_weight", l:"Weight (mean/median + range) — الوزن", t:"text", half:1 },
 { k:"an_source", l:"Source of animals / مصدر الحيوانات", t:"text", half:1 },
 { k:"an_genetic", l:"Genetic modification status & genotype", ar:"حالة التعديل الجيني (knock-out / transgenic) والنمط الجيني.", t:"ta", rows:2 },
 { k:"an_health", l:"Health / immune status, drug or test naïve, previous procedures", ar:"الحالة الصحية والمناعية وأي إجراءات سابقة.", t:"ta", rows:2 },
 { k:"an_housing", l:"Housing", ar:"نوع المنشأة (مثل SPF)، نوع القفص أو المسكن، مواد الفرش، عدد الحيوانات في القفص، شكل ومادة الحوض بالنسبة للأسماك.", t:"ta", rows:3 },
 { k:"an_husbandry", l:"Husbandry conditions", ar:"برنامج التربية، دورة الإضاءة/الظلام، درجة الحرارة، جودة المياه للأسماك، نوع الغذاء، إتاحة الغذاء والماء، الإثراء البيئي.", t:"ta", rows:3 },
 { k:"an_welfare", l:"Welfare-related assessments and interventions carried out prior to the experiment", ar:"تقييمات وتدخلات الرعاية قبل بدء التجربة.", t:"ta", rows:2 },

 { sec:"Sample size", note:"حجم العينة وطريقة حسابها." },
 { k:"n_total", l:"a. Total number used in each experiment and in each experimental group", ar:"العدد الكلي في كل تجربة وفي كل مجموعة تجريبية.", t:"ta", rows:3, req:1 },
 { k:"n_calc", l:"b. How the number was arrived at (sample size calculation)", ar:"طريقة الوصول للعدد وتفاصيل حساب حجم العينة المستخدم في المشروع.", t:"ta", rows:3, req:1 },
 { k:"n_rep", l:"c. Number of independent replications of each experiment (if relevant)", ar:"عدد التكرارات المستقلة لكل تجربة.", t:"text" },
 { k:"allocation", l:"4 — Allocating animals to experimental groups", ar:"تفاصيل كاملة لطريقة توزيع الحيوانات على المجموعات التجريبية، بما في ذلك العشوائية أو المزاوجة. (للبروتوكولات التي تستخدم حيوانات تجارب)", t:"ta", rows:3 },

 { sec:"Analysis, safety and dissemination" },
 { k:"stats", l:"5 — Statistical methods", ar:"تفاصيل الأساليب الإحصائية المستخدمة في كل تحليل.", t:"ta", rows:4, req:1 },
 { k:"general", l:"Generalizability / translation", ar:"هل — وكيف — يمكن تعميم نتائج الدراسة على أنواع أو أنظمة أخرى، بما في ذلك صلتها ببيولوجيا الإنسان.", t:"ta", rows:3 },
 { k:"funding", l:"Funding", ar:"كل مصادر التمويل (مع رقم المنحة) ودور الممول في الدراسة. اكتب «لا يوجد» إن لم يوجد تمويل.", t:"ta", rows:2, req:1 },
 { k:"safety", l:"Safety considerations", ar:"كيف ستُضمن سلامة المشاركين، وإجراءات تسجيل الآثار الجانبية والإبلاغ عنها ومتابعتها.", t:"ta", rows:4, req:1 },
 { k:"dissemination", l:"Dissemination of results and publication policy", ar:"نشر النتائج في الأوساط العلمية وللمجتمع والمشاركين وصانعي القرار، ومَن يقود النشر ومَن يُذكر في الشكر.", t:"ta", rows:3, req:1 },
 { k:"references", l:"References", ar:"قائمة المراجع.", t:"ta", rows:6, req:1 }
];
/* ============================================================
   نموذج الأبليكيشن — مبني حرفياً على ملف Application
   ============================================================ */
const APPLICATION = [
 { sec:"استمارة تقدم للحصول على موافقة لجنة أخلاقيات البحث العلمي",
   note:"للموافقة على: بحث — مشروع بحثي — رسالة ماجستير — رسالة دكتوراه." },
 { k:"approval_for", l:"للموافقة على", t:"sel", opts:DEGREES, req:1, half:1 },
 { k:"researcher", l:"طلب مقدم من الباحث", t:"text", req:1, half:1 },
 { k:"specialty", l:"التخصص", t:"text", req:1, half:1 },
 { k:"job", l:"الوظيفة", t:"text", req:1, half:1 },
 { k:"research_title", l:"عنوان البحث", t:"ta", rows:2, req:1 },
 { k:"from_date", l:"الفترة الزمنية للبحث — من", t:"date", req:1, half:1 },
 { k:"to_date", l:"إلى", t:"date", req:1, half:1 },

 { sec:"طرق البحث المستخدمة", note:"ما يتم إجراؤه من المشاركين في البحث — اكتب كل طريقة في سطر." },
 { k:"m1", l:"1 —", t:"text", req:1 },
 { k:"m2", l:"2 —", t:"text" },
 { k:"m3", l:"3 —", t:"text" },
 { k:"m4", l:"4 —", t:"text" },

 { sec:"بيانات مقدم الطلب" },
 { k:"applicant", l:"مقدم الطلب", t:"text", req:1, half:1 },
 { k:"app_date", l:"التاريخ", t:"date", req:1, half:1 },
 { k:"phone", l:"التليفون", t:"tel", req:1, half:1 },
 { k:"email2", l:"بريد إلكتروني", t:"email", req:1, half:1 },

 { sec:"إقرار", note:"أقر أنا الباحث بأنني على دراية كاملة بالجوانب الأخلاقية للبحث العلمي، وبصفة أساسية مبادئ: (1) الأمانة العلمية. (2) احترام حقوق الملكية الفكرية عند الاقتباس من الدراسات السابقة. (3) عدم الاستعانة إلا بالمشرف الرئيس أو المشرفين المشاركين في تنفيذ بحثه من الناحية الفنية. وأنني تلقيت إرشاداً أكاديمياً كافياً من قِبل المشرف الرئيس أو المشاركين عند إعداد بروتوكول البحث." },
 { k:"ack", l:"أقر بصحة كل ما سبق وأوافق عليه", t:"chk", req:1 },
 { k:"ack_name", l:"الاسم (المقر بما فيه)", t:"text", req:1, half:1 },
 { k:"ack_dept", l:"القسم", t:"text", req:1, half:1 },
 { k:"sig", l:"التوقيع", ar:"اكتب اسمك الثلاثي إقراراً بدلاً من التوقيع.", t:"text", req:1 }
];
/* ============================================================
   أدوات مساعدة
   ============================================================ */
const $  = (s,r)=> (r||document).querySelector(s);
/* el(tag, class, html): الوسيط الثالث HTML وليس نصاً.
   أي قيمة مصدرها الطالب يجب أن تمر على esc() قبل تمريرها هنا. */
const el = (t,c,h)=>{ const n=document.createElement(t); if(c) n.className=c; if(h!=null) n.innerHTML=h; return n; };
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today = ()=> new Date().toISOString().slice(0,10);
function fmtDate(iso){
  if(!iso) return "—";
  const d = new Date(iso); if(isNaN(d)) return iso;
  return d.toLocaleDateString("ar-EG",{year:"numeric",month:"long",day:"numeric"});
}
function fmtDateTime(iso){
  if(!iso) return "—";
  const d = new Date(iso); if(isNaN(d)) return iso;
  return d.toLocaleDateString("ar-EG",{year:"numeric",month:"short",day:"numeric"}) + " — " +
         d.toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"});
}
let toastT;
function toast(msg, bad){
  const t=$("#toast"); t.textContent=msg; t.className="toast show"+(bad?" bad":"");
  clearTimeout(toastT); toastT=setTimeout(()=>t.className="toast",3600);
}
let pillT;
function pulseDraft(){
  let p=$("#draftPill");
  if(!p){ p=el("div","draft-pill","<i></i><span>المسودة محفوظة تلقائياً</span>"); p.id="draftPill"; document.body.appendChild(p); }
  p.style.opacity="1"; clearTimeout(pillT);
  pillT=setTimeout(()=>{ p.style.transition="opacity .6s"; p.style.opacity="0"; },2200);
}
function visible(f,cat){ return !f.when || f.when.indexOf(cat)>-1; }
function fieldsOf(schema,cat){ return schema.filter(f=>!f.sec && visible(f,cat)); }

/* ============================================================
   التخزين المحلي والاتصال بالخادم
   ============================================================ */

const LS_SUBS = "ethics_subs_v1";
function localSubs(){ try{ return JSON.parse(localStorage.getItem(LS_SUBS)||"[]"); }catch(e){ return []; } }
function localSave(list){ try{ localStorage.setItem(LS_SUBS, JSON.stringify(list)); }catch(e){} }

const APP = ()=>$("#app");

async function api(action, payload){
  if(!LIVE) throw new Error("offline");
  const res = await fetch(CONFIG.API_URL, {
    method:"POST",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ action: action }, payload))
  });
  const data = await res.json();
  if(!data.ok) throw new Error(data.error||"فشل الاتصال");
  return data;
}
/* ============================================================
   عرض الطلب كمستند (للمراجعة والطباعة)
   ============================================================ */
function renderDoc(rec, compact){
  const box = el("div","doc");
  if(!compact){
    const srcOf = id=>{ const n=$("#"+id); return (n && n.tagName==="IMG") ? n.src : ""; };
    const slot = (id,txt)=>{ const s=srcOf(id);
      return s ? '<img class="logo" src="'+s+'" alt="">' : '<div class="logo-ph">'+txt+'</div>'; };
    const h=el("div","doc-head");
    h.innerHTML =
      '<div class="dh-row">'+
        slot("logoUni","شعار<br>الجامعة")+
        '<div><h2>لجنة أخلاقيات البحث العلمي</h2><div class="sub">كلية العلوم — جامعة المنصورة</div></div>'+
        slot("logoFac","شعار<br>الكلية")+
      '</div>';
    box.appendChild(h);
  }
  const d=DEPTS[rec.dept], c=rec.cat?CATS[rec.cat]:null;
  const meta=el("div","meta-grid");
  [["الرقم الكودي",rec.code||"—"],["اسم الطالب",rec.student.name],["البريد الإلكتروني",rec.student.email],
   ["رقم المحمول",rec.student.phone],["الدرجة العلمية",rec.student.degree],["القسم",d?d.ar:"—"],
   ["حالة البحث",c?c.ar:"— لا ينطبق —"],["تاريخ التقديم",fmtDateTime(rec.createdAt)]].forEach(([k,v])=>{
    meta.appendChild(el("div","meta-cell","<small>"+esc(k)+"</small><b>"+esc(v||"—")+"</b>"));
  });
  box.appendChild(meta);
  box.appendChild(el("div","meta-cell","<small>عنوان الرسالة</small><b>"+esc(rec.student.thesis||"—")+"</b>"));

  const cat = rec.cat || "";
  box.appendChild(docSection("📄 البروتوكول — Protocol", PROTOCOL, rec.protocol||{}, cat));
  box.appendChild(docSection("📝 الأبليكيشن — استمارة التقدم", APPLICATION, rec.application||{}, cat));
  return box;
}

/* نسخة HTML مستقلة من الطلب — تُرسل للخادم ليحفظها PDF في الدرايف */
function docHtmlFor(rec){
  const node = renderDoc(rec, false);
  const css = [
    'body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;color:#0F2B21;margin:28px;font-size:12pt;line-height:1.7}',
    '.doc-head{text-align:center;border-bottom:2px solid #1E7A56;padding-bottom:12px;margin-bottom:16px}',
    '.dh-row{display:flex;align-items:center;justify-content:space-between;gap:14px}',
    '.dh-row img{height:70px}',
    '.doc-head h2{font-size:17pt;margin:0;color:#0F2B21}.doc-head .sub{font-size:10pt;color:#6B7F75}',
    '.logo-ph{width:62px;height:70px;border:1px dashed #BBDCC9;color:#8AA399;font-size:8pt;display:grid;place-items:center;text-align:center}',
    '.meta-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}',
    '.meta-cell{background:#F1F9F4;border:1px solid #DCEDE4;border-radius:8px;padding:7px 11px;min-width:165px}',
    '.meta-cell small{display:block;font-size:8.5pt;color:#6B7F75}.meta-cell b{font-size:10.5pt}',
    '.fsec-h h3{font-size:13.5pt;color:#17694A;margin:16px 0 10px;border-top:2px solid #1E7A56;padding-top:10px}',
    '.ans{margin-bottom:11px;page-break-inside:avoid}',
    '.ans .q{font-size:10pt;font-weight:bold;color:#17694A;margin-bottom:2px}',
    '.ans .a{font-size:11pt;white-space:pre-wrap;background:#F6FBF8;border-right:3px solid #BBDCC9;padding:6px 10px}',
    '.ans .a.none{color:#99AAA2;font-style:italic;background:#FAFBFA}',
    '.dtbl{width:100%;border-collapse:collapse;font-size:10pt}',
    '.dtbl th{background:#F1F9F4;border:1px solid #CFE7DA;padding:5px 8px;text-align:right}',
    '.dtbl td{border:1px solid #E3F0E8;padding:5px 8px}',
    '.sig-img{max-width:200px;border:1px solid #CFE7DA}'
  ].join("");
  return '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">'+
         '<title>'+esc(rec.student.name)+'</title><style>'+css+'</style></head><body>'+
         node.outerHTML+'</body></html>';
}

function docSection(title, schema, store, cat){
  const s=el("section"); s.style.marginTop="26px";
  const h=el("div","fsec-h"); h.style.borderTop="2px solid var(--green-700)";
  h.style.paddingTop="14px"; h.style.marginBottom="14px";
  h.appendChild(el("h3",null,esc(title)));
  s.appendChild(h);
  schema.forEach(f=>{
    if(f.sec){
      if(f.when && f.when.indexOf(cat)<0) return;
      const sh=el("div"); sh.style.cssText="margin:18px 0 10px;font-weight:600;font-size:13.5px;color:var(--gold-deep);font-family:var(--font-d)";
      sh.textContent="— "+f.sec+" —"; s.appendChild(sh); return;
    }
    if(f.when && f.when.indexOf(cat)<0) return;
    const v=store[f.k];
    const a=el("div","ans");
    a.appendChild(el("div","q",esc(f.l)));
    if(f.t==="table"){
      if(Array.isArray(v) && v.some(r=>Object.values(r).some(x=>String(x||"").trim()))){
        const t=el("table","dtbl"); const tr=el("tr");
        f.cols.forEach(c=>tr.appendChild(el("th",null,esc(c.l))));
        t.appendChild(tr);
        v.forEach(r=>{
          if(!Object.values(r).some(x=>String(x||"").trim())) return;
          const row=el("tr");
          f.cols.forEach(c=>row.appendChild(el("td",null,esc(r[c.k]||"—"))));
          t.appendChild(row);
        });
        a.appendChild(t);
      } else a.appendChild(el("div","a none","— لم يُملأ —"));
    } else if(f.t==="sig"){
      if(v){ const im=el("img","sig-img"); im.src=v; im.alt="توقيع الطالب"; a.appendChild(im); }
      else a.appendChild(el("div","a none","— لم يُوقَّع —"));
    } else if(f.t==="chk"){
      a.appendChild(el("div","a", v?"✓ نعم — أقرّ الطالب بذلك":"✗ لم يُقرّ"));
    } else if(f.t==="date"){
      a.appendChild(el("div","a"+(v?"":" none"), v?fmtDate(v):"— لم يُملأ —"));
    } else {
      a.appendChild(el("div","a"+(String(v||"").trim()?"":" none"), esc(String(v||"").trim())||"— لم يُملأ —"));
    }
    s.appendChild(a);
  });
  return s;
}
