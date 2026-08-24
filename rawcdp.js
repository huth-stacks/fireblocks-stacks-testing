const WebSocket=require("ws"); const fs=require("fs"); const path=require("path"); const readline=require("readline");
const SHOTS=path.join(__dirname,"shots-release"); fs.mkdirSync(SHOTS,{recursive:true});
(async()=>{
  const list=await (await fetch("http://127.0.0.1:9222/json")).json(); const pg=list.find(p=>p.type==="page");
  const ws=new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r=>ws.on("open",r));
  let id=0; const pending={}; ws.on("message",m=>{const j=JSON.parse(m); if(j.id&&pending[j.id]){pending[j.id](j); delete pending[j.id];}});
  const send=(method,params={})=>new Promise(res=>{const i=++id; const to=setTimeout(()=>{delete pending[i]; res({timeout:true});},8000); pending[i]=(j)=>{clearTimeout(to); res(j);}; ws.send(JSON.stringify({id:i,method,params}));});
  const ev=async(expr)=>{const r=await send("Runtime.evaluate",{expression:expr,awaitPromise:true,returnByValue:true}); if(r.timeout) return "TIMEOUT"; return r.result?.result?.value ?? (r.result?.exceptionDetails? "EXC "+r.result.exceptionDetails.text : (r.error? "ERR "+r.error.message: undefined));};
  await send("Page.enable"); await send("DOM.enable"); await send("Runtime.enable");
  console.log("READY", await ev("document.title+' '+location.href.slice(-40)"));
  const rl=readline.createInterface({input:process.stdin});
  for await (const line of rl){ const [cmd,...rest]=line.trim().split(" "); try{
    if(cmd==="shot"){const r=await send("Page.captureScreenshot",{format:"png"}); const f=path.join(SHOTS,rest[0]+".png"); fs.writeFileSync(f,Buffer.from(r.result.data,"base64")); console.log("SHOT",f);}
    else if(cmd==="clicktext"){const t=rest.join(" "); console.log(await ev(`(()=>{const t=${JSON.stringify(t)};const els=[...document.querySelectorAll("button,a,[role=button],[role=tab],label,li,div,span,p")];let el=els.find(e=>e.innerText&&e.innerText.trim()===t)||els.find(e=>e.innerText&&e.innerText.trim().startsWith(t));if(!el)return "ERR not found";el.click();return "OK";})()`));}
    else if(cmd==="click"){console.log(await ev(`(()=>{const el=document.querySelector(${JSON.stringify(rest.join(" "))});if(!el)return "ERR none";el.click();return "OK";})()`));}
    else if(cmd==="text"){const sel=rest[0]; const val=rest.slice(1).join(" "); console.log(await ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return "ERR none";const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;setter.call(el,${JSON.stringify(val)});el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));return "OK";})()`));}
    else if(cmd==="file"){const doc=await send("DOM.getDocument",{depth:-1}); const q=await send("DOM.querySelector",{nodeId:doc.result.root.nodeId,selector:rest[0]}); if(!q.result||!q.result.nodeId){console.log("ERR no input");} else {await send("DOM.setFileInputFiles",{nodeId:q.result.nodeId,files:[rest[1]]}); console.log("OK");}}
    else if(cmd==="eval"){console.log("EVAL",JSON.stringify(await ev(rest.join(" "))));}
    else if(cmd==="dom"){console.log("DOM\n"+String(await ev("document.body.innerText")).slice(0,5000));}
    else if(cmd==="wait"){await new Promise(r=>setTimeout(r,Number(rest[0]||1000))); console.log("OK");}
    else if(cmd==="quit"){process.exit(0);} else console.log("UNKNOWN",cmd);
  }catch(e){console.log("ERR",e.message.split("\n")[0]);} console.log("<<END>>"); }
})().catch(e=>{console.error("FATAL",e.message);process.exit(1);});
