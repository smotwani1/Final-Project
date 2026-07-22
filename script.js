"use strict";
/* ============================================================
   Listing Ready — application logic
   ============================================================ */
const VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/";
const FE = "https://www.fueleconomy.gov/ws/rest/vehicle";
const MILES_PER_YEAR = 12000;

const SAMPLE_VINS = [
  "1HGCM82633A004352", // 2003 Honda Accord EX-V6 (sedan, gas)
  "1FTFW1ET9DFC10312", // 2013 Ford F-150 (truck)
  "5YJ3E1EA5KF328931", // 2019 Tesla Model 3 (EV)
  "1C4RJFAG0FC625797", // 2015 Jeep Grand Cherokee (SUV)
  "2T1BURHE8JC123456"  // 2018 Toyota Corolla (compact)
];

// Two comparison slots. Manual details + listing always belong to slot A.
const slots = { A:{vehicle:null,fuel:null}, B:{vehicle:null,fuel:null} };

const $ = id => document.getElementById(id);
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const val = v => (v && String(v).trim() && String(v).trim() !== "Not Applicable") ? String(v).trim() : "";

/* ---------- VIN field wiring (shared for both slots) ---------- */
function cleanVin(raw){ return raw.toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/[IOQ]/g,""); }
function validateVin(v){
  if(!v.length) return "Enter a VIN to begin.";
  if(v.length < 17) return `VIN is ${v.length}/17 characters.`;
  if(!VIN_RE.test(v)) return "Not a valid VIN (letters & numbers, no I/O/Q).";
  return "";
}

const cfg = {
  A:{input:"vinInput",btn:"decodeBtn",count:"charCount",err:"vinError",status:"status",sample:"sampleBtn"},
  B:{input:"vinInputB",btn:"decodeBtnB",count:"charCountB",err:"vinErrorB",status:"statusB",sample:"sampleBtnB"}
};

function updateVinUi(slot){
  const c = cfg[slot], el = $(c.input), v = el.value;
  $(c.count).textContent = `${v.length} / 17`;
  const bad = v.length === 17 && !VIN_RE.test(v);
  el.classList.toggle("invalid", bad);
  $(c.err).textContent = bad ? validateVin(v) : "";
  $(c.btn).disabled = !VIN_RE.test(v);
  if(slot === "A") renderBarcode(v);
}

/* ---------- Status ---------- */
function showStatus(slot,kind,msg){
  const s = $(cfg[slot].status);
  s.className = `status show ${kind}`;
  s.innerHTML = kind === "loading" ? `<span class="spin"></span><span>${msg}</span>` : `<span>${msg}</span>`;
}
function hideStatus(slot){ $(cfg[slot].status).className = "status"; }

/* ---------- Core NHTSA decode (shared by both VINs) ---------- */
async function fetchDecode(vin){
  const res = await fetch(`${VPIC}${encodeURIComponent(vin)}?format=json`);
  if(!res.ok) throw new Error(`server ${res.status}`);
  const data = await res.json();
  const r = (data.Results && data.Results[0]) || null;
  if(!r) throw new Error("no data returned");
  return r;
}

async function decode(slot){
  const c = cfg[slot], vin = $(c.input).value;
  const err = validateVin(vin);
  if(err){ $(c.err).textContent = err; return; }
  $(c.err).textContent = "";
  $(c.btn).disabled = true;
  showStatus(slot,"loading","Decoding VIN against NHTSA vPIC…");
  try{
    const r = await fetchDecode(vin);
    const clean = String(r.ErrorCode||"").split(",").map(s=>s.trim()).includes("0");
    if(!(val(r.Make) && val(r.ModelYear))){
      slots[slot].vehicle = null; slots[slot].fuel = null;
      afterDecode(slot);
      showStatus(slot,"error",`Couldn't decode that VIN. ${escapeHtml(r.ErrorText || "No vehicle details returned.")}`);
      return;
    }
    slots[slot].vehicle = r; slots[slot].fuel = null;
    afterDecode(slot);
    if(clean) hideStatus(slot);
    else showStatus(slot,"warn",`Decoded with a note from NHTSA: ${escapeHtml(firstSentence(r.ErrorText))} Data may be partial.`);
    // Fuel economy lookup (async, non-blocking for the rest of the UI)
    loadFuel(slot);
  }catch(e){
    slots[slot].vehicle = null; slots[slot].fuel = null;
    afterDecode(slot);
    showStatus(slot,"error",`Couldn't reach NHTSA (${escapeHtml(e.message)}). Check your connection and retry.`);
  }finally{
    $(c.btn).disabled = !VIN_RE.test($(c.input).value);
  }
}

