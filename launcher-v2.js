const STORAGE_NAMESPACE='digital-textbook-launcher';
const STATE_KEY='state-v2';
const SUBJECTS=['国語','算数','理科','社会','英語','音楽','図工','家庭','体育・保健','道徳','その他'];
const SITES={
 manaviewer:{name:'まなビューア',url:'https://manaviewer.jp/'},
 cho:{name:'超教科書',url:'https://p01.cloud.cho-textbook.jp/'},
 lentrance:{name:'Lentrance Reader',url:'https://www.lentrance.com/school/login'},
 mirai:{name:'みらいスクールプラットフォーム',url:'https://mirai-pf.jp/user/login.html'},
 tsubasa:{name:'つばさブック',url:'https://tsubasabook.jp/'},
 esviewer:{name:'エスビューア',url:'https://sviewer.jp/'},
 custom:{name:'その他の公式ログイン先',url:''}
};
const PUBLISHERS={
 '東京書籍':'lentrance','大日本図書':'tsubasa','光村図書出版':'manaviewer','光村図書':'manaviewer','開隆堂出版':'mirai','新興出版社啓林館':'cho','啓林館':'cho','数研出版':'esviewer','三省堂':'custom','学校図書':'custom','教育出版':'custom','日本文教出版':'custom'
};
let state={books:[],recent:[]},storage=null;
const $=s=>document.querySelector(s);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function id(){return crypto?.randomUUID?.()||`book-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function validUrl(v){try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}}
async function initStorage(){try{const m=await import('https://tt-sensei.github.io/edu-components/index.js');storage=new m.StorageManager(STORAGE_NAMESPACE)}catch{storage={save:(k,v)=>{try{localStorage.setItem(`${STORAGE_NAMESPACE}:${k}`,JSON.stringify(v));return true}catch{return false}},load:(k,d)=>{try{return JSON.parse(localStorage.getItem(`${STORAGE_NAMESPACE}:${k}`))??d}catch{return d}}}};state=storage.load(STATE_KEY,{books:[],recent:[]});if(!Array.isArray(state.books))state.books=[];if(!Array.isArray(state.recent))state.recent=[]}
function save(){storage?.save(STATE_KEY,state)}
function siteForPublisher(p){return PUBLISHERS[p]||'custom'}
function siteLabel(key){return SITES[key]?.name||SITES.custom.name}
function render(){const grid=$('#subjectGrid');grid.innerHTML='';let count=0;for(const subject of SUBJECTS){const books=state.books.filter(b=>b.subject===subject).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.order-b.order);if(!books.length)continue;count+=books.length;const card=document.createElement('article');card.className='subject-card';card.innerHTML=`<h3>${esc(subject)}</h3>${books.map(b=>`<div class="textbook-row"><div class="book-info"><strong>${esc(b.publisher||b.label||'教科書')}</strong><small>${esc(siteLabel(b.site))}${b.label&&b.label!==b.publisher?` · ${esc(b.label)}`:''}</small></div><div class="book-actions"><button class="star-button ${b.favorite?'active':''}" data-action="fav" data-id="${esc(b.id)}" aria-label="お気に入り">${b.favorite?'★':'☆'}</button><button class="open-button" data-action="open" data-id="${esc(b.id)}">ひらく</button></div></div>`).join('')}`;grid.appendChild(card)}$('#empty').classList.toggle('hidden',count>0);$('#bookCount').textContent=`${count}件登録中`;renderRecent()}
function renderRecent(){const wrap=$('#recent');if(!state.recent.length){wrap.classList.add('hidden');return}const items=state.recent.map(r=>state.books.find(b=>b.id===r.id)).filter(Boolean).slice(0,4);if(!items.length){wrap.classList.add('hidden');return}wrap.classList.remove('hidden');$('#recentGrid').innerHTML=items.map(b=>`<button class="secondary-button" data-action="open" data-id="${esc(b.id)}">${esc(b.subject)}・${esc(b.publisher||'教科書')}</button>`).join('')}
function fillPublisher(){const s=$('#publisher');s.innerHTML='<option value="">選んでください</option>'+Object.keys(PUBLISHERS).map(p=>`<option>${esc(p)}</option>`).join('')+'<option value="__custom">その他</option>'}
function fillSite(){const s=$('#site');s.innerHTML=Object.entries(SITES).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('');updateSitePreview()}
function updateSitePreview(){const key=$('#site').value;const custom=key==='custom';$('#customUrlWrap').classList.toggle('hidden',!custom);$('#customUrl').required=custom;$('#siteName').textContent=siteLabel(key);$('#siteUrlHint').textContent=custom?'公式ログイン先のURLを入力してください。':SITES[key].url}
function publisherChanged(){const p=$('#publisher').value;if(p==='__custom'){$('#publisher').value='';$('#site').value='custom'}else if(p){$('#site').value=siteForPublisher(p)}updateSitePreview()}
function openRegister(){resetForm();$('#registerPanel').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#subject').focus(),250)}
function resetForm(){editingId.value='';$('#subject').value='';$('#publisher').value='';$('#site').value='manaviewer';$('#label').value='';$('#favorite').checked=false;$('#customUrl').value='';$('#deleteButton').classList.add('hidden');$('#formTitle').textContent='教科書を登録';updateSitePreview()}
function edit(b){$('#editingId').value=b.id;$('#subject').value=b.subject;$('#publisher').value=Object.keys(PUBLISHERS).includes(b.publisher)?b.publisher:'';$('#site').value=b.site;$('#label').value=b.label||'';$('#favorite').checked=!!b.favorite;$('#customUrl').value=b.site==='custom'?b.url:'';$('#deleteButton').classList.remove('hidden');$('#formTitle').textContent='教科書を編集';updateSitePreview();$('#registerPanel').scrollIntoView({behavior:'smooth',block:'start'})}
function openBook(b){window.open(b.url,'_blank','noopener,noreferrer');state.recent=[{id:b.id,time:Date.now()},...state.recent.filter(r=>r.id!==b.id)].slice(0,8);save();renderRecent()}
function submit(e){e.preventDefault();const subject=$('#subject').value,publisher=$('#publisher').value.trim(),site=$('#site').value,label=$('#label').value.trim(),url=validUrl(site==='custom'?$('#customUrl').value:SITES[site].url);if(!subject||!url){toast(site==='custom'?'教科と公式ログインURLを確認してください。':'教科を選んでください。');return}const editId=$('#editingId').value;const old=state.books.find(b=>b.id===editId);const item={id:editId||id(),subject,publisher,site,label,url,favorite:$('#favorite').checked,order:old?.order??state.books.length};const i=state.books.findIndex(b=>b.id===item.id);if(i>=0)state.books[i]=item;else state.books.push(item);save();render();resetForm();toast(i>=0?'教科書を更新しました。':'教科書を登録しました。')}
function removeCurrent(){const id=$('#editingId').value;const b=state.books.find(x=>x.id===id);if(!b)return;if(!confirm(`「${b.subject} ${b.publisher||''}」を削除しますか？`))return;state.books=state.books.filter(x=>x.id!==id);state.recent=state.recent.filter(x=>x.id!==id);save();render();resetForm();toast('登録を削除しました。')}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2200)}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='digital-textbook-launcher-backup.json';a.click();URL.revokeObjectURL(a.href)}
async function importData(file){try{const x=JSON.parse(await file.text());if(!Array.isArray(x.books))throw new Error();state={books:x.books,recent:Array.isArray(x.recent)?x.recent:[]};save();render();toast('設定を読み込みました。')}catch{toast('バックアップJSONを読み込めませんでした。')}}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const b=state.books.find(x=>x.id===el.dataset.id);if(!b)return;if(el.dataset.action==='open')openBook(b);if(el.dataset.action==='fav'){b.favorite=!b.favorite;save();render()}if(el.dataset.action==='edit')edit(b)});
$('#registerButton').addEventListener('click',openRegister);$('#publisher').addEventListener('change',publisherChanged);$('#site').addEventListener('change',updateSitePreview);$('#registerForm').addEventListener('submit',submit);$('#deleteButton').addEventListener('click',removeCurrent);$('#cancelButton').addEventListener('click',resetForm);$('#exportButton').addEventListener('click',exportData);$('#importButton').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',e=>e.target.files[0]&&importData(e.target.files[0]));
fillPublisher();fillSite();initStorage().then(render);