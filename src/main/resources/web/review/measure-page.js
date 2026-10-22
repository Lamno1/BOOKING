// Visible, opt-in lab panel shared by baseline and candidate. No network or storage.
if(new URLSearchParams(location.search).has('measure')){
 let lcp=0,cls=0;
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}
 const panel=document.createElement('details');panel.style.cssText='position:fixed;z-index:100;right:12px;top:12px;max-width:520px;max-height:70vh;overflow:auto;background:#fff;color:#111;padding:12px;font:13px monospace;border:2px solid #111';
 panel.innerHTML='<summary>Đo tải trang · lab cục bộ</summary><button disabled style="min-height:44px">Chụp số đo</button><pre style="white-space:pre-wrap" id="page-measure">Chờ trang tải xong</pre>';
 document.body.append(panel);const button=panel.querySelector('button');
 const ready=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{button.disabled=false;panel.querySelector('pre').textContent='Sẵn sàng đo';}));
 if(document.readyState==='complete')ready();else window.addEventListener('load',ready,{once:true});
 button.onclick=()=>{const n=performance.getEntriesByType('navigation')[0];const images=performance.getEntriesByType('resource').filter(e=>/\.(png|webp)(\?|$)/.test(e.name)).map(e=>({name:e.name.split('/').pop(),encodedBytes:e.encodedBodySize,transferBytes:e.transferSize,durationMs:+e.duration.toFixed(1)}));panel.querySelector('pre').textContent=JSON.stringify({viewport:[innerWidth,innerHeight],dclMs:+n.domContentLoadedEventEnd.toFixed(1),loadMs:+n.loadEventEnd.toFixed(1),lcpMs:+lcp.toFixed(1),cls:+cls.toFixed(5),imageBytes:images.reduce((s,e)=>s+e.encodedBytes,0),imageTransfer:images.reduce((s,e)=>s+e.transferBytes,0),images},null,2);};
}