function afterDecode(slot){
  if(slot === "A"){ renderSpecs(slots.A.vehicle); buildListing(); }
  renderComparison();
  $("assumeBar").style.display = (slots.A.vehicle || slots.B.vehicle) ? "flex" : "none";
}

function firstSentence(t){ return t ? String(t).split(/[.;]/)[0].trim() + "." : ""; }

/* ---------- Spec derivations ---------- */
function engineSummary(r){
  const parts = [];
  const disp = val(r.DisplacementL);
  if(disp && !isNaN(+disp)) parts.push(`${(+disp).toFixed(1)}L`);
  const cyl = val(r.EngineCylinders), config = val(r.EngineConfiguration);
  if(cyl){ const s = /V/i.test(config)?"V":(/Inline|Straight/i.test(config)?"I":""); parts.push(s?`${s}${cyl}`:`${cyl}-cyl`); }
  const fuel = val(r.FuelTypePrimary);
  if(fuel && !/gasoline/i.test(fuel)) parts.push(fuel);
  let out = parts.join(" ");
  const hp = val(r.EngineHP);
  if(hp && !isNaN(+hp)) out += `${out?", ":""}${Math.round(+hp)} hp`;
  return out;
}
function drivetrainShort(r){
  const d = val(r.DriveType); if(!d) return "";
  if(/all/i.test(d)) return "AWD";
  if(/4x4|4wd|four/i.test(d)) return "4WD";
  if(/front/i.test(d)) return "FWD";
  if(/rear/i.test(d)) return "RWD";
  return d;
}
function transmissionSummary(r){
  const style = val(r.TransmissionStyle), speeds = val(r.TransmissionSpeeds);
  if(!style && !speeds) return "";
  return [speeds?`${speeds}-speed`:"", style].filter(Boolean).join(" ");
}
function stateOrCountry(r){
  const st = val(r.PlantState); if(st) return titleCase(st);
  const c = val(r.PlantCountry); return c ? titleCase(c.replace(/\s*\(.*\)/,"")) : "";
}
function vehName(r){ return [val(r.ModelYear),titleCase(r.Make),val(r.Model),val(r.Trim)||val(r.Series)].filter(Boolean).join(" "); }

/* ---------- Spec sheet render (slot A) ---------- */
function renderSpecs(r){
  const host = $("specHost");
  if(!r){ host.innerHTML = `<div class="empty">Decode a VIN to print the spec sheet.</div>`; return; }
  const trim = val(r.Trim) || val(r.Series);
  const sub = [val(r.BodyClass), val(r.Doors)?`${r.Doors}-door`:""].filter(Boolean).join(" · ");
  const rows = [
    ["Year",val(r.ModelYear)],["Make",titleCase(r.Make)],["Model",val(r.Model)],["Trim",trim],
    ["Body",val(r.BodyClass)],["Engine",engineSummary(r)],["Drivetrain",drivetrainShort(r)],
    ["Transmission",transmissionSummary(r)],["Fuel",val(r.FuelTypePrimary)],["Doors",val(r.Doors)],
    ["Assembly",[titleCase(r.PlantCity),stateOrCountry(r)].filter(Boolean).join(", ")]
  ].filter(([,v])=>v);
  host.innerHTML =
    `<div class="veh-title">${escapeHtml(vehName(r))}</div>${sub?`<div class="veh-sub">${escapeHtml(sub)}</div>`:""}` +
    `<div class="specs">${rows.map(([k,v])=>`<div class="srow"><div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div></div>`).join("")}</div>`;
}

/* ---------- Fuel economy (fueleconomy.gov, XML) ---------- */
async function feXml(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`fe ${res.status}`);
  const txt = await res.text();
  return new DOMParser().parseFromString(txt,"application/xml");
}
function xmlItems(doc){
  return [...doc.getElementsByTagName("menuItem")].map(n=>({
    text:(n.getElementsByTagName("text")[0]||{}).textContent||"",
    value:(n.getElementsByTagName("value")[0]||{}).textContent||""
  }));
}
const feText = (doc,tag)=>{ const n = doc.getElementsByTagName(tag)[0]; return n?n.textContent.trim():""; };

