(() => {
  const STORAGE_KEY='mediccrm.dailyBudget.v1';
  const $=id=>document.getElementById(id);
  const money=value=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value||0);
  const localDate=(date=new Date())=>{const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return y+'-'+m+'-'+d;};
  const parseDate=value=>{const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d);};
  const dateLabel=(value,options={day:'2-digit',month:'short'})=>new Intl.DateTimeFormat('es-AR',options).format(parseDate(value));
  const expenseCategories=['Insumos','Alquiler','Servicios','Transporte','Impuestos','Sueldos','Otros'];
  let state=loadState(),chart,currentType='income',toastTimer;
  function loadState(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return{goal:Number(saved.goal)||0,entries:Array.isArray(saved.entries)?saved.entries.filter(e=>e&&e.id&&Number.isFinite(Number(e.amount))).map(e=>({...e,type:e.type==='expense'?'expense':'income'})):[]};}
    catch{return{goal:0,entries:[]};}
  }
  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function sum(entries){return entries.reduce((total,e)=>total+Number(e.amount),0);}
  function totals(entries){return{income:sum(entries.filter(e=>e.type==='income')),expense:sum(entries.filter(e=>e.type==='expense'))};}
  function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
  function render(){
    const today=localDate(),month=today.slice(0,7),todayEntries=state.entries.filter(e=>e.date===today),monthEntries=state.entries.filter(e=>e.date.startsWith(month));
    const day=totals(todayEntries),monthTotals=totals(monthEntries),balance=day.income-day.expense,monthBalance=monthTotals.income-monthTotals.expense;
    const allTimeTotals=totals(state.entries),totalBalance=allTimeTotals.income-allTimeTotals.expense;
    const totalBalanceCard=$('totalBalanceCard');totalBalanceCard.classList.toggle('balance-positive',totalBalance>0);totalBalanceCard.classList.toggle('balance-negative',totalBalance<0);totalBalanceCard.classList.toggle('balance-neutral',totalBalance===0);$('totalBalance').textContent=(totalBalance>0?'+':totalBalance<0?'−':'')+money(Math.abs(totalBalance));
    $('todayTotal').textContent=money(day.income);$('todayCount').textContent=todayEntries.filter(e=>e.type==='income').length+' ingresos';
    $('averageValue').textContent=money(day.expense);$('expenseCount').textContent=todayEntries.filter(e=>e.type==='expense').length+' gastos';
    $('monthTotal').textContent=money(monthBalance);$('monthCount').textContent=money(monthTotals.income)+' ingresos · '+money(monthTotals.expense)+' gastos';
    $('goalValue').textContent=state.goal?money(state.goal):'Sin definir';
    const percent=state.goal?Math.max(0,Math.min(100,Math.round(balance/state.goal*100))):0;
    $('goalProgress').style.width=percent+'%';$('goalPercent').textContent=state.goal?percent+'% alcanzado':'Definí tu meta';
    $('goalRemaining').textContent=state.goal?(balance>=state.goal?'¡Objetivo cumplido!':'Faltan '+money(Math.max(0,state.goal-balance))):'';
    $('todayDate').textContent=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
    $('entryDate').value=today;$('goalInput').value=state.goal||'';
    renderHistory();renderChart();
  }
  function renderHistory(){
    const list=$('historyList'),entries=[...state.entries].sort((a,b)=>(b.date+(b.createdAt||'')).localeCompare(a.date+(a.createdAt||''))).slice(0,5);
    if(!entries.length){list.innerHTML='<div class="empty-state"><span>＋</span><strong>Todo empieza con un registro</strong><p>Cuando registres un ingreso o gasto, lo vas a ver acá.</p></div>';return;}
    list.innerHTML=entries.map(e=>{const expense=e.type==='expense';return '<div class="history-item '+(expense?'expense-item':'')+'"><div class="history-symbol">'+(expense?'−':e.category==='Consulta'?'✚':e.category==='Venta'?'◇':e.category==='Servicio'?'⌘':'＋')+'</div><div class="history-info"><strong>'+escapeHTML(e.note||e.category)+'</strong><small>'+ (expense?'Gasto':'Ingreso')+' · '+escapeHTML(e.category)+' · '+dateLabel(e.date,{day:'2-digit',month:'short',year:'numeric'})+'</small></div><div class="history-amount">'+(expense?'−':'+')+money(Number(e.amount))+'</div><button class="delete-entry" data-delete="'+escapeHTML(e.id)+'" aria-label="Eliminar movimiento" title="Eliminar">×</button></div>';}).join('');
  }
  function renderChart(){
    const days=Number($('chartRange').value)||7,labels=[],income=[],expenses=[];
    for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=localDate(d),day=totals(state.entries.filter(e=>e.date===key));labels.push(dateLabel(key,{day:'2-digit',month:'short'}));income.push(day.income);expenses.push(day.expense);}
    $('chartTotal').textContent=money(sum(income)-sum(expenses));
    const ctx=$('incomeChart').getContext('2d');if(chart)chart.destroy();
    if(typeof Chart==='undefined'){$('chartTotal').textContent+=' · Gráfico no disponible';return;}
    const gradient=ctx.createLinearGradient(0,0,0,210);gradient.addColorStop(0,'rgba(33,198,165,.2)');gradient.addColorStop(1,'rgba(33,198,165,0)');
    chart=new Chart(ctx,{type:'line',data:{labels,datasets:[
      {label:'Ingresos',data:income,borderColor:'#20b99c',backgroundColor:gradient,fill:true,tension:.38,borderWidth:2.5,pointRadius:income.map(v=>v?3:0),pointHoverRadius:5},
      {label:'Gastos',data:expenses,borderColor:'#ef8b78',backgroundColor:'rgba(239,139,120,.08)',fill:false,tension:.38,borderWidth:2.5,pointRadius:expenses.map(v=>v?3:0),pointHoverRadius:5}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{displayColors:false,backgroundColor:'#142b39',padding:10,callbacks:{label:c=>c.dataset.label+': '+money(c.raw)}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#9ba6b4',font:{family:'DM Sans',size:9},maxRotation:0,autoSkip:true,maxTicksLimit:7}},y:{beginAtZero:true,grid:{color:'#f0f2f6',drawTicks:false},border:{display:false},ticks:{color:'#a0aab7',font:{family:'DM Sans',size:9},padding:9,maxTicksLimit:5,callback:v=>v>=1000000?'$'+(v/1000000).toFixed(1)+'M':v>=1000?'$'+(v/1000).toFixed(0)+'k':'$'+v}}}}});
  }
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function setType(type){
    currentType=type;const expense=type==='expense';
    document.querySelectorAll('.movement-tab').forEach(button=>button.classList.toggle('active',button.dataset.type===type));
    $('movementTitle').textContent=expense?'Sumá un gasto':'Sumá un ingreso';
    $('movementDescription').textContent=expense?'Anotá tus costos y gastos del día.':'Anotá lo que ganaste. Es rápido y queda guardado.';
    $('amountLabel').textContent=expense?'¿Cuánto gastaste?':'¿Cuánto ingresó?';
    $('saveMovement').innerHTML='<span>'+(expense?'−':'＋')+'</span> Guardar '+(expense?'gasto':'ingreso')+' <span class="button-arrow">→</span>';
    $('category').innerHTML=(expense?expenseCategories:['Consulta','Servicio','Venta','Otro']).map(v=>'<option value="'+v+'">'+v+'</option>').join('');
    $('formFeedback').textContent='';
  }
  document.querySelectorAll('.movement-tab').forEach(button=>button.addEventListener('click',()=>setType(button.dataset.type)));
  $('incomeForm').addEventListener('submit',event=>{
    event.preventDefault();const amount=Number($('amount').value),date=$('entryDate').value;
    if(!Number.isFinite(amount)||amount<=0){$('formFeedback').textContent='Ingresá un importe mayor a cero.';return;}
    if(!date){$('formFeedback').textContent='Elegí una fecha válida.';return;}
    const id=window.crypto?.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();
    state.entries.push({id,type:currentType,amount:Math.round(amount*100)/100,category:$('category').value,note:$('note').value.trim(),date,createdAt:new Date().toISOString()});
    saveState();$('incomeForm').reset();$('entryDate').value=localDate();$('formFeedback').textContent=(currentType==='expense'?'Gasto':'Ingreso')+' guardado correctamente.';render();$('amount').focus();showToast((currentType==='expense'?'¡Gasto guardado! ':'¡Ingreso guardado! ')+money(amount));
  });
  $('goalForm').addEventListener('submit',event=>{event.preventDefault();const goal=Number($('goalInput').value);if(!Number.isFinite(goal)||goal<=0){showToast('Ingresá un objetivo válido.');return;}state.goal=goal;saveState();render();showToast('Objetivo diario actualizado.');});
  $('chartRange').addEventListener('change',renderChart);
  $('historyList').addEventListener('click',event=>{
    const button=event.target.closest('[data-delete]');if(!button)return;const entry=state.entries.find(e=>e.id===button.dataset.delete);if(!entry)return;
    if(!confirm('¿Querés eliminar este '+(entry.type==='expense'?'gasto':'ingreso')+' de '+money(entry.amount)+'?'))return;
    state.entries=state.entries.filter(e=>e.id!==entry.id);saveState();render();showToast('Movimiento eliminado.');
  });
  $('viewAll').addEventListener('click',()=>{
    if(!state.entries.length){showToast('Todavía no hay movimientos registrados.');return;}
    const lines=[['Fecha','Tipo','Categoría','Descripción','Importe'].join('\t'),...([...state.entries].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>[e.date,e.type==='expense'?'Gasto':'Ingreso',e.category,e.note||'',e.amount].join('\t')))].join('\n');
    const blob=new Blob([lines],{type:'text/tab-separated-values;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mediccrm-movimientos-'+localDate()+'.tsv';a.click();URL.revokeObjectURL(url);showToast('Historial exportado.');
  });
  $('menuToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',()=>$('sidebar').classList.remove('open')));
  $('todayChip').addEventListener('click',()=>{$('entryDate').value=localDate();$('amount').focus();});
  render();
})();