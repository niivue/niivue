(()=>{"use strict";var e,t,n,r,c,o,a,f,d={},u={};function i(e){var t=u[e];if(void 0!==t)return t.exports;var n=u[e]={id:e,loaded:!1,exports:{}};return d[e].call(n.exports,n,n.exports,i),n.loaded=!0,n.exports}i.m=d,i.c=u,i.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return i.d(t,{a:t}),t},t=Object.getPrototypeOf?function(e){return Object.getPrototypeOf(e)}:function(e){return e.__proto__},i.t=function(n,r){if(1&r&&(n=this(n)),8&r||"object"==typeof n&&n&&(4&r&&n.__esModule||16&r&&"function"==typeof n.then))return n;var c=Object.create(null);i.r(c);var o={};e=e||[null,t({}),t([]),t(t)];for(var a=2&r&&n;"object"==typeof a&&!~e.indexOf(a);a=t(a))Object.getOwnPropertyNames(a).forEach(function(e){o[e]=function(){return n[e]}});return o.default=function(){return n},i.d(c,o),c},i.d=function(e,t){for(var n in t)i.o(t,n)&&!i.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},i.f={},i.e=function(e){return Promise.all(Object.keys(i.f).reduce(function(t,n){return i.f[n](e,t),t},[]))},i.hmd=function(e){return!(e=Object.create(e)).children&&(e.children=[]),Object.defineProperty(e,"exports",{enumerable:!0,set:function(){throw Error("ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: "+e.id)}}),e},i.u=function(e){return"assets/js/"+(({106:"814f3328",112:"aba21aa0",130:"c4f5d8e4",144:"e79b5a42",154:"7d6895cb",204:"d6362bd0",211:"a7bd4aaa",251:"24368f5f",294:"bec60b79",327:"95f841be",331:"900ed9ea",365:"a7456010",387:"17d89767",409:"d619cc78",415:"05c463b9",425:"ca03c44f",432:"5e95c892",436:"bf6e9bfc",457:"4b47f9ec",48:"17896441",491:"a29dd647",493:"1f391b9e",5:"4edc808e",515:"6a64fcce",586:"4a17546c",622:"e65c4e65",627:"acecf23e",633:"396a58fc",693:"2fdd4284",711:"e10d37d9",75:"470f9de2",756:"476d9de7",792:"36994c47",854:"621db11d",89:"2d056b43",910:"5e8c322a",914:"a94703ab",941:"38f6260d",948:"924aded7",969:"393be207"})[e]||e)+"."+({106:"8f33c4df",112:"0e340198",124:"134d159d",130:"e68d83ed",144:"384c6143",154:"c7ec893c",204:"46e91251",211:"305f429f",251:"3998bd2e",294:"a445c59b",327:"aae466d2",331:"5574b4e9",365:"d6a9b05e",387:"e4de7afe",409:"ae037407",415:"a6a49573",425:"cf8187e1",432:"41617ece",436:"4179ccc4",457:"f2f18275",48:"582980dd",491:"33fc51fd",493:"b58e95c8",5:"ed253f55",515:"9c8a24d5",586:"9ff357b0",622:"95105634",627:"b5f160dc",633:"f8e7dd47",693:"1d7670aa",711:"b543d5f3",75:"42d1c0a6",756:"946bb655",781:"ff825770",792:"7d5433f9",854:"24658f97",89:"9cba59d9",910:"317d9f79",914:"b4d86748",941:"ccaeb3ee",948:"847ec18f",968:"d5889a64",969:"8918987f"})[e]+".js"},i.miniCssF=function(e){return""+e+".css"},i.h=function(){return"28091ade66da27e5"},i.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||Function("return this")()}catch(e){if("object"==typeof window)return window}}(),i.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n={},r="@niivue/docs:",i.l=function(e,t,c,o){if(n[e]){n[e].push(t);return}if(void 0!==c){for(var a,f,d=document.getElementsByTagName("script"),u=0;u<d.length;u++){var b=d[u];if(b.getAttribute("src")==e||b.getAttribute("data-webpack")==r+c){a=b;break}}}!a&&(f=!0,(a=document.createElement("script")).charset="utf-8",a.timeout=120,i.nc&&a.setAttribute("nonce",i.nc),a.setAttribute("data-webpack",r+c),a.src=e),n[e]=[t];var s=function(t,r){a.onerror=a.onload=null,clearTimeout(l);var c=n[e];if(delete n[e],a.parentNode&&a.parentNode.removeChild(a),c&&c.forEach(function(e){return e(r)}),t)return t(r)},l=setTimeout(s.bind(null,void 0,{type:"timeout",target:a}),12e4);a.onerror=s.bind(null,a.onerror),a.onload=s.bind(null,a.onload),f&&document.head.appendChild(a)},i.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},i.nmd=function(e){return e.paths=[],!e.children&&(e.children=[]),e},c=[],i.O=function(e,t,n,r){if(t){r=r||0;for(var o=c.length;o>0&&c[o-1][2]>r;o--)c[o]=c[o-1];c[o]=[t,n,r];return}for(var a=1/0,o=0;o<c.length;o++){for(var t=c[o][0],n=c[o][1],r=c[o][2],f=!0,d=0;d<t.length;d++)(!1&r||a>=r)&&Object.keys(i.O).every(function(e){return i.O[e](t[d])})?t.splice(d--,1):(f=!1,r<a&&(a=r));if(f){c.splice(o--,1);var u=n();void 0!==u&&(e=u)}}return e},i.p="/niivue/docusaurus/",i.rv=function(){return"1.1.3"},i.gca=function(e){return e=({0x11113f9:"48","4edc808e":"5","470f9de2":"75","2d056b43":"89","814f3328":"106",aba21aa0:"112",c4f5d8e4:"130",e79b5a42:"144","7d6895cb":"154",d6362bd0:"204",a7bd4aaa:"211","24368f5f":"251",bec60b79:"294","95f841be":"327","900ed9ea":"331",a7456010:"365","17d89767":"387",d619cc78:"409","05c463b9":"415",ca03c44f:"425","5e95c892":"432",bf6e9bfc:"436","4b47f9ec":"457",a29dd647:"491","1f391b9e":"493","6a64fcce":"515","4a17546c":"586",e65c4e65:"622",acecf23e:"627","396a58fc":"633","2fdd4284":"693",e10d37d9:"711","476d9de7":"756","36994c47":"792","621db11d":"854","5e8c322a":"910",a94703ab:"914","38f6260d":"941","924aded7":"948","393be207":"969"})[e]||e,i.p+i.u(e)},o={212:0,580:0},i.f.j=function(e,t){var n=i.o(o,e)?o[e]:void 0;if(0!==n){if(n)t.push(n[2]);else if(/^(212|580)$/.test(e))o[e]=0;else{var r=new Promise(function(t,r){n=o[e]=[t,r]});t.push(n[2]=r);var c=i.p+i.u(e),a=Error();i.l(c,function(t){if(i.o(o,e)&&(0!==(n=o[e])&&(o[e]=void 0),n)){var r=t&&("load"===t.type?"missing":t.type),c=t&&t.target&&t.target.src;a.message="Loading chunk "+e+" failed.\n("+r+": "+c+")",a.name="ChunkLoadError",a.type=r,a.request=c,n[1](a)}},"chunk-"+e,e)}}},i.O.j=function(e){return 0===o[e]},a=function(e,t){var n=t[0],r=t[1],c=t[2],a,f,d=0;if(n.some(function(e){return 0!==o[e]})){for(a in r)i.o(r,a)&&(i.m[a]=r[a]);if(c)var u=c(i)}for(e&&e(t);d<n.length;d++)f=n[d],i.o(o,f)&&o[f]&&o[f][0](),o[f]=0;return i.O(u)},(f=self.webpackChunk_niivue_docs=self.webpackChunk_niivue_docs||[]).forEach(a.bind(null,0)),f.push=a.bind(null,f.push.bind(f))})();