async function menuOptions(year,make,model){
  return xmlItems(await feXml(`${FE}/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`));
}
async function menuModels(year,make){
  return xmlItems(await feXml(`${FE}/menu/model?year=${year}&make=${encodeURIComponent(make)}`));
}

// Pick the best engine/transmission option for a decoded vehicle.
function pickOption(options,r){
  const cyl = val(r.EngineCylinders), disp = val(r.DisplacementL);
  const dispStr = disp && !isNaN(+disp) ? (+disp).toFixed(1) : "";
  const autoManual = /manual/i.test(val(r.TransmissionStyle)) ? "man" : (/auto/i.test(val(r.TransmissionStyle)) ? "auto" : "");
  let best = options[0], bestScore = -1;
  for(const o of options){
    const t = o.text.toLowerCase(); let s = 0;
    if(cyl && new RegExp(`\\b${cyl}\\s*cyl`).test(t)) s += 3;
    if(dispStr && t.includes(`${dispStr} l`)) s += 3;
    if(autoManual === "auto" && /auto/.test(t)) s += 2;
    if(autoManual === "man" && /\bman\b/.test(t)) s += 2;
    if(s > bestScore){ bestScore = s; best = o; }
  }
  return best;
}
// When the exact model name doesn't match, rank fuzzy model candidates by drivetrain.
function rankModels(cands,r){
  const dt = drivetrainShort(r);
  const want4 = /AWD|4WD/.test(dt), want2 = /FWD|RWD/.test(dt);
  return cands.map(c=>{
    const t = c.text.toLowerCase(); let s = 0;
    if(want4 && /(4wd|awd|4x4|4matic)/.test(t)) s += 2;
    if(want2 && /(fwd|2wd|rwd)/.test(t)) s += 2;
    if(!/\b(4wd|awd|fwd|2wd|rwd)\b/i.test(c.text)) s += 0.5; // slight bias to plainest name
    return {c,s};
  }).sort((a,b)=>b.s-a.s).map(x=>x.c);
}

async function fetchFuelEconomy(r){
  const year = val(r.ModelYear), make = titleCase(r.Make), model = val(r.Model);
  if(!year || !make || !model) return {matched:false};
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g,"");
  let options, modelName = model;
  options = await menuOptions(year,make,model);
  if(!options.length){
    const models = await menuModels(year,make);
    const target = norm(model);
    let cands = models.filter(m=>norm(m.text).startsWith(target));
    if(!cands.length) cands = models.filter(m=>norm(m.text).includes(target));
    if(!cands.length) return {matched:false};
    cands = rankModels(cands,r);
    modelName = cands[0].text;
    options = await menuOptions(year,make,modelName);
  }
  if(!options.length) return {matched:false};
  const opt = pickOption(options,r);
  const doc = await feXml(`${FE}/${opt.value}`);
  const comb = feText(doc,"comb08");
  const mpg = comb && !isNaN(+comb) ? +comb : null;
  if(mpg == null) return {matched:false};
  const fuelType = feText(doc,"fuelType") || feText(doc,"fuelType1");
  const liquid = !/electric/i.test(fuelType);
  return {
    matched:true, mpg, liquid, fuelType,
    unit: liquid ? "MPG" : "MPGe",
    epaCost: (()=>{ const c = feText(doc,"fuelCost08"); return c && !isNaN(+c) ? +c : null; })(),
    co2: (()=>{ const c = feText(doc,"co2TailpipeGpm"); return c && !isNaN(+c) ? Math.round(+c) : null; })(),
    matchLabel: `${year} ${make} ${modelName} · ${opt.text}`
  };
}

async function loadFuel(slot){
  const r = slots[slot].vehicle; if(!r) return;
  if(slot === "A") renderFuel("loading");
  renderComparison();
  try{
    const f = await fetchFuelEconomy(r);
    slots[slot].fuel = f;
  }catch(e){
    slots[slot].fuel = {matched:false, error:e.message};
  }
  if(slot === "A"){ renderFuel(); buildListing(); }
  renderComparison();
}

