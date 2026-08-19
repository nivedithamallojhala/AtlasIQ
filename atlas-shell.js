'use strict';

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const frame = $('#atlasWorkspace');
  const publicCache = {};
  let priorityMode = 'overview';
  let toastTimer;

  const toast = (message) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };

  const formatNumber = (value, digits = 0) => new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);

  const csvEscape = (value) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  const toCSV = (rows) => {
    if (!rows?.length) return '';
    const keys = Object.keys(rows[0]);
    return [keys.join(','), ...rows.map(row => keys.map(k => csvEscape(row[k])).join(','))].join('\n');
  };

  // ---------- Theme ----------
  const storedTheme = localStorage.getItem('atlasiq_shell_theme');
  if (storedTheme === 'light') document.documentElement.dataset.theme = 'light';
  $('#themeToggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    if (next === 'dark') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = 'light';
    localStorage.setItem('atlasiq_shell_theme', next);
    injectWorkspaceSkin();
  });

  // ---------- Reveal motion ----------
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  $$('.reveal').forEach(el => observer.observe(el));

  // ---------- Modals / guide ----------
  const openModal = (id) => {
    const modal = $(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };
  const closeModals = () => {
    $$('.modal.open').forEach(modal => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    });
  };
  $('#guideButton')?.addEventListener('click', () => openModal('#guideModal'));
  $('#openMethodology')?.addEventListener('click', () => openModal('#methodModalShell'));
  $('#openSources')?.addEventListener('click', () => openModal('#sourcesModal'));
  $('[data-close-modal]')?.addEventListener?.('click', closeModals);
  $$('[data-close-modal]').forEach(el => el.addEventListener('click', closeModals));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModals();
    if (event.key === '?' && !/input|textarea/i.test(document.activeElement?.tagName || '')) openModal('#guideModal');
  });
  $('#guideToMethod')?.addEventListener('click', () => {
    closeModals();
    setTimeout(() => openModal('#methodModalShell'), 30);
  });

  // ---------- Workspace shell + UI injection ----------
  const getFrameDocument = () => {
    try { return frame?.contentDocument || frame?.contentWindow?.document || null; }
    catch { return null; }
  };

  function injectWorkspaceSkin() {
    const doc = getFrameDocument();
    if (!doc?.head) return;
    let style = doc.getElementById('atlas-shell-injected-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'atlas-shell-injected-style';
      doc.head.appendChild(style);
    }
    const light = document.documentElement.dataset.theme === 'light';
    style.textContent = `
      html{scroll-behavior:smooth!important;scroll-padding-top:74px!important}
      body{background:${light ? '#eff6f7' : '#071018'}!important}
      #particleCanvas,.noise{opacity:.3!important}
      #home,#platform,#about,.resume-section,body>footer{display:none!important}
      .topbar{top:10px!important;left:12px!important;right:12px!important;width:auto!important;border-radius:18px!important;background:${light ? 'rgba(247,252,252,.92)' : 'rgba(7,16,24,.9)'}!important;box-shadow:0 16px 45px rgba(0,0,0,.18)!important}
      main{padding-top:58px!important}
      #campus,#studio,#proofgraph{padding-top:38px!important;padding-bottom:62px!important}
      .section-heading{max-width:1000px!important;margin-left:auto!important;margin-right:auto!important}
      .section-heading h2{letter-spacing:-.035em!important}
      .workspace,.studio-shell,.proof-layout{border-radius:26px!important;border-color:rgba(104,228,231,.18)!important;box-shadow:0 24px 70px rgba(0,0,0,.2)!important;overflow:hidden!important}
      .workspace-nav{background:${light ? 'rgba(238,247,248,.8)' : 'rgba(6,19,29,.72)'}!important;border-right:1px solid rgba(104,228,231,.1)!important}
      .workspace-tab,.studio-tab{border-radius:12px!important;transition:.2s!important}
      .workspace-tab.active,.studio-tab.active{background:linear-gradient(90deg,rgba(104,228,231,.13),rgba(104,228,231,.04))!important;color:${light ? '#12313a' : '#ecfbfc'}!important}
      .metric-card,.panel-card,.control-card,.viz-card,.score-hero,.explain-box,.chat-card,.map-card{border-radius:18px!important;border-color:rgba(104,228,231,.12)!important}
      .button.primary{background:linear-gradient(135deg,#68e4e7,#43cfd5)!important;color:#061318!important;box-shadow:0 10px 25px rgba(67,207,213,.16)!important}
      .engine-chip,.confidence,.kicker{letter-spacing:.08em!important}
      canvas{max-width:100%!important}
      @media(max-width:800px){.topbar nav{display:none!important}.workspace{border-radius:18px!important}.workspace-nav{position:sticky!important;top:64px!important;z-index:5!important;display:flex!important;overflow-x:auto!important}.workspace-tab{min-width:max-content!important}.workspace-status{display:none!important}}
    `;
    doc.documentElement.dataset.embeddedAtlas = 'true';
  }

  frame?.addEventListener('load', () => {
    injectWorkspaceSkin();
    setTimeout(() => {
      const doc = getFrameDocument();
      doc?.querySelector('#campus')?.scrollIntoView({ block: 'start' });
      syncNexus(false);
    }, 300);
  });

  $('#refreshWorkspace')?.addEventListener('click', () => {
    if (!frame) return;
    frame.contentWindow.location.reload();
    toast('Workspace refreshed');
  });

  $('#fullscreenWorkspace')?.addEventListener('click', async () => {
    try {
      if (frame?.requestFullscreen) await frame.requestFullscreen();
      else window.open('AtlasIQ_Single_File.html', '_blank', 'noopener');
    } catch {
      window.open('AtlasIQ_Single_File.html', '_blank', 'noopener');
    }
  });

  function jumpWorkspace(mode = 'overview') {
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const doc = getFrameDocument();
      if (!doc) return toast('Workspace is still loading');
      if (mode === 'studio') {
        doc.querySelector('#studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        doc.querySelector('[data-studio-tab="data"]')?.click();
        return;
      }
      if (mode === 'proofgraph') {
        doc.querySelector('#proofgraph')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const button = doc.querySelector(`[data-campus-tab="${mode}"]`);
      if (button) button.click();
      doc.querySelector('#campus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 550);
  }

  $$('[data-guide-jump]').forEach(card => card.addEventListener('click', () => jumpWorkspace(card.dataset.guideJump)));
  $$('[data-modal-jump]').forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.modalJump;
    closeModals();
    setTimeout(() => jumpWorkspace(target), 80);
  }));

  // ---------- Public Data Observatory ----------
  const setPublicCard = (prefix, value, freshness, meta) => {
    $(`#${prefix}Value`).textContent = value;
    $(`#${prefix}Freshness`).textContent = freshness;
    $(`#${prefix}Meta`).textContent = meta;
  };

  async function loadWorldBank() {
    const endpoint = 'https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.PCAP.CD?format=json&per_page=25';
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const rows = (json?.[1] || []).filter(row => Number.isFinite(Number(row.value)));
      if (!rows.length) throw new Error('No data');
      const latest = rows[0];
      setPublicCard('gdp', `$${formatNumber(Number(latest.value) / 1000, 1)}K`, `${latest.date} DATA`, `Latest non-null World Bank value for the U.S. · ${latest.indicator?.value || 'GDP per capita'}.`);
      publicCache.gdp = {
        filename: 'world-bank-us-gdp-per-capita.csv',
        rows: rows.slice().reverse().map(r => ({ year: r.date, gdp_per_capita_usd: r.value }))
      };
      return true;
    } catch (error) {
      setPublicCard('gdp', '—', 'SOURCE READY', 'World Bank source available from the Source button; live fetch was blocked or unavailable in this browser.');
      return false;
    }
  }

  async function loadUSGS() {
    const endpoint = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const features = json?.features || [];
      setPublicCard('quake', formatNumber(features.length), 'LIVE / DAILY', `Feed generated ${new Date(json.metadata.generated).toLocaleString()} · ${json.metadata.title || 'USGS earthquake feed'}.`);
      publicCache.quake = {
        filename: 'usgs-m2-5-earthquakes-past-day.csv',
        rows: features.map(f => ({
          time: new Date(f.properties.time).toISOString(),
          magnitude: f.properties.mag,
          place: f.properties.place,
          longitude: f.geometry?.coordinates?.[0],
          latitude: f.geometry?.coordinates?.[1],
          depth_km: f.geometry?.coordinates?.[2],
          felt_reports: f.properties.felt ?? '',
          significance: f.properties.sig ?? ''
        }))
      };
      return true;
    } catch (error) {
      setPublicCard('quake', '—', 'SOURCE READY', 'USGS source available from the Source button; live fetch was blocked or unavailable in this browser.');
      return false;
    }
  }

  async function loadBLS() {
    const endpoint = 'https://api.bls.gov/publicAPI/v1/timeseries/data/LNS14000000';
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const series = json?.Results?.series?.[0]?.data || [];
      const rows = series.filter(r => /^M\d{2}$/.test(r.period || '') && Number.isFinite(Number(r.value)));
      if (!rows.length) throw new Error('No data');
      const latest = rows[0];
      setPublicCard('labor', `${Number(latest.value).toFixed(1)}%`, `${latest.periodName?.toUpperCase() || latest.period} ${latest.year}`, 'BLS national civilian unemployment rate series LNS14000000.');
      publicCache.labor = {
        filename: 'bls-us-unemployment-rate.csv',
        rows: rows.slice().reverse().map(r => ({ year: r.year, period: r.periodName, unemployment_rate_percent: r.value }))
      };
      return true;
    } catch (error) {
      setPublicCard('labor', '—', 'SOURCE READY', 'BLS source available from the Source button; live fetch was blocked or unavailable in this browser.');
      return false;
    }
  }

  async function refreshPublicData() {
    const results = await Promise.all([loadWorldBank(), loadUSGS(), loadBLS()]);
    const live = results.filter(Boolean).length;
    $('#publicStatus').textContent = `${live} of ${results.length} public sources live in this browser`;
  }
  refreshPublicData();

  async function sendPublicDataToStudio(kind) {
    const dataset = publicCache[kind];
    if (!dataset?.rows?.length) return toast('That public source is not live in this browser yet');
    jumpWorkspace('studio');
    setTimeout(() => {
      const doc = getFrameDocument();
      const input = doc?.querySelector('#csvInput');
      if (!input) return toast('Studio is still loading');
      try {
        const file = new File([toCSV(dataset.rows)], dataset.filename, { type: 'text/csv' });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        toast('Public dataset sent to AtlasIQ Studio');
      } catch (error) {
        toast('Studio import was blocked; use the source or load your own CSV');
      }
    }, 850);
  }
  $$('[data-load-public]').forEach(button => button.addEventListener('click', () => sendPublicDataToStudio(button.dataset.loadPublic)));

  // ---------- Atlas Nexus ----------
  const parseNum = (text) => {
    const match = String(text ?? '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const parseStored = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  };
  const countSignals = (activeId, words) => {
    let total = 0;
    Object.keys(localStorage).forEach(key => {
      if (activeId && !key.includes(activeId)) return;
      if (!words.some(word => key.toLowerCase().includes(word))) return;
      const value = parseStored(key);
      if (Array.isArray(value)) total += value.length;
      else if (value && typeof value === 'object') total += Object.keys(value).length || 1;
      else if (value != null) total += 1;
    });
    return total;
  };

  function buildPriority({ profile, balance, career, route, evidence, decisions, dataQuality }) {
    if (!profile) return {
      mode: 'overview', title: 'Create your private decision workspace.',
      body: 'Nexus needs an active local profile to connect your plans, evidence, opportunities, and decisions.',
      steps: [['Create a profile','Keep plans and evidence isolated on this device.'],['Model one decision','Start with semester planning or an opportunity.'],['Return to Nexus','Sync the resulting signals into one priority view.']]
    };
    if (balance != null && balance < 72) return {
      mode: 'semester', title: 'Stabilize semester balance first.',
      body: `Your current semester balance is ${balance}. Nexus is prioritizing workload because it can constrain every other goal.`,
      steps: [['Compare scenarios','Save A/B/C plans instead of optimizing one schedule blindly.'],['Reduce the pressure point','Use factor bars and the workload horizon.'],['Run Ripple Engine','Check downstream effects before committing.']]
    };
    if ((career != null && career < 76) || evidence < 3) return {
      mode: 'opportunity', title: 'Turn skills into inspectable evidence.',
      body: `Career readiness is ${career ?? 'not yet scored'} and Nexus sees ${evidence} evidence signal${evidence === 1 ? '' : 's'}. The highest-leverage move is closing a proof gap.`,
      steps: [['Analyze a target role','Use Opportunity Radar on a real posting.'],['Add quantified proof','Connect the missing skill to a project or artifact.'],['Re-check readiness','Measure the change instead of guessing.']]
    };
    if (route != null && route < 80) return {
      mode: 'navigator', title: 'Fix a schedule-resilience bottleneck.',
      body: `Route resilience is ${route}. Nexus is prioritizing a transition risk that can undermine an otherwise strong plan.`,
      steps: [['Open Navigator','Test the tightest transition.'],['Model conditions','Compare clear, rain, snow, and peak traffic.'],['Adjust the plan','Change the risky transition before registration.']]
    };
    if (dataQuality != null && dataQuality < 75) return {
      mode: 'studio', title: 'Improve data quality before modeling.',
      body: `The active dataset quality score is ${dataQuality}. Nexus is routing you to preprocessing before additional model runs.`,
      steps: [['Inspect schema','Find missing or inconsistent columns.'],['Review outliers','Separate meaningful extremes from errors.'],['Rerun AutoML','Compare models after the data is cleaner.']]
    };
    if (decisions < 2) return {
      mode: 'journal', title: 'Close the feedback loop with Decision Memory.',
      body: 'Your current signals are healthy. The next step is calibration: record a prediction now so AtlasIQ can compare it with the real outcome later.',
      steps: [['Log a meaningful choice','Write the prediction and why you believe it.'],['Set a review date','Make the feedback loop concrete.'],['Record the outcome','Calibrate future assumptions with evidence.']]
    };
    return {
      mode: 'ripple', title: 'Stress-test the strongest next move.',
      body: 'Nexus sees a relatively balanced workspace. Use Ripple Engine to test an ambitious change before committing to it.',
      steps: [['Choose one change','Course, work, project, club, or sleep.'],['Run the counterfactual','Inspect both upside and downside.'],['Save the decision','Track the prediction in Decision Memory.']]
    };
  }

  function syncNexus(showToast = true) {
    const doc = getFrameDocument();
    const activeId = localStorage.getItem('atlasiq_active_profile');
    const profiles = parseStored('atlasiq_profiles') || [];
    const profile = profiles.find(p => p.id === activeId) || null;
    const balance = parseNum(doc?.querySelector('#metricBalance')?.textContent);
    const career = parseNum(doc?.querySelector('#metricCareer')?.textContent);
    const route = parseNum(doc?.querySelector('#metricRoute')?.textContent);
    const dataQuality = parseNum(doc?.querySelector('#qualityScore')?.textContent);
    const evidence = countSignals(activeId, ['evidence','proof']);
    const decisions = countSignals(activeId, ['journal','decision']);

    const components = [balance, career, route].filter(v => Number.isFinite(v));
    let score = components.length ? components.reduce((a,b) => a+b, 0) / components.length : 68;
    score += Math.min(8, evidence * 1.5) + Math.min(5, decisions);
    if (dataQuality != null) score = score * .85 + dataQuality * .15;
    score = Math.max(0, Math.min(100, Math.round(score)));

    $('#nexusScore').textContent = score;
    $('#nexusDial').style.setProperty('--p', score);
    $('#nexusBalance').textContent = balance ?? '—';
    $('#nexusCareer').textContent = career != null ? `${career}%` : '—';
    $('#nexusEvidence').textContent = evidence;
    $('#nexusDecisions').textContent = decisions;
    $('#nexusHeadline').textContent = profile ? `${profile.name?.split(' ')[0] || 'Your'} intelligence layer is connected.` : 'Your workspace is ready to connect.';
    $('#nexusSummary').textContent = profile
      ? `Nexus is combining live workspace metrics with ${evidence} evidence and ${decisions} decision signal${decisions === 1 ? '' : 's'} from this browser.`
      : 'Launch the workspace, create or open a profile, then sync Nexus to combine your live AtlasIQ signals.';

    const priority = buildPriority({ profile, balance, career, route, evidence, decisions, dataQuality });
    priorityMode = priority.mode;
    $('#priorityTitle').textContent = priority.title;
    $('#priorityBody').textContent = priority.body;
    $('#prioritySteps').innerHTML = priority.steps.map((step, index) => `<div class="priority-step"><i>${index + 1}</i><div><b>${step[0]}</b><small>${step[1]}</small></div></div>`).join('');
    if (showToast) toast('Atlas Nexus synced with the local workspace');
  }

  $('#syncNexus')?.addEventListener('click', () => syncNexus(true));
  $('#nexusOpenAction')?.addEventListener('click', () => jumpWorkspace(priorityMode));

  // Re-sync when this page becomes active again after a user works in the frame.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncNexus(false);
  });
})();
