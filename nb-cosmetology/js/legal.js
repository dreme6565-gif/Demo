(function(){
  var d=document,r=d.documentElement;r.classList.add("js");
  var t=false;function p(){var h=r.scrollHeight-innerHeight;r.style.setProperty("--p",(h>0?Math.min(1,scrollY/h):0).toFixed(4));t=false}
  addEventListener("scroll",function(){if(!t){t=true;requestAnimationFrame(p)}},{passive:true});p();
  var b=d.querySelector(".burger"),m=d.getElementById("menu");
  function s(o){b.setAttribute("aria-expanded",o?"true":"false");m.classList.toggle("open",o)}
  b.addEventListener("click",function(){s(b.getAttribute("aria-expanded")!=="true")});
  d.addEventListener("keydown",function(e){if(e.key==="Escape"&&m.classList.contains("open")){s(false);b.focus()}});
})();