function pricePerGal(){ const v = parseFloat($("ppg").value); return (isNaN(v)||v<0) ? 0 : v; }
function annualCost(f){
  if(!f || !f.matched || f.mpg == null) return null;
  if(f.liquid) return (MILES_PER_YEAR / f.mpg) * pricePerGal();
  return f.epaCost != null ? f.epaCost : null; // electric: EPA estimate
}
const money = n => n == null ? "—" : "$" + Math.round(n).toLocaleString("en-US");

function renderFuel(state){
  const host = $("fuelHost");
  if(!slots.A.vehicle){ host.innerHTML = ""; return; }
  if(state === "loading"){
    host.innerHTML = `<div class="fuel na"><div class="side"><span class="lbl">Fuel Economy</span><span class="meta"><span class="spin" style="display:inline-block;vertical-align:-1px"></span> Looking up fueleconomy.gov…</span></div></div>`;
    return;
  }
  const f = slots.A.fuel;
  if(!f || !f.matched){
    host.innerHTML = `<div class="fuel na"><div class="side"><span class="lbl">Fuel Economy</span><span class="meta">Not available for this exact trim in the EPA database.</span></div></div>`;
    return;
  }
  const cost = annualCost(f);
  const costMeta = f.liquid
    ? `${MILES_PER_YEAR.toLocaleString("en-US")} mi/yr @ $${pricePerGal().toFixed(2)}/gal`
    : `EPA estimate · electric ($/gal n/a)`;
  host.innerHTML =
    `<div class="fuel">
       <div class="big"><span class="n">${f.mpg}</span><span class="u">${f.unit} comb</span></div>
       <div class="side">
         <span class="lbl">Est. Annual Fuel</span>
         <span class="cost">${money(cost)}<span style="font-family:var(--cond);font-size:.7rem;color:var(--ink-500)"> / yr</span></span>
         <span class="meta">${escapeHtml(costMeta)}${f.co2!=null?` · ${f.co2} g CO₂/mi`:""}</span>
       </div>
     </div>`;
}

/* ---------- Listing generation (slot A) ---------- */
function numF(id){ const v = $(id).value.trim(); return v===""?null:v; }
const fmtMiles = m => m==null?null:Number(m).toLocaleString("en-US")+" miles";
const fmtPrice = p => p==null?null:"$"+Number(p).toLocaleString("en-US");

function buildTitle(){
  const r = slots.A.vehicle; if(!r) return "";
  let t = vehName(r);
  const m = numF("mileage"); if(m) t += ` — ${Number(m).toLocaleString("en-US")} mi`;
  const p = numF("price"); if(p) t += ` — ${fmtPrice(p)}`;
  return t;
}
function buildListing(){
  const r = slots.A.vehicle;
  $("copyBtn").disabled = !r;
  if(!r){
    $("titleOut").textContent = "Decode a VIN to generate your listing.";
    $("listingOut").textContent = "Your listing prints here — it updates live as you decode a VIN and fill in details.";
    return;
  }
  const tone = $("tone").value;
  const ymmt = vehName(r);
  const miles = fmtMiles(numF("mileage")), price = fmtPrice(numF("price"));
  const condition = $("condition").value, titleStatus = $("titleStatus").value;
  const ext = numF("extColor"), int = numF("intColor"), owners = numF("owners"), location = numF("location");
  const features = numF("features"), notes = numF("notes"), contact = numF("contact");
  const engine = engineSummary(r), drive = drivetrainShort(r), trans = transmissionSummary(r), body = val(r.BodyClass);
  const f = slots.A.fuel;
  const s = [];

  if(tone === "concise"){
    s.push(`${ymmt} for sale${miles?`, ${miles}`:""}${condition?`, ${condition.toLowerCase()} condition`:""}.`);
  }else{
    if(/needs/i.test(condition)) s.push(`Selling my ${ymmt} — a project car that needs some work.`);
    else if(condition) s.push(`Selling my ${ymmt} in ${condition.toLowerCase()} condition.`);
    else s.push(`Selling my ${ymmt}.`);
    if(miles) s.push(`It has ${miles} on it.`);
  }
  const spec = [];
  if(body) spec.push(`${body.toLowerCase()} body`);
  if(engine) spec.push(`${article(engine)} ${engine} engine`);
  if(drive) spec.push(drive);
  if(trans) spec.push(`${article(trans)} ${trans.toLowerCase()} transmission`);
  const trim = val(r.Trim)||val(r.Series);
  if(spec.length && tone !== "concise") s.push(`Per the VIN, it's ${trim?"the "+trim+" trim with ":"equipped with "}${joinList(spec)}.`);
  else if(spec.length) s.push(cap(joinList(spec))+".");

  if(f && f.matched && tone !== "concise"){
    s.push(f.liquid ? `Rated ${f.mpg} ${f.unit} combined.` : `EPA-rated ${f.mpg} ${f.unit} combined (electric).`);
  }
  const colors = [];
  if(ext) colors.push(`${ext} exterior`); if(int) colors.push(`${int} interior`);
  if(colors.length) s.push(`Finished in ${joinList(colors)}.`);
  const own = [];
  if(owners) own.push(`${owners} owner${owners==="1"?"":"s"}`); if(titleStatus) own.push(titleStatus.toLowerCase());
  if(own.length) s.push(cap(joinList(own))+".");
  if(features){ const l = features.split(",").map(x=>x.trim()).filter(Boolean); if(l.length) s.push(`Notable features: ${joinList(l)}.`); }
  if(notes){ const n = notes.trim(); s.push(/[.!?]$/.test(n)?n:n+"."); }
  if(tone === "detailed" && !notes) s.push("Happy to answer questions or set up a time to see it in person.");
  const close = [];
  if(price) close.push(`asking ${price}`); if(location) close.push(`located in ${location}`);
  if(close.length) s.push(cap(joinList(close))+".");
  if(contact){ const c = contact.trim(); s.push(cap(/[.!?]$/.test(c)?c:c+".")); }

  $("listingOut").textContent = s.join(" ").replace(/\s+/g," ").trim();
  $("titleOut").textContent = buildTitle();
}

