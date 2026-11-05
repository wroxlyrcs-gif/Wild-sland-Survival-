/* Açılış ekranında takılı kalmayı önler: gerekli betikler yüklenmediyse nedenini ekranda gösterir. */
(function(){
  function msg(t){var l=document.getElementById("loading-screen");if(!l)return;l.classList.remove("out","hidden");l.innerHTML="<div style='padding:24px;text-align:center;max-width:560px;font:14px/1.5 sans-serif;color:#fff'><b style='font-size:18px'>WILD ISLAND</b><br><br>"+t+"</div>";}
  var errs=window.__errs=window.__errs||[];window.addEventListener("error",function(e){errs.push(e.message+" @"+String(e.filename||"").split("/").pop()+":"+e.lineno);console.error("[boot]",e.message,e.filename,e.lineno);});
  setTimeout(function(){
    if(!window.THREE){msg("three.js bulunamadı.<br><small>"+errs.join("<br>").replace(/</g,"")+"</small>");}
    else if(!window.WI||!window.WI.debug){msg("Oyun başlatılamadı.<br><small>"+errs.join("<br>").replace(/</g,"")+"</small>");}
  },4000);
})();
