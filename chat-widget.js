<script>
(function(){
  const css = `
  .caprock-chat-btn{position:fixed;right:20px;bottom:20px;z-index:9999;border:none;border-radius:9999px;padding:12px 16px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.15);background:#0ea5e9;color:#fff}
  .caprock-chat-panel{position:fixed;right:20px;bottom:80px;width:320px;max-height:60vh;background:#fff;border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;z-index:9999;border:1px solid #eee}
  .caprock-chat-header{padding:12px 14px;font-weight:700;background:#111;color:#fff}
  .caprock-chat-body{padding:12px;overflow:auto;gap:8px;display:flex;flex-direction:column}
  .caprock-msg{padding:10px 12px;border-radius:12px;background:#f5f5f5}
  .caprock-msg.me{background:#e8f0ff;align-self:flex-end}
  .caprock-chat-input{display:flex;gap:8px;padding:12px;border-top:1px solid #eee}
  .caprock-chat-input input{flex:1;padding:10px;border-radius:10px;border:1px solid #ddd}
  .caprock-chat-input button{padding:10px 14px;border-radius:10px;border:none;font-weight:600;cursor:pointer;background:#111;color:#fff}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const btn = document.createElement('button'); btn.className='caprock-chat-btn'; btn.textContent='💬 Chat with us';
  const panel = document.createElement('div'); panel.className='caprock-chat-panel'; panel.id='caprockChat';
  panel.innerHTML = `
    <div class="caprock-chat-header">Caprock Support</div>
    <div class="caprock-chat-body" id="caprockBody"></div>
    <div class="caprock-chat-input">
      <input id="caprockInput" type="text" placeholder="Type your message..." />
      <button id="caprockSend">Send</button>
    </div>`;
  document.body.appendChild(btn); document.body.appendChild(panel);

  const body = panel.querySelector('#caprockBody');
  const input = panel.querySelector('#caprockInput');
  const send = panel.querySelector('#caprockSend');

  function addMsg(t,me=false){const d=document.createElement('div'); d.className='caprock-msg'+(me?' me':''); d.textContent=t; body.appendChild(d); body.scrollTop=body.scrollHeight;}

  btn.addEventListener('click', ()=>{panel.style.display = panel.style.display==='flex'?'none':'flex'; panel.style.flexDirection='column'; if(!body.childElementCount) addMsg("Hey! I’m your Caprock assistant—how can I help today?");});

  async function sendMsg(){
    const t=(input.value||'').trim(); if(!t) return; addMsg(t,true); input.value=''; addMsg('Thinking...');
    try{
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:t})});
      const data = await r.json(); body.lastChild.textContent = data.response || 'Sorry, no response.';
    }catch(e){ body.lastChild.textContent='Error contacting support. Please try again.'; }
  }
  send.addEventListener('click', sendMsg);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') sendMsg(); });
})();
</script>