/* ---------- Comparison render ---------- */
function renderComparison(){
  const host = $("cmpHost");
  const A = slots.A.vehicle, B = slots.B.vehicle;
  if(!A && !B){ host.innerHTML = `<p class="cmp-empty">Vehicle A (above) and Vehicle B will appear here once both are decoded.</p>`; return; }
  if(!A || !B){
    host.innerHTML = `<p class="cmp-empty">Decoded Vehicle ${A?"A":"B"}. Decode Vehicle ${A?"B":"A"} to build the side-by-side comparison.</p>`;
    return;
  }
  const fuelCell = slot => {
    const f = slots[slot].fuel;
    if(f === null) return {mpg:"…",cost:"…",mpgN:null,costN:null};
    if(!f.matched) return {mpg:"n/a",cost:"n/a",mpgN:null,costN:null};
    return {mpg:`${f.mpg} ${f.unit}`, cost:money(annualCost(f))+" / yr", mpgN:f.mpg, costN:annualCost(f)};
  };
  const fa = fuelCell("A"), fb = fuelCell("B");
  const rows = [
    ["Year",val(A.ModelYear),val(B.ModelYear)],
    ["Make",titleCase(A.Make),titleCase(B.Make)],
    ["Model",val(A.Model),val(B.Model)],
    ["Trim",val(A.Trim)||val(A.Series),val(B.Trim)||val(B.Series)],
    ["Engine",engineSummary(A),engineSummary(B)],
    ["Drivetrain",drivetrainShort(A),drivetrainShort(B)],
    ["Body Class",val(A.BodyClass),val(B.BodyClass)],
    ["Fuel Type",val(A.FuelTypePrimary),val(B.FuelTypePrimary)],
    ["Comb. Economy",fa.mpg,fb.mpg,"mpg"],
    ["Est. Annual Fuel",fa.cost,fb.cost,"cost"]
  ];
  const winClass = (kind,side)=>{
    if(kind === "mpg" && fa.mpgN!=null && fb.mpgN!=null && fa.mpgN!==fb.mpgN)
      return (side==="A"?fa.mpgN>fb.mpgN:fb.mpgN>fa.mpgN) ? "win" : "";
    if(kind === "cost" && fa.costN!=null && fb.costN!=null && fa.costN!==fb.costN)
      return (side==="A"?fa.costN<fb.costN:fb.costN<fa.costN) ? "win" : "";
    return "";
  };
  const body = rows.map(([k,a,b,kind])=>{
    const diff = (!kind && a && b && a!==b) ? "diff" : "";
    const wa = kind?winClass(kind,"A"):"", wb = kind?winClass(kind,"B"):"";
    return `<tr><td class="k">${escapeHtml(k)}</td>`+
      `<td class="val ${diff} ${wa}">${escapeHtml(a||"—")}</td>`+
      `<td class="val ${diff} ${wb}">${escapeHtml(b||"—")}</td></tr>`;
  }).join("");
  host.innerHTML =
    `<table class="cmp"><colgroup><col class="k"><col><col></colgroup>
      <thead><tr><th class="klabel">Spec</th><th>A · ${escapeHtml(vehName(A))}</th><th>B · ${escapeHtml(vehName(B))}</th></tr></thead>
      <tbody>${body}</tbody></table>`;
}

