'use strict';

/* AtlasIQ universal workspace enhancements
   - local multi-profile workspaces
   - generic ProofGraph evidence
   - Opportunity Radar + Decision Memory
   - IndexedDB Data Vault + Atlas Passport
   - Atlas Pulse + seven-day Mission Sprint
   - Amy, an on-device context-aware Atlas AI copilot
   All personal data remains in the visitor's browser. */

(() => {
  const rawGet = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const rawSet = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const uid = (prefix='id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const activeProfileId = () => localStorage.getItem('atlasiq_active_profile') || 'guest';
  const getProfiles = () => rawGet('atlasiq_profiles', []);
  const getProfile = () => getProfiles().find(p => p.id === localStorage.getItem('atlasiq_active_profile')) || null;
  const isPurdue = profile => /purdue/i.test(profile?.university || '');
  const titleCase = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
  const splitSkills = value => [...new Set(String(value || '').split(/[,;\n•|]+/).map(normalizeSkill).filter(Boolean))];
  const todayISO = () => new Date().toISOString().slice(0,10);
  const futureISO = days => {
    const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10);
  };
  const safeFilename = value => String(value || 'atlas').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50) || 'atlas';
  const openModal = el => { if(!el) return; el.classList.add('open'); el.setAttribute('aria-hidden','false'); };
  const closeModal = el => { if(!el) return; el.classList.remove('open'); el.setAttribute('aria-hidden','true'); };

  // ---------- Shared state defaults ----------
  const genericCourses = [
    {id:'DATA 101',name:'Foundations of Data Science',credits:3,hours:8,difficulty:3.1,project:12,career:8,generic:true},
    {id:'STAT 201',name:'Applied Statistics',credits:3,hours:8,difficulty:3.4,project:5,career:8,generic:true},
    {id:'CS 101',name:'Programming Fundamentals',credits:4,hours:11,difficulty:3.7,project:18,career:9,generic:true},
    {id:'COMM 110',name:'Professional Communication',credits:3,hours:5,difficulty:2.1,project:5,career:6,generic:true},
    {id:'MATH 250',name:'Linear Algebra',credits:3,hours:9,difficulty:3.8,project:3,career:8,generic:true},
    {id:'DATA 310',name:'Machine Learning',credits:3,hours:12,difficulty:4.3,project:22,career:10,generic:true}
  ];
  genericCourses.forEach(c => { if(!courseCatalog.some(x => x.id === c.id)) courseCatalog.unshift(c); });

  function rebuildCourseSelect(){
    courseSelect.innerHTML = courseCatalog.map((c,i)=>`<option value="${i}">${escapeHTML(c.id)} — ${escapeHTML(c.name)}</option>`).join('');
  }
  rebuildCourseSelect();

  // ---------- Profile manager ----------
  const profileModal = $('#profileModal');
  const profileForm = $('#profileForm');

  function renderProfileList(){
    const profiles = getProfiles();
    const active = localStorage.getItem('atlasiq_active_profile');
    $('#profileList').innerHTML = profiles.length ? profiles.map(p => `
      <button class="profile-list-item ${p.id===active?'active':''}" data-profile-id="${p.id}">
        <span>${escapeHTML((p.name || '?').slice(0,1).toUpperCase())}</span>
        <div><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.major || 'Student')} · ${escapeHTML(p.university || 'University')}</small></div>
        <em>${p.id===active?'ACTIVE':'SWITCH'}</em>
      </button>`).join('') : `<div class="empty-profile-list"><b>No saved profiles yet</b><span>Create one to isolate plans, datasets, and evidence on this device.</span></div>`;
    $$('[data-profile-id]', $('#profileList')).forEach(button => {
      button.onclick = () => switchProfile(button.dataset.profileId);
    });
  }

  function clearProfileForm(){
    profileForm.reset();
    $('#profileId').value = '';
    $('#profileGradYear').value = new Date().getFullYear() + 3;
  }

  function fillProfileForm(profile){
    $('#profileId').value = profile?.id || '';
    $('#profileName').value = profile?.name || '';
    $('#profileUniversity').value = profile?.university || '';
    $('#profileGradYear').value = profile?.gradYear || '';
    $('#profileMajor').value = profile?.major || '';
    $('#profileGoal').value = profile?.goal || '';
    $('#profileSkills').value = (profile?.skills || []).join(', ');
  }

  function openProfileManager(){
    renderProfileList();
    fillProfileForm(getProfile());
    openModal(profileModal);
  }

  function switchProfile(id){
    localStorage.setItem('atlasiq_active_profile', id);
    localStorage.removeItem('atlasiq_guest_mode');
    closeModal(profileModal);
    refreshWorkspace();
    toast(`Switched to ${getProfile()?.name || 'profile'}`);
  }

  profileForm.addEventListener('submit', event => {
    event.preventDefault();
    const profiles = getProfiles();
    const existingId = $('#profileId').value;
    const profile = {
      id: existingId || uid('profile'),
      name: $('#profileName').value.trim(),
      university: $('#profileUniversity').value.trim() || 'My University',
      gradYear: +$('#profileGradYear').value || null,
      major: $('#profileMajor').value.trim() || 'Undeclared',
      goal: $('#profileGoal').value.trim() || 'Explore opportunities',
      skills: splitSkills($('#profileSkills').value),
      createdAt: profiles.find(p=>p.id===existingId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const index = profiles.findIndex(p => p.id === profile.id);
    if(index >= 0) profiles[index] = profile; else profiles.push(profile);
    rawSet('atlasiq_profiles', profiles);
    localStorage.setItem('atlasiq_active_profile', profile.id);
    localStorage.removeItem('atlasiq_guest_mode');
    if(index < 0){
      const defaults = isPurdue(profile) ? starterCourseIds : genericCourses.slice(0,4).map(c=>c.id);
      localStorage.setItem(scopedStorageKey('atlasiq_courses'), JSON.stringify(defaults));
    }
    closeModal(profileModal);
    refreshWorkspace();
    toast('Private profile saved locally');
  });

  $('#profileBtn').onclick = openProfileManager;
  $('#profileClose').onclick = () => closeModal(profileModal);
  profileModal.querySelector('.modal-backdrop').onclick = () => closeModal(profileModal);
  $('#newProfileBtn').onclick = clearProfileForm;
  $('#guestModeBtn').onclick = () => {
    localStorage.removeItem('atlasiq_active_profile');
    rawSet('atlasiq_guest_mode', true);
    closeModal(profileModal);
    refreshWorkspace();
    toast('Temporary guest workspace active');
  };

  async function deleteActiveProfile(){
    const profile = getProfile();
    if(!profile) return toast('No saved profile is active');
    if(!confirm(`Delete ${profile.name}'s local AtlasIQ workspace from this browser?`)) return;
    const profiles = getProfiles().filter(p=>p.id!==profile.id);
    rawSet('atlasiq_profiles', profiles);
    Object.keys(localStorage).filter(k=>k.startsWith(`atlasiq_profile_${profile.id}_`)).forEach(k=>localStorage.removeItem(k));
    await deleteVaultForProfile(profile.id);
    if(profiles[0]) localStorage.setItem('atlasiq_active_profile', profiles[0].id); else localStorage.removeItem('atlasiq_active_profile');
    closeModal(profileModal);
    refreshWorkspace();
    toast('Local profile deleted');
  }
  $('#deleteProfileBtn').onclick = deleteActiveProfile;

  function updateIdentityUI(){
    const profile = getProfile();
    const name = profile?.name || 'Guest';
    $('#profileAvatar').textContent = name.slice(0,1).toUpperCase();
    $('#profileButtonName').textContent = profile?.name?.split(' ')[0] || 'Profile';
    $('#workspaceProfileLabel').textContent = profile ? `${profile.name}'s workspace` : 'Temporary guest workspace';
    $('#welcomeLine').textContent = profile ? `WELCOME, ${profile.name.split(' ')[0].toUpperCase()}` : 'WELCOME TO ATLASIQ';
    $('#decisionCenterTitle').textContent = profile ? `${profile.name.split(' ')[0]}'s Decision Center` : 'Your Decision Center';
    $('#campusHeadline').textContent = profile ? `${profile.name.split(' ')[0]}'s university decisions, modeled before they happen.` : 'Your university decisions, modeled before you make them.';
    $('#campusSubhead').textContent = profile ? `${profile.major} at ${profile.university}. Build plans, test tradeoffs, grow career evidence, and keep everything private on this device.` : 'Create a private local profile—or continue as a guest—to model courses, career growth, datasets, and campus decisions.';
    $('#proofNetworkLabel').textContent = profile ? `${profile.name.toUpperCase()}'S EVIDENCE NETWORK` : 'YOUR EVIDENCE NETWORK';
    $('#skillsInput').value = profile?.skills?.join(', ') || storage.get('atlasiq_last_skills','Python, SQL, statistics, communication');
    $('#roleSelect').value = Object.keys(roleProfiles).includes(profile?.goal) ? profile.goal : ($('#roleSelect').value || 'Data Science Intern');
    $('#campusMode').value = isPurdue(profile) ? 'purdue' : 'custom';
    $('#campusPackBadge').textContent = isPurdue(profile) ? 'Purdue Campus Pack' : `${profile?.university || 'Custom'} Campus`;
  }

  function refreshCoursesForProfile(){
    const customIds = new Set(storage.get('atlasiq_custom_courses', []).map(c=>c.id));
    for(let i=courseCatalog.length-1;i>=0;i--){
      if(courseCatalog[i].profileCustom && !customIds.has(courseCatalog[i].id)) courseCatalog.splice(i,1);
    }
    storage.get('atlasiq_custom_courses', []).forEach(c=>{
      if(c?.id && !courseCatalog.some(x=>x.id===c.id)) courseCatalog.push({...c,profileCustom:true});
    });
    rebuildCourseSelect();
    const profile = getProfile();
    const fallback = isPurdue(profile) ? starterCourseIds : genericCourses.slice(0,4).map(c=>c.id);
    selectedCourses = storage.get('atlasiq_courses', fallback).map(id=>courseCatalog.find(c=>c.id===id)).filter(Boolean);
    const prefs = storage.get('atlasiq_semester_prefs', null);
    if(prefs){
      if(Number.isFinite(prefs.work)) $('#workHours').value=prefs.work;
      if(Number.isFinite(prefs.club)) $('#clubHours').value=prefs.club;
      if(Number.isFinite(prefs.sleep)) $('#sleepHours').value=prefs.sleep;
      if(Number.isFinite(prefs.commute)) $('#commute').value=prefs.commute;
    }
    renderCourses(); updateSemester(); renderScenarios();
  }

  ['workHours','clubHours','sleepHours','commute'].forEach(id => {
    $(`#${id}`).addEventListener('input', () => storage.set('atlasiq_semester_prefs', {
      work:+$('#workHours').value, club:+$('#clubHours').value, sleep:+$('#sleepHours').value, commute:+$('#commute').value
    }));
  });
  $('#skillsInput').addEventListener('input', () => storage.set('atlasiq_last_skills', $('#skillsInput').value));

  // ---------- Custom courses ----------
  const customCourseModal = $('#customCourseModal');
  $('#customCourseBtn').onclick = () => openModal(customCourseModal);
  customCourseModal.querySelector('.modal-backdrop').onclick = () => closeModal(customCourseModal);
  customCourseModal.querySelector('.modal-close').onclick = () => closeModal(customCourseModal);
  $('#customCourseForm').addEventListener('submit', event => {
    event.preventDefault();
    const code = $('#customCourseCode').value.trim().toUpperCase();
    const course = {
      id: code,
      name: $('#customCourseName').value.trim(),
      credits:+$('#customCourseCredits').value,
      hours:+$('#customCourseHours').value,
      difficulty:+$('#customCourseDifficulty').value,
      career:+$('#customCourseCareer').value,
      project:Math.round(+$('#customCourseCareer').value*1.8),
      profileCustom:true
    };
    if(courseCatalog.some(c=>c.id===code)) return toast('That course code already exists');
    const customs = storage.get('atlasiq_custom_courses', []);
    customs.push(course); storage.set('atlasiq_custom_courses', customs);
    courseCatalog.push(course); rebuildCourseSelect();
    selectedCourses.push(course); renderCourses(); updateSemester();
    event.target.reset(); closeModal(customCourseModal); toast(`${code} added locally`);
  });

  // ---------- Dynamic ProofGraph ----------
  const evidenceModal = $('#evidenceModal');
  $('#addEvidenceBtn').onclick = () => openModal(evidenceModal);
  evidenceModal.querySelector('.modal-backdrop').onclick = () => closeModal(evidenceModal);
  evidenceModal.querySelector('.modal-close').onclick = () => closeModal(evidenceModal);

  function getEvidence(){ return storage.get('atlasiq_evidence', []); }
  function evidenceSkills(){ return [...new Set(getEvidence().map(e=>normalizeSkill(e.skill)).filter(Boolean))]; }

  function rebuildProofGraph(){
    const profile = getProfile();
    const evidence = getEvidence();
    const baseSkills = profile?.skills?.length ? profile.skills : ['python','sql','statistics','communication'];
    const allSkills = [...new Set([...baseSkills, ...evidence.map(e=>normalizeSkill(e.skill))])].slice(0,12);
    const rootName = profile?.name || 'Your Profile';
    const newNodes = [{id:rootName,type:'root',x:.5,y:.5,evidence:[profile ? `${profile.major} at ${profile.university}${profile.gradYear?` · Class of ${profile.gradYear}`:''}` : 'Create a local profile to personalize this evidence network.']}];
    const newEdges = [];
    allSkills.forEach((skill,index)=>{
      const angle = -Math.PI/2 + index*(Math.PI*2/Math.max(1,allSkills.length));
      const radius = index%2 ? .35 : .39;
      const skillEvidence = evidence.filter(e=>normalizeSkill(e.skill)===skill).map(e=>`${e.type}: ${e.detail}`);
      newNodes.push({id:titleCase(skill),type:'skill',x:.5+Math.cos(angle)*radius,y:.5+Math.sin(angle)*radius,evidence:skillEvidence.length?skillEvidence:[`Profile-listed skill: ${titleCase(skill)}. Add a project, artifact, metric, or experience to verify it.`]});
      newEdges.push([rootName,titleCase(skill)]);
    });
    evidence.slice(0,8).forEach((item,index)=>{
      const skillId = titleCase(normalizeSkill(item.skill));
      const nodeId = `${item.type} ${index+1}`;
      const angle = index*(Math.PI*2/Math.max(1,Math.min(8,evidence.length)))+.35;
      newNodes.push({id:nodeId,type:'experience',x:.5+Math.cos(angle)*.24,y:.5+Math.sin(angle)*.24,evidence:[item.detail]});
      newEdges.push([skillId,nodeId]);
    });
    proofNodes.splice(0,proofNodes.length,...newNodes);
    proofEdges.splice(0,proofEdges.length,...newEdges);
    selectedProof = allSkills.length ? titleCase(allSkills[0]) : rootName;
    renderProofEvidence(); setTimeout(drawProofGraph,20);
    updatePulseAndSprint();
  }

  $('#evidenceForm').addEventListener('submit', event => {
    event.preventDefault();
    const evidence = getEvidence();
    evidence.push({id:uid('evidence'),skill:$('#evidenceSkill').value.trim(),detail:$('#evidenceDetail').value.trim(),type:$('#evidenceType').value,createdAt:new Date().toISOString()});
    storage.set('atlasiq_evidence', evidence);
    event.target.reset(); closeModal(evidenceModal); rebuildProofGraph(); toast('Evidence added to your ProofGraph');
  });
  $('#exportProof').onclick = () => {
    const profile = getProfile();
    downloadFile(`${safeFilename(profile?.name || 'my')}-proofgraph.json`, JSON.stringify({owner:profile?.name||'Guest',generatedAt:new Date().toISOString(),nodes:proofNodes,edges:proofEdges,evidence:getEvidence()},null,2));
  };

  // ---------- Opportunity Radar ----------
  const skillDictionary = {
    python:['python'], sql:['sql','postgresql','mysql'], statistics:['statistics','statistical','hypothesis testing','experimentation','a/b testing'],
    'machine learning':['machine learning','ml model','predictive modeling'], pandas:['pandas'], 'scikit-learn':['scikit-learn','sklearn'],
    'data visualization':['data visualization','visualization','plotly','matplotlib','tableau','power bi'],
    excel:['excel','spreadsheets'], git:['git','github','version control'], docker:['docker','containerization'], cloud:['aws','azure','gcp','cloud'],
    spark:['spark','pyspark'], airflow:['airflow'], 'data pipelines':['data pipeline','etl','elt'], databases:['database','relational'],
    java:['java'], javascript:['javascript','typescript','react','next.js'], apis:['api','rest','fastapi'], testing:['testing','unit test','pytest'],
    communication:['communication','present','stakeholder','cross-functional'], leadership:['leadership','lead','mentor'],
    'healthcare data':['healthcare','clinical','patient','pharmaceutical'], snowflake:['snowflake'], privacy:['privacy','hipaa','ferpa','security'],
    'model deployment':['model deployment','mlops','production model','serving'], 'data cleaning':['data cleaning','data quality','preprocessing'],
    algorithms:['algorithms','data structures'], 'linear algebra':['linear algebra'], pytorch:['pytorch'], tensorflow:['tensorflow']
  };

  function extractOpportunitySignals(text){
    const lower = text.toLowerCase();
    return Object.entries(skillDictionary).filter(([,terms])=>terms.some(term=>lower.includes(term))).map(([skill])=>skill);
  }
  function userSkillSet(){
    const profile = getProfile();
    return [...new Set([...(profile?.skills||[]),...splitSkills($('#skillsInput').value),...evidenceSkills()].map(normalizeSkill))];
  }
  function skillIsPresent(required, owned){ return owned.some(h=>h===required||h.includes(required)||required.includes(h)); }

  function analyzeOpportunity(save=true){
    const text = $('#jobDescription').value.trim();
    if(text.length < 40) return toast('Paste a fuller opportunity description');
    const name = $('#opportunityName').value.trim() || 'Untitled opportunity';
    const required = extractOpportunitySignals(text);
    const owned = userSkillSet();
    const matched = required.filter(skill=>skillIsPresent(skill,owned));
    const missing = required.filter(skill=>!matched.includes(skill));
    const evidence = getEvidence();
    const proven = matched.filter(skill=>evidence.some(e=>skillIsPresent(skill,[normalizeSkill(e.skill)])));
    const matchScore = required.length ? Math.round(100*matched.length/required.length) : 50;
    const proofScore = matched.length ? Math.round(100*proven.length/matched.length) : 0;
    const overall = Math.round(matchScore*.72 + proofScore*.28);
    const actions = [
      missing[0] ? `Build a small public artifact proving ${titleCase(missing[0])}.` : 'Turn one existing project into a concise impact case study.',
      missing[1] ? `Complete a focused ${titleCase(missing[1])} exercise and document the result.` : 'Add measurable outcomes to two ProofGraph entries.',
      `Prepare a 60-second story connecting ${titleCase(matched[0]||'your strongest skill')} to a real result.`
    ];
    const result = {id:uid('opp'),name,text,required,matched,missing,proven,matchScore,proofScore,overall,actions,createdAt:new Date().toISOString()};
    $('#opportunityResults').innerHTML = `
      <div class="opportunity-score-card"><div class="score-orbit" style="--score:${overall}"><strong>${overall}</strong><span>FIT</span></div><div><span class="kicker">EVIDENCE-AWARE MATCH</span><h4>${escapeHTML(name)}</h4><p>${matched.length} of ${required.length || 'the detected'} signals match your current profile. ${proven.length} are backed by ProofGraph evidence.</p></div></div>
      <div class="opportunity-stat-grid"><article><span>Skill match</span><strong>${matchScore}%</strong></article><article><span>Proof coverage</span><strong>${proofScore}%</strong></article><article><span>Signals found</span><strong>${required.length}</strong></article></div>
      <div class="skill-columns"><div><h5>Matched signals</h5><div class="tag-cloud">${matched.map(s=>`<span>${escapeHTML(s)}</span>`).join('')||'<span>None detected yet</span>'}</div></div><div><h5>Highest-value gaps</h5><div class="tag-cloud gaps">${missing.slice(0,8).map(s=>`<span>${escapeHTML(s)}</span>`).join('')||'<span>No major detected gaps</span>'}</div></div></div>
      <div class="action-sprint"><span class="kicker">72-HOUR ACTION SPRINT</span>${actions.map((action,i)=>`<div><i>${i+1}</i><p>${escapeHTML(action)}</p></div>`).join('')}</div>
      <button id="saveOpportunityResult" class="button primary full">Save to this profile</button>`;
    $('#saveOpportunityResult').onclick = () => {
      const list = storage.get('atlasiq_opportunities', []); list.unshift(result); storage.set('atlasiq_opportunities',list.slice(0,20));
      toast('Opportunity analysis saved locally'); updatePulseAndSprint();
    };
    if(save) storage.set('atlasiq_last_opportunity', result);
    return result;
  }
  $('#loadOpportunitySample').onclick = () => {
    $('#opportunityName').value='Data Science Intern — Sample Company';
    $('#jobDescription').value='We are seeking a Data Science Intern with Python, SQL, pandas, statistics, machine learning, scikit-learn, data visualization, Git, cloud exposure, Docker, communication skills, and experience presenting insights to cross-functional stakeholders. Experience building data pipelines or deploying models is preferred.';
    toast('Sample opportunity loaded');
  };
  $('#analyzeOpportunity').onclick = () => analyzeOpportunity();

  // ---------- Decision Memory ----------
  const journalConfidence = $('#journalConfidence');
  journalConfidence.oninput = () => $('#journalConfidenceOut').textContent = `${journalConfidence.value}%`;
  if(!$('#journalReviewDate').value) $('#journalReviewDate').value = futureISO(30);
  function getJournal(){ return storage.get('atlasiq_decision_journal', []); }
  function calibrationScore(entries){
    const reviewed = entries.filter(e=>Number.isFinite(e.outcome));
    if(!reviewed.length) return null;
    return Math.round(avg(reviewed.map(e=>100-Math.abs(e.confidence-e.outcome))));
  }
  function renderJournal(){
    const entries = getJournal();
    const reviewed = entries.filter(e=>Number.isFinite(e.outcome));
    $('#journalCount').textContent = entries.length;
    $('#journalReviewed').textContent = reviewed.length;
    $('#journalCalibration').textContent = calibrationScore(entries) ?? '—';
    $('#journalTimeline').innerHTML = entries.length ? entries.map(entry=>`
      <article class="journal-entry ${Number.isFinite(entry.outcome)?'reviewed':''}" data-entry-id="${entry.id}">
        <div class="journal-entry-head"><span>${new Date(entry.createdAt).toLocaleDateString()}</span><em>${entry.confidence}% confidence</em></div>
        <h4>${escapeHTML(entry.decision)}</h4><p><b>Prediction:</b> ${escapeHTML(entry.prediction)}</p>
        ${entry.reason?`<p><b>Reason:</b> ${escapeHTML(entry.reason)}</p>`:''}
        <div class="journal-meta"><span>Review ${escapeHTML(entry.reviewDate||'anytime')}</span>${Number.isFinite(entry.outcome)?`<strong>Outcome ${entry.outcome}/100</strong>`:'<strong>Awaiting outcome</strong>'}</div>
        ${entry.outcomeNote?`<div class="journal-outcome">${escapeHTML(entry.outcomeNote)}</div>`:''}
        <div class="inline-actions"><button class="button tiny review-journal" data-id="${entry.id}">${Number.isFinite(entry.outcome)?'Update outcome':'Review outcome'}</button><button class="text-btn delete-journal" data-id="${entry.id}">Delete</button></div>
        <div class="journal-review-form hidden" id="review-${entry.id}">
          <label>How successful was the outcome? <span class="review-score-out">${entry.outcome ?? 70}/100</span><input class="review-score" type="range" min="0" max="100" value="${entry.outcome ?? 70}" /></label>
          <label>What actually happened?<textarea class="review-note" rows="3" placeholder="Record the real result and what you learned…">${escapeHTML(entry.outcomeNote||'')}</textarea></label>
          <button class="button primary full save-review" data-id="${entry.id}">Save outcome</button>
        </div>
      </article>`).join('') : `<div class="empty-state compact"><span>↺</span><h4>Your decision model starts here</h4><p>Log an important choice, then return with the real outcome to calibrate future predictions.</p></div>`;
    $$('.review-journal').forEach(button=>button.onclick=()=>$('#review-'+button.dataset.id).classList.toggle('hidden'));
    $$('.review-score').forEach(input=>input.oninput=()=>input.closest('label').querySelector('.review-score-out').textContent=`${input.value}/100`);
    $$('.save-review').forEach(button=>button.onclick=()=>{
      const entries = getJournal(), entry = entries.find(e=>e.id===button.dataset.id), form=$('#review-'+button.dataset.id);
      entry.outcome=+$('.review-score',form).value; entry.outcomeNote=$('.review-note',form).value.trim(); entry.reviewedAt=new Date().toISOString();
      storage.set('atlasiq_decision_journal',entries); renderJournal(); updatePulseAndSprint(); toast('Outcome added to Decision Memory');
    });
    $$('.delete-journal').forEach(button=>button.onclick=()=>{
      storage.set('atlasiq_decision_journal',getJournal().filter(e=>e.id!==button.dataset.id)); renderJournal(); updatePulseAndSprint();
    });
  }
  $('#saveJournalEntry').onclick = () => {
    const decision=$('#journalDecision').value.trim(), prediction=$('#journalPrediction').value.trim();
    if(!decision||!prediction) return toast('Add the decision and predicted impact');
    const entries=getJournal(); entries.unshift({id:uid('decision'),decision,prediction,confidence:+journalConfidence.value,reviewDate:$('#journalReviewDate').value,reason:$('#journalReason').value.trim(),createdAt:new Date().toISOString()});
    storage.set('atlasiq_decision_journal',entries.slice(0,50));
    $('#journalDecision').value=''; $('#journalPrediction').value=''; $('#journalReason').value=''; $('#journalReviewDate').value=futureISO(30);
    renderJournal(); updatePulseAndSprint(); toast('Decision saved locally');
  };

  // ---------- Custom campus engine ----------
  const defaultCustomCampus = [
    {name:'Main Hall',short:'MAIN',x:22,y:54},{name:'Engineering Center',short:'ENGR',x:62,y:28},{name:'University Library',short:'LIB',x:48,y:62},{name:'Student Center',short:'STU',x:72,y:70},{name:'Residence Hall',short:'HOME',x:18,y:82}
  ];
  function customCampus(){ return storage.get('atlasiq_custom_buildings', defaultCustomCampus); }
  function activeCampusPlaces(){
    if($('#campusMode').value==='purdue') return buildingNames.map(name=>({name,short:buildings[name].short,lat:buildings[name].x,lon:buildings[name].y}));
    return customCampus();
  }
  function populateCampusPlaces(){
    const places=activeCampusPlaces();
    const options=places.map(p=>`<option value="${escapeHTML(p.name)}">${escapeHTML(p.name)}</option>`).join('');
    const oldFrom=$('#fromBuilding').value, oldTo=$('#toBuilding').value;
    $('#fromBuilding').innerHTML=options; $('#toBuilding').innerHTML=options;
    if(places.some(p=>p.name===oldFrom)) $('#fromBuilding').value=oldFrom;
    if(places.some(p=>p.name===oldTo)) $('#toBuilding').value=oldTo; else if(places[1]) $('#toBuilding').value=places[1].name;
    $('#campusBuilder').classList.toggle('hidden',$('#campusMode').value==='purdue');
    renderCustomBuildingList(); enhancedCalculateRoute();
  }
  function renderCustomBuildingList(){
    const list=customCampus();
    $('#customBuildingList').innerHTML=list.map((p,i)=>`<div><span><b>${escapeHTML(p.short)}</b> ${escapeHTML(p.name)}</span><button data-remove-place="${i}" aria-label="Remove">×</button></div>`).join('');
    $$('[data-remove-place]').forEach(button=>button.onclick=()=>{
      const next=customCampus(); next.splice(+button.dataset.removePlace,1); storage.set('atlasiq_custom_buildings',next); populateCampusPlaces();
    });
  }
  $('#campusMode').onchange = populateCampusPlaces;
  $('#addCustomBuilding').onclick = () => {
    const name=$('#customBuildingName').value.trim(), short=$('#customBuildingShort').value.trim().toUpperCase();
    if(!name||!short) return toast('Add a place name and short code');
    const list=customCampus(); list.push({name,short,x:+$('#customBuildingX').value,y:+$('#customBuildingY').value}); storage.set('atlasiq_custom_buildings',list);
    $('#customBuildingName').value=''; $('#customBuildingShort').value=''; populateCampusPlaces(); toast('Campus place added locally');
  };

  function enhancedCalculateRoute(){
    const mode=$('#campusMode').value, places=activeCampusPlaces(), fromName=$('#fromBuilding').value, toName=$('#toBuilding').value;
    const a=places.find(p=>p.name===fromName), b=places.find(p=>p.name===toName); if(!a||!b) return;
    const condition=$('#weatherCondition').value, minutes=+$('#transitionMinutes').value;
    let miles;
    if(mode==='purdue') miles=haversine({x:a.lat,y:a.lon},{x:b.lat,y:b.lon})*1.17;
    else miles=Math.hypot(a.x-b.x,a.y-b.y)*.0085;
    const base=miles/3*60+2, mult={clear:1,rain:1.16,snow:1.38,crowded:1.22}[condition], walk=base*mult, buffer=minutes-walk;
    const risk=buffer>=5?'Low':buffer>=1.5?'Moderate':'High', score=clamp(Math.round(100-(walk/Math.max(1,minutes))*28-(risk==='High'?28:risk==='Moderate'?12:0)),20,98);
    routeState={from:fromName,to:toName,condition,minutes};
    $('#routeResult').innerHTML=`<h4>${risk} transition risk · ${round(walk,1)} min estimated</h4><p>${round(miles,2)} miles from ${escapeHTML(a.short)} to ${escapeHTML(b.short)}. You have ${round(buffer,1)} minutes of modeled buffer under ${escapeHTML(condition)} conditions. ${risk==='High'?'Leave immediately, change the route, or build a backup plan.':risk==='Moderate'?'Feasible, but small delays could erase your buffer.':'This transition has a healthy resilience margin.'}</p>`;
    $('#metricRoute').textContent=score;
    const university=getProfile()?.university||'University';
    $('#mapsLink').href=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromName+', '+university)}&destination=${encodeURIComponent(toName+', '+university)}&travelmode=walking`;
    enhancedDrawCampusMap(); updatePulseAndSprint();
  }
  function enhancedDrawCampusMap(){
    const canvas=$('#campusMap'), s=setupCanvas(canvas); if(!s) return;
    const {ctx,w,h}=s,c=paletteColors(),places=activeCampusPlaces(),pad=48;
    ctx.clearRect(0,0,w,h); ctx.fillStyle=root.classList.contains('light')?'#eef1f7':'#0b1020'; ctx.fillRect(0,0,w,h);
    for(let i=0;i<12;i++){ctx.strokeStyle=c.line;ctx.beginPath();ctx.moveTo(0,i*h/12);ctx.lineTo(w,i*h/12);ctx.stroke();}
    for(let i=0;i<16;i++){ctx.beginPath();ctx.moveTo(i*w/16,0);ctx.lineTo(i*w/16,h);ctx.stroke();}
    let position;
    if($('#campusMode').value==='purdue'){
      const lats=places.map(p=>p.lat),lons=places.map(p=>p.lon),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons);
      position=p=>({x:pad+(p.lon-minLon)/(maxLon-minLon||1)*(w-pad*2),y:h-pad-(p.lat-minLat)/(maxLat-minLat||1)*(h-pad*2)});
    }else position=p=>({x:pad+p.x/100*(w-pad*2),y:pad+p.y/100*(h-pad*2)});
    places.forEach(p=>{const pt=position(p),active=[routeState.from,routeState.to].includes(p.name);ctx.fillStyle=active?c.gold:c.cyan;ctx.beginPath();ctx.arc(pt.x,pt.y,active?7:4,0,Math.PI*2);ctx.fill();ctx.fillStyle=c.text;ctx.font='10px sans-serif';ctx.fillText(p.short,pt.x+8,pt.y-7);});
    const a=places.find(p=>p.name===routeState.from),b=places.find(p=>p.name===routeState.to); if(!a||!b)return; const pa=position(a),pb=position(b);
    ctx.strokeStyle=c.gold;ctx.lineWidth=3;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.quadraticCurveTo((pa.x+pb.x)/2+25,(pa.y+pb.y)/2-35,pb.x,pb.y);ctx.stroke();ctx.setLineDash([]);
  }
  calculateRoute = enhancedCalculateRoute;
  drawCampusMap = enhancedDrawCampusMap;
  $('#calculateRoute').onclick = enhancedCalculateRoute;

  // ---------- IndexedDB Data Vault ----------
  const DB_NAME='atlasiq-vault-v2', STORE='datasets';
  function openVaultDB(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'id'});store.createIndex('profileId','profileId',{unique:false});}};
      request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
    });
  }
  async function vaultPut(record){const db=await openVaultDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async function vaultAll(){const db=await openVaultDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result.filter(x=>x.profileId===activeProfileId()));req.onerror=()=>reject(req.error);});}
  async function vaultDelete(id){const db=await openVaultDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  async function deleteVaultForProfile(profileId){const db=await openVaultDB();const all=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});await Promise.all(all.filter(x=>x.profileId===profileId).map(x=>vaultDelete(x.id)));}

  async function saveCurrentDataset(){
    if(!dataState.profile) return toast('Load a dataset before saving it');
    const record={id:uid('dataset'),profileId:activeProfileId(),name:dataState.name,domain:dataState.domain,rows:dataState.rows,createdAt:new Date().toISOString(),quality:dataState.profile.quality,columns:dataState.profile.columns.length};
    try{await vaultPut(record);toast('Dataset saved to this profile’s local vault');renderVault();updatePulseAndSprint();}catch{toast('Could not save the dataset in this browser');}
  }
  async function renderVault(){
    const list=await vaultAll().catch(()=>[]);
    $('#vaultList').innerHTML=list.length?list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(item=>`
      <article class="vault-item"><div><span>${escapeHTML(item.domain.toUpperCase())}</span><h4>${escapeHTML(item.name)}</h4><p>${item.rows.length.toLocaleString()} rows · ${item.columns} columns · quality ${item.quality}/100</p><small>${new Date(item.createdAt).toLocaleString()}</small></div><div><button class="button tiny load-vault" data-id="${item.id}">Open</button><button class="text-btn delete-vault" data-id="${item.id}">Delete</button></div></article>`).join(''):`<div class="empty-state compact"><span>▣</span><h4>Your local Data Vault is empty</h4><p>Analyze a CSV or sample dataset, then save it for this profile.</p></div>`;
    $$('.load-vault').forEach(button=>button.onclick=async()=>{const item=(await vaultAll()).find(x=>x.id===button.dataset.id);if(item){dataState.domain=item.domain;setData(item.rows,item.name);closeModal($('#vaultModal'));toast('Dataset reopened from local vault');}});
    $$('.delete-vault').forEach(button=>button.onclick=async()=>{await vaultDelete(button.dataset.id);renderVault();});
  }
  $('#saveDataset').onclick=saveCurrentDataset;
  $('#vaultBtn').onclick=async()=>{await renderVault();openModal($('#vaultModal'));};
  $('#vaultModal').querySelector('.modal-backdrop').onclick=()=>closeModal($('#vaultModal'));
  $('#vaultModal').querySelector('.modal-close').onclick=()=>closeModal($('#vaultModal'));

  // ---------- Atlas Passport + full backup ----------
  async function profileBundle(){
    const profile=getProfile();
    const id=profile?.id||'guest';
    const scoped={};
    Object.keys(localStorage).filter(k=>k.startsWith(`atlasiq_profile_${id}_`)).forEach(k=>{try{scoped[k.split(`atlasiq_profile_${id}_`)[1]]=JSON.parse(localStorage.getItem(k));}catch{}});
    const datasets=await vaultAll().catch(()=>[]);
    return {version:2,product:'AtlasIQ',exportedAt:new Date().toISOString(),profile:profile||{id:'guest',name:'Guest'},scoped,datasets};
  }
  async function exportFullBackup(){const bundle=await profileBundle();downloadFile(`${safeFilename(bundle.profile.name)}-atlasiq-backup.json`,JSON.stringify(bundle,null,2));}
  $('#exportProfileBtn').onclick=exportFullBackup;
  $('#downloadPassportJson').onclick=exportFullBackup;

  $('#importProfileInput').onchange=async event=>{
    const file=event.target.files[0]; if(!file)return;
    try{
      const bundle=JSON.parse(await file.text()); if(!bundle.profile||!bundle.scoped)throw new Error('Invalid backup');
      const profiles=getProfiles(), imported={...bundle.profile,id:uid('profile'),name:`${bundle.profile.name || 'Imported'} (Imported)`,updatedAt:new Date().toISOString()};
      profiles.push(imported);rawSet('atlasiq_profiles',profiles);localStorage.setItem('atlasiq_active_profile',imported.id);
      Object.entries(bundle.scoped).forEach(([k,v])=>localStorage.setItem(`atlasiq_profile_${imported.id}_${k}`,JSON.stringify(v)));
      for(const dataset of bundle.datasets||[]) await vaultPut({...dataset,id:uid('dataset'),profileId:imported.id});
      event.target.value='';closeModal(profileModal);refreshWorkspace();toast('Backup imported into a new local profile');
    }catch(error){toast(error.message||'Could not import this backup');}
  };

  function passportMetrics(){
    return {balance:+$('#metricBalance').textContent||0,career:+$('#metricCareer').textContent||0,route:+$('#metricRoute').textContent||0,pulse:computePulse().score};
  }
  function renderPassport(){
    const p=getProfile()||{name:'Guest User',major:'Student',university:'University',goal:'Explore opportunities',skills:[]};
    const metrics=passportMetrics(),evidence=getEvidence(),decisions=getJournal();
    $('#passportPreview').innerHTML=`<div class="passport-identity"><span>${escapeHTML(p.name.slice(0,2).toUpperCase())}</span><div><h4>${escapeHTML(p.name)}</h4><p>${escapeHTML(p.major)} · ${escapeHTML(p.university)}${p.gradYear?` · ${p.gradYear}`:''}</p><small>Target: ${escapeHTML(p.goal)}</small></div></div><div class="passport-metrics"><article><strong>${metrics.pulse}</strong><span>Atlas Pulse</span></article><article><strong>${metrics.balance}</strong><span>Semester</span></article><article><strong>${metrics.career}</strong><span>Career</span></article><article><strong>${evidence.length}</strong><span>Proofs</span></article></div><div class="tag-cloud">${(p.skills||[]).map(s=>`<span>${escapeHTML(s)}</span>`).join('')||'<span>Add skills in your profile</span>'}</div><p class="passport-note">${decisions.length} decisions logged · ${decisions.filter(d=>Number.isFinite(d.outcome)).length} outcomes reviewed · all workspace data stored locally.</p>`;
  }
  $('#passportBtn').onclick=()=>{renderPassport();openModal($('#passportModal'));};
  $('#passportModal').querySelector('.modal-backdrop').onclick=()=>closeModal($('#passportModal'));
  $('#passportModal').querySelector('.modal-close').onclick=()=>closeModal($('#passportModal'));
  $('#downloadPassportHtml').onclick=()=>{
    const p=getProfile()||{name:'AtlasIQ User',major:'Student',university:'University',goal:'Explore opportunities',skills:[]};
    const m=passportMetrics(),evidence=getEvidence();
    const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHTML(p.name)} — Atlas Passport</title><style>body{margin:0;background:#080b16;color:#f6f7fb;font:16px system-ui;line-height:1.6}.wrap{max-width:960px;margin:auto;padding:70px 24px}.badge{color:#f5cf62;letter-spacing:.14em;font-size:12px;font-weight:800}h1{font-size:64px;line-height:1;margin:18px 0}p{color:#aab3c7}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:32px 0}.card{border:1px solid #27304a;border-radius:18px;padding:20px;background:#11172a}.card strong{display:block;font-size:36px;color:#f5cf62}.tags span{display:inline-block;border:1px solid #303a57;border-radius:999px;padding:7px 11px;margin:4px}.proof{border-left:3px solid #f5cf62;padding:8px 16px;margin:14px 0}@media(max-width:700px){h1{font-size:42px}.grid{grid-template-columns:1fr 1fr}}</style></head><body><main class="wrap"><span class="badge">ATLAS PASSPORT · PRIVATE EXPORT</span><h1>${escapeHTML(p.name)}</h1><p>${escapeHTML(p.major)} at ${escapeHTML(p.university)}${p.gradYear?` · Class of ${p.gradYear}`:''}<br>Target: ${escapeHTML(p.goal)}</p><section class="grid"><div class="card"><strong>${m.pulse}</strong>Atlas Pulse</div><div class="card"><strong>${m.balance}</strong>Semester Balance</div><div class="card"><strong>${m.career}</strong>Career Readiness</div><div class="card"><strong>${evidence.length}</strong>Evidence Items</div></section><h2>Skills</h2><div class="tags">${(p.skills||[]).map(s=>`<span>${escapeHTML(s)}</span>`).join('')}</div><h2>Evidence</h2>${evidence.map(e=>`<div class="proof"><b>${escapeHTML(e.skill)}</b><br>${escapeHTML(e.detail)}<small> · ${escapeHTML(e.type)}</small></div>`).join('')||'<p>No evidence exported yet.</p>'}<p>Generated by AtlasIQ. This snapshot contains only information selected and stored by the user.</p></main></body></html>`;
    downloadFile(`${safeFilename(p.name)}-atlas-passport.html`,html,'text/html');
  };

  // ---------- Atlas Pulse + seven-day Mission Sprint ----------
  function injectPulseUI(){
    if($('#atlasPulsePanel'))return;
    const panel=document.createElement('div');panel.id='atlasPulsePanel';panel.className='pulse-sprint-grid';panel.innerHTML=`
      <article class="panel-card pulse-card"><div class="card-head"><div><span class="kicker">NEW · CROSS-WORKSPACE INTELLIGENCE</span><h4>Atlas Pulse</h4></div><span class="engine-chip">Live</span></div><div class="pulse-body"><div class="pulse-ring" id="pulseRing"><div><strong id="pulseScore">0</strong><span>MOMENTUM</span></div></div><div><h3 id="pulseVerdict">Build your first signal</h3><p id="pulseNarrative">Atlas Pulse combines planning, career evidence, decision follow-through, and analytics activity into one transparent momentum score.</p><div id="pulseFactors" class="pulse-factors"></div></div></div></article>
      <article class="panel-card sprint-card"><div class="card-head"><div><span class="kicker">NEW · ACTION ENGINE</span><h4>Seven-Day Mission Sprint</h4></div><button id="regenerateSprint" class="text-btn">Regenerate</button></div><p class="microcopy">Amy turns your weakest signals into a realistic one-week execution plan.</p><div id="missionSprint" class="mission-sprint"></div></article>`;
    $('#campus-overview .overview-grid').insertAdjacentElement('afterend',panel);
    $('#regenerateSprint').onclick=()=>{storage.remove('atlasiq_mission_sprint');renderMissionSprint(true);};
  }
  function computePulse(){
    const profile=getProfile(), semester=+$('#metricBalance').textContent||60, career=+$('#metricCareer').textContent||45;
    const evidence=getEvidence(), journal=getJournal(), reviewed=journal.filter(e=>Number.isFinite(e.outcome));
    const identity=profile?100:35, proof=clamp(25+evidence.length*12,25,100), follow=journal.length?clamp(45+reviewed.length/Math.max(1,journal.length)*55,35,100):35;
    const data=storage.get('atlasiq_data_runs',0)>0?clamp(45+storage.get('atlasiq_data_runs',0)*10,45,100):35;
    const score=Math.round(identity*.12+semester*.26+career*.24+proof*.18+follow*.10+data*.10);
    return {score,factors:[['Plan',semester],['Career',career],['Proof',proof],['Follow-through',follow],['Data practice',data]]};
  }
  function defaultMissionTasks(){
    const profile=getProfile(),evidence=getEvidence(),journal=getJournal(),opps=storage.get('atlasiq_opportunities',[]),runs=storage.get('atlasiq_data_runs',0);
    const tasks=[];
    if(!profile)tasks.push('Create a private profile with your major, university, target role, and current skills.');
    if(evidence.length<3)tasks.push('Add one concrete ProofGraph entry with a measurable outcome or inspectable artifact.');
    tasks.push(`Compare a second semester scenario and explain why it is stronger than your current plan.`);
    if(!opps.length)tasks.push('Paste one real internship description into Opportunity Radar and save the analysis.');
    if(!journal.length)tasks.push('Log one important choice in Decision Memory with a review date.');
    if(!runs)tasks.push('Analyze one CSV in AtlasIQ Studio and export the findings report.');
    tasks.push('Practice a 60-second project story: problem, data, method, tradeoff, result, next step.');
    tasks.push('Ask Amy to identify your single highest-impact next action.');
    return tasks.slice(0,7).map((text,i)=>({id:`day${i+1}`,day:i+1,text,done:false}));
  }
  function renderMissionSprint(force=false){
    let tasks=force?null:storage.get('atlasiq_mission_sprint',null);if(!tasks){tasks=defaultMissionTasks();storage.set('atlasiq_mission_sprint',tasks);}
    $('#missionSprint').innerHTML=tasks.map(task=>`<label class="mission-item ${task.done?'done':''}"><input type="checkbox" data-mission-id="${task.id}" ${task.done?'checked':''}><span>DAY ${task.day}</span><p>${escapeHTML(task.text)}</p></label>`).join('');
    $$('[data-mission-id]').forEach(input=>input.onchange=()=>{const next=storage.get('atlasiq_mission_sprint',tasks);const task=next.find(t=>t.id===input.dataset.missionId);if(task)task.done=input.checked;storage.set('atlasiq_mission_sprint',next);renderMissionSprint();updatePulseAndSprint(false);});
  }
  function updatePulseAndSprint(renderSprint=true){
    if(!$('#atlasPulsePanel'))return;
    const pulse=computePulse();$('#pulseScore').textContent=pulse.score;$('#pulseRing').style.setProperty('--score',pulse.score);
    $('#pulseVerdict').textContent=pulse.score>=85?'Exceptional momentum':pulse.score>=72?'Strong forward motion':pulse.score>=58?'Promising, but uneven':'Build the next proof signal';
    const weakest=[...pulse.factors].sort((a,b)=>a[1]-b[1])[0];
    $('#pulseNarrative').textContent=`Your strongest systems are visible above. The current leverage point is ${weakest[0].toLowerCase()} (${Math.round(weakest[1])}/100), so AtlasIQ prioritizes one concrete action there instead of giving generic advice.`;
    $('#pulseFactors').innerHTML=pulse.factors.map(([name,value])=>`<div><span>${name}</span><i><b style="width:${value}%"></b></i><em>${Math.round(value)}</em></div>`).join('');
    if(renderSprint)renderMissionSprint();
  }

  // Count real data practice when a dataset is loaded.
  const originalSetData=setData;
  setData=function(rows,name='Uploaded Dataset'){
    originalSetData(rows,name);
    storage.set('atlasiq_data_runs',storage.get('atlasiq_data_runs',0)+1);
    updatePulseAndSprint();
    if(typeof amyContextRefresh==='function')amyContextRefresh();
  };

  // ---------- Amy — Atlas AI ----------
  function injectAmy(){
    if($('#amyLauncher'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <button id="amyLauncher" class="amy-launcher" aria-label="Open Amy, Atlas AI"><span class="amy-spark">A</span><div><b>Amy</b><small>Atlas AI</small></div><i></i></button>
      <aside id="amyPanel" class="amy-panel glass" aria-hidden="true">
        <header><div class="amy-avatar">A</div><div><b>Amy</b><span>Atlas AI · on-device copilot</span></div><div class="amy-live"><i></i>LOCAL</div><button id="amyClose" aria-label="Close Amy">×</button></header>
        <div class="amy-context" id="amyContext"></div>
        <div class="amy-messages" id="amyMessages" aria-live="polite"></div>
        <div class="amy-chips"><button data-amy-prompt="What should I do next?">Next action</button><button data-amy-prompt="Explain my semester">My semester</button><button data-amy-prompt="Build my 7 day sprint">7-day sprint</button><button data-amy-prompt="Analyze my current data">My data</button></div>
        <form id="amyForm"><button id="amyMic" type="button" aria-label="Speak to Amy">◉</button><input id="amyInput" autocomplete="off" placeholder="Ask Amy anything about AtlasIQ…"><button type="submit">Send</button></form>
        <footer>Amy reasons from your local AtlasIQ state. No message is transmitted by this static release.</footer>
      </aside>`);
    $('#amyLauncher').onclick=()=>toggleAmy(true);$('#amyClose').onclick=()=>toggleAmy(false);
    $('#amyForm').onsubmit=event=>{event.preventDefault();const input=$('#amyInput'),q=input.value.trim();if(!q)return;input.value='';askAmy(q);};
    $$('[data-amy-prompt]').forEach(button=>button.onclick=()=>askAmy(button.dataset.amyPrompt));
    setupAmyMic();renderAmyHistory();amyContextRefresh();
  }
  function toggleAmy(open){
    $('#amyPanel').classList.toggle('open',open);$('#amyPanel').setAttribute('aria-hidden',String(!open));
    if(open){amyContextRefresh();setTimeout(()=>$('#amyInput').focus(),150);}
  }
  function amyHistory(){return storage.get('atlasiq_amy_history',[]);}
  function saveAmyHistory(history){storage.set('atlasiq_amy_history',history.slice(-30));}
  function addAmyMessage(role,text,actions=[]){
    const history=amyHistory();history.push({role,text,actions,time:new Date().toISOString()});saveAmyHistory(history);renderAmyHistory();
  }
  function renderAmyHistory(){
    const messages=$('#amyMessages');if(!messages)return;let history=amyHistory();
    if(!history.length){const p=getProfile();history=[{role:'ai',text:`Hi${p?` ${p.name.split(' ')[0]}`:''}—I’m Amy, your Atlas AI copilot. I can explain your semester, inspect career gaps, analyze the active dataset, build a seven-day sprint, navigate AtlasIQ, and help you decide what to do next. Everything I use stays on this device.`,actions:[]}];saveAmyHistory(history);}
    messages.innerHTML=history.map((m,index)=>`<div class="amy-message ${m.role}"><span>${m.role==='ai'?'A':'YOU'}</span><p>${escapeHTML(m.text)}</p>${(m.actions||[]).length?`<div>${m.actions.map(a=>`<button data-amy-action="${escapeHTML(a.command)}" data-index="${index}">${escapeHTML(a.label)}</button>`).join('')}</div>`:''}</div>`).join('');
    $$('[data-amy-action]',messages).forEach(button=>button.onclick=()=>runAmyAction(button.dataset.amyAction));messages.scrollTop=messages.scrollHeight;
  }
  function amyContextRefresh(){
    const holder=$('#amyContext');if(!holder)return;const p=getProfile(),pulse=computePulse();
    holder.innerHTML=`<span>${escapeHTML(p?.major||'Guest workspace')}</span><span>Pulse ${pulse.score}</span><span>${dataState.profile?escapeHTML(dataState.name):'No active data'}</span>`;
  }
  function navigateCampus(tab){document.querySelector('#campus').scrollIntoView({behavior:'smooth'});activateCampus(tab);}
  function runAmyAction(command){
    if(command.startsWith('campus:'))navigateCampus(command.split(':')[1]);
    else if(command.startsWith('studio:')){document.querySelector('#studio').scrollIntoView({behavior:'smooth'});activateStudio(command.split(':')[1]);}
    else if(command==='profile')openProfileManager();
    else if(command==='proof'){document.querySelector('#proofgraph').scrollIntoView({behavior:'smooth'});}
    else if(command==='sprint'){document.querySelector('#campus').scrollIntoView({behavior:'smooth'});activateCampus('overview');$('#atlasPulsePanel').scrollIntoView({behavior:'smooth',block:'center'});}
  }
  function sprintText(){return storage.get('atlasiq_mission_sprint',defaultMissionTasks()).map(t=>`${t.done?'✓':'○'} Day ${t.day}: ${t.text}`).join('\n');}
  function dueDecision(){return getJournal().filter(e=>!Number.isFinite(e.outcome)&&e.reviewDate&&e.reviewDate<=todayISO()).sort((a,b)=>a.reviewDate.localeCompare(b.reviewDate))[0];}
  function amyAnswer(question){
    const q=question.toLowerCase(),p=getProfile(),pulse=computePulse(),evidence=getEvidence(),journal=getJournal(),due=dueDecision();
    if(/hello|hey|hi amy|who are you/.test(q))return {text:`I’m Amy, AtlasIQ’s on-device decision copilot. I use your active profile, semester model, ProofGraph, Decision Memory, Opportunity Radar, and current dataset to give context-aware guidance without sending your information to a server.`};
    if(/create.*profile|profile|account/.test(q)&&!/proof/.test(q))return {text:p?`Your active local profile is ${p.name}: ${p.major} at ${p.university}, targeting ${p.goal}. You can edit it or create another isolated workspace.`:'A profile will isolate your plans, datasets, evidence, and Amy history on this device. Guest mode is temporary.',actions:[{label:p?'Edit profile':'Create profile',command:'profile'}]};
    if(/next|priority|what should i do|recommend/.test(q)){
      if(due)return {text:`Your clearest next action is to review “${due.decision}.” Its review date has arrived, and recording the real outcome will improve your personal calibration loop.`,actions:[{label:'Review decision',command:'campus:journal'}]};
      const weakest=[...pulse.factors].sort((a,b)=>a[1]-b[1])[0];
      const map={'Proof':'Add one quantified ProofGraph artifact.','Follow-through':'Log a decision and schedule an outcome review.','Data practice':'Analyze a CSV and export the findings.','Career':'Run a real internship through Opportunity Radar.','Plan':'Compare two semester scenarios.'};
      return {text:`Your Atlas Pulse is ${pulse.score}/100. The weakest current signal is ${weakest[0]} at ${Math.round(weakest[1])}/100. My highest-impact recommendation: ${map[weakest[0]]}`,actions:[{label:'Open the right tool',command:weakest[0]==='Proof'?'proof':weakest[0]==='Follow-through'?'campus:journal':weakest[0]==='Data practice'?'studio:data':weakest[0]==='Career'?'campus:opportunity':'campus:semester'}]};
    }
    if(/semester|course|workload|credits|burnout/.test(q)){
      const score=+$('#semesterScore').textContent||0,courses=selectedCourses.map(c=>c.id).join(', ')||'none',hours=$('#metricHours').textContent;
      return {text:`Your current semester model scores ${score}/100 with ${courses}. AtlasIQ estimates about ${hours} committed hours per week. ${$('#semesterExplain').textContent}`,actions:[{label:'Open Semester Simulator',command:'campus:semester'},{label:'Test a ripple',command:'campus:ripple'}]};
    }
    if(/career|internship|job|resume|opportunity/.test(q)){
      const score=+$('#careerScore').textContent||0,role=$('#roleSelect').value,last=storage.get('atlasiq_last_opportunity',null);
      if(last)return {text:`For ${last.name}, your evidence-aware fit was ${last.overall}/100. The highest-value missing signals are ${last.missing.slice(0,3).join(', ')||'not major technical gaps; focus on stronger proof and impact stories'}.`,actions:[{label:'Open Opportunity Radar',command:'campus:opportunity'}]};
      return {text:`Your current modeled readiness for ${role} is ${score}/100. Paste a real posting into Opportunity Radar so I can compare its exact signals with your profile and ProofGraph evidence.`,actions:[{label:'Analyze an opportunity',command:'campus:opportunity'}]};
    }
    if(/proof|skill|evidence|portfolio/.test(q))return {text:`Your ProofGraph contains ${evidence.length} user-added evidence item${evidence.length===1?'':'s'} across ${new Set(evidence.map(e=>normalizeSkill(e.skill))).size} verified skill area${new Set(evidence.map(e=>normalizeSkill(e.skill))).size===1?'':'s'}. ${evidence.length<3?'Add a measurable result, public artifact, or specific responsibility to strengthen recruiter confidence.':'Your next improvement is to connect each major target-role skill to at least one inspectable artifact.'}`,actions:[{label:'Open ProofGraph',command:'proof'}]};
    if(/data|dataset|csv|model|automl|correlation|outlier|missing/.test(q)){
      if(!dataState.profile)return {text:'No dataset is active. Load a sample or upload a CSV in AtlasIQ Studio; I can then explain quality, missing values, outliers, correlations, preprocessing, the model arena, and what-if results.',actions:[{label:'Open Data Studio',command:'studio:data'}]};
      const model=dataState.model?` The current AutoML leader is ${dataState.model.models[0].name} at ${(dataState.model.models[0].score*100).toFixed(1)}% ${dataState.model.ds.numericTarget?'R²':'accuracy'}.`:'';
      return {text:`${generateSummary()}${model}`,actions:[{label:'View data profile',command:'studio:data'},{label:'Open AutoML',command:'studio:automl'}]};
    }
    if(/sprint|seven|7 day|week plan|mission/.test(q))return {text:`Here is your current seven-day mission sprint:\n${sprintText()}`,actions:[{label:'Open Mission Sprint',command:'sprint'}]};
    if(/decision|journal|memory|calibrat/.test(q))return {text:`You have logged ${journal.length} decision${journal.length===1?'':'s'} and reviewed ${journal.filter(e=>Number.isFinite(e.outcome)).length}. ${calibrationScore(journal)!=null?`Your calibration score is ${calibrationScore(journal)}/100.`:'Record at least one real outcome to calculate personal calibration.'}`,actions:[{label:'Open Decision Memory',command:'campus:journal'}]};
    if(/privacy|local|safe|upload|stored/.test(q))return {text:'This GitHub Pages release stores profiles and planning state in localStorage, and saved datasets in IndexedDB. CSV analysis runs in the browser. Nothing is transmitted by Amy or AtlasIQ unless you explicitly open an external link such as Google Maps.'};
    if(/purdue|campus|route|building|walk/.test(q))return {text:`Campus Navigator supports the Purdue Campus Pack plus a custom campus builder for any university. It models walking time, weather or crowd penalties, and transition buffer; it does not replace official accessibility or transit guidance.`,actions:[{label:'Open Campus Navigator',command:'campus:navigator'}]};
    if(/who built|founder|niveditha/.test(q))return {text:'AtlasIQ was designed and engineered by Niveditha Mallojhala, a Purdue Data Science student. Visitor workspaces are separate from her founder profile, so anyone can use the platform privately.'};
    if(/help|what can you do|commands/.test(q))return {text:'I can explain your semester, find your next action, analyze career gaps, interpret the active dataset, create a seven-day sprint, summarize ProofGraph, review Decision Memory, explain privacy, and navigate to any AtlasIQ tool.'};
    return {text:`I can help most when your question connects to a decision or active AtlasIQ evidence. Try asking “What should I do next?”, “Explain my semester,” “Analyze my data,” “How strong is my internship fit?”, or “Build my 7-day sprint.”`};
  }
  function askAmy(question){
    addAmyMessage('user',question);const answer=amyAnswer(question);setTimeout(()=>addAmyMessage('ai',answer.text,answer.actions||[]),180);
  }
  function setupAmyMic(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition,button=$('#amyMic');
    if(!SpeechRecognition){button.style.display='none';return;}
    const recognition=new SpeechRecognition();recognition.lang='en-US';recognition.interimResults=false;
    button.onclick=()=>{button.classList.add('listening');recognition.start();};
    recognition.onresult=e=>{$('#amyInput').value=e.results[0][0].transcript;button.classList.remove('listening');};
    recognition.onerror=recognition.onend=()=>button.classList.remove('listening');
  }
  commandItems.push(['Amy AI','#home','Open your on-device decision copilot']);
  const originalRunCommand=runCommand;
  runCommand=function(name){if(name==='Amy AI'){closePalette();toggleAmy(true);return;}originalRunCommand(name);};
  addEventListener('keydown',event=>{if(event.shiftKey&&event.key.toLowerCase()==='a'){event.preventDefault();toggleAmy(!$('#amyPanel').classList.contains('open'));}});

  // ---------- Full workspace refresh ----------
  function refreshWorkspace(){
    updateIdentityUI();refreshCoursesForProfile();rebuildProofGraph();renderJournal();populateCampusPlaces();updatePulseAndSprint();renderProfileList();renderAmyHistory();amyContextRefresh();analyzeCareer();
  }

  // Override reset so it only resets the active profile.
  $('#resetDemo').onclick=()=>{
    if(!confirm('Reset planning, evidence, decisions, opportunities, and Amy history for only this active local workspace?'))return;
    ['atlasiq_courses','atlasiq_scenario_A','atlasiq_scenario_B','atlasiq_scenario_C','atlasiq_custom_courses','atlasiq_semester_prefs','atlasiq_evidence','atlasiq_opportunities','atlasiq_last_opportunity','atlasiq_decision_journal','atlasiq_mission_sprint','atlasiq_amy_history','atlasiq_data_runs','atlasiq_custom_buildings'].forEach(key=>storage.remove(key));
    refreshWorkspace();toast('Active local workspace reset');
  };

  // Modal close behavior for all enhancement modals.
  $$('.modal .modal-close').forEach(button=>{if(button.id==='profileClose')return;button.addEventListener('click',()=>closeModal(button.closest('.modal')));});

  injectPulseUI();injectAmy();refreshWorkspace();
  if(!getProfile()&&!rawGet('atlasiq_guest_mode',false))setTimeout(openProfileManager,700);
})();
