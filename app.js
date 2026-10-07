
const KEY="atlas_v1";
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const today=()=>new Date().toISOString().slice(0,10);
const blank=()=>({
 version:1, profile:{name:"",weight:82,goalWeight:70,bodyFat:"",stepGoal:10000},
 home:{widgets:["overview","goal","training","stats","streak","note"]},
 quick:["workout","meal","checkin","steps","measurement","note"],
 workouts:[
  {id:uid(),name:"Day 1",exercises:[
   {id:uid(),name:"Lat Pulldown",sets:3,targetReps:8,targetWeight:40},
   {id:uid(),name:"T-Bar Row",sets:3,targetReps:8,targetWeight:30},
   {id:uid(),name:"Cable Row",sets:3,targetReps:10,targetWeight:30}
  ]}
 ],
 sessions:[],meals:[],measurements:[],steps:[],notes:[],prs:[],foods:[],
 settings:{theme:"dark",units:"kg"}
});
let db=load(); let page="home"; let workoutTab=0; let activeSession=null;
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x&&x.version?x:blank()}catch{return blank()}}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function toast(t){const e=document.querySelector("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1900)}
function shell(content){return `<div class="app"><main class="shell">${content}</main>${nav()}${fab()}</div>`}
function nav(){return `<nav class="nav"><div class="nav-inner">${[
 ["home","⌂","Home"],["workout","◈","Workout"],["diet","◒","Diet"],["progress","◌","Progress"],["more","☷","More"]
].map(x=>`<button class="${page===x[0]?"active":""}" onclick="go('${x[0]}')"><span class="ico">${x[1]}</span>${x[2]}</button>`).join("")}</div></nav>`}
function fab(){return `<button class="fab" onclick="drawer()">＋</button>`}
function header(title,sub=""){return `<div class="topbar"><div><div class="brand">ATLAS</div><div class="date">${new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</div></div><button class="icon-btn" onclick="drawer()">＋</button></div><h1 class="page-title">${title}</h1>${sub?`<p class="subtitle">${sub}</p>`:""}`}
function go(p){page=p;render()}
function render(){document.querySelector("#app").innerHTML=shell(page==="home"?home():page==="workout"?workout():page==="diet"?diet():page==="progress"?progress():more())}
function home(){
 const w=db.profile.weight||0,g=db.profile.goalWeight||0,step=(db.steps.find(x=>x.date===today())?.steps)||0;
 const widgets=db.home.widgets; const cards={
 overview:`<div class="card"><div class="row"><div><h3>Today</h3><div class="big-number">${step.toLocaleString()}</div><div class="small">steps</div></div><div style="text-align:right"><div class="pill">${db.sessions.filter(s=>s.date===today()).length} workout</div><div style="height:8px"></div><div class="small">${db.meals.filter(m=>m.date===today()).reduce((a,b)=>a+(+b.cal||0),0)} kcal logged</div></div></div></div>`,
 goal:`<div class="card"><div class="row"><h3>Goal</h3><span class="accent">${g?Math.max(0,(w-g).toFixed(1))+" kg to go":"Set a goal"}</span></div><div class="progress"><i style="width:${g&&w>g?Math.min(100,Math.max(0,((db.profile.startWeight||w)-w)/((db.profile.startWeight||w)-g)*100)):0}%"></i></div><div class="small" style="margin-top:8px">Target ${g||"—"} kg</div></div>`,
 training:`<div class="card"><div class="row"><h3>Training</h3><button class="btn smallbtn" onclick="go('workout')">Open</button></div><div class="stat">${db.workouts.length}</div><div class="small">workout days configured</div></div>`,
 stats:`<div class="grid two"><div class="card"><div class="small">Weight</div><div class="stat">${w||"—"}</div><div class="small">kg</div></div><div class="card"><div class="small">Step goal</div><div class="stat">${Math.round(step/(db.profile.stepGoal||10000)*100)}%</div><div class="small">${(db.profile.stepGoal||10000).toLocaleString()} target</div></div></div>`,
 streak:`<div class="card"><div class="row"><h3>Streak</h3><span>🔥</span></div><div class="stat">${streak()}</div><div class="small">consecutive active days</div></div>`,
 note:`<div class="card"><h3>Personal note</h3><p class="muted">${esc(db.notes.at(-1)?.text||"Nothing here yet. Add a note from Quick Actions.")}</p></div>`
 };
 return header("Your overview","A clean command center for today.")+
 `<div class="stack">${widgets.map(k=>cards[k]).join("")}</div>`;
}
function streak(){let n=0,d=new Date();while(true){let s=d.toISOString().slice(0,10);if(db.sessions.some(x=>x.date===s)||db.steps.some(x=>x.date===s&&x.steps>0)||db.meals.some(x=>x.date===s)){n++;d.setDate(d.getDate()-1)}else break}return n}
function workout(){
 if(activeSession)return sessionView();
 const tabs=db.workouts.map((x,i)=>`<button class="${i===workoutTab?"active":""}" onclick="workoutTab=${i};render()">${esc(x.name)}</button>`).join("");
 const day=db.workouts[workoutTab];
 return header("Workout","Build and run your training exactly your way.")+
 `<div class="tabbar">${tabs}<button onclick="newDay()">＋ Day</button></div>`+
 (day?`<div class="stack"><div class="card"><div class="row"><div><h3>${esc(day.name)}</h3><div class="small">${day.exercises.length} exercises</div></div><div class="row"><button class="btn secondary smallbtn" onclick="renameDay()">Rename</button><button class="btn smallbtn" onclick="startWorkout()">Start</button></div></div></div>
 <div class="stack">${day.exercises.map((e,i)=>`<div class="exercise"><div class="row"><div><b>${esc(e.name)}</b><div class="small">${e.sets} sets · ${e.targetReps} reps · ${e.targetWeight||0} kg</div></div><button class="icon-btn" onclick="editExercise(${i})">⋯</button></div></div>`).join("")}</div>
 <button class="btn secondary full" onclick="addExercise()">＋ Add exercise</button></div>`:"<div class='empty'>Create your first workout day.</div>");
}
function sessionView(){
 const s=activeSession,day=db.workouts.find(x=>x.id===s.workoutId);
 return header("Live workout",day.name)+`<div class="stack">${s.exercises.map((e,ei)=>`<div class="exercise"><div class="row"><b>${esc(e.name)}</b><span class="small">${e.sets.length} sets</span></div>${e.sets.map((set,si)=>`<div class="setrow"><span class="small">${si+1}</span><input type="number" value="${set.weight}" placeholder="kg" onchange="activeSession.exercises[${ei}].sets[${si}].weight=this.value"><input type="number" value="${set.reps}" placeholder="reps" onchange="activeSession.exercises[${ei}].sets[${si}].reps=this.value"><span class="small">target</span><button class="check ${set.done?"done":""}" onclick="toggleSet(${ei},${si})">✓</button></div>`).join("")}</div>`).join("")}</div>
 <div class="form-actions"><button class="btn secondary" onclick="activeSession=null;render()">Cancel</button><button class="btn" onclick="finishWorkout()">Finish</button></div>`;
}
function diet(){
 const meals=db.meals.filter(x=>x.date===today()), cal=meals.reduce((a,x)=>a+(+x.cal||0),0),pro=meals.reduce((a,x)=>a+(+x.pro||0),0);
 return header("Diet","Track the numbers that matter without making food logging annoying.")+
 `<div class="grid two"><div class="card"><div class="small">Calories</div><div class="stat">${cal}</div><div class="small">/ ${db.profile.calorieGoal||2200} kcal</div></div><div class="card"><div class="small">Protein</div><div class="stat">${pro}g</div><div class="small">today</div></div></div>
 <div class="card" style="margin-top:12px"><div class="row"><h3>Today’s meals</h3><button class="btn smallbtn" onclick="mealModal()">＋ Add</button></div>${meals.length?`<div class="list">${meals.map((m,i)=>`<div class="listitem"><div><b>${esc(m.name)}</b><div class="small">${m.cal} kcal · ${m.pro}g protein · ${m.carb||0}g carbs · ${m.fat||0}g fat</div></div><button class="icon-btn" onclick="db.meals.splice(${db.meals.indexOf(m)},1);save();render()">×</button></div>`).join("")}</div>`:"<div class='empty'>No meals logged today.</div>"}</div>`;
}
function progress(){
 const ms=db.measurements; const weights=ms.filter(x=>x.weight!=null).slice(-12);
 const max=Math.max(...weights.map(x=>+x.weight),1),min=Math.min(...weights.map(x=>+x.weight),0);
 return header("Progress","Measurements, trends and goals in one place.")+
 `<div class="grid two"><div class="card"><div class="small">Current weight</div><div class="stat">${db.profile.weight||"—"}</div><div class="small">kg</div></div><div class="card"><div class="small">Goal weight</div><div class="stat">${db.profile.goalWeight||"—"}</div><div class="small">kg</div></div></div>
 <div class="card" style="margin-top:12px"><div class="row"><h3>Weight trend</h3><button class="btn smallbtn" onclick="checkinModal()">＋ Check-in</button></div>${weights.length?`<div class="chart">${weights.map(x=>`<div style="flex:1;text-align:center"><div class="bar" style="height:${30+((+x.weight-min)/(max-min||1))*115}px"></div><div class="barlabel">${x.date.slice(5)}</div></div>`).join("")}</div>`:"<div class='empty'>Add check-ins to see your trend.</div>"}</div>
 <div class="card" style="margin-top:12px"><h3>Measurements</h3>${ms.slice(-5).reverse().map(x=>`<div class="metric"><span>${x.date}</span><span>${x.weight||"—"} kg ${x.waist?`· ${x.waist} cm waist`:""}</span></div>`).join("")||"<div class='empty'>No measurements yet.</div>"}</div>`;
}
function more(){
 return header("More","Tune ATLAS to fit the way you train.")+
 `<div class="stack">
 <button class="action" onclick="settingsModal()">⚙️<span>Settings</span>Profile, goals and preferences</button>
 <button class="action" onclick="customizeHome()">⌂<span>Customize Home</span>Choose dashboard widgets</button>
 <button class="action" onclick="customizeQuick()">＋<span>Quick Actions</span>Choose your shortcuts</button>
 <button class="action" onclick="exerciseLibrary()">◈<span>Exercise Library</span>Manage exercises</button>
 <button class="action" onclick="exportData()">↥<span>Backup / Export</span>Download your ATLAS data</button>
 <button class="action" onclick="importData()">↧<span>Import</span>Restore a JSON backup</button>
 <button class="action" onclick="resetData()">⚠️<span>Reset data</span>Start fresh</button>
 </div>`;
}
function drawer(){
 const actions={workout:["🏋️","Start Workout"],meal:["🍽️","Log Meal"],checkin:["⚖️","Check-in"],steps:["👟","Log Steps"],measurement:["📏","Measurement"],note:["📝","Add Note"]};
 document.querySelector("#drawer-root").innerHTML=`<div class="drawer-back" onclick="closeDrawer(event)"><div class="drawer" onclick="event.stopPropagation()"><div class="drawer-handle"></div><div class="action-grid">${db.quick.map(k=>`<button class="action" onclick="quick('${k}')"><span>${actions[k][0]}</span>${actions[k][1]}</button>`).join("")}</div></div></div>`;
}
function closeDrawer(e){if(e.target.classList.contains("drawer-back"))document.querySelector("#drawer-root").innerHTML=""}
function quick(k){document.querySelector("#drawer-root").innerHTML=""; if(k==="workout")go("workout"); if(k==="meal")mealModal(); if(k==="checkin")checkinModal(); if(k==="steps")stepsModal(); if(k==="measurement")measurementModal(); if(k==="note")noteModal()}
function modal(title,body){document.querySelector("#modal-root").innerHTML=`<div class="modal-back" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="row"><h2>${title}</h2><button class="icon-btn" onclick="closeModal()">×</button></div>${body}</div></div>`}
function closeModal(e){if(!e||e.target.classList.contains("modal-back"))document.querySelector("#modal-root").innerHTML=""}
function mealModal(){modal("Log meal",`<label>Meal / food</label><input id="mname" placeholder="e.g. Roti + dal"><div class="grid two"><div><label>Calories</label><input id="mcal" type="number"></div><div><label>Protein (g)</label><input id="mpro" type="number"></div><div><label>Carbs (g)</label><input id="mcarb" type="number"></div><div><label>Fat (g)</label><input id="mfat" type="number"></div></div><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveMeal()">Save</button></div>`)}
function saveMeal(){db.meals.push({id:uid(),date:today(),name:document.querySelector("#mname").value||"Meal",cal:+document.querySelector("#mcal").value||0,pro:+document.querySelector("#mpro").value||0,carb:+document.querySelector("#mcarb").value||0,fat:+document.querySelector("#mfat").value||0});save();closeModal();render();toast("Meal logged")}
function stepsModal(){modal("Log steps",`<label>Steps for today</label><input id="steps" type="number" value="${db.steps.find(x=>x.date===today())?.steps||""}"><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveSteps()">Save</button></div>`)}
function saveSteps(){const n=+document.querySelector("#steps").value||0;const old=db.steps.find(x=>x.date===today());if(old)old.steps=n;else db.steps.push({date:today(),steps:n});save();closeModal();render();toast("Steps saved")}
function checkinModal(){modal("Check-in",`<div class="grid two"><div><label>Weight (kg)</label><input id="cw" type="number" step=".1" value="${db.profile.weight||""}"></div><div><label>Body fat (%)</label><input id="cb" type="number" step=".1" value="${db.profile.bodyFat||""}"></div></div><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveCheckin()">Save</button></div>`)}
function saveCheckin(){const w=+document.querySelector("#cw").value||0,b=document.querySelector("#cb").value;db.profile.weight=w;if(!db.profile.startWeight)db.profile.startWeight=w;if(b)db.profile.bodyFat=+b;db.measurements.push({date:today(),weight:w,bodyFat:b?+b:null});save();closeModal();render();toast("Check-in saved")}
function measurementModal(){modal("Measurement",`<div class="grid two"><div><label>Waist (cm)</label><input id="waist" type="number" step=".1"></div><div><label>Neck (cm)</label><input id="neck" type="number" step=".1"></div></div><label>Notes</label><textarea id="mn"></textarea><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveMeasurement()">Save</button></div>`)}
function saveMeasurement(){db.measurements.push({date:today(),weight:db.profile.weight,waist:+document.querySelector("#waist").value||null,neck:+document.querySelector("#neck").value||null,notes:document.querySelector("#mn").value});save();closeModal();render();toast("Measurement saved")}
function noteModal(){modal("Personal note",`<textarea id="note" rows="5" placeholder="Write anything you want to remember..."></textarea><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveNote()">Save</button></div>`)}
function saveNote(){const t=document.querySelector("#note").value.trim();if(t)db.notes.push({date:today(),text:t});save();closeModal();render();toast("Note saved")}
function newDay(){modal("New workout day",`<label>Name</label><input id="dn" placeholder="e.g. Push"><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveDay()">Create</button></div>`)}
function saveDay(){db.workouts.push({id:uid(),name:document.querySelector("#dn").value||"New Day",exercises:[]});workoutTab=db.workouts.length-1;save();closeModal();render()}
function renameDay(){const d=db.workouts[workoutTab];modal("Rename day",`<label>Name</label><input id="dn" value="${esc(d.name)}"><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="d.name=document.querySelector('#dn').value||d.name;save();closeModal();render()">Save</button></div>`)}
function addExercise(){modal("Add exercise",`<label>Exercise name</label><input id="en" placeholder="e.g. Incline Dumbbell Press"><div class="grid two"><div><label>Sets</label><input id="es" type="number" value="3"></div><div><label>Target reps</label><input id="er" type="number" value="8"></div><div><label>Target weight</label><input id="ew" type="number" step=".5" value="0"></div></div><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveExercise()">Add</button></div>`)}
function saveExercise(){const d=db.workouts[workoutTab];d.exercises.push({id:uid(),name:document.querySelector("#en").value||"Exercise",sets:+document.querySelector("#es").value||3,targetReps:+document.querySelector("#er").value||8,targetWeight:+document.querySelector("#ew").value||0});save();closeModal();render()}
function editExercise(i){const e=db.workouts[workoutTab].exercises[i];modal("Edit exercise",`<label>Name</label><input id="en" value="${esc(e.name)}"><div class="grid two"><div><label>Sets</label><input id="es" type="number" value="${e.sets}"></div><div><label>Target reps</label><input id="er" type="number" value="${e.targetReps}"></div><div><label>Target weight</label><input id="ew" type="number" value="${e.targetWeight}"></div></div><div class="form-actions"><button class="btn danger" onclick="db.workouts[workoutTab].exercises.splice(${i},1);save();closeModal();render()">Delete</button><button class="btn" onclick="let e=db.workouts[workoutTab].exercises[${i}];e.name=document.querySelector('#en').value;e.sets=+document.querySelector('#es').value;e.targetReps=+document.querySelector('#er').value;e.targetWeight=+document.querySelector('#ew').value;save();closeModal();render()">Save</button></div>`)}
function startWorkout(){const d=db.workouts[workoutTab];activeSession={id:uid(),workoutId:d.id,date:today(),startedAt:Date.now(),exercises:d.exercises.map(e=>({exerciseId:e.id,name:e.name,sets:Array.from({length:e.sets},()=>({weight:e.targetWeight||0,reps:e.targetReps||0,done:false}))}))};render()}
function toggleSet(e,s){activeSession.exercises[e].sets[s].done=!activeSession.exercises[e].sets[s].done;render()}
function finishWorkout(){if(!activeSession)return;activeSession.finishedAt=Date.now();activeSession.duration=Math.round((activeSession.finishedAt-activeSession.startedAt)/60000);db.sessions.push(activeSession);activeSession.exercises.forEach(e=>e.sets.forEach(x=>{if(x.done){let pr=db.prs.find(p=>p.exerciseId===e.exerciseId);if(!pr||(+x.weight||0)>(+pr.weight||0)){if(pr)pr.weight=+x.weight;else db.prs.push({exerciseId:e.exerciseId,name:e.name,weight:+x.weight,date:today()})}}}));activeSession=null;save();go("workout");toast("Workout completed 💪")}
function settingsModal(){modal("Settings",`<label>Name</label><input id="pn" value="${esc(db.profile.name)}"><div class="grid two"><div><label>Current weight</label><input id="pw" type="number" step=".1" value="${db.profile.weight}"></div><div><label>Goal weight</label><input id="pg" type="number" step=".1" value="${db.profile.goalWeight}"></div><div><label>Calorie goal</label><input id="pc" type="number" value="${db.profile.calorieGoal||2200}"></div><div><label>Step goal</label><input id="ps" type="number" value="${db.profile.stepGoal||10000}"></div></div><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="db.profile.name=document.querySelector('#pn').value;db.profile.weight=+document.querySelector('#pw').value;db.profile.goalWeight=+document.querySelector('#pg').value;db.profile.calorieGoal=+document.querySelector('#pc').value;db.profile.stepGoal=+document.querySelector('#ps').value;save();closeModal();render()">Save</button></div>`)}
function customizeHome(){const names={overview:"Today overview",goal:"Goal",training:"Training",stats:"Quick stats",streak:"Streak",note:"Personal note"};modal("Home widgets",`<div class="stack">${Object.entries(names).map(([k,v])=>`<label style="display:flex;gap:10px;align-items:center;color:var(--text)"><input style="width:auto" type="checkbox" ${db.home.widgets.includes(k)?"checked":""} onchange="toggleWidget('${k}',this.checked)"> ${v}</label>`).join("")}</div><button class="btn full" onclick="closeModal();render()">Done</button>`)}
function toggleWidget(k,on){if(on&&!db.home.widgets.includes(k))db.home.widgets.push(k);if(!on)db.home.widgets=db.home.widgets.filter(x=>x!==k);save()}
function customizeQuick(){const names={workout:"Start Workout",meal:"Log Meal",checkin:"Check-in",steps:"Log Steps",measurement:"Measurement",note:"Add Note"};modal("Quick actions",`<div class="stack">${Object.entries(names).map(([k,v])=>`<label style="display:flex;gap:10px;align-items:center;color:var(--text)"><input style="width:auto" type="checkbox" ${db.quick.includes(k)?"checked":""} onchange="toggleQuick('${k}',this.checked)"> ${v}</label>`).join("")}</div><button class="btn full" onclick="closeModal();render()">Done</button>`)}
function toggleQuick(k,on){if(on&&!db.quick.includes(k))db.quick.push(k);if(!on)db.quick=db.quick.filter(x=>x!==k);save()}
function exerciseLibrary(){modal("Exercise Library",`<p class="muted">Exercises stay in your workout history even if you remove them from a current workout.</p><div class="list">${[...new Set(db.workouts.flatMap(d=>d.exercises.map(e=>e.name)))].map(x=>`<div class="listitem"><b>${esc(x)}</b><span class="small">Custom / assigned</span></div>`).join("")||"<div class='empty'>Add exercises from a workout to build your library.</div>"}</div>`)}
function exportData(){const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`atlas-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup exported")}
function importData(){modal("Import backup",`<p class="muted">Choose an ATLAS JSON backup. Your current data will be replaced only after the file is successfully parsed.</p><input id="file" type="file" accept=".json,application/json"><div class="form-actions"><button class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn" onclick="readImport()">Import</button></div>`)}
function readImport(){const f=document.querySelector("#file").files[0];if(!f)return toast("Choose a file");const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.version||!x.profile||!Array.isArray(x.workouts))throw Error();db=x;save();closeModal();render();toast("Backup restored")}catch{toast("Invalid ATLAS backup")}};r.readAsText(f)}
function resetData(){if(confirm("Reset all ATLAS data? This cannot be undone.")){db=blank();save();render();toast("ATLAS reset")}}
render();