/* ---------- Code 39 barcode (signature element) ---------- */
const C39 = {
 "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw",
 "5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
 "A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn",
 "F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn",
 "K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn",
 "P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn",
 "U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn",
 "Z":"nwwnwnnnn","*":"nwnnwnwnn"
};
function renderBarcode(vin){
  const plate = $("plate");
  if(!vin){ plate.classList.remove("show"); return; }
  plate.classList.add("show");
  const N=2, W=6, H=46, gap=N;
  const chars = ("*" + vin.replace(/[^0-9A-Z]/g,"") + "*").split("");
  let x = 0; const rects = [];
  for(const ch of chars){
    const pat = C39[ch]; if(!pat) continue;
    for(let i=0;i<9;i++){ const w = pat[i]==="w"?W:N; if(i%2===0) rects.push(`<rect x="${x}" y="0" width="${w}" height="${H}"/>`); x += w; }
    x += gap;
  }
  const totalW = Math.max(1, x - gap);
  $("barcode").innerHTML = `<svg viewBox="0 0 ${totalW} ${H}" preserveAspectRatio="none">${rects.join("")}</svg>`;
  $("plateVin").textContent = vin;
}

/* ---------- Text utilities ---------- */
function titleCase(s){
  if(!s) return "";
  return String(s).trim().toLowerCase().replace(/\b([a-z])/g,(_,c)=>c.toUpperCase())
    .replace(/\b(Bmw|Gmc|Suv|Awd|Rwd|Fwd|Usa|Ev|Ram|Srt)\b/gi,m=>m.toUpperCase());
}
const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
const article = w => /^[aeiou]/i.test(String(w||"").trim()) ? "an" : "a";
function joinList(a){ a = a.filter(Boolean); if(a.length<=1) return a.join(""); if(a.length===2) return `${a[0]} and ${a[1]}`; return `${a.slice(0,-1).join(", ")}, and ${a[a.length-1]}`; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ---------- Copy ---------- */
async function copyListing(){
  const text = `${$("titleOut").textContent}\n\n${$("listingOut").textContent}`;
  try{ await navigator.clipboard.writeText(text); showToast("Listing copied"); }
  catch{
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); showToast("Listing copied"); }catch{ showToast("Press ⌘/Ctrl+C"); }
    document.body.removeChild(ta);
  }
}
let toastTimer;
function showToast(m){ const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove("show"),2000); }

/* ---------- Wiring ---------- */
["A","B"].forEach(slot=>{
  const c = cfg[slot], el = $(c.input);
  el.addEventListener("input",()=>{ const p = el.selectionStart; el.value = cleanVin(el.value); try{el.setSelectionRange(p,p);}catch{} updateVinUi(slot); });
  el.addEventListener("keydown",e=>{ if(e.key==="Enter" && !$(c.btn).disabled) decode(slot); });
  $(c.btn).addEventListener("click",()=>decode(slot));
  $(c.sample).addEventListener("click",()=>{
    const list = slot==="A" ? SAMPLE_VINS : [...SAMPLE_VINS].reverse();
    $(c.input).value = list[Math.floor(Date.now()/1000)%list.length];
    updateVinUi(slot); decode(slot);
  });
  updateVinUi(slot);
});
["mileage","price","condition","titleStatus","extColor","intColor","owners","location","features","notes","contact","tone"]
  .forEach(id=>{ $(id).addEventListener("input",buildListing); $(id).addEventListener("change",buildListing); });
$("copyBtn").addEventListener("click",copyListing);
$("ppg").addEventListener("input",()=>{ if(slots.A.vehicle){ renderFuel(); buildListing(); } renderComparison(); });
