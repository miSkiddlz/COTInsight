/* View navigation and compact research controls; data definitions stay unchanged. */
const SECTION_IDS = ['radar','dashboard','screener','watchlist'];
function showSection(id, options={}) {
  id=SECTION_IDS.includes(id)?id:'radar'; workspaceState.activeSection=id;
  document.body.dataset.section=id;
  for(const section of document.querySelectorAll('[data-workspace-section]')) section.hidden=section.id!==id;
  for(const link of document.querySelectorAll('.topbar nav a[href^="#"]')){
    const selected=link.getAttribute('href')===`#${id}`;
    link.classList.toggle('nav-active',selected);
    if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  if(options.push){const url=new URL(window.location.href);url.hash=id;window.history.pushState(null,'',url);}
  updateURL();
  if(options.scroll && typeof window.scrollTo==='function') window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  const afterLayout=window.requestAnimationFrame||((fn)=>setTimeout(fn,0));
  if(id==='dashboard'&&history&&activeMarket)afterLayout(()=>{Promise.resolve(drawChart()).catch(()=>notice('Chart could not be resized. Try opening Analysis again.'));renderComparison();drawRankHistory();});
}
function locationView(){const p=new URLSearchParams(window.location.search);return safeView({report:p.get('report')||'legacy_fut',market:p.get('market')||'088691',metric:p.get('metric'),range:p.get('range'),scale:p.get('scale'),group:p.get('group'),lookback:p.get('lookback'),asof:p.get('asof'),oi:p.get('oi')==='1',compare:(p.get('compare')||'').split(',')});}
function initializeNavigation(){
  const initial=window.location.hash.slice(1)|| (new URLSearchParams(window.location.search).has('market')?'dashboard':'radar');
  showSection(initial);
  for(const link of document.querySelectorAll('.topbar nav a[href^="#"], .skip-link'))link.addEventListener('click',event=>{event.preventDefault();showSection(link.getAttribute('href').slice(1),{push:true,scroll:true});});
  window.addEventListener('popstate',()=>{const section=window.location.hash.slice(1),view=locationView();if(view)applyView(view);showSection(section);});
  window.addEventListener('hashchange',()=>showSection(window.location.hash.slice(1)));
}
function renderComparePicker(){
  const options=Array.from(el('compareSelect').options),selected=options.filter(o=>o.selected),query=el('compareSearch').value.trim().toLocaleLowerCase();
  const old=el('compareCandidate').value;el('compareCandidate').replaceChildren();el('compareChips').replaceChildren();
  for(const option of options.filter(o=>!o.selected&&o.textContent.toLocaleLowerCase().includes(query))){const candidate=node('option','',option.textContent);candidate.value=option.value;el('compareCandidate').appendChild(candidate);}
  if(Array.from(el('compareCandidate').options).some(o=>o.value===old))el('compareCandidate').value=old;
  el('compareCandidate').disabled=selected.length>=3||!el('compareCandidate').options.length;el('compareAdd').disabled=el('compareCandidate').disabled;
  for(const option of selected){const chip=node('div','view-chip'),label=node('span','',option.textContent),remove=node('button','icon-button','×');remove.type='button';remove.setAttribute('aria-label',`Remove ${option.textContent} from comparison`);remove.addEventListener('click',()=>{option.selected=false;renderComparePicker();renderComparison();});chip.append(label,remove);el('compareChips').appendChild(chip);}
}
function renderHeatmap(rows,report){
  const heat=el('screenView').value==='heatmap';el('heatmapPanel').hidden=!heat;el('screenTable').parentElement.hidden=heat;
  el('heatmapHead').replaceChildren();el('heatmapBody').replaceChildren();if(!heat)return;
  const header=node('tr');for(const label of ['Market / CFTC code',...report.groups.map(g=>g.label)]){const cell=node('th','',label);cell.scope='col';header.appendChild(cell);}el('heatmapHead').appendChild(header);
  for(const row of rows.slice(workspaceState.page*20,(workspaceState.page+1)*20)){
    const tr=node('tr'),th=node('th'),name=node('button','market-link',row.market.name);th.scope='row';name.type='button';name.addEventListener('click',()=>openMarket(report.id,row.market.code));th.append(name,node('small','market-code',row.market.code));tr.appendChild(th);
    for(const group of report.groups){const score=row.snapshot.groups[group.id].windows[lookback()],td=node('td'),button=node('button','heatmap-cell',finite(score.percentile)?score.percentile.toFixed(1):'—');button.type='button';
      button.title=`${group.label} · ${lookback()}W percentile ${pct(score.percentile)} · ${score.n}/${score.required} required observations · ${row.snapshot.date}`;
      button.setAttribute('aria-label',`Open ${row.market.name}, ${group.label}, percentile ${pct(score.percentile)}`);
      if(finite(score.percentile)){const strength=.1+.4*Math.abs(score.percentile-50)/50;button.style.backgroundColor=score.percentile<50?`rgba(255,185,139,${strength})`:`rgba(193,151,255,${strength})`;}
      button.addEventListener('click',()=>{workspaceState.pendingGroup=group.id;openMarket(report.id,row.market.code);});td.appendChild(button);tr.appendChild(td);
    }el('heatmapBody').appendChild(tr);
  }
  if(!rows.length){const tr=node('tr'),td=node('td','empty-state','No markets match these filters.');td.colSpan=report.groups.length+1;tr.appendChild(td);el('heatmapBody').appendChild(tr);}
}
async function checkPublishedUpdate(){
  const button=el('refreshDataset');button.disabled=true;button.textContent='Checking published dataset…';
  try{const newest=await getJSON('./data/catalog.json');if(newest.schema_version!==2||!newest.generated_at)throw Error('Invalid catalog');
    const banner=el('updateBanner');banner.replaceChildren();banner.hidden=false;
    if(newest.generated_at!==catalog.generated_at){banner.append(node('span','','A newer published dataset is available. Your current analysis stays open until you reload.'));const reload=node('button','quiet-button','Load new dataset');reload.type='button';reload.addEventListener('click',()=>{updateURL();window.location.reload();});banner.appendChild(reload);}
    else banner.append(node('span','','You are using the current published dataset. This check does not trigger a new CFTC import.'));
  }catch{notice('Could not check for a published update. Your current workspace is still available.');}
  finally{button.disabled=false;button.textContent='Check published update ↻';}
}
function exportScreener(){
  let header,rows;
  if(el('screenView').value==='heatmap'){
    header=['report','code','market','date','window_weeks',...activeReport.groups.flatMap(g=>[`${g.id}_percentile`,`${g.id}_cot_index`,`${g.id}_observations`])];
    rows=workspaceState.filtered.map(r=>[activeReport.id,r.market.code,r.market.name,r.snapshot.date,lookback(),...activeReport.groups.flatMap(g=>{const w=r.snapshot.groups[g.id].windows[lookback()];return[w.percentile,w.cot_index,w.n];})]);
  }else{
    header=['report','code','market','category','date','net_share_pct','1w_delta_pp','4w_delta_pp',`${lookback()}w_percentile`,'cot_index','observations','open_interest'];
    rows=workspaceState.filtered.map(r=>[activeReport.id,r.market.code,r.market.name,focusID(),r.snapshot.date,r.value.net_share,r.value.changes['1'].share_pp,r.value.changes['4'].share_pp,r.window.percentile,r.window.cot_index,r.window.n,r.snapshot.open_interest]);
  }
  saveFile(`COTInsight-${el('screenView').value}-${activeReport.id}.csv`,csv([header,...rows]),'text/csv;charset=utf-8');
}
function initializeResearchControls(){
  el('screenView').value=workspaceState.storage.preferences?.screenView||'table';
  el('screenView').addEventListener('change',()=>{workspaceState.storage.preferences={screenView:el('screenView').value};persist();renderResearch();});
  el('compareSearch').addEventListener('input',renderComparePicker);
  el('compareAdd').addEventListener('click',()=>{const option=Array.from(el('compareSelect').options).find(o=>o.value===el('compareCandidate').value);if(!option||el('compareSelect').selectedOptions.length>=3)return;option.selected=true;el('compareSearch').value='';renderComparePicker();renderComparison();});
}
