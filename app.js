(() => {
  const STORAGE_KEY = 'mediccrm.dailyBudget.v1';
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('es-AR', {style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value || 0);
  const localDate = (date = new Date()) => { const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return y+'-'+m+'-'+d; };
  const parseDate = (value) => { const [y,m,d]=value.split('-').map(Number); return new Date(y,m-1,d); };
  const dateLabel = (value, options={day:'2-digit',month:'short'}) => new Intl.DateTimeFormat('es-AR',options).format(parseDate(value));
  let state = loadState();
  let chart;
  let toastTimer;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {goal:Number(saved.goal)||0, entries:Array.isArray(saved.entries)?saved.entries.filter(e=>e&&e.id&&Number.isFinite(Number(e.amount))):[]};
    } catch { return {goal:0,entries:[]}; }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function sum(entries) { return entries.reduce((total,e)=>total+Number(e.amount),0); }
  function showToast(message) {
    const el=$('toast'); el.textContent=message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
  }
  function render() {
    const today=localDate();
    const todayEntries=state.entries.filter(e=>e.date===today);
    const month= today.slice(0,7);
    const monthEntries=state.entries.filter(e=>e.date.startsWith(month));
    const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return localDate(d);});
    const last7Total=sum(state.entries.filter(e=>last7.includes(e.date)));
    const todaySum=sum(todayEntries);
    $('todayTotal').textContent=money(todaySum);
    $('todayCount').textContent=todayEntries.length+' '+(todayEntries.length===1?'registro':'registros');
    $('goalValue').textContent=state.goal?money(state.goal):'Sin definir';
    const percent=state.goal?Math.min(100,Math.round(todaySum/state.goal*100)):0;
    $('goalProgress').style.width=percent+'%';
    $('goalPercent').textContent=state.goal?percent+'% alcanzado':'Definí tu meta';
    $('goalRemaining').textContent=state.goal?(todaySum>=state.goal?'¡Objetivo cumplido!':'Faltan '+money(Math.max(0,state.goal-todaySum))):'';
    $('averageValue').textContent=money(last7Total/7);
    $('averageDays').textContent='Últimos 7 días';
    $('monthTotal').textContent=money(sum(monthEntries));
    $('monthCount').textContent=monthEntries.length+' '+(monthEntries.length===1?'registro':'registros');
    $('goalInput').value=state.goal||'';
    $('todayDate').textContent=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
    $('entryDate').value=today;
    renderHistory();
    renderChart();
  }
  function renderHistory() {
    const list=$('historyList');
    const entries=[...state.entries].sort((a,b)=>(b.date+b.createdAt).localeCompare(a.date+a.createdAt));
    const visible=entries.slice(0,5);
    if(!visible.length){list.innerHTML='<div class="empty-state"><span>＋</span><strong>Todo empieza con un registro</strong><p>Cuando guardes un ingreso, lo vas a ver acá.</p></div>';return;}
    list.innerHTML=visible.map(e=>`<div class="history-item"><div class="history-symbol">${e.category==='Consulta'?'✚':e.category==='Venta'?'◇':e.category==='Servicio'?'⌘':'＋'}</div><div class="history-info"><strong>${escapeHTML(e.note||e.category)}</strong><small>${escapeHTML(e.category)} · ${dateLabel(e.date,{day:'2-digit',month:'short',year:'numeric'})}</small></div><div class="history-amount">+${money(Number(e.amount))}</div><button class="delete-entry" data-delete="${e.id}" aria-label="Eliminar ingreso" title="Eliminar">×</button></div>`).join('');
  }
  function renderChart() {
    const days=Number($('chartRange').value)||7;
    const labels=[],values=[];
    for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=localDate(d);labels.push(dateLabel(key,{day:'2-digit',month:'short'}));values.push(sum(state.entries.filter(e=>e.date===key)));}
    $('chartTotal').textContent=money(values.reduce((a,b)=>a+b,0));
    const ctx=$('incomeChart').getContext('2d');
    if(chart)chart.destroy();
    if(typeof Chart==='undefined') { $('chartTotal').textContent+=' · Gráfico no disponible'; return; }
    const gradient=ctx.createLinearGradient(0,0,0,210);gradient.addColorStop(0,'rgba(33,198,165,.22)');gradient.addColorStop(1,'rgba(33,198,165,0)');
    chart=new Chart(ctx,{type:'line',data:{labels,datasets:[{data:values,borderColor:'#20b99c',backgroundColor:gradient,fill:true,tension:.38,borderWidth:2.5,pointRadius:values.map(v=>v?3:0),pointHoverRadius:5,pointBackgroundColor:'#20b99c'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{displayColors:false,backgroundColor:'#142b39',padding:10,callbacks:{label:(c)=>money(c.raw)}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#9ba6b4',font:{family:'DM Sans',size:9},maxRotation:0,autoSkip:true,maxTicksLimit:7}},y:{beginAtZero:true,grid:{color:'#f0f2f6',drawTicks:false},border:{display:false},ticks:{color:'#a0aab7',font:{family:'DM Sans',size:9},padding:9,maxTicksLimit:5,callback:(v)=>v>=1000000?'$'+(v/1000000).toFixed(1)+'M':v>=1000?'$'+(v/1000).toFixed(0)+'k':'$'+v}}}}});
  }
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  $('incomeForm').addEventListener('submit',(event)=>{
    event.preventDefault();
    const amount=Number($('amount').value),date=$('entryDate').value;
    if(!Number.isFinite(amount)||amount<=0){$('formFeedback').textContent='Ingresá un importe mayor a cero.';return;}
    if(!date){$('formFeedback').textContent='Elegí una fecha válida.';return;}
    state.entries.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),amount:Math.round(amount*100)/100,category:$('category').value,note:$('note').value.trim(),date,createdAt:new Date().toISOString()});
    saveState();$('incomeForm').reset();$('entryDate').value=localDate();$('formFeedback').textContent='Ingreso guardado correctamente.';render();$('amount').focus();showToast('¡Ingreso guardado! '+money(amount));
  });
  $('goalForm').addEventListener('submit',(event)=>{
    event.preventDefault();const goal=Number($('goalInput').value);
    if(!Number.isFinite(goal)||goal<=0){showToast('Ingresá un objetivo válido.');return;}
    state.goal=goal;saveState();render();showToast('Objetivo diario actualizado.');
  });
  $('chartRange').addEventListener('change',renderChart);
  $('historyList').addEventListener('click',(event)=>{
    const button=event.target.closest('[data-delete]');if(!button)return;
    const entry=state.entries.find(e=>e.id===button.dataset.delete);if(!entry)return;
    if(!confirm('¿Querés eliminar este ingreso de '+money(entry.amount)+'?'))return;
    state.entries=state.entries.filter(e=>e.id!==entry.id);saveState();render();showToast('Ingreso eliminado.');
  });
  $('viewAll').addEventListener('click',()=>{
    if(!state.entries.length){showToast('Todavía no hay ingresos registrados.');return;}
    const lines=[['Fecha','Categoría','Descripción','Importe'].join('\t'),...([...state.entries].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>[e.date,e.category,e.note||'',e.amount].join('\t')))].join('\n');
    const blob=new Blob([lines],{type:'text/tab-separated-values;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mediccrm-ingresos-'+localDate()+'.tsv';a.click();URL.revokeObjectURL(url);showToast('Historial exportado.');
  });
  $('menuToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',()=> $('sidebar').classList.remove('open')));
  $('todayChip').addEventListener('click',()=>{$('entryDate').value=localDate();$('amount').focus();});
  render();
})();