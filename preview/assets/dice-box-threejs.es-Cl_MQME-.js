var Fa=Object.defineProperty,Ia=(c,e,t)=>e in c?Fa(c,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):c[e]=t,za=(c,e,t)=>(Ia(c,e+"",t),t);/**
 * @license
 * Copyright 2010-2022 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ns="143",Kt="srgb",xi="srgb-linear",js="300 es";class Xi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const i=this._listeners[e];if(i!==void 0){const r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const t=this._listeners[e.type];if(t!==void 0){e.target=this;const i=t.slice(0);for(let r=0,s=i.length;r<s;r++)i[r].call(this,e);e.target=null}}}const tt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Kr=Math.PI/180,Fs=180/Math.PI;function cr(){const c=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(tt[c&255]+tt[c>>8&255]+tt[c>>16&255]+tt[c>>24&255]+"-"+tt[e&255]+tt[e>>8&255]+"-"+tt[e>>16&15|64]+tt[e>>24&255]+"-"+tt[t&63|128]+tt[t>>8&255]+"-"+tt[t>>16&255]+tt[t>>24&255]+tt[i&255]+tt[i>>8&255]+tt[i>>16&255]+tt[i>>24&255]).toLowerCase()}function mt(c,e,t){return Math.max(e,Math.min(t,c))}function Na(c,e){return(c%e+e)%e}function Qr(c,e,t){return(1-t)*c+t*e}function Xs(c){return(c&c-1)===0&&c!==0}function Is(c){return Math.pow(2,Math.floor(Math.log(c)/Math.LN2))}class Le{constructor(e=0,t=0){Le.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*i-a*r+e.x,this.y=s*r+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class wt{constructor(){wt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1]}set(e,t,i,r,s,a,n,o,l){const h=this.elements;return h[0]=e,h[1]=r,h[2]=n,h[3]=t,h[4]=s,h[5]=o,h[6]=i,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],n=i[3],o=i[6],l=i[1],h=i[4],d=i[7],u=i[2],f=i[5],g=i[8],p=r[0],m=r[3],v=r[6],x=r[1],w=r[4],_=r[7],M=r[2],E=r[5],L=r[8];return s[0]=a*p+n*x+o*M,s[3]=a*m+n*w+o*E,s[6]=a*v+n*_+o*L,s[1]=l*p+h*x+d*M,s[4]=l*m+h*w+d*E,s[7]=l*v+h*_+d*L,s[2]=u*p+f*x+g*M,s[5]=u*m+f*w+g*E,s[8]=u*v+f*_+g*L,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],n=e[5],o=e[6],l=e[7],h=e[8];return t*a*h-t*n*l-i*s*h+i*n*o+r*s*l-r*a*o}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],n=e[5],o=e[6],l=e[7],h=e[8],d=h*a-n*l,u=n*o-h*s,f=l*s-a*o,g=t*d+i*u+r*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const p=1/g;return e[0]=d*p,e[1]=(r*l-h*i)*p,e[2]=(n*i-r*a)*p,e[3]=u*p,e[4]=(h*t-r*o)*p,e[5]=(r*s-n*t)*p,e[6]=f*p,e[7]=(i*o-l*t)*p,e[8]=(a*t-i*s)*p,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,a,n){const o=Math.cos(s),l=Math.sin(s);return this.set(i*o,i*l,-i*(o*a+l*n)+a+e,-r*l,r*o,-r*(-l*a+o*n)+n+t,0,0,1),this}scale(e,t){const i=this.elements;return i[0]*=e,i[3]*=e,i[6]*=e,i[1]*=t,i[4]*=t,i[7]*=t,this}rotate(e){const t=Math.cos(e),i=Math.sin(e),r=this.elements,s=r[0],a=r[3],n=r[6],o=r[1],l=r[4],h=r[7];return r[0]=t*s+i*o,r[3]=t*a+i*l,r[6]=t*n+i*h,r[1]=-i*s+t*o,r[4]=-i*a+t*l,r[7]=-i*n+t*h,this}translate(e,t){const i=this.elements;return i[0]+=e*i[2],i[3]+=e*i[5],i[6]+=e*i[8],i[1]+=t*i[2],i[4]+=t*i[5],i[7]+=t*i[8],this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}function $n(c){for(let e=c.length-1;e>=0;--e)if(c[e]>65535)return!0;return!1}function Vr(c){return document.createElementNS("http://www.w3.org/1999/xhtml",c)}function _i(c){return c<.04045?c*.0773993808:Math.pow(c*.9478672986+.0521327014,2.4)}function Gr(c){return c<.0031308?c*12.92:1.055*Math.pow(c,.41666)-.055}const $r={[Kt]:{[xi]:_i},[xi]:{[Kt]:Gr}},Mt={legacyMode:!0,get workingColorSpace(){return xi},set workingColorSpace(c){console.warn("THREE.ColorManagement: .workingColorSpace is readonly.")},convert:function(c,e,t){if(this.legacyMode||e===t||!e||!t)return c;if($r[e]&&$r[e][t]!==void 0){const i=$r[e][t];return c.r=i(c.r),c.g=i(c.g),c.b=i(c.b),c}throw new Error("Unsupported color space conversion.")},fromWorkingColorSpace:function(c,e){return this.convert(c,this.workingColorSpace,e)},toWorkingColorSpace:function(c,e){return this.convert(c,e,this.workingColorSpace)}},ea={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},je={r:0,g:0,b:0},St={h:0,s:0,l:0},fr={h:0,s:0,l:0};function es(c,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?c+(e-c)*6*t:t<1/2?e:t<2/3?c+(e-c)*6*(2/3-t):c}function gr(c,e){return e.r=c.r,e.g=c.g,e.b=c.b,e}class Ce{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,t===void 0&&i===void 0?this.set(e):this.setRGB(e,t,i)}set(e){return e&&e.isColor?this.copy(e):typeof e=="number"?this.setHex(e):typeof e=="string"&&this.setStyle(e),this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Kt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Mt.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=xi){return this.r=e,this.g=t,this.b=i,Mt.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=xi){if(e=Na(e,1),t=mt(t,0,1),i=mt(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,a=2*i-s;this.r=es(a,s,e+1/3),this.g=es(a,s,e),this.b=es(a,s,e-1/3)}return Mt.toWorkingColorSpace(this,r),this}setStyle(e,t=Kt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^((?:rgb|hsl)a?)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],n=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(n))return this.r=Math.min(255,parseInt(s[1],10))/255,this.g=Math.min(255,parseInt(s[2],10))/255,this.b=Math.min(255,parseInt(s[3],10))/255,Mt.toWorkingColorSpace(this,t),i(s[4]),this;if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(n))return this.r=Math.min(100,parseInt(s[1],10))/100,this.g=Math.min(100,parseInt(s[2],10))/100,this.b=Math.min(100,parseInt(s[3],10))/100,Mt.toWorkingColorSpace(this,t),i(s[4]),this;break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(n)){const o=parseFloat(s[1])/360,l=parseInt(s[2],10)/100,h=parseInt(s[3],10)/100;return i(s[4]),this.setHSL(o,l,h,t)}break}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.r=parseInt(s.charAt(0)+s.charAt(0),16)/255,this.g=parseInt(s.charAt(1)+s.charAt(1),16)/255,this.b=parseInt(s.charAt(2)+s.charAt(2),16)/255,Mt.toWorkingColorSpace(this,t),this;if(a===6)return this.r=parseInt(s.charAt(0)+s.charAt(1),16)/255,this.g=parseInt(s.charAt(2)+s.charAt(3),16)/255,this.b=parseInt(s.charAt(4)+s.charAt(5),16)/255,Mt.toWorkingColorSpace(this,t),this}return e&&e.length>0?this.setColorName(e,t):this}setColorName(e,t=Kt){const i=ea[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=_i(e.r),this.g=_i(e.g),this.b=_i(e.b),this}copyLinearToSRGB(e){return this.r=Gr(e.r),this.g=Gr(e.g),this.b=Gr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Kt){return Mt.fromWorkingColorSpace(gr(this,je),e),mt(je.r*255,0,255)<<16^mt(je.g*255,0,255)<<8^mt(je.b*255,0,255)<<0}getHexString(e=Kt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=xi){Mt.fromWorkingColorSpace(gr(this,je),t);const i=je.r,r=je.g,s=je.b,a=Math.max(i,r,s),n=Math.min(i,r,s);let o,l;const h=(n+a)/2;if(n===a)o=0,l=0;else{const d=a-n;switch(l=h<=.5?d/(a+n):d/(2-a-n),a){case i:o=(r-s)/d+(r<s?6:0);break;case r:o=(s-i)/d+2;break;case s:o=(i-r)/d+4;break}o/=6}return e.h=o,e.s=l,e.l=h,e}getRGB(e,t=xi){return Mt.fromWorkingColorSpace(gr(this,je),t),e.r=je.r,e.g=je.g,e.b=je.b,e}getStyle(e=Kt){return Mt.fromWorkingColorSpace(gr(this,je),e),e!==Kt?`color(${e} ${je.r} ${je.g} ${je.b})`:`rgb(${je.r*255|0},${je.g*255|0},${je.b*255|0})`}offsetHSL(e,t,i){return this.getHSL(St),St.h+=e,St.s+=t,St.l+=i,this.setHSL(St.h,St.s,St.l),this}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(St),e.getHSL(fr);const i=Qr(St.h,fr.h,t),r=Qr(St.s,fr.s,t),s=Qr(St.l,fr.l,t);return this.setHSL(i,r,s),this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),e.normalized===!0&&(this.r/=255,this.g/=255,this.b/=255),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}Ce.NAMES=ea;let Li;class ta{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Li===void 0&&(Li=Vr("canvas")),Li.width=e.width,Li.height=e.height;const i=Li.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=Li}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Vr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=_i(s[a]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(_i(t[i]/255)*255):t[i]=_i(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}class ia{constructor(e=null){this.isSource=!0,this.uuid=cr(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,n=r.length;a<n;a++)r[a].isDataTexture?s.push(ts(r[a].image)):s.push(ts(r[a]))}else s=ts(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function ts(c){return typeof HTMLImageElement<"u"&&c instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&c instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&c instanceof ImageBitmap?ta.getDataURL(c):c.data?{data:Array.from(c.data),width:c.width,height:c.height,type:c.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Oa=0;class gt extends Xi{constructor(e=gt.DEFAULT_IMAGE,t=gt.DEFAULT_MAPPING,i=1001,r=1001,s=1006,a=1008,n=1023,o=1009,l=1,h=3e3){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Oa++}),this.uuid=cr(),this.name="",this.source=new ia(e),this.mipmaps=[],this.mapping=t,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=n,this.internalFormat=null,this.type=o,this.offset=new Le(0,0),this.repeat=new Le(1,1),this.center=new Le(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new wt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.encoding=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.encoding=e.encoding,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.5,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,type:this.type,encoding:this.encoding,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return JSON.stringify(this.userData)!=="{}"&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case 1e3:e.x=e.x-Math.floor(e.x);break;case 1001:e.x=e.x<0?0:1;break;case 1002:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case 1e3:e.y=e.y-Math.floor(e.y);break;case 1001:e.y=e.y<0?0:1;break;case 1002:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}}gt.DEFAULT_IMAGE=null;gt.DEFAULT_MAPPING=300;class Ye{constructor(e=0,t=0,i=0,r=1){Ye.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*i+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*i+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*i+a[11]*r+a[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const a=e.elements,n=a[0],o=a[4],l=a[8],h=a[1],d=a[5],u=a[9],f=a[2],g=a[6],p=a[10];if(Math.abs(o-h)<.01&&Math.abs(l-f)<.01&&Math.abs(u-g)<.01){if(Math.abs(o+h)<.1&&Math.abs(l+f)<.1&&Math.abs(u+g)<.1&&Math.abs(n+d+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const v=(n+1)/2,x=(d+1)/2,w=(p+1)/2,_=(o+h)/4,M=(l+f)/4,E=(u+g)/4;return v>x&&v>w?v<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(v),r=_/i,s=M/i):x>w?x<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(x),i=_/r,s=E/r):w<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(w),i=M/s,r=E/s),this.set(i,r,s,t),this}let m=Math.sqrt((g-u)*(g-u)+(l-f)*(l-f)+(h-o)*(h-o));return Math.abs(m)<.001&&(m=1),this.x=(g-u)/m,this.y=(l-f)/m,this.z=(h-o)/m,this.w=Math.acos((n+d+p-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this.w=this.w<0?Math.ceil(this.w):Math.floor(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Mi extends Xi{constructor(e,t,i={}){super(),this.isWebGLRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Ye(0,0,e,t),this.scissorTest=!1,this.viewport=new Ye(0,0,e,t);const r={width:e,height:t,depth:1};this.texture=new gt(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.encoding),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=i.generateMipmaps!==void 0?i.generateMipmaps:!1,this.texture.internalFormat=i.internalFormat!==void 0?i.internalFormat:null,this.texture.minFilter=i.minFilter!==void 0?i.minFilter:1006,this.depthBuffer=i.depthBuffer!==void 0?i.depthBuffer:!0,this.stencilBuffer=i.stencilBuffer!==void 0?i.stencilBuffer:!1,this.depthTexture=i.depthTexture!==void 0?i.depthTexture:null,this.samples=i.samples!==void 0?i.samples:0}setSize(e,t,i=1){(this.width!==e||this.height!==t||this.depth!==i)&&(this.width=e,this.height=t,this.depth=i,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=i,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new ia(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ra extends gt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ba extends gt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class hr{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,a,n){let o=i[r+0],l=i[r+1],h=i[r+2],d=i[r+3];const u=s[a+0],f=s[a+1],g=s[a+2],p=s[a+3];if(n===0){e[t+0]=o,e[t+1]=l,e[t+2]=h,e[t+3]=d;return}if(n===1){e[t+0]=u,e[t+1]=f,e[t+2]=g,e[t+3]=p;return}if(d!==p||o!==u||l!==f||h!==g){let m=1-n;const v=o*u+l*f+h*g+d*p,x=v>=0?1:-1,w=1-v*v;if(w>Number.EPSILON){const M=Math.sqrt(w),E=Math.atan2(M,v*x);m=Math.sin(m*E)/M,n=Math.sin(n*E)/M}const _=n*x;if(o=o*m+u*_,l=l*m+f*_,h=h*m+g*_,d=d*m+p*_,m===1-n){const M=1/Math.sqrt(o*o+l*l+h*h+d*d);o*=M,l*=M,h*=M,d*=M}}e[t]=o,e[t+1]=l,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,r,s,a){const n=i[r],o=i[r+1],l=i[r+2],h=i[r+3],d=s[a],u=s[a+1],f=s[a+2],g=s[a+3];return e[t]=n*g+h*d+o*f-l*u,e[t+1]=o*g+h*u+l*d-n*f,e[t+2]=l*g+h*f+n*u-o*d,e[t+3]=h*g-n*d-o*u-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t){if(!(e&&e.isEuler))throw new Error("THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.");const i=e._x,r=e._y,s=e._z,a=e._order,n=Math.cos,o=Math.sin,l=n(i/2),h=n(r/2),d=n(s/2),u=o(i/2),f=o(r/2),g=o(s/2);switch(a){case"XYZ":this._x=u*h*d+l*f*g,this._y=l*f*d-u*h*g,this._z=l*h*g+u*f*d,this._w=l*h*d-u*f*g;break;case"YXZ":this._x=u*h*d+l*f*g,this._y=l*f*d-u*h*g,this._z=l*h*g-u*f*d,this._w=l*h*d+u*f*g;break;case"ZXY":this._x=u*h*d-l*f*g,this._y=l*f*d+u*h*g,this._z=l*h*g+u*f*d,this._w=l*h*d-u*f*g;break;case"ZYX":this._x=u*h*d-l*f*g,this._y=l*f*d+u*h*g,this._z=l*h*g-u*f*d,this._w=l*h*d+u*f*g;break;case"YZX":this._x=u*h*d+l*f*g,this._y=l*f*d+u*h*g,this._z=l*h*g-u*f*d,this._w=l*h*d-u*f*g;break;case"XZY":this._x=u*h*d-l*f*g,this._y=l*f*d-u*h*g,this._z=l*h*g+u*f*d,this._w=l*h*d+u*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t!==!1&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],a=t[1],n=t[5],o=t[9],l=t[2],h=t[6],d=t[10],u=i+n+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-o)*f,this._y=(s-l)*f,this._z=(a-r)*f}else if(i>n&&i>d){const f=2*Math.sqrt(1+i-n-d);this._w=(h-o)/f,this._x=.25*f,this._y=(r+a)/f,this._z=(s+l)/f}else if(n>d){const f=2*Math.sqrt(1+n-i-d);this._w=(s-l)/f,this._x=(r+a)/f,this._y=.25*f,this._z=(o+h)/f}else{const f=2*Math.sqrt(1+d-i-n);this._w=(a-r)/f,this._x=(s+l)/f,this._y=(o+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(mt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,a=e._w,n=t._x,o=t._y,l=t._z,h=t._w;return this._x=i*h+a*n+r*l-s*o,this._y=r*h+a*o+s*n-i*l,this._z=s*h+a*l+i*o-r*n,this._w=a*h-i*n-r*o-s*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,a=this._w;let n=a*e._w+i*e._x+r*e._y+s*e._z;if(n<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,n=-n):this.copy(e),n>=1)return this._w=a,this._x=i,this._y=r,this._z=s,this;const o=1-n*n;if(o<=Number.EPSILON){const f=1-t;return this._w=f*a+t*this._w,this._x=f*i+t*this._x,this._y=f*r+t*this._y,this._z=f*s+t*this._z,this.normalize(),this._onChangeCallback(),this}const l=Math.sqrt(o),h=Math.atan2(l,n),d=Math.sin((1-t)*h)/l,u=Math.sin(t*h)/l;return this._w=a*d+this._w*u,this._x=i*d+this._x*u,this._y=r*d+this._y*u,this._z=s*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=Math.random(),t=Math.sqrt(1-e),i=Math.sqrt(e),r=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(t*Math.cos(r),i*Math.sin(s),i*Math.cos(s),t*Math.sin(r))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class k{constructor(e=0,t=0,i=0){k.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ys.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ys.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,n=e.z,o=e.w,l=o*t+a*r-n*i,h=o*i+n*t-s*r,d=o*r+s*i-a*t,u=-s*t-a*i-n*r;return this.x=l*o+u*-s+h*-n-d*-a,this.y=h*o+u*-a+d*-s-l*-n,this.z=d*o+u*-n+l*-a-h*-s,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,a=t.x,n=t.y,o=t.z;return this.x=r*o-s*n,this.y=s*a-i*o,this.z=i*n-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return is.copy(this).projectOnVector(e),this.sub(is)}reflect(e){return this.sub(is.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(mt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=(Math.random()-.5)*2,t=Math.random()*Math.PI*2,i=Math.sqrt(1-e**2);return this.x=i*Math.cos(t),this.y=i*Math.sin(t),this.z=e,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const is=new k,Ys=new hr;class ur{constructor(e=new k(1/0,1/0,1/0),t=new k(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){let t=1/0,i=1/0,r=1/0,s=-1/0,a=-1/0,n=-1/0;for(let o=0,l=e.length;o<l;o+=3){const h=e[o],d=e[o+1],u=e[o+2];h<t&&(t=h),d<i&&(i=d),u<r&&(r=u),h>s&&(s=h),d>a&&(a=d),u>n&&(n=u)}return this.min.set(t,i,r),this.max.set(s,a,n),this}setFromBufferAttribute(e){let t=1/0,i=1/0,r=1/0,s=-1/0,a=-1/0,n=-1/0;for(let o=0,l=e.count;o<l;o++){const h=e.getX(o),d=e.getY(o),u=e.getZ(o);h<t&&(t=h),d<i&&(i=d),u<r&&(r=u),h>s&&(s=h),d>a&&(a=d),u>n&&(n=u)}return this.min.set(t,i,r),this.max.set(s,a,n),this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=hi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0)if(t&&i.attributes!=null&&i.attributes.position!==void 0){const s=i.attributes.position;for(let a=0,n=s.count;a<n;a++)hi.fromBufferAttribute(s,a).applyMatrix4(e.matrixWorld),this.expandByPoint(hi)}else i.boundingBox===null&&i.computeBoundingBox(),rs.copy(i.boundingBox),rs.applyMatrix4(e.matrixWorld),this.union(rs);const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,hi),hi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Qi),vr.subVectors(this.max,Qi),Ri.subVectors(e.a,Qi),Di.subVectors(e.b,Qi),Pi.subVectors(e.c,Qi),ti.subVectors(Di,Ri),ii.subVectors(Pi,Di),ui.subVectors(Ri,Pi);let t=[0,-ti.z,ti.y,0,-ii.z,ii.y,0,-ui.z,ui.y,ti.z,0,-ti.x,ii.z,0,-ii.x,ui.z,0,-ui.x,-ti.y,ti.x,0,-ii.y,ii.x,0,-ui.y,ui.x,0];return!ss(t,Ri,Di,Pi,vr)||(t=[1,0,0,0,1,0,0,0,1],!ss(t,Ri,Di,Pi,vr))?!1:(xr.crossVectors(ti,ii),t=[xr.x,xr.y,xr.z],ss(t,Ri,Di,Pi,vr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return hi.copy(e).clamp(this.min,this.max).sub(e).length()}getBoundingSphere(e){return this.getCenter(e.center),e.radius=this.getSize(hi).length()*.5,e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Gt[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Gt[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Gt[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Gt[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Gt[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Gt[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Gt[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Gt[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Gt),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const Gt=[new k,new k,new k,new k,new k,new k,new k,new k],hi=new k,rs=new ur,Ri=new k,Di=new k,Pi=new k,ti=new k,ii=new k,ui=new k,Qi=new k,vr=new k,xr=new k,di=new k;function ss(c,e,t,i,r){for(let s=0,a=c.length-3;s<=a;s+=3){di.fromArray(c,s);const n=r.x*Math.abs(di.x)+r.y*Math.abs(di.y)+r.z*Math.abs(di.z),o=e.dot(di),l=t.dot(di),h=i.dot(di);if(Math.max(-Math.max(o,l,h),Math.min(o,l,h))>n)return!1}return!0}const ka=new ur,Zs=new k,_r=new k,ns=new k;class lr{constructor(e=new k,t=-1){this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):ka.setFromPoints(e).getCenter(i);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){ns.subVectors(e,this.center);const t=ns.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.add(ns.multiplyScalar(r/i)),this.radius+=r}return this}union(e){return this.center.equals(e.center)===!0?_r.set(0,0,1).multiplyScalar(e.radius):_r.subVectors(e.center,this.center).normalize().multiplyScalar(e.radius),this.expandByPoint(Zs.copy(e.center).add(_r)),this.expandByPoint(Zs.copy(e.center).sub(_r)),this}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Ht=new k,as=new k,yr=new k,ri=new k,os=new k,br=new k,ls=new k;class Ua{constructor(e=new k,t=new k(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.direction).multiplyScalar(e).add(this.origin)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ht)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.direction).multiplyScalar(i).add(this.origin)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ht.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ht.copy(this.direction).multiplyScalar(t).add(this.origin),Ht.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){as.copy(e).add(t).multiplyScalar(.5),yr.copy(t).sub(e).normalize(),ri.copy(this.origin).sub(as);const s=e.distanceTo(t)*.5,a=-this.direction.dot(yr),n=ri.dot(this.direction),o=-ri.dot(yr),l=ri.lengthSq(),h=Math.abs(1-a*a);let d,u,f,g;if(h>0)if(d=a*o-n,u=a*n-o,g=s*h,d>=0)if(u>=-g)if(u<=g){const p=1/h;d*=p,u*=p,f=d*(d+a*u+2*n)+u*(a*d+u+2*o)+l}else u=s,d=Math.max(0,-(a*u+n)),f=-d*d+u*(u+2*o)+l;else u=-s,d=Math.max(0,-(a*u+n)),f=-d*d+u*(u+2*o)+l;else u<=-g?(d=Math.max(0,-(-a*s+n)),u=d>0?-s:Math.min(Math.max(-s,-o),s),f=-d*d+u*(u+2*o)+l):u<=g?(d=0,u=Math.min(Math.max(-s,-o),s),f=u*(u+2*o)+l):(d=Math.max(0,-(a*s+n)),u=d>0?s:Math.min(Math.max(-s,-o),s),f=-d*d+u*(u+2*o)+l);else u=a>0?-s:s,d=Math.max(0,-(a*u+n)),f=-d*d+u*(u+2*o)+l;return i&&i.copy(this.direction).multiplyScalar(d).add(this.origin),r&&r.copy(yr).multiplyScalar(u).add(as),f}intersectSphere(e,t){Ht.subVectors(e.center,this.origin);const i=Ht.dot(this.direction),r=Ht.dot(Ht)-i*i,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),n=i-a,o=i+a;return n<0&&o<0?null:n<0?this.at(o,t):this.at(n,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,a,n,o;const l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(i=(e.min.x-u.x)*l,r=(e.max.x-u.x)*l):(i=(e.max.x-u.x)*l,r=(e.min.x-u.x)*l),h>=0?(s=(e.min.y-u.y)*h,a=(e.max.y-u.y)*h):(s=(e.max.y-u.y)*h,a=(e.min.y-u.y)*h),i>a||s>r||((s>i||i!==i)&&(i=s),(a<r||r!==r)&&(r=a),d>=0?(n=(e.min.z-u.z)*d,o=(e.max.z-u.z)*d):(n=(e.max.z-u.z)*d,o=(e.min.z-u.z)*d),i>o||n>r)||((n>i||i!==i)&&(i=n),(o<r||r!==r)&&(r=o),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,Ht)!==null}intersectTriangle(e,t,i,r,s){os.subVectors(t,e),br.subVectors(i,e),ls.crossVectors(os,br);let a=this.direction.dot(ls),n;if(a>0){if(r)return null;n=1}else if(a<0)n=-1,a=-a;else return null;ri.subVectors(this.origin,e);const o=n*this.direction.dot(br.crossVectors(ri,br));if(o<0)return null;const l=n*this.direction.dot(os.cross(ri));if(l<0||o+l>a)return null;const h=-n*ri.dot(ls);return h<0?null:this.at(h/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ze{constructor(){Ze.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}set(e,t,i,r,s,a,n,o,l,h,d,u,f,g,p,m){const v=this.elements;return v[0]=e,v[4]=t,v[8]=i,v[12]=r,v[1]=s,v[5]=a,v[9]=n,v[13]=o,v[2]=l,v[6]=h,v[10]=d,v[14]=u,v[3]=f,v[7]=g,v[11]=p,v[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ze().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/Fi.setFromMatrixColumn(e,0).length(),s=1/Fi.setFromMatrixColumn(e,1).length(),a=1/Fi.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,a=Math.cos(i),n=Math.sin(i),o=Math.cos(r),l=Math.sin(r),h=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){const u=a*h,f=a*d,g=n*h,p=n*d;t[0]=o*h,t[4]=-o*d,t[8]=l,t[1]=f+g*l,t[5]=u-p*l,t[9]=-n*o,t[2]=p-u*l,t[6]=g+f*l,t[10]=a*o}else if(e.order==="YXZ"){const u=o*h,f=o*d,g=l*h,p=l*d;t[0]=u+p*n,t[4]=g*n-f,t[8]=a*l,t[1]=a*d,t[5]=a*h,t[9]=-n,t[2]=f*n-g,t[6]=p+u*n,t[10]=a*o}else if(e.order==="ZXY"){const u=o*h,f=o*d,g=l*h,p=l*d;t[0]=u-p*n,t[4]=-a*d,t[8]=g+f*n,t[1]=f+g*n,t[5]=a*h,t[9]=p-u*n,t[2]=-a*l,t[6]=n,t[10]=a*o}else if(e.order==="ZYX"){const u=a*h,f=a*d,g=n*h,p=n*d;t[0]=o*h,t[4]=g*l-f,t[8]=u*l+p,t[1]=o*d,t[5]=p*l+u,t[9]=f*l-g,t[2]=-l,t[6]=n*o,t[10]=a*o}else if(e.order==="YZX"){const u=a*o,f=a*l,g=n*o,p=n*l;t[0]=o*h,t[4]=p-u*d,t[8]=g*d+f,t[1]=d,t[5]=a*h,t[9]=-n*h,t[2]=-l*h,t[6]=f*d+g,t[10]=u-p*d}else if(e.order==="XZY"){const u=a*o,f=a*l,g=n*o,p=n*l;t[0]=o*h,t[4]=-d,t[8]=l*h,t[1]=u*d+p,t[5]=a*h,t[9]=f*d-g,t[2]=g*d-f,t[6]=n*h,t[10]=p*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ga,e,Ha)}lookAt(e,t,i){const r=this.elements;return dt.subVectors(e,t),dt.lengthSq()===0&&(dt.z=1),dt.normalize(),si.crossVectors(i,dt),si.lengthSq()===0&&(Math.abs(i.z)===1?dt.x+=1e-4:dt.z+=1e-4,dt.normalize(),si.crossVectors(i,dt)),si.normalize(),wr.crossVectors(dt,si),r[0]=si.x,r[4]=wr.x,r[8]=dt.x,r[1]=si.y,r[5]=wr.y,r[9]=dt.y,r[2]=si.z,r[6]=wr.z,r[10]=dt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],n=i[4],o=i[8],l=i[12],h=i[1],d=i[5],u=i[9],f=i[13],g=i[2],p=i[6],m=i[10],v=i[14],x=i[3],w=i[7],_=i[11],M=i[15],E=r[0],L=r[4],y=r[8],T=r[12],D=r[1],F=r[5],B=r[9],z=r[13],R=r[2],I=r[6],P=r[10],W=r[14],j=r[3],O=r[7],V=r[11],$=r[15];return s[0]=a*E+n*D+o*R+l*j,s[4]=a*L+n*F+o*I+l*O,s[8]=a*y+n*B+o*P+l*V,s[12]=a*T+n*z+o*W+l*$,s[1]=h*E+d*D+u*R+f*j,s[5]=h*L+d*F+u*I+f*O,s[9]=h*y+d*B+u*P+f*V,s[13]=h*T+d*z+u*W+f*$,s[2]=g*E+p*D+m*R+v*j,s[6]=g*L+p*F+m*I+v*O,s[10]=g*y+p*B+m*P+v*V,s[14]=g*T+p*z+m*W+v*$,s[3]=x*E+w*D+_*R+M*j,s[7]=x*L+w*F+_*I+M*O,s[11]=x*y+w*B+_*P+M*V,s[15]=x*T+w*z+_*W+M*$,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],a=e[1],n=e[5],o=e[9],l=e[13],h=e[2],d=e[6],u=e[10],f=e[14],g=e[3],p=e[7],m=e[11],v=e[15];return g*(+s*o*d-r*l*d-s*n*u+i*l*u+r*n*f-i*o*f)+p*(+t*o*f-t*l*u+s*a*u-r*a*f+r*l*h-s*o*h)+m*(+t*l*d-t*n*f-s*a*d+i*a*f+s*n*h-i*l*h)+v*(-r*n*h-t*o*d+t*n*u+r*a*d-i*a*u+i*o*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],n=e[5],o=e[6],l=e[7],h=e[8],d=e[9],u=e[10],f=e[11],g=e[12],p=e[13],m=e[14],v=e[15],x=d*m*l-p*u*l+p*o*f-n*m*f-d*o*v+n*u*v,w=g*u*l-h*m*l-g*o*f+a*m*f+h*o*v-a*u*v,_=h*p*l-g*d*l+g*n*f-a*p*f-h*n*v+a*d*v,M=g*d*o-h*p*o-g*n*u+a*p*u+h*n*m-a*d*m,E=t*x+i*w+r*_+s*M;if(E===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const L=1/E;return e[0]=x*L,e[1]=(p*u*s-d*m*s-p*r*f+i*m*f+d*r*v-i*u*v)*L,e[2]=(n*m*s-p*o*s+p*r*l-i*m*l-n*r*v+i*o*v)*L,e[3]=(d*o*s-n*u*s-d*r*l+i*u*l+n*r*f-i*o*f)*L,e[4]=w*L,e[5]=(h*m*s-g*u*s+g*r*f-t*m*f-h*r*v+t*u*v)*L,e[6]=(g*o*s-a*m*s-g*r*l+t*m*l+a*r*v-t*o*v)*L,e[7]=(a*u*s-h*o*s+h*r*l-t*u*l-a*r*f+t*o*f)*L,e[8]=_*L,e[9]=(g*d*s-h*p*s-g*i*f+t*p*f+h*i*v-t*d*v)*L,e[10]=(a*p*s-g*n*s+g*i*l-t*p*l-a*i*v+t*n*v)*L,e[11]=(h*n*s-a*d*s-h*i*l+t*d*l+a*i*f-t*n*f)*L,e[12]=M*L,e[13]=(h*p*r-g*d*r+g*i*u-t*p*u-h*i*m+t*d*m)*L,e[14]=(g*n*r-a*p*r-g*i*o+t*p*o+a*i*m-t*n*m)*L,e[15]=(a*d*r-h*n*r+h*i*o-t*d*o-a*i*u+t*n*u)*L,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,a=e.x,n=e.y,o=e.z,l=s*a,h=s*n;return this.set(l*a+i,l*n-r*o,l*o+r*n,0,l*n+r*o,h*n+i,h*o-r*a,0,l*o-r*n,h*o+r*a,s*o*o+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,a){return this.set(1,i,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,a=t._y,n=t._z,o=t._w,l=s+s,h=a+a,d=n+n,u=s*l,f=s*h,g=s*d,p=a*h,m=a*d,v=n*d,x=o*l,w=o*h,_=o*d,M=i.x,E=i.y,L=i.z;return r[0]=(1-(p+v))*M,r[1]=(f+_)*M,r[2]=(g-w)*M,r[3]=0,r[4]=(f-_)*E,r[5]=(1-(u+v))*E,r[6]=(m+x)*E,r[7]=0,r[8]=(g+w)*L,r[9]=(m-x)*L,r[10]=(1-(u+p))*L,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=Fi.set(r[0],r[1],r[2]).length();const a=Fi.set(r[4],r[5],r[6]).length(),n=Fi.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],Et.copy(this);const o=1/s,l=1/a,h=1/n;return Et.elements[0]*=o,Et.elements[1]*=o,Et.elements[2]*=o,Et.elements[4]*=l,Et.elements[5]*=l,Et.elements[6]*=l,Et.elements[8]*=h,Et.elements[9]*=h,Et.elements[10]*=h,t.setFromRotationMatrix(Et),i.x=s,i.y=a,i.z=n,this}makePerspective(e,t,i,r,s,a){const n=this.elements,o=2*s/(t-e),l=2*s/(i-r),h=(t+e)/(t-e),d=(i+r)/(i-r),u=-(a+s)/(a-s),f=-2*a*s/(a-s);return n[0]=o,n[4]=0,n[8]=h,n[12]=0,n[1]=0,n[5]=l,n[9]=d,n[13]=0,n[2]=0,n[6]=0,n[10]=u,n[14]=f,n[3]=0,n[7]=0,n[11]=-1,n[15]=0,this}makeOrthographic(e,t,i,r,s,a){const n=this.elements,o=1/(t-e),l=1/(i-r),h=1/(a-s),d=(t+e)*o,u=(i+r)*l,f=(a+s)*h;return n[0]=2*o,n[4]=0,n[8]=0,n[12]=-d,n[1]=0,n[5]=2*l,n[9]=0,n[13]=-u,n[2]=0,n[6]=0,n[10]=-2*h,n[14]=-f,n[3]=0,n[7]=0,n[11]=0,n[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const Fi=new k,Et=new Ze,Ga=new k(0,0,0),Ha=new k(1,1,1),si=new k,wr=new k,dt=new k,Js=new Ze,Ks=new hr;class dr{constructor(e=0,t=0,i=0,r=dr.DefaultOrder){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],a=r[4],n=r[8],o=r[1],l=r[5],h=r[9],d=r[2],u=r[6],f=r[10];switch(t){case"XYZ":this._y=Math.asin(mt(n,-1,1)),Math.abs(n)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-mt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(n,f),this._z=Math.atan2(o,l)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(mt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(o,s));break;case"ZYX":this._y=Math.asin(-mt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(o,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(mt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(n,f));break;case"XZY":this._z=Math.asin(-mt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(n,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Js.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Js,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ks.setFromEuler(this),this.setFromQuaternion(Ks,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}toVector3(){console.error("THREE.Euler: .toVector3() has been removed. Use Vector3.setFromEuler() instead")}}dr.DefaultOrder="XYZ";dr.RotationOrders=["XYZ","YZX","ZXY","XZY","YXZ","ZYX"];class sa{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Va=0;const Qs=new k,Ii=new hr,Vt=new Ze,Mr=new k,$i=new k,Wa=new k,qa=new hr,$s=new k(1,0,0),en=new k(0,1,0),tn=new k(0,0,1),ja={type:"added"},rn={type:"removed"};class at extends Xi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Va++}),this.uuid=cr(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=at.DefaultUp.clone();const e=new k,t=new dr,i=new hr,r=new k(1,1,1);function s(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Ze},normalMatrix:{value:new wt}}),this.matrix=new Ze,this.matrixWorld=new Ze,this.matrixAutoUpdate=at.DefaultMatrixAutoUpdate,this.matrixWorldNeedsUpdate=!1,this.layers=new sa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ii.setFromAxisAngle(e,t),this.quaternion.multiply(Ii),this}rotateOnWorldAxis(e,t){return Ii.setFromAxisAngle(e,t),this.quaternion.premultiply(Ii),this}rotateX(e){return this.rotateOnAxis($s,e)}rotateY(e){return this.rotateOnAxis(en,e)}rotateZ(e){return this.rotateOnAxis(tn,e)}translateOnAxis(e,t){return Qs.copy(e).applyQuaternion(this.quaternion),this.position.add(Qs.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis($s,e)}translateY(e){return this.translateOnAxis(en,e)}translateZ(e){return this.translateOnAxis(tn,e)}localToWorld(e){return e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return e.applyMatrix4(Vt.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Mr.copy(e):Mr.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),$i.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Vt.lookAt($i,Mr,this.up):Vt.lookAt(Mr,$i,this.up),this.quaternion.setFromRotationMatrix(Vt),r&&(Vt.extractRotation(r.matrixWorld),Ii.setFromRotationMatrix(Vt),this.quaternion.premultiply(Ii.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(ja)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(rn)),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){for(let e=0;e<this.children.length;e++){const t=this.children[e];t.parent=null,t.dispatchEvent(rn)}return this.children.length=0,this}attach(e){return this.updateWorldMatrix(!0,!1),Vt.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Vt.multiply(e.parent.matrixWorld)),e.applyMatrix4(Vt),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const s=this.children[i].getObjectByProperty(e,t);if(s!==void 0)return s}}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose($i,e,Wa),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose($i,qa,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.5,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),JSON.stringify(this.userData)!=="{}"&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON()));function s(n,o){return n[o.uuid]===void 0&&(n[o.uuid]=o.toJSON(e)),o.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const n=this.geometry.parameters;if(n!==void 0&&n.shapes!==void 0){const o=n.shapes;if(Array.isArray(o))for(let l=0,h=o.length;l<h;l++){const d=o[l];s(e.shapes,d)}else s(e.shapes,o)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const n=[];for(let o=0,l=this.material.length;o<l;o++)n.push(s(e.materials,this.material[o]));r.material=n}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let n=0;n<this.children.length;n++)r.children.push(this.children[n].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let n=0;n<this.animations.length;n++){const o=this.animations[n];r.animations.push(s(e.animations,o))}}if(t){const n=a(e.geometries),o=a(e.materials),l=a(e.textures),h=a(e.images),d=a(e.shapes),u=a(e.skeletons),f=a(e.animations),g=a(e.nodes);n.length>0&&(i.geometries=n),o.length>0&&(i.materials=o),l.length>0&&(i.textures=l),h.length>0&&(i.images=h),d.length>0&&(i.shapes=d),u.length>0&&(i.skeletons=u),f.length>0&&(i.animations=f),g.length>0&&(i.nodes=g)}return i.object=r,i;function a(n){const o=[];for(const l in n){const h=n[l];delete h.metadata,o.push(h)}return o}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}at.DefaultUp=new k(0,1,0);at.DefaultMatrixAutoUpdate=!0;const Tt=new k,Wt=new k,cs=new k,qt=new k,zi=new k,Ni=new k,sn=new k,hs=new k,us=new k,ds=new k;class Qt{constructor(e=new k,t=new k,i=new k){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Tt.subVectors(e,t),r.cross(Tt);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){Tt.subVectors(r,t),Wt.subVectors(i,t),cs.subVectors(e,t);const a=Tt.dot(Tt),n=Tt.dot(Wt),o=Tt.dot(cs),l=Wt.dot(Wt),h=Wt.dot(cs),d=a*l-n*n;if(d===0)return s.set(-2,-1,-1);const u=1/d,f=(l*o-n*h)*u,g=(a*h-n*o)*u;return s.set(1-f-g,g,f)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,qt),qt.x>=0&&qt.y>=0&&qt.x+qt.y<=1}static getUV(e,t,i,r,s,a,n,o){return this.getBarycoord(e,t,i,r,qt),o.set(0,0),o.addScaledVector(s,qt.x),o.addScaledVector(a,qt.y),o.addScaledVector(n,qt.z),o}static isFrontFacing(e,t,i,r){return Tt.subVectors(i,t),Wt.subVectors(e,t),Tt.cross(Wt).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Tt.subVectors(this.c,this.b),Wt.subVectors(this.a,this.b),Tt.cross(Wt).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Qt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Qt.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,i,r,s){return Qt.getUV(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return Qt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Qt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let a,n;zi.subVectors(r,i),Ni.subVectors(s,i),hs.subVectors(e,i);const o=zi.dot(hs),l=Ni.dot(hs);if(o<=0&&l<=0)return t.copy(i);us.subVectors(e,r);const h=zi.dot(us),d=Ni.dot(us);if(h>=0&&d<=h)return t.copy(r);const u=o*d-h*l;if(u<=0&&o>=0&&h<=0)return a=o/(o-h),t.copy(i).addScaledVector(zi,a);ds.subVectors(e,s);const f=zi.dot(ds),g=Ni.dot(ds);if(g>=0&&f<=g)return t.copy(s);const p=f*l-o*g;if(p<=0&&l>=0&&g<=0)return n=l/(l-g),t.copy(i).addScaledVector(Ni,n);const m=h*g-f*d;if(m<=0&&d-h>=0&&f-g>=0)return sn.subVectors(s,r),n=(d-h)/(d-h+(f-g)),t.copy(r).addScaledVector(sn,n);const v=1/(m+p+u);return a=p*v,n=u*v,t.copy(i).addScaledVector(zi,a).addScaledVector(Ni,n)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}let Xa=0;class Ei extends Xi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Xa++}),this.uuid=cr(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn("THREE.Material: '"+t+"' parameter is undefined.");continue}if(t==="shading"){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=i===1;continue}const r=this[t];if(r===void 0){console.warn("THREE."+this.type+": '"+t+"' is not a property of this material.");continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.5,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(i.blending=this.blending),this.side!==0&&(i.side=this.side),this.vertexColors&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=this.transparent),i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.stencilWrite=this.stencilWrite,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaToCoverage===!0&&(i.alphaToCoverage=this.alphaToCoverage),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=this.premultipliedAlpha),this.wireframe===!0&&(i.wireframe=this.wireframe),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=this.flatShading),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),JSON.stringify(this.userData)!=="{}"&&(i.userData=this.userData);function r(s){const a=[];for(const n in s){const o=s[n];delete o.metadata,a.push(o)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(i.textures=s),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class na extends Ei{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ce(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Ve=new k,Sr=new Le;class Ot{constructor(e,t,i){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i===!0,this.usage=35044,this.updateRange={offset:0,count:-1},this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}copyColorsArray(e){const t=this.array;let i=0;for(let r=0,s=e.length;r<s;r++){let a=e[r];a===void 0&&(console.warn("THREE.BufferAttribute.copyColorsArray(): color is undefined",r),a=new Ce),t[i++]=a.r,t[i++]=a.g,t[i++]=a.b}return this}copyVector2sArray(e){const t=this.array;let i=0;for(let r=0,s=e.length;r<s;r++){let a=e[r];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector2sArray(): vector is undefined",r),a=new Le),t[i++]=a.x,t[i++]=a.y}return this}copyVector3sArray(e){const t=this.array;let i=0;for(let r=0,s=e.length;r<s;r++){let a=e[r];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector3sArray(): vector is undefined",r),a=new k),t[i++]=a.x,t[i++]=a.y,t[i++]=a.z}return this}copyVector4sArray(e){const t=this.array;let i=0;for(let r=0,s=e.length;r<s;r++){let a=e[r];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector4sArray(): vector is undefined",r),a=new Ye),t[i++]=a.x,t[i++]=a.y,t[i++]=a.z,t[i++]=a.w}return this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Sr.fromBufferAttribute(this,t),Sr.applyMatrix3(e),this.setXY(t,Sr.x,Sr.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Ve.fromBufferAttribute(this,t),Ve.applyMatrix3(e),this.setXYZ(t,Ve.x,Ve.y,Ve.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Ve.fromBufferAttribute(this,t),Ve.applyMatrix4(e),this.setXYZ(t,Ve.x,Ve.y,Ve.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ve.fromBufferAttribute(this,t),Ve.applyNormalMatrix(e),this.setXYZ(t,Ve.x,Ve.y,Ve.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ve.fromBufferAttribute(this,t),Ve.transformDirection(e),this.setXYZ(t,Ve.x,Ve.y,Ve.z);return this}set(e,t=0){return this.array.set(e,t),this}getX(e){return this.array[e*this.itemSize]}setX(e,t){return this.array[e*this.itemSize]=t,this}getY(e){return this.array[e*this.itemSize+1]}setY(e,t){return this.array[e*this.itemSize+1]=t,this}getZ(e){return this.array[e*this.itemSize+2]}setZ(e,t){return this.array[e*this.itemSize+2]=t,this}getW(e){return this.array[e*this.itemSize+3]}setW(e,t){return this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),(this.updateRange.offset!==0||this.updateRange.count!==-1)&&(e.updateRange=this.updateRange),e}}class aa extends Ot{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class oa extends Ot{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class rt extends Ot{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Ya=0;const yt=new Ze,ps=new at,Oi=new k,pt=new ur,er=new ur,Qe=new k;class Bt extends Xi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ya++}),this.uuid=cr(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new($n(e)?oa:aa)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new wt().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return yt.makeRotationFromQuaternion(e),this.applyMatrix4(yt),this}rotateX(e){return yt.makeRotationX(e),this.applyMatrix4(yt),this}rotateY(e){return yt.makeRotationY(e),this.applyMatrix4(yt),this}rotateZ(e){return yt.makeRotationZ(e),this.applyMatrix4(yt),this}translate(e,t,i){return yt.makeTranslation(e,t,i),this.applyMatrix4(yt),this}scale(e,t,i){return yt.makeScale(e,t,i),this.applyMatrix4(yt),this}lookAt(e){return ps.lookAt(e),ps.updateMatrix(),this.applyMatrix4(ps.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Oi).negate(),this.translate(Oi.x,Oi.y,Oi.z),this}setFromPoints(e){const t=[];for(let i=0,r=e.length;i<r;i++){const s=e[i];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new rt(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ur);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new k(-1/0,-1/0,-1/0),new k(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];pt.setFromBufferAttribute(s),this.morphTargetsRelative?(Qe.addVectors(this.boundingBox.min,pt.min),this.boundingBox.expandByPoint(Qe),Qe.addVectors(this.boundingBox.max,pt.max),this.boundingBox.expandByPoint(Qe)):(this.boundingBox.expandByPoint(pt.min),this.boundingBox.expandByPoint(pt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new lr);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new k,1/0);return}if(e){const i=this.boundingSphere.center;if(pt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const n=t[s];er.setFromBufferAttribute(n),this.morphTargetsRelative?(Qe.addVectors(pt.min,er.min),pt.expandByPoint(Qe),Qe.addVectors(pt.max,er.max),pt.expandByPoint(Qe)):(pt.expandByPoint(er.min),pt.expandByPoint(er.max))}pt.getCenter(i);let r=0;for(let s=0,a=e.count;s<a;s++)Qe.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(Qe));if(t)for(let s=0,a=t.length;s<a;s++){const n=t[s],o=this.morphTargetsRelative;for(let l=0,h=n.count;l<h;l++)Qe.fromBufferAttribute(n,l),o&&(Oi.fromBufferAttribute(e,l),Qe.add(Oi)),r=Math.max(r,i.distanceToSquared(Qe))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.array,r=t.position.array,s=t.normal.array,a=t.uv.array,n=r.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ot(new Float32Array(4*n),4));const o=this.getAttribute("tangent").array,l=[],h=[];for(let D=0;D<n;D++)l[D]=new k,h[D]=new k;const d=new k,u=new k,f=new k,g=new Le,p=new Le,m=new Le,v=new k,x=new k;function w(D,F,B){d.fromArray(r,D*3),u.fromArray(r,F*3),f.fromArray(r,B*3),g.fromArray(a,D*2),p.fromArray(a,F*2),m.fromArray(a,B*2),u.sub(d),f.sub(d),p.sub(g),m.sub(g);const z=1/(p.x*m.y-m.x*p.y);!isFinite(z)||(v.copy(u).multiplyScalar(m.y).addScaledVector(f,-p.y).multiplyScalar(z),x.copy(f).multiplyScalar(p.x).addScaledVector(u,-m.x).multiplyScalar(z),l[D].add(v),l[F].add(v),l[B].add(v),h[D].add(x),h[F].add(x),h[B].add(x))}let _=this.groups;_.length===0&&(_=[{start:0,count:i.length}]);for(let D=0,F=_.length;D<F;++D){const B=_[D],z=B.start,R=B.count;for(let I=z,P=z+R;I<P;I+=3)w(i[I+0],i[I+1],i[I+2])}const M=new k,E=new k,L=new k,y=new k;function T(D){L.fromArray(s,D*3),y.copy(L);const F=l[D];M.copy(F),M.sub(L.multiplyScalar(L.dot(F))).normalize(),E.crossVectors(y,F);const B=E.dot(h[D])<0?-1:1;o[D*4]=M.x,o[D*4+1]=M.y,o[D*4+2]=M.z,o[D*4+3]=B}for(let D=0,F=_.length;D<F;++D){const B=_[D],z=B.start,R=B.count;for(let I=z,P=z+R;I<P;I+=3)T(i[I+0]),T(i[I+1]),T(i[I+2])}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Ot(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let u=0,f=i.count;u<f;u++)i.setXYZ(u,0,0,0);const r=new k,s=new k,a=new k,n=new k,o=new k,l=new k,h=new k,d=new k;if(e)for(let u=0,f=e.count;u<f;u+=3){const g=e.getX(u+0),p=e.getX(u+1),m=e.getX(u+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),h.subVectors(a,s),d.subVectors(r,s),h.cross(d),n.fromBufferAttribute(i,g),o.fromBufferAttribute(i,p),l.fromBufferAttribute(i,m),n.add(h),o.add(h),l.add(h),i.setXYZ(g,n.x,n.y,n.z),i.setXYZ(p,o.x,o.y,o.z),i.setXYZ(m,l.x,l.y,l.z)}else for(let u=0,f=t.count;u<f;u+=3)r.fromBufferAttribute(t,u+0),s.fromBufferAttribute(t,u+1),a.fromBufferAttribute(t,u+2),h.subVectors(a,s),d.subVectors(r,s),h.cross(d),i.setXYZ(u+0,h.x,h.y,h.z),i.setXYZ(u+1,h.x,h.y,h.z),i.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}merge(e,t){if(!(e&&e.isBufferGeometry)){console.error("THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.",e);return}t===void 0&&(t=0,console.warn("THREE.BufferGeometry.merge(): Overwriting original geometry, starting at offset=0. Use BufferGeometryUtils.mergeBufferGeometries() for lossless merge."));const i=this.attributes;for(const r in i){if(e.attributes[r]===void 0)continue;const s=i[r].array,a=e.attributes[r],n=a.array,o=a.itemSize*t,l=Math.min(n.length,s.length-o);for(let h=0,d=o;h<l;h++,d++)s[d]=n[h]}return this}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Qe.fromBufferAttribute(e,t),Qe.normalize(),e.setXYZ(t,Qe.x,Qe.y,Qe.z)}toNonIndexed(){function e(n,o){const l=n.array,h=n.itemSize,d=n.normalized,u=new l.constructor(o.length*h);let f=0,g=0;for(let p=0,m=o.length;p<m;p++){n.isInterleavedBufferAttribute?f=o[p]*n.data.stride+n.offset:f=o[p]*h;for(let v=0;v<h;v++)u[g++]=l[f++]}return new Ot(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Bt,i=this.index.array,r=this.attributes;for(const n in r){const o=r[n],l=e(o,i);t.setAttribute(n,l)}const s=this.morphAttributes;for(const n in s){const o=[],l=s[n];for(let h=0,d=l.length;h<d;h++){const u=l[h],f=e(u,i);o.push(f)}t.morphAttributes[n]=o}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let n=0,o=a.length;n<o;n++){const l=a[n];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.5,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const o=this.parameters;for(const l in o)o[l]!==void 0&&(e[l]=o[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const o in i){const l=i[o];e.data.attributes[o]=l.toJSON(e.data)}const r={};let s=!1;for(const o in this.morphAttributes){const l=this.morphAttributes[o],h=[];for(let d=0,u=l.length;d<u;d++){const f=l[d];h.push(f.toJSON(e.data))}h.length>0&&(r[o]=h,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const n=this.boundingSphere;return n!==null&&(e.data.boundingSphere={center:n.center.toArray(),radius:n.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone(t));const r=e.attributes;for(const l in r){const h=r[l];this.setAttribute(l,h.clone(t))}const s=e.morphAttributes;for(const l in s){const h=[],d=s[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let l=0,h=a.length;l<h;l++){const d=a[l];this.addGroup(d.start,d.count,d.materialIndex)}const n=e.boundingBox;n!==null&&(this.boundingBox=n.clone());const o=e.boundingSphere;return o!==null&&(this.boundingSphere=o.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,e.parameters!==void 0&&(this.parameters=Object.assign({},e.parameters)),this}dispose(){this.dispatchEvent({type:"dispose"})}}const nn=new Ze,Bi=new Ua,ms=new lr,ni=new k,ai=new k,oi=new k,fs=new k,gs=new k,vs=new k,Er=new k,Tr=new k,Ar=new k,Cr=new Le,Lr=new Le,Rr=new Le,xs=new k,Dr=new k;class Nt extends at{constructor(e=new Bt,t=new na){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=e.material,this.geometry=e.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){const i=e[t[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,s=i.length;r<s;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;if(r===void 0||(i.boundingSphere===null&&i.computeBoundingSphere(),ms.copy(i.boundingSphere),ms.applyMatrix4(s),e.ray.intersectsSphere(ms)===!1)||(nn.copy(s).invert(),Bi.copy(e.ray).applyMatrix4(nn),i.boundingBox!==null&&Bi.intersectsBox(i.boundingBox)===!1))return;let a;const n=i.index,o=i.attributes.position,l=i.morphAttributes.position,h=i.morphTargetsRelative,d=i.attributes.uv,u=i.attributes.uv2,f=i.groups,g=i.drawRange;if(n!==null)if(Array.isArray(r))for(let p=0,m=f.length;p<m;p++){const v=f[p],x=r[v.materialIndex],w=Math.max(v.start,g.start),_=Math.min(n.count,Math.min(v.start+v.count,g.start+g.count));for(let M=w,E=_;M<E;M+=3){const L=n.getX(M),y=n.getX(M+1),T=n.getX(M+2);a=Pr(this,x,e,Bi,o,l,h,d,u,L,y,T),a&&(a.faceIndex=Math.floor(M/3),a.face.materialIndex=v.materialIndex,t.push(a))}}else{const p=Math.max(0,g.start),m=Math.min(n.count,g.start+g.count);for(let v=p,x=m;v<x;v+=3){const w=n.getX(v),_=n.getX(v+1),M=n.getX(v+2);a=Pr(this,r,e,Bi,o,l,h,d,u,w,_,M),a&&(a.faceIndex=Math.floor(v/3),t.push(a))}}else if(o!==void 0)if(Array.isArray(r))for(let p=0,m=f.length;p<m;p++){const v=f[p],x=r[v.materialIndex],w=Math.max(v.start,g.start),_=Math.min(o.count,Math.min(v.start+v.count,g.start+g.count));for(let M=w,E=_;M<E;M+=3){const L=M,y=M+1,T=M+2;a=Pr(this,x,e,Bi,o,l,h,d,u,L,y,T),a&&(a.faceIndex=Math.floor(M/3),a.face.materialIndex=v.materialIndex,t.push(a))}}else{const p=Math.max(0,g.start),m=Math.min(o.count,g.start+g.count);for(let v=p,x=m;v<x;v+=3){const w=v,_=v+1,M=v+2;a=Pr(this,r,e,Bi,o,l,h,d,u,w,_,M),a&&(a.faceIndex=Math.floor(v/3),t.push(a))}}}}function Za(c,e,t,i,r,s,a,n){let o;if(e.side===1?o=i.intersectTriangle(a,s,r,!0,n):o=i.intersectTriangle(r,s,a,e.side!==2,n),o===null)return null;Dr.copy(n),Dr.applyMatrix4(c.matrixWorld);const l=t.ray.origin.distanceTo(Dr);return l<t.near||l>t.far?null:{distance:l,point:Dr.clone(),object:c}}function Pr(c,e,t,i,r,s,a,n,o,l,h,d){ni.fromBufferAttribute(r,l),ai.fromBufferAttribute(r,h),oi.fromBufferAttribute(r,d);const u=c.morphTargetInfluences;if(s&&u){Er.set(0,0,0),Tr.set(0,0,0),Ar.set(0,0,0);for(let g=0,p=s.length;g<p;g++){const m=u[g],v=s[g];m!==0&&(fs.fromBufferAttribute(v,l),gs.fromBufferAttribute(v,h),vs.fromBufferAttribute(v,d),a?(Er.addScaledVector(fs,m),Tr.addScaledVector(gs,m),Ar.addScaledVector(vs,m)):(Er.addScaledVector(fs.sub(ni),m),Tr.addScaledVector(gs.sub(ai),m),Ar.addScaledVector(vs.sub(oi),m)))}ni.add(Er),ai.add(Tr),oi.add(Ar)}c.isSkinnedMesh&&(c.boneTransform(l,ni),c.boneTransform(h,ai),c.boneTransform(d,oi));const f=Za(c,e,t,i,ni,ai,oi,xs);if(f){n&&(Cr.fromBufferAttribute(n,l),Lr.fromBufferAttribute(n,h),Rr.fromBufferAttribute(n,d),f.uv=Qt.getUV(xs,ni,ai,oi,Cr,Lr,Rr,new Le)),o&&(Cr.fromBufferAttribute(o,l),Lr.fromBufferAttribute(o,h),Rr.fromBufferAttribute(o,d),f.uv2=Qt.getUV(xs,ni,ai,oi,Cr,Lr,Rr,new Le));const g={a:l,b:h,c:d,normal:new k,materialIndex:0};Qt.getNormal(ni,ai,oi,g.normal),f.face=g}return f}class pr extends Bt{constructor(e=1,t=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};const n=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const o=[],l=[],h=[],d=[];let u=0,f=0;g("z","y","x",-1,-1,i,t,e,a,s,0),g("z","y","x",1,-1,i,t,-e,a,s,1),g("x","z","y",1,1,e,i,t,r,a,2),g("x","z","y",1,-1,e,i,-t,r,a,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(o),this.setAttribute("position",new rt(l,3)),this.setAttribute("normal",new rt(h,3)),this.setAttribute("uv",new rt(d,2));function g(p,m,v,x,w,_,M,E,L,y,T){const D=_/L,F=M/y,B=_/2,z=M/2,R=E/2,I=L+1,P=y+1;let W=0,j=0;const O=new k;for(let V=0;V<P;V++){const $=V*F-z;for(let H=0;H<I;H++){const Q=H*D-B;O[p]=Q*x,O[m]=$*w,O[v]=R,l.push(O.x,O.y,O.z),O[p]=0,O[m]=0,O[v]=E>0?1:-1,h.push(O.x,O.y,O.z),d.push(H/L),d.push(1-V/y),W+=1}}for(let V=0;V<y;V++)for(let $=0;$<L;$++){const H=u+$+I*V,Q=u+$+I*(V+1),he=u+($+1)+I*(V+1),Ee=u+($+1)+I*V;o.push(H,Q,Ee),o.push(Q,he,Ee),j+=6}n.addGroup(f,j,T),f+=j,u+=W}}static fromJSON(e){return new pr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function ji(c){const e={};for(const t in c){e[t]={};for(const i in c[t]){const r=c[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function it(c){const e={};for(let t=0;t<c.length;t++){const i=ji(c[t]);for(const r in i)e[r]=i[r]}return e}function Ja(c){const e=[];for(let t=0;t<c.length;t++)e.push(c[t].clone());return e}const Ka={clone:ji,merge:it};var Qa=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,$a=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Si extends Ei{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Qa,this.fragmentShader=$a,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv2:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&(e.attributes!==void 0&&console.error("THREE.ShaderMaterial: attributes should now be defined in THREE.BufferGeometry instead."),this.setValues(e))}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ji(e.uniforms),this.uniformsGroups=Ja(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const s=this.uniforms[r].value;s&&s.isTexture?t.uniforms[r]={type:"t",value:s.toJSON(e).uuid}:s&&s.isColor?t.uniforms[r]={type:"c",value:s.getHex()}:s&&s.isVector2?t.uniforms[r]={type:"v2",value:s.toArray()}:s&&s.isVector3?t.uniforms[r]={type:"v3",value:s.toArray()}:s&&s.isVector4?t.uniforms[r]={type:"v4",value:s.toArray()}:s&&s.isMatrix3?t.uniforms[r]={type:"m3",value:s.toArray()}:s&&s.isMatrix4?t.uniforms[r]={type:"m4",value:s.toArray()}:t.uniforms[r]={value:s}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class la extends at{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ze,this.projectionMatrix=new Ze,this.projectionMatrixInverse=new Ze}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(-t[8],-t[9],-t[10]).normalize()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}class ft extends la{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Fs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Kr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Fs*2*Math.atan(Math.tan(Kr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,i,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Kr*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const o=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/o,t-=a.offsetY*i/l,r*=a.width/o,i*=a.height/l}const n=this.filmOffset;n!==0&&(s+=e*n/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ki=90,Ui=1;class eo extends at{constructor(e,t,i){if(super(),this.type="CubeCamera",i.isWebGLCubeRenderTarget!==!0){console.error("THREE.CubeCamera: The constructor now expects an instance of WebGLCubeRenderTarget as third parameter.");return}this.renderTarget=i;const r=new ft(ki,Ui,e,t);r.layers=this.layers,r.up.set(0,-1,0),r.lookAt(new k(1,0,0)),this.add(r);const s=new ft(ki,Ui,e,t);s.layers=this.layers,s.up.set(0,-1,0),s.lookAt(new k(-1,0,0)),this.add(s);const a=new ft(ki,Ui,e,t);a.layers=this.layers,a.up.set(0,0,1),a.lookAt(new k(0,1,0)),this.add(a);const n=new ft(ki,Ui,e,t);n.layers=this.layers,n.up.set(0,0,-1),n.lookAt(new k(0,-1,0)),this.add(n);const o=new ft(ki,Ui,e,t);o.layers=this.layers,o.up.set(0,-1,0),o.lookAt(new k(0,0,1)),this.add(o);const l=new ft(ki,Ui,e,t);l.layers=this.layers,l.up.set(0,-1,0),l.lookAt(new k(0,0,-1)),this.add(l)}update(e,t){this.parent===null&&this.updateMatrixWorld();const i=this.renderTarget,[r,s,a,n,o,l]=this.children,h=e.getRenderTarget(),d=e.toneMapping,u=e.xr.enabled;e.toneMapping=0,e.xr.enabled=!1;const f=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0),e.render(t,r),e.setRenderTarget(i,1),e.render(t,s),e.setRenderTarget(i,2),e.render(t,a),e.setRenderTarget(i,3),e.render(t,n),e.setRenderTarget(i,4),e.render(t,o),i.texture.generateMipmaps=f,e.setRenderTarget(i,5),e.render(t,l),e.setRenderTarget(h),e.toneMapping=d,e.xr.enabled=u,i.texture.needsPMREMUpdate=!0}}class ca extends gt{constructor(e,t,i,r,s,a,n,o,l,h){e=e!==void 0?e:[],t=t!==void 0?t:301,super(e,t,i,r,s,a,n,o,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class to extends Mi{constructor(e,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new ca(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.encoding),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:1006}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.encoding=t.encoding,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new pr(5,5,5),s=new Si({name:"CubemapFromEquirect",uniforms:ji(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:1,blending:0});s.uniforms.tEquirect.value=t;const a=new Nt(r,s),n=t.minFilter;return t.minFilter===1008&&(t.minFilter=1006),new eo(1,10,this).update(e,a),t.minFilter=n,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,i,r){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,r);e.setRenderTarget(s)}}const _s=new k,io=new k,ro=new wt;class mi{constructor(e=new k(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=_s.subVectors(i,t).cross(io.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(this.normal).multiplyScalar(-this.distanceToPoint(e)).add(e)}intersectLine(e,t){const i=e.delta(_s),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(i).multiplyScalar(s).add(e.start)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||ro.getNormalMatrix(e),r=this.coplanarPoint(_s).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Gi=new lr,Fr=new k;class Os{constructor(e=new mi,t=new mi,i=new mi,r=new mi,s=new mi,a=new mi){this.planes=[e,t,i,r,s,a]}set(e,t,i,r,s,a){const n=this.planes;return n[0].copy(e),n[1].copy(t),n[2].copy(i),n[3].copy(r),n[4].copy(s),n[5].copy(a),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e){const t=this.planes,i=e.elements,r=i[0],s=i[1],a=i[2],n=i[3],o=i[4],l=i[5],h=i[6],d=i[7],u=i[8],f=i[9],g=i[10],p=i[11],m=i[12],v=i[13],x=i[14],w=i[15];return t[0].setComponents(n-r,d-o,p-u,w-m).normalize(),t[1].setComponents(n+r,d+o,p+u,w+m).normalize(),t[2].setComponents(n+s,d+l,p+f,w+v).normalize(),t[3].setComponents(n-s,d-l,p-f,w-v).normalize(),t[4].setComponents(n-a,d-h,p-g,w-x).normalize(),t[5].setComponents(n+a,d+h,p+g,w+x).normalize(),this}intersectsObject(e){const t=e.geometry;return t.boundingSphere===null&&t.computeBoundingSphere(),Gi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld),this.intersectsSphere(Gi)}intersectsSprite(e){return Gi.center.set(0,0,0),Gi.radius=.7071067811865476,Gi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Gi)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(Fr.x=r.normal.x>0?e.max.x:e.min.x,Fr.y=r.normal.y>0?e.max.y:e.min.y,Fr.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Fr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function ha(){let c=null,e=!1,t=null,i=null;function r(s,a){t(s,a),i=c.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=c.requestAnimationFrame(r),e=!0)},stop:function(){c.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){c=s}}}function so(c,e){const t=e.isWebGL2,i=new WeakMap;function r(l,h){const d=l.array,u=l.usage,f=c.createBuffer();c.bindBuffer(h,f),c.bufferData(h,d,u),l.onUploadCallback();let g;if(d instanceof Float32Array)g=5126;else if(d instanceof Uint16Array)if(l.isFloat16BufferAttribute)if(t)g=5131;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else g=5123;else if(d instanceof Int16Array)g=5122;else if(d instanceof Uint32Array)g=5125;else if(d instanceof Int32Array)g=5124;else if(d instanceof Int8Array)g=5120;else if(d instanceof Uint8Array)g=5121;else if(d instanceof Uint8ClampedArray)g=5121;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:f,type:g,bytesPerElement:d.BYTES_PER_ELEMENT,version:l.version}}function s(l,h,d){const u=h.array,f=h.updateRange;c.bindBuffer(d,l),f.count===-1?c.bufferSubData(d,0,u):(t?c.bufferSubData(d,f.offset*u.BYTES_PER_ELEMENT,u,f.offset,f.count):c.bufferSubData(d,f.offset*u.BYTES_PER_ELEMENT,u.subarray(f.offset,f.offset+f.count)),f.count=-1)}function a(l){return l.isInterleavedBufferAttribute&&(l=l.data),i.get(l)}function n(l){l.isInterleavedBufferAttribute&&(l=l.data);const h=i.get(l);h&&(c.deleteBuffer(h.buffer),i.delete(l))}function o(l,h){if(l.isGLBufferAttribute){const u=i.get(l);(!u||u.version<l.version)&&i.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}l.isInterleavedBufferAttribute&&(l=l.data);const d=i.get(l);d===void 0?i.set(l,r(l,h)):d.version<l.version&&(s(d.buffer,l,h),d.version=l.version)}return{get:a,remove:n,update:o}}class qr extends Bt{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,a=t/2,n=Math.floor(i),o=Math.floor(r),l=n+1,h=o+1,d=e/n,u=t/o,f=[],g=[],p=[],m=[];for(let v=0;v<h;v++){const x=v*u-a;for(let w=0;w<l;w++){const _=w*d-s;g.push(_,-x,0),p.push(0,0,1),m.push(w/n),m.push(1-v/o)}}for(let v=0;v<o;v++)for(let x=0;x<n;x++){const w=x+l*v,_=x+l*(v+1),M=x+1+l*(v+1),E=x+1+l*v;f.push(w,_,E),f.push(_,M,E)}this.setIndex(f),this.setAttribute("position",new rt(g,3)),this.setAttribute("normal",new rt(p,3)),this.setAttribute("uv",new rt(m,2))}static fromJSON(e){return new qr(e.width,e.height,e.widthSegments,e.heightSegments)}}var no=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vUv ).g;
#endif`,ao=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,oo=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,lo=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,co=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ho=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,uo="vec3 transformed = vec3( position );",po=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,mo=`vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 f0, const in float f90, const in float roughness ) {
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
	float D = D_GGX( alpha, dotNH );
	return F * ( V * D );
}
#ifdef USE_IRIDESCENCE
	vec3 BRDF_GGX_Iridescence( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 f0, const in float f90, const in float iridescence, const in vec3 iridescenceFresnel, const in float roughness ) {
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = mix( F_Schlick( f0, f90, dotVH ), iridescenceFresnel, iridescence );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif`,fo=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			 return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float R21 = R12;
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,go=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vUv );
		vec2 dSTdy = dFdy( vUv );
		float Hll = bumpScale * texture2D( bumpMap, vUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = dFdx( surf_pos.xyz );
		vec3 vSigmaY = dFdy( surf_pos.xyz );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,vo=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,xo=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,_o=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,yo=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,bo=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,wo=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Mo=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,So=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Eo=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal;
#endif
};
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}`,To=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define r0 1.0
	#define v0 0.339
	#define m0 - 2.0
	#define r1 0.8
	#define v1 0.276
	#define m1 - 1.0
	#define r4 0.4
	#define v4 0.046
	#define m4 2.0
	#define r5 0.305
	#define v5 0.016
	#define m5 3.0
	#define r6 0.21
	#define v6 0.0038
	#define m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= r1 ) {
			mip = ( r0 - roughness ) * ( m1 - m0 ) / ( r0 - r1 ) + m0;
		} else if ( roughness >= r4 ) {
			mip = ( r1 - roughness ) * ( m4 - m1 ) / ( r1 - r4 ) + m1;
		} else if ( roughness >= r5 ) {
			mip = ( r4 - roughness ) * ( m5 - m4 ) / ( r4 - r5 ) + m4;
		} else if ( roughness >= r6 ) {
			mip = ( r5 - roughness ) * ( m6 - m5 ) / ( r5 - r6 ) + m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Ao=`vec3 transformedNormal = objectNormal;
#ifdef USE_INSTANCING
	mat3 m = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
	transformedNormal = m * transformedNormal;
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Co=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Lo=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
#endif`,Ro=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Do=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Po="gl_FragColor = linearToOutputTexel( gl_FragColor );",Fo=`vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Io=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 envColor = textureCubeUV( envMap, reflectVec, 0.0 );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,zo=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,No=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Oo=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) ||defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Bo=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ko=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Uo=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Go=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ho=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Vo=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		return ( coord.x < 0.7 ) ? vec3( 0.7 ) : vec3( 1.0 );
	#endif
}`,Wo=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vUv2 );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,qo=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,jo=`vec3 diffuse = vec3( 1.0 );
GeometricContext geometry;
geometry.position = mvPosition.xyz;
geometry.normal = normalize( transformedNormal );
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( -mvPosition.xyz );
GeometricContext backGeometry;
backGeometry.position = geometry.position;
backGeometry.normal = -geometry.normal;
backGeometry.viewDir = geometry.viewDir;
vLightFront = vec3( 0.0 );
vIndirectFront = vec3( 0.0 );
#ifdef DOUBLE_SIDED
	vLightBack = vec3( 0.0 );
	vIndirectBack = vec3( 0.0 );
#endif
IncidentLight directLight;
float dotNL;
vec3 directLightColor_Diffuse;
vIndirectFront += getAmbientLightIrradiance( ambientLightColor );
vIndirectFront += getLightProbeIrradiance( lightProbe, geometry.normal );
#ifdef DOUBLE_SIDED
	vIndirectBack += getAmbientLightIrradiance( ambientLightColor );
	vIndirectBack += getLightProbeIrradiance( lightProbe, backGeometry.normal );
#endif
#if NUM_POINT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		getPointLightInfo( pointLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_SPOT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		getSpotLightInfo( spotLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_DIR_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		getDirectionalLightInfo( directionalLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_HEMI_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
		vIndirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
		#ifdef DOUBLE_SIDED
			vIndirectBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry.normal );
		#endif
	}
	#pragma unroll_loop_end
#endif`,Xo=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
uniform vec3 lightProbe[ 9 ];
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( PHYSICALLY_CORRECT_LIGHTS )
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#else
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometry.position;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometry.position;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Yo=`#if defined( USE_ENVMAP )
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#if defined( ENVMAP_TYPE_CUBE_UV )
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#if defined( ENVMAP_TYPE_CUBE_UV )
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
#endif`,Zo=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Jo=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometry.normal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon
#define Material_LightProbeLOD( material )	(0)`,Ko=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Qo=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong
#define Material_LightProbeLOD( material )	(0)`,$o=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	#ifdef SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULARINTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vUv ).a;
		#endif
		#ifdef USE_SPECULARCOLORMAP
			specularColorFactor *= texture2D( specularColorMap, vUv ).rgb;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEENCOLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEENROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vUv ).a;
	#endif
#endif`,el=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
};
vec3 clearcoatSpecular = vec3( 0.0 );
vec3 sheenSpecular = vec3( 0.0 );
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometry.normal;
		vec3 viewDir = geometry.viewDir;
		vec3 position = geometry.position;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometry.clearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecular += ccIrradiance * BRDF_GGX( directLight.direction, geometry.viewDir, geometry.clearcoatNormal, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecular += irradiance * BRDF_Sheen( directLight.direction, geometry.viewDir, geometry.normal, material.sheenColor, material.sheenRoughness );
	#endif
	#ifdef USE_IRIDESCENCE
		reflectedLight.directSpecular += irradiance * BRDF_GGX_Iridescence( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness );
	#else
		reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularF90, material.roughness );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecular += clearcoatRadiance * EnvironmentBRDF( geometry.clearcoatNormal, geometry.viewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecular += irradiance * material.sheenColor * IBLSheenBRDF( geometry.normal, geometry.viewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometry.normal, geometry.viewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometry.normal, geometry.viewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,tl=`
GeometricContext geometry;
geometry.position = - vViewPosition;
geometry.normal = normal;
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
#ifdef USE_CLEARCOAT
	geometry.clearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometry.viewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,il=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vUv2 );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometry.normal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	radiance += getIBLRadiance( geometry.viewDir, geometry.normal, material.roughness );
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,rl=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometry, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometry, material, reflectedLight );
#endif`,sl=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,nl=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,al=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,ol=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,ll=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,cl=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,hl=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,ul=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	uniform mat3 uvTransform;
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dl=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vUv );
	metalnessFactor *= texelMetalness.b;
#endif`,pl=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,ml=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,fl=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,gl=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,vl=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,xl=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = vec3( dFdx( vViewPosition.x ), dFdx( vViewPosition.y ), dFdx( vViewPosition.z ) );
	vec3 fdy = vec3( dFdy( vViewPosition.x ), dFdy( vViewPosition.y ), dFdy( vViewPosition.z ) );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	#ifdef USE_TANGENT
		vec3 tangent = normalize( vTangent );
		vec3 bitangent = normalize( vBitangent );
		#ifdef DOUBLE_SIDED
			tangent = tangent * faceDirection;
			bitangent = bitangent * faceDirection;
		#endif
		#if defined( TANGENTSPACE_NORMALMAP ) || defined( USE_CLEARCOAT_NORMALMAP )
			mat3 vTBN = mat3( tangent, bitangent, normal );
		#endif
	#endif
#endif
vec3 geometryNormal = normal;`,_l=`#ifdef OBJECTSPACE_NORMALMAP
	normal = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( TANGENTSPACE_NORMALMAP )
	vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	#ifdef USE_TANGENT
		normal = normalize( vTBN * mapN );
	#else
		normal = perturbNormal2Arb( - vViewPosition, normal, mapN, faceDirection );
	#endif
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,yl=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,bl=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wl=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Ml=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef OBJECTSPACE_NORMALMAP
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( TANGENTSPACE_NORMALMAP ) || defined ( USE_CLEARCOAT_NORMALMAP ) )
	vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( vUv.st );
		vec2 st1 = dFdy( vUv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );
		return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );
	}
#endif`,Sl=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = geometryNormal;
#endif`,El=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	#ifdef USE_TANGENT
		clearcoatNormal = normalize( vTBN * clearcoatMapN );
	#else
		clearcoatNormal = perturbNormal2Arb( - vViewPosition, clearcoatNormal, clearcoatMapN, faceDirection );
	#endif
#endif`,Tl=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif`,Al=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Cl=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= transmissionAlpha + 0.1;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Ll=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
	return linearClipZ * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * invClipZ - far );
}`,Rl=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Dl=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Pl=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Fl=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Il=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vUv );
	roughnessFactor *= texelRoughness.g;
#endif`,zl=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Nl=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
		bool inFrustum = all( inFrustumVec );
		bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
		bool frustumTest = all( frustumTestVec );
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,Ol=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform mat4 spotShadowMatrix[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Bl=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		vec4 shadowWorldPosition;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
		vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias, 0 );
		vSpotShadowCoord[ i ] = spotShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
		vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
#endif`,kl=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Ul=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Gl=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	uniform int boneTextureSize;
	mat4 getBoneMatrix( const in float i ) {
		float j = i * 4.0;
		float x = mod( j, float( boneTextureSize ) );
		float y = floor( j / float( boneTextureSize ) );
		float dx = 1.0 / float( boneTextureSize );
		float dy = 1.0 / float( boneTextureSize );
		y = dy * ( y + 0.5 );
		vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
		vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
		vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
		vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
		mat4 bone = mat4( v1, v2, v3, v4 );
		return bone;
	}
#endif`,Hl=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Vl=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Wl=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ql=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,jl=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Xl=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return toneMappingExposure * color;
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Yl=`#ifdef USE_TRANSMISSION
	float transmissionAlpha = 1.0;
	float transmissionFactor = transmission;
	float thicknessFactor = thickness;
	#ifdef USE_TRANSMISSIONMAP
		transmissionFactor *= texture2D( transmissionMap, vUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		thicknessFactor *= texture2D( thicknessMap, vUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmission = getIBLVolumeRefraction(
		n, v, roughnessFactor, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, ior, thicknessFactor,
		attenuationColor, attenuationDistance );
	totalDiffuse = mix( totalDiffuse, transmission.rgb, transmissionFactor );
	transmissionAlpha = mix( transmissionAlpha, transmission.a, transmissionFactor );
#endif`,Zl=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float framebufferLod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		#ifdef texture2DLodEXT
			return texture2DLodEXT( transmissionSamplerMap, fragCoord.xy, framebufferLod );
		#else
			return texture2D( transmissionSamplerMap, fragCoord.xy, framebufferLod );
		#endif
	}
	vec3 applyVolumeAttenuation( const in vec3 radiance, const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( attenuationDistance == 0.0 ) {
			return radiance;
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance * radiance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 attenuatedColor = applyVolumeAttenuation( transmittedLight.rgb, length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
	}
#endif`,Jl=`#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
	varying vec2 vUv;
#endif`,Kl=`#ifdef USE_UV
	#ifdef UVS_VERTEX_ONLY
		vec2 vUv;
	#else
		varying vec2 vUv;
	#endif
	uniform mat3 uvTransform;
#endif`,Ql=`#ifdef USE_UV
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
#endif`,$l=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	varying vec2 vUv2;
#endif`,ec=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	attribute vec2 uv2;
	varying vec2 vUv2;
	uniform mat3 uv2Transform;
#endif`,tc=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
#endif`,ic=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION )
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const rc=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,sc=`uniform sampler2D t2D;
varying vec2 vUv;
void main() {
	gl_FragColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		gl_FragColor = vec4( mix( pow( gl_FragColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), gl_FragColor.rgb * 0.0773993808, vec3( lessThanEqual( gl_FragColor.rgb, vec3( 0.04045 ) ) ) ), gl_FragColor.w );
	#endif
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,nc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ac=`#include <envmap_common_pars_fragment>
uniform float opacity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	vec3 vReflect = vWorldDirection;
	#include <envmap_fragment>
	gl_FragColor = envColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,oc=`#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,lc=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,cc=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,hc=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,uc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,dc=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,pc=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,mc=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,fc=`#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,gc=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vUv2 );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vc=`#define LAMBERT
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars_begin>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xc=`uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <emissivemap_fragment>
	#ifdef DOUBLE_SIDED
		reflectedLight.indirectDiffuse += ( gl_FrontFacing ) ? vIndirectFront : vIndirectBack;
	#else
		reflectedLight.indirectDiffuse += vIndirectFront;
	#endif
	#include <lightmap_fragment>
	reflectedLight.indirectDiffuse *= BRDF_Lambert( diffuseColor.rgb );
	#ifdef DOUBLE_SIDED
		reflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;
	#else
		reflectedLight.directDiffuse = vLightFront;
	#endif
	reflectedLight.directDiffuse *= BRDF_Lambert( diffuseColor.rgb ) * getShadowMask();
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_c=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,yc=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bc=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	vViewPosition = - mvPosition.xyz;
#endif
}`,wc=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Mc=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sc=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ec=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Tc=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULARINTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
	#ifdef USE_SPECULARCOLORMAP
		uniform sampler2D specularColorMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEENCOLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEENROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <bsdfs>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecular;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometry.clearcoatNormal, geometry.viewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + clearcoatSpecular * material.clearcoat;
	#endif
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ac=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cc=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lc=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Rc=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Dc=`#include <common>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pc=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,Fc=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ic=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,Se={alphamap_fragment:no,alphamap_pars_fragment:ao,alphatest_fragment:oo,alphatest_pars_fragment:lo,aomap_fragment:co,aomap_pars_fragment:ho,begin_vertex:uo,beginnormal_vertex:po,bsdfs:mo,iridescence_fragment:fo,bumpmap_pars_fragment:go,clipping_planes_fragment:vo,clipping_planes_pars_fragment:xo,clipping_planes_pars_vertex:_o,clipping_planes_vertex:yo,color_fragment:bo,color_pars_fragment:wo,color_pars_vertex:Mo,color_vertex:So,common:Eo,cube_uv_reflection_fragment:To,defaultnormal_vertex:Ao,displacementmap_pars_vertex:Co,displacementmap_vertex:Lo,emissivemap_fragment:Ro,emissivemap_pars_fragment:Do,encodings_fragment:Po,encodings_pars_fragment:Fo,envmap_fragment:Io,envmap_common_pars_fragment:zo,envmap_pars_fragment:No,envmap_pars_vertex:Oo,envmap_physical_pars_fragment:Yo,envmap_vertex:Bo,fog_vertex:ko,fog_pars_vertex:Uo,fog_fragment:Go,fog_pars_fragment:Ho,gradientmap_pars_fragment:Vo,lightmap_fragment:Wo,lightmap_pars_fragment:qo,lights_lambert_vertex:jo,lights_pars_begin:Xo,lights_toon_fragment:Zo,lights_toon_pars_fragment:Jo,lights_phong_fragment:Ko,lights_phong_pars_fragment:Qo,lights_physical_fragment:$o,lights_physical_pars_fragment:el,lights_fragment_begin:tl,lights_fragment_maps:il,lights_fragment_end:rl,logdepthbuf_fragment:sl,logdepthbuf_pars_fragment:nl,logdepthbuf_pars_vertex:al,logdepthbuf_vertex:ol,map_fragment:ll,map_pars_fragment:cl,map_particle_fragment:hl,map_particle_pars_fragment:ul,metalnessmap_fragment:dl,metalnessmap_pars_fragment:pl,morphcolor_vertex:ml,morphnormal_vertex:fl,morphtarget_pars_vertex:gl,morphtarget_vertex:vl,normal_fragment_begin:xl,normal_fragment_maps:_l,normal_pars_fragment:yl,normal_pars_vertex:bl,normal_vertex:wl,normalmap_pars_fragment:Ml,clearcoat_normal_fragment_begin:Sl,clearcoat_normal_fragment_maps:El,clearcoat_pars_fragment:Tl,iridescence_pars_fragment:Al,output_fragment:Cl,packing:Ll,premultiplied_alpha_fragment:Rl,project_vertex:Dl,dithering_fragment:Pl,dithering_pars_fragment:Fl,roughnessmap_fragment:Il,roughnessmap_pars_fragment:zl,shadowmap_pars_fragment:Nl,shadowmap_pars_vertex:Ol,shadowmap_vertex:Bl,shadowmask_pars_fragment:kl,skinbase_vertex:Ul,skinning_pars_vertex:Gl,skinning_vertex:Hl,skinnormal_vertex:Vl,specularmap_fragment:Wl,specularmap_pars_fragment:ql,tonemapping_fragment:jl,tonemapping_pars_fragment:Xl,transmission_fragment:Yl,transmission_pars_fragment:Zl,uv_pars_fragment:Jl,uv_pars_vertex:Kl,uv_vertex:Ql,uv2_pars_fragment:$l,uv2_pars_vertex:ec,uv2_vertex:tc,worldpos_vertex:ic,background_vert:rc,background_frag:sc,cube_vert:nc,cube_frag:ac,depth_vert:oc,depth_frag:lc,distanceRGBA_vert:cc,distanceRGBA_frag:hc,equirect_vert:uc,equirect_frag:dc,linedashed_vert:pc,linedashed_frag:mc,meshbasic_vert:fc,meshbasic_frag:gc,meshlambert_vert:vc,meshlambert_frag:xc,meshmatcap_vert:_c,meshmatcap_frag:yc,meshnormal_vert:bc,meshnormal_frag:wc,meshphong_vert:Mc,meshphong_frag:Sc,meshphysical_vert:Ec,meshphysical_frag:Tc,meshtoon_vert:Ac,meshtoon_frag:Cc,points_vert:Lc,points_frag:Rc,shadow_vert:Dc,shadow_frag:Pc,sprite_vert:Fc,sprite_frag:Ic},se={common:{diffuse:{value:new Ce(16777215)},opacity:{value:1},map:{value:null},uvTransform:{value:new wt},uv2Transform:{value:new wt},alphaMap:{value:null},alphaTest:{value:0}},specularmap:{specularMap:{value:null}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1}},emissivemap:{emissiveMap:{value:null}},bumpmap:{bumpMap:{value:null},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalScale:{value:new Le(1,1)}},displacementmap:{displacementMap:{value:null},displacementScale:{value:1},displacementBias:{value:0}},roughnessmap:{roughnessMap:{value:null}},metalnessmap:{metalnessMap:{value:null}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ce(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotShadowMap:{value:[]},spotShadowMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ce(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaTest:{value:0},uvTransform:{value:new wt}},sprite:{diffuse:{value:new Ce(16777215)},opacity:{value:1},center:{value:new Le(.5,.5)},rotation:{value:0},map:{value:null},alphaMap:{value:null},alphaTest:{value:0},uvTransform:{value:new wt}}},zt={basic:{uniforms:it([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.fog]),vertexShader:Se.meshbasic_vert,fragmentShader:Se.meshbasic_frag},lambert:{uniforms:it([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.fog,se.lights,{emissive:{value:new Ce(0)}}]),vertexShader:Se.meshlambert_vert,fragmentShader:Se.meshlambert_frag},phong:{uniforms:it([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.fog,se.lights,{emissive:{value:new Ce(0)},specular:{value:new Ce(1118481)},shininess:{value:30}}]),vertexShader:Se.meshphong_vert,fragmentShader:Se.meshphong_frag},standard:{uniforms:it([se.common,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.roughnessmap,se.metalnessmap,se.fog,se.lights,{emissive:{value:new Ce(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Se.meshphysical_vert,fragmentShader:Se.meshphysical_frag},toon:{uniforms:it([se.common,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.gradientmap,se.fog,se.lights,{emissive:{value:new Ce(0)}}]),vertexShader:Se.meshtoon_vert,fragmentShader:Se.meshtoon_frag},matcap:{uniforms:it([se.common,se.bumpmap,se.normalmap,se.displacementmap,se.fog,{matcap:{value:null}}]),vertexShader:Se.meshmatcap_vert,fragmentShader:Se.meshmatcap_frag},points:{uniforms:it([se.points,se.fog]),vertexShader:Se.points_vert,fragmentShader:Se.points_frag},dashed:{uniforms:it([se.common,se.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Se.linedashed_vert,fragmentShader:Se.linedashed_frag},depth:{uniforms:it([se.common,se.displacementmap]),vertexShader:Se.depth_vert,fragmentShader:Se.depth_frag},normal:{uniforms:it([se.common,se.bumpmap,se.normalmap,se.displacementmap,{opacity:{value:1}}]),vertexShader:Se.meshnormal_vert,fragmentShader:Se.meshnormal_frag},sprite:{uniforms:it([se.sprite,se.fog]),vertexShader:Se.sprite_vert,fragmentShader:Se.sprite_frag},background:{uniforms:{uvTransform:{value:new wt},t2D:{value:null}},vertexShader:Se.background_vert,fragmentShader:Se.background_frag},cube:{uniforms:it([se.envmap,{opacity:{value:1}}]),vertexShader:Se.cube_vert,fragmentShader:Se.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Se.equirect_vert,fragmentShader:Se.equirect_frag},distanceRGBA:{uniforms:it([se.common,se.displacementmap,{referencePosition:{value:new k},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Se.distanceRGBA_vert,fragmentShader:Se.distanceRGBA_frag},shadow:{uniforms:it([se.lights,se.fog,{color:{value:new Ce(0)},opacity:{value:1}}]),vertexShader:Se.shadow_vert,fragmentShader:Se.shadow_frag}};zt.physical={uniforms:it([zt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatNormalScale:{value:new Le(1,1)},clearcoatNormalMap:{value:null},iridescence:{value:0},iridescenceMap:{value:null},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},sheen:{value:0},sheenColor:{value:new Ce(0)},sheenColorMap:{value:null},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},transmission:{value:0},transmissionMap:{value:null},transmissionSamplerSize:{value:new Le},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},attenuationDistance:{value:0},attenuationColor:{value:new Ce(0)},specularIntensity:{value:1},specularIntensityMap:{value:null},specularColor:{value:new Ce(1,1,1)},specularColorMap:{value:null}}]),vertexShader:Se.meshphysical_vert,fragmentShader:Se.meshphysical_frag};function zc(c,e,t,i,r,s){const a=new Ce(0);let n=r===!0?0:1,o,l,h=null,d=0,u=null;function f(p,m){let v=!1,x=m.isScene===!0?m.background:null;x&&x.isTexture&&(x=e.get(x));const w=c.xr,_=w.getSession&&w.getSession();_&&_.environmentBlendMode==="additive"&&(x=null),x===null?g(a,n):x&&x.isColor&&(g(x,1),v=!0),(c.autoClear||v)&&c.clear(c.autoClearColor,c.autoClearDepth,c.autoClearStencil),x&&(x.isCubeTexture||x.mapping===306)?(l===void 0&&(l=new Nt(new pr(1,1,1),new Si({name:"BackgroundCubeMaterial",uniforms:ji(zt.cube.uniforms),vertexShader:zt.cube.vertexShader,fragmentShader:zt.cube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(M,E,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(l)),l.material.uniforms.envMap.value=x,l.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,(h!==x||d!==x.version||u!==c.toneMapping)&&(l.material.needsUpdate=!0,h=x,d=x.version,u=c.toneMapping),l.layers.enableAll(),p.unshift(l,l.geometry,l.material,0,0,null)):x&&x.isTexture&&(o===void 0&&(o=new Nt(new qr(2,2),new Si({name:"BackgroundMaterial",uniforms:ji(zt.background.uniforms),vertexShader:zt.background.vertexShader,fragmentShader:zt.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1})),o.geometry.deleteAttribute("normal"),Object.defineProperty(o.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(o)),o.material.uniforms.t2D.value=x,x.matrixAutoUpdate===!0&&x.updateMatrix(),o.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||d!==x.version||u!==c.toneMapping)&&(o.material.needsUpdate=!0,h=x,d=x.version,u=c.toneMapping),o.layers.enableAll(),p.unshift(o,o.geometry,o.material,0,0,null))}function g(p,m){t.buffers.color.setClear(p.r,p.g,p.b,m,s)}return{getClearColor:function(){return a},setClearColor:function(p,m=1){a.set(p),n=m,g(a,n)},getClearAlpha:function(){return n},setClearAlpha:function(p){n=p,g(a,n)},render:f}}function Nc(c,e,t,i){const r=c.getParameter(34921),s=i.isWebGL2?null:e.get("OES_vertex_array_object"),a=i.isWebGL2||s!==null,n={},o=m(null);let l=o,h=!1;function d(R,I,P,W,j){let O=!1;if(a){const V=p(W,P,I);l!==V&&(l=V,f(l.object)),O=v(R,W,P,j),O&&x(R,W,P,j)}else{const V=I.wireframe===!0;(l.geometry!==W.id||l.program!==P.id||l.wireframe!==V)&&(l.geometry=W.id,l.program=P.id,l.wireframe=V,O=!0)}j!==null&&t.update(j,34963),(O||h)&&(h=!1,y(R,I,P,W),j!==null&&c.bindBuffer(34963,t.get(j).buffer))}function u(){return i.isWebGL2?c.createVertexArray():s.createVertexArrayOES()}function f(R){return i.isWebGL2?c.bindVertexArray(R):s.bindVertexArrayOES(R)}function g(R){return i.isWebGL2?c.deleteVertexArray(R):s.deleteVertexArrayOES(R)}function p(R,I,P){const W=P.wireframe===!0;let j=n[R.id];j===void 0&&(j={},n[R.id]=j);let O=j[I.id];O===void 0&&(O={},j[I.id]=O);let V=O[W];return V===void 0&&(V=m(u()),O[W]=V),V}function m(R){const I=[],P=[],W=[];for(let j=0;j<r;j++)I[j]=0,P[j]=0,W[j]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:P,attributeDivisors:W,object:R,attributes:{},index:null}}function v(R,I,P,W){const j=l.attributes,O=I.attributes;let V=0;const $=P.getAttributes();for(const H in $)if($[H].location>=0){const Q=j[H];let he=O[H];if(he===void 0&&(H==="instanceMatrix"&&R.instanceMatrix&&(he=R.instanceMatrix),H==="instanceColor"&&R.instanceColor&&(he=R.instanceColor)),Q===void 0||Q.attribute!==he||he&&Q.data!==he.data)return!0;V++}return l.attributesNum!==V||l.index!==W}function x(R,I,P,W){const j={},O=I.attributes;let V=0;const $=P.getAttributes();for(const H in $)if($[H].location>=0){let Q=O[H];Q===void 0&&(H==="instanceMatrix"&&R.instanceMatrix&&(Q=R.instanceMatrix),H==="instanceColor"&&R.instanceColor&&(Q=R.instanceColor));const he={};he.attribute=Q,Q&&Q.data&&(he.data=Q.data),j[H]=he,V++}l.attributes=j,l.attributesNum=V,l.index=W}function w(){const R=l.newAttributes;for(let I=0,P=R.length;I<P;I++)R[I]=0}function _(R){M(R,0)}function M(R,I){const P=l.newAttributes,W=l.enabledAttributes,j=l.attributeDivisors;P[R]=1,W[R]===0&&(c.enableVertexAttribArray(R),W[R]=1),j[R]!==I&&((i.isWebGL2?c:e.get("ANGLE_instanced_arrays"))[i.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](R,I),j[R]=I)}function E(){const R=l.newAttributes,I=l.enabledAttributes;for(let P=0,W=I.length;P<W;P++)I[P]!==R[P]&&(c.disableVertexAttribArray(P),I[P]=0)}function L(R,I,P,W,j,O){i.isWebGL2===!0&&(P===5124||P===5125)?c.vertexAttribIPointer(R,I,P,j,O):c.vertexAttribPointer(R,I,P,W,j,O)}function y(R,I,P,W){if(i.isWebGL2===!1&&(R.isInstancedMesh||W.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;w();const j=W.attributes,O=P.getAttributes(),V=I.defaultAttributeValues;for(const $ in O){const H=O[$];if(H.location>=0){let Q=j[$];if(Q===void 0&&($==="instanceMatrix"&&R.instanceMatrix&&(Q=R.instanceMatrix),$==="instanceColor"&&R.instanceColor&&(Q=R.instanceColor)),Q!==void 0){const he=Q.normalized,Ee=Q.itemSize,J=t.get(Q);if(J===void 0)continue;const De=J.buffer,ve=J.type,xe=J.bytesPerElement;if(Q.isInterleavedBufferAttribute){const le=Q.data,Be=le.stride,Me=Q.offset;if(le.isInstancedInterleavedBuffer){for(let ge=0;ge<H.locationSize;ge++)M(H.location+ge,le.meshPerAttribute);R.isInstancedMesh!==!0&&W._maxInstanceCount===void 0&&(W._maxInstanceCount=le.meshPerAttribute*le.count)}else for(let ge=0;ge<H.locationSize;ge++)_(H.location+ge);c.bindBuffer(34962,De);for(let ge=0;ge<H.locationSize;ge++)L(H.location+ge,Ee/H.locationSize,ve,he,Be*xe,(Me+Ee/H.locationSize*ge)*xe)}else{if(Q.isInstancedBufferAttribute){for(let le=0;le<H.locationSize;le++)M(H.location+le,Q.meshPerAttribute);R.isInstancedMesh!==!0&&W._maxInstanceCount===void 0&&(W._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let le=0;le<H.locationSize;le++)_(H.location+le);c.bindBuffer(34962,De);for(let le=0;le<H.locationSize;le++)L(H.location+le,Ee/H.locationSize,ve,he,Ee*xe,Ee/H.locationSize*le*xe)}}else if(V!==void 0){const he=V[$];if(he!==void 0)switch(he.length){case 2:c.vertexAttrib2fv(H.location,he);break;case 3:c.vertexAttrib3fv(H.location,he);break;case 4:c.vertexAttrib4fv(H.location,he);break;default:c.vertexAttrib1fv(H.location,he)}}}}E()}function T(){B();for(const R in n){const I=n[R];for(const P in I){const W=I[P];for(const j in W)g(W[j].object),delete W[j];delete I[P]}delete n[R]}}function D(R){if(n[R.id]===void 0)return;const I=n[R.id];for(const P in I){const W=I[P];for(const j in W)g(W[j].object),delete W[j];delete I[P]}delete n[R.id]}function F(R){for(const I in n){const P=n[I];if(P[R.id]===void 0)continue;const W=P[R.id];for(const j in W)g(W[j].object),delete W[j];delete P[R.id]}}function B(){z(),h=!0,l!==o&&(l=o,f(l.object))}function z(){o.geometry=null,o.program=null,o.wireframe=!1}return{setup:d,reset:B,resetDefaultState:z,dispose:T,releaseStatesOfGeometry:D,releaseStatesOfProgram:F,initAttributes:w,enableAttribute:_,disableUnusedAttributes:E}}function Oc(c,e,t,i){const r=i.isWebGL2;let s;function a(l){s=l}function n(l,h){c.drawArrays(s,l,h),t.update(h,s,1)}function o(l,h,d){if(d===0)return;let u,f;if(r)u=c,f="drawArraysInstanced";else if(u=e.get("ANGLE_instanced_arrays"),f="drawArraysInstancedANGLE",u===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}u[f](s,l,h,d),t.update(h,s,d)}this.setMode=a,this.render=n,this.renderInstances=o}function Bc(c,e,t){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const L=e.get("EXT_texture_filter_anisotropic");i=c.getParameter(L.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function s(L){if(L==="highp"){if(c.getShaderPrecisionFormat(35633,36338).precision>0&&c.getShaderPrecisionFormat(35632,36338).precision>0)return"highp";L="mediump"}return L==="mediump"&&c.getShaderPrecisionFormat(35633,36337).precision>0&&c.getShaderPrecisionFormat(35632,36337).precision>0?"mediump":"lowp"}const a=typeof WebGL2RenderingContext<"u"&&c instanceof WebGL2RenderingContext||typeof WebGL2ComputeRenderingContext<"u"&&c instanceof WebGL2ComputeRenderingContext;let n=t.precision!==void 0?t.precision:"highp";const o=s(n);o!==n&&(console.warn("THREE.WebGLRenderer:",n,"not supported, using",o,"instead."),n=o);const l=a||e.has("WEBGL_draw_buffers"),h=t.logarithmicDepthBuffer===!0,d=c.getParameter(34930),u=c.getParameter(35660),f=c.getParameter(3379),g=c.getParameter(34076),p=c.getParameter(34921),m=c.getParameter(36347),v=c.getParameter(36348),x=c.getParameter(36349),w=u>0,_=a||e.has("OES_texture_float"),M=w&&_,E=a?c.getParameter(36183):0;return{isWebGL2:a,drawBuffers:l,getMaxAnisotropy:r,getMaxPrecision:s,precision:n,logarithmicDepthBuffer:h,maxTextures:d,maxVertexTextures:u,maxTextureSize:f,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:m,maxVaryings:v,maxFragmentUniforms:x,vertexTextures:w,floatFragmentTextures:_,floatVertexTextures:M,maxSamples:E}}function kc(c){const e=this;let t=null,i=0,r=!1,s=!1;const a=new mi,n=new wt,o={value:null,needsUpdate:!1};this.uniform=o,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u,f){const g=d.length!==0||u||i!==0||r;return r=u,t=h(d,f,0),i=d.length,g},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1,l()},this.setState=function(d,u,f){const g=d.clippingPlanes,p=d.clipIntersection,m=d.clipShadows,v=c.get(d);if(!r||g===null||g.length===0||s&&!m)s?h(null):l();else{const x=s?0:i,w=x*4;let _=v.clippingState||null;o.value=_,_=h(g,u,w,f);for(let M=0;M!==w;++M)_[M]=t[M];v.clippingState=_,this.numIntersection=p?this.numPlanes:0,this.numPlanes+=x}};function l(){o.value!==t&&(o.value=t,o.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(d,u,f,g){const p=d!==null?d.length:0;let m=null;if(p!==0){if(m=o.value,g!==!0||m===null){const v=f+p*4,x=u.matrixWorldInverse;n.getNormalMatrix(x),(m===null||m.length<v)&&(m=new Float32Array(v));for(let w=0,_=f;w!==p;++w,_+=4)a.copy(d[w]).applyMatrix4(x,n),a.normal.toArray(m,_),m[_+3]=a.constant}o.value=m,o.needsUpdate=!0}return e.numPlanes=p,e.numIntersection=0,m}}function Uc(c){let e=new WeakMap;function t(a,n){return n===303?a.mapping=301:n===304&&(a.mapping=302),a}function i(a){if(a&&a.isTexture&&a.isRenderTargetTexture===!1){const n=a.mapping;if(n===303||n===304)if(e.has(a)){const o=e.get(a).texture;return t(o,a.mapping)}else{const o=a.image;if(o&&o.height>0){const l=new to(o.height/2);return l.fromEquirectangularTexture(c,a),e.set(a,l),a.addEventListener("dispose",r),t(l.texture,a.mapping)}else return null}}return a}function r(a){const n=a.target;n.removeEventListener("dispose",r);const o=e.get(n);o!==void 0&&(e.delete(n),o.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}class Gc extends la{constructor(e=-1,t=1,i=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,a=i+e,n=r+t,o=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,n-=h*this.view.offsetY,o=n-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,n,o,this.near,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const qi=4,an=[.125,.215,.35,.446,.526,.582],gi=20,ys=new Gc,on=new Ce;let bs=null;const fi=(1+Math.sqrt(5))/2,Hi=1/fi,ln=[new k(1,1,1),new k(-1,1,1),new k(1,1,-1),new k(-1,1,-1),new k(0,fi,Hi),new k(0,fi,-Hi),new k(Hi,0,fi),new k(-Hi,0,fi),new k(fi,Hi,0),new k(-fi,Hi,0)];class cn{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){bs=this._renderer.getRenderTarget(),this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,i,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=dn(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=un(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(bs),e.scissorTest=!1,Ir(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),bs=this._renderer.getRenderTarget();const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,encoding:3e3,depthBuffer:!1},r=hn(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=hn(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Hc(s)),this._blurMaterial=Vc(s,e,t)}return r}_compileMaterial(e){const t=new Nt(this._lodPlanes[0],e);this._renderer.compile(t,ys)}_sceneToCubeUV(e,t,i,r){const s=new ft(90,1,t,i),a=[1,-1,1,1,1,1],n=[1,1,1,-1,-1,-1],o=this._renderer,l=o.autoClear,h=o.toneMapping;o.getClearColor(on),o.toneMapping=0,o.autoClear=!1;const d=new na({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1}),u=new Nt(new pr,d);let f=!1;const g=e.background;g?g.isColor&&(d.color.copy(g),e.background=null,f=!0):(d.color.copy(on),f=!0);for(let p=0;p<6;p++){const m=p%3;m===0?(s.up.set(0,a[p],0),s.lookAt(n[p],0,0)):m===1?(s.up.set(0,0,a[p]),s.lookAt(0,n[p],0)):(s.up.set(0,a[p],0),s.lookAt(0,0,n[p]));const v=this._cubeSize;Ir(r,m*v,p>2?v:0,v,v),o.setRenderTarget(r),f&&o.render(u,s),o.render(e,s)}u.geometry.dispose(),u.material.dispose(),o.toneMapping=h,o.autoClear=l,e.background=g}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=dn()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=un());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new Nt(this._lodPlanes[0],s),n=s.uniforms;n.envMap.value=e;const o=this._cubeSize;Ir(t,0,0,3*o,2*o),i.setRenderTarget(t),i.render(a,ys)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;for(let r=1;r<this._lodPlanes.length;r++){const s=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=ln[(r-1)%ln.length];this._blur(e,r-1,r,s,a)}t.autoClear=i}_blur(e,t,i,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,r,"latitudinal",s),this._halfBlur(a,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,a,n){const o=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new Nt(this._lodPlanes[r],l),u=l.uniforms,f=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*gi-1),p=s/g,m=isFinite(s)?1+Math.floor(h*p):gi;m>gi&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${gi}`);const v=[];let x=0;for(let L=0;L<gi;++L){const y=L/p,T=Math.exp(-y*y/2);v.push(T),L===0?x+=T:L<m&&(x+=2*T)}for(let L=0;L<v.length;L++)v[L]=v[L]/x;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=v,u.latitudinal.value=a==="latitudinal",n&&(u.poleAxis.value=n);const{_lodMax:w}=this;u.dTheta.value=g,u.mipInt.value=w-i;const _=this._sizeLods[r],M=3*_*(r>w-qi?r-w+qi:0),E=4*(this._cubeSize-_);Ir(t,M,E,3*_,2*_),o.setRenderTarget(t),o.render(d,ys)}}function Hc(c){const e=[],t=[],i=[];let r=c;const s=c-qi+1+an.length;for(let a=0;a<s;a++){const n=Math.pow(2,r);t.push(n);let o=1/n;a>c-qi?o=an[a-c+qi-1]:a===0&&(o=0),i.push(o);const l=1/(n-2),h=-l,d=1+l,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,g=6,p=3,m=2,v=1,x=new Float32Array(p*g*f),w=new Float32Array(m*g*f),_=new Float32Array(v*g*f);for(let E=0;E<f;E++){const L=E%3*2/3-1,y=E>2?0:-1,T=[L,y,0,L+2/3,y,0,L+2/3,y+1,0,L,y,0,L+2/3,y+1,0,L,y+1,0];x.set(T,p*g*E),w.set(u,m*g*E);const D=[E,E,E,E,E,E];_.set(D,v*g*E)}const M=new Bt;M.setAttribute("position",new Ot(x,p)),M.setAttribute("uv",new Ot(w,m)),M.setAttribute("faceIndex",new Ot(_,v)),e.push(M),r>qi&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function hn(c,e,t){const i=new Mi(c,e,t);return i.texture.mapping=306,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Ir(c,e,t,i,r){c.viewport.set(e,t,i,r),c.scissor.set(e,t,i,r)}function Vc(c,e,t){const i=new Float32Array(gi),r=new k(0,1,0);return new Si({name:"SphericalGaussianBlur",defines:{n:gi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${c}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Bs(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function un(){return new Si({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Bs(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function dn(){return new Si({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Bs(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Bs(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Wc(c){let e=new WeakMap,t=null;function i(n){if(n&&n.isTexture){const o=n.mapping,l=o===303||o===304,h=o===301||o===302;if(l||h)if(n.isRenderTargetTexture&&n.needsPMREMUpdate===!0){n.needsPMREMUpdate=!1;let d=e.get(n);return t===null&&(t=new cn(c)),d=l?t.fromEquirectangular(n,d):t.fromCubemap(n,d),e.set(n,d),d.texture}else{if(e.has(n))return e.get(n).texture;{const d=n.image;if(l&&d&&d.height>0||h&&d&&r(d)){t===null&&(t=new cn(c));const u=l?t.fromEquirectangular(n):t.fromCubemap(n);return e.set(n,u),n.addEventListener("dispose",s),u.texture}else return null}}}return n}function r(n){let o=0;const l=6;for(let h=0;h<l;h++)n[h]!==void 0&&o++;return o===l}function s(n){const o=n.target;o.removeEventListener("dispose",s);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:a}}function qc(c){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=c.getExtension("WEBGL_depth_texture")||c.getExtension("MOZ_WEBGL_depth_texture")||c.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=c.getExtension("EXT_texture_filter_anisotropic")||c.getExtension("MOZ_EXT_texture_filter_anisotropic")||c.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=c.getExtension("WEBGL_compressed_texture_s3tc")||c.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||c.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=c.getExtension("WEBGL_compressed_texture_pvrtc")||c.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=c.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(i){i.isWebGL2?t("EXT_color_buffer_float"):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture")},get:function(i){const r=t(i);return r===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function jc(c,e,t,i){const r={},s=new WeakMap;function a(d){const u=d.target;u.index!==null&&e.remove(u.index);for(const g in u.attributes)e.remove(u.attributes[g]);u.removeEventListener("dispose",a),delete r[u.id];const f=s.get(u);f&&(e.remove(f),s.delete(u)),i.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function n(d,u){return r[u.id]===!0||(u.addEventListener("dispose",a),r[u.id]=!0,t.memory.geometries++),u}function o(d){const u=d.attributes;for(const g in u)e.update(u[g],34962);const f=d.morphAttributes;for(const g in f){const p=f[g];for(let m=0,v=p.length;m<v;m++)e.update(p[m],34962)}}function l(d){const u=[],f=d.index,g=d.attributes.position;let p=0;if(f!==null){const x=f.array;p=f.version;for(let w=0,_=x.length;w<_;w+=3){const M=x[w+0],E=x[w+1],L=x[w+2];u.push(M,E,E,L,L,M)}}else{const x=g.array;p=g.version;for(let w=0,_=x.length/3-1;w<_;w+=3){const M=w+0,E=w+1,L=w+2;u.push(M,E,E,L,L,M)}}const m=new($n(u)?oa:aa)(u,1);m.version=p;const v=s.get(d);v&&e.remove(v),s.set(d,m)}function h(d){const u=s.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&l(d)}else l(d);return s.get(d)}return{get:n,update:o,getWireframeAttribute:h}}function Xc(c,e,t,i){const r=i.isWebGL2;let s;function a(u){s=u}let n,o;function l(u){n=u.type,o=u.bytesPerElement}function h(u,f){c.drawElements(s,f,n,u*o),t.update(f,s,1)}function d(u,f,g){if(g===0)return;let p,m;if(r)p=c,m="drawElementsInstanced";else if(p=e.get("ANGLE_instanced_arrays"),m="drawElementsInstancedANGLE",p===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}p[m](s,f,n,u*o,g),t.update(f,s,g)}this.setMode=a,this.setIndex=l,this.render=h,this.renderInstances=d}function Yc(c){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,n){switch(t.calls++,a){case 4:t.triangles+=n*(s/3);break;case 1:t.lines+=n*(s/2);break;case 3:t.lines+=n*(s-1);break;case 2:t.lines+=n*s;break;case 0:t.points+=n*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.frame++,t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function Zc(c,e){return c[0]-e[0]}function Jc(c,e){return Math.abs(e[1])-Math.abs(c[1])}function ws(c,e){let t=1;const i=e.isInterleavedBufferAttribute?e.data.array:e.array;i instanceof Int8Array?t=127:i instanceof Uint8Array?t=255:i instanceof Uint16Array?t=65535:i instanceof Int16Array?t=32767:i instanceof Int32Array?t=2147483647:console.error("THREE.WebGLMorphtargets: Unsupported morph attribute data type: ",i),c.divideScalar(t)}function Kc(c,e,t){const i={},r=new Float32Array(8),s=new WeakMap,a=new Ye,n=[];for(let l=0;l<8;l++)n[l]=[l,0];function o(l,h,d,u){const f=l.morphTargetInfluences;if(e.isWebGL2===!0){const g=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,p=g!==void 0?g.length:0;let m=s.get(h);if(m===void 0||m.count!==p){let w=function(){R.dispose(),s.delete(h),h.removeEventListener("dispose",w)};m!==void 0&&m.texture.dispose();const _=h.morphAttributes.position!==void 0,M=h.morphAttributes.normal!==void 0,E=h.morphAttributes.color!==void 0,L=h.morphAttributes.position||[],y=h.morphAttributes.normal||[],T=h.morphAttributes.color||[];let D=0;_===!0&&(D=1),M===!0&&(D=2),E===!0&&(D=3);let F=h.attributes.position.count*D,B=1;F>e.maxTextureSize&&(B=Math.ceil(F/e.maxTextureSize),F=e.maxTextureSize);const z=new Float32Array(F*B*4*p),R=new ra(z,F,B,p);R.type=1015,R.needsUpdate=!0;const I=D*4;for(let P=0;P<p;P++){const W=L[P],j=y[P],O=T[P],V=F*B*4*P;for(let $=0;$<W.count;$++){const H=$*I;_===!0&&(a.fromBufferAttribute(W,$),W.normalized===!0&&ws(a,W),z[V+H+0]=a.x,z[V+H+1]=a.y,z[V+H+2]=a.z,z[V+H+3]=0),M===!0&&(a.fromBufferAttribute(j,$),j.normalized===!0&&ws(a,j),z[V+H+4]=a.x,z[V+H+5]=a.y,z[V+H+6]=a.z,z[V+H+7]=0),E===!0&&(a.fromBufferAttribute(O,$),O.normalized===!0&&ws(a,O),z[V+H+8]=a.x,z[V+H+9]=a.y,z[V+H+10]=a.z,z[V+H+11]=O.itemSize===4?a.w:1)}}m={count:p,texture:R,size:new Le(F,B)},s.set(h,m),h.addEventListener("dispose",w)}let v=0;for(let w=0;w<f.length;w++)v+=f[w];const x=h.morphTargetsRelative?1:1-v;u.getUniforms().setValue(c,"morphTargetBaseInfluence",x),u.getUniforms().setValue(c,"morphTargetInfluences",f),u.getUniforms().setValue(c,"morphTargetsTexture",m.texture,t),u.getUniforms().setValue(c,"morphTargetsTextureSize",m.size)}else{const g=f===void 0?0:f.length;let p=i[h.id];if(p===void 0||p.length!==g){p=[];for(let _=0;_<g;_++)p[_]=[_,0];i[h.id]=p}for(let _=0;_<g;_++){const M=p[_];M[0]=_,M[1]=f[_]}p.sort(Jc);for(let _=0;_<8;_++)_<g&&p[_][1]?(n[_][0]=p[_][0],n[_][1]=p[_][1]):(n[_][0]=Number.MAX_SAFE_INTEGER,n[_][1]=0);n.sort(Zc);const m=h.morphAttributes.position,v=h.morphAttributes.normal;let x=0;for(let _=0;_<8;_++){const M=n[_],E=M[0],L=M[1];E!==Number.MAX_SAFE_INTEGER&&L?(m&&h.getAttribute("morphTarget"+_)!==m[E]&&h.setAttribute("morphTarget"+_,m[E]),v&&h.getAttribute("morphNormal"+_)!==v[E]&&h.setAttribute("morphNormal"+_,v[E]),r[_]=L,x+=L):(m&&h.hasAttribute("morphTarget"+_)===!0&&h.deleteAttribute("morphTarget"+_),v&&h.hasAttribute("morphNormal"+_)===!0&&h.deleteAttribute("morphNormal"+_),r[_]=0)}const w=h.morphTargetsRelative?1:1-x;u.getUniforms().setValue(c,"morphTargetBaseInfluence",w),u.getUniforms().setValue(c,"morphTargetInfluences",r)}}return{update:o}}function Qc(c,e,t,i){let r=new WeakMap;function s(o){const l=i.render.frame,h=o.geometry,d=e.get(o,h);return r.get(d)!==l&&(e.update(d),r.set(d,l)),o.isInstancedMesh&&(o.hasEventListener("dispose",n)===!1&&o.addEventListener("dispose",n),t.update(o.instanceMatrix,34962),o.instanceColor!==null&&t.update(o.instanceColor,34962)),d}function a(){r=new WeakMap}function n(o){const l=o.target;l.removeEventListener("dispose",n),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:s,dispose:a}}const ua=new gt,da=new ra,pa=new Ba,ma=new ca,pn=[],mn=[],fn=new Float32Array(16),gn=new Float32Array(9),vn=new Float32Array(4);function Yi(c,e,t){const i=c[0];if(i<=0||i>0)return c;const r=e*t;let s=pn[r];if(s===void 0&&(s=new Float32Array(r),pn[r]=s),e!==0){i.toArray(s,0);for(let a=1,n=0;a!==e;++a)n+=t,c[a].toArray(s,n)}return s}function ot(c,e){if(c.length!==e.length)return!1;for(let t=0,i=c.length;t<i;t++)if(c[t]!==e[t])return!1;return!0}function lt(c,e){for(let t=0,i=e.length;t<i;t++)c[t]=e[t]}function jr(c,e){let t=mn[e];t===void 0&&(t=new Int32Array(e),mn[e]=t);for(let i=0;i!==e;++i)t[i]=c.allocateTextureUnit();return t}function $c(c,e){const t=this.cache;t[0]!==e&&(c.uniform1f(this.addr,e),t[0]=e)}function eh(c,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(c.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ot(t,e))return;c.uniform2fv(this.addr,e),lt(t,e)}}function th(c,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(c.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(c.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(ot(t,e))return;c.uniform3fv(this.addr,e),lt(t,e)}}function ih(c,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(c.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ot(t,e))return;c.uniform4fv(this.addr,e),lt(t,e)}}function rh(c,e){const t=this.cache,i=e.elements;if(i===void 0){if(ot(t,e))return;c.uniformMatrix2fv(this.addr,!1,e),lt(t,e)}else{if(ot(t,i))return;vn.set(i),c.uniformMatrix2fv(this.addr,!1,vn),lt(t,i)}}function sh(c,e){const t=this.cache,i=e.elements;if(i===void 0){if(ot(t,e))return;c.uniformMatrix3fv(this.addr,!1,e),lt(t,e)}else{if(ot(t,i))return;gn.set(i),c.uniformMatrix3fv(this.addr,!1,gn),lt(t,i)}}function nh(c,e){const t=this.cache,i=e.elements;if(i===void 0){if(ot(t,e))return;c.uniformMatrix4fv(this.addr,!1,e),lt(t,e)}else{if(ot(t,i))return;fn.set(i),c.uniformMatrix4fv(this.addr,!1,fn),lt(t,i)}}function ah(c,e){const t=this.cache;t[0]!==e&&(c.uniform1i(this.addr,e),t[0]=e)}function oh(c,e){const t=this.cache;ot(t,e)||(c.uniform2iv(this.addr,e),lt(t,e))}function lh(c,e){const t=this.cache;ot(t,e)||(c.uniform3iv(this.addr,e),lt(t,e))}function ch(c,e){const t=this.cache;ot(t,e)||(c.uniform4iv(this.addr,e),lt(t,e))}function hh(c,e){const t=this.cache;t[0]!==e&&(c.uniform1ui(this.addr,e),t[0]=e)}function uh(c,e){const t=this.cache;ot(t,e)||(c.uniform2uiv(this.addr,e),lt(t,e))}function dh(c,e){const t=this.cache;ot(t,e)||(c.uniform3uiv(this.addr,e),lt(t,e))}function ph(c,e){const t=this.cache;ot(t,e)||(c.uniform4uiv(this.addr,e),lt(t,e))}function mh(c,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(c.uniform1i(this.addr,r),i[0]=r),t.setTexture2D(e||ua,r)}function fh(c,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(c.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||pa,r)}function gh(c,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(c.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||ma,r)}function vh(c,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(c.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||da,r)}function xh(c){switch(c){case 5126:return $c;case 35664:return eh;case 35665:return th;case 35666:return ih;case 35674:return rh;case 35675:return sh;case 35676:return nh;case 5124:case 35670:return ah;case 35667:case 35671:return oh;case 35668:case 35672:return lh;case 35669:case 35673:return ch;case 5125:return hh;case 36294:return uh;case 36295:return dh;case 36296:return ph;case 35678:case 36198:case 36298:case 36306:case 35682:return mh;case 35679:case 36299:case 36307:return fh;case 35680:case 36300:case 36308:case 36293:return gh;case 36289:case 36303:case 36311:case 36292:return vh}}function _h(c,e){c.uniform1fv(this.addr,e)}function yh(c,e){const t=Yi(e,this.size,2);c.uniform2fv(this.addr,t)}function bh(c,e){const t=Yi(e,this.size,3);c.uniform3fv(this.addr,t)}function wh(c,e){const t=Yi(e,this.size,4);c.uniform4fv(this.addr,t)}function Mh(c,e){const t=Yi(e,this.size,4);c.uniformMatrix2fv(this.addr,!1,t)}function Sh(c,e){const t=Yi(e,this.size,9);c.uniformMatrix3fv(this.addr,!1,t)}function Eh(c,e){const t=Yi(e,this.size,16);c.uniformMatrix4fv(this.addr,!1,t)}function Th(c,e){c.uniform1iv(this.addr,e)}function Ah(c,e){c.uniform2iv(this.addr,e)}function Ch(c,e){c.uniform3iv(this.addr,e)}function Lh(c,e){c.uniform4iv(this.addr,e)}function Rh(c,e){c.uniform1uiv(this.addr,e)}function Dh(c,e){c.uniform2uiv(this.addr,e)}function Ph(c,e){c.uniform3uiv(this.addr,e)}function Fh(c,e){c.uniform4uiv(this.addr,e)}function Ih(c,e,t){const i=e.length,r=jr(t,i);c.uniform1iv(this.addr,r);for(let s=0;s!==i;++s)t.setTexture2D(e[s]||ua,r[s])}function zh(c,e,t){const i=e.length,r=jr(t,i);c.uniform1iv(this.addr,r);for(let s=0;s!==i;++s)t.setTexture3D(e[s]||pa,r[s])}function Nh(c,e,t){const i=e.length,r=jr(t,i);c.uniform1iv(this.addr,r);for(let s=0;s!==i;++s)t.setTextureCube(e[s]||ma,r[s])}function Oh(c,e,t){const i=e.length,r=jr(t,i);c.uniform1iv(this.addr,r);for(let s=0;s!==i;++s)t.setTexture2DArray(e[s]||da,r[s])}function Bh(c){switch(c){case 5126:return _h;case 35664:return yh;case 35665:return bh;case 35666:return wh;case 35674:return Mh;case 35675:return Sh;case 35676:return Eh;case 5124:case 35670:return Th;case 35667:case 35671:return Ah;case 35668:case 35672:return Ch;case 35669:case 35673:return Lh;case 5125:return Rh;case 36294:return Dh;case 36295:return Ph;case 36296:return Fh;case 35678:case 36198:case 36298:case 36306:case 35682:return Ih;case 35679:case 36299:case 36307:return zh;case 35680:case 36300:case 36308:case 36293:return Nh;case 36289:case 36303:case 36311:case 36292:return Oh}}class kh{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.setValue=xh(t.type)}}class Uh{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.size=t.size,this.setValue=Bh(t.type)}}class Gh{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const n=r[s];n.setValue(e,t[n.id],i)}}}const Ms=/(\w+)(\])?(\[|\.)?/g;function xn(c,e){c.seq.push(e),c.map[e.id]=e}function Hh(c,e,t){const i=c.name,r=i.length;for(Ms.lastIndex=0;;){const s=Ms.exec(i),a=Ms.lastIndex;let n=s[1];const o=s[2]==="]",l=s[3];if(o&&(n=n|0),l===void 0||l==="["&&a+2===r){xn(t,l===void 0?new kh(n,c,e):new Uh(n,c,e));break}else{let h=t.map[n];h===void 0&&(h=new Gh(n),xn(t,h)),t=h}}}class Hr{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,35718);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);Hh(s,a,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,a=t.length;s!==a;++s){const n=t[s],o=i[n.id];o.needsUpdate!==!1&&n.setValue(e,o.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&i.push(a)}return i}}function _n(c,e,t){const i=c.createShader(e);return c.shaderSource(i,t),c.compileShader(i),i}let Vh=0;function Wh(c,e){const t=c.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const n=a+1;i.push(`${n===e?">":" "} ${n}: ${t[a]}`)}return i.join(`
`)}function qh(c){switch(c){case 3e3:return["Linear","( value )"];case 3001:return["sRGB","( value )"];default:return console.warn("THREE.WebGLProgram: Unsupported encoding:",c),["Linear","( value )"]}}function yn(c,e,t){const i=c.getShaderParameter(e,35713),r=c.getShaderInfoLog(e).trim();if(i&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+Wh(c.getShaderSource(e),a)}else return r}function jh(c,e){const t=qh(e);return"vec4 "+c+"( vec4 value ) { return LinearTo"+t[0]+t[1]+"; }"}function Xh(c,e){let t;switch(e){case 1:t="Linear";break;case 2:t="Reinhard";break;case 3:t="OptimizedCineon";break;case 4:t="ACESFilmic";break;case 5:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+c+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function Yh(c){return[c.extensionDerivatives||c.envMapCubeUVHeight||c.bumpMap||c.tangentSpaceNormalMap||c.clearcoatNormalMap||c.flatShading||c.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(c.extensionFragDepth||c.logarithmicDepthBuffer)&&c.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",c.extensionDrawBuffers&&c.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(c.extensionShaderTextureLOD||c.envMap||c.transmission)&&c.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(ar).join(`
`)}function Zh(c){const e=[];for(const t in c){const i=c[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function Jh(c,e){const t={},i=c.getProgramParameter(e,35721);for(let r=0;r<i;r++){const s=c.getActiveAttrib(e,r),a=s.name;let n=1;s.type===35674&&(n=2),s.type===35675&&(n=3),s.type===35676&&(n=4),t[a]={type:s.type,location:c.getAttribLocation(e,a),locationSize:n}}return t}function ar(c){return c!==""}function bn(c,e){return c.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function wn(c,e){return c.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Kh=/^[ \t]*#include +<([\w\d./]+)>/gm;function zs(c){return c.replace(Kh,Qh)}function Qh(c,e){const t=Se[e];if(t===void 0)throw new Error("Can not resolve #include <"+e+">");return zs(t)}const $h=/#pragma unroll_loop[\s]+?for \( int i \= (\d+)\; i < (\d+)\; i \+\+ \) \{([\s\S]+?)(?=\})\}/g,eu=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Mn(c){return c.replace(eu,fa).replace($h,tu)}function tu(c,e,t,i){return console.warn("WebGLProgram: #pragma unroll_loop shader syntax is deprecated. Please use #pragma unroll_loop_start syntax instead."),fa(c,e,t,i)}function fa(c,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Sn(c){let e="precision "+c.precision+` float;
precision `+c.precision+" int;";return c.precision==="highp"?e+=`
#define HIGH_PRECISION`:c.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:c.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function iu(c){let e="SHADOWMAP_TYPE_BASIC";return c.shadowMapType===1?e="SHADOWMAP_TYPE_PCF":c.shadowMapType===2?e="SHADOWMAP_TYPE_PCF_SOFT":c.shadowMapType===3&&(e="SHADOWMAP_TYPE_VSM"),e}function ru(c){let e="ENVMAP_TYPE_CUBE";if(c.envMap)switch(c.envMapMode){case 301:case 302:e="ENVMAP_TYPE_CUBE";break;case 306:e="ENVMAP_TYPE_CUBE_UV";break}return e}function su(c){let e="ENVMAP_MODE_REFLECTION";if(c.envMap)switch(c.envMapMode){case 302:e="ENVMAP_MODE_REFRACTION";break}return e}function nu(c){let e="ENVMAP_BLENDING_NONE";if(c.envMap)switch(c.combine){case 0:e="ENVMAP_BLENDING_MULTIPLY";break;case 1:e="ENVMAP_BLENDING_MIX";break;case 2:e="ENVMAP_BLENDING_ADD";break}return e}function au(c){const e=c.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function ou(c,e,t,i){const r=c.getContext(),s=t.defines;let a=t.vertexShader,n=t.fragmentShader;const o=iu(t),l=ru(t),h=su(t),d=nu(t),u=au(t),f=t.isWebGL2?"":Yh(t),g=Zh(s),p=r.createProgram();let m,v,x=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=[g].filter(ar).join(`
`),m.length>0&&(m+=`
`),v=[f,g].filter(ar).join(`
`),v.length>0&&(v+=`
`)):(m=[Sn(t),"#define SHADER_NAME "+t.shaderName,g,t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.supportsVertexTextures?"#define VERTEX_TEXTURES":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMap&&t.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",t.normalMap&&t.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.displacementMap&&t.supportsVertexTextures?"#define USE_DISPLACEMENTMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularIntensityMap?"#define USE_SPECULARINTENSITYMAP":"",t.specularColorMap?"#define USE_SPECULARCOLORMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEENCOLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEENROUGHNESSMAP":"",t.vertexTangents?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUvs?"#define USE_UV":"",t.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors&&t.isWebGL2?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+o:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ar).join(`
`),v=[f,Sn(t),"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMap&&t.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",t.normalMap&&t.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularIntensityMap?"#define USE_SPECULARINTENSITYMAP":"",t.specularColorMap?"#define USE_SPECULARCOLORMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEENCOLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEENROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.vertexTangents?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUvs?"#define USE_UV":"",t.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+o:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.physicallyCorrectLights?"#define PHYSICALLY_CORRECT_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==0?"#define TONE_MAPPING":"",t.toneMapping!==0?Se.tonemapping_pars_fragment:"",t.toneMapping!==0?Xh("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Se.encodings_pars_fragment,jh("linearToOutputTexel",t.outputEncoding),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(ar).join(`
`)),a=zs(a),a=bn(a,t),a=wn(a,t),n=zs(n),n=bn(n,t),n=wn(n,t),a=Mn(a),n=Mn(n),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,m=["precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,v=["#define varying in",t.glslVersion===js?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===js?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+v);const w=x+m+a,_=x+v+n,M=_n(r,35633,w),E=_n(r,35632,_);if(r.attachShader(p,M),r.attachShader(p,E),t.index0AttributeName!==void 0?r.bindAttribLocation(p,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(p,0,"position"),r.linkProgram(p),c.debug.checkShaderErrors){const T=r.getProgramInfoLog(p).trim(),D=r.getShaderInfoLog(M).trim(),F=r.getShaderInfoLog(E).trim();let B=!0,z=!0;if(r.getProgramParameter(p,35714)===!1){B=!1;const R=yn(r,M,"vertex"),I=yn(r,E,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(p,35715)+`

Program Info Log: `+T+`
`+R+`
`+I)}else T!==""?console.warn("THREE.WebGLProgram: Program Info Log:",T):(D===""||F==="")&&(z=!1);z&&(this.diagnostics={runnable:B,programLog:T,vertexShader:{log:D,prefix:m},fragmentShader:{log:F,prefix:v}})}r.deleteShader(M),r.deleteShader(E);let L;this.getUniforms=function(){return L===void 0&&(L=new Hr(r,p)),L};let y;return this.getAttributes=function(){return y===void 0&&(y=Jh(r,p)),y},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(p),this.program=void 0},this.name=t.shaderName,this.id=Vh++,this.cacheKey=e,this.usedTimes=1,this.program=p,this.vertexShader=M,this.fragmentShader=E,this}let lu=0;class cu{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;return t.has(e)===!1&&t.set(e,new Set),t.get(e)}_getShaderStage(e){const t=this.shaderCache;if(t.has(e)===!1){const i=new hu(e);t.set(e,i)}return t.get(e)}}class hu{constructor(e){this.id=lu++,this.code=e,this.usedTimes=0}}function uu(c,e,t,i,r,s,a){const n=new sa,o=new cu,l=[],h=r.isWebGL2,d=r.logarithmicDepthBuffer,u=r.vertexTextures;let f=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function p(y,T,D,F,B){const z=F.fog,R=B.geometry,I=y.isMeshStandardMaterial?F.environment:null,P=(y.isMeshStandardMaterial?t:e).get(y.envMap||I),W=P&&P.mapping===306?P.image.height:null,j=g[y.type];y.precision!==null&&(f=r.getMaxPrecision(y.precision),f!==y.precision&&console.warn("THREE.WebGLProgram.getParameters:",y.precision,"not supported, using",f,"instead."));const O=R.morphAttributes.position||R.morphAttributes.normal||R.morphAttributes.color,V=O!==void 0?O.length:0;let $=0;R.morphAttributes.position!==void 0&&($=1),R.morphAttributes.normal!==void 0&&($=2),R.morphAttributes.color!==void 0&&($=3);let H,Q,he,Ee;if(j){const le=zt[j];H=le.vertexShader,Q=le.fragmentShader}else H=y.vertexShader,Q=y.fragmentShader,o.update(y),he=o.getVertexShaderID(y),Ee=o.getFragmentShaderID(y);const J=c.getRenderTarget(),De=y.alphaTest>0,ve=y.clearcoat>0,xe=y.iridescence>0;return{isWebGL2:h,shaderID:j,shaderName:y.type,vertexShader:H,fragmentShader:Q,defines:y.defines,customVertexShaderID:he,customFragmentShaderID:Ee,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:f,instancing:B.isInstancedMesh===!0,instancingColor:B.isInstancedMesh===!0&&B.instanceColor!==null,supportsVertexTextures:u,outputEncoding:J===null?c.outputEncoding:J.isXRRenderTarget===!0?J.texture.encoding:3e3,map:!!y.map,matcap:!!y.matcap,envMap:!!P,envMapMode:P&&P.mapping,envMapCubeUVHeight:W,lightMap:!!y.lightMap,aoMap:!!y.aoMap,emissiveMap:!!y.emissiveMap,bumpMap:!!y.bumpMap,normalMap:!!y.normalMap,objectSpaceNormalMap:y.normalMapType===1,tangentSpaceNormalMap:y.normalMapType===0,decodeVideoTexture:!!y.map&&y.map.isVideoTexture===!0&&y.map.encoding===3001,clearcoat:ve,clearcoatMap:ve&&!!y.clearcoatMap,clearcoatRoughnessMap:ve&&!!y.clearcoatRoughnessMap,clearcoatNormalMap:ve&&!!y.clearcoatNormalMap,iridescence:xe,iridescenceMap:xe&&!!y.iridescenceMap,iridescenceThicknessMap:xe&&!!y.iridescenceThicknessMap,displacementMap:!!y.displacementMap,roughnessMap:!!y.roughnessMap,metalnessMap:!!y.metalnessMap,specularMap:!!y.specularMap,specularIntensityMap:!!y.specularIntensityMap,specularColorMap:!!y.specularColorMap,opaque:y.transparent===!1&&y.blending===1,alphaMap:!!y.alphaMap,alphaTest:De,gradientMap:!!y.gradientMap,sheen:y.sheen>0,sheenColorMap:!!y.sheenColorMap,sheenRoughnessMap:!!y.sheenRoughnessMap,transmission:y.transmission>0,transmissionMap:!!y.transmissionMap,thicknessMap:!!y.thicknessMap,combine:y.combine,vertexTangents:!!y.normalMap&&!!R.attributes.tangent,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!R.attributes.color&&R.attributes.color.itemSize===4,vertexUvs:!!y.map||!!y.bumpMap||!!y.normalMap||!!y.specularMap||!!y.alphaMap||!!y.emissiveMap||!!y.roughnessMap||!!y.metalnessMap||!!y.clearcoatMap||!!y.clearcoatRoughnessMap||!!y.clearcoatNormalMap||!!y.iridescenceMap||!!y.iridescenceThicknessMap||!!y.displacementMap||!!y.transmissionMap||!!y.thicknessMap||!!y.specularIntensityMap||!!y.specularColorMap||!!y.sheenColorMap||!!y.sheenRoughnessMap,uvsVertexOnly:!(y.map||y.bumpMap||y.normalMap||y.specularMap||y.alphaMap||y.emissiveMap||y.roughnessMap||y.metalnessMap||y.clearcoatNormalMap||y.iridescenceMap||y.iridescenceThicknessMap||y.transmission>0||y.transmissionMap||y.thicknessMap||y.specularIntensityMap||y.specularColorMap||y.sheen>0||y.sheenColorMap||y.sheenRoughnessMap)&&!!y.displacementMap,fog:!!z,useFog:y.fog===!0,fogExp2:z&&z.isFogExp2,flatShading:!!y.flatShading,sizeAttenuation:y.sizeAttenuation,logarithmicDepthBuffer:d,skinning:B.isSkinnedMesh===!0,morphTargets:R.morphAttributes.position!==void 0,morphNormals:R.morphAttributes.normal!==void 0,morphColors:R.morphAttributes.color!==void 0,morphTargetsCount:V,morphTextureStride:$,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:y.dithering,shadowMapEnabled:c.shadowMap.enabled&&D.length>0,shadowMapType:c.shadowMap.type,toneMapping:y.toneMapped?c.toneMapping:0,physicallyCorrectLights:c.physicallyCorrectLights,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===2,flipSided:y.side===1,useDepthPacking:!!y.depthPacking,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionDerivatives:y.extensions&&y.extensions.derivatives,extensionFragDepth:y.extensions&&y.extensions.fragDepth,extensionDrawBuffers:y.extensions&&y.extensions.drawBuffers,extensionShaderTextureLOD:y.extensions&&y.extensions.shaderTextureLOD,rendererExtensionFragDepth:h||i.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||i.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||i.has("EXT_shader_texture_lod"),customProgramCacheKey:y.customProgramCacheKey()}}function m(y){const T=[];if(y.shaderID?T.push(y.shaderID):(T.push(y.customVertexShaderID),T.push(y.customFragmentShaderID)),y.defines!==void 0)for(const D in y.defines)T.push(D),T.push(y.defines[D]);return y.isRawShaderMaterial===!1&&(v(T,y),x(T,y),T.push(c.outputEncoding)),T.push(y.customProgramCacheKey),T.join()}function v(y,T){y.push(T.precision),y.push(T.outputEncoding),y.push(T.envMapMode),y.push(T.envMapCubeUVHeight),y.push(T.combine),y.push(T.vertexUvs),y.push(T.fogExp2),y.push(T.sizeAttenuation),y.push(T.morphTargetsCount),y.push(T.morphAttributeCount),y.push(T.numDirLights),y.push(T.numPointLights),y.push(T.numSpotLights),y.push(T.numHemiLights),y.push(T.numRectAreaLights),y.push(T.numDirLightShadows),y.push(T.numPointLightShadows),y.push(T.numSpotLightShadows),y.push(T.shadowMapType),y.push(T.toneMapping),y.push(T.numClippingPlanes),y.push(T.numClipIntersection),y.push(T.depthPacking)}function x(y,T){n.disableAll(),T.isWebGL2&&n.enable(0),T.supportsVertexTextures&&n.enable(1),T.instancing&&n.enable(2),T.instancingColor&&n.enable(3),T.map&&n.enable(4),T.matcap&&n.enable(5),T.envMap&&n.enable(6),T.lightMap&&n.enable(7),T.aoMap&&n.enable(8),T.emissiveMap&&n.enable(9),T.bumpMap&&n.enable(10),T.normalMap&&n.enable(11),T.objectSpaceNormalMap&&n.enable(12),T.tangentSpaceNormalMap&&n.enable(13),T.clearcoat&&n.enable(14),T.clearcoatMap&&n.enable(15),T.clearcoatRoughnessMap&&n.enable(16),T.clearcoatNormalMap&&n.enable(17),T.iridescence&&n.enable(18),T.iridescenceMap&&n.enable(19),T.iridescenceThicknessMap&&n.enable(20),T.displacementMap&&n.enable(21),T.specularMap&&n.enable(22),T.roughnessMap&&n.enable(23),T.metalnessMap&&n.enable(24),T.gradientMap&&n.enable(25),T.alphaMap&&n.enable(26),T.alphaTest&&n.enable(27),T.vertexColors&&n.enable(28),T.vertexAlphas&&n.enable(29),T.vertexUvs&&n.enable(30),T.vertexTangents&&n.enable(31),T.uvsVertexOnly&&n.enable(32),T.fog&&n.enable(33),y.push(n.mask),n.disableAll(),T.useFog&&n.enable(0),T.flatShading&&n.enable(1),T.logarithmicDepthBuffer&&n.enable(2),T.skinning&&n.enable(3),T.morphTargets&&n.enable(4),T.morphNormals&&n.enable(5),T.morphColors&&n.enable(6),T.premultipliedAlpha&&n.enable(7),T.shadowMapEnabled&&n.enable(8),T.physicallyCorrectLights&&n.enable(9),T.doubleSided&&n.enable(10),T.flipSided&&n.enable(11),T.useDepthPacking&&n.enable(12),T.dithering&&n.enable(13),T.specularIntensityMap&&n.enable(14),T.specularColorMap&&n.enable(15),T.transmission&&n.enable(16),T.transmissionMap&&n.enable(17),T.thicknessMap&&n.enable(18),T.sheen&&n.enable(19),T.sheenColorMap&&n.enable(20),T.sheenRoughnessMap&&n.enable(21),T.decodeVideoTexture&&n.enable(22),T.opaque&&n.enable(23),y.push(n.mask)}function w(y){const T=g[y.type];let D;if(T){const F=zt[T];D=Ka.clone(F.uniforms)}else D=y.uniforms;return D}function _(y,T){let D;for(let F=0,B=l.length;F<B;F++){const z=l[F];if(z.cacheKey===T){D=z,++D.usedTimes;break}}return D===void 0&&(D=new ou(c,T,y,s),l.push(D)),D}function M(y){if(--y.usedTimes===0){const T=l.indexOf(y);l[T]=l[l.length-1],l.pop(),y.destroy()}}function E(y){o.remove(y)}function L(){o.dispose()}return{getParameters:p,getProgramCacheKey:m,getUniforms:w,acquireProgram:_,releaseProgram:M,releaseShaderCache:E,programs:l,dispose:L}}function du(){let c=new WeakMap;function e(s){let a=c.get(s);return a===void 0&&(a={},c.set(s,a)),a}function t(s){c.delete(s)}function i(s,a,n){c.get(s)[a]=n}function r(){c=new WeakMap}return{get:e,remove:t,update:i,dispose:r}}function pu(c,e){return c.groupOrder!==e.groupOrder?c.groupOrder-e.groupOrder:c.renderOrder!==e.renderOrder?c.renderOrder-e.renderOrder:c.material.id!==e.material.id?c.material.id-e.material.id:c.z!==e.z?c.z-e.z:c.id-e.id}function En(c,e){return c.groupOrder!==e.groupOrder?c.groupOrder-e.groupOrder:c.renderOrder!==e.renderOrder?c.renderOrder-e.renderOrder:c.z!==e.z?e.z-c.z:c.id-e.id}function Tn(){const c=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function a(d,u,f,g,p,m){let v=c[e];return v===void 0?(v={id:d.id,object:d,geometry:u,material:f,groupOrder:g,renderOrder:d.renderOrder,z:p,group:m},c[e]=v):(v.id=d.id,v.object=d,v.geometry=u,v.material=f,v.groupOrder=g,v.renderOrder=d.renderOrder,v.z=p,v.group=m),e++,v}function n(d,u,f,g,p,m){const v=a(d,u,f,g,p,m);f.transmission>0?i.push(v):f.transparent===!0?r.push(v):t.push(v)}function o(d,u,f,g,p,m){const v=a(d,u,f,g,p,m);f.transmission>0?i.unshift(v):f.transparent===!0?r.unshift(v):t.unshift(v)}function l(d,u){t.length>1&&t.sort(d||pu),i.length>1&&i.sort(u||En),r.length>1&&r.sort(u||En)}function h(){for(let d=e,u=c.length;d<u;d++){const f=c[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:n,unshift:o,finish:h,sort:l}}function mu(){let c=new WeakMap;function e(i,r){let s;return c.has(i)===!1?(s=new Tn,c.set(i,[s])):r>=c.get(i).length?(s=new Tn,c.get(i).push(s)):s=c.get(i)[r],s}function t(){c=new WeakMap}return{get:e,dispose:t}}function fu(){const c={};return{get:function(e){if(c[e.id]!==void 0)return c[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new k,color:new Ce};break;case"SpotLight":t={position:new k,direction:new k,color:new Ce,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new k,color:new Ce,distance:0,decay:0};break;case"HemisphereLight":t={direction:new k,skyColor:new Ce,groundColor:new Ce};break;case"RectAreaLight":t={color:new Ce,position:new k,halfWidth:new k,halfHeight:new k};break}return c[e.id]=t,t}}}function gu(){const c={};return{get:function(e){if(c[e.id]!==void 0)return c[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Le};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Le};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Le,shadowCameraNear:1,shadowCameraFar:1e3};break}return c[e.id]=t,t}}}let vu=0;function xu(c,e){return(e.castShadow?1:0)-(c.castShadow?1:0)}function _u(c,e){const t=new fu,i=gu(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotShadow:[],spotShadowMap:[],spotShadowMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[]};for(let h=0;h<9;h++)r.probe.push(new k);const s=new k,a=new Ze,n=new Ze;function o(h,d){let u=0,f=0,g=0;for(let T=0;T<9;T++)r.probe[T].set(0,0,0);let p=0,m=0,v=0,x=0,w=0,_=0,M=0,E=0;h.sort(xu);const L=d!==!0?Math.PI:1;for(let T=0,D=h.length;T<D;T++){const F=h[T],B=F.color,z=F.intensity,R=F.distance,I=F.shadow&&F.shadow.map?F.shadow.map.texture:null;if(F.isAmbientLight)u+=B.r*z*L,f+=B.g*z*L,g+=B.b*z*L;else if(F.isLightProbe)for(let P=0;P<9;P++)r.probe[P].addScaledVector(F.sh.coefficients[P],z);else if(F.isDirectionalLight){const P=t.get(F);if(P.color.copy(F.color).multiplyScalar(F.intensity*L),F.castShadow){const W=F.shadow,j=i.get(F);j.shadowBias=W.bias,j.shadowNormalBias=W.normalBias,j.shadowRadius=W.radius,j.shadowMapSize=W.mapSize,r.directionalShadow[p]=j,r.directionalShadowMap[p]=I,r.directionalShadowMatrix[p]=F.shadow.matrix,_++}r.directional[p]=P,p++}else if(F.isSpotLight){const P=t.get(F);if(P.position.setFromMatrixPosition(F.matrixWorld),P.color.copy(B).multiplyScalar(z*L),P.distance=R,P.coneCos=Math.cos(F.angle),P.penumbraCos=Math.cos(F.angle*(1-F.penumbra)),P.decay=F.decay,F.castShadow){const W=F.shadow,j=i.get(F);j.shadowBias=W.bias,j.shadowNormalBias=W.normalBias,j.shadowRadius=W.radius,j.shadowMapSize=W.mapSize,r.spotShadow[v]=j,r.spotShadowMap[v]=I,r.spotShadowMatrix[v]=F.shadow.matrix,E++}r.spot[v]=P,v++}else if(F.isRectAreaLight){const P=t.get(F);P.color.copy(B).multiplyScalar(z),P.halfWidth.set(F.width*.5,0,0),P.halfHeight.set(0,F.height*.5,0),r.rectArea[x]=P,x++}else if(F.isPointLight){const P=t.get(F);if(P.color.copy(F.color).multiplyScalar(F.intensity*L),P.distance=F.distance,P.decay=F.decay,F.castShadow){const W=F.shadow,j=i.get(F);j.shadowBias=W.bias,j.shadowNormalBias=W.normalBias,j.shadowRadius=W.radius,j.shadowMapSize=W.mapSize,j.shadowCameraNear=W.camera.near,j.shadowCameraFar=W.camera.far,r.pointShadow[m]=j,r.pointShadowMap[m]=I,r.pointShadowMatrix[m]=F.shadow.matrix,M++}r.point[m]=P,m++}else if(F.isHemisphereLight){const P=t.get(F);P.skyColor.copy(F.color).multiplyScalar(z*L),P.groundColor.copy(F.groundColor).multiplyScalar(z*L),r.hemi[w]=P,w++}}x>0&&(e.isWebGL2||c.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=se.LTC_FLOAT_1,r.rectAreaLTC2=se.LTC_FLOAT_2):c.has("OES_texture_half_float_linear")===!0?(r.rectAreaLTC1=se.LTC_HALF_1,r.rectAreaLTC2=se.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),r.ambient[0]=u,r.ambient[1]=f,r.ambient[2]=g;const y=r.hash;(y.directionalLength!==p||y.pointLength!==m||y.spotLength!==v||y.rectAreaLength!==x||y.hemiLength!==w||y.numDirectionalShadows!==_||y.numPointShadows!==M||y.numSpotShadows!==E)&&(r.directional.length=p,r.spot.length=v,r.rectArea.length=x,r.point.length=m,r.hemi.length=w,r.directionalShadow.length=_,r.directionalShadowMap.length=_,r.pointShadow.length=M,r.pointShadowMap.length=M,r.spotShadow.length=E,r.spotShadowMap.length=E,r.directionalShadowMatrix.length=_,r.pointShadowMatrix.length=M,r.spotShadowMatrix.length=E,y.directionalLength=p,y.pointLength=m,y.spotLength=v,y.rectAreaLength=x,y.hemiLength=w,y.numDirectionalShadows=_,y.numPointShadows=M,y.numSpotShadows=E,r.version=vu++)}function l(h,d){let u=0,f=0,g=0,p=0,m=0;const v=d.matrixWorldInverse;for(let x=0,w=h.length;x<w;x++){const _=h[x];if(_.isDirectionalLight){const M=r.directional[u];M.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(v),u++}else if(_.isSpotLight){const M=r.spot[g];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(v),M.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),M.direction.sub(s),M.direction.transformDirection(v),g++}else if(_.isRectAreaLight){const M=r.rectArea[p];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(v),n.identity(),a.copy(_.matrixWorld),a.premultiply(v),n.extractRotation(a),M.halfWidth.set(_.width*.5,0,0),M.halfHeight.set(0,_.height*.5,0),M.halfWidth.applyMatrix4(n),M.halfHeight.applyMatrix4(n),p++}else if(_.isPointLight){const M=r.point[f];M.position.setFromMatrixPosition(_.matrixWorld),M.position.applyMatrix4(v),f++}else if(_.isHemisphereLight){const M=r.hemi[m];M.direction.setFromMatrixPosition(_.matrixWorld),M.direction.transformDirection(v),m++}}}return{setup:o,setupView:l,state:r}}function An(c,e){const t=new _u(c,e),i=[],r=[];function s(){i.length=0,r.length=0}function a(h){i.push(h)}function n(h){r.push(h)}function o(h){t.setup(i,h)}function l(h){t.setupView(i,h)}return{init:s,state:{lightsArray:i,shadowsArray:r,lights:t},setupLights:o,setupLightsView:l,pushLight:a,pushShadow:n}}function yu(c,e){let t=new WeakMap;function i(s,a=0){let n;return t.has(s)===!1?(n=new An(c,e),t.set(s,[n])):a>=t.get(s).length?(n=new An(c,e),t.get(s).push(n)):n=t.get(s)[a],n}function r(){t=new WeakMap}return{get:i,dispose:r}}class bu extends Ei{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class wu extends Ei{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.referencePosition=new k,this.nearDistance=1,this.farDistance=1e3,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.referencePosition.copy(e.referencePosition),this.nearDistance=e.nearDistance,this.farDistance=e.farDistance,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Mu=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Su=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Eu(c,e,t){let i=new Os;const r=new Le,s=new Le,a=new Ye,n=new bu({depthPacking:3201}),o=new wu,l={},h=t.maxTextureSize,d={0:1,1:0,2:2},u=new Si({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Le},radius:{value:4}},vertexShader:Mu,fragmentShader:Su}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const g=new Bt;g.setAttribute("position",new Ot(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const p=new Nt(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1,this.render=function(_,M,E){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||_.length===0)return;const L=c.getRenderTarget(),y=c.getActiveCubeFace(),T=c.getActiveMipmapLevel(),D=c.state;D.setBlending(0),D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);for(let F=0,B=_.length;F<B;F++){const z=_[F],R=z.shadow;if(R===void 0){console.warn("THREE.WebGLShadowMap:",z,"has no shadow.");continue}if(R.autoUpdate===!1&&R.needsUpdate===!1)continue;r.copy(R.mapSize);const I=R.getFrameExtents();if(r.multiply(I),s.copy(R.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/I.x),r.x=s.x*I.x,R.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/I.y),r.y=s.y*I.y,R.mapSize.y=s.y)),R.map===null){const W=this.type!==3?{minFilter:1003,magFilter:1003}:{};R.map=new Mi(r.x,r.y,W),R.map.texture.name=z.name+".shadowMap",R.camera.updateProjectionMatrix()}c.setRenderTarget(R.map),c.clear();const P=R.getViewportCount();for(let W=0;W<P;W++){const j=R.getViewport(W);a.set(s.x*j.x,s.y*j.y,s.x*j.z,s.y*j.w),D.viewport(a),R.updateMatrices(z,W),i=R.getFrustum(),w(M,E,R.camera,z,this.type)}R.isPointLightShadow!==!0&&this.type===3&&v(R,E),R.needsUpdate=!1}m.needsUpdate=!1,c.setRenderTarget(L,y,T)};function v(_,M){const E=e.update(p);u.defines.VSM_SAMPLES!==_.blurSamples&&(u.defines.VSM_SAMPLES=_.blurSamples,f.defines.VSM_SAMPLES=_.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),_.mapPass===null&&(_.mapPass=new Mi(r.x,r.y)),u.uniforms.shadow_pass.value=_.map.texture,u.uniforms.resolution.value=_.mapSize,u.uniforms.radius.value=_.radius,c.setRenderTarget(_.mapPass),c.clear(),c.renderBufferDirect(M,null,E,u,p,null),f.uniforms.shadow_pass.value=_.mapPass.texture,f.uniforms.resolution.value=_.mapSize,f.uniforms.radius.value=_.radius,c.setRenderTarget(_.map),c.clear(),c.renderBufferDirect(M,null,E,f,p,null)}function x(_,M,E,L,y,T){let D=null;const F=E.isPointLight===!0?_.customDistanceMaterial:_.customDepthMaterial;if(F!==void 0?D=F:D=E.isPointLight===!0?o:n,c.localClippingEnabled&&M.clipShadows===!0&&Array.isArray(M.clippingPlanes)&&M.clippingPlanes.length!==0||M.displacementMap&&M.displacementScale!==0||M.alphaMap&&M.alphaTest>0){const B=D.uuid,z=M.uuid;let R=l[B];R===void 0&&(R={},l[B]=R);let I=R[z];I===void 0&&(I=D.clone(),R[z]=I),D=I}return D.visible=M.visible,D.wireframe=M.wireframe,T===3?D.side=M.shadowSide!==null?M.shadowSide:M.side:D.side=M.shadowSide!==null?M.shadowSide:d[M.side],D.alphaMap=M.alphaMap,D.alphaTest=M.alphaTest,D.clipShadows=M.clipShadows,D.clippingPlanes=M.clippingPlanes,D.clipIntersection=M.clipIntersection,D.displacementMap=M.displacementMap,D.displacementScale=M.displacementScale,D.displacementBias=M.displacementBias,D.wireframeLinewidth=M.wireframeLinewidth,D.linewidth=M.linewidth,E.isPointLight===!0&&D.isMeshDistanceMaterial===!0&&(D.referencePosition.setFromMatrixPosition(E.matrixWorld),D.nearDistance=L,D.farDistance=y),D}function w(_,M,E,L,y){if(_.visible===!1)return;if(_.layers.test(M.layers)&&(_.isMesh||_.isLine||_.isPoints)&&(_.castShadow||_.receiveShadow&&y===3)&&(!_.frustumCulled||i.intersectsObject(_))){_.modelViewMatrix.multiplyMatrices(E.matrixWorldInverse,_.matrixWorld);const D=e.update(_),F=_.material;if(Array.isArray(F)){const B=D.groups;for(let z=0,R=B.length;z<R;z++){const I=B[z],P=F[I.materialIndex];if(P&&P.visible){const W=x(_,P,L,E.near,E.far,y);c.renderBufferDirect(E,null,D,W,_,I)}}}else if(F.visible){const B=x(_,F,L,E.near,E.far,y);c.renderBufferDirect(E,null,D,B,_,null)}}const T=_.children;for(let D=0,F=T.length;D<F;D++)w(T[D],M,E,L,y)}}function Tu(c,e,t){const i=t.isWebGL2;function r(){let N=!1;const ae=new Ye;let Y=null;const ce=new Ye(0,0,0,0);return{setMask:function(ie){Y!==ie&&!N&&(c.colorMask(ie,ie,ie,ie),Y=ie)},setLocked:function(ie){N=ie},setClear:function(ie,Ne,Je,He,$t){$t===!0&&(ie*=He,Ne*=He,Je*=He),ae.set(ie,Ne,Je,He),ce.equals(ae)===!1&&(c.clearColor(ie,Ne,Je,He),ce.copy(ae))},reset:function(){N=!1,Y=null,ce.set(-1,0,0,0)}}}function s(){let N=!1,ae=null,Y=null,ce=null;return{setTest:function(ie){ie?De(2929):ve(2929)},setMask:function(ie){ae!==ie&&!N&&(c.depthMask(ie),ae=ie)},setFunc:function(ie){if(Y!==ie){if(ie)switch(ie){case 0:c.depthFunc(512);break;case 1:c.depthFunc(519);break;case 2:c.depthFunc(513);break;case 3:c.depthFunc(515);break;case 4:c.depthFunc(514);break;case 5:c.depthFunc(518);break;case 6:c.depthFunc(516);break;case 7:c.depthFunc(517);break;default:c.depthFunc(515)}else c.depthFunc(515);Y=ie}},setLocked:function(ie){N=ie},setClear:function(ie){ce!==ie&&(c.clearDepth(ie),ce=ie)},reset:function(){N=!1,ae=null,Y=null,ce=null}}}function a(){let N=!1,ae=null,Y=null,ce=null,ie=null,Ne=null,Je=null,He=null,$t=null;return{setTest:function(ke){N||(ke?De(2960):ve(2960))},setMask:function(ke){ae!==ke&&!N&&(c.stencilMask(ke),ae=ke)},setFunc:function(ke,Ut,xt){(Y!==ke||ce!==Ut||ie!==xt)&&(c.stencilFunc(ke,Ut,xt),Y=ke,ce=Ut,ie=xt)},setOp:function(ke,Ut,xt){(Ne!==ke||Je!==Ut||He!==xt)&&(c.stencilOp(ke,Ut,xt),Ne=ke,Je=Ut,He=xt)},setLocked:function(ke){N=ke},setClear:function(ke){$t!==ke&&(c.clearStencil(ke),$t=ke)},reset:function(){N=!1,ae=null,Y=null,ce=null,ie=null,Ne=null,Je=null,He=null,$t=null}}}const n=new r,o=new s,l=new a,h=new WeakMap,d=new WeakMap;let u={},f={},g=new WeakMap,p=[],m=null,v=!1,x=null,w=null,_=null,M=null,E=null,L=null,y=null,T=!1,D=null,F=null,B=null,z=null,R=null;const I=c.getParameter(35661);let P=!1,W=0;const j=c.getParameter(7938);j.indexOf("WebGL")!==-1?(W=parseFloat(/^WebGL (\d)/.exec(j)[1]),P=W>=1):j.indexOf("OpenGL ES")!==-1&&(W=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),P=W>=2);let O=null,V={};const $=c.getParameter(3088),H=c.getParameter(2978),Q=new Ye().fromArray($),he=new Ye().fromArray(H);function Ee(N,ae,Y){const ce=new Uint8Array(4),ie=c.createTexture();c.bindTexture(N,ie),c.texParameteri(N,10241,9728),c.texParameteri(N,10240,9728);for(let Ne=0;Ne<Y;Ne++)c.texImage2D(ae+Ne,0,6408,1,1,0,6408,5121,ce);return ie}const J={};J[3553]=Ee(3553,3553,1),J[34067]=Ee(34067,34069,6),n.setClear(0,0,0,1),o.setClear(1),l.setClear(0),De(2929),o.setFunc(3),st(!1),Lt(1),De(2884),$e(0);function De(N){u[N]!==!0&&(c.enable(N),u[N]=!0)}function ve(N){u[N]!==!1&&(c.disable(N),u[N]=!1)}function xe(N,ae){return f[N]!==ae?(c.bindFramebuffer(N,ae),f[N]=ae,i&&(N===36009&&(f[36160]=ae),N===36160&&(f[36009]=ae)),!0):!1}function le(N,ae){let Y=p,ce=!1;if(N)if(Y=g.get(ae),Y===void 0&&(Y=[],g.set(ae,Y)),N.isWebGLMultipleRenderTargets){const ie=N.texture;if(Y.length!==ie.length||Y[0]!==36064){for(let Ne=0,Je=ie.length;Ne<Je;Ne++)Y[Ne]=36064+Ne;Y.length=ie.length,ce=!0}}else Y[0]!==36064&&(Y[0]=36064,ce=!0);else Y[0]!==1029&&(Y[0]=1029,ce=!0);ce&&(t.isWebGL2?c.drawBuffers(Y):e.get("WEBGL_draw_buffers").drawBuffersWEBGL(Y))}function Be(N){return m!==N?(c.useProgram(N),m=N,!0):!1}const Me={100:32774,101:32778,102:32779};if(i)Me[103]=32775,Me[104]=32776;else{const N=e.get("EXT_blend_minmax");N!==null&&(Me[103]=N.MIN_EXT,Me[104]=N.MAX_EXT)}const ge={200:0,201:1,202:768,204:770,210:776,208:774,206:772,203:769,205:771,209:775,207:773};function $e(N,ae,Y,ce,ie,Ne,Je,He){if(N===0){v===!0&&(ve(3042),v=!1);return}if(v===!1&&(De(3042),v=!0),N!==5){if(N!==x||He!==T){if((w!==100||E!==100)&&(c.blendEquation(32774),w=100,E=100),He)switch(N){case 1:c.blendFuncSeparate(1,771,1,771);break;case 2:c.blendFunc(1,1);break;case 3:c.blendFuncSeparate(0,769,0,1);break;case 4:c.blendFuncSeparate(0,768,0,770);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case 1:c.blendFuncSeparate(770,771,1,771);break;case 2:c.blendFunc(770,1);break;case 3:c.blendFuncSeparate(0,769,0,1);break;case 4:c.blendFunc(0,768);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}_=null,M=null,L=null,y=null,x=N,T=He}return}ie=ie||ae,Ne=Ne||Y,Je=Je||ce,(ae!==w||ie!==E)&&(c.blendEquationSeparate(Me[ae],Me[ie]),w=ae,E=ie),(Y!==_||ce!==M||Ne!==L||Je!==y)&&(c.blendFuncSeparate(ge[Y],ge[ce],ge[Ne],ge[Je]),_=Y,M=ce,L=Ne,y=Je),x=N,T=null}function ht(N,ae){N.side===2?ve(2884):De(2884);let Y=N.side===1;ae&&(Y=!Y),st(Y),N.blending===1&&N.transparent===!1?$e(0):$e(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),n.setMask(N.colorWrite);const ce=N.stencilWrite;l.setTest(ce),ce&&(l.setMask(N.stencilWriteMask),l.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),l.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),ze(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?De(32926):ve(32926)}function st(N){D!==N&&(N?c.frontFace(2304):c.frontFace(2305),D=N)}function Lt(N){N!==0?(De(2884),N!==F&&(N===1?c.cullFace(1029):N===2?c.cullFace(1028):c.cullFace(1032))):ve(2884),F=N}function et(N){N!==B&&(P&&c.lineWidth(N),B=N)}function ze(N,ae,Y){N?(De(32823),(z!==ae||R!==Y)&&(c.polygonOffset(ae,Y),z=ae,R=Y)):ve(32823)}function kt(N){N?De(3089):ve(3089)}function Rt(N){N===void 0&&(N=33984+I-1),O!==N&&(c.activeTexture(N),O=N)}function C(N,ae){O===null&&Rt();let Y=V[O];Y===void 0&&(Y={type:void 0,texture:void 0},V[O]=Y),(Y.type!==N||Y.texture!==ae)&&(c.bindTexture(N,ae||J[N]),Y.type=N,Y.texture=ae)}function S(){const N=V[O];N!==void 0&&N.type!==void 0&&(c.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function Z(){try{c.compressedTexImage2D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ee(){try{c.texSubImage2D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function te(){try{c.texSubImage3D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ne(){try{c.compressedTexSubImage2D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function _e(){try{c.texStorage2D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function X(){try{c.texStorage3D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function fe(){try{c.texImage2D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ue(){try{c.texImage3D.apply(c,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function pe(N){Q.equals(N)===!1&&(c.scissor(N.x,N.y,N.z,N.w),Q.copy(N))}function de(N){he.equals(N)===!1&&(c.viewport(N.x,N.y,N.z,N.w),he.copy(N))}function we(N,ae){let Y=d.get(ae);Y===void 0&&(Y=new WeakMap,d.set(ae,Y));let ce=Y.get(N);ce===void 0&&(ce=c.getUniformBlockIndex(ae,N.name),Y.set(N,ce))}function Fe(N,ae){const Y=d.get(ae).get(N);h.get(N)!==Y&&(c.uniformBlockBinding(ae,Y,N.__bindingPointIndex),h.set(N,Y))}function Ge(){c.disable(3042),c.disable(2884),c.disable(2929),c.disable(32823),c.disable(3089),c.disable(2960),c.disable(32926),c.blendEquation(32774),c.blendFunc(1,0),c.blendFuncSeparate(1,0,1,0),c.colorMask(!0,!0,!0,!0),c.clearColor(0,0,0,0),c.depthMask(!0),c.depthFunc(513),c.clearDepth(1),c.stencilMask(4294967295),c.stencilFunc(519,0,4294967295),c.stencilOp(7680,7680,7680),c.clearStencil(0),c.cullFace(1029),c.frontFace(2305),c.polygonOffset(0,0),c.activeTexture(33984),c.bindFramebuffer(36160,null),i===!0&&(c.bindFramebuffer(36009,null),c.bindFramebuffer(36008,null)),c.useProgram(null),c.lineWidth(1),c.scissor(0,0,c.canvas.width,c.canvas.height),c.viewport(0,0,c.canvas.width,c.canvas.height),u={},O=null,V={},f={},g=new WeakMap,p=[],m=null,v=!1,x=null,w=null,_=null,M=null,E=null,L=null,y=null,T=!1,D=null,F=null,B=null,z=null,R=null,Q.set(0,0,c.canvas.width,c.canvas.height),he.set(0,0,c.canvas.width,c.canvas.height),n.reset(),o.reset(),l.reset()}return{buffers:{color:n,depth:o,stencil:l},enable:De,disable:ve,bindFramebuffer:xe,drawBuffers:le,useProgram:Be,setBlending:$e,setMaterial:ht,setFlipSided:st,setCullFace:Lt,setLineWidth:et,setPolygonOffset:ze,setScissorTest:kt,activeTexture:Rt,bindTexture:C,unbindTexture:S,compressedTexImage2D:Z,texImage2D:fe,texImage3D:ue,updateUBOMapping:we,uniformBlockBinding:Fe,texStorage2D:_e,texStorage3D:X,texSubImage2D:ee,texSubImage3D:te,compressedTexSubImage2D:ne,scissor:pe,viewport:de,reset:Ge}}function Au(c,e,t,i,r,s,a){const n=r.isWebGL2,o=r.maxTextures,l=r.maxCubemapSize,h=r.maxTextureSize,d=r.maxSamples,u=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,f=/OculusBrowser/g.test(navigator.userAgent),g=new WeakMap;let p;const m=new WeakMap;let v=!1;try{v=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(C,S){return v?new OffscreenCanvas(C,S):Vr("canvas")}function w(C,S,Z,ee){let te=1;if((C.width>ee||C.height>ee)&&(te=ee/Math.max(C.width,C.height)),te<1||S===!0)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap){const ne=S?Is:Math.floor,_e=ne(te*C.width),X=ne(te*C.height);p===void 0&&(p=x(_e,X));const fe=Z?x(_e,X):p;return fe.width=_e,fe.height=X,fe.getContext("2d").drawImage(C,0,0,_e,X),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+C.width+"x"+C.height+") to ("+_e+"x"+X+")."),fe}else return"data"in C&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+C.width+"x"+C.height+")."),C;return C}function _(C){return Xs(C.width)&&Xs(C.height)}function M(C){return n?!1:C.wrapS!==1001||C.wrapT!==1001||C.minFilter!==1003&&C.minFilter!==1006}function E(C,S){return C.generateMipmaps&&S&&C.minFilter!==1003&&C.minFilter!==1006}function L(C){c.generateMipmap(C)}function y(C,S,Z,ee,te=!1){if(n===!1)return S;if(C!==null){if(c[C]!==void 0)return c[C];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let ne=S;return S===6403&&(Z===5126&&(ne=33326),Z===5131&&(ne=33325),Z===5121&&(ne=33321)),S===33319&&(Z===5126&&(ne=33328),Z===5131&&(ne=33327),Z===5121&&(ne=33323)),S===6408&&(Z===5126&&(ne=34836),Z===5131&&(ne=34842),Z===5121&&(ne=ee===3001&&te===!1?35907:32856),Z===32819&&(ne=32854),Z===32820&&(ne=32855)),(ne===33325||ne===33326||ne===33327||ne===33328||ne===34842||ne===34836)&&e.get("EXT_color_buffer_float"),ne}function T(C,S,Z){return E(C,Z)===!0||C.isFramebufferTexture&&C.minFilter!==1003&&C.minFilter!==1006?Math.log2(Math.max(S.width,S.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?S.mipmaps.length:1}function D(C){return C===1003||C===1004||C===1005?9728:9729}function F(C){const S=C.target;S.removeEventListener("dispose",F),z(S),S.isVideoTexture&&g.delete(S)}function B(C){const S=C.target;S.removeEventListener("dispose",B),I(S)}function z(C){const S=i.get(C);if(S.__webglInit===void 0)return;const Z=C.source,ee=m.get(Z);if(ee){const te=ee[S.__cacheKey];te.usedTimes--,te.usedTimes===0&&R(C),Object.keys(ee).length===0&&m.delete(Z)}i.remove(C)}function R(C){const S=i.get(C);c.deleteTexture(S.__webglTexture);const Z=C.source,ee=m.get(Z);delete ee[S.__cacheKey],a.memory.textures--}function I(C){const S=C.texture,Z=i.get(C),ee=i.get(S);if(ee.__webglTexture!==void 0&&(c.deleteTexture(ee.__webglTexture),a.memory.textures--),C.depthTexture&&C.depthTexture.dispose(),C.isWebGLCubeRenderTarget)for(let te=0;te<6;te++)c.deleteFramebuffer(Z.__webglFramebuffer[te]),Z.__webglDepthbuffer&&c.deleteRenderbuffer(Z.__webglDepthbuffer[te]);else{if(c.deleteFramebuffer(Z.__webglFramebuffer),Z.__webglDepthbuffer&&c.deleteRenderbuffer(Z.__webglDepthbuffer),Z.__webglMultisampledFramebuffer&&c.deleteFramebuffer(Z.__webglMultisampledFramebuffer),Z.__webglColorRenderbuffer)for(let te=0;te<Z.__webglColorRenderbuffer.length;te++)Z.__webglColorRenderbuffer[te]&&c.deleteRenderbuffer(Z.__webglColorRenderbuffer[te]);Z.__webglDepthRenderbuffer&&c.deleteRenderbuffer(Z.__webglDepthRenderbuffer)}if(C.isWebGLMultipleRenderTargets)for(let te=0,ne=S.length;te<ne;te++){const _e=i.get(S[te]);_e.__webglTexture&&(c.deleteTexture(_e.__webglTexture),a.memory.textures--),i.remove(S[te])}i.remove(S),i.remove(C)}let P=0;function W(){P=0}function j(){const C=P;return C>=o&&console.warn("THREE.WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+o),P+=1,C}function O(C){const S=[];return S.push(C.wrapS),S.push(C.wrapT),S.push(C.magFilter),S.push(C.minFilter),S.push(C.anisotropy),S.push(C.internalFormat),S.push(C.format),S.push(C.type),S.push(C.generateMipmaps),S.push(C.premultiplyAlpha),S.push(C.flipY),S.push(C.unpackAlignment),S.push(C.encoding),S.join()}function V(C,S){const Z=i.get(C);if(C.isVideoTexture&&kt(C),C.isRenderTargetTexture===!1&&C.version>0&&Z.__version!==C.version){const ee=C.image;if(ee===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ee.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ve(Z,C,S);return}}t.activeTexture(33984+S),t.bindTexture(3553,Z.__webglTexture)}function $(C,S){const Z=i.get(C);if(C.version>0&&Z.__version!==C.version){ve(Z,C,S);return}t.activeTexture(33984+S),t.bindTexture(35866,Z.__webglTexture)}function H(C,S){const Z=i.get(C);if(C.version>0&&Z.__version!==C.version){ve(Z,C,S);return}t.activeTexture(33984+S),t.bindTexture(32879,Z.__webglTexture)}function Q(C,S){const Z=i.get(C);if(C.version>0&&Z.__version!==C.version){xe(Z,C,S);return}t.activeTexture(33984+S),t.bindTexture(34067,Z.__webglTexture)}const he={1e3:10497,1001:33071,1002:33648},Ee={1003:9728,1004:9984,1005:9986,1006:9729,1007:9985,1008:9987};function J(C,S,Z){if(Z?(c.texParameteri(C,10242,he[S.wrapS]),c.texParameteri(C,10243,he[S.wrapT]),(C===32879||C===35866)&&c.texParameteri(C,32882,he[S.wrapR]),c.texParameteri(C,10240,Ee[S.magFilter]),c.texParameteri(C,10241,Ee[S.minFilter])):(c.texParameteri(C,10242,33071),c.texParameteri(C,10243,33071),(C===32879||C===35866)&&c.texParameteri(C,32882,33071),(S.wrapS!==1001||S.wrapT!==1001)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),c.texParameteri(C,10240,D(S.magFilter)),c.texParameteri(C,10241,D(S.minFilter)),S.minFilter!==1003&&S.minFilter!==1006&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),e.has("EXT_texture_filter_anisotropic")===!0){const ee=e.get("EXT_texture_filter_anisotropic");if(S.type===1015&&e.has("OES_texture_float_linear")===!1||n===!1&&S.type===1016&&e.has("OES_texture_half_float_linear")===!1)return;(S.anisotropy>1||i.get(S).__currentAnisotropy)&&(c.texParameterf(C,ee.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,r.getMaxAnisotropy())),i.get(S).__currentAnisotropy=S.anisotropy)}}function De(C,S){let Z=!1;C.__webglInit===void 0&&(C.__webglInit=!0,S.addEventListener("dispose",F));const ee=S.source;let te=m.get(ee);te===void 0&&(te={},m.set(ee,te));const ne=O(S);if(ne!==C.__cacheKey){te[ne]===void 0&&(te[ne]={texture:c.createTexture(),usedTimes:0},a.memory.textures++,Z=!0),te[ne].usedTimes++;const _e=te[C.__cacheKey];_e!==void 0&&(te[C.__cacheKey].usedTimes--,_e.usedTimes===0&&R(S)),C.__cacheKey=ne,C.__webglTexture=te[ne].texture}return Z}function ve(C,S,Z){let ee=3553;S.isDataArrayTexture&&(ee=35866),S.isData3DTexture&&(ee=32879);const te=De(C,S),ne=S.source;if(t.activeTexture(33984+Z),t.bindTexture(ee,C.__webglTexture),ne.version!==ne.__currentVersion||te===!0){c.pixelStorei(37440,S.flipY),c.pixelStorei(37441,S.premultiplyAlpha),c.pixelStorei(3317,S.unpackAlignment),c.pixelStorei(37443,0);const _e=M(S)&&_(S.image)===!1;let X=w(S.image,_e,!1,h);X=Rt(S,X);const fe=_(X)||n,ue=s.convert(S.format,S.encoding);let pe=s.convert(S.type),de=y(S.internalFormat,ue,pe,S.encoding,S.isVideoTexture);J(ee,S,fe);let we;const Fe=S.mipmaps,Ge=n&&S.isVideoTexture!==!0,N=ne.__currentVersion===void 0||te===!0,ae=T(S,X,fe);if(S.isDepthTexture)de=6402,n?S.type===1015?de=36012:S.type===1014?de=33190:S.type===1020?de=35056:de=33189:S.type===1015&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),S.format===1026&&de===6402&&S.type!==1012&&S.type!==1014&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),S.type=1014,pe=s.convert(S.type)),S.format===1027&&de===6402&&(de=34041,S.type!==1020&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),S.type=1020,pe=s.convert(S.type))),N&&(Ge?t.texStorage2D(3553,1,de,X.width,X.height):t.texImage2D(3553,0,de,X.width,X.height,0,ue,pe,null));else if(S.isDataTexture)if(Fe.length>0&&fe){Ge&&N&&t.texStorage2D(3553,ae,de,Fe[0].width,Fe[0].height);for(let Y=0,ce=Fe.length;Y<ce;Y++)we=Fe[Y],Ge?t.texSubImage2D(3553,Y,0,0,we.width,we.height,ue,pe,we.data):t.texImage2D(3553,Y,de,we.width,we.height,0,ue,pe,we.data);S.generateMipmaps=!1}else Ge?(N&&t.texStorage2D(3553,ae,de,X.width,X.height),t.texSubImage2D(3553,0,0,0,X.width,X.height,ue,pe,X.data)):t.texImage2D(3553,0,de,X.width,X.height,0,ue,pe,X.data);else if(S.isCompressedTexture){Ge&&N&&t.texStorage2D(3553,ae,de,Fe[0].width,Fe[0].height);for(let Y=0,ce=Fe.length;Y<ce;Y++)we=Fe[Y],S.format!==1023?ue!==null?Ge?t.compressedTexSubImage2D(3553,Y,0,0,we.width,we.height,ue,we.data):t.compressedTexImage2D(3553,Y,de,we.width,we.height,0,we.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ge?t.texSubImage2D(3553,Y,0,0,we.width,we.height,ue,pe,we.data):t.texImage2D(3553,Y,de,we.width,we.height,0,ue,pe,we.data)}else if(S.isDataArrayTexture)Ge?(N&&t.texStorage3D(35866,ae,de,X.width,X.height,X.depth),t.texSubImage3D(35866,0,0,0,0,X.width,X.height,X.depth,ue,pe,X.data)):t.texImage3D(35866,0,de,X.width,X.height,X.depth,0,ue,pe,X.data);else if(S.isData3DTexture)Ge?(N&&t.texStorage3D(32879,ae,de,X.width,X.height,X.depth),t.texSubImage3D(32879,0,0,0,0,X.width,X.height,X.depth,ue,pe,X.data)):t.texImage3D(32879,0,de,X.width,X.height,X.depth,0,ue,pe,X.data);else if(S.isFramebufferTexture){if(N)if(Ge)t.texStorage2D(3553,ae,de,X.width,X.height);else{let Y=X.width,ce=X.height;for(let ie=0;ie<ae;ie++)t.texImage2D(3553,ie,de,Y,ce,0,ue,pe,null),Y>>=1,ce>>=1}}else if(Fe.length>0&&fe){Ge&&N&&t.texStorage2D(3553,ae,de,Fe[0].width,Fe[0].height);for(let Y=0,ce=Fe.length;Y<ce;Y++)we=Fe[Y],Ge?t.texSubImage2D(3553,Y,0,0,ue,pe,we):t.texImage2D(3553,Y,de,ue,pe,we);S.generateMipmaps=!1}else Ge?(N&&t.texStorage2D(3553,ae,de,X.width,X.height),t.texSubImage2D(3553,0,0,0,ue,pe,X)):t.texImage2D(3553,0,de,ue,pe,X);E(S,fe)&&L(ee),ne.__currentVersion=ne.version,S.onUpdate&&S.onUpdate(S)}C.__version=S.version}function xe(C,S,Z){if(S.image.length!==6)return;const ee=De(C,S),te=S.source;if(t.activeTexture(33984+Z),t.bindTexture(34067,C.__webglTexture),te.version!==te.__currentVersion||ee===!0){c.pixelStorei(37440,S.flipY),c.pixelStorei(37441,S.premultiplyAlpha),c.pixelStorei(3317,S.unpackAlignment),c.pixelStorei(37443,0);const ne=S.isCompressedTexture||S.image[0].isCompressedTexture,_e=S.image[0]&&S.image[0].isDataTexture,X=[];for(let Y=0;Y<6;Y++)!ne&&!_e?X[Y]=w(S.image[Y],!1,!0,l):X[Y]=_e?S.image[Y].image:S.image[Y],X[Y]=Rt(S,X[Y]);const fe=X[0],ue=_(fe)||n,pe=s.convert(S.format,S.encoding),de=s.convert(S.type),we=y(S.internalFormat,pe,de,S.encoding),Fe=n&&S.isVideoTexture!==!0,Ge=te.__currentVersion===void 0||ee===!0;let N=T(S,fe,ue);J(34067,S,ue);let ae;if(ne){Fe&&Ge&&t.texStorage2D(34067,N,we,fe.width,fe.height);for(let Y=0;Y<6;Y++){ae=X[Y].mipmaps;for(let ce=0;ce<ae.length;ce++){const ie=ae[ce];S.format!==1023?pe!==null?Fe?t.compressedTexSubImage2D(34069+Y,ce,0,0,ie.width,ie.height,pe,ie.data):t.compressedTexImage2D(34069+Y,ce,we,ie.width,ie.height,0,ie.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Fe?t.texSubImage2D(34069+Y,ce,0,0,ie.width,ie.height,pe,de,ie.data):t.texImage2D(34069+Y,ce,we,ie.width,ie.height,0,pe,de,ie.data)}}}else{ae=S.mipmaps,Fe&&Ge&&(ae.length>0&&N++,t.texStorage2D(34067,N,we,X[0].width,X[0].height));for(let Y=0;Y<6;Y++)if(_e){Fe?t.texSubImage2D(34069+Y,0,0,0,X[Y].width,X[Y].height,pe,de,X[Y].data):t.texImage2D(34069+Y,0,we,X[Y].width,X[Y].height,0,pe,de,X[Y].data);for(let ce=0;ce<ae.length;ce++){const ie=ae[ce].image[Y].image;Fe?t.texSubImage2D(34069+Y,ce+1,0,0,ie.width,ie.height,pe,de,ie.data):t.texImage2D(34069+Y,ce+1,we,ie.width,ie.height,0,pe,de,ie.data)}}else{Fe?t.texSubImage2D(34069+Y,0,0,0,pe,de,X[Y]):t.texImage2D(34069+Y,0,we,pe,de,X[Y]);for(let ce=0;ce<ae.length;ce++){const ie=ae[ce];Fe?t.texSubImage2D(34069+Y,ce+1,0,0,pe,de,ie.image[Y]):t.texImage2D(34069+Y,ce+1,we,pe,de,ie.image[Y])}}}E(S,ue)&&L(34067),te.__currentVersion=te.version,S.onUpdate&&S.onUpdate(S)}C.__version=S.version}function le(C,S,Z,ee,te){const ne=s.convert(Z.format,Z.encoding),_e=s.convert(Z.type),X=y(Z.internalFormat,ne,_e,Z.encoding);i.get(S).__hasExternalTextures||(te===32879||te===35866?t.texImage3D(te,0,X,S.width,S.height,S.depth,0,ne,_e,null):t.texImage2D(te,0,X,S.width,S.height,0,ne,_e,null)),t.bindFramebuffer(36160,C),ze(S)?u.framebufferTexture2DMultisampleEXT(36160,ee,te,i.get(Z).__webglTexture,0,et(S)):c.framebufferTexture2D(36160,ee,te,i.get(Z).__webglTexture,0),t.bindFramebuffer(36160,null)}function Be(C,S,Z){if(c.bindRenderbuffer(36161,C),S.depthBuffer&&!S.stencilBuffer){let ee=33189;if(Z||ze(S)){const te=S.depthTexture;te&&te.isDepthTexture&&(te.type===1015?ee=36012:te.type===1014&&(ee=33190));const ne=et(S);ze(S)?u.renderbufferStorageMultisampleEXT(36161,ne,ee,S.width,S.height):c.renderbufferStorageMultisample(36161,ne,ee,S.width,S.height)}else c.renderbufferStorage(36161,ee,S.width,S.height);c.framebufferRenderbuffer(36160,36096,36161,C)}else if(S.depthBuffer&&S.stencilBuffer){const ee=et(S);Z&&ze(S)===!1?c.renderbufferStorageMultisample(36161,ee,35056,S.width,S.height):ze(S)?u.renderbufferStorageMultisampleEXT(36161,ee,35056,S.width,S.height):c.renderbufferStorage(36161,34041,S.width,S.height),c.framebufferRenderbuffer(36160,33306,36161,C)}else{const ee=S.isWebGLMultipleRenderTargets===!0?S.texture:[S.texture];for(let te=0;te<ee.length;te++){const ne=ee[te],_e=s.convert(ne.format,ne.encoding),X=s.convert(ne.type),fe=y(ne.internalFormat,_e,X,ne.encoding),ue=et(S);Z&&ze(S)===!1?c.renderbufferStorageMultisample(36161,ue,fe,S.width,S.height):ze(S)?u.renderbufferStorageMultisampleEXT(36161,ue,fe,S.width,S.height):c.renderbufferStorage(36161,fe,S.width,S.height)}}c.bindRenderbuffer(36161,null)}function Me(C,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(36160,C),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(S.depthTexture).__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),V(S.depthTexture,0);const Z=i.get(S.depthTexture).__webglTexture,ee=et(S);if(S.depthTexture.format===1026)ze(S)?u.framebufferTexture2DMultisampleEXT(36160,36096,3553,Z,0,ee):c.framebufferTexture2D(36160,36096,3553,Z,0);else if(S.depthTexture.format===1027)ze(S)?u.framebufferTexture2DMultisampleEXT(36160,33306,3553,Z,0,ee):c.framebufferTexture2D(36160,33306,3553,Z,0);else throw new Error("Unknown depthTexture format")}function ge(C){const S=i.get(C),Z=C.isWebGLCubeRenderTarget===!0;if(C.depthTexture&&!S.__autoAllocateDepthBuffer){if(Z)throw new Error("target.depthTexture not supported in Cube render targets");Me(S.__webglFramebuffer,C)}else if(Z){S.__webglDepthbuffer=[];for(let ee=0;ee<6;ee++)t.bindFramebuffer(36160,S.__webglFramebuffer[ee]),S.__webglDepthbuffer[ee]=c.createRenderbuffer(),Be(S.__webglDepthbuffer[ee],C,!1)}else t.bindFramebuffer(36160,S.__webglFramebuffer),S.__webglDepthbuffer=c.createRenderbuffer(),Be(S.__webglDepthbuffer,C,!1);t.bindFramebuffer(36160,null)}function $e(C,S,Z){const ee=i.get(C);S!==void 0&&le(ee.__webglFramebuffer,C,C.texture,36064,3553),Z!==void 0&&ge(C)}function ht(C){const S=C.texture,Z=i.get(C),ee=i.get(S);C.addEventListener("dispose",B),C.isWebGLMultipleRenderTargets!==!0&&(ee.__webglTexture===void 0&&(ee.__webglTexture=c.createTexture()),ee.__version=S.version,a.memory.textures++);const te=C.isWebGLCubeRenderTarget===!0,ne=C.isWebGLMultipleRenderTargets===!0,_e=_(C)||n;if(te){Z.__webglFramebuffer=[];for(let X=0;X<6;X++)Z.__webglFramebuffer[X]=c.createFramebuffer()}else{if(Z.__webglFramebuffer=c.createFramebuffer(),ne)if(r.drawBuffers){const X=C.texture;for(let fe=0,ue=X.length;fe<ue;fe++){const pe=i.get(X[fe]);pe.__webglTexture===void 0&&(pe.__webglTexture=c.createTexture(),a.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(n&&C.samples>0&&ze(C)===!1){const X=ne?S:[S];Z.__webglMultisampledFramebuffer=c.createFramebuffer(),Z.__webglColorRenderbuffer=[],t.bindFramebuffer(36160,Z.__webglMultisampledFramebuffer);for(let fe=0;fe<X.length;fe++){const ue=X[fe];Z.__webglColorRenderbuffer[fe]=c.createRenderbuffer(),c.bindRenderbuffer(36161,Z.__webglColorRenderbuffer[fe]);const pe=s.convert(ue.format,ue.encoding),de=s.convert(ue.type),we=y(ue.internalFormat,pe,de,ue.encoding),Fe=et(C);c.renderbufferStorageMultisample(36161,Fe,we,C.width,C.height),c.framebufferRenderbuffer(36160,36064+fe,36161,Z.__webglColorRenderbuffer[fe])}c.bindRenderbuffer(36161,null),C.depthBuffer&&(Z.__webglDepthRenderbuffer=c.createRenderbuffer(),Be(Z.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(36160,null)}}if(te){t.bindTexture(34067,ee.__webglTexture),J(34067,S,_e);for(let X=0;X<6;X++)le(Z.__webglFramebuffer[X],C,S,36064,34069+X);E(S,_e)&&L(34067),t.unbindTexture()}else if(ne){const X=C.texture;for(let fe=0,ue=X.length;fe<ue;fe++){const pe=X[fe],de=i.get(pe);t.bindTexture(3553,de.__webglTexture),J(3553,pe,_e),le(Z.__webglFramebuffer,C,pe,36064+fe,3553),E(pe,_e)&&L(3553)}t.unbindTexture()}else{let X=3553;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(n?X=C.isWebGL3DRenderTarget?32879:35866:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),t.bindTexture(X,ee.__webglTexture),J(X,S,_e),le(Z.__webglFramebuffer,C,S,36064,X),E(S,_e)&&L(X),t.unbindTexture()}C.depthBuffer&&ge(C)}function st(C){const S=_(C)||n,Z=C.isWebGLMultipleRenderTargets===!0?C.texture:[C.texture];for(let ee=0,te=Z.length;ee<te;ee++){const ne=Z[ee];if(E(ne,S)){const _e=C.isWebGLCubeRenderTarget?34067:3553,X=i.get(ne).__webglTexture;t.bindTexture(_e,X),L(_e),t.unbindTexture()}}}function Lt(C){if(n&&C.samples>0&&ze(C)===!1){const S=C.isWebGLMultipleRenderTargets?C.texture:[C.texture],Z=C.width,ee=C.height;let te=16384;const ne=[],_e=C.stencilBuffer?33306:36096,X=i.get(C),fe=C.isWebGLMultipleRenderTargets===!0;if(fe)for(let ue=0;ue<S.length;ue++)t.bindFramebuffer(36160,X.__webglMultisampledFramebuffer),c.framebufferRenderbuffer(36160,36064+ue,36161,null),t.bindFramebuffer(36160,X.__webglFramebuffer),c.framebufferTexture2D(36009,36064+ue,3553,null,0);t.bindFramebuffer(36008,X.__webglMultisampledFramebuffer),t.bindFramebuffer(36009,X.__webglFramebuffer);for(let ue=0;ue<S.length;ue++){ne.push(36064+ue),C.depthBuffer&&ne.push(_e);const pe=X.__ignoreDepthValues!==void 0?X.__ignoreDepthValues:!1;if(pe===!1&&(C.depthBuffer&&(te|=256),C.stencilBuffer&&(te|=1024)),fe&&c.framebufferRenderbuffer(36008,36064,36161,X.__webglColorRenderbuffer[ue]),pe===!0&&(c.invalidateFramebuffer(36008,[_e]),c.invalidateFramebuffer(36009,[_e])),fe){const de=i.get(S[ue]).__webglTexture;c.framebufferTexture2D(36009,36064,3553,de,0)}c.blitFramebuffer(0,0,Z,ee,0,0,Z,ee,te,9728),f&&c.invalidateFramebuffer(36008,ne)}if(t.bindFramebuffer(36008,null),t.bindFramebuffer(36009,null),fe)for(let ue=0;ue<S.length;ue++){t.bindFramebuffer(36160,X.__webglMultisampledFramebuffer),c.framebufferRenderbuffer(36160,36064+ue,36161,X.__webglColorRenderbuffer[ue]);const pe=i.get(S[ue]).__webglTexture;t.bindFramebuffer(36160,X.__webglFramebuffer),c.framebufferTexture2D(36009,36064+ue,3553,pe,0)}t.bindFramebuffer(36009,X.__webglMultisampledFramebuffer)}}function et(C){return Math.min(d,C.samples)}function ze(C){const S=i.get(C);return n&&C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function kt(C){const S=a.render.frame;g.get(C)!==S&&(g.set(C,S),C.update())}function Rt(C,S){const Z=C.encoding,ee=C.format,te=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||C.format===1035||Z!==3e3&&(Z===3001?n===!1?e.has("EXT_sRGB")===!0&&ee===1023?(C.format=1035,C.minFilter=1006,C.generateMipmaps=!1):S=ta.sRGBToLinear(S):(ee!==1023||te!==1009)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture encoding:",Z)),S}this.allocateTextureUnit=j,this.resetTextureUnits=W,this.setTexture2D=V,this.setTexture2DArray=$,this.setTexture3D=H,this.setTextureCube=Q,this.rebindTextures=$e,this.setupRenderTarget=ht,this.updateRenderTargetMipmap=st,this.updateMultisampleRenderTarget=Lt,this.setupDepthRenderbuffer=ge,this.setupFrameBufferTexture=le,this.useMultisampledRTT=ze}function Cu(c,e,t){const i=t.isWebGL2;function r(s,a=null){let n;if(s===1009)return 5121;if(s===1017)return 32819;if(s===1018)return 32820;if(s===1010)return 5120;if(s===1011)return 5122;if(s===1012)return 5123;if(s===1013)return 5124;if(s===1014)return 5125;if(s===1015)return 5126;if(s===1016)return i?5131:(n=e.get("OES_texture_half_float"),n!==null?n.HALF_FLOAT_OES:null);if(s===1021)return 6406;if(s===1023)return 6408;if(s===1024)return 6409;if(s===1025)return 6410;if(s===1026)return 6402;if(s===1027)return 34041;if(s===1028)return 6403;if(s===1022)return console.warn("THREE.WebGLRenderer: THREE.RGBFormat has been removed. Use THREE.RGBAFormat instead. https://github.com/mrdoob/three.js/pull/23228"),6408;if(s===1035)return n=e.get("EXT_sRGB"),n!==null?n.SRGB_ALPHA_EXT:null;if(s===1029)return 36244;if(s===1030)return 33319;if(s===1031)return 33320;if(s===1033)return 36249;if(s===33776||s===33777||s===33778||s===33779)if(a===3001)if(n=e.get("WEBGL_compressed_texture_s3tc_srgb"),n!==null){if(s===33776)return n.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===33777)return n.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===33778)return n.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===33779)return n.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(n=e.get("WEBGL_compressed_texture_s3tc"),n!==null){if(s===33776)return n.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===33777)return n.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===33778)return n.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===33779)return n.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===35840||s===35841||s===35842||s===35843)if(n=e.get("WEBGL_compressed_texture_pvrtc"),n!==null){if(s===35840)return n.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===35841)return n.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===35842)return n.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===35843)return n.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===36196)return n=e.get("WEBGL_compressed_texture_etc1"),n!==null?n.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===37492||s===37496)if(n=e.get("WEBGL_compressed_texture_etc"),n!==null){if(s===37492)return a===3001?n.COMPRESSED_SRGB8_ETC2:n.COMPRESSED_RGB8_ETC2;if(s===37496)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:n.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===37808||s===37809||s===37810||s===37811||s===37812||s===37813||s===37814||s===37815||s===37816||s===37817||s===37818||s===37819||s===37820||s===37821)if(n=e.get("WEBGL_compressed_texture_astc"),n!==null){if(s===37808)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:n.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===37809)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:n.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===37810)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:n.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===37811)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:n.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===37812)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:n.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===37813)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:n.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===37814)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:n.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===37815)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:n.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===37816)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:n.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===37817)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:n.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===37818)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:n.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===37819)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:n.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===37820)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:n.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===37821)return a===3001?n.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:n.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===36492)if(n=e.get("EXT_texture_compression_bptc"),n!==null){if(s===36492)return a===3001?n.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:n.COMPRESSED_RGBA_BPTC_UNORM_EXT}else return null;return s===1020?i?34042:(n=e.get("WEBGL_depth_texture"),n!==null?n.UNSIGNED_INT_24_8_WEBGL:null):c[s]!==void 0?c[s]:null}return{convert:r}}class Lu extends ft{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class zr extends at{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ru={type:"move"};class Ss{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new zr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new zr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new k,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new k),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new zr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new k,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new k),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,a=null;const n=this._targetRay,o=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(const p of e.hand.values()){const m=t.getJointPose(p,i);if(l.joints[p.jointName]===void 0){const x=new zr;x.matrixAutoUpdate=!1,x.visible=!1,l.joints[p.jointName]=x,l.add(x)}const v=l.joints[p.jointName];m!==null&&(v.matrix.fromArray(m.transform.matrix),v.matrix.decompose(v.position,v.rotation,v.scale),v.jointRadius=m.radius),v.visible=m!==null}const h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,g=.005;l.inputState.pinching&&u>f+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&u<=f-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else o!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1));n!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(n.matrix.fromArray(r.transform.matrix),n.matrix.decompose(n.position,n.rotation,n.scale),r.linearVelocity?(n.hasLinearVelocity=!0,n.linearVelocity.copy(r.linearVelocity)):n.hasLinearVelocity=!1,r.angularVelocity?(n.hasAngularVelocity=!0,n.angularVelocity.copy(r.angularVelocity)):n.hasAngularVelocity=!1,this.dispatchEvent(Ru)))}return n!==null&&(n.visible=r!==null),o!==null&&(o.visible=s!==null),l!==null&&(l.visible=a!==null),this}}class Du extends gt{constructor(e,t,i,r,s,a,n,o,l,h){if(h=h!==void 0?h:1026,h!==1026&&h!==1027)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===1026&&(i=1014),i===void 0&&h===1027&&(i=1020),super(null,r,s,a,n,o,h,i,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=n!==void 0?n:1003,this.minFilter=o!==void 0?o:1003,this.flipY=!1,this.generateMipmaps=!1}}class Pu extends Xi{constructor(e,t){super();const i=this;let r=null,s=1,a=null,n="local-floor",o=null,l=null,h=null,d=null,u=null,f=null;const g=t.getContextAttributes();let p=null,m=null;const v=[],x=[],w=new ft;w.layers.enable(1),w.viewport=new Ye;const _=new ft;_.layers.enable(2),_.viewport=new Ye;const M=[w,_],E=new Lu;E.layers.enable(1),E.layers.enable(2);let L=null,y=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(O){let V=v[O];return V===void 0&&(V=new Ss,v[O]=V),V.getTargetRaySpace()},this.getControllerGrip=function(O){let V=v[O];return V===void 0&&(V=new Ss,v[O]=V),V.getGripSpace()},this.getHand=function(O){let V=v[O];return V===void 0&&(V=new Ss,v[O]=V),V.getHandSpace()};function T(O){const V=x.indexOf(O.inputSource);if(V===-1)return;const $=v[V];$!==void 0&&$.dispatchEvent({type:O.type,data:O.inputSource})}function D(){r.removeEventListener("select",T),r.removeEventListener("selectstart",T),r.removeEventListener("selectend",T),r.removeEventListener("squeeze",T),r.removeEventListener("squeezestart",T),r.removeEventListener("squeezeend",T),r.removeEventListener("end",D),r.removeEventListener("inputsourceschange",F);for(let O=0;O<v.length;O++){const V=x[O];V!==null&&(x[O]=null,v[O].disconnect(V))}L=null,y=null,e.setRenderTarget(p),u=null,d=null,h=null,r=null,m=null,j.stop(),i.isPresenting=!1,i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(O){s=O,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(O){n=O,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return o||a},this.setReferenceSpace=function(O){o=O},this.getBaseLayer=function(){return d!==null?d:u},this.getBinding=function(){return h},this.getFrame=function(){return f},this.getSession=function(){return r},this.setSession=async function(O){if(r=O,r!==null){if(p=e.getRenderTarget(),r.addEventListener("select",T),r.addEventListener("selectstart",T),r.addEventListener("selectend",T),r.addEventListener("squeeze",T),r.addEventListener("squeezestart",T),r.addEventListener("squeezeend",T),r.addEventListener("end",D),r.addEventListener("inputsourceschange",F),g.xrCompatible!==!0&&await t.makeXRCompatible(),r.renderState.layers===void 0||e.capabilities.isWebGL2===!1){const V={antialias:r.renderState.layers===void 0?g.antialias:!0,alpha:g.alpha,depth:g.depth,stencil:g.stencil,framebufferScaleFactor:s};u=new XRWebGLLayer(r,t,V),r.updateRenderState({baseLayer:u}),m=new Mi(u.framebufferWidth,u.framebufferHeight,{format:1023,type:1009,encoding:e.outputEncoding})}else{let V=null,$=null,H=null;g.depth&&(H=g.stencil?35056:33190,V=g.stencil?1027:1026,$=g.stencil?1020:1014);const Q={colorFormat:32856,depthFormat:H,scaleFactor:s};h=new XRWebGLBinding(r,t),d=h.createProjectionLayer(Q),r.updateRenderState({layers:[d]}),m=new Mi(d.textureWidth,d.textureHeight,{format:1023,type:1009,depthTexture:new Du(d.textureWidth,d.textureHeight,$,void 0,void 0,void 0,void 0,void 0,void 0,V),stencilBuffer:g.stencil,encoding:e.outputEncoding,samples:g.antialias?4:0});const he=e.properties.get(m);he.__ignoreDepthValues=d.ignoreDepthValues}m.isXRRenderTarget=!0,this.setFoveation(1),o=null,a=await r.requestReferenceSpace(n),j.setContext(r),j.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}};function F(O){for(let V=0;V<O.removed.length;V++){const $=O.removed[V],H=x.indexOf($);H>=0&&(x[H]=null,v[H].dispatchEvent({type:"disconnected",data:$}))}for(let V=0;V<O.added.length;V++){const $=O.added[V];let H=x.indexOf($);if(H===-1){for(let he=0;he<v.length;he++)if(he>=x.length){x.push($),H=he;break}else if(x[he]===null){x[he]=$,H=he;break}if(H===-1)break}const Q=v[H];Q&&Q.dispatchEvent({type:"connected",data:$})}}const B=new k,z=new k;function R(O,V,$){B.setFromMatrixPosition(V.matrixWorld),z.setFromMatrixPosition($.matrixWorld);const H=B.distanceTo(z),Q=V.projectionMatrix.elements,he=$.projectionMatrix.elements,Ee=Q[14]/(Q[10]-1),J=Q[14]/(Q[10]+1),De=(Q[9]+1)/Q[5],ve=(Q[9]-1)/Q[5],xe=(Q[8]-1)/Q[0],le=(he[8]+1)/he[0],Be=Ee*xe,Me=Ee*le,ge=H/(-xe+le),$e=ge*-xe;V.matrixWorld.decompose(O.position,O.quaternion,O.scale),O.translateX($e),O.translateZ(ge),O.matrixWorld.compose(O.position,O.quaternion,O.scale),O.matrixWorldInverse.copy(O.matrixWorld).invert();const ht=Ee+ge,st=J+ge,Lt=Be-$e,et=Me+(H-$e),ze=De*J/st*ht,kt=ve*J/st*ht;O.projectionMatrix.makePerspective(Lt,et,ze,kt,ht,st)}function I(O,V){V===null?O.matrixWorld.copy(O.matrix):O.matrixWorld.multiplyMatrices(V.matrixWorld,O.matrix),O.matrixWorldInverse.copy(O.matrixWorld).invert()}this.updateCamera=function(O){if(r===null)return;E.near=_.near=w.near=O.near,E.far=_.far=w.far=O.far,(L!==E.near||y!==E.far)&&(r.updateRenderState({depthNear:E.near,depthFar:E.far}),L=E.near,y=E.far);const V=O.parent,$=E.cameras;I(E,V);for(let Q=0;Q<$.length;Q++)I($[Q],V);E.matrixWorld.decompose(E.position,E.quaternion,E.scale),O.position.copy(E.position),O.quaternion.copy(E.quaternion),O.scale.copy(E.scale),O.matrix.copy(E.matrix),O.matrixWorld.copy(E.matrixWorld);const H=O.children;for(let Q=0,he=H.length;Q<he;Q++)H[Q].updateMatrixWorld(!0);$.length===2?R(E,w,_):E.projectionMatrix.copy(w.projectionMatrix)},this.getCamera=function(){return E},this.getFoveation=function(){if(d!==null)return d.fixedFoveation;if(u!==null)return u.fixedFoveation},this.setFoveation=function(O){d!==null&&(d.fixedFoveation=O),u!==null&&u.fixedFoveation!==void 0&&(u.fixedFoveation=O)};let P=null;function W(O,V){if(l=V.getViewerPose(o||a),f=V,l!==null){const $=l.views;u!==null&&(e.setRenderTargetFramebuffer(m,u.framebuffer),e.setRenderTarget(m));let H=!1;$.length!==E.cameras.length&&(E.cameras.length=0,H=!0);for(let Q=0;Q<$.length;Q++){const he=$[Q];let Ee=null;if(u!==null)Ee=u.getViewport(he);else{const De=h.getViewSubImage(d,he);Ee=De.viewport,Q===0&&(e.setRenderTargetTextures(m,De.colorTexture,d.ignoreDepthValues?void 0:De.depthStencilTexture),e.setRenderTarget(m))}let J=M[Q];J===void 0&&(J=new ft,J.layers.enable(Q),J.viewport=new Ye,M[Q]=J),J.matrix.fromArray(he.transform.matrix),J.projectionMatrix.fromArray(he.projectionMatrix),J.viewport.set(Ee.x,Ee.y,Ee.width,Ee.height),Q===0&&E.matrix.copy(J.matrix),H===!0&&E.cameras.push(J)}}for(let $=0;$<v.length;$++){const H=x[$],Q=v[$];H!==null&&Q!==void 0&&Q.update(H,V,o||a)}P&&P(O,V),f=null}const j=new ha;j.setAnimationLoop(W),this.setAnimationLoop=function(O){P=O},this.dispose=function(){}}}function Fu(c,e){function t(p,m){p.fogColor.value.copy(m.color),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function i(p,m,v,x,w){m.isMeshBasicMaterial||m.isMeshLambertMaterial?r(p,m):m.isMeshToonMaterial?(r(p,m),h(p,m)):m.isMeshPhongMaterial?(r(p,m),l(p,m)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&u(p,m,w)):m.isMeshMatcapMaterial?(r(p,m),f(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),g(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(s(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?n(p,m,v,x):m.isSpriteMaterial?o(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map),m.alphaMap&&(p.alphaMap.value=m.alphaMap),m.bumpMap&&(p.bumpMap.value=m.bumpMap,p.bumpScale.value=m.bumpScale,m.side===1&&(p.bumpScale.value*=-1)),m.displacementMap&&(p.displacementMap.value=m.displacementMap,p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap),m.normalMap&&(p.normalMap.value=m.normalMap,p.normalScale.value.copy(m.normalScale),m.side===1&&p.normalScale.value.negate()),m.specularMap&&(p.specularMap.value=m.specularMap),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);const v=e.get(m).envMap;if(v&&(p.envMap.value=v,p.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap){p.lightMap.value=m.lightMap;const _=c.physicallyCorrectLights!==!0?Math.PI:1;p.lightMapIntensity.value=m.lightMapIntensity*_}m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity);let x;m.map?x=m.map:m.specularMap?x=m.specularMap:m.displacementMap?x=m.displacementMap:m.normalMap?x=m.normalMap:m.bumpMap?x=m.bumpMap:m.roughnessMap?x=m.roughnessMap:m.metalnessMap?x=m.metalnessMap:m.alphaMap?x=m.alphaMap:m.emissiveMap?x=m.emissiveMap:m.clearcoatMap?x=m.clearcoatMap:m.clearcoatNormalMap?x=m.clearcoatNormalMap:m.clearcoatRoughnessMap?x=m.clearcoatRoughnessMap:m.iridescenceMap?x=m.iridescenceMap:m.iridescenceThicknessMap?x=m.iridescenceThicknessMap:m.specularIntensityMap?x=m.specularIntensityMap:m.specularColorMap?x=m.specularColorMap:m.transmissionMap?x=m.transmissionMap:m.thicknessMap?x=m.thicknessMap:m.sheenColorMap?x=m.sheenColorMap:m.sheenRoughnessMap&&(x=m.sheenRoughnessMap),x!==void 0&&(x.isWebGLRenderTarget&&(x=x.texture),x.matrixAutoUpdate===!0&&x.updateMatrix(),p.uvTransform.value.copy(x.matrix));let w;m.aoMap?w=m.aoMap:m.lightMap&&(w=m.lightMap),w!==void 0&&(w.isWebGLRenderTarget&&(w=w.texture),w.matrixAutoUpdate===!0&&w.updateMatrix(),p.uv2Transform.value.copy(w.matrix))}function s(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function n(p,m,v,x){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*v,p.scale.value=x*.5,m.map&&(p.map.value=m.map),m.alphaMap&&(p.alphaMap.value=m.alphaMap),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let w;m.map?w=m.map:m.alphaMap&&(w=m.alphaMap),w!==void 0&&(w.matrixAutoUpdate===!0&&w.updateMatrix(),p.uvTransform.value.copy(w.matrix))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map),m.alphaMap&&(p.alphaMap.value=m.alphaMap),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let v;m.map?v=m.map:m.alphaMap&&(v=m.alphaMap),v!==void 0&&(v.matrixAutoUpdate===!0&&v.updateMatrix(),p.uvTransform.value.copy(v.matrix))}function l(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function h(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.roughness.value=m.roughness,p.metalness.value=m.metalness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap),m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap),e.get(m).envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function u(p,m,v){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap)),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap),m.clearcoatNormalMap&&(p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),p.clearcoatNormalMap.value=m.clearcoatNormalMap,m.side===1&&p.clearcoatNormalScale.value.negate())),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap)),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=v.texture,p.transmissionSamplerSize.value.set(v.width,v.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap)}function f(p,m){m.matcap&&(p.matcap.value=m.matcap)}function g(p,m){p.referencePosition.value.copy(m.referencePosition),p.nearDistance.value=m.nearDistance,p.farDistance.value=m.farDistance}return{refreshFogUniforms:t,refreshMaterialUniforms:i}}function Iu(c,e,t,i){let r={},s={},a=[];const n=t.isWebGL2?c.getParameter(35375):0;function o(x,w){const _=w.program;i.uniformBlockBinding(x,_)}function l(x,w){let _=r[x.id];_===void 0&&(g(x),_=h(x),r[x.id]=_,x.addEventListener("dispose",m));const M=w.program;i.updateUBOMapping(x,M);const E=e.render.frame;s[x.id]!==E&&(u(x),s[x.id]=E)}function h(x){const w=d();x.__bindingPointIndex=w;const _=c.createBuffer(),M=x.__size,E=x.usage;return c.bindBuffer(35345,_),c.bufferData(35345,M,E),c.bindBuffer(35345,null),c.bindBufferBase(35345,w,_),_}function d(){for(let x=0;x<n;x++)if(a.indexOf(x)===-1)return a.push(x),x;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(x){const w=r[x.id],_=x.uniforms,M=x.__cache;c.bindBuffer(35345,w);for(let E=0,L=_.length;E<L;E++){const y=_[E];if(f(y,E,M)===!0){const T=y.value,D=y.__offset;typeof T=="number"?(y.__data[0]=T,c.bufferSubData(35345,D,y.__data)):(y.value.isMatrix3?(y.__data[0]=y.value.elements[0],y.__data[1]=y.value.elements[1],y.__data[2]=y.value.elements[2],y.__data[3]=y.value.elements[0],y.__data[4]=y.value.elements[3],y.__data[5]=y.value.elements[4],y.__data[6]=y.value.elements[5],y.__data[7]=y.value.elements[0],y.__data[8]=y.value.elements[6],y.__data[9]=y.value.elements[7],y.__data[10]=y.value.elements[8],y.__data[11]=y.value.elements[0]):T.toArray(y.__data),c.bufferSubData(35345,D,y.__data))}}c.bindBuffer(35345,null)}function f(x,w,_){const M=x.value;if(_[w]===void 0)return typeof M=="number"?_[w]=M:_[w]=M.clone(),!0;if(typeof M=="number"){if(_[w]!==M)return _[w]=M,!0}else{const E=_[w];if(E.equals(M)===!1)return E.copy(M),!0}return!1}function g(x){const w=x.uniforms;let _=0;const M=16;let E=0;for(let L=0,y=w.length;L<y;L++){const T=w[L],D=p(T);if(T.__data=new Float32Array(D.storage/Float32Array.BYTES_PER_ELEMENT),T.__offset=_,L>0){E=_%M;const F=M-E;E!==0&&F-D.boundary<0&&(_+=M-E,T.__offset=_)}_+=D.storage}return E=_%M,E>0&&(_+=M-E),x.__size=_,x.__cache={},this}function p(x){const w=x.value,_={boundary:0,storage:0};return typeof w=="number"?(_.boundary=4,_.storage=4):w.isVector2?(_.boundary=8,_.storage=8):w.isVector3||w.isColor?(_.boundary=16,_.storage=12):w.isVector4?(_.boundary=16,_.storage=16):w.isMatrix3?(_.boundary=48,_.storage=48):w.isMatrix4?(_.boundary=64,_.storage=64):w.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",w),_}function m(x){const w=x.target;w.removeEventListener("dispose",m);const _=a.indexOf(w.__bindingPointIndex);a.splice(_,1),c.deleteBuffer(r[w.id]),delete r[w.id],delete s[w.id]}function v(){for(const x in r)c.deleteBuffer(r[x]);a=[],r={},s={}}return{bind:o,update:l,dispose:v}}function zu(){const c=Vr("canvas");return c.style.display="block",c}function ga(c={}){this.isWebGLRenderer=!0;const e=c.canvas!==void 0?c.canvas:zu(),t=c.context!==void 0?c.context:null,i=c.depth!==void 0?c.depth:!0,r=c.stencil!==void 0?c.stencil:!0,s=c.antialias!==void 0?c.antialias:!1,a=c.premultipliedAlpha!==void 0?c.premultipliedAlpha:!0,n=c.preserveDrawingBuffer!==void 0?c.preserveDrawingBuffer:!1,o=c.powerPreference!==void 0?c.powerPreference:"default",l=c.failIfMajorPerformanceCaveat!==void 0?c.failIfMajorPerformanceCaveat:!1;let h;t!==null?h=t.getContextAttributes().alpha:h=c.alpha!==void 0?c.alpha:!1;let d=null,u=null;const f=[],g=[];this.domElement=e,this.debug={checkShaderErrors:!0},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.outputEncoding=3e3,this.physicallyCorrectLights=!1,this.toneMapping=0,this.toneMappingExposure=1,Object.defineProperties(this,{gammaFactor:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaFactor has been removed."),2},set:function(){console.warn("THREE.WebGLRenderer: .gammaFactor has been removed.")}}});const p=this;let m=!1,v=0,x=0,w=null,_=-1,M=null;const E=new Ye,L=new Ye;let y=null,T=e.width,D=e.height,F=1,B=null,z=null;const R=new Ye(0,0,T,D),I=new Ye(0,0,T,D);let P=!1;const W=new Os;let j=!1,O=!1,V=null;const $=new Ze,H=new Le,Q=new k,he={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Ee(){return w===null?F:1}let J=t;function De(A,U){for(let q=0;q<A.length;q++){const G=A[q],K=e.getContext(G,U);if(K!==null)return K}return null}try{const A={alpha:!0,depth:i,stencil:r,antialias:s,premultipliedAlpha:a,preserveDrawingBuffer:n,powerPreference:o,failIfMajorPerformanceCaveat:l};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Ns}`),e.addEventListener("webglcontextlost",we,!1),e.addEventListener("webglcontextrestored",Fe,!1),e.addEventListener("webglcontextcreationerror",Ge,!1),J===null){const U=["webgl2","webgl","experimental-webgl"];if(p.isWebGL1Renderer===!0&&U.shift(),J=De(U,A),J===null)throw De(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}J.getShaderPrecisionFormat===void 0&&(J.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(A){throw console.error("THREE.WebGLRenderer: "+A.message),A}let ve,xe,le,Be,Me,ge,$e,ht,st,Lt,et,ze,kt,Rt,C,S,Z,ee,te,ne,_e,X,fe,ue;function pe(){ve=new qc(J),xe=new Bc(J,ve,c),ve.init(xe),X=new Cu(J,ve,xe),le=new Tu(J,ve,xe),Be=new Yc,Me=new du,ge=new Au(J,ve,le,Me,xe,X,Be),$e=new Uc(p),ht=new Wc(p),st=new so(J,xe),fe=new Nc(J,ve,st,xe),Lt=new jc(J,st,Be,fe),et=new Qc(J,Lt,st,Be),te=new Kc(J,xe,ge),S=new kc(Me),ze=new uu(p,$e,ht,ve,xe,fe,S),kt=new Fu(p,Me),Rt=new mu,C=new yu(ve,xe),ee=new zc(p,$e,le,et,h,a),Z=new Eu(p,et,xe),ue=new Iu(J,Be,xe,le),ne=new Oc(J,ve,Be,xe),_e=new Xc(J,ve,Be,xe),Be.programs=ze.programs,p.capabilities=xe,p.extensions=ve,p.properties=Me,p.renderLists=Rt,p.shadowMap=Z,p.state=le,p.info=Be}pe();const de=new Pu(p,J);this.xr=de,this.getContext=function(){return J},this.getContextAttributes=function(){return J.getContextAttributes()},this.forceContextLoss=function(){const A=ve.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=ve.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return F},this.setPixelRatio=function(A){A!==void 0&&(F=A,this.setSize(T,D,!1))},this.getSize=function(A){return A.set(T,D)},this.setSize=function(A,U,q){if(de.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}T=A,D=U,e.width=Math.floor(A*F),e.height=Math.floor(U*F),q!==!1&&(e.style.width=A+"px",e.style.height=U+"px"),this.setViewport(0,0,A,U)},this.getDrawingBufferSize=function(A){return A.set(T*F,D*F).floor()},this.setDrawingBufferSize=function(A,U,q){T=A,D=U,F=q,e.width=Math.floor(A*q),e.height=Math.floor(U*q),this.setViewport(0,0,A,U)},this.getCurrentViewport=function(A){return A.copy(E)},this.getViewport=function(A){return A.copy(R)},this.setViewport=function(A,U,q,G){A.isVector4?R.set(A.x,A.y,A.z,A.w):R.set(A,U,q,G),le.viewport(E.copy(R).multiplyScalar(F).floor())},this.getScissor=function(A){return A.copy(I)},this.setScissor=function(A,U,q,G){A.isVector4?I.set(A.x,A.y,A.z,A.w):I.set(A,U,q,G),le.scissor(L.copy(I).multiplyScalar(F).floor())},this.getScissorTest=function(){return P},this.setScissorTest=function(A){le.setScissorTest(P=A)},this.setOpaqueSort=function(A){B=A},this.setTransparentSort=function(A){z=A},this.getClearColor=function(A){return A.copy(ee.getClearColor())},this.setClearColor=function(){ee.setClearColor.apply(ee,arguments)},this.getClearAlpha=function(){return ee.getClearAlpha()},this.setClearAlpha=function(){ee.setClearAlpha.apply(ee,arguments)},this.clear=function(A=!0,U=!0,q=!0){let G=0;A&&(G|=16384),U&&(G|=256),q&&(G|=1024),J.clear(G)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",we,!1),e.removeEventListener("webglcontextrestored",Fe,!1),e.removeEventListener("webglcontextcreationerror",Ge,!1),Rt.dispose(),C.dispose(),Me.dispose(),$e.dispose(),ht.dispose(),et.dispose(),fe.dispose(),ue.dispose(),ze.dispose(),de.dispose(),de.removeEventListener("sessionstart",Ne),de.removeEventListener("sessionend",Je),V&&(V.dispose(),V=null),He.stop()};function we(A){A.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),m=!0}function Fe(){console.log("THREE.WebGLRenderer: Context Restored."),m=!1;const A=Be.autoReset,U=Z.enabled,q=Z.autoUpdate,G=Z.needsUpdate,K=Z.type;pe(),Be.autoReset=A,Z.enabled=U,Z.autoUpdate=q,Z.needsUpdate=G,Z.type=K}function Ge(A){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function N(A){const U=A.target;U.removeEventListener("dispose",N),ae(U)}function ae(A){Y(A),Me.remove(A)}function Y(A){const U=Me.get(A).programs;U!==void 0&&(U.forEach(function(q){ze.releaseProgram(q)}),A.isShaderMaterial&&ze.releaseShaderCache(A))}this.renderBufferDirect=function(A,U,q,G,K,me){U===null&&(U=he);const ye=K.isMesh&&K.matrixWorld.determinant()<0,be=La(A,U,q,G,K);le.setMaterial(G,ye);let Te=q.index;const Ue=q.attributes.position;if(Te===null){if(Ue===void 0||Ue.count===0)return}else if(Te.count===0)return;let Ae=1;G.wireframe===!0&&(Te=Lt.getWireframeAttribute(q),Ae=2),fe.setup(K,G,be,q,Te);let Re,Ke=ne;Te!==null&&(Re=st.get(Te),Ke=_e,Ke.setIndex(Re));const ci=Te!==null?Te.count:Ue.count,Ti=q.drawRange.start*Ae,Ai=q.drawRange.count*Ae,Dt=me!==null?me.start*Ae:0,Ie=me!==null?me.count*Ae:1/0,Ci=Math.max(Ti,Dt),Zi=Math.min(ci,Ti+Ai,Dt+Ie)-1,_t=Math.max(0,Zi-Ci+1);if(_t!==0){if(K.isMesh)G.wireframe===!0?(le.setLineWidth(G.wireframeLinewidth*Ee()),Ke.setMode(1)):Ke.setMode(4);else if(K.isLine){let ei=G.linewidth;ei===void 0&&(ei=1),le.setLineWidth(ei*Ee()),K.isLineSegments?Ke.setMode(1):K.isLineLoop?Ke.setMode(2):Ke.setMode(3)}else K.isPoints?Ke.setMode(0):K.isSprite&&Ke.setMode(4);if(K.isInstancedMesh)Ke.renderInstances(Ci,_t,K.count);else if(q.isInstancedBufferGeometry){const ei=Math.min(q.instanceCount,q._maxInstanceCount);Ke.renderInstances(Ci,_t,ei)}else Ke.render(Ci,_t)}},this.compile=function(A,U){u=C.get(A),u.init(),g.push(u),A.traverseVisible(function(q){q.isLight&&q.layers.test(U.layers)&&(u.pushLight(q),q.castShadow&&u.pushShadow(q))}),u.setupLights(p.physicallyCorrectLights),A.traverse(function(q){const G=q.material;if(G)if(Array.isArray(G))for(let K=0;K<G.length;K++){const me=G[K];Xr(me,A,q)}else Xr(G,A,q)}),g.pop(),u=null};let ce=null;function ie(A){ce&&ce(A)}function Ne(){He.stop()}function Je(){He.start()}const He=new ha;He.setAnimationLoop(ie),typeof self<"u"&&He.setContext(self),this.setAnimationLoop=function(A){ce=A,de.setAnimationLoop(A),A===null?He.stop():He.start()},de.addEventListener("sessionstart",Ne),de.addEventListener("sessionend",Je),this.render=function(A,U){if(U!==void 0&&U.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(m===!0)return;A.autoUpdate===!0&&A.updateMatrixWorld(),U.parent===null&&U.updateMatrixWorld(),de.enabled===!0&&de.isPresenting===!0&&(de.cameraAutoUpdate===!0&&de.updateCamera(U),U=de.getCamera()),A.isScene===!0&&A.onBeforeRender(p,A,U,w),u=C.get(A,g.length),u.init(),g.push(u),$.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),W.setFromProjectionMatrix($),O=this.localClippingEnabled,j=S.init(this.clippingPlanes,O,U),d=Rt.get(A,f.length),d.init(),f.push(d),$t(A,U,0,p.sortObjects),d.finish(),p.sortObjects===!0&&d.sort(B,z),j===!0&&S.beginShadows();const q=u.state.shadowsArray;if(Z.render(q,A,U),j===!0&&S.endShadows(),this.info.autoReset===!0&&this.info.reset(),ee.render(d,A),u.setupLights(p.physicallyCorrectLights),U.isArrayCamera){const G=U.cameras;for(let K=0,me=G.length;K<me;K++){const ye=G[K];ke(d,A,ye,ye.viewport)}}else ke(d,A,U);w!==null&&(ge.updateMultisampleRenderTarget(w),ge.updateRenderTargetMipmap(w)),A.isScene===!0&&A.onAfterRender(p,A,U),fe.resetDefaultState(),_=-1,M=null,g.pop(),g.length>0?u=g[g.length-1]:u=null,f.pop(),f.length>0?d=f[f.length-1]:d=null};function $t(A,U,q,G){if(A.visible===!1)return;if(A.layers.test(U.layers)){if(A.isGroup)q=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(U);else if(A.isLight)u.pushLight(A),A.castShadow&&u.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||W.intersectsSprite(A)){G&&Q.setFromMatrixPosition(A.matrixWorld).applyMatrix4($);const me=et.update(A),ye=A.material;ye.visible&&d.push(A,me,ye,q,Q.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(A.isSkinnedMesh&&A.skeleton.frame!==Be.render.frame&&(A.skeleton.update(),A.skeleton.frame=Be.render.frame),!A.frustumCulled||W.intersectsObject(A))){G&&Q.setFromMatrixPosition(A.matrixWorld).applyMatrix4($);const me=et.update(A),ye=A.material;if(Array.isArray(ye)){const be=me.groups;for(let Te=0,Ue=be.length;Te<Ue;Te++){const Ae=be[Te],Re=ye[Ae.materialIndex];Re&&Re.visible&&d.push(A,me,Re,q,Q.z,Ae)}}else ye.visible&&d.push(A,me,ye,q,Q.z,null)}}const K=A.children;for(let me=0,ye=K.length;me<ye;me++)$t(K[me],U,q,G)}function ke(A,U,q,G){const K=A.opaque,me=A.transmissive,ye=A.transparent;u.setupLightsView(q),me.length>0&&Ut(K,U,q),G&&le.viewport(E.copy(G)),K.length>0&&xt(K,U,q),me.length>0&&xt(me,U,q),ye.length>0&&xt(ye,U,q),le.buffers.depth.setTest(!0),le.buffers.depth.setMask(!0),le.buffers.color.setMask(!0),le.setPolygonOffset(!1)}function Ut(A,U,q){const G=xe.isWebGL2;V===null&&(V=new Mi(1,1,{generateMipmaps:!0,type:ve.has("EXT_color_buffer_half_float")?1016:1009,minFilter:1008,samples:G&&s===!0?4:0})),p.getDrawingBufferSize(H),G?V.setSize(H.x,H.y):V.setSize(Is(H.x),Is(H.y));const K=p.getRenderTarget();p.setRenderTarget(V),p.clear();const me=p.toneMapping;p.toneMapping=0,xt(A,U,q),p.toneMapping=me,ge.updateMultisampleRenderTarget(V),ge.updateRenderTargetMipmap(V),p.setRenderTarget(K)}function xt(A,U,q){const G=U.isScene===!0?U.overrideMaterial:null;for(let K=0,me=A.length;K<me;K++){const ye=A[K],be=ye.object,Te=ye.geometry,Ue=G===null?ye.material:G,Ae=ye.group;be.layers.test(q.layers)&&Ca(be,U,q,Te,Ue,Ae)}}function Ca(A,U,q,G,K,me){A.onBeforeRender(p,U,q,G,K,me),A.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),K.onBeforeRender(p,U,q,G,A,me),K.transparent===!0&&K.side===2?(K.side=1,K.needsUpdate=!0,p.renderBufferDirect(q,U,G,K,A,me),K.side=0,K.needsUpdate=!0,p.renderBufferDirect(q,U,G,K,A,me),K.side=2):p.renderBufferDirect(q,U,G,K,A,me),A.onAfterRender(p,U,q,G,K,me)}function Xr(A,U,q){U.isScene!==!0&&(U=he);const G=Me.get(A),K=u.state.lights,me=u.state.shadowsArray,ye=K.state.version,be=ze.getParameters(A,K.state,me,U,q),Te=ze.getProgramCacheKey(be);let Ue=G.programs;G.environment=A.isMeshStandardMaterial?U.environment:null,G.fog=U.fog,G.envMap=(A.isMeshStandardMaterial?ht:$e).get(A.envMap||G.environment),Ue===void 0&&(A.addEventListener("dispose",N),Ue=new Map,G.programs=Ue);let Ae=Ue.get(Te);if(Ae!==void 0){if(G.currentProgram===Ae&&G.lightsStateVersion===ye)return Ws(A,be),Ae}else be.uniforms=ze.getUniforms(A),A.onBuild(q,be,p),A.onBeforeCompile(be,p),Ae=ze.acquireProgram(be,Te),Ue.set(Te,Ae),G.uniforms=be.uniforms;const Re=G.uniforms;(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Re.clippingPlanes=S.uniform),Ws(A,be),G.needsLights=Da(A),G.lightsStateVersion=ye,G.needsLights&&(Re.ambientLightColor.value=K.state.ambient,Re.lightProbe.value=K.state.probe,Re.directionalLights.value=K.state.directional,Re.directionalLightShadows.value=K.state.directionalShadow,Re.spotLights.value=K.state.spot,Re.spotLightShadows.value=K.state.spotShadow,Re.rectAreaLights.value=K.state.rectArea,Re.ltc_1.value=K.state.rectAreaLTC1,Re.ltc_2.value=K.state.rectAreaLTC2,Re.pointLights.value=K.state.point,Re.pointLightShadows.value=K.state.pointShadow,Re.hemisphereLights.value=K.state.hemi,Re.directionalShadowMap.value=K.state.directionalShadowMap,Re.directionalShadowMatrix.value=K.state.directionalShadowMatrix,Re.spotShadowMap.value=K.state.spotShadowMap,Re.spotShadowMatrix.value=K.state.spotShadowMatrix,Re.pointShadowMap.value=K.state.pointShadowMap,Re.pointShadowMatrix.value=K.state.pointShadowMatrix);const Ke=Ae.getUniforms(),ci=Hr.seqWithValue(Ke.seq,Re);return G.currentProgram=Ae,G.uniformsList=ci,Ae}function Ws(A,U){const q=Me.get(A);q.outputEncoding=U.outputEncoding,q.instancing=U.instancing,q.skinning=U.skinning,q.morphTargets=U.morphTargets,q.morphNormals=U.morphNormals,q.morphColors=U.morphColors,q.morphTargetsCount=U.morphTargetsCount,q.numClippingPlanes=U.numClippingPlanes,q.numIntersection=U.numClipIntersection,q.vertexAlphas=U.vertexAlphas,q.vertexTangents=U.vertexTangents,q.toneMapping=U.toneMapping}function La(A,U,q,G,K){U.isScene!==!0&&(U=he),ge.resetTextureUnits();const me=U.fog,ye=G.isMeshStandardMaterial?U.environment:null,be=w===null?p.outputEncoding:w.isXRRenderTarget===!0?w.texture.encoding:3e3,Te=(G.isMeshStandardMaterial?ht:$e).get(G.envMap||ye),Ue=G.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,Ae=!!G.normalMap&&!!q.attributes.tangent,Re=!!q.morphAttributes.position,Ke=!!q.morphAttributes.normal,ci=!!q.morphAttributes.color,Ti=G.toneMapped?p.toneMapping:0,Ai=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,Dt=Ai!==void 0?Ai.length:0,Ie=Me.get(G),Ci=u.state.lights;if(j===!0&&(O===!0||A!==M)){const ut=A===M&&G.id===_;S.setState(G,A,ut)}let Zi=!1;G.version===Ie.__version?(Ie.needsLights&&Ie.lightsStateVersion!==Ci.state.version||Ie.outputEncoding!==be||K.isInstancedMesh&&Ie.instancing===!1||!K.isInstancedMesh&&Ie.instancing===!0||K.isSkinnedMesh&&Ie.skinning===!1||!K.isSkinnedMesh&&Ie.skinning===!0||Ie.envMap!==Te||G.fog===!0&&Ie.fog!==me||Ie.numClippingPlanes!==void 0&&(Ie.numClippingPlanes!==S.numPlanes||Ie.numIntersection!==S.numIntersection)||Ie.vertexAlphas!==Ue||Ie.vertexTangents!==Ae||Ie.morphTargets!==Re||Ie.morphNormals!==Ke||Ie.morphColors!==ci||Ie.toneMapping!==Ti||xe.isWebGL2===!0&&Ie.morphTargetsCount!==Dt)&&(Zi=!0):(Zi=!0,Ie.__version=G.version);let _t=Ie.currentProgram;Zi===!0&&(_t=Xr(G,U,K));let ei=!1,Ji=!1,Yr=!1;const nt=_t.getUniforms(),Ki=Ie.uniforms;if(le.useProgram(_t.program)&&(ei=!0,Ji=!0,Yr=!0),G.id!==_&&(_=G.id,Ji=!0),ei||M!==A){if(nt.setValue(J,"projectionMatrix",A.projectionMatrix),xe.logarithmicDepthBuffer&&nt.setValue(J,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),M!==A&&(M=A,Ji=!0,Yr=!0),G.isShaderMaterial||G.isMeshPhongMaterial||G.isMeshToonMaterial||G.isMeshStandardMaterial||G.envMap){const ut=nt.map.cameraPosition;ut!==void 0&&ut.setValue(J,Q.setFromMatrixPosition(A.matrixWorld))}(G.isMeshPhongMaterial||G.isMeshToonMaterial||G.isMeshLambertMaterial||G.isMeshBasicMaterial||G.isMeshStandardMaterial||G.isShaderMaterial)&&nt.setValue(J,"isOrthographic",A.isOrthographicCamera===!0),(G.isMeshPhongMaterial||G.isMeshToonMaterial||G.isMeshLambertMaterial||G.isMeshBasicMaterial||G.isMeshStandardMaterial||G.isShaderMaterial||G.isShadowMaterial||K.isSkinnedMesh)&&nt.setValue(J,"viewMatrix",A.matrixWorldInverse)}if(K.isSkinnedMesh){nt.setOptional(J,K,"bindMatrix"),nt.setOptional(J,K,"bindMatrixInverse");const ut=K.skeleton;ut&&(xe.floatVertexTextures?(ut.boneTexture===null&&ut.computeBoneTexture(),nt.setValue(J,"boneTexture",ut.boneTexture,ge),nt.setValue(J,"boneTextureSize",ut.boneTextureSize)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}const Zr=q.morphAttributes;if((Zr.position!==void 0||Zr.normal!==void 0||Zr.color!==void 0&&xe.isWebGL2===!0)&&te.update(K,q,G,_t),(Ji||Ie.receiveShadow!==K.receiveShadow)&&(Ie.receiveShadow=K.receiveShadow,nt.setValue(J,"receiveShadow",K.receiveShadow)),Ji&&(nt.setValue(J,"toneMappingExposure",p.toneMappingExposure),Ie.needsLights&&Ra(Ki,Yr),me&&G.fog===!0&&kt.refreshFogUniforms(Ki,me),kt.refreshMaterialUniforms(Ki,G,F,D,V),Hr.upload(J,Ie.uniformsList,Ki,ge)),G.isShaderMaterial&&G.uniformsNeedUpdate===!0&&(Hr.upload(J,Ie.uniformsList,Ki,ge),G.uniformsNeedUpdate=!1),G.isSpriteMaterial&&nt.setValue(J,"center",K.center),nt.setValue(J,"modelViewMatrix",K.modelViewMatrix),nt.setValue(J,"normalMatrix",K.normalMatrix),nt.setValue(J,"modelMatrix",K.matrixWorld),G.isShaderMaterial||G.isRawShaderMaterial){const ut=G.uniformsGroups;for(let Jr=0,Pa=ut.length;Jr<Pa;Jr++)if(xe.isWebGL2){const qs=ut[Jr];ue.update(qs,_t),ue.bind(qs,_t)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return _t}function Ra(A,U){A.ambientLightColor.needsUpdate=U,A.lightProbe.needsUpdate=U,A.directionalLights.needsUpdate=U,A.directionalLightShadows.needsUpdate=U,A.pointLights.needsUpdate=U,A.pointLightShadows.needsUpdate=U,A.spotLights.needsUpdate=U,A.spotLightShadows.needsUpdate=U,A.rectAreaLights.needsUpdate=U,A.hemisphereLights.needsUpdate=U}function Da(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return v},this.getActiveMipmapLevel=function(){return x},this.getRenderTarget=function(){return w},this.setRenderTargetTextures=function(A,U,q){Me.get(A.texture).__webglTexture=U,Me.get(A.depthTexture).__webglTexture=q;const G=Me.get(A);G.__hasExternalTextures=!0,G.__hasExternalTextures&&(G.__autoAllocateDepthBuffer=q===void 0,G.__autoAllocateDepthBuffer||ve.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),G.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(A,U){const q=Me.get(A);q.__webglFramebuffer=U,q.__useDefaultFramebuffer=U===void 0},this.setRenderTarget=function(A,U=0,q=0){w=A,v=U,x=q;let G=!0;if(A){const be=Me.get(A);be.__useDefaultFramebuffer!==void 0?(le.bindFramebuffer(36160,null),G=!1):be.__webglFramebuffer===void 0?ge.setupRenderTarget(A):be.__hasExternalTextures&&ge.rebindTextures(A,Me.get(A.texture).__webglTexture,Me.get(A.depthTexture).__webglTexture)}let K=null,me=!1,ye=!1;if(A){const be=A.texture;(be.isData3DTexture||be.isDataArrayTexture)&&(ye=!0);const Te=Me.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(K=Te[U],me=!0):xe.isWebGL2&&A.samples>0&&ge.useMultisampledRTT(A)===!1?K=Me.get(A).__webglMultisampledFramebuffer:K=Te,E.copy(A.viewport),L.copy(A.scissor),y=A.scissorTest}else E.copy(R).multiplyScalar(F).floor(),L.copy(I).multiplyScalar(F).floor(),y=P;if(le.bindFramebuffer(36160,K)&&xe.drawBuffers&&G&&le.drawBuffers(A,K),le.viewport(E),le.scissor(L),le.setScissorTest(y),me){const be=Me.get(A.texture);J.framebufferTexture2D(36160,36064,34069+U,be.__webglTexture,q)}else if(ye){const be=Me.get(A.texture),Te=U||0;J.framebufferTextureLayer(36160,36064,be.__webglTexture,q||0,Te)}_=-1},this.readRenderTargetPixels=function(A,U,q,G,K,me,ye){if(!(A&&A.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let be=Me.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&ye!==void 0&&(be=be[ye]),be){le.bindFramebuffer(36160,be);try{const Te=A.texture,Ue=Te.format,Ae=Te.type;if(Ue!==1023&&X.convert(Ue)!==J.getParameter(35739)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const Re=Ae===1016&&(ve.has("EXT_color_buffer_half_float")||xe.isWebGL2&&ve.has("EXT_color_buffer_float"));if(Ae!==1009&&X.convert(Ae)!==J.getParameter(35738)&&!(Ae===1015&&(xe.isWebGL2||ve.has("OES_texture_float")||ve.has("WEBGL_color_buffer_float")))&&!Re){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=A.width-G&&q>=0&&q<=A.height-K&&J.readPixels(U,q,G,K,X.convert(Ue),X.convert(Ae),me)}finally{const Te=w!==null?Me.get(w).__webglFramebuffer:null;le.bindFramebuffer(36160,Te)}}},this.copyFramebufferToTexture=function(A,U,q=0){const G=Math.pow(2,-q),K=Math.floor(U.image.width*G),me=Math.floor(U.image.height*G);ge.setTexture2D(U,0),J.copyTexSubImage2D(3553,q,0,0,A.x,A.y,K,me),le.unbindTexture()},this.copyTextureToTexture=function(A,U,q,G=0){const K=U.image.width,me=U.image.height,ye=X.convert(q.format),be=X.convert(q.type);ge.setTexture2D(q,0),J.pixelStorei(37440,q.flipY),J.pixelStorei(37441,q.premultiplyAlpha),J.pixelStorei(3317,q.unpackAlignment),U.isDataTexture?J.texSubImage2D(3553,G,A.x,A.y,K,me,ye,be,U.image.data):U.isCompressedTexture?J.compressedTexSubImage2D(3553,G,A.x,A.y,U.mipmaps[0].width,U.mipmaps[0].height,ye,U.mipmaps[0].data):J.texSubImage2D(3553,G,A.x,A.y,ye,be,U.image),G===0&&q.generateMipmaps&&J.generateMipmap(3553),le.unbindTexture()},this.copyTextureToTexture3D=function(A,U,q,G,K=0){if(p.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const me=A.max.x-A.min.x+1,ye=A.max.y-A.min.y+1,be=A.max.z-A.min.z+1,Te=X.convert(G.format),Ue=X.convert(G.type);let Ae;if(G.isData3DTexture)ge.setTexture3D(G,0),Ae=32879;else if(G.isDataArrayTexture)ge.setTexture2DArray(G,0),Ae=35866;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}J.pixelStorei(37440,G.flipY),J.pixelStorei(37441,G.premultiplyAlpha),J.pixelStorei(3317,G.unpackAlignment);const Re=J.getParameter(3314),Ke=J.getParameter(32878),ci=J.getParameter(3316),Ti=J.getParameter(3315),Ai=J.getParameter(32877),Dt=q.isCompressedTexture?q.mipmaps[0]:q.image;J.pixelStorei(3314,Dt.width),J.pixelStorei(32878,Dt.height),J.pixelStorei(3316,A.min.x),J.pixelStorei(3315,A.min.y),J.pixelStorei(32877,A.min.z),q.isDataTexture||q.isData3DTexture?J.texSubImage3D(Ae,K,U.x,U.y,U.z,me,ye,be,Te,Ue,Dt.data):q.isCompressedTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),J.compressedTexSubImage3D(Ae,K,U.x,U.y,U.z,me,ye,be,Te,Dt.data)):J.texSubImage3D(Ae,K,U.x,U.y,U.z,me,ye,be,Te,Ue,Dt),J.pixelStorei(3314,Re),J.pixelStorei(32878,Ke),J.pixelStorei(3316,ci),J.pixelStorei(3315,Ti),J.pixelStorei(32877,Ai),K===0&&G.generateMipmaps&&J.generateMipmap(Ae),le.unbindTexture()},this.initTexture=function(A){A.isCubeTexture?ge.setTextureCube(A,0):A.isData3DTexture?ge.setTexture3D(A,0):A.isDataArrayTexture?ge.setTexture2DArray(A,0):ge.setTexture2D(A,0),le.unbindTexture()},this.resetState=function(){v=0,x=0,w=null,le.reset(),fe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}class Nu extends ga{}Nu.prototype.isWebGL1Renderer=!0;class Ou extends at{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.overrideMaterial=null,this.autoUpdate=!0,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.autoUpdate=e.autoUpdate,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t}}class Cn extends gt{constructor(e,t,i,r,s,a,n,o,l){super(e,t,i,r,s,a,n,o,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class ks extends Bt{constructor(e=1,t=1,i=1,r=8,s=1,a=!1,n=0,o=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:n,thetaLength:o};const l=this;r=Math.floor(r),s=Math.floor(s);const h=[],d=[],u=[],f=[];let g=0;const p=[],m=i/2;let v=0;x(),a===!1&&(e>0&&w(!0),t>0&&w(!1)),this.setIndex(h),this.setAttribute("position",new rt(d,3)),this.setAttribute("normal",new rt(u,3)),this.setAttribute("uv",new rt(f,2));function x(){const _=new k,M=new k;let E=0;const L=(t-e)/i;for(let y=0;y<=s;y++){const T=[],D=y/s,F=D*(t-e)+e;for(let B=0;B<=r;B++){const z=B/r,R=z*o+n,I=Math.sin(R),P=Math.cos(R);M.x=F*I,M.y=-D*i+m,M.z=F*P,d.push(M.x,M.y,M.z),_.set(I,L,P).normalize(),u.push(_.x,_.y,_.z),f.push(z,1-D),T.push(g++)}p.push(T)}for(let y=0;y<r;y++)for(let T=0;T<s;T++){const D=p[T][y],F=p[T+1][y],B=p[T+1][y+1],z=p[T][y+1];h.push(D,F,z),h.push(F,B,z),E+=6}l.addGroup(v,E,0),v+=E}function w(_){const M=g,E=new Le,L=new k;let y=0;const T=_===!0?e:t,D=_===!0?1:-1;for(let B=1;B<=r;B++)d.push(0,m*D,0),u.push(0,D,0),f.push(.5,.5),g++;const F=g;for(let B=0;B<=r;B++){const z=B/r*o+n,R=Math.cos(z),I=Math.sin(z);L.x=T*I,L.y=m*D,L.z=T*R,d.push(L.x,L.y,L.z),u.push(0,D,0),E.x=R*.5+.5,E.y=I*.5*D+.5,f.push(E.x,E.y),g++}for(let B=0;B<r;B++){const z=M+B,R=F+B;_===!0?h.push(R,R+1,z):h.push(R+1,R,z),y+=3}l.addGroup(v,y,_===!0?1:2),v+=y}}static fromJSON(e){return new ks(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Bu extends Ei{constructor(e){super(),this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new Ce(0),this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.fog=e.fog,this}}class ku extends Ei{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Ce(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ce(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new Le(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Uu extends Ei{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new Ce(16777215),this.specular=new Ce(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ce(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new Le(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class va extends at{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ce(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}class Gu extends va{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(at.DefaultUp),this.updateMatrix(),this.groundColor=new Ce(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Ln=new Ze,Rn=new k,Dn=new k;class Hu{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Le(512,512),this.map=null,this.mapPass=null,this.matrix=new Ze,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Os,this._frameExtents=new Le(1,1),this._viewportCount=1,this._viewports=[new Ye(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Rn.setFromMatrixPosition(e.matrixWorld),t.position.copy(Rn),Dn.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Dn),t.updateMatrixWorld(),Ln.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ln),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(t.projectionMatrix),i.multiply(t.matrixWorldInverse)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class Vu extends Hu{constructor(){super(new ft(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1}updateMatrices(e){const t=this.camera,i=Fs*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height,s=e.distance||t.far;(i!==t.fov||r!==t.aspect||s!==t.far)&&(t.fov=i,t.aspect=r,t.far=s,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class Wu extends va{constructor(e,t,i=0,r=Math.PI/3,s=0,a=1){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(at.DefaultUp),this.updateMatrix(),this.target=new at,this.distance=i,this.angle=r,this.penumbra=s,this.decay=a,this.shadow=new Vu}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ns}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ns);class Ct{constructor(e){e===void 0&&(e=[0,0,0,0,0,0,0,0,0]),this.elements=e}identity(){const e=this.elements;e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=1,e[5]=0,e[6]=0,e[7]=0,e[8]=1}setZero(){const e=this.elements;e[0]=0,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=0,e[6]=0,e[7]=0,e[8]=0}setTrace(e){const t=this.elements;t[0]=e.x,t[4]=e.y,t[8]=e.z}getTrace(e){e===void 0&&(e=new b);const t=this.elements;return e.x=t[0],e.y=t[4],e.z=t[8],e}vmult(e,t){t===void 0&&(t=new b);const i=this.elements,r=e.x,s=e.y,a=e.z;return t.x=i[0]*r+i[1]*s+i[2]*a,t.y=i[3]*r+i[4]*s+i[5]*a,t.z=i[6]*r+i[7]*s+i[8]*a,t}smult(e){for(let t=0;t<this.elements.length;t++)this.elements[t]*=e}mmult(e,t){t===void 0&&(t=new Ct);const i=this.elements,r=e.elements,s=t.elements,a=i[0],n=i[1],o=i[2],l=i[3],h=i[4],d=i[5],u=i[6],f=i[7],g=i[8],p=r[0],m=r[1],v=r[2],x=r[3],w=r[4],_=r[5],M=r[6],E=r[7],L=r[8];return s[0]=a*p+n*x+o*M,s[1]=a*m+n*w+o*E,s[2]=a*v+n*_+o*L,s[3]=l*p+h*x+d*M,s[4]=l*m+h*w+d*E,s[5]=l*v+h*_+d*L,s[6]=u*p+f*x+g*M,s[7]=u*m+f*w+g*E,s[8]=u*v+f*_+g*L,t}scale(e,t){t===void 0&&(t=new Ct);const i=this.elements,r=t.elements;for(let s=0;s!==3;s++)r[3*s+0]=e.x*i[3*s+0],r[3*s+1]=e.y*i[3*s+1],r[3*s+2]=e.z*i[3*s+2];return t}solve(e,t){t===void 0&&(t=new b);const i=3,r=4,s=[];let a,n;for(a=0;a<i*r;a++)s.push(0);for(a=0;a<3;a++)for(n=0;n<3;n++)s[a+r*n]=this.elements[a+3*n];s[3+4*0]=e.x,s[3+4*1]=e.y,s[3+4*2]=e.z;let o=3;const l=o;let h;const d=4;let u;do{if(a=l-o,s[a+r*a]===0){for(n=a+1;n<l;n++)if(s[a+r*n]!==0){h=d;do u=d-h,s[u+r*a]+=s[u+r*n];while(--h);break}}if(s[a+r*a]!==0)for(n=a+1;n<l;n++){const f=s[a+r*n]/s[a+r*a];h=d;do u=d-h,s[u+r*n]=u<=a?0:s[u+r*n]-s[u+r*a]*f;while(--h)}}while(--o);if(t.z=s[2*r+3]/s[2*r+2],t.y=(s[1*r+3]-s[1*r+2]*t.z)/s[1*r+1],t.x=(s[0*r+3]-s[0*r+2]*t.z-s[0*r+1]*t.y)/s[0*r+0],isNaN(t.x)||isNaN(t.y)||isNaN(t.z)||t.x===1/0||t.y===1/0||t.z===1/0)throw`Could not solve equation! Got x=[${t.toString()}], b=[${e.toString()}], A=[${this.toString()}]`;return t}e(e,t,i){if(i===void 0)return this.elements[t+3*e];this.elements[t+3*e]=i}copy(e){for(let t=0;t<e.elements.length;t++)this.elements[t]=e.elements[t];return this}toString(){let e="";const t=",";for(let i=0;i<9;i++)e+=this.elements[i]+t;return e}reverse(e){e===void 0&&(e=new Ct);const t=3,i=6,r=qu;let s,a;for(s=0;s<3;s++)for(a=0;a<3;a++)r[s+i*a]=this.elements[s+3*a];r[3+6*0]=1,r[3+6*1]=0,r[3+6*2]=0,r[4+6*0]=0,r[4+6*1]=1,r[4+6*2]=0,r[5+6*0]=0,r[5+6*1]=0,r[5+6*2]=1;let n=3;const o=n;let l;const h=i;let d;do{if(s=o-n,r[s+i*s]===0){for(a=s+1;a<o;a++)if(r[s+i*a]!==0){l=h;do d=h-l,r[d+i*s]+=r[d+i*a];while(--l);break}}if(r[s+i*s]!==0)for(a=s+1;a<o;a++){const u=r[s+i*a]/r[s+i*s];l=h;do d=h-l,r[d+i*a]=d<=s?0:r[d+i*a]-r[d+i*s]*u;while(--l)}}while(--n);s=2;do{a=s-1;do{const u=r[s+i*a]/r[s+i*s];l=i;do d=i-l,r[d+i*a]=r[d+i*a]-r[d+i*s]*u;while(--l)}while(a--)}while(--s);s=2;do{const u=1/r[s+i*s];l=i;do d=i-l,r[d+i*s]=r[d+i*s]*u;while(--l)}while(s--);s=2;do{a=2;do{if(d=r[t+a+i*s],isNaN(d)||d===1/0)throw`Could not reverse! A=[${this.toString()}]`;e.e(s,a,d)}while(a--)}while(s--);return e}setRotationFromQuaternion(e){const t=e.x,i=e.y,r=e.z,s=e.w,a=t+t,n=i+i,o=r+r,l=t*a,h=t*n,d=t*o,u=i*n,f=i*o,g=r*o,p=s*a,m=s*n,v=s*o,x=this.elements;return x[3*0+0]=1-(u+g),x[3*0+1]=h-v,x[3*0+2]=d+m,x[3*1+0]=h+v,x[3*1+1]=1-(l+g),x[3*1+2]=f-p,x[3*2+0]=d-m,x[3*2+1]=f+p,x[3*2+2]=1-(l+u),this}transpose(e){e===void 0&&(e=new Ct);const t=this.elements,i=e.elements;let r;return i[0]=t[0],i[4]=t[4],i[8]=t[8],r=t[1],i[1]=t[3],i[3]=r,r=t[2],i[2]=t[6],i[6]=r,r=t[5],i[5]=t[7],i[7]=r,e}}const qu=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];class b{constructor(e,t,i){e===void 0&&(e=0),t===void 0&&(t=0),i===void 0&&(i=0),this.x=e,this.y=t,this.z=i}cross(e,t){t===void 0&&(t=new b);const i=e.x,r=e.y,s=e.z,a=this.x,n=this.y,o=this.z;return t.x=n*s-o*r,t.y=o*i-a*s,t.z=a*r-n*i,t}set(e,t,i){return this.x=e,this.y=t,this.z=i,this}setZero(){this.x=this.y=this.z=0}vadd(e,t){if(t)t.x=e.x+this.x,t.y=e.y+this.y,t.z=e.z+this.z;else return new b(this.x+e.x,this.y+e.y,this.z+e.z)}vsub(e,t){if(t)t.x=this.x-e.x,t.y=this.y-e.y,t.z=this.z-e.z;else return new b(this.x-e.x,this.y-e.y,this.z-e.z)}crossmat(){return new Ct([0,-this.z,this.y,this.z,0,-this.x,-this.y,this.x,0])}normalize(){const e=this.x,t=this.y,i=this.z,r=Math.sqrt(e*e+t*t+i*i);if(r>0){const s=1/r;this.x*=s,this.y*=s,this.z*=s}else this.x=0,this.y=0,this.z=0;return r}unit(e){e===void 0&&(e=new b);const t=this.x,i=this.y,r=this.z;let s=Math.sqrt(t*t+i*i+r*r);return s>0?(s=1/s,e.x=t*s,e.y=i*s,e.z=r*s):(e.x=1,e.y=0,e.z=0),e}length(){const e=this.x,t=this.y,i=this.z;return Math.sqrt(e*e+t*t+i*i)}lengthSquared(){return this.dot(this)}distanceTo(e){const t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,n=e.z;return Math.sqrt((s-t)*(s-t)+(a-i)*(a-i)+(n-r)*(n-r))}distanceSquared(e){const t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,n=e.z;return(s-t)*(s-t)+(a-i)*(a-i)+(n-r)*(n-r)}scale(e,t){t===void 0&&(t=new b);const i=this.x,r=this.y,s=this.z;return t.x=e*i,t.y=e*r,t.z=e*s,t}vmul(e,t){return t===void 0&&(t=new b),t.x=e.x*this.x,t.y=e.y*this.y,t.z=e.z*this.z,t}addScaledVector(e,t,i){return i===void 0&&(i=new b),i.x=this.x+e*t.x,i.y=this.y+e*t.y,i.z=this.z+e*t.z,i}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}isZero(){return this.x===0&&this.y===0&&this.z===0}negate(e){return e===void 0&&(e=new b),e.x=-this.x,e.y=-this.y,e.z=-this.z,e}tangents(e,t){const i=this.length();if(i>0){const r=ju,s=1/i;r.set(this.x*s,this.y*s,this.z*s);const a=Xu;Math.abs(r.x)<.9?(a.set(1,0,0),r.cross(a,e)):(a.set(0,1,0),r.cross(a,e)),r.cross(e,t)}else e.set(1,0,0),t.set(0,1,0)}toString(){return`${this.x},${this.y},${this.z}`}toArray(){return[this.x,this.y,this.z]}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}lerp(e,t,i){const r=this.x,s=this.y,a=this.z;i.x=r+(e.x-r)*t,i.y=s+(e.y-s)*t,i.z=a+(e.z-a)*t}almostEquals(e,t){return t===void 0&&(t=1e-6),!(Math.abs(this.x-e.x)>t||Math.abs(this.y-e.y)>t||Math.abs(this.z-e.z)>t)}almostZero(e){return e===void 0&&(e=1e-6),!(Math.abs(this.x)>e||Math.abs(this.y)>e||Math.abs(this.z)>e)}isAntiparallelTo(e,t){return this.negate(Pn),Pn.almostEquals(e,t)}clone(){return new b(this.x,this.y,this.z)}}b.ZERO=new b(0,0,0);b.UNIT_X=new b(1,0,0);b.UNIT_Y=new b(0,1,0);b.UNIT_Z=new b(0,0,1);const ju=new b,Xu=new b,Pn=new b;class vt{constructor(e){e===void 0&&(e={}),this.lowerBound=new b,this.upperBound=new b,e.lowerBound&&this.lowerBound.copy(e.lowerBound),e.upperBound&&this.upperBound.copy(e.upperBound)}setFromPoints(e,t,i,r){const s=this.lowerBound,a=this.upperBound,n=i;s.copy(e[0]),n&&n.vmult(s,s),a.copy(s);for(let o=1;o<e.length;o++){let l=e[o];n&&(n.vmult(l,Fn),l=Fn),l.x>a.x&&(a.x=l.x),l.x<s.x&&(s.x=l.x),l.y>a.y&&(a.y=l.y),l.y<s.y&&(s.y=l.y),l.z>a.z&&(a.z=l.z),l.z<s.z&&(s.z=l.z)}return t&&(t.vadd(s,s),t.vadd(a,a)),r&&(s.x-=r,s.y-=r,s.z-=r,a.x+=r,a.y+=r,a.z+=r),this}copy(e){return this.lowerBound.copy(e.lowerBound),this.upperBound.copy(e.upperBound),this}clone(){return new vt().copy(this)}extend(e){this.lowerBound.x=Math.min(this.lowerBound.x,e.lowerBound.x),this.upperBound.x=Math.max(this.upperBound.x,e.upperBound.x),this.lowerBound.y=Math.min(this.lowerBound.y,e.lowerBound.y),this.upperBound.y=Math.max(this.upperBound.y,e.upperBound.y),this.lowerBound.z=Math.min(this.lowerBound.z,e.lowerBound.z),this.upperBound.z=Math.max(this.upperBound.z,e.upperBound.z)}overlaps(e){const t=this.lowerBound,i=this.upperBound,r=e.lowerBound,s=e.upperBound,a=r.x<=i.x&&i.x<=s.x||t.x<=s.x&&s.x<=i.x,n=r.y<=i.y&&i.y<=s.y||t.y<=s.y&&s.y<=i.y,o=r.z<=i.z&&i.z<=s.z||t.z<=s.z&&s.z<=i.z;return a&&n&&o}volume(){const e=this.lowerBound,t=this.upperBound;return(t.x-e.x)*(t.y-e.y)*(t.z-e.z)}contains(e){const t=this.lowerBound,i=this.upperBound,r=e.lowerBound,s=e.upperBound;return t.x<=r.x&&i.x>=s.x&&t.y<=r.y&&i.y>=s.y&&t.z<=r.z&&i.z>=s.z}getCorners(e,t,i,r,s,a,n,o){const l=this.lowerBound,h=this.upperBound;e.copy(l),t.set(h.x,l.y,l.z),i.set(h.x,h.y,l.z),r.set(l.x,h.y,h.z),s.set(h.x,l.y,h.z),a.set(l.x,h.y,l.z),n.set(l.x,l.y,h.z),o.copy(h)}toLocalFrame(e,t){const i=In,r=i[0],s=i[1],a=i[2],n=i[3],o=i[4],l=i[5],h=i[6],d=i[7];this.getCorners(r,s,a,n,o,l,h,d);for(let u=0;u!==8;u++){const f=i[u];e.pointToLocal(f,f)}return t.setFromPoints(i)}toWorldFrame(e,t){const i=In,r=i[0],s=i[1],a=i[2],n=i[3],o=i[4],l=i[5],h=i[6],d=i[7];this.getCorners(r,s,a,n,o,l,h,d);for(let u=0;u!==8;u++){const f=i[u];e.pointToWorld(f,f)}return t.setFromPoints(i)}overlapsRay(e){const{direction:t,from:i}=e,r=1/t.x,s=1/t.y,a=1/t.z,n=(this.lowerBound.x-i.x)*r,o=(this.upperBound.x-i.x)*r,l=(this.lowerBound.y-i.y)*s,h=(this.upperBound.y-i.y)*s,d=(this.lowerBound.z-i.z)*a,u=(this.upperBound.z-i.z)*a,f=Math.max(Math.max(Math.min(n,o),Math.min(l,h)),Math.min(d,u)),g=Math.min(Math.min(Math.max(n,o),Math.max(l,h)),Math.max(d,u));return!(g<0||f>g)}}const Fn=new b,In=[new b,new b,new b,new b,new b,new b,new b,new b];class zn{constructor(){this.matrix=[]}get(e,t){let{index:i}=e,{index:r}=t;if(r>i){const s=r;r=i,i=s}return this.matrix[(i*(i+1)>>1)+r-1]}set(e,t,i){let{index:r}=e,{index:s}=t;if(s>r){const a=s;s=r,r=a}this.matrix[(r*(r+1)>>1)+s-1]=i?1:0}reset(){for(let e=0,t=this.matrix.length;e!==t;e++)this.matrix[e]=0}setNumObjects(e){this.matrix.length=e*(e-1)>>1}}class xa{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;return i[e]===void 0&&(i[e]=[]),i[e].includes(t)||i[e].push(t),this}hasEventListener(e,t){if(this._listeners===void 0)return!1;const i=this._listeners;return!!(i[e]!==void 0&&i[e].includes(t))}hasAnyEventListener(e){return this._listeners===void 0?!1:this._listeners[e]!==void 0}removeEventListener(e,t){if(this._listeners===void 0)return this;const i=this._listeners;if(i[e]===void 0)return this;const r=i[e].indexOf(t);return r!==-1&&i[e].splice(r,1),this}dispatchEvent(e){if(this._listeners===void 0)return this;const t=this._listeners[e.type];if(t!==void 0){e.target=this;for(let i=0,r=t.length;i<r;i++)t[i].call(this,e)}return this}}class qe{constructor(e,t,i,r){e===void 0&&(e=0),t===void 0&&(t=0),i===void 0&&(i=0),r===void 0&&(r=1),this.x=e,this.y=t,this.z=i,this.w=r}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}toString(){return`${this.x},${this.y},${this.z},${this.w}`}toArray(){return[this.x,this.y,this.z,this.w]}setFromAxisAngle(e,t){const i=Math.sin(t*.5);return this.x=e.x*i,this.y=e.y*i,this.z=e.z*i,this.w=Math.cos(t*.5),this}toAxisAngle(e){e===void 0&&(e=new b),this.normalize();const t=2*Math.acos(this.w),i=Math.sqrt(1-this.w*this.w);return i<.001?(e.x=this.x,e.y=this.y,e.z=this.z):(e.x=this.x/i,e.y=this.y/i,e.z=this.z/i),[e,t]}setFromVectors(e,t){if(e.isAntiparallelTo(t)){const i=Yu,r=Zu;e.tangents(i,r),this.setFromAxisAngle(i,Math.PI)}else{const i=e.cross(t);this.x=i.x,this.y=i.y,this.z=i.z,this.w=Math.sqrt(e.length()**2*t.length()**2)+e.dot(t),this.normalize()}return this}mult(e,t){t===void 0&&(t=new qe);const i=this.x,r=this.y,s=this.z,a=this.w,n=e.x,o=e.y,l=e.z,h=e.w;return t.x=i*h+a*n+r*l-s*o,t.y=r*h+a*o+s*n-i*l,t.z=s*h+a*l+i*o-r*n,t.w=a*h-i*n-r*o-s*l,t}inverse(e){e===void 0&&(e=new qe);const t=this.x,i=this.y,r=this.z,s=this.w;this.conjugate(e);const a=1/(t*t+i*i+r*r+s*s);return e.x*=a,e.y*=a,e.z*=a,e.w*=a,e}conjugate(e){return e===void 0&&(e=new qe),e.x=-this.x,e.y=-this.y,e.z=-this.z,e.w=this.w,e}normalize(){let e=Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w);return e===0?(this.x=0,this.y=0,this.z=0,this.w=0):(e=1/e,this.x*=e,this.y*=e,this.z*=e,this.w*=e),this}normalizeFast(){const e=(3-(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w))/2;return e===0?(this.x=0,this.y=0,this.z=0,this.w=0):(this.x*=e,this.y*=e,this.z*=e,this.w*=e),this}vmult(e,t){t===void 0&&(t=new b);const i=e.x,r=e.y,s=e.z,a=this.x,n=this.y,o=this.z,l=this.w,h=l*i+n*s-o*r,d=l*r+o*i-a*s,u=l*s+a*r-n*i,f=-a*i-n*r-o*s;return t.x=h*l+f*-a+d*-o-u*-n,t.y=d*l+f*-n+u*-a-h*-o,t.z=u*l+f*-o+h*-n-d*-a,t}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w,this}toEuler(e,t){t===void 0&&(t="YZX");let i,r,s;const a=this.x,n=this.y,o=this.z,l=this.w;switch(t){case"YZX":const h=a*n+o*l;if(h>.499&&(i=2*Math.atan2(a,l),r=Math.PI/2,s=0),h<-.499&&(i=-2*Math.atan2(a,l),r=-Math.PI/2,s=0),i===void 0){const d=a*a,u=n*n,f=o*o;i=Math.atan2(2*n*l-2*a*o,1-2*u-2*f),r=Math.asin(2*h),s=Math.atan2(2*a*l-2*n*o,1-2*d-2*f)}break;default:throw new Error(`Euler order ${t} not supported yet.`)}e.y=i,e.z=r,e.x=s}setFromEuler(e,t,i,r){r===void 0&&(r="XYZ");const s=Math.cos(e/2),a=Math.cos(t/2),n=Math.cos(i/2),o=Math.sin(e/2),l=Math.sin(t/2),h=Math.sin(i/2);return r==="XYZ"?(this.x=o*a*n+s*l*h,this.y=s*l*n-o*a*h,this.z=s*a*h+o*l*n,this.w=s*a*n-o*l*h):r==="YXZ"?(this.x=o*a*n+s*l*h,this.y=s*l*n-o*a*h,this.z=s*a*h-o*l*n,this.w=s*a*n+o*l*h):r==="ZXY"?(this.x=o*a*n-s*l*h,this.y=s*l*n+o*a*h,this.z=s*a*h+o*l*n,this.w=s*a*n-o*l*h):r==="ZYX"?(this.x=o*a*n-s*l*h,this.y=s*l*n+o*a*h,this.z=s*a*h-o*l*n,this.w=s*a*n+o*l*h):r==="YZX"?(this.x=o*a*n+s*l*h,this.y=s*l*n+o*a*h,this.z=s*a*h-o*l*n,this.w=s*a*n-o*l*h):r==="XZY"&&(this.x=o*a*n-s*l*h,this.y=s*l*n-o*a*h,this.z=s*a*h+o*l*n,this.w=s*a*n+o*l*h),this}clone(){return new qe(this.x,this.y,this.z,this.w)}slerp(e,t,i){i===void 0&&(i=new qe);const r=this.x,s=this.y,a=this.z,n=this.w;let o=e.x,l=e.y,h=e.z,d=e.w,u,f,g,p,m;return f=r*o+s*l+a*h+n*d,f<0&&(f=-f,o=-o,l=-l,h=-h,d=-d),1-f>1e-6?(u=Math.acos(f),g=Math.sin(u),p=Math.sin((1-t)*u)/g,m=Math.sin(t*u)/g):(p=1-t,m=t),i.x=p*r+m*o,i.y=p*s+m*l,i.z=p*a+m*h,i.w=p*n+m*d,i}integrate(e,t,i,r){r===void 0&&(r=new qe);const s=e.x*i.x,a=e.y*i.y,n=e.z*i.z,o=this.x,l=this.y,h=this.z,d=this.w,u=t*.5;return r.x+=u*(s*d+a*h-n*l),r.y+=u*(a*d+n*o-s*h),r.z+=u*(n*d+s*l-a*o),r.w+=u*(-s*o-a*l-n*h),r}}const Yu=new b,Zu=new b,Ju={SPHERE:1,PLANE:2,BOX:4,COMPOUND:8,CONVEXPOLYHEDRON:16,HEIGHTFIELD:32,PARTICLE:64,CYLINDER:128,TRIMESH:256};class oe{constructor(e){e===void 0&&(e={}),this.id=oe.idCounter++,this.type=e.type||0,this.boundingSphereRadius=0,this.collisionResponse=e.collisionResponse?e.collisionResponse:!0,this.collisionFilterGroup=e.collisionFilterGroup!==void 0?e.collisionFilterGroup:1,this.collisionFilterMask=e.collisionFilterMask!==void 0?e.collisionFilterMask:-1,this.material=e.material?e.material:null,this.body=null}updateBoundingSphereRadius(){throw`computeBoundingSphereRadius() not implemented for shape type ${this.type}`}volume(){throw`volume() not implemented for shape type ${this.type}`}calculateLocalInertia(e,t){throw`calculateLocalInertia() not implemented for shape type ${this.type}`}calculateWorldAABB(e,t,i,r){throw`calculateWorldAABB() not implemented for shape type ${this.type}`}}oe.idCounter=0;oe.types=Ju;class Pe{constructor(e){e===void 0&&(e={}),this.position=new b,this.quaternion=new qe,e.position&&this.position.copy(e.position),e.quaternion&&this.quaternion.copy(e.quaternion)}pointToLocal(e,t){return Pe.pointToLocalFrame(this.position,this.quaternion,e,t)}pointToWorld(e,t){return Pe.pointToWorldFrame(this.position,this.quaternion,e,t)}vectorToWorldFrame(e,t){return t===void 0&&(t=new b),this.quaternion.vmult(e,t),t}static pointToLocalFrame(e,t,i,r){return r===void 0&&(r=new b),i.vsub(e,r),t.conjugate(Nn),Nn.vmult(r,r),r}static pointToWorldFrame(e,t,i,r){return r===void 0&&(r=new b),t.vmult(i,r),r.vadd(e,r),r}static vectorToWorldFrame(e,t,i){return i===void 0&&(i=new b),e.vmult(t,i),i}static vectorToLocalFrame(e,t,i,r){return r===void 0&&(r=new b),t.w*=-1,t.vmult(i,r),t.w*=-1,r}}const Nn=new qe;class yi extends oe{constructor(e){e===void 0&&(e={});const{vertices:t=[],faces:i=[],normals:r=[],axes:s,boundingSphereRadius:a}=e;super({type:oe.types.CONVEXPOLYHEDRON}),this.vertices=t,this.faces=i,this.faceNormals=r,this.faceNormals.length===0&&this.computeNormals(),a?this.boundingSphereRadius=a:this.updateBoundingSphereRadius(),this.worldVertices=[],this.worldVerticesNeedsUpdate=!0,this.worldFaceNormals=[],this.worldFaceNormalsNeedsUpdate=!0,this.uniqueAxes=s?s.slice():null,this.uniqueEdges=[],this.computeEdges()}computeEdges(){const e=this.faces,t=this.vertices,i=this.uniqueEdges;i.length=0;const r=new b;for(let s=0;s!==e.length;s++){const a=e[s],n=a.length;for(let o=0;o!==n;o++){const l=(o+1)%n;t[a[o]].vsub(t[a[l]],r),r.normalize();let h=!1;for(let d=0;d!==i.length;d++)if(i[d].almostEquals(r)||i[d].almostEquals(r)){h=!0;break}h||i.push(r.clone())}}}computeNormals(){this.faceNormals.length=this.faces.length;for(let e=0;e<this.faces.length;e++){for(let r=0;r<this.faces[e].length;r++)if(!this.vertices[this.faces[e][r]])throw new Error(`Vertex ${this.faces[e][r]} not found!`);const t=this.faceNormals[e]||new b;this.getFaceNormal(e,t),t.negate(t),this.faceNormals[e]=t;const i=this.vertices[this.faces[e][0]];if(t.dot(i)<0){console.error(`.faceNormals[${e}] = Vec3(${t.toString()}) looks like it points into the shape? The vertices follow. Make sure they are ordered CCW around the normal, using the right hand rule.`);for(let r=0;r<this.faces[e].length;r++)console.warn(`.vertices[${this.faces[e][r]}] = Vec3(${this.vertices[this.faces[e][r]].toString()})`)}}}getFaceNormal(e,t){const i=this.faces[e],r=this.vertices[i[0]],s=this.vertices[i[1]],a=this.vertices[i[2]];yi.computeNormal(r,s,a,t)}static computeNormal(e,t,i,r){const s=new b,a=new b;t.vsub(e,a),i.vsub(t,s),s.cross(a,r),r.isZero()||r.normalize()}clipAgainstHull(e,t,i,r,s,a,n,o,l){const h=new b;let d=-1,u=-Number.MAX_VALUE;for(let g=0;g<i.faces.length;g++){h.copy(i.faceNormals[g]),s.vmult(h,h);const p=h.dot(a);p>u&&(u=p,d=g)}const f=[];for(let g=0;g<i.faces[d].length;g++){const p=i.vertices[i.faces[d][g]],m=new b;m.copy(p),s.vmult(m,m),r.vadd(m,m),f.push(m)}d>=0&&this.clipFaceAgainstHull(a,e,t,f,n,o,l)}findSeparatingAxis(e,t,i,r,s,a,n,o){const l=new b,h=new b,d=new b,u=new b,f=new b,g=new b;let p=Number.MAX_VALUE;const m=this;if(m.uniqueAxes)for(let v=0;v!==m.uniqueAxes.length;v++){i.vmult(m.uniqueAxes[v],l);const x=m.testSepAxis(l,e,t,i,r,s);if(x===!1)return!1;x<p&&(p=x,a.copy(l))}else{const v=n?n.length:m.faces.length;for(let x=0;x<v;x++){const w=n?n[x]:x;l.copy(m.faceNormals[w]),i.vmult(l,l);const _=m.testSepAxis(l,e,t,i,r,s);if(_===!1)return!1;_<p&&(p=_,a.copy(l))}}if(e.uniqueAxes)for(let v=0;v!==e.uniqueAxes.length;v++){s.vmult(e.uniqueAxes[v],h);const x=m.testSepAxis(h,e,t,i,r,s);if(x===!1)return!1;x<p&&(p=x,a.copy(h))}else{const v=o?o.length:e.faces.length;for(let x=0;x<v;x++){const w=o?o[x]:x;h.copy(e.faceNormals[w]),s.vmult(h,h);const _=m.testSepAxis(h,e,t,i,r,s);if(_===!1)return!1;_<p&&(p=_,a.copy(h))}}for(let v=0;v!==m.uniqueEdges.length;v++){i.vmult(m.uniqueEdges[v],u);for(let x=0;x!==e.uniqueEdges.length;x++)if(s.vmult(e.uniqueEdges[x],f),u.cross(f,g),!g.almostZero()){g.normalize();const w=m.testSepAxis(g,e,t,i,r,s);if(w===!1)return!1;w<p&&(p=w,a.copy(g))}}return r.vsub(t,d),d.dot(a)>0&&a.negate(a),!0}testSepAxis(e,t,i,r,s,a){const n=this;yi.project(n,e,i,r,Es),yi.project(t,e,s,a,Ts);const o=Es[0],l=Es[1],h=Ts[0],d=Ts[1];if(o<d||h<l)return!1;const u=o-d,f=h-l;return u<f?u:f}calculateLocalInertia(e,t){const i=new b,r=new b;this.computeLocalAABB(r,i);const s=i.x-r.x,a=i.y-r.y,n=i.z-r.z;t.x=1/12*e*(2*a*2*a+2*n*2*n),t.y=1/12*e*(2*s*2*s+2*n*2*n),t.z=1/12*e*(2*a*2*a+2*s*2*s)}getPlaneConstantOfFace(e){const t=this.faces[e],i=this.faceNormals[e],r=this.vertices[t[0]];return-i.dot(r)}clipFaceAgainstHull(e,t,i,r,s,a,n){const o=new b,l=new b,h=new b,d=new b,u=new b,f=new b,g=new b,p=new b,m=this,v=[],x=r,w=v;let _=-1,M=Number.MAX_VALUE;for(let D=0;D<m.faces.length;D++){o.copy(m.faceNormals[D]),i.vmult(o,o);const F=o.dot(e);F<M&&(M=F,_=D)}if(_<0)return;const E=m.faces[_];E.connectedFaces=[];for(let D=0;D<m.faces.length;D++)for(let F=0;F<m.faces[D].length;F++)E.indexOf(m.faces[D][F])!==-1&&D!==_&&E.connectedFaces.indexOf(D)===-1&&E.connectedFaces.push(D);const L=E.length;for(let D=0;D<L;D++){const F=m.vertices[E[D]],B=m.vertices[E[(D+1)%L]];F.vsub(B,l),h.copy(l),i.vmult(h,h),t.vadd(h,h),d.copy(this.faceNormals[_]),i.vmult(d,d),t.vadd(d,d),h.cross(d,u),u.negate(u),f.copy(F),i.vmult(f,f),t.vadd(f,f);const z=E.connectedFaces[D];g.copy(this.faceNormals[z]);const R=this.getPlaneConstantOfFace(z);p.copy(g),i.vmult(p,p);const I=R-p.dot(t);for(this.clipFaceAgainstPlane(x,w,p,I);x.length;)x.shift();for(;w.length;)x.push(w.shift())}g.copy(this.faceNormals[_]);const y=this.getPlaneConstantOfFace(_);p.copy(g),i.vmult(p,p);const T=y-p.dot(t);for(let D=0;D<x.length;D++){let F=p.dot(x[D])+T;if(F<=s&&(F=s),F<=a){const B=x[D];if(F<=1e-6){const z={point:B,normal:p,depth:F};n.push(z)}}}}clipFaceAgainstPlane(e,t,i,r){let s,a;const n=e.length;if(n<2)return t;let o=e[e.length-1],l=e[0];s=i.dot(o)+r;for(let h=0;h<n;h++){if(l=e[h],a=i.dot(l)+r,s<0)if(a<0){const d=new b;d.copy(l),t.push(d)}else{const d=new b;o.lerp(l,s/(s-a),d),t.push(d)}else if(a<0){const d=new b;o.lerp(l,s/(s-a),d),t.push(d),t.push(l)}o=l,s=a}return t}computeWorldVertices(e,t){for(;this.worldVertices.length<this.vertices.length;)this.worldVertices.push(new b);const i=this.vertices,r=this.worldVertices;for(let s=0;s!==this.vertices.length;s++)t.vmult(i[s],r[s]),e.vadd(r[s],r[s]);this.worldVerticesNeedsUpdate=!1}computeLocalAABB(e,t){const i=this.vertices;e.set(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE),t.set(-Number.MAX_VALUE,-Number.MAX_VALUE,-Number.MAX_VALUE);for(let r=0;r<this.vertices.length;r++){const s=i[r];s.x<e.x?e.x=s.x:s.x>t.x&&(t.x=s.x),s.y<e.y?e.y=s.y:s.y>t.y&&(t.y=s.y),s.z<e.z?e.z=s.z:s.z>t.z&&(t.z=s.z)}}computeWorldFaceNormals(e){const t=this.faceNormals.length;for(;this.worldFaceNormals.length<t;)this.worldFaceNormals.push(new b);const i=this.faceNormals,r=this.worldFaceNormals;for(let s=0;s!==t;s++)e.vmult(i[s],r[s]);this.worldFaceNormalsNeedsUpdate=!1}updateBoundingSphereRadius(){let e=0;const t=this.vertices;for(let i=0;i!==t.length;i++){const r=t[i].lengthSquared();r>e&&(e=r)}this.boundingSphereRadius=Math.sqrt(e)}calculateWorldAABB(e,t,i,r){const s=this.vertices;let a,n,o,l,h,d,u=new b;for(let f=0;f<s.length;f++){u.copy(s[f]),t.vmult(u,u),e.vadd(u,u);const g=u;(a===void 0||g.x<a)&&(a=g.x),(l===void 0||g.x>l)&&(l=g.x),(n===void 0||g.y<n)&&(n=g.y),(h===void 0||g.y>h)&&(h=g.y),(o===void 0||g.z<o)&&(o=g.z),(d===void 0||g.z>d)&&(d=g.z)}i.set(a,n,o),r.set(l,h,d)}volume(){return 4*Math.PI*this.boundingSphereRadius/3}getAveragePointLocal(e){e===void 0&&(e=new b);const t=this.vertices;for(let i=0;i<t.length;i++)e.vadd(t[i],e);return e.scale(1/t.length,e),e}transformAllPoints(e,t){const i=this.vertices.length,r=this.vertices;if(t){for(let s=0;s<i;s++){const a=r[s];t.vmult(a,a)}for(let s=0;s<this.faceNormals.length;s++){const a=this.faceNormals[s];t.vmult(a,a)}}if(e)for(let s=0;s<i;s++){const a=r[s];a.vadd(e,a)}}pointIsInside(e){const t=this.vertices,i=this.faces,r=this.faceNormals,s=new b;this.getAveragePointLocal(s);for(let a=0;a<this.faces.length;a++){let n=r[a];const o=t[i[a][0]],l=new b;e.vsub(o,l);const h=n.dot(l),d=new b;s.vsub(o,d);const u=n.dot(d);if(h<0&&u>0||h>0&&u<0)return!1}return-1}static project(e,t,i,r,s){const a=e.vertices.length,n=Ku;let o=0,l=0;const h=Qu,d=e.vertices;h.setZero(),Pe.vectorToLocalFrame(i,r,t,n),Pe.pointToLocalFrame(i,r,h,h);const u=h.dot(n);l=o=d[0].dot(n);for(let f=1;f<a;f++){const g=d[f].dot(n);g>o&&(o=g),g<l&&(l=g)}if(l-=u,o-=u,l>o){const f=l;l=o,o=f}s[0]=o,s[1]=l}}const Es=[],Ts=[];new b;const Ku=new b,Qu=new b;class Us extends oe{constructor(e){super({type:oe.types.BOX}),this.halfExtents=e,this.convexPolyhedronRepresentation=null,this.updateConvexPolyhedronRepresentation(),this.updateBoundingSphereRadius()}updateConvexPolyhedronRepresentation(){const e=this.halfExtents.x,t=this.halfExtents.y,i=this.halfExtents.z,r=b,s=[new r(-e,-t,-i),new r(e,-t,-i),new r(e,t,-i),new r(-e,t,-i),new r(-e,-t,i),new r(e,-t,i),new r(e,t,i),new r(-e,t,i)],a=[[3,2,1,0],[4,5,6,7],[5,4,0,1],[2,3,7,6],[0,4,7,3],[1,2,6,5]],n=[new r(0,0,1),new r(0,1,0),new r(1,0,0)],o=new yi({vertices:s,faces:a,axes:n});this.convexPolyhedronRepresentation=o,o.material=this.material}calculateLocalInertia(e,t){return t===void 0&&(t=new b),Us.calculateInertia(this.halfExtents,e,t),t}static calculateInertia(e,t,i){const r=e;i.x=1/12*t*(2*r.y*2*r.y+2*r.z*2*r.z),i.y=1/12*t*(2*r.x*2*r.x+2*r.z*2*r.z),i.z=1/12*t*(2*r.y*2*r.y+2*r.x*2*r.x)}getSideNormals(e,t){const i=e,r=this.halfExtents;if(i[0].set(r.x,0,0),i[1].set(0,r.y,0),i[2].set(0,0,r.z),i[3].set(-r.x,0,0),i[4].set(0,-r.y,0),i[5].set(0,0,-r.z),t!==void 0)for(let s=0;s!==i.length;s++)t.vmult(i[s],i[s]);return i}volume(){return 8*this.halfExtents.x*this.halfExtents.y*this.halfExtents.z}updateBoundingSphereRadius(){this.boundingSphereRadius=this.halfExtents.length()}forEachWorldCorner(e,t,i){const r=this.halfExtents,s=[[r.x,r.y,r.z],[-r.x,r.y,r.z],[-r.x,-r.y,r.z],[-r.x,-r.y,-r.z],[r.x,-r.y,-r.z],[r.x,r.y,-r.z],[-r.x,r.y,-r.z],[r.x,-r.y,r.z]];for(let a=0;a<s.length;a++)li.set(s[a][0],s[a][1],s[a][2]),t.vmult(li,li),e.vadd(li,li),i(li.x,li.y,li.z)}calculateWorldAABB(e,t,i,r){const s=this.halfExtents;Pt[0].set(s.x,s.y,s.z),Pt[1].set(-s.x,s.y,s.z),Pt[2].set(-s.x,-s.y,s.z),Pt[3].set(-s.x,-s.y,-s.z),Pt[4].set(s.x,-s.y,-s.z),Pt[5].set(s.x,s.y,-s.z),Pt[6].set(-s.x,s.y,-s.z),Pt[7].set(s.x,-s.y,s.z);const a=Pt[0];t.vmult(a,a),e.vadd(a,a),r.copy(a),i.copy(a);for(let n=1;n<8;n++){const o=Pt[n];t.vmult(o,o),e.vadd(o,o);const l=o.x,h=o.y,d=o.z;l>r.x&&(r.x=l),h>r.y&&(r.y=h),d>r.z&&(r.z=d),l<i.x&&(i.x=l),h<i.y&&(i.y=h),d<i.z&&(i.z=d)}}}const li=new b,Pt=[new b,new b,new b,new b,new b,new b,new b,new b],Gs={DYNAMIC:1,STATIC:2,KINEMATIC:4},Hs={AWAKE:0,SLEEPY:1,SLEEPING:2};class re extends xa{constructor(e){e===void 0&&(e={}),super(),this.id=re.idCounter++,this.index=-1,this.world=null,this.vlambda=new b,this.collisionFilterGroup=typeof e.collisionFilterGroup=="number"?e.collisionFilterGroup:1,this.collisionFilterMask=typeof e.collisionFilterMask=="number"?e.collisionFilterMask:-1,this.collisionResponse=typeof e.collisionResponse=="boolean"?e.collisionResponse:!0,this.position=new b,this.previousPosition=new b,this.interpolatedPosition=new b,this.initPosition=new b,e.position&&(this.position.copy(e.position),this.previousPosition.copy(e.position),this.interpolatedPosition.copy(e.position),this.initPosition.copy(e.position)),this.velocity=new b,e.velocity&&this.velocity.copy(e.velocity),this.initVelocity=new b,this.force=new b;const t=typeof e.mass=="number"?e.mass:0;this.mass=t,this.invMass=t>0?1/t:0,this.material=e.material||null,this.linearDamping=typeof e.linearDamping=="number"?e.linearDamping:.01,this.type=t<=0?re.STATIC:re.DYNAMIC,typeof e.type==typeof re.STATIC&&(this.type=e.type),this.allowSleep=typeof e.allowSleep<"u"?e.allowSleep:!0,this.sleepState=re.AWAKE,this.sleepSpeedLimit=typeof e.sleepSpeedLimit<"u"?e.sleepSpeedLimit:.1,this.sleepTimeLimit=typeof e.sleepTimeLimit<"u"?e.sleepTimeLimit:1,this.timeLastSleepy=0,this.wakeUpAfterNarrowphase=!1,this.torque=new b,this.quaternion=new qe,this.initQuaternion=new qe,this.previousQuaternion=new qe,this.interpolatedQuaternion=new qe,e.quaternion&&(this.quaternion.copy(e.quaternion),this.initQuaternion.copy(e.quaternion),this.previousQuaternion.copy(e.quaternion),this.interpolatedQuaternion.copy(e.quaternion)),this.angularVelocity=new b,e.angularVelocity&&this.angularVelocity.copy(e.angularVelocity),this.initAngularVelocity=new b,this.shapes=[],this.shapeOffsets=[],this.shapeOrientations=[],this.inertia=new b,this.invInertia=new b,this.invInertiaWorld=new Ct,this.invMassSolve=0,this.invInertiaSolve=new b,this.invInertiaWorldSolve=new Ct,this.fixedRotation=typeof e.fixedRotation<"u"?e.fixedRotation:!1,this.angularDamping=typeof e.angularDamping<"u"?e.angularDamping:.01,this.linearFactor=new b(1,1,1),e.linearFactor&&this.linearFactor.copy(e.linearFactor),this.angularFactor=new b(1,1,1),e.angularFactor&&this.angularFactor.copy(e.angularFactor),this.aabb=new vt,this.aabbNeedsUpdate=!0,this.boundingRadius=0,this.wlambda=new b,this.isTrigger=!!e.isTrigger,e.shape&&this.addShape(e.shape),this.updateMassProperties()}wakeUp(){const e=this.sleepState;this.sleepState=re.AWAKE,this.wakeUpAfterNarrowphase=!1,e===re.SLEEPING&&this.dispatchEvent(re.wakeupEvent)}sleep(){this.sleepState=re.SLEEPING,this.velocity.set(0,0,0),this.angularVelocity.set(0,0,0),this.wakeUpAfterNarrowphase=!1}sleepTick(e){if(this.allowSleep){const t=this.sleepState,i=this.velocity.lengthSquared()+this.angularVelocity.lengthSquared(),r=this.sleepSpeedLimit**2;t===re.AWAKE&&i<r?(this.sleepState=re.SLEEPY,this.timeLastSleepy=e,this.dispatchEvent(re.sleepyEvent)):t===re.SLEEPY&&i>r?this.wakeUp():t===re.SLEEPY&&e-this.timeLastSleepy>this.sleepTimeLimit&&(this.sleep(),this.dispatchEvent(re.sleepEvent))}}updateSolveMassProperties(){this.sleepState===re.SLEEPING||this.type===re.KINEMATIC?(this.invMassSolve=0,this.invInertiaSolve.setZero(),this.invInertiaWorldSolve.setZero()):(this.invMassSolve=this.invMass,this.invInertiaSolve.copy(this.invInertia),this.invInertiaWorldSolve.copy(this.invInertiaWorld))}pointToLocalFrame(e,t){return t===void 0&&(t=new b),e.vsub(this.position,t),this.quaternion.conjugate().vmult(t,t),t}vectorToLocalFrame(e,t){return t===void 0&&(t=new b),this.quaternion.conjugate().vmult(e,t),t}pointToWorldFrame(e,t){return t===void 0&&(t=new b),this.quaternion.vmult(e,t),t.vadd(this.position,t),t}vectorToWorldFrame(e,t){return t===void 0&&(t=new b),this.quaternion.vmult(e,t),t}addShape(e,t,i){const r=new b,s=new qe;return t&&r.copy(t),i&&s.copy(i),this.shapes.push(e),this.shapeOffsets.push(r),this.shapeOrientations.push(s),this.updateMassProperties(),this.updateBoundingRadius(),this.aabbNeedsUpdate=!0,e.body=this,this}removeShape(e){const t=this.shapes.indexOf(e);return t===-1?(console.warn("Shape does not belong to the body"),this):(this.shapes.splice(t,1),this.shapeOffsets.splice(t,1),this.shapeOrientations.splice(t,1),this.updateMassProperties(),this.updateBoundingRadius(),this.aabbNeedsUpdate=!0,e.body=null,this)}updateBoundingRadius(){const e=this.shapes,t=this.shapeOffsets,i=e.length;let r=0;for(let s=0;s!==i;s++){const a=e[s];a.updateBoundingSphereRadius();const n=t[s].length(),o=a.boundingSphereRadius;n+o>r&&(r=n+o)}this.boundingRadius=r}updateAABB(){const e=this.shapes,t=this.shapeOffsets,i=this.shapeOrientations,r=e.length,s=$u,a=ed,n=this.quaternion,o=this.aabb,l=td;for(let h=0;h!==r;h++){const d=e[h];n.vmult(t[h],s),s.vadd(this.position,s),n.mult(i[h],a),d.calculateWorldAABB(s,a,l.lowerBound,l.upperBound),h===0?o.copy(l):o.extend(l)}this.aabbNeedsUpdate=!1}updateInertiaWorld(e){const t=this.invInertia;if(!(t.x===t.y&&t.y===t.z&&!e)){const i=id,r=rd;i.setRotationFromQuaternion(this.quaternion),i.transpose(r),i.scale(t,i),i.mmult(r,this.invInertiaWorld)}}applyForce(e,t){if(t===void 0&&(t=new b),this.type!==re.DYNAMIC)return;this.sleepState===re.SLEEPING&&this.wakeUp();const i=sd;t.cross(e,i),this.force.vadd(e,this.force),this.torque.vadd(i,this.torque)}applyLocalForce(e,t){if(t===void 0&&(t=new b),this.type!==re.DYNAMIC)return;const i=nd,r=ad;this.vectorToWorldFrame(e,i),this.vectorToWorldFrame(t,r),this.applyForce(i,r)}applyTorque(e){this.type===re.DYNAMIC&&(this.sleepState===re.SLEEPING&&this.wakeUp(),this.torque.vadd(e,this.torque))}applyImpulse(e,t){if(t===void 0&&(t=new b),this.type!==re.DYNAMIC)return;this.sleepState===re.SLEEPING&&this.wakeUp();const i=t,r=od;r.copy(e),r.scale(this.invMass,r),this.velocity.vadd(r,this.velocity);const s=ld;i.cross(e,s),this.invInertiaWorld.vmult(s,s),this.angularVelocity.vadd(s,this.angularVelocity)}applyLocalImpulse(e,t){if(t===void 0&&(t=new b),this.type!==re.DYNAMIC)return;const i=cd,r=hd;this.vectorToWorldFrame(e,i),this.vectorToWorldFrame(t,r),this.applyImpulse(i,r)}updateMassProperties(){const e=ud;this.invMass=this.mass>0?1/this.mass:0;const t=this.inertia,i=this.fixedRotation;this.updateAABB(),e.set((this.aabb.upperBound.x-this.aabb.lowerBound.x)/2,(this.aabb.upperBound.y-this.aabb.lowerBound.y)/2,(this.aabb.upperBound.z-this.aabb.lowerBound.z)/2),Us.calculateInertia(e,this.mass,t),this.invInertia.set(t.x>0&&!i?1/t.x:0,t.y>0&&!i?1/t.y:0,t.z>0&&!i?1/t.z:0),this.updateInertiaWorld(!0)}getVelocityAtWorldPoint(e,t){const i=new b;return e.vsub(this.position,i),this.angularVelocity.cross(i,t),this.velocity.vadd(t,t),t}integrate(e,t,i){if(this.previousPosition.copy(this.position),this.previousQuaternion.copy(this.quaternion),!(this.type===re.DYNAMIC||this.type===re.KINEMATIC)||this.sleepState===re.SLEEPING)return;const r=this.velocity,s=this.angularVelocity,a=this.position,n=this.force,o=this.torque,l=this.quaternion,h=this.invMass,d=this.invInertiaWorld,u=this.linearFactor,f=h*e;r.x+=n.x*f*u.x,r.y+=n.y*f*u.y,r.z+=n.z*f*u.z;const g=d.elements,p=this.angularFactor,m=o.x*p.x,v=o.y*p.y,x=o.z*p.z;s.x+=e*(g[0]*m+g[1]*v+g[2]*x),s.y+=e*(g[3]*m+g[4]*v+g[5]*x),s.z+=e*(g[6]*m+g[7]*v+g[8]*x),a.x+=r.x*e,a.y+=r.y*e,a.z+=r.z*e,l.integrate(this.angularVelocity,e,this.angularFactor,l),t&&(i?l.normalizeFast():l.normalize()),this.aabbNeedsUpdate=!0,this.updateInertiaWorld()}}re.idCounter=0;re.COLLIDE_EVENT_NAME="collide";re.DYNAMIC=Gs.DYNAMIC;re.STATIC=Gs.STATIC;re.KINEMATIC=Gs.KINEMATIC;re.AWAKE=Hs.AWAKE;re.SLEEPY=Hs.SLEEPY;re.SLEEPING=Hs.SLEEPING;re.wakeupEvent={type:"wakeup"};re.sleepyEvent={type:"sleepy"};re.sleepEvent={type:"sleep"};const $u=new b,ed=new qe,td=new vt,id=new Ct,rd=new Ct;new Ct;const sd=new b,nd=new b,ad=new b,od=new b,ld=new b,cd=new b,hd=new b,ud=new b;class dd{constructor(){this.world=null,this.useBoundingBoxes=!1,this.dirty=!0}collisionPairs(e,t,i){throw new Error("collisionPairs not implemented for this BroadPhase class!")}needBroadphaseCollision(e,t){return!(!(e.collisionFilterGroup&t.collisionFilterMask)||!(t.collisionFilterGroup&e.collisionFilterMask)||(e.type&re.STATIC||e.sleepState===re.SLEEPING)&&(t.type&re.STATIC||t.sleepState===re.SLEEPING))}intersectionTest(e,t,i,r){this.useBoundingBoxes?this.doBoundingBoxBroadphase(e,t,i,r):this.doBoundingSphereBroadphase(e,t,i,r)}doBoundingSphereBroadphase(e,t,i,r){const s=pd;t.position.vsub(e.position,s);const a=(e.boundingRadius+t.boundingRadius)**2;s.lengthSquared()<a&&(i.push(e),r.push(t))}doBoundingBoxBroadphase(e,t,i,r){e.aabbNeedsUpdate&&e.updateAABB(),t.aabbNeedsUpdate&&t.updateAABB(),e.aabb.overlaps(t.aabb)&&(i.push(e),r.push(t))}makePairsUnique(e,t){const i=md,r=fd,s=gd,a=e.length;for(let n=0;n!==a;n++)r[n]=e[n],s[n]=t[n];e.length=0,t.length=0;for(let n=0;n!==a;n++){const o=r[n].id,l=s[n].id,h=o<l?`${o},${l}`:`${l},${o}`;i[h]=n,i.keys.push(h)}for(let n=0;n!==i.keys.length;n++){const o=i.keys.pop(),l=i[o];e.push(r[l]),t.push(s[l]),delete i[o]}}setWorld(e){}static boundingSphereCheck(e,t){const i=new b;e.position.vsub(t.position,i);const r=e.shapes[0],s=t.shapes[0];return Math.pow(r.boundingSphereRadius+s.boundingSphereRadius,2)>i.lengthSquared()}aabbQuery(e,t,i){return console.warn(".aabbQuery is not implemented in this Broadphase subclass."),[]}}const pd=new b;new b;new qe;new b;const md={keys:[]},fd=[],gd=[];new b;new b;new b;class _a extends dd{constructor(){super()}collisionPairs(e,t,i){const r=e.bodies,s=r.length;let a,n;for(let o=0;o!==s;o++)for(let l=0;l!==o;l++)a=r[o],n=r[l],this.needBroadphaseCollision(a,n)&&this.intersectionTest(a,n,t,i)}aabbQuery(e,t,i){i===void 0&&(i=[]);for(let r=0;r<e.bodies.length;r++){const s=e.bodies[r];s.aabbNeedsUpdate&&s.updateAABB(),s.aabb.overlaps(t)&&i.push(s)}return i}}class Wr{constructor(){this.rayFromWorld=new b,this.rayToWorld=new b,this.hitNormalWorld=new b,this.hitPointWorld=new b,this.hasHit=!1,this.shape=null,this.body=null,this.hitFaceIndex=-1,this.distance=-1,this.shouldStop=!1}reset(){this.rayFromWorld.setZero(),this.rayToWorld.setZero(),this.hitNormalWorld.setZero(),this.hitPointWorld.setZero(),this.hasHit=!1,this.shape=null,this.body=null,this.hitFaceIndex=-1,this.distance=-1,this.shouldStop=!1}abort(){this.shouldStop=!0}set(e,t,i,r,s,a,n){this.rayFromWorld.copy(e),this.rayToWorld.copy(t),this.hitNormalWorld.copy(i),this.hitPointWorld.copy(r),this.shape=s,this.body=a,this.distance=n}}let ya,ba,wa,Ma,Sa,Ea,Ta;const Vs={CLOSEST:1,ANY:2,ALL:4};ya=oe.types.SPHERE;ba=oe.types.PLANE;wa=oe.types.BOX;Ma=oe.types.CYLINDER;Sa=oe.types.CONVEXPOLYHEDRON;Ea=oe.types.HEIGHTFIELD;Ta=oe.types.TRIMESH;class We{get[ya](){return this._intersectSphere}get[ba](){return this._intersectPlane}get[wa](){return this._intersectBox}get[Ma](){return this._intersectConvex}get[Sa](){return this._intersectConvex}get[Ea](){return this._intersectHeightfield}get[Ta](){return this._intersectTrimesh}constructor(e,t){e===void 0&&(e=new b),t===void 0&&(t=new b),this.from=e.clone(),this.to=t.clone(),this.direction=new b,this.precision=1e-4,this.checkCollisionResponse=!0,this.skipBackfaces=!1,this.collisionFilterMask=-1,this.collisionFilterGroup=-1,this.mode=We.ANY,this.result=new Wr,this.hasHit=!1,this.callback=i=>{}}intersectWorld(e,t){return this.mode=t.mode||We.ANY,this.result=t.result||new Wr,this.skipBackfaces=!!t.skipBackfaces,this.collisionFilterMask=typeof t.collisionFilterMask<"u"?t.collisionFilterMask:-1,this.collisionFilterGroup=typeof t.collisionFilterGroup<"u"?t.collisionFilterGroup:-1,this.checkCollisionResponse=typeof t.checkCollisionResponse<"u"?t.checkCollisionResponse:!0,t.from&&this.from.copy(t.from),t.to&&this.to.copy(t.to),this.callback=t.callback||(()=>{}),this.hasHit=!1,this.result.reset(),this.updateDirection(),this.getAABB(On),As.length=0,e.broadphase.aabbQuery(e,On,As),this.intersectBodies(As),this.hasHit}intersectBody(e,t){t&&(this.result=t,this.updateDirection());const i=this.checkCollisionResponse;if(i&&!e.collisionResponse||!(this.collisionFilterGroup&e.collisionFilterMask)||!(e.collisionFilterGroup&this.collisionFilterMask))return;const r=vd,s=xd;for(let a=0,n=e.shapes.length;a<n;a++){const o=e.shapes[a];if(!(i&&!o.collisionResponse)&&(e.quaternion.mult(e.shapeOrientations[a],s),e.quaternion.vmult(e.shapeOffsets[a],r),r.vadd(e.position,r),this.intersectShape(o,s,r,e),this.result.shouldStop))break}}intersectBodies(e,t){t&&(this.result=t,this.updateDirection());for(let i=0,r=e.length;!this.result.shouldStop&&i<r;i++)this.intersectBody(e[i])}updateDirection(){this.to.vsub(this.from,this.direction),this.direction.normalize()}intersectShape(e,t,i,r){const s=this.from;if(Pd(s,this.direction,i)>e.boundingSphereRadius)return;const a=this[e.type];a&&a.call(this,e,t,i,r,e)}_intersectBox(e,t,i,r,s){return this._intersectConvex(e.convexPolyhedronRepresentation,t,i,r,s)}_intersectPlane(e,t,i,r,s){const a=this.from,n=this.to,o=this.direction,l=new b(0,0,1);t.vmult(l,l);const h=new b;a.vsub(i,h);const d=h.dot(l);n.vsub(i,h);const u=h.dot(l);if(d*u>0||a.distanceTo(n)<d)return;const f=l.dot(o);if(Math.abs(f)<this.precision)return;const g=new b,p=new b,m=new b;a.vsub(i,g);const v=-l.dot(g)/f;o.scale(v,p),a.vadd(p,m),this.reportIntersection(l,m,s,r,-1)}getAABB(e){const{lowerBound:t,upperBound:i}=e,r=this.to,s=this.from;t.x=Math.min(r.x,s.x),t.y=Math.min(r.y,s.y),t.z=Math.min(r.z,s.z),i.x=Math.max(r.x,s.x),i.y=Math.max(r.y,s.y),i.z=Math.max(r.z,s.z)}_intersectHeightfield(e,t,i,r,s){e.data,e.elementSize;const a=_d;a.from.copy(this.from),a.to.copy(this.to),Pe.pointToLocalFrame(i,t,a.from,a.from),Pe.pointToLocalFrame(i,t,a.to,a.to),a.updateDirection();const n=yd;let o,l,h,d;o=l=0,h=d=e.data.length-1;const u=new vt;a.getAABB(u),e.getIndexOfPosition(u.lowerBound.x,u.lowerBound.y,n,!0),o=Math.max(o,n[0]),l=Math.max(l,n[1]),e.getIndexOfPosition(u.upperBound.x,u.upperBound.y,n,!0),h=Math.min(h,n[0]+1),d=Math.min(d,n[1]+1);for(let f=o;f<h;f++)for(let g=l;g<d;g++){if(this.result.shouldStop)return;if(e.getAabbAtIndex(f,g,u),!!u.overlapsRay(a)){if(e.getConvexTrianglePillar(f,g,!1),Pe.pointToWorldFrame(i,t,e.pillarOffset,Nr),this._intersectConvex(e.pillarConvex,t,Nr,r,s,Bn),this.result.shouldStop)return;e.getConvexTrianglePillar(f,g,!0),Pe.pointToWorldFrame(i,t,e.pillarOffset,Nr),this._intersectConvex(e.pillarConvex,t,Nr,r,s,Bn)}}}_intersectSphere(e,t,i,r,s){const a=this.from,n=this.to,o=e.radius,l=(n.x-a.x)**2+(n.y-a.y)**2+(n.z-a.z)**2,h=2*((n.x-a.x)*(a.x-i.x)+(n.y-a.y)*(a.y-i.y)+(n.z-a.z)*(a.z-i.z)),d=(a.x-i.x)**2+(a.y-i.y)**2+(a.z-i.z)**2-o**2,u=h**2-4*l*d,f=bd,g=wd;if(!(u<0))if(u===0)a.lerp(n,u,f),f.vsub(i,g),g.normalize(),this.reportIntersection(g,f,s,r,-1);else{const p=(-h-Math.sqrt(u))/(2*l),m=(-h+Math.sqrt(u))/(2*l);if(p>=0&&p<=1&&(a.lerp(n,p,f),f.vsub(i,g),g.normalize(),this.reportIntersection(g,f,s,r,-1)),this.result.shouldStop)return;m>=0&&m<=1&&(a.lerp(n,m,f),f.vsub(i,g),g.normalize(),this.reportIntersection(g,f,s,r,-1))}}_intersectConvex(e,t,i,r,s,a){const n=Md,o=kn,l=a&&a.faceList||null,h=e.faces,d=e.vertices,u=e.faceNormals,f=this.direction,g=this.from,p=this.to,m=g.distanceTo(p),v=l?l.length:h.length,x=this.result;for(let w=0;!x.shouldStop&&w<v;w++){const _=l?l[w]:w,M=h[_],E=u[_],L=t,y=i;o.copy(d[M[0]]),L.vmult(o,o),o.vadd(y,o),o.vsub(g,o),L.vmult(E,n);const T=f.dot(n);if(Math.abs(T)<this.precision)continue;const D=n.dot(o)/T;if(!(D<0)){f.scale(D,ct),ct.vadd(g,ct),At.copy(d[M[0]]),L.vmult(At,At),y.vadd(At,At);for(let F=1;!x.shouldStop&&F<M.length-1;F++){Ft.copy(d[M[F]]),It.copy(d[M[F+1]]),L.vmult(Ft,Ft),L.vmult(It,It),y.vadd(Ft,Ft),y.vadd(It,It);const B=ct.distanceTo(g);!(We.pointInTriangle(ct,At,Ft,It)||We.pointInTriangle(ct,Ft,At,It))||B>m||this.reportIntersection(n,ct,s,r,_)}}}}_intersectTrimesh(e,t,i,r,s,a){const n=Sd,o=Rd,l=Dd,h=kn,d=Ed,u=Td,f=Ad,g=Ld,p=Cd,m=e.indices;e.vertices;const v=this.from,x=this.to,w=this.direction;l.position.copy(i),l.quaternion.copy(t),Pe.vectorToLocalFrame(i,t,w,d),Pe.pointToLocalFrame(i,t,v,u),Pe.pointToLocalFrame(i,t,x,f),f.x*=e.scale.x,f.y*=e.scale.y,f.z*=e.scale.z,u.x*=e.scale.x,u.y*=e.scale.y,u.z*=e.scale.z,f.vsub(u,d),d.normalize();const _=u.distanceSquared(f);e.tree.rayQuery(this,l,o);for(let M=0,E=o.length;!this.result.shouldStop&&M!==E;M++){const L=o[M];e.getNormal(L,n),e.getVertex(m[L*3],At),At.vsub(u,h);const y=d.dot(n),T=n.dot(h)/y;if(T<0)continue;d.scale(T,ct),ct.vadd(u,ct),e.getVertex(m[L*3+1],Ft),e.getVertex(m[L*3+2],It);const D=ct.distanceSquared(u);!(We.pointInTriangle(ct,Ft,At,It)||We.pointInTriangle(ct,At,Ft,It))||D>_||(Pe.vectorToWorldFrame(t,n,p),Pe.pointToWorldFrame(i,t,ct,g),this.reportIntersection(p,g,s,r,L))}o.length=0}reportIntersection(e,t,i,r,s){const a=this.from,n=this.to,o=a.distanceTo(t),l=this.result;if(!(this.skipBackfaces&&e.dot(this.direction)>0))switch(l.hitFaceIndex=typeof s<"u"?s:-1,this.mode){case We.ALL:this.hasHit=!0,l.set(a,n,e,t,i,r,o),l.hasHit=!0,this.callback(l);break;case We.CLOSEST:(o<l.distance||!l.hasHit)&&(this.hasHit=!0,l.hasHit=!0,l.set(a,n,e,t,i,r,o));break;case We.ANY:this.hasHit=!0,l.hasHit=!0,l.set(a,n,e,t,i,r,o),l.shouldStop=!0;break}}static pointInTriangle(e,t,i,r){r.vsub(t,vi),i.vsub(t,tr),e.vsub(t,Cs);const s=vi.dot(vi),a=vi.dot(tr),n=vi.dot(Cs),o=tr.dot(tr),l=tr.dot(Cs);let h,d;return(h=o*n-a*l)>=0&&(d=s*l-a*n)>=0&&h+d<s*o-a*a}}We.CLOSEST=Vs.CLOSEST;We.ANY=Vs.ANY;We.ALL=Vs.ALL;const On=new vt,As=[],tr=new b,Cs=new b,vd=new b,xd=new qe,ct=new b,At=new b,Ft=new b,It=new b;new b;new Wr;const Bn={faceList:[0]},Nr=new b,_d=new We,yd=[],bd=new b,wd=new b,Md=new b;new b;new b;const kn=new b,Sd=new b,Ed=new b,Td=new b,Ad=new b,Cd=new b,Ld=new b;new vt;const Rd=[],Dd=new Pe,vi=new b,Or=new b;function Pd(c,e,t){t.vsub(c,vi);const i=vi.dot(e);return e.scale(i,Or),Or.vadd(c,Or),t.distanceTo(Or)}class Fd{static defaults(e,t){e===void 0&&(e={});for(let i in t)i in e||(e[i]=t[i]);return e}}class Un{constructor(){this.spatial=new b,this.rotational=new b}multiplyElement(e){return e.spatial.dot(this.spatial)+e.rotational.dot(this.rotational)}multiplyVectors(e,t){return e.dot(this.spatial)+t.dot(this.rotational)}}class mr{constructor(e,t,i,r){i===void 0&&(i=-1e6),r===void 0&&(r=1e6),this.id=mr.idCounter++,this.minForce=i,this.maxForce=r,this.bi=e,this.bj=t,this.a=0,this.b=0,this.eps=0,this.jacobianElementA=new Un,this.jacobianElementB=new Un,this.enabled=!0,this.multiplier=0,this.setSpookParams(1e7,4,1/60)}setSpookParams(e,t,i){const r=t,s=e,a=i;this.a=4/(a*(1+4*r)),this.b=4*r/(1+4*r),this.eps=4/(a*a*s*(1+4*r))}computeB(e,t,i){const r=this.computeGW(),s=this.computeGq(),a=this.computeGiMf();return-s*e-r*t-a*i}computeGq(){const e=this.jacobianElementA,t=this.jacobianElementB,i=this.bi,r=this.bj,s=i.position,a=r.position;return e.spatial.dot(s)+t.spatial.dot(a)}computeGW(){const e=this.jacobianElementA,t=this.jacobianElementB,i=this.bi,r=this.bj,s=i.velocity,a=r.velocity,n=i.angularVelocity,o=r.angularVelocity;return e.multiplyVectors(s,n)+t.multiplyVectors(a,o)}computeGWlambda(){const e=this.jacobianElementA,t=this.jacobianElementB,i=this.bi,r=this.bj,s=i.vlambda,a=r.vlambda,n=i.wlambda,o=r.wlambda;return e.multiplyVectors(s,n)+t.multiplyVectors(a,o)}computeGiMf(){const e=this.jacobianElementA,t=this.jacobianElementB,i=this.bi,r=this.bj,s=i.force,a=i.torque,n=r.force,o=r.torque,l=i.invMassSolve,h=r.invMassSolve;return s.scale(l,Gn),n.scale(h,Hn),i.invInertiaWorldSolve.vmult(a,Vn),r.invInertiaWorldSolve.vmult(o,Wn),e.multiplyVectors(Gn,Vn)+t.multiplyVectors(Hn,Wn)}computeGiMGt(){const e=this.jacobianElementA,t=this.jacobianElementB,i=this.bi,r=this.bj,s=i.invMassSolve,a=r.invMassSolve,n=i.invInertiaWorldSolve,o=r.invInertiaWorldSolve;let l=s+a;return n.vmult(e.rotational,Br),l+=Br.dot(e.rotational),o.vmult(t.rotational,Br),l+=Br.dot(t.rotational),l}addToWlambda(e){const t=this.jacobianElementA,i=this.jacobianElementB,r=this.bi,s=this.bj,a=Id;r.vlambda.addScaledVector(r.invMassSolve*e,t.spatial,r.vlambda),s.vlambda.addScaledVector(s.invMassSolve*e,i.spatial,s.vlambda),r.invInertiaWorldSolve.vmult(t.rotational,a),r.wlambda.addScaledVector(e,a,r.wlambda),s.invInertiaWorldSolve.vmult(i.rotational,a),s.wlambda.addScaledVector(e,a,s.wlambda)}computeC(){return this.computeGiMGt()+this.eps}}mr.idCounter=0;const Gn=new b,Hn=new b,Vn=new b,Wn=new b,Br=new b,Id=new b;class zd extends mr{constructor(e,t,i){i===void 0&&(i=1e6),super(e,t,0,i),this.restitution=0,this.ri=new b,this.rj=new b,this.ni=new b}computeB(e){const t=this.a,i=this.b,r=this.bi,s=this.bj,a=this.ri,n=this.rj,o=Nd,l=Od,h=r.velocity,d=r.angularVelocity;r.force,r.torque;const u=s.velocity,f=s.angularVelocity;s.force,s.torque;const g=Bd,p=this.jacobianElementA,m=this.jacobianElementB,v=this.ni;a.cross(v,o),n.cross(v,l),v.negate(p.spatial),o.negate(p.rotational),m.spatial.copy(v),m.rotational.copy(l),g.copy(s.position),g.vadd(n,g),g.vsub(r.position,g),g.vsub(a,g);const x=v.dot(g),w=this.restitution+1,_=w*u.dot(v)-w*h.dot(v)+f.dot(l)-d.dot(o),M=this.computeGiMf();return-x*t-_*i-e*M}getImpactVelocityAlongNormal(){const e=kd,t=Ud,i=Gd,r=Hd,s=Vd;return this.bi.position.vadd(this.ri,i),this.bj.position.vadd(this.rj,r),this.bi.getVelocityAtWorldPoint(i,e),this.bj.getVelocityAtWorldPoint(r,t),e.vsub(t,s),this.ni.dot(s)}}const Nd=new b,Od=new b,Bd=new b,kd=new b,Ud=new b,Gd=new b,Hd=new b,Vd=new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;class qn extends mr{constructor(e,t,i){super(e,t,-i,i),this.ri=new b,this.rj=new b,this.t=new b}computeB(e){this.a;const t=this.b;this.bi,this.bj;const i=this.ri,r=this.rj,s=Wd,a=qd,n=this.t;i.cross(n,s),r.cross(n,a);const o=this.jacobianElementA,l=this.jacobianElementB;n.negate(o.spatial),s.negate(o.rotational),l.spatial.copy(n),l.rotational.copy(a);const h=this.computeGW(),d=this.computeGiMf();return-h*t-e*d}}const Wd=new b,qd=new b;class bi{constructor(e,t,i){i=Fd.defaults(i,{friction:.3,restitution:.3,contactEquationStiffness:1e7,contactEquationRelaxation:3,frictionEquationStiffness:1e7,frictionEquationRelaxation:3}),this.id=bi.idCounter++,this.materials=[e,t],this.friction=i.friction,this.restitution=i.restitution,this.contactEquationStiffness=i.contactEquationStiffness,this.contactEquationRelaxation=i.contactEquationRelaxation,this.frictionEquationStiffness=i.frictionEquationStiffness,this.frictionEquationRelaxation=i.frictionEquationRelaxation}}bi.idCounter=0;class wi{constructor(e){e===void 0&&(e={});let t="";typeof e=="string"&&(t=e,e={}),this.name=t,this.id=wi.idCounter++,this.friction=typeof e.friction<"u"?e.friction:-1,this.restitution=typeof e.restitution<"u"?e.restitution:-1}}wi.idCounter=0;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new We;new b;new b;new b;new b(1,0,0),new b(0,1,0),new b(0,0,1);new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;class jd extends yi{constructor(e,t,i,r){if(e===void 0&&(e=1),t===void 0&&(t=1),i===void 0&&(i=1),r===void 0&&(r=8),e<0)throw new Error("The cylinder radiusTop cannot be negative.");if(t<0)throw new Error("The cylinder radiusBottom cannot be negative.");const s=r,a=[],n=[],o=[],l=[],h=[],d=Math.cos,u=Math.sin;a.push(new b(-t*u(0),-i*.5,t*d(0))),l.push(0),a.push(new b(-e*u(0),i*.5,e*d(0))),h.push(1);for(let g=0;g<s;g++){const p=2*Math.PI/s*(g+1),m=2*Math.PI/s*(g+.5);g<s-1?(a.push(new b(-t*u(p),-i*.5,t*d(p))),l.push(2*g+2),a.push(new b(-e*u(p),i*.5,e*d(p))),h.push(2*g+3),o.push([2*g,2*g+1,2*g+3,2*g+2])):o.push([2*g,2*g+1,1,0]),(s%2===1||g<s/2)&&n.push(new b(-u(m),0,d(m)))}o.push(l),n.push(new b(0,1,0));const f=[];for(let g=0;g<h.length;g++)f.push(h[h.length-g-1]);o.push(f),super({vertices:a,faces:o,axes:n}),this.type=oe.types.CYLINDER,this.radiusTop=e,this.radiusBottom=t,this.height=i,this.numSegments=r}}class ir extends oe{constructor(){super({type:oe.types.PLANE}),this.worldNormal=new b,this.worldNormalNeedsUpdate=!0,this.boundingSphereRadius=Number.MAX_VALUE}computeWorldNormal(e){const t=this.worldNormal;t.set(0,0,1),e.vmult(t,t),this.worldNormalNeedsUpdate=!1}calculateLocalInertia(e,t){return t===void 0&&(t=new b),t}volume(){return Number.MAX_VALUE}calculateWorldAABB(e,t,i,r){jt.set(0,0,1),t.vmult(jt,jt);const s=Number.MAX_VALUE;i.set(-s,-s,-s),r.set(s,s,s),jt.x===1?r.x=e.x:jt.x===-1&&(i.x=e.x),jt.y===1?r.y=e.y:jt.y===-1&&(i.y=e.y),jt.z===1?r.z=e.z:jt.z===-1&&(i.z=e.z)}updateBoundingSphereRadius(){this.boundingSphereRadius=Number.MAX_VALUE}}const jt=new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new b;new vt;new b;new vt;new b;new b;new b;new b;new b;new b;new b;new vt;new b;new Pe;new vt;class Xd{constructor(){this.equations=[]}solve(e,t){return 0}addEquation(e){e.enabled&&!e.bi.isTrigger&&!e.bj.isTrigger&&this.equations.push(e)}removeEquation(e){const t=this.equations,i=t.indexOf(e);i!==-1&&t.splice(i,1)}removeAllEquations(){this.equations.length=0}}class Yd extends Xd{constructor(){super(),this.iterations=10,this.tolerance=1e-7}solve(e,t){let i=0;const r=this.iterations,s=this.tolerance*this.tolerance,a=this.equations,n=a.length,o=t.bodies,l=o.length,h=e;let d,u,f,g,p,m;if(n!==0)for(let _=0;_!==l;_++)o[_].updateSolveMassProperties();const v=Jd,x=Kd,w=Zd;v.length=n,x.length=n,w.length=n;for(let _=0;_!==n;_++){const M=a[_];w[_]=0,x[_]=M.computeB(h),v[_]=1/M.computeC()}if(n!==0){for(let E=0;E!==l;E++){const L=o[E],y=L.vlambda,T=L.wlambda;y.set(0,0,0),T.set(0,0,0)}for(i=0;i!==r;i++){g=0;for(let E=0;E!==n;E++){const L=a[E];d=x[E],u=v[E],m=w[E],p=L.computeGWlambda(),f=u*(d-p-L.eps*m),m+f<L.minForce?f=L.minForce-m:m+f>L.maxForce&&(f=L.maxForce-m),w[E]+=f,g+=f>0?f:-f,L.addToWlambda(f)}if(g*g<s)break}for(let E=0;E!==l;E++){const L=o[E],y=L.velocity,T=L.angularVelocity;L.vlambda.vmul(L.linearFactor,L.vlambda),y.vadd(L.vlambda,y),L.wlambda.vmul(L.angularFactor,L.wlambda),T.vadd(L.wlambda,T)}let _=a.length;const M=1/h;for(;_--;)a[_].multiplier=w[_]*M}return i}}const Zd=[],Jd=[],Kd=[];class Qd{constructor(){this.objects=[],this.type=Object}release(){const e=arguments.length;for(let t=0;t!==e;t++)this.objects.push(t<0||arguments.length<=t?void 0:arguments[t]);return this}get(){return this.objects.length===0?this.constructObject():this.objects.pop()}constructObject(){throw new Error("constructObject() not implemented in this Pool subclass yet!")}resize(e){const t=this.objects;for(;t.length>e;)t.pop();for(;t.length<e;)t.push(this.constructObject());return this}}class $d extends Qd{constructor(){super(...arguments),this.type=b}constructObject(){return new b}}const Oe={sphereSphere:oe.types.SPHERE,spherePlane:oe.types.SPHERE|oe.types.PLANE,boxBox:oe.types.BOX|oe.types.BOX,sphereBox:oe.types.SPHERE|oe.types.BOX,planeBox:oe.types.PLANE|oe.types.BOX,convexConvex:oe.types.CONVEXPOLYHEDRON,sphereConvex:oe.types.SPHERE|oe.types.CONVEXPOLYHEDRON,planeConvex:oe.types.PLANE|oe.types.CONVEXPOLYHEDRON,boxConvex:oe.types.BOX|oe.types.CONVEXPOLYHEDRON,sphereHeightfield:oe.types.SPHERE|oe.types.HEIGHTFIELD,boxHeightfield:oe.types.BOX|oe.types.HEIGHTFIELD,convexHeightfield:oe.types.CONVEXPOLYHEDRON|oe.types.HEIGHTFIELD,sphereParticle:oe.types.PARTICLE|oe.types.SPHERE,planeParticle:oe.types.PLANE|oe.types.PARTICLE,boxParticle:oe.types.BOX|oe.types.PARTICLE,convexParticle:oe.types.PARTICLE|oe.types.CONVEXPOLYHEDRON,cylinderCylinder:oe.types.CYLINDER,sphereCylinder:oe.types.SPHERE|oe.types.CYLINDER,planeCylinder:oe.types.PLANE|oe.types.CYLINDER,boxCylinder:oe.types.BOX|oe.types.CYLINDER,convexCylinder:oe.types.CONVEXPOLYHEDRON|oe.types.CYLINDER,heightfieldCylinder:oe.types.HEIGHTFIELD|oe.types.CYLINDER,particleCylinder:oe.types.PARTICLE|oe.types.CYLINDER,sphereTrimesh:oe.types.SPHERE|oe.types.TRIMESH,planeTrimesh:oe.types.PLANE|oe.types.TRIMESH};class ep{get[Oe.sphereSphere](){return this.sphereSphere}get[Oe.spherePlane](){return this.spherePlane}get[Oe.boxBox](){return this.boxBox}get[Oe.sphereBox](){return this.sphereBox}get[Oe.planeBox](){return this.planeBox}get[Oe.convexConvex](){return this.convexConvex}get[Oe.sphereConvex](){return this.sphereConvex}get[Oe.planeConvex](){return this.planeConvex}get[Oe.boxConvex](){return this.boxConvex}get[Oe.sphereHeightfield](){return this.sphereHeightfield}get[Oe.boxHeightfield](){return this.boxHeightfield}get[Oe.convexHeightfield](){return this.convexHeightfield}get[Oe.sphereParticle](){return this.sphereParticle}get[Oe.planeParticle](){return this.planeParticle}get[Oe.boxParticle](){return this.boxParticle}get[Oe.convexParticle](){return this.convexParticle}get[Oe.cylinderCylinder](){return this.convexConvex}get[Oe.sphereCylinder](){return this.sphereConvex}get[Oe.planeCylinder](){return this.planeConvex}get[Oe.boxCylinder](){return this.boxConvex}get[Oe.convexCylinder](){return this.convexConvex}get[Oe.heightfieldCylinder](){return this.heightfieldCylinder}get[Oe.particleCylinder](){return this.particleCylinder}get[Oe.sphereTrimesh](){return this.sphereTrimesh}get[Oe.planeTrimesh](){return this.planeTrimesh}constructor(e){this.contactPointPool=[],this.frictionEquationPool=[],this.result=[],this.frictionResult=[],this.v3pool=new $d,this.world=e,this.currentContactMaterial=e.defaultContactMaterial,this.enableFrictionReduction=!1}createContactEquation(e,t,i,r,s,a){let n;this.contactPointPool.length?(n=this.contactPointPool.pop(),n.bi=e,n.bj=t):n=new zd(e,t),n.enabled=e.collisionResponse&&t.collisionResponse&&i.collisionResponse&&r.collisionResponse;const o=this.currentContactMaterial;n.restitution=o.restitution,n.setSpookParams(o.contactEquationStiffness,o.contactEquationRelaxation,this.world.dt);const l=i.material||e.material,h=r.material||t.material;return l&&h&&l.restitution>=0&&h.restitution>=0&&(n.restitution=l.restitution*h.restitution),n.si=s||i,n.sj=a||r,n}createFrictionEquationsFromContact(e,t){const i=e.bi,r=e.bj,s=e.si,a=e.sj,n=this.world,o=this.currentContactMaterial;let l=o.friction;const h=s.material||i.material,d=a.material||r.material;if(h&&d&&h.friction>=0&&d.friction>=0&&(l=h.friction*d.friction),l>0){const u=l*(n.frictionGravity||n.gravity).length();let f=i.invMass+r.invMass;f>0&&(f=1/f);const g=this.frictionEquationPool,p=g.length?g.pop():new qn(i,r,u*f),m=g.length?g.pop():new qn(i,r,u*f);return p.bi=m.bi=i,p.bj=m.bj=r,p.minForce=m.minForce=-u*f,p.maxForce=m.maxForce=u*f,p.ri.copy(e.ri),p.rj.copy(e.rj),m.ri.copy(e.ri),m.rj.copy(e.rj),e.ni.tangents(p.t,m.t),p.setSpookParams(o.frictionEquationStiffness,o.frictionEquationRelaxation,n.dt),m.setSpookParams(o.frictionEquationStiffness,o.frictionEquationRelaxation,n.dt),p.enabled=m.enabled=e.enabled,t.push(p,m),!0}return!1}createFrictionFromAverage(e){let t=this.result[this.result.length-1];if(!this.createFrictionEquationsFromContact(t,this.frictionResult)||e===1)return;const i=this.frictionResult[this.frictionResult.length-2],r=this.frictionResult[this.frictionResult.length-1];pi.setZero(),Vi.setZero(),Wi.setZero();const s=t.bi;t.bj;for(let n=0;n!==e;n++)t=this.result[this.result.length-1-n],t.bi!==s?(pi.vadd(t.ni,pi),Vi.vadd(t.ri,Vi),Wi.vadd(t.rj,Wi)):(pi.vsub(t.ni,pi),Vi.vadd(t.rj,Vi),Wi.vadd(t.ri,Wi));const a=1/e;Vi.scale(a,i.ri),Wi.scale(a,i.rj),r.ri.copy(i.ri),r.rj.copy(i.rj),pi.normalize(),pi.tangents(i.t,r.t)}getContacts(e,t,i,r,s,a,n){this.contactPointPool=s,this.frictionEquationPool=n,this.result=r,this.frictionResult=a;const o=rp,l=sp,h=tp,d=ip;for(let u=0,f=e.length;u!==f;u++){const g=e[u],p=t[u];let m=null;g.material&&p.material&&(m=i.getContactMaterial(g.material,p.material)||null);const v=g.type&re.KINEMATIC&&p.type&re.STATIC||g.type&re.STATIC&&p.type&re.KINEMATIC||g.type&re.KINEMATIC&&p.type&re.KINEMATIC;for(let x=0;x<g.shapes.length;x++){g.quaternion.mult(g.shapeOrientations[x],o),g.quaternion.vmult(g.shapeOffsets[x],h),h.vadd(g.position,h);const w=g.shapes[x];for(let _=0;_<p.shapes.length;_++){p.quaternion.mult(p.shapeOrientations[_],l),p.quaternion.vmult(p.shapeOffsets[_],d),d.vadd(p.position,d);const M=p.shapes[_];if(!(w.collisionFilterMask&M.collisionFilterGroup&&M.collisionFilterMask&w.collisionFilterGroup)||h.distanceTo(d)>w.boundingSphereRadius+M.boundingSphereRadius)continue;let E=null;w.material&&M.material&&(E=i.getContactMaterial(w.material,M.material)||null),this.currentContactMaterial=E||m||i.defaultContactMaterial;const L=w.type|M.type,y=this[L];if(y){let T=!1;w.type<M.type?T=y.call(this,w,M,h,d,o,l,g,p,w,M,v):T=y.call(this,M,w,d,h,l,o,p,g,w,M,v),T&&v&&(i.shapeOverlapKeeper.set(w.id,M.id),i.bodyOverlapKeeper.set(g.id,p.id))}}}}}sphereSphere(e,t,i,r,s,a,n,o,l,h,d){if(d)return i.distanceSquared(r)<(e.radius+t.radius)**2;const u=this.createContactEquation(n,o,e,t,l,h);r.vsub(i,u.ni),u.ni.normalize(),u.ri.copy(u.ni),u.rj.copy(u.ni),u.ri.scale(e.radius,u.ri),u.rj.scale(-t.radius,u.rj),u.ri.vadd(i,u.ri),u.ri.vsub(n.position,u.ri),u.rj.vadd(r,u.rj),u.rj.vsub(o.position,u.rj),this.result.push(u),this.createFrictionEquationsFromContact(u,this.frictionResult)}spherePlane(e,t,i,r,s,a,n,o,l,h,d){const u=this.createContactEquation(n,o,e,t,l,h);if(u.ni.set(0,0,1),a.vmult(u.ni,u.ni),u.ni.negate(u.ni),u.ni.normalize(),u.ni.scale(e.radius,u.ri),i.vsub(r,kr),u.ni.scale(u.ni.dot(kr),jn),kr.vsub(jn,u.rj),-kr.dot(u.ni)<=e.radius){if(d)return!0;const f=u.ri,g=u.rj;f.vadd(i,f),f.vsub(n.position,f),g.vadd(r,g),g.vsub(o.position,g),this.result.push(u),this.createFrictionEquationsFromContact(u,this.frictionResult)}}boxBox(e,t,i,r,s,a,n,o,l,h,d){return e.convexPolyhedronRepresentation.material=e.material,t.convexPolyhedronRepresentation.material=t.material,e.convexPolyhedronRepresentation.collisionResponse=e.collisionResponse,t.convexPolyhedronRepresentation.collisionResponse=t.collisionResponse,this.convexConvex(e.convexPolyhedronRepresentation,t.convexPolyhedronRepresentation,i,r,s,a,n,o,e,t,d)}sphereBox(e,t,i,r,s,a,n,o,l,h,d){const u=this.v3pool,f=Rp;i.vsub(r,Ur),t.getSideNormals(f,a);const g=e.radius;let p=!1;const m=Pp,v=Fp,x=Ip;let w=null,_=0,M=0,E=0,L=null;for(let P=0,W=f.length;P!==W&&p===!1;P++){const j=Ap;j.copy(f[P]);const O=j.length();j.normalize();const V=Ur.dot(j);if(V<O+g&&V>0){const $=Cp,H=Lp;$.copy(f[(P+1)%3]),H.copy(f[(P+2)%3]);const Q=$.length(),he=H.length();$.normalize(),H.normalize();const Ee=Ur.dot($),J=Ur.dot(H);if(Ee<Q&&Ee>-Q&&J<he&&J>-he){const De=Math.abs(V-O-g);if((L===null||De<L)&&(L=De,M=Ee,E=J,w=O,m.copy(j),v.copy($),x.copy(H),_++,d))return!0}}}if(_){p=!0;const P=this.createContactEquation(n,o,e,t,l,h);m.scale(-g,P.ri),P.ni.copy(m),P.ni.negate(P.ni),m.scale(w,m),v.scale(M,v),m.vadd(v,m),x.scale(E,x),m.vadd(x,P.rj),P.ri.vadd(i,P.ri),P.ri.vsub(n.position,P.ri),P.rj.vadd(r,P.rj),P.rj.vsub(o.position,P.rj),this.result.push(P),this.createFrictionEquationsFromContact(P,this.frictionResult)}let y=u.get();const T=Dp;for(let P=0;P!==2&&!p;P++)for(let W=0;W!==2&&!p;W++)for(let j=0;j!==2&&!p;j++)if(y.set(0,0,0),P?y.vadd(f[0],y):y.vsub(f[0],y),W?y.vadd(f[1],y):y.vsub(f[1],y),j?y.vadd(f[2],y):y.vsub(f[2],y),r.vadd(y,T),T.vsub(i,T),T.lengthSquared()<g*g){if(d)return!0;p=!0;const O=this.createContactEquation(n,o,e,t,l,h);O.ri.copy(T),O.ri.normalize(),O.ni.copy(O.ri),O.ri.scale(g,O.ri),O.rj.copy(y),O.ri.vadd(i,O.ri),O.ri.vsub(n.position,O.ri),O.rj.vadd(r,O.rj),O.rj.vsub(o.position,O.rj),this.result.push(O),this.createFrictionEquationsFromContact(O,this.frictionResult)}u.release(y),y=null;const D=u.get(),F=u.get(),B=u.get(),z=u.get(),R=u.get(),I=f.length;for(let P=0;P!==I&&!p;P++)for(let W=0;W!==I&&!p;W++)if(P%3!==W%3){f[W].cross(f[P],D),D.normalize(),f[P].vadd(f[W],F),B.copy(i),B.vsub(F,B),B.vsub(r,B);const j=B.dot(D);D.scale(j,z);let O=0;for(;O===P%3||O===W%3;)O++;R.copy(i),R.vsub(z,R),R.vsub(F,R),R.vsub(r,R);const V=Math.abs(j),$=R.length();if(V<f[O].length()&&$<g){if(d)return!0;p=!0;const H=this.createContactEquation(n,o,e,t,l,h);F.vadd(z,H.rj),H.rj.copy(H.rj),R.negate(H.ni),H.ni.normalize(),H.ri.copy(H.rj),H.ri.vadd(r,H.ri),H.ri.vsub(i,H.ri),H.ri.normalize(),H.ri.scale(g,H.ri),H.ri.vadd(i,H.ri),H.ri.vsub(n.position,H.ri),H.rj.vadd(r,H.rj),H.rj.vsub(o.position,H.rj),this.result.push(H),this.createFrictionEquationsFromContact(H,this.frictionResult)}}u.release(D,F,B,z,R)}planeBox(e,t,i,r,s,a,n,o,l,h,d){return t.convexPolyhedronRepresentation.material=t.material,t.convexPolyhedronRepresentation.collisionResponse=t.collisionResponse,t.convexPolyhedronRepresentation.id=t.id,this.planeConvex(e,t.convexPolyhedronRepresentation,i,r,s,a,n,o,e,t,d)}convexConvex(e,t,i,r,s,a,n,o,l,h,d,u,f){const g=Zp;if(!(i.distanceTo(r)>e.boundingSphereRadius+t.boundingSphereRadius)&&e.findSeparatingAxis(t,i,s,r,a,g,u,f)){const p=[],m=Jp;e.clipAgainstHull(i,s,t,r,a,g,-100,100,p);let v=0;for(let x=0;x!==p.length;x++){if(d)return!0;const w=this.createContactEquation(n,o,e,t,l,h),_=w.ri,M=w.rj;g.negate(w.ni),p[x].normal.negate(m),m.scale(p[x].depth,m),p[x].point.vadd(m,_),M.copy(p[x].point),_.vsub(i,_),M.vsub(r,M),_.vadd(i,_),_.vsub(n.position,_),M.vadd(r,M),M.vsub(o.position,M),this.result.push(w),v++,this.enableFrictionReduction||this.createFrictionEquationsFromContact(w,this.frictionResult)}this.enableFrictionReduction&&v&&this.createFrictionFromAverage(v)}}sphereConvex(e,t,i,r,s,a,n,o,l,h,d){const u=this.v3pool;i.vsub(r,zp);const f=t.faceNormals,g=t.faces,p=t.vertices,m=e.radius;let v=!1;for(let x=0;x!==p.length;x++){const w=p[x],_=kp;a.vmult(w,_),r.vadd(_,_);const M=Bp;if(_.vsub(i,M),M.lengthSquared()<m*m){if(d)return!0;v=!0;const E=this.createContactEquation(n,o,e,t,l,h);E.ri.copy(M),E.ri.normalize(),E.ni.copy(E.ri),E.ri.scale(m,E.ri),_.vsub(r,E.rj),E.ri.vadd(i,E.ri),E.ri.vsub(n.position,E.ri),E.rj.vadd(r,E.rj),E.rj.vsub(o.position,E.rj),this.result.push(E),this.createFrictionEquationsFromContact(E,this.frictionResult);return}}for(let x=0,w=g.length;x!==w&&v===!1;x++){const _=f[x],M=g[x],E=Up;a.vmult(_,E);const L=Gp;a.vmult(p[M[0]],L),L.vadd(r,L);const y=Hp;E.scale(-m,y),i.vadd(y,y);const T=Vp;y.vsub(L,T);const D=T.dot(E),F=Wp;if(i.vsub(L,F),D<0&&F.dot(E)>0){const B=[];for(let z=0,R=M.length;z!==R;z++){const I=u.get();a.vmult(p[M[z]],I),r.vadd(I,I),B.push(I)}if(Tp(B,E,i)){if(d)return!0;v=!0;const z=this.createContactEquation(n,o,e,t,l,h);E.scale(-m,z.ri),E.negate(z.ni);const R=u.get();E.scale(-D,R);const I=u.get();E.scale(-m,I),i.vsub(r,z.rj),z.rj.vadd(I,z.rj),z.rj.vadd(R,z.rj),z.rj.vadd(r,z.rj),z.rj.vsub(o.position,z.rj),z.ri.vadd(i,z.ri),z.ri.vsub(n.position,z.ri),u.release(R),u.release(I),this.result.push(z),this.createFrictionEquationsFromContact(z,this.frictionResult);for(let P=0,W=B.length;P!==W;P++)u.release(B[P]);return}else for(let z=0;z!==M.length;z++){const R=u.get(),I=u.get();a.vmult(p[M[(z+1)%M.length]],R),a.vmult(p[M[(z+2)%M.length]],I),r.vadd(R,R),r.vadd(I,I);const P=Np;I.vsub(R,P);const W=Op;P.unit(W);const j=u.get(),O=u.get();i.vsub(R,O);const V=O.dot(W);W.scale(V,j),j.vadd(R,j);const $=u.get();if(j.vsub(i,$),V>0&&V*V<P.lengthSquared()&&$.lengthSquared()<m*m){if(d)return!0;const H=this.createContactEquation(n,o,e,t,l,h);j.vsub(r,H.rj),j.vsub(i,H.ni),H.ni.normalize(),H.ni.scale(m,H.ri),H.rj.vadd(r,H.rj),H.rj.vsub(o.position,H.rj),H.ri.vadd(i,H.ri),H.ri.vsub(n.position,H.ri),this.result.push(H),this.createFrictionEquationsFromContact(H,this.frictionResult);for(let Q=0,he=B.length;Q!==he;Q++)u.release(B[Q]);u.release(R),u.release(I),u.release(j),u.release($),u.release(O);return}u.release(R),u.release(I),u.release(j),u.release($),u.release(O)}for(let z=0,R=B.length;z!==R;z++)u.release(B[z])}}}planeConvex(e,t,i,r,s,a,n,o,l,h,d){const u=qp,f=jp;f.set(0,0,1),s.vmult(f,f);let g=0;const p=Xp;for(let m=0;m!==t.vertices.length;m++)if(u.copy(t.vertices[m]),a.vmult(u,u),r.vadd(u,u),u.vsub(i,p),f.dot(p)<=0){if(d)return!0;const v=this.createContactEquation(n,o,e,t,l,h),x=Yp;f.scale(f.dot(p),x),u.vsub(x,x),x.vsub(i,v.ri),v.ni.copy(f),u.vsub(r,v.rj),v.ri.vadd(i,v.ri),v.ri.vsub(n.position,v.ri),v.rj.vadd(r,v.rj),v.rj.vsub(o.position,v.rj),this.result.push(v),g++,this.enableFrictionReduction||this.createFrictionEquationsFromContact(v,this.frictionResult)}this.enableFrictionReduction&&g&&this.createFrictionFromAverage(g)}boxConvex(e,t,i,r,s,a,n,o,l,h,d){return e.convexPolyhedronRepresentation.material=e.material,e.convexPolyhedronRepresentation.collisionResponse=e.collisionResponse,this.convexConvex(e.convexPolyhedronRepresentation,t,i,r,s,a,n,o,e,t,d)}sphereHeightfield(e,t,i,r,s,a,n,o,l,h,d){const u=t.data,f=e.radius,g=t.elementSize,p=lm,m=om;Pe.pointToLocalFrame(r,a,i,m);let v=Math.floor((m.x-f)/g)-1,x=Math.ceil((m.x+f)/g)+1,w=Math.floor((m.y-f)/g)-1,_=Math.ceil((m.y+f)/g)+1;if(x<0||_<0||v>u.length||w>u[0].length)return;v<0&&(v=0),x<0&&(x=0),w<0&&(w=0),_<0&&(_=0),v>=u.length&&(v=u.length-1),x>=u.length&&(x=u.length-1),_>=u[0].length&&(_=u[0].length-1),w>=u[0].length&&(w=u[0].length-1);const M=[];t.getRectMinMax(v,w,x,_,M);const E=M[0],L=M[1];if(m.z-f>L||m.z+f<E)return;const y=this.result;for(let T=v;T<x;T++)for(let D=w;D<_;D++){const F=y.length;let B=!1;if(t.getConvexTrianglePillar(T,D,!1),Pe.pointToWorldFrame(r,a,t.pillarOffset,p),i.distanceTo(p)<t.pillarConvex.boundingSphereRadius+e.boundingSphereRadius&&(B=this.sphereConvex(e,t.pillarConvex,i,p,s,a,n,o,e,t,d)),d&&B||(t.getConvexTrianglePillar(T,D,!0),Pe.pointToWorldFrame(r,a,t.pillarOffset,p),i.distanceTo(p)<t.pillarConvex.boundingSphereRadius+e.boundingSphereRadius&&(B=this.sphereConvex(e,t.pillarConvex,i,p,s,a,n,o,e,t,d)),d&&B))return!0;if(y.length-F>2)return}}boxHeightfield(e,t,i,r,s,a,n,o,l,h,d){return e.convexPolyhedronRepresentation.material=e.material,e.convexPolyhedronRepresentation.collisionResponse=e.collisionResponse,this.convexHeightfield(e.convexPolyhedronRepresentation,t,i,r,s,a,n,o,e,t,d)}convexHeightfield(e,t,i,r,s,a,n,o,l,h,d){const u=t.data,f=t.elementSize,g=e.boundingSphereRadius,p=nm,m=am,v=sm;Pe.pointToLocalFrame(r,a,i,v);let x=Math.floor((v.x-g)/f)-1,w=Math.ceil((v.x+g)/f)+1,_=Math.floor((v.y-g)/f)-1,M=Math.ceil((v.y+g)/f)+1;if(w<0||M<0||x>u.length||_>u[0].length)return;x<0&&(x=0),w<0&&(w=0),_<0&&(_=0),M<0&&(M=0),x>=u.length&&(x=u.length-1),w>=u.length&&(w=u.length-1),M>=u[0].length&&(M=u[0].length-1),_>=u[0].length&&(_=u[0].length-1);const E=[];t.getRectMinMax(x,_,w,M,E);const L=E[0],y=E[1];if(!(v.z-g>y||v.z+g<L))for(let T=x;T<w;T++)for(let D=_;D<M;D++){let F=!1;if(t.getConvexTrianglePillar(T,D,!1),Pe.pointToWorldFrame(r,a,t.pillarOffset,p),i.distanceTo(p)<t.pillarConvex.boundingSphereRadius+e.boundingSphereRadius&&(F=this.convexConvex(e,t.pillarConvex,i,p,s,a,n,o,null,null,d,m,null)),d&&F||(t.getConvexTrianglePillar(T,D,!0),Pe.pointToWorldFrame(r,a,t.pillarOffset,p),i.distanceTo(p)<t.pillarConvex.boundingSphereRadius+e.boundingSphereRadius&&(F=this.convexConvex(e,t.pillarConvex,i,p,s,a,n,o,null,null,d,m,null)),d&&F))return!0}}sphereParticle(e,t,i,r,s,a,n,o,l,h,d){const u=em;if(u.set(0,0,1),r.vsub(i,u),u.lengthSquared()<=e.radius*e.radius){if(d)return!0;const f=this.createContactEquation(o,n,t,e,l,h);u.normalize(),f.rj.copy(u),f.rj.scale(e.radius,f.rj),f.ni.copy(u),f.ni.negate(f.ni),f.ri.set(0,0,0),this.result.push(f),this.createFrictionEquationsFromContact(f,this.frictionResult)}}planeParticle(e,t,i,r,s,a,n,o,l,h,d){const u=Kp;u.set(0,0,1),n.quaternion.vmult(u,u);const f=Qp;if(r.vsub(n.position,f),u.dot(f)<=0){if(d)return!0;const g=this.createContactEquation(o,n,t,e,l,h);g.ni.copy(u),g.ni.negate(g.ni),g.ri.set(0,0,0);const p=$p;u.scale(u.dot(r),p),r.vsub(p,p),g.rj.copy(p),this.result.push(g),this.createFrictionEquationsFromContact(g,this.frictionResult)}}boxParticle(e,t,i,r,s,a,n,o,l,h,d){return e.convexPolyhedronRepresentation.material=e.material,e.convexPolyhedronRepresentation.collisionResponse=e.collisionResponse,this.convexParticle(e.convexPolyhedronRepresentation,t,i,r,s,a,n,o,e,t,d)}convexParticle(e,t,i,r,s,a,n,o,l,h,d){let u=-1;const f=im,g=rm;let p=null;const m=tm;if(m.copy(r),m.vsub(i,m),s.conjugate(Xn),Xn.vmult(m,m),e.pointIsInside(m)){e.worldVerticesNeedsUpdate&&e.computeWorldVertices(i,s),e.worldFaceNormalsNeedsUpdate&&e.computeWorldFaceNormals(s);for(let v=0,x=e.faces.length;v!==x;v++){const w=[e.worldVertices[e.faces[v][0]]],_=e.worldFaceNormals[v];r.vsub(w[0],Yn);const M=-_.dot(Yn);if(p===null||Math.abs(M)<Math.abs(p)){if(d)return!0;p=M,u=v,f.copy(_)}}if(u!==-1){const v=this.createContactEquation(o,n,t,e,l,h);f.scale(p,g),g.vadd(r,g),g.vsub(i,g),v.rj.copy(g),f.negate(v.ni),v.ri.set(0,0,0);const x=v.ri,w=v.rj;x.vadd(r,x),x.vsub(o.position,x),w.vadd(i,w),w.vsub(n.position,w),this.result.push(v),this.createFrictionEquationsFromContact(v,this.frictionResult)}else console.warn("Point found inside convex, but did not find penetrating face!")}}heightfieldCylinder(e,t,i,r,s,a,n,o,l,h,d){return this.convexHeightfield(t,e,r,i,a,s,o,n,l,h,d)}particleCylinder(e,t,i,r,s,a,n,o,l,h,d){return this.convexParticle(t,e,r,i,a,s,o,n,l,h,d)}sphereTrimesh(e,t,i,r,s,a,n,o,l,h,d){const u=dp,f=pp,g=mp,p=fp,m=gp,v=vp,x=bp,w=up,_=cp,M=wp;Pe.pointToLocalFrame(r,a,i,m);const E=e.radius;x.lowerBound.set(m.x-E,m.y-E,m.z-E),x.upperBound.set(m.x+E,m.y+E,m.z+E),t.getTrianglesInAABB(x,M);const L=hp,y=e.radius*e.radius;for(let z=0;z<M.length;z++)for(let R=0;R<3;R++)if(t.getVertex(t.indices[M[z]*3+R],L),L.vsub(m,_),_.lengthSquared()<=y){if(w.copy(L),Pe.pointToWorldFrame(r,a,w,L),L.vsub(i,_),d)return!0;let I=this.createContactEquation(n,o,e,t,l,h);I.ni.copy(_),I.ni.normalize(),I.ri.copy(I.ni),I.ri.scale(e.radius,I.ri),I.ri.vadd(i,I.ri),I.ri.vsub(n.position,I.ri),I.rj.copy(L),I.rj.vsub(o.position,I.rj),this.result.push(I),this.createFrictionEquationsFromContact(I,this.frictionResult)}for(let z=0;z<M.length;z++)for(let R=0;R<3;R++){t.getVertex(t.indices[M[z]*3+R],u),t.getVertex(t.indices[M[z]*3+(R+1)%3],f),f.vsub(u,g),m.vsub(f,v);const I=v.dot(g);m.vsub(u,v);let P=v.dot(g);if(P>0&&I<0&&(m.vsub(u,v),p.copy(g),p.normalize(),P=v.dot(p),p.scale(P,v),v.vadd(u,v),v.distanceTo(m)<e.radius)){if(d)return!0;const W=this.createContactEquation(n,o,e,t,l,h);v.vsub(m,W.ni),W.ni.normalize(),W.ni.scale(e.radius,W.ri),W.ri.vadd(i,W.ri),W.ri.vsub(n.position,W.ri),Pe.pointToWorldFrame(r,a,v,v),v.vsub(o.position,W.rj),Pe.vectorToWorldFrame(a,W.ni,W.ni),Pe.vectorToWorldFrame(a,W.ri,W.ri),this.result.push(W),this.createFrictionEquationsFromContact(W,this.frictionResult)}}const T=xp,D=_p,F=yp,B=lp;for(let z=0,R=M.length;z!==R;z++){t.getTriangleVertices(M[z],T,D,F),t.getNormal(M[z],B),m.vsub(T,v);let I=v.dot(B);if(B.scale(I,v),m.vsub(v,v),I=v.distanceTo(m),We.pointInTriangle(v,T,D,F)&&I<e.radius){if(d)return!0;let P=this.createContactEquation(n,o,e,t,l,h);v.vsub(m,P.ni),P.ni.normalize(),P.ni.scale(e.radius,P.ri),P.ri.vadd(i,P.ri),P.ri.vsub(n.position,P.ri),Pe.pointToWorldFrame(r,a,v,v),v.vsub(o.position,P.rj),Pe.vectorToWorldFrame(a,P.ni,P.ni),Pe.vectorToWorldFrame(a,P.ri,P.ri),this.result.push(P),this.createFrictionEquationsFromContact(P,this.frictionResult)}}M.length=0}planeTrimesh(e,t,i,r,s,a,n,o,l,h,d){const u=new b,f=np;f.set(0,0,1),s.vmult(f,f);for(let g=0;g<t.vertices.length/3;g++){t.getVertex(g,u);const p=new b;p.copy(u),Pe.pointToWorldFrame(r,a,p,u);const m=ap;if(u.vsub(i,m),f.dot(m)<=0){if(d)return!0;const v=this.createContactEquation(n,o,e,t,l,h);v.ni.copy(f);const x=op;f.scale(m.dot(f),x),u.vsub(x,x),v.ri.copy(x),v.ri.vsub(n.position,v.ri),v.rj.copy(u),v.rj.vsub(o.position,v.rj),this.result.push(v),this.createFrictionEquationsFromContact(v,this.frictionResult)}}}}const pi=new b,Vi=new b,Wi=new b,tp=new b,ip=new b,rp=new qe,sp=new qe,np=new b,ap=new b,op=new b,lp=new b,cp=new b;new b;const hp=new b,up=new b,dp=new b,pp=new b,mp=new b,fp=new b,gp=new b,vp=new b,xp=new b,_p=new b,yp=new b,bp=new vt,wp=[],kr=new b,jn=new b,Mp=new b,Sp=new b,Ep=new b;function Tp(c,e,t){let i=null;const r=c.length;for(let s=0;s!==r;s++){const a=c[s],n=Mp;c[(s+1)%r].vsub(a,n);const o=Sp;n.cross(e,o);const l=Ep;t.vsub(a,l);const h=o.dot(l);if(i===null||h>0&&i===!0||h<=0&&i===!1){i===null&&(i=h>0);continue}else return!1}return!0}const Ur=new b,Ap=new b,Cp=new b,Lp=new b,Rp=[new b,new b,new b,new b,new b,new b],Dp=new b,Pp=new b,Fp=new b,Ip=new b,zp=new b,Np=new b,Op=new b,Bp=new b,kp=new b,Up=new b,Gp=new b,Hp=new b,Vp=new b,Wp=new b;new b;new b;const qp=new b,jp=new b,Xp=new b,Yp=new b,Zp=new b,Jp=new b,Kp=new b,Qp=new b,$p=new b,em=new b,Xn=new qe,tm=new b;new b;const im=new b,Yn=new b,rm=new b,sm=new b,nm=new b,am=[0],om=new b,lm=new b;class Zn{constructor(){this.current=[],this.previous=[]}getKey(e,t){if(t<e){const i=t;t=e,e=i}return e<<16|t}set(e,t){const i=this.getKey(e,t),r=this.current;let s=0;for(;i>r[s];)s++;if(i!==r[s]){for(let a=r.length-1;a>=s;a--)r[a+1]=r[a];r[s]=i}}tick(){const e=this.current;this.current=this.previous,this.previous=e,this.current.length=0}getDiff(e,t){const i=this.current,r=this.previous,s=i.length,a=r.length;let n=0;for(let o=0;o<s;o++){let l=!1;const h=i[o];for(;h>r[n];)n++;l=h===r[n],l||Jn(e,h)}n=0;for(let o=0;o<a;o++){let l=!1;const h=r[o];for(;h>i[n];)n++;l=i[n]===h,l||Jn(t,h)}}}function Jn(c,e){c.push((e&4294901760)>>16,e&65535)}const Ls=(c,e)=>c<e?`${c}-${e}`:`${e}-${c}`;class cm{constructor(){this.data={keys:[]}}get(e,t){const i=Ls(e,t);return this.data[i]}set(e,t,i){const r=Ls(e,t);this.get(e,t)||this.data.keys.push(r),this.data[r]=i}delete(e,t){const i=Ls(e,t),r=this.data.keys.indexOf(i);r!==-1&&this.data.keys.splice(r,1),delete this.data[i]}reset(){const e=this.data,t=e.keys;for(;t.length>0;){const i=t.pop();delete e[i]}}}class hm extends xa{constructor(e){e===void 0&&(e={}),super(),this.dt=-1,this.allowSleep=!!e.allowSleep,this.contacts=[],this.frictionEquations=[],this.quatNormalizeSkip=e.quatNormalizeSkip!==void 0?e.quatNormalizeSkip:0,this.quatNormalizeFast=e.quatNormalizeFast!==void 0?e.quatNormalizeFast:!1,this.time=0,this.stepnumber=0,this.default_dt=1/60,this.nextId=0,this.gravity=new b,e.gravity&&this.gravity.copy(e.gravity),e.frictionGravity&&(this.frictionGravity=new b,this.frictionGravity.copy(e.frictionGravity)),this.broadphase=e.broadphase!==void 0?e.broadphase:new _a,this.bodies=[],this.hasActiveBodies=!1,this.solver=e.solver!==void 0?e.solver:new Yd,this.constraints=[],this.narrowphase=new ep(this),this.collisionMatrix=new zn,this.collisionMatrixPrevious=new zn,this.bodyOverlapKeeper=new Zn,this.shapeOverlapKeeper=new Zn,this.contactmaterials=[],this.contactMaterialTable=new cm,this.defaultMaterial=new wi("default"),this.defaultContactMaterial=new bi(this.defaultMaterial,this.defaultMaterial,{friction:.3,restitution:0}),this.doProfiling=!1,this.profile={solve:0,makeContactConstraints:0,broadphase:0,integrate:0,narrowphase:0},this.accumulator=0,this.subsystems=[],this.addBodyEvent={type:"addBody",body:null},this.removeBodyEvent={type:"removeBody",body:null},this.idToBodyMap={},this.broadphase.setWorld(this)}getContactMaterial(e,t){return this.contactMaterialTable.get(e.id,t.id)}collisionMatrixTick(){const e=this.collisionMatrixPrevious;this.collisionMatrixPrevious=this.collisionMatrix,this.collisionMatrix=e,this.collisionMatrix.reset(),this.bodyOverlapKeeper.tick(),this.shapeOverlapKeeper.tick()}addConstraint(e){this.constraints.push(e)}removeConstraint(e){const t=this.constraints.indexOf(e);t!==-1&&this.constraints.splice(t,1)}rayTest(e,t,i){i instanceof Wr?this.raycastClosest(e,t,{skipBackfaces:!0},i):this.raycastAll(e,t,{skipBackfaces:!0},i)}raycastAll(e,t,i,r){return i===void 0&&(i={}),i.mode=We.ALL,i.from=e,i.to=t,i.callback=r,Rs.intersectWorld(this,i)}raycastAny(e,t,i,r){return i===void 0&&(i={}),i.mode=We.ANY,i.from=e,i.to=t,i.result=r,Rs.intersectWorld(this,i)}raycastClosest(e,t,i,r){return i===void 0&&(i={}),i.mode=We.CLOSEST,i.from=e,i.to=t,i.result=r,Rs.intersectWorld(this,i)}addBody(e){this.bodies.includes(e)||(e.index=this.bodies.length,this.bodies.push(e),e.world=this,e.initPosition.copy(e.position),e.initVelocity.copy(e.velocity),e.timeLastSleepy=this.time,e instanceof re&&(e.initAngularVelocity.copy(e.angularVelocity),e.initQuaternion.copy(e.quaternion)),this.collisionMatrix.setNumObjects(this.bodies.length),this.addBodyEvent.body=e,this.idToBodyMap[e.id]=e,this.dispatchEvent(this.addBodyEvent))}removeBody(e){e.world=null;const t=this.bodies.length-1,i=this.bodies,r=i.indexOf(e);if(r!==-1){i.splice(r,1);for(let s=0;s!==i.length;s++)i[s].index=s;this.collisionMatrix.setNumObjects(t),this.removeBodyEvent.body=e,delete this.idToBodyMap[e.id],this.dispatchEvent(this.removeBodyEvent)}}getBodyById(e){return this.idToBodyMap[e]}getShapeById(e){const t=this.bodies;for(let i=0;i<t.length;i++){const r=t[i].shapes;for(let s=0;s<r.length;s++){const a=r[s];if(a.id===e)return a}}return null}addContactMaterial(e){this.contactmaterials.push(e),this.contactMaterialTable.set(e.materials[0].id,e.materials[1].id,e)}removeContactMaterial(e){const t=this.contactmaterials.indexOf(e);t!==-1&&(this.contactmaterials.splice(t,1),this.contactMaterialTable.delete(e.materials[0].id,e.materials[1].id))}fixedStep(e,t){e===void 0&&(e=1/60),t===void 0&&(t=10);const i=Xe.now()/1e3;if(!this.lastCallTime)this.step(e,void 0,t);else{const r=i-this.lastCallTime;this.step(e,r,t)}this.lastCallTime=i}step(e,t,i){if(i===void 0&&(i=10),t===void 0)this.internalStep(e),this.time+=e;else{this.accumulator+=t;const r=Xe.now();let s=0;for(;this.accumulator>=e&&s<i&&(this.internalStep(e),this.accumulator-=e,s++,!(Xe.now()-r>e*1e3)););this.accumulator=this.accumulator%e;const a=this.accumulator/e;for(let n=0;n!==this.bodies.length;n++){const o=this.bodies[n];o.previousPosition.lerp(o.position,a,o.interpolatedPosition),o.previousQuaternion.slerp(o.quaternion,a,o.interpolatedQuaternion),o.previousQuaternion.normalize()}this.time+=t}}internalStep(e){this.dt=e;const t=this.contacts,i=fm,r=gm,s=this.bodies.length,a=this.bodies,n=this.solver,o=this.gravity,l=this.doProfiling,h=this.profile,d=re.DYNAMIC;let u=-1/0;const f=this.constraints,g=mm;o.length();const p=o.x,m=o.y,v=o.z;let x=0;for(l&&(u=Xe.now()),x=0;x!==s;x++){const B=a[x];if(B.type===d){const z=B.force,R=B.mass;z.x+=R*p,z.y+=R*m,z.z+=R*v}}for(let B=0,z=this.subsystems.length;B!==z;B++)this.subsystems[B].update();l&&(u=Xe.now()),i.length=0,r.length=0,this.broadphase.collisionPairs(this,i,r),l&&(h.broadphase=Xe.now()-u);let w=f.length;for(x=0;x!==w;x++){const B=f[x];if(!B.collideConnected)for(let z=i.length-1;z>=0;z-=1)(B.bodyA===i[z]&&B.bodyB===r[z]||B.bodyB===i[z]&&B.bodyA===r[z])&&(i.splice(z,1),r.splice(z,1))}this.collisionMatrixTick(),l&&(u=Xe.now());const _=pm,M=t.length;for(x=0;x!==M;x++)_.push(t[x]);t.length=0;const E=this.frictionEquations.length;for(x=0;x!==E;x++)g.push(this.frictionEquations[x]);for(this.frictionEquations.length=0,this.narrowphase.getContacts(i,r,this,t,_,this.frictionEquations,g),l&&(h.narrowphase=Xe.now()-u),l&&(u=Xe.now()),x=0;x<this.frictionEquations.length;x++)n.addEquation(this.frictionEquations[x]);const L=t.length;for(let B=0;B!==L;B++){const z=t[B],R=z.bi,I=z.bj,P=z.si,W=z.sj;let j;if(R.material&&I.material?j=this.getContactMaterial(R.material,I.material)||this.defaultContactMaterial:j=this.defaultContactMaterial,j.friction,R.material&&I.material&&(R.material.friction>=0&&I.material.friction>=0&&R.material.friction*I.material.friction,R.material.restitution>=0&&I.material.restitution>=0&&(z.restitution=R.material.restitution*I.material.restitution)),n.addEquation(z),R.allowSleep&&R.type===re.DYNAMIC&&R.sleepState===re.SLEEPING&&I.sleepState===re.AWAKE&&I.type!==re.STATIC){const O=I.velocity.lengthSquared()+I.angularVelocity.lengthSquared(),V=I.sleepSpeedLimit**2;O>=V*2&&(R.wakeUpAfterNarrowphase=!0)}if(I.allowSleep&&I.type===re.DYNAMIC&&I.sleepState===re.SLEEPING&&R.sleepState===re.AWAKE&&R.type!==re.STATIC){const O=R.velocity.lengthSquared()+R.angularVelocity.lengthSquared(),V=R.sleepSpeedLimit**2;O>=V*2&&(I.wakeUpAfterNarrowphase=!0)}this.collisionMatrix.set(R,I,!0),this.collisionMatrixPrevious.get(R,I)||(rr.body=I,rr.contact=z,R.dispatchEvent(rr),rr.body=R,I.dispatchEvent(rr)),this.bodyOverlapKeeper.set(R.id,I.id),this.shapeOverlapKeeper.set(P.id,W.id)}for(this.emitContactEvents(),l&&(h.makeContactConstraints=Xe.now()-u,u=Xe.now()),x=0;x!==s;x++){const B=a[x];B.wakeUpAfterNarrowphase&&(B.wakeUp(),B.wakeUpAfterNarrowphase=!1)}for(w=f.length,x=0;x!==w;x++){const B=f[x];B.update();for(let z=0,R=B.equations.length;z!==R;z++){const I=B.equations[z];n.addEquation(I)}}n.solve(e,this),l&&(h.solve=Xe.now()-u),n.removeAllEquations();const y=Math.pow;for(x=0;x!==s;x++){const B=a[x];if(B.type&d){const z=y(1-B.linearDamping,e),R=B.velocity;R.scale(z,R);const I=B.angularVelocity;if(I){const P=y(1-B.angularDamping,e);I.scale(P,I)}}}this.dispatchEvent(dm),l&&(u=Xe.now());const T=this.stepnumber%(this.quatNormalizeSkip+1)===0,D=this.quatNormalizeFast;for(x=0;x!==s;x++)a[x].integrate(e,T,D);this.clearForces(),this.broadphase.dirty=!0,l&&(h.integrate=Xe.now()-u),this.stepnumber+=1,this.dispatchEvent(um);let F=!0;if(this.allowSleep)for(F=!1,x=0;x!==s;x++){const B=a[x];B.sleepTick(this.time),B.sleepState!==re.SLEEPING&&(F=!0)}this.hasActiveBodies=F}emitContactEvents(){const e=this.hasAnyEventListener("beginContact"),t=this.hasAnyEventListener("endContact");if((e||t)&&this.bodyOverlapKeeper.getDiff(Xt,Yt),e){for(let s=0,a=Xt.length;s<a;s+=2)sr.bodyA=this.getBodyById(Xt[s]),sr.bodyB=this.getBodyById(Xt[s+1]),this.dispatchEvent(sr);sr.bodyA=sr.bodyB=null}if(t){for(let s=0,a=Yt.length;s<a;s+=2)nr.bodyA=this.getBodyById(Yt[s]),nr.bodyB=this.getBodyById(Yt[s+1]),this.dispatchEvent(nr);nr.bodyA=nr.bodyB=null}Xt.length=Yt.length=0;const i=this.hasAnyEventListener("beginShapeContact"),r=this.hasAnyEventListener("endShapeContact");if((i||r)&&this.shapeOverlapKeeper.getDiff(Xt,Yt),i){for(let s=0,a=Xt.length;s<a;s+=2){const n=this.getShapeById(Xt[s]),o=this.getShapeById(Xt[s+1]);Zt.shapeA=n,Zt.shapeB=o,n&&(Zt.bodyA=n.body),o&&(Zt.bodyB=o.body),this.dispatchEvent(Zt)}Zt.bodyA=Zt.bodyB=Zt.shapeA=Zt.shapeB=null}if(r){for(let s=0,a=Yt.length;s<a;s+=2){const n=this.getShapeById(Yt[s]),o=this.getShapeById(Yt[s+1]);Jt.shapeA=n,Jt.shapeB=o,n&&(Jt.bodyA=n.body),o&&(Jt.bodyB=o.body),this.dispatchEvent(Jt)}Jt.bodyA=Jt.bodyB=Jt.shapeA=Jt.shapeB=null}}clearForces(){const e=this.bodies,t=e.length;for(let i=0;i!==t;i++){const r=e[i];r.force,r.torque,r.force.set(0,0,0),r.torque.set(0,0,0)}}}new vt;const Rs=new We,Xe=globalThis.performance||{};if(!Xe.now){let c=Date.now();Xe.timing&&Xe.timing.navigationStart&&(c=Xe.timing.navigationStart),Xe.now=()=>Date.now()-c}new b;const um={type:"postStep"},dm={type:"preStep"},rr={type:re.COLLIDE_EVENT_NAME,body:null,contact:null},pm=[],mm=[],fm=[],gm=[],Xt=[],Yt=[],sr={type:"beginContact",bodyA:null,bodyB:null},nr={type:"endContact",bodyA:null,bodyB:null},Zt={type:"beginShapeContact",bodyA:null,bodyB:null,shapeA:null,shapeB:null},Jt={type:"endShapeContact",bodyA:null,bodyB:null,shapeA:null,shapeB:null};class Kn{constructor(e){typeof e=="object"&&(e=e.notation),this.set=[],this.setkeys=[],this.setid=0,this.groups=[],this.totalDice=0,this.op="",this.constant=null,this.result=[],this.error=!1,this.boost=1,this.notation="",this.vectors=[],(!e||e=="0")&&(this.error=!0),this.parseNotation(e)}parseNotation(e){if(e){let u=e.split("!").length-1||0;u>0&&(this.boost=Math.min(Math.max(u,0),3)*4),e=e.split("!").join(""),e=e.split(" ").join("");let f=e.split("(").length-1,g=e.split(")").length-1;f!=g&&(this.error=!0)}const t=this.notation.length>0?"+":"";this.notation+=t+e;let i=e.split("@"),r=i[0],s=new RegExp(/(\+|\-|\*|\/|\%|\^|){0,1}()(\d*)([a-z]+\d+|[a-z]+|)(?:\{([a-z]+)(.*?|)\}|)()/,"i"),a=new RegExp(/(\b)*(\-\d+|\d+)(\b)*/,"gi"),n,o=0,l=30,h=0,d=0;for(;!this.error&&r.length>0&&(n=s.exec(r))!==null&&o<l;){o++,r=r.substring(n[0].length);let u=n[1],f=n[2]&&n[2].length>0,g=n[3],p=n[4],m=n[5]||"",v=n[6]||"",x=n[7]&&n[7].length>0,w=!0;f&&(h+=n[2].length),v=v.split(","),(!v||v.length<1)&&(v=""),v.shift(),o==1&&r.length==0&&!p&&u&&g?(p="d20",this.op=u,this.constant=parseInt(g),g=1):o>1&&r.length==0&&!p&&(this.op=u,this.constant=parseInt(g),w=!1),w&&this.addSet(g,p,d,h,m,v,u),x&&(h-=n[7].length,d+=n[7].length)}!this.error&&i[1]&&(n=i[1].match(a))!==null&&this.result.push(...n)}stringify(e=!0){let t="";if(this.set.length<1)return t;for(let i=0;i<this.set.length;i++){let r=this.set[i];t+=i>0&&r.op?r.op:"",t+=r.num+r.type,r.func&&(t+="{",t+=r.func?r.func:"",t+=r.args?","+(Array.isArray(r.args)?r.args.join(","):r.args):"",t+="}")}return t+=this.constant?this.op+""+Math.abs(this.constant):"",e&&this.result&&this.result.length>0&&(t+="@"+this.result.join(",")),this.boost>1&&(t+="!".repeat(this.boost/4)),t}addSet(e,t,i=0,r=0,s="",a="",n="+"){e=Math.abs(parseInt(e||1));let o=n+""+t+i+r+s+a,l=this.setkeys[o]!=null,h={};l&&(h=this.set[this.setkeys[o]-1]),e>0&&(h.num=l?e+h.num:e,h.type=t,h.sid=this.setid,h.gid=i,h.glvl=r,s&&(h.func=s),a&&(h.args=a),n&&(h.op=n),l?this.set[this.setkeys[o]-1]=h:this.setkeys[o]=this.set.push(h)),l||++this.setid}static mergeNotation(e,t){return{...e,constant:e.constant+t.constant,notation:e.notation+"+"+t.notation,set:[...e.set,...t.set],totalDice:e.vectors.length+t.vectors.length,vectors:[...e.vectors,...t.vectors]}}}const Ds={d2:{name:"d2",labels:["1","2"],values:[1,2],inertia:8,mass:400,scale:.9,system:"dweird"},dc:{type:"d2",name:"Coin",labels:["textures/silvercoin/tail.png","textures/silvercoin/heads.png"],setBumpMaps:["textures/silvercoin/tail_bump.png","textures/silvercoin/heads_bump.png"],values:[0,1],inertia:8,mass:400,scale:.9,colorset:"coin_silver"},d1:{name:"One-sided Dice",type:"d6",labels:["1"],values:[1,1],scale:.9,system:"dweird"},d3:{name:"Three-Sided Dice",type:"d6",labels:["1","2","3"],values:[1,3],scale:.9,system:"dweird"},df:{name:"Fudge Dice",type:"d6",labels:["-","0","+"],values:[-1,1],scale:.9,system:"dweird"},d4:{name:"Four-Sided Dice",labels:["1","2","3","4"],values:[1,4],inertia:5,scale:1.2},d6:{name:"Six-Sided Dice (Numbers)",labels:["1","2","3","4","5","6"],values:[1,6],scale:.9},dpip:{name:"Six-Sided Dice (Pips)",type:"d6",labels:[`   
 ⬤ 
   `,`⬤  
   
  ⬤`,`⬤  
 ⬤ 
  ⬤`,`⬤ ⬤
   
⬤ ⬤`,`⬤ ⬤
 ⬤ 
⬤ ⬤`,`⬤ ⬤
⬤ ⬤
⬤ ⬤`],values:[1,6],scale:.9,font:"monospace"},dsex:{name:"Sex-Sided Emoji Dice",type:"d6",labels:["🍆","🍑","👌","💦","🙏","💥"],values:[1,6],scale:.9,display:"labels",system:"dweird"},dpoker:{name:"Poker Dice (9-Ace)",type:"d6",labels:["A","9","10","J","Q","K"],values:[1,6],scale:.9,display:"labels",system:"dweird",font:"Times New Roman"},dspanpoker:{name:"Spanish Poker Dice (7-Ace)",type:"d8",labels:["A","7","8","9","10","J","Q","K"],values:[1,8],display:"labels",system:"dweird",font:"Times New Roman"},disotope:{name:"Radioactive Twelve-Sided Dice",type:"d12",labels:["","","","","","","","","","","","☢️"],values:[0,0,0,0,0,0,0,0,0,0,0,1],mass:350,inertia:8,scale:.9,system:"dweird"},dsuit:{name:"Four-Suited Dice",type:"d4",labels:["♠️","♥️","♦️","♣️"],values:[1,4],inertia:5,scale:1.2,display:"labels",system:"dweird"},d8:{name:"Eight-Sided Dice",labels:["1","2","3","4","5","6","7","8"],values:[1,8]},d10:{name:"Ten-Sided Dice (Single Digit)",labels:["1","2","3","4","5","6","7","8","9","0"],values:[1,10],mass:350,inertia:9,scale:.9},d100:{name:"Ten-Sided Dice (Tens Digit)",type:"d10",labels:["10","20","30","40","50","60","70","80","90","00"],values:[10,100,10],mass:350,inertia:9,scale:.9},d12:{name:"Twelve-Sided Dice",labels:["1","2","3","4","5","6","7","8","9","10","11","12"],values:[1,12],mass:350,inertia:8,scale:.9},d20:{name:"Twenty-Sided Dice",labels:["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"],values:[1,20],mass:400,inertia:6},dabi:{name:"Star Wars RPG: Ability Dice",type:"d8",labels:["s","a",`s
a`,`s
s`,"a","s",`a
a`,""],values:[1,8],font:"SWRPG-Symbol-Regular",color:"#00FF00",colorset:"swrpg_abi",display:"labels",system:"swrpg"},ddif:{name:"Star Wars RPG: Difficulty Dice",type:"d8",labels:["t","f",`f
t`,"t","",`t
t`,`f
f`,"t"],values:[1,8],font:"SWRPG-Symbol-Regular",color:"#8000FC",colorset:"swrpg_dif",display:"labels",system:"swrpg"},dpro:{name:"Star Wars RPG: Proficiency Dice",type:"d12",labels:[`a
a`,"a",`a
a`,"x","s",`s
a`,"s",`s
a`,`s
s`,`s
a`,`s
s`,""],values:[1,12],mass:350,inertia:8,scale:.9,font:"SWRPG-Symbol-Regular",color:"#FFFF00",colorset:"swrpg_pro",display:"labels",system:"swrpg"},dcha:{name:"Star Wars RPG: Challenge Dice",type:"d12",labels:[`t
t`,"t",`t
t`,"t",`t
f`,"f",`t
f`,"f",`f
f`,"y",`f
f`,""],values:[1,12],mass:350,inertia:8,scale:.9,font:"SWRPG-Symbol-Regular",color:"#FF0000",colorset:"swrpg_cha",display:"labels",system:"swrpg"},dfor:{name:"Star Wars RPG: Force Dice",type:"d12",labels:["z",`Z
Z`,"z",`Z
Z`,"z",`Z
Z`,"z","Z","z","Z","z",`z
z`],values:[1,12],mass:350,inertia:8,scale:.9,font:"SWRPG-Symbol-Regular",color:"#FFFFFF",colorset:"swrpg_for",display:"labels",system:"swrpg"},dboo:{name:"Star Wars RPG: Boost Dice",type:"d6",labels:[`s  
  a`,`a  
  a`,"s","a","",""],values:[1,6],scale:.9,font:"SWRPG-Symbol-Regular",color:"#00FFFF",colorset:"swrpg_boo",display:"labels",system:"swrpg"},dset:{name:"Star Wars RPG: Setback Dice",type:"d6",labels:["","t","f"],values:[1,3],scale:.9,font:"SWRPG-Symbol-Regular",color:"#111111",colorset:"swrpg_set",display:"labels",system:"swrpg"},swar:{name:"Star Wars Armada: Red Attack Dice",type:"d8",labels:["F","F",`F
F`,"E","E","G","",""],values:[1,8],font:"Armada-Symbol-Regular",color:"#FF0000",colorset:"swa_red",display:"labels",system:"swarmada"},swab:{name:"Star Wars Armada: Blue Attack Dice",type:"d8",labels:["F","F","F","F","E","E","G","G"],values:[1,8],font:"Armada-Symbol-Regular",color:"#0000FF",colorset:"swa_blue",display:"labels",system:"swarmada"},swak:{name:"Star Wars Armada: Black Attack Dice",type:"d8",labels:["F","F","F","F",`F
E`,`F
E`,"",""],values:[1,8],font:"Armada-Symbol-Regular",color:"#111111",colorset:"swa_black",display:"labels",system:"swarmada"},xwatk:{name:"Star Wars X-Wing: Red Attack Dice",type:"d8",labels:["c","d","d","d","f","f","",""],values:[1,8],font:"XWing-Symbol-Regular",color:"#FF0000",colorset:"xwing_red",display:"labels",system:"xwing"},xwdef:{name:"Star Wars X-Wing: Green Defense Dice",type:"d8",labels:["e","e","e","f","f","","",""],values:[1,8],font:"XWing-Symbol-Regular",color:"#00FF00",colorset:"xwing_green",display:"labels",system:"xwing"},swlar:{name:"Star Wars Legion: Red Attack Dice",type:"d8",labels:["h","h","h","h","h","c","o",""],values:[1,8],font:"Legion-Symbol-Regular",color:"#FF0000",colorset:"swl_atkred",display:"labels",system:"legion"},swlab:{name:"Star Wars Legion: Black Attack Dice",type:"d8",labels:["h","h","h","","","c","o",""],values:[1,8],font:"Legion-Symbol-Regular",color:"#111111",colorset:"swl_atkblack",display:"labels",system:"legion"},swlaw:{name:"Star Wars Legion: White Attack Dice",type:"d8",labels:["h","","","","","c","o",""],values:[1,8],font:"Legion-Symbol-Regular",color:"#FFFFFF",colorset:"swl_atkwhite",display:"labels",system:"legion"},swldr:{name:"Star Wars Legion: Red Defense Dice",type:"d6",labels:["s","s","s","d","",""],values:[1,6],scale:.9,font:"Legion-Symbol-Regular",color:"#FF0000",colorset:"swl_defred",display:"labels",system:"legion"},swldw:{name:"Star Wars Legion: White Defense Dice",type:"d6",labels:["s","","","d","",""],values:[1,6],scale:.9,font:"Legion-Symbol-Regular",color:"#FFFFFF",colorset:"swl_defwhite",display:"labels",system:"legion"}},bt={d4:{vertices:[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],faces:[[1,0,2,1],[0,1,3,2],[0,3,2,3],[1,2,3,4]]},d6:{vertices:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],faces:[[0,3,2,1,1],[1,2,6,5,2],[0,1,5,4,3],[3,7,6,2,4],[0,4,7,3,5],[4,5,6,7,6]]},d8:{vertices:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],faces:[[0,2,4,1],[0,4,3,2],[0,3,5,3],[0,5,2,4],[1,3,4,5],[1,4,2,6],[1,2,5,7],[1,5,3,8]]},d10:{vertices:[[1,0,-.105],[.809,.5877,.105],[.309,.951,-.105],[-.309,.951,.105],[-.809,.5877,-.105],[-1,0,.105],[-.809,-.587,-.105],[-.309,-.951,.105],[.309,-.951,-.105],[.809,-.5877,.105],[0,0,-1],[0,0,1]],faces:[[5,6,7,11,0],[4,3,2,10,1],[1,2,3,11,2],[0,9,8,10,3],[7,8,9,11,4],[8,7,6,10,5],[9,0,1,11,6],[2,1,0,10,7],[3,4,5,11,8],[6,5,4,10,9]]},d12:{vertices:[[0,.618,1.618],[0,.618,-1.618],[0,-.618,1.618],[0,-.618,-1.618],[1.618,0,.618],[1.618,0,-.618],[-1.618,0,.618],[-1.618,0,-.618],[.618,1.618,0],[.618,-1.618,0],[-.618,1.618,0],[-.618,-1.618,0],[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1]],faces:[[2,14,4,12,0,1],[15,9,11,19,3,2],[16,10,17,7,6,3],[6,7,19,11,18,4],[6,18,2,0,16,5],[18,11,9,14,2,6],[1,17,10,8,13,7],[1,13,5,15,3,8],[13,8,12,4,5,9],[5,4,14,9,15,10],[0,12,8,10,16,11],[3,19,7,17,1,12]]},d20:{vertices:[[-1,1.618,0],[1,1.618,0],[-1,-1.618,0],[1,-1.618,0],[0,-1,1.618],[0,1,1.618],[0,-1,-1.618],[0,1,-1.618],[1.618,0,-1],[1.618,0,1],[-1.618,0,-1],[-1.618,0,1]],faces:[[0,11,5,1],[0,5,1,2],[0,1,7,3],[0,7,10,4],[0,10,11,5],[1,5,9,6],[5,11,4,7],[11,10,2,8],[10,7,6,9],[7,1,8,10],[3,9,4,11],[3,4,2,12],[3,2,6,13],[3,6,8,14],[3,8,9,15],[4,9,5,16],[2,4,11,17],[6,2,10,18],[8,6,7,19],[9,8,1,20]]}},vm={name:"",scale:1,font:"Arial",color:"",labels:[],valueMap:[],values:[],normals:[],mass:300,inertia:13,geometry:null,display:"values",system:"d20"};class xm{constructor(e){if(!Ds.hasOwnProperty(e))return console.error("dice type unavailable");Object.assign(this,vm,Ds[e]),this.shape=Ds[e].type||e,this.type=e,this.setLabels(this.labels),this.setValues(this.values[0],this.values[1],this.values[2]),this.setValueMap(this.valueMap),this.bumpMaps&&this.setBumpMaps(this.bumpMaps)}setValues(e=1,t=20,i=1){this.values=this.range(e,t,i)}setValueMap(e){for(let t=0;t<this.values.length;t++){let i=this.values[t];e[i]!=null&&(this.valueMap[i]=e[i])}}registerFaces(e,t="labels"){let i;if(t=="labels"?i=this.labels:i=this.normals,i.unshift(""),["d2","d10"].includes(this.shape)||i.unshift(""),this.shape=="d4"){let r=e[0],s=e[1],a=e[2],n=e[3];this.labels=[[[],[0,0,0],[s,n,a],[r,a,n],[s,r,n],[r,s,a]],[[],[0,0,0],[s,a,n],[a,r,n],[s,n,r],[a,s,r]],[[],[0,0,0],[n,a,s],[a,n,r],[n,s,r],[a,r,s]],[[],[0,0,0],[n,s,a],[r,n,a],[n,r,s],[r,a,s]]]}else Array.prototype.push.apply(i,e)}setLabels(e){this.loadTextures(e,this.registerFaces.bind(this),"labels")}setBumpMaps(e){this.loadTextures(e,this.registerFaces.bind(this),"bump")}loadTextures(e,t,i){let r=0,s=e.length,a=/\.(PNG|JPG|GIF|WEBP)$/i,n=Array(e.length),o=!1;for(let l=0;l<s;l++){if(e[l]==""||!e[l].match(a)){n[l]=e[l],++r;continue}o=!0,n[l]=new Image,n[l].onload=function(){++r>=s&&t(n,i)},n[l].src=e[l]}o||t(n,i)}range(e,t,i=1){for(var r=[e],s=e;s<t;)r.push(s+=i||1);return r}}const _m={none:{name:"Plastic"},perfectmetal:{name:"Perfect Metal",color:14540253,roughness:0,metalness:1,envMapIntensity:1},metal:{name:"Metal",color:14540253,roughness:.5,metalness:.6,envMapIntensity:1},wood:{name:"Wood",color:14540253,roughness:.9,metalness:0,envMapIntensity:1},glass:{name:"Glass",color:14540253,roughness:.1,metalness:0,envMapIntensity:1}},ym={baseScale:100,bumpMapping:!0},or=class{constructor(c){this.geometries={},this.materials_cache={},this.cache_hits=0,this.cache_misses=0,this.label_color="",this.dice_color="",this.edge_color="",this.label_outline="",this.dice_texture="",this.dice_material="",this.material_options={specular:16777215,color:11908533,shininess:5,flatShading:!0},Object.assign(this,ym,c)}updateConfig(c={}){Object.assign(this,c),c.scale&&this.scaleGeometry()}setBumpMapping(c){this.bumpMapping=c,this.materials_cache={}}create(c){let e=this.get(c);if(!e)return null;let t=this.geometries[c];if(t||(t=this.createGeometry(e.shape,e.scale*this.baseScale),this.geometries[c]=t),!t)return null;this.setMaterialInfo();let i=new Nt(t,this.createMaterials(e,this.baseScale/2,1));switch(i.result=[],i.shape=e.shape,i.rerolls=0,i.resultReason="natural",i.mass=e.mass,i.getFaceValue=function(){let r=this.resultReason,s=new k(0,0,this.shape=="d4"?-1:1),a,n=Math.PI*2,o=this.geometry.getAttribute("normal").array;for(let g=0,p=this.geometry.groups.length;g<p;++g){let m=this.geometry.groups[g];if(m.materialIndex==0)continue;let v=g*9,x=new k(o[v],o[v+1],o[v+2]).clone().applyQuaternion(this.body.quaternion).angleTo(s);x<n&&(n=x,a=m)}let l=a.materialIndex-1,h=2;const d=or.dice[this.notation.type];if(this.shape=="d4"){let g=l-1==0?5:l;return{value:l,label:d.labels[l-1][g][0],reason:r}}["d10","d2"].includes(this.shape)&&(l+=1,h-=1);let u=d.values[(l-1)%d.values.length],f=d.labels[(l-1)%(d.labels.length-2)+h];return{value:u,label:f,reason:r}},i.storeRolledValue=function(r){this.resultReason=r||this.resultReason,this.result.push(this.getFaceValue())},i.getLastValue=function(){return!this.result||this.result.length<1?{value:void 0,label:"",reason:""}:this.result[this.result.length-1]},i.ignoreLastValue=function(r){let s=this.getLastValue();s.value!==void 0&&(s.ignore=r,this.setLastValue(s))},i.setLastValue=function(r){if(!(!this.result||this.result.length<1)&&!(!r||r.length<1))return this.result[this.result.length-1]=r},e.color&&(i.material[0].color=new Ce(e.color),i.material[0].emissive=new Ce(e.color),i.material[0].emissiveIntensity=1,i.material[0].needsUpdate=!0),e.values.length){case 1:return this.fixmaterials(i,1);case 2:return this.fixmaterials(i,2);case 3:return this.fixmaterials(i,3);default:return i}}get(c){let e;return or.dice.hasOwnProperty(c)?e=or.dice[c]:(e=new xm(c),or.dice[c]=e),e}getGeometry(c){return this.geometries[c]}scaleGeometry(){}createMaterials(c,e,t,i=!0,r=0){let s=[],a=c.labels;c.shape=="d4"&&(a=c.labels[r],e=this.baseScale/2,t=this.baseScale*2);for(var n=0;n<a.length;++n){var o;this.dice_material!="none"?(o=new ku(_m[this.dice_material]),o.envMapIntensity=0):o=new Uu(this.material_options);let l;if(n==0){let h={name:"none"};this.dice_texture_rand.composite!="source-over"&&(h=this.dice_texture_rand),l=this.createTextMaterial(c,a,n,e,t,h,this.label_color_rand,this.label_outline_rand,this.edge_color_rand,i),o.map=l.composite}else if(l=this.createTextMaterial(c,a,n,e,t,this.dice_texture_rand,this.label_color_rand,this.label_outline_rand,this.dice_color_rand,i),o.map=l.composite,this.bumpMapping){{let h=.75;e>35&&(h=1),e>40&&(h=2.5),e>45&&(h=4),o.bumpScale=h}l.bump&&(o.bumpMap=l.bump),c.shape!="d4"&&c.normals[n]&&(o.bumpMap=new gt(c.normals[n]),o.bumpScale=4,o.bumpMap.needsUpdate=!0)}o.opacity=1,o.transparent=!0,o.depthTest=!1,o.needUpdate=!0,s.push(o)}return s}createTextMaterial(c,e,t,i,r,s,a,n,o,l){if(e[t]===void 0)return null;s=s||this.dice_texture_rand,a=a||this.label_color_rand,n=n||this.label_outline_rand,o=o||this.dice_color_rand,l=l??!0;let h=e[t],d=!1,u=h;h instanceof HTMLImageElement?u=h.src:h instanceof Array&&h.forEach(L=>{u+=L.src});let f=c.type+u+t+s.name+a+n+o;if(c.shape=="d4"&&(f=c.type+u+s.name+a+n+o),l&&this.materials_cache[f]!=null)return this.cache_hits++,this.materials_cache[f];let g=document.createElement("canvas"),p=g.getContext("2d",{alpha:!0});p.globalAlpha=0,p.clearRect(0,0,g.width,g.height);let m=document.createElement("canvas"),v=m.getContext("2d",{alpha:!0});v.globalAlpha=0,v.clearRect(0,0,m.width,m.height);let x;if(c.shape=="d4"?x=this.calc_texture_size(i+r)*4:x=this.calc_texture_size(i+i*2*r)*4,g.width=g.height=x,m.width=m.height=x,p.fillStyle=o,p.fillRect(0,0,g.width,g.height),v.fillStyle="#FFFFFF",v.fillRect(0,0,m.width,m.height),s.texture&&s.name!=""&&s.name!="none"?(p.globalCompositeOperation=s.composite||"source-over",p.drawImage(s.texture,0,0,g.width,g.height),p.globalCompositeOperation="source-over",s.bump&&(v.globalCompositeOperation="source-over",v.drawImage(s.bump,0,0,g.width,g.height))):p.globalCompositeOperation="source-over",p.globalCompositeOperation="source-over",p.textAlign="center",p.textBaseline="middle",v.textAlign="center",v.textBaseline="middle",c.shape!="d4"){let L={d8:{even:-7.5,odd:-127.5},d10:{all:-6},d12:{all:5},d20:{all:-7.5}}[c.shape];if(L){let y;if(L.hasOwnProperty("all")?y=L.all:t>0&&t%2!=0?y=L.odd:y=L.even,y&&y!=0){var w=g.width/2,_=g.height/2;p.translate(w,_),p.rotate(y*(Math.PI/180)),p.translate(-w,-_),v.translate(w,_),v.rotate(y*(Math.PI/180)),v.translate(-w,-_)}}if(h instanceof HTMLImageElement)d=!0,p.drawImage(h,0,0,h.width,h.height,0,0,g.width,g.height);else{let y=x/(1+2*r),T=g.height/2+10,D=g.width/2;c.shape=="d10"?(y=y*.75,T=T*1.15-10):c.shape=="d20"&&(D=D*.98),p.font=y+"pt "+c.font,v.font=y+"pt "+c.font;let F=p.measureText("M").width*1.4,B=h.split(`
`);B.length>1&&(y=y/B.length,p.font=y+"pt "+c.font,v.font=y+"pt "+c.font,F=p.measureText("M").width*1.2,T-=F*B.length/2);for(let z=0,R=B.length;z<R;z++){let I=B[z].trim();n!="none"&&n!=o&&(p.strokeStyle=n,p.lineWidth=5,p.strokeText(B[z],D,T),v.strokeStyle="#000000",v.lineWidth=5,v.strokeText(B[z],D,T),(I=="6"||I=="9")&&(p.strokeText("  .",D,T),v.strokeText("  .",D,T))),p.fillStyle=a,p.fillText(B[z],D,T),v.fillStyle="#000000",v.fillText(B[z],D,T),(I=="6"||I=="9")&&(p.fillText("  .",D,T),v.fillText("  .",D,T)),T+=F*1.5}}}else{var w=g.width/2,_=g.height/2;p.font=x/128*24+"pt "+c.font,v.font=x/128*24+"pt "+c.font;for(let T=0;T<h.length;T++){if(h[T]instanceof HTMLImageElement){let D=h[T].width/g.width;p.drawImage(h[T],0,0,h[T].width,h[T].height,100/D,25/D,60/D,60/D)}else n!="none"&&n!=o&&(p.strokeStyle=n,p.lineWidth=5,p.strokeText(h[T],w,_-x*.3),v.strokeStyle="#000000",v.lineWidth=5,v.strokeText(h[T],w,_-x*.3)),p.fillStyle=a,p.fillText(h[T],w,_-x*.3),v.fillStyle="#000000",v.fillText(h[T],w,_-x*.3);p.translate(w,_),p.rotate(Math.PI*2/3),p.translate(-w,-_),v.translate(w,_),v.rotate(Math.PI*2/3),v.translate(-w,-_)}}var M=new Cn(g),E;return d?E=null:E=new Cn(m),l&&(this.cache_misses++,this.materials_cache[f]={composite:M,bump:E}),{composite:M,bump:E}}applyColorSet(c){var e;this.colordata=c,this.label_color=c.foreground,this.dice_color=c.background,this.label_outline=c.outline,this.dice_texture=c.texture,this.dice_material=((e=c==null?void 0:c.texture)==null?void 0:e.material)||"none",this.edge_color=c.hasOwnProperty("edge")?c.edge:c.background}setMaterialInfo(c=""){let e=this.colordata,t=this.dice_texture,i=this.dice_material;if(this.dice_color_rand="",this.label_color_rand="",this.label_outline_rand="",this.dice_texture_rand="",this.dice_material_rand="",this.edge_color_rand="",Array.isArray(this.dice_color)){var r=Math.floor(Math.random()*this.dice_color.length);Array.isArray(this.label_color)&&this.label_color.length==this.dice_color.length&&(this.label_color_rand=this.label_color[r],Array.isArray(this.label_outline)&&this.label_outline.length==this.label_color.length&&(this.label_outline_rand=this.label_outline[r])),Array.isArray(this.dice_texture)&&this.dice_texture.length==this.dice_color.length&&(this.dice_texture_rand=this.dice_texture[r],this.dice_material_rand=this.dice_texture_rand.material),Array.isArray(this.edge_color)&&this.edge_color.length==this.dice_color.length&&(this.edge_color_rand=this.edge_color[r]),this.dice_color_rand=this.dice_color[r]}else this.dice_color_rand=this.dice_color;if(this.edge_color_rand=="")if(Array.isArray(this.edge_color)){var r=Math.floor(Math.random()*this.edge_color.length);this.edge_color_rand=this.edge_color[r]}else this.edge_color_rand=this.edge_color;if(this.label_color_rand==""&&Array.isArray(this.label_color)){var r=this.label_color[Math.floor(Math.random()*this.label_color.length)];Array.isArray(this.label_outline)&&this.label_outline.length==this.label_color.length&&(this.label_outline_rand=this.label_outline[r]),this.label_color_rand=this.label_color[r]}else this.label_color_rand==""&&(this.label_color_rand=this.label_color);if(this.label_outline_rand==""&&Array.isArray(this.label_outline)){var r=this.label_outline[Math.floor(Math.random()*this.label_outline.length)];this.label_outline_rand=this.label_outline[r]}else this.label_outline_rand==""&&(this.label_outline_rand=this.label_outline);this.dice_texture_rand==""&&Array.isArray(this.dice_texture)?(this.dice_texture_rand=this.dice_texture[Math.floor(Math.random()*this.dice_texture.length)],this.dice_material_rand=this.dice_texture_rand.material||this.dice_material):this.dice_texture_rand==""&&(this.dice_texture_rand=this.dice_texture,this.dice_material_rand=this.dice_texture_rand.material||this.dice_material),this.dice_material_rand==""&&Array.isArray(this.dice_material)?this.dice_material_rand=this.dice_material[Math.floor(Math.random()*this.dice_material.length)]:this.dice_material_rand==""&&(this.dice_material_rand=this.dice_material),this.colordata&&this.colordata.id!=e.id&&this.applyColorSet(e,t,i)}calc_texture_size(c){return Math.pow(2,Math.floor(Math.log(c)/Math.log(2)))}createGeometry(c,e,t=!1){const i=t?"create_shape":"create_geom";switch(c){case"d2":var r=new ks(1*e,1*e,.1*e,32);return r.cannon_shape=new jd(1*e,1*e,.1*e,8),r;case"d4":return this[i](bt.d4.vertices,bt.d4.faces,e,-.1,Math.PI*7/6,.96);case"d6":return this[i](bt.d6.vertices,bt.d6.faces,e,.1,Math.PI/4,.96);case"d8":return this[i](bt.d8.vertices,bt.d8.faces,e,0,-Math.PI/4/2,.965);case"d10":return this[i](bt.d10.vertices,bt.d10.faces,e,.3,Math.PI,.945);case"d12":return this[i](bt.d12.vertices,bt.d12.faces,e,.2,-Math.PI/4/2,.968);case"d20":return this[i](bt.d20.vertices,bt.d20.faces,e,-.2,-Math.PI/4/2,.955);default:return console.error(`Geometry for ${c} is not available`),null}}fixmaterials(c,e){for(let i=0,r=c.geometry.groups.length;i<r;++i){var t=c.geometry.groups[i].materialIndex-2;if(t<e)continue;let s=t%e;c.geometry.groups[i].materialIndex=s+2}return c.geometry.elementsNeedUpdate=!0,c}create_shape(c,e,t){for(var i=new Array(c.length),r=0;r<c.length;++r)i[r]=new k().fromArray(c[r]).normalize();for(var s=new Array(c.length),a=new Array(e.length),r=0;r<i.length;++r){var n=i[r];s[r]=new b(n.x*t,n.y*t,n.z*t)}for(var r=0;r<e.length;++r)a[r]=e[r].slice(0,e[r].length-1);return new yi({vertices:s,faces:a})}make_geom(c,e,t,i,r){let s=new Bt;for(let f=0;f<c.length;++f)c[f]=c[f].multiplyScalar(t);let a=[];const n=[],o=[],l=new k,h=new k;let d,u=0;for(let f=0;f<e.length;++f){let g=e[f],p=g.length-1,m=Math.PI*2/p;d=g[p]+1;for(let x=0;x<p-2;++x)a.push(...c[g[0]].toArray()),a.push(...c[g[x+1]].toArray()),a.push(...c[g[x+2]].toArray()),l.subVectors(c[g[x+2]],c[g[x+1]]),h.subVectors(c[g[0]],c[g[x+1]]),l.cross(h),l.normalize(),n.push(...l.toArray()),n.push(...l.toArray()),n.push(...l.toArray()),o.push((Math.cos(r)+1+i)/2/(1+i),(Math.sin(r)+1+i)/2/(1+i)),o.push((Math.cos(m*(x+1)+r)+1+i)/2/(1+i),(Math.sin(m*(x+1)+r)+1+i)/2/(1+i)),o.push((Math.cos(m*(x+2)+r)+1+i)/2/(1+i),(Math.sin(m*(x+2)+r)+1+i)/2/(1+i));let v=(p-2)*3;for(let x=0;x<v/3;x++)s.addGroup(u,3,d),u+=3}return s.setAttribute("position",new rt(a,3)),s.setAttribute("normal",new rt(n,3)),s.setAttribute("uv",new rt(o,2)),s.boundingSphere=new lr(new k,t),s}make_d10_geom(c,e,t,i,r){let s=new Bt;for(let x=0;x<c.length;++x)c[x]=c[x].multiplyScalar(t);let a=[];const n=[],o=[],l=new k,h=new k;let d,u=0;for(let x=0;x<e.length;++x){let w=e[x],_=w.length-1,M=Math.PI*2/_;d=w[_]+1;var f=.65,g=.85,p=1-1*g,m=1-.895/1.105*g,v=1;for(let L=0;L<_-2;++L)a.push(...c[w[0]].toArray()),a.push(...c[w[L+1]].toArray()),a.push(...c[w[L+2]].toArray()),l.subVectors(c[w[L+2]],c[w[L+1]]),h.subVectors(c[w[0]],c[w[L+1]]),l.cross(h),l.normalize(),n.push(...l.toArray()),n.push(...l.toArray()),n.push(...l.toArray()),e[x][e[x].length-1]==-1||L>=2?(o.push((Math.cos(r)+1+i)/2/(1+i),(Math.sin(r)+1+i)/2/(1+i)),o.push((Math.cos(M*(L+1)+r)+1+i)/2/(1+i),(Math.sin(M*(L+1)+r)+1+i)/2/(1+i)),o.push((Math.cos(M*(L+2)+r)+1+i)/2/(1+i),(Math.sin(M*(L+2)+r)+1+i)/2/(1+i))):L==0?(o.push(.5-f/2,m),o.push(.5,p),o.push(.5+f/2,m)):L==1&&(o.push(.5-f/2,m),o.push(.5+f/2,m),o.push(.5,v));let E=(_-2)*3;for(let L=0;L<E/3;L++)s.addGroup(u,3,d),u+=3}return s.setAttribute("position",new rt(a,3)),s.setAttribute("normal",new rt(n,3)),s.setAttribute("uv",new rt(o,2)),s.boundingSphere=new lr(new k,t),s}chamfer_geom(c,e,t){for(var i=[],r=[],s=new Array(c.length),a=0;a<c.length;++a)s[a]=[];for(var a=0;a<e.length;++a){for(var n=e[a],o=n.length-1,l=new k,h=new Array(o),d=0;d<o;++d){var u=c[n[d]].clone();l.add(u),s[n[d]].push(h[d]=i.push(u)-1)}l.divideScalar(o);for(var d=0;d<o;++d){var u=i[h[d]];u.subVectors(u,l).multiplyScalar(t).addVectors(u,l)}h.push(n[o]),r.push(h)}for(var a=0;a<e.length-1;++a)for(var d=a+1;d<e.length;++d){for(var f=[],g=-1,p=0;p<e[a].length-1;++p){var m=e[d].indexOf(e[a][p]);m>=0&&m<e[d].length-1&&(g>=0&&p!=g+1?f.unshift([a,p],[d,m]):f.push([a,p],[d,m]),g=p)}f.length==4&&r.push([r[f[0][0]][f[0][1]],r[f[1][0]][f[1][1]],r[f[3][0]][f[3][1]],r[f[2][0]][f[2][1]],-1])}for(var a=0;a<s.length;++a){for(var v=s[a],h=[v[0]],x=v.length-1;x;){for(var p=e.length;p<r.length;++p){var w=r[p].indexOf(h[h.length-1]);if(w>=0&&w<4){--w==-1&&(w=3);var _=r[p][w];if(v.indexOf(_)>=0){h.push(_);break}}}--x}h.push(-1),r.push(h)}return{vectors:i,faces:r}}create_geom(c,e,t,i,r,s){for(var a=new Array(c.length),n=0;n<c.length;++n)a[n]=new k().fromArray(c[n]).normalize();var o=this.chamfer_geom(a,e,s);if(e.length!=10)var l=this.make_geom(o.vectors,o.faces,t,i,r);else var l=this.make_d10_geom(o.vectors,o.faces,t,i,r);return l.cannon_shape=this.create_shape(c,e,t),l.name="d"+e.length,l}};let Aa=or;za(Aa,"dice",{});const Ps={cloudy:{name:"Clouds (Transparent)",composite:"destination-in",source:"textures/cloudy.webp",source_bump:"textures/cloudy.alt.webp"},cloudy_2:{name:"Clouds",composite:"multiply",source:"textures/cloudy.alt.webp",source_bump:"textures/cloudy.alt.webp"},fire:{name:"Fire",composite:"multiply",source:"textures/fire.webp",source_bump:"textures/fire.webp",material:"metal"},marble:{name:"Marble",composite:"multiply",source:"textures/marble.webp",source_bump:"",material:"glass"},water:{name:"Water",composite:"destination-in",source:"textures/water.webp",source_bump:"textures/water.webp",material:"glass"},ice:{name:"Ice",composite:"destination-in",source:"textures/ice.webp",source_bump:"textures/ice.webp",material:"glass"},paper:{name:"Paper",composite:"multiply",source:"textures/paper.webp",source_bump:"textures/paper-bump.webp",material:"wood"},speckles:{name:"Speckles",composite:"multiply",source:"textures/speckles.webp",source_bump:"textures/speckles.webp",material:"none"},glitter:{name:"Glitter",composite:"multiply",source:"textures/glitter.webp",source_bump:"textures/glitter-bump.webp",material:"none"},glitter_2:{name:"Glitter (Transparent)",composite:"destination-in",source:"textures/glitter-alpha.webp",source_bump:"",material:"none"},stars:{name:"Stars",composite:"multiply",source:"textures/stars.webp",source_bump:"textures/stars.webp",material:"none"},stainedglass:{name:"Stained Glass",composite:"multiply",source:"textures/stainedglass.webp",source_bump:"textures/stainedglass-bump.webp",material:"glass"},wood:{name:"Wood",composite:"multiply",source:"textures/wood.webp",source_bump:"textures/wood.webp",material:"wood"},metal:{name:"Stainless Steel",composite:"multiply",source:"textures/metal.webp",source_bump:"textures/metal-bump.webp",material:"metal"},skulls:{name:"Skulls",composite:"multiply",source:"textures/skulls.webp",source_bump:"textures/skulls.webp"},leopard:{name:"Leopard",composite:"multiply",source:"textures/leopard.webp",source_bump:"textures/leopard.webp",material:"wood"},tiger:{name:"Tiger",composite:"multiply",source:"textures/tiger.webp",source_bump:"textures/tiger.webp",material:"wood"},cheetah:{name:"Cheetah",composite:"multiply",source:"textures/cheetah.webp",source_bump:"textures/cheetah.webp",material:"wood"},dragon:{name:"Dragon",composite:"multiply",source:"textures/dragon.webp",source_bump:"textures/dragon-bump.webp",material:"none"},lizard:{name:"Lizard",composite:"multiply",source:"textures/lizard.webp",source_bump:"textures/lizard.webp",material:"none"},bird:{name:"Bird",composite:"multiply",source:"textures/feather.webp",source_bump:"textures/feather-bump.webp",material:"wood"},astral:{name:"Astral Sea",composite:"multiply",source:"textures/astral.webp",source_bump:"textures/stars.webp",material:"none"},acleaf:{name:"AC Leaf",composite:"multiply",source:"textures/acleaf.webp",source_bump:"textures/acleaf.webp",material:"none"},thecage:{name:"Nicholas Cage",composite:"multiply",source:"textures/thecage.webp",source_bump:"",material:"metal"},isabelle:{name:"Isabelle",composite:"source-over",source:"textures/isabelle.webp",source_bump:"",material:"none"},bronze01:{name:"bronze01",composite:"difference",source:"textures/bronze01.webp",source_bump:"",material:"metal"},bronze02:{name:"bronze02",composite:"difference",source:"textures/bronze02.webp",source_bump:"",material:"metal"},bronze03:{name:"bronze03",composite:"difference",source:"textures/bronze03.webp",source_bump:"",material:"metal"},bronze03a:{name:"bronze03a",composite:"difference",source:"textures/bronze03a.webp",source_bump:"",material:"metal"},bronze03b:{name:"bronze03b",composite:"difference",source:"textures/bronze03b.webp",source_bump:"",material:"metal"},bronze04:{name:"bronze04",composite:"difference",source:"textures/bronze04.webp",source_bump:"",material:"metal"},none:{name:"none",composite:"source-over",source:"",source_bump:"",material:""},"":{name:"~ Preset ~",composite:"source-over",source:"",source_bump:"",material:""}},Qn={coin_default:{name:"Gold Coin",description:"Gold Dragonhead Coin",category:"Other",foreground:"#f6c928",background:"#f6c928",outline:"none",texture:"metal"},coin_silver:{name:"Silver Coin",description:"Gold Dragonhead Coin",category:"Other",foreground:"#f6c928",background:"#f6c928",outline:"none",texture:"metal"},radiant:{name:"Radiant",category:"Damage Types",foreground:"#F9B333",background:"#FFFFFF",outline:"",texture:"paper",description:"Radiant"},fire:{name:"Fire",category:"Damage Types",foreground:"#f8d84f",background:["#f8d84f","#f9b02d","#f43c04","#910200","#4c1009"],outline:"black",texture:"fire",description:"Fire"},ice:{name:"Ice",category:"Damage Types",foreground:"#60E9FF",background:["#214fa3","#3c6ac1","#253f70","#0b56e2","#09317a"],outline:"black",texture:"ice",description:"Ice"},poison:{name:"Poison",category:"Damage Types",foreground:"#D6A8FF",background:["#313866","#504099","#66409e","#934fc3","#c949fc"],outline:"black",texture:"cloudy",description:"Poison"},acid:{name:"Acid",category:"Damage Types",foreground:"#A9FF70",background:["#a6ff00","#83b625","#5ace04","#69f006","#b0f006","#93bc25"],outline:"black",texture:"marble",description:"Acid"},thunder:{name:"Thunder",category:"Damage Types",foreground:"#FFC500",background:"#7D7D7D",outline:"black",texture:"cloudy",description:"Thunder"},lightning:{name:"Lightning",category:"Damage Types",foreground:"#FFC500",background:["#f17105","#f3ca40","#eddea4","#df9a57","#dea54b"],outline:"#7D7D7D",texture:"ice",description:"Lightning"},air:{name:"Air",category:"Damage Types",foreground:"#ffffff",background:["#d0e5ea","#c3dee5","#a4ccd6","#8dafb7","#80a4ad"],outline:"black",texture:"cloudy",description:"Air"},water:{name:"Water",category:"Damage Types",foreground:"#60E9FF",background:["#87b8c4","#77a6b2","#6b98a3","#5b8691","#4b757f"],outline:"black",texture:"water",description:"Water"},earth:{name:"Earth",category:"Damage Types",foreground:"#6C9943",background:["#346804","#184200","#527f22","#3a1d04","#56341a","#331c17","#5a352a","#302210"],outline:"black",texture:"speckles",description:"Earth"},force:{name:"Force",category:"Damage Types",foreground:"white",background:["#FF97FF","#FF68FF","#C651C6"],outline:"#570000",texture:"stars",description:"Force"},psychic:{name:"Psychic",category:"Damage Types",foreground:"#D6A8FF",background:["#313866","#504099","#66409E","#934FC3","#C949FC","#313866"],outline:"black",texture:"speckles",description:"Psychic"},necrotic:{name:"Necrotic",category:"Damage Types",foreground:"#ffffff",background:"#6F0000",outline:"black",texture:"skulls",description:"Necrotic"},breebaby:{name:"Pastel Sunset",category:"Custom Sets",foreground:["#5E175E","#564A5E","#45455E","#3D5A5E","#1E595E","#5E3F3D","#5E1E29","#283C5E","#25295E"],background:["#FE89CF","#DFD4F2","#C2C2E8","#CCE7FA","#A1D9FC","#F3C3C2","#EB8993","#8EA1D2","#7477AD"],outline:"white",texture:"marble",description:"Pastel Sunset, for Breyanna"},pinkdreams:{name:"Pink Dreams",category:"Custom Sets",foreground:"white",background:["#ff007c","#df73ff","#f400a1","#df00ff","#ff33cc"],outline:"#570000",texture:"skulls",description:"Pink Dreams, for Ethan"},inspired:{name:"Inspired",category:"Custom Sets",foreground:"#FFD800",background:"#C4C4B6",outline:"#8E8E86",texture:"none",description:"Inspired, for Austin"},bloodmoon:{name:"Blood Moon",category:"Custom Sets",foreground:"#CDB800",background:"#6F0000",outline:"black",texture:"marble",description:"Blood Moon, for Jared"},starynight:{name:"Stary Night",category:"Custom Sets",foreground:"#4F708F",background:["#091636","#233660","#4F708F","#8597AD","#E2E2E2"],outline:"white",texture:"speckles",description:"Stary Night, for Mai"},glitterparty:{name:"Glitter Party",category:"Custom Sets",foreground:"white",background:["#FFB5F5","#7FC9FF","#A17FFF"],outline:"none",texture:"glitter",description:"Glitter Party, for Austin"},astralsea:{name:"Astral Sea",category:"Custom Sets",foreground:"#565656",background:"white",outline:"none",texture:"astral",description:"The Astral Sea, for Austin"},bronze:{name:"Thylean Bronze",description:"Thylean Bronze by @SpencerThayer",category:"Custom Sets",foreground:["#FF9159","#FFB066","#FFBF59","#FFD059"],background:["#705206","#7A4E06","#643100","#7A2D06"],outline:["#3D2D03","#472D04","#301700","#471A04"],edge:["#FF5D0D","#FF7B00","#FFA20D","#FFBA0D"],texture:["bronze01","bronze02","bronze03","bronze03a","bronze03b","bronze04"]},dragons:{name:"Here be Dragons",category:"Custom Sets",foreground:"#FFFFFF",background:["#B80000","#4D5A5A","#5BB8FF","#7E934E","#FFFFFF","#F6ED7C","#7797A3","#A78437","#862C1A","#FFDF8A"],outline:"black",texture:["dragon","lizard"],description:"Here be Dragons"},birdup:{name:"Bird Up",category:"Custom Sets",foreground:"#FFFFFF",background:["#F11602","#FFC000","#6EC832","#0094BC","#05608D","#FEABB3","#F75680","#F3F0DF","#C7A57F"],outline:"black",texture:"bird",description:"Bird Up!"},tigerking:{name:"Tiger King",category:"Other",foreground:"#ffffff",background:"#FFCC40",outline:"black",texture:["leopard","tiger","cheetah"],description:"Leopard Print"},covid:{name:"COViD",category:"Other",foreground:"#A9FF70",background:["#a6ff00","#83b625","#5ace04","#69f006","#b0f006","#93bc25"],outline:"black",texture:"fire",description:"Covid-19"},acleaf:{name:"Animal Crossing",category:"Other",foreground:"#00FF00",background:"#07540A",outline:"black",texture:"acleaf",description:"Animal Crossing Leaf"},isabelle:{name:"Isabelle",category:"Other",foreground:"white",background:"#FEE5CC",outline:"black",texture:"isabelle",description:"Isabelle"},thecage:{name:"Nicholas Cage",category:"Other",foreground:"#ffffff",background:"#ffffff",outline:"black",texture:"thecage",description:"Nicholas Cage"},test:{name:"Test",category:"Colors",foreground:["#00FF00","#0000FF","#FF0000"],background:["#FF0000","#00FF00","#0000FF"],outline:"black",texture:"none",description:"Test"},rainbow:{name:"Rainblow",category:"Colors",foreground:["#FF5959","#FFA74F","#FFFF56","#59FF59","#2374FF","#00FFFF","#FF59FF"],background:["#900000","#CE3900","#BCBC00","#00B500","#00008E","#008282","#A500A5"],outline:"black",texture:"none",description:"Rainblow"},black:{name:"Black",category:"Colors",foreground:"#ffffff",background:"#000000",outline:"black",texture:"none",description:"Black"},white:{name:"White",category:"Colors",foreground:"#000000",background:"#FFFFFF",outline:"#FFFFFF",texture:"none",description:"White"},swrpg_abi:{name:"Star Wars RPG - Ability",category:"Star Wars™ RPG",foreground:"#00FF00",background:["#3D9238","#52B848","#5EAC56","#9ECB9A"],outline:"#000000",texture:"cloudy_2",description:"Star Wars™ RPG Ability Dice"},swrpg_pro:{name:"Star Wars RPG - Proficiency",category:"Star Wars™ RPG",foreground:"#FFFF00",background:["#CABB1C","#F9E33B","#FFE900","#F0E49D"],outline:"#000000",texture:"paper",description:"Star Wars™ RPG Proficiency Dice"},swrpg_dif:{name:"Star Wars RPG - Difficulty",category:"Star Wars™ RPG",foreground:"#8000FC",background:["#39165F","#664B84","#50247E","#745F88"],outline:"#000000",texture:"cloudy_2",description:"Star Wars™ RPG Difficulty Dice"},swrpg_cha:{name:"Star Wars RPG - Challenge",category:"Star Wars™ RPG",foreground:"#FF0000",background:["#A91F32","#EB4254","#E51836","#BA3645"],outline:"#000000",texture:"paper",description:"Star Wars™ RPG Challenge Dice"},swrpg_boo:{name:"Star Wars RPG - Boost",category:"Star Wars™ RPG",foreground:"#00FFFF",background:["#4B9DC6","#689FC4","#85CFF2","#8FC0D8"],outline:"#000000",texture:"glitter",description:"Star Wars™ RPG Boost Dice"},swrpg_set:{name:"Star Wars RPG - Setback",category:"Star Wars™ RPG",foreground:"#111111",background:["#252223","#241F21","#282828","#111111"],outline:"#ffffff",texture:"glitter",description:"Star Wars™ RPG Setback Dice"},swrpg_for:{name:"Star Wars RPG - Force",category:"Star Wars™ RPG",foreground:"#000000",background:["#F3F3F3","#D3D3D3","#BABABA","#FFFFFF"],outline:"#FFFFFF",texture:"stars",description:"Star Wars™ RPG Force Dice"},swa_red:{name:"Armada Attack - Red",category:"Star Wars™ Armada",foreground:"#ffffff",background:["#440D19","#8A1425","#C72336","#C04551"],outline:"none",texture:"stainedglass",description:"Star Wars™ Armada Red Attack Dice"},swa_blue:{name:"Armada Attack - Blue",category:"Star Wars™ Armada",foreground:"#ffffff",background:["#212642","#28286E","#2B348C","#3D4BB5","#5D64AB"],outline:"none",texture:"stainedglass",description:"Star Wars™ Armada Blue Attack Dice"},swa_black:{name:"Armada Attack - Black",category:"Star Wars™ Armada",foreground:"#ffffff",background:["#252223","#241F21","#282828","#111111"],outline:"none",texture:"stainedglass",description:"Star Wars™ Armada Black Attack Dice"},xwing_red:{name:"X-Wing Attack - Red",category:"Star Wars™ X-Wing",foreground:"#ffffff",background:["#440D19","#8A1425","#C72336","#C04551"],outline:"none",texture:"stars",description:"Star Wars™ X-Wing Red Attack Dice"},xwing_green:{name:"X-Wing Attack - Green",category:"Star Wars™ X-Wing",foreground:"#ffffff",background:["#3D9238","#52B848","#5EAC56","#9ECB9A"],outline:"none",texture:"stars",description:"Star Wars™ X-Wing Green Attack Dice"},swl_atkred:{name:"Legion Attack - Red",category:"Star Wars™ Legion",foreground:"#ffffff",background:["#440D19","#8A1425","#C72336","#C04551"],outline:"none",texture:"fire",description:"Star Wars™ Legion Red Attack Dice"},swl_atkblack:{name:"Legion Attack - Black",category:"Star Wars™ Legion",foreground:"#ffffff",background:["#252223","#241F21","#282828","#111111"],outline:"none",texture:"fire",description:"Star Wars™ Legion Black Attack Dice"},swl_atkwhite:{name:"Legion Attack - White",category:"Star Wars™ Legion",foreground:"#000000",background:["#ffffff","#DFF4FA","#BCBCBC","#F1EDE2","#F2ECE0"],outline:"none",texture:"fire",description:"Star Wars™ Legion White Attack Dice"},swl_defred:{name:"Legion Defense - Red",category:"Star Wars™ Legion",foreground:"#ffffff",background:["#440D19","#8A1425","#C72336","#C04551"],outline:"none",texture:"fire",description:"Star Wars™ Legion Red Defense Dice"},swl_defwhite:{name:"Legion Defense - White",category:"Star Wars™ Legion",foreground:"#000000",background:["#ffffff","#DFF4FA","#BCBCBC","#F1EDE2","#F2ECE0"],outline:"none",texture:"fire",description:"Star Wars™ Legion White Defense Dice"}};class bm{constructor(e={}){this.colorsets=[],this.assetPath=e.assetPath}async ImageLoader(e){if(Array.isArray(e)){for(let t=0,i=e.length;t<i;t++)e[t]=await this.ImageLoader(e[t]);return e}return e.source&&e.source!=""&&(e.texture=await this.loadImage(e.source)),e.source_bump&&e.source_bump!=""&&(e.bump=await this.loadImage(e.source_bump)),e}loadImage(e){return new Promise((t,i)=>{let r=new Image;r.onload=()=>t(r),r.crossOrigin="anonymous",r.src=this.assetPath+e,r.onerror=s=>i(s)}).catch(t=>{console.error("Unable to load image texture")})}async getColorSet(e){let t,i;if(typeof e=="string"&&(t=e),typeof e=="object"&&(t=e.colorset),this.colorsets.hasOwnProperty(t))return this.colorsets[t];let r=Qn[t];return i=e.texture||r.texture,r.texture=this.getTexture(i),r.texture=await this.ImageLoader(r.texture),e.material&&(r.texture.material=e.material),this.colorsets[t]=r,r}async makeColorSet(e={}){if(this.colorsets.hasOwnProperty(e.name))return this.colorsets[e.name];let t=Qn.white,i=Object.assign({},t,e),r=this.getTexture(i.texture);return i.texture=await this.ImageLoader(r),e.material&&(i.texture.material=e.material),i.name.toLowerCase()==="white"&&(i.name=`${Date.now()}`),this.colorsets[i.name]=i,i}getTexture(e){if(Array.isArray(e)){let t=[];for(let i=0,r=e.length;i<r;i++)t.push(this.getTexture(e[i]));return t}return Ps.hasOwnProperty(e)?Ps[e]:Ps.none}}const wm={default:{name:"Solid Color",author:"MajorVictory",showColorPicker:!0,surface:"wood_tray",colors:{fg:"#9794ff",bg:"#0b1a3e"},cubeMap:["envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg"]},"blue-felt":{name:"Blue Felt",author:"MajorVictory",showColorPicker:!0,surface:"felt",colors:{fg:"#9794ff",bg:"#0b1a3e"},cubeMap:["envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg"]},"red-felt":{name:"Red Felt",author:"MajorVictory",showColorPicker:!0,surface:"felt",colors:{fg:"#ff9494",bg:"#4d1e1e"},cubeMap:["envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg"]},"green-felt":{name:"Green Felt",author:"MajorVictory",showColorPicker:!0,surface:"felt",colors:{fg:"#97ff94",bg:"#244d1e"},cubeMap:["envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg","envmap.jpg"]},taverntable:{name:"Old Tavern Table",author:"MajorVictory",showColorPicker:!0,surface:"wood_table",colors:{fg:"#9794ff",bg:"#0b1a3e"},cubeMap:["px.png","nx.png","py.png","ny.png","pz.png","nz.png"]},mahogany:{name:"(Mah-Hog-Any)",author:"MajorVictory",showColorPicker:!0,surface:"wood_table",colors:{fg:"#9794ff",bg:"#0b1a3e"},cubeMap:["px.png","nx.png","py.png","ny.png","pz.png","nz.png"]},stainless:{name:"Stainless Steel",author:"MajorVictory",showColorPicker:!0,surface:"metal",colors:{fg:"#9794ff",bg:"#0b1a3e"},cubeMap:["px.png","nx.png","py.png","ny.png","pz.png","nz.png"]},cyberpunk:{name:"Neo-New-Future-City",author:"MajorVictory",showColorPicker:!0,surface:"metal",colors:{fg:"#3494A6",bg:"#440B28"},cubeMap:["px.png","nx.png","py.png","ny.png","pz.png","nz.png"]},cagetown:{name:"Cage Town",author:"MajorVictory",showColorPicker:!0,surface:"wood_table",colors:{fg:"#D7A866",bg:"#282811"},cubeMap:["px.png","nx.png","py.png","ny.png","pz.png","nz.png"]}},Mm=c=>{let e;return function(){let t=this,i=arguments;e&&window.cancelAnimationFrame(e),e=window.requestAnimationFrame(function(){c.apply(t,i)})}},Sm={assetPath:"./",framerate:1/60,sounds:!1,volume:100,color_spotlight:15720405,shadows:!0,theme_surface:"green-felt",sound_dieMaterial:"plastic",theme_customColorset:null,theme_colorset:"white",theme_texture:"",theme_material:"glass",gravity_multiplier:400,light_intensity:.7,baseScale:100,strength:1,iterationLimit:1e3,onRollComplete:()=>{},onRerollComplete:()=>{},onAddDiceComplete:()=>{},onRemoveDiceComplete:()=>{}};class Em{constructor(e,t={}){this.initialized=!1,this.container=document.querySelector(e),this.dimensions=new Le(this.container.clientWidth,this.container.clientHeight),this.adaptive_timestep=!1,this.last_time=0,this.running=!1,this.rolling=!1,this.threadid,this.display={currentWidth:null,currentHeight:null,containerWidth:null,containerHeight:null,aspect:null,scale:null},this.cameraHeight={max:null,close:null,medium:null,far:null},this.scene=new Ou,this.world=new hm,this.dice_body_material=new wi,this.sounds_table={},this.sounds_dice=[],this.lastSoundType="",this.lastSoundStep=0,this.lastSound=0,this.iteration,this.renderer,this.barrier,this.camera,this.light,this.light_amb,this.desk,this.box_body={},this.bodies=[],this.meshes=[],this.diceList=[],this.notationVectors=null,this.dieIndex=0,this.soundDelay=10,this.animstate="",this.selector={animate:!0,rotate:!0,intersected:null,dice:[]},Object.assign(this,Sm,t),this.DiceColors=new bm({assetPath:this.assetPath}),this.DiceFactory=new Aa({baseScale:this.baseScale}),this.DiceFactory.setBumpMapping(!0),this.surface=wm[this.theme_surface].surface}enableShadows(){this.shadows=!0,this.renderer&&(this.renderer.shadowMap.enabled=this.shadows),this.light&&(this.light.castShadow=this.shadows),this.desk&&(this.desk.receiveShadow=this.shadows)}disableShadows(){this.shadows=!1,this.renderer&&(this.renderer.shadowMap.enabled=this.shadows),this.light&&(this.light.castShadow=this.shadows),this.desk&&(this.desk.receiveShadow=this.shadows)}async initialize(){this.renderer=new ga({antialias:!0,alpha:!0}),this.container.appendChild(this.renderer.domElement),this.renderer.shadowMap.enabled=this.shadows,this.renderer.shadowMap.type=2,this.renderer.setClearColor(0,0),this.setDimensions(this.dimensions),this.world.gravity.set(0,0,-9.8*this.gravity_multiplier),this.world.broadphase=new _a,this.world.solver.iterations=14,this.world.allowSleep=!0,this.makeWorldBox(),this.resizeWorld(),await this.loadTheme({colorset:this.theme_colorset,texture:this.theme_texture,material:this.theme_material}).catch(e=>{throw new Error("Unable to load theme")}),this.sounds&&await this.loadSounds().catch(e=>{throw new Error("Unable to load sounds")}),this.initialized=!0,this.renderer.render(this.scene,this.camera)}makeWorldBox(){Object.keys(this.box_body).length&&(this.world.removeBody(this.box_body.desk),this.world.removeBody(this.box_body.topWall),this.world.removeBody(this.box_body.bottomWall),this.world.removeBody(this.box_body.leftWall),this.world.removeBody(this.box_body.rightWall));const e=new wi,t=new wi;this.world.addContactMaterial(new bi(e,this.dice_body_material,{mass:0,friction:.6,restitution:.5})),this.world.addContactMaterial(new bi(t,this.dice_body_material,{mass:0,friction:.6,restitution:1})),this.world.addContactMaterial(new bi(this.dice_body_material,this.dice_body_material,{mass:0,friction:.6,restitution:.5})),this.box_body.desk=new re({allowSleep:!1,mass:0,shape:new ir,material:e}),this.world.addBody(this.box_body.desk),this.box_body.topWall=new re({allowSleep:!1,mass:0,shape:new ir,material:t}),this.box_body.topWall.quaternion.setFromAxisAngle(new b(1,0,0),Math.PI/2),this.box_body.topWall.position.set(0,this.display.containerHeight*.93,0),this.world.addBody(this.box_body.topWall),this.box_body.bottomWall=new re({allowSleep:!1,mass:0,shape:new ir,material:t}),this.box_body.bottomWall.quaternion.setFromAxisAngle(new b(1,0,0),-Math.PI/2),this.box_body.bottomWall.position.set(0,-this.display.containerHeight*.93,0),this.world.addBody(this.box_body.bottomWall),this.box_body.leftWall=new re({allowSleep:!1,mass:0,shape:new ir,material:t}),this.box_body.leftWall.quaternion.setFromAxisAngle(new b(0,1,0),-Math.PI/2),this.box_body.leftWall.position.set(this.display.containerWidth*.93,0,0),this.world.addBody(this.box_body.leftWall),this.box_body.rightWall=new re({allowSleep:!1,mass:0,shape:new ir,material:t}),this.box_body.rightWall.quaternion.setFromAxisAngle(new b(0,1,0),Math.PI/2),this.box_body.rightWall.position.set(-this.display.containerWidth*.93,0,0),this.world.addBody(this.box_body.rightWall)}async loadTheme(e){let t;this.theme_customColorset?t=await this.DiceColors.makeColorSet(this.theme_customColorset):t=await this.DiceColors.getColorSet(e),this.DiceFactory.applyColorSet(t),this.colorData=t}async loadSounds(){let e={felt:7,wood_table:7,wood_tray:7,metal:9},t={coin:6,metal:12,plastic:15,wood:12};const i=this.colorData.texture.material.match(/wood|metal/g);if(this.sound_dieMaterial=i?this.colorData.texture.material:"plastic",!this.sounds_table.hasOwnProperty(this.surface)){this.sounds_table[this.surface]=[];let r=e[this.surface];for(let s=1;s<=r;++s){const a=await this.loadAudio(this.assetPath+"sounds/surfaces/surface_"+this.surface+s+".mp3");this.sounds_table[this.surface].push(a)}}if(!this.sounds_dice.hasOwnProperty("coin")){this.sounds_dice.coin=[];let r=t.coin;for(let s=1;s<=r;++s){const a=await this.loadAudio(this.assetPath+"sounds/dicehit/dicehit_coin"+s+".mp3");this.sounds_dice.coin.push(a)}}if(!this.sounds_dice.hasOwnProperty(this.sound_dieMaterial)){this.sounds_dice[this.sound_dieMaterial]=[];let r=t[this.sound_dieMaterial];for(let s=1;s<=r;++s){const a=await this.loadAudio(this.assetPath+"sounds/dicehit/dicehit_"+this.sound_dieMaterial+s+".mp3");this.sounds_dice[this.sound_dieMaterial].push(a)}}}loadAudio(e){return new Promise((t,i)=>{let r=new Audio;r.oncanplaythrough=()=>t(r),r.crossOrigin="anonymous",r.src=e,r.onerror=s=>i(s)}).catch(t=>{console.error("Unable to load audio")})}async updateConfig(e={}){Object.apply(this,e),this.theme_customColorset=e.theme_customColorset?e.theme_customColorset:null,e.theme_colorset&&(this.theme_colorset=e.theme_colorset),e.theme_texture&&(this.theme_texture=e.theme_texture),e.theme_material&&(this.theme_material=e.theme_material),(e.theme_colorset||e.theme_texture||e.theme_material||e.theme_customColorset)&&await this.loadTheme({colorset:this.theme_colorset,texture:this.theme_texture,material:this.theme_material})}setDimensions(e){switch(this.display.currentWidth=this.container.clientWidth/2,this.display.currentHeight=this.container.clientHeight/2,e?(this.display.containerWidth=e.x,this.display.containerHeight=e.y):(this.display.containerWidth=this.display.currentWidth,this.display.containerHeight=this.display.currentHeight),this.display.aspect=Math.min(this.display.currentWidth/this.display.containerWidth,this.display.currentHeight/this.display.containerHeight),this.display.scale=Math.sqrt(this.display.containerWidth*this.display.containerWidth+this.display.containerHeight*this.display.containerHeight)/13,this.makeWorldBox(),this.renderer.setSize(this.display.currentWidth*2,this.display.currentHeight*2),this.cameraHeight.max=this.display.currentHeight/this.display.aspect/Math.tan(10*Math.PI/180),this.cameraHeight.medium=this.cameraHeight.max/1.5,this.cameraHeight.far=this.cameraHeight.max,this.cameraHeight.close=this.cameraHeight.max/2,this.camera&&this.scene.remove(this.camera),this.camera=new ft(20,this.display.currentWidth/this.display.currentHeight,1,this.cameraHeight.max*1.3),this.animstate){case"selector":this.camera.position.z=this.selector.dice.length>9?this.cameraHeight.far:this.selector.dice.length<6?this.cameraHeight.close:this.cameraHeight.medium;break;case"throw":case"afterthrow":default:this.camera.position.z=this.cameraHeight.far}this.camera.lookAt(new k(0,0,0));const t=Math.max(this.display.containerWidth,this.display.containerHeight);this.light&&this.scene.remove(this.light),this.light_amb&&this.scene.remove(this.light_amb),this.light=new Wu(this.color_spotlight,this.light_intensity),this.light.position.set(-t/2,t/2,t*3),this.light.target.position.set(0,0,0),this.light.distance=t*5,this.light.angle=Math.PI/4,this.light.castShadow=this.shadows,this.light.shadow.camera.near=t/10,this.light.shadow.camera.far=t*5,this.light.shadow.camera.fov=50,this.light.shadow.bias=.001,this.light.shadow.mapSize.width=1024,this.light.shadow.mapSize.height=1024,this.scene.add(this.light),this.light_amb=new Gu(16777147,6776689,this.light_intensity),this.scene.add(this.light_amb),this.desk&&this.scene.remove(this.desk);let i=new Bu;i.opacity=.5,this.desk=new Nt(new qr(this.display.containerWidth*6,this.display.containerHeight*6,1,1),i),this.desk.receiveShadow=this.shadows,this.scene.add(this.desk),this.renderer.render(this.scene,this.camera)}resizeWorld(){const e=Mm(()=>{const t=this.renderer.domElement,i=this.container.clientWidth,r=this.container.clientHeight,s=t.width!==i||t.height!==r;return s&&this.setDimensions(new Le(this.container.clientWidth,this.container.clientHeight)),s});window.addEventListener("resize",e)}vectorRand({x:e,y:t}){let i=Math.random()*Math.PI/5-Math.PI/5/2,r={x:e*Math.cos(i)-t*Math.sin(i),y:e*Math.sin(i)+t*Math.cos(i)};return r.x==0&&(r.x=.01),r.y==0&&(r.y=.01),r}getNotationVectors(e,t,i,r){let s=new Kn(e);for(let a in s.set){const n=this.DiceFactory.get(s.set[a].type);let o=s.set[a].num,l=s.set[a].op,h=s.set[a].sid,d=s.set[a].gid,u=s.set[a].glvl,f=s.set[a].func,g=s.set[a].args;for(let p=0;p<o;p++){let m=this.vectorRand(t);m.x/=r,m.y/=r;let v={x:this.display.containerWidth*(m.x>0?-1:1)*.9,y:this.display.containerHeight*(m.y>0?-1:1)*.9,z:Math.random()*200+200},x=Math.abs(m.x/m.y);x>1?v.y/=x:v.x*=x;let w=this.vectorRand(t);w.x/=r,w.y/=r;let _,M,E;n.shape!="d2"?(_={x:w.x*i,y:w.y*i,z:-10},M={x:-(Math.random()*m.y*5+n.inertia*m.y),y:Math.random()*m.x*5+n.inertia*m.x,z:0},E={x:Math.random(),y:Math.random(),z:Math.random(),a:Math.random()}):(_={x:w.x*i/10,y:w.y*i/10,z:3e3},M={x:12*n.inertia,y:1*n.inertia,z:0},E={x:1,y:1,z:Math.random(),a:Math.random()}),s.vectors.push({index:this.dieIndex++,type:n.type,op:l,sid:h,gid:d,glvl:u,func:f,args:g,pos:v,velocity:_,angle:M,axis:E})}}return s}swapDiceFace(e,t){const i=this.DiceFactory.get(e.notation.type);if(e.resultReason="forced",i.shape=="d4"){this.swapDiceFace_D4(e,t);return}i.values;let r=parseInt(e.getLastValue().value);t=parseInt(t),e.notation.type=="d10"&&r==0&&(r=10),e.notation.type=="d100"&&r==0&&(r=100),e.notation.type=="d100"&&r>0&&r<10&&(r*=10),e.notation.type=="d10"&&t==0&&(t=10),e.notation.type=="d100"&&t==0&&(t=100),e.notation.type=="d100"&&t>0&&t<10&&(t*=10);let s=i.values.indexOf(r),a=i.values.indexOf(t);if(s<0||a<0||s==a)return;let n=e.geometry.clone(),o=[],l=[],h=2;i.shape=="d10"&&(h=1);let d,u=a+h;i.shape!="d2"?(d=s+h,u=a+h):(d=s+1,u=a+1);for(var f=0,g=n.groups.length;f<g;++f){const p=n.groups[f].materialIndex;if(p==d){o.push(f);continue}if(p==u){l.push(f);continue}}if(!(o.length<=0||l.length<=0)){for(let p=0,m=l.length;p<m;p++)n.groups[l[p]].materialIndex=d;for(let p=0,m=o.length;p<m;p++)n.groups[o[p]].materialIndex=u;e.geometry=n,e.result=[]}}swapDiceFace_D4(e,t){const i=this.DiceFactory.get(e.notation.type);let r=parseInt(e.getLastValue().value);if(t=parseInt(t),!(r>=1&&r<=4))return;let s=t-r,a=e.geometry.clone();for(let n=0,o=a.groups.length;n<o;++n){const l=a.groups[n];let h=l.materialIndex;if(h!=0){for(h+=s-1;h>4;)h-=4;for(;h<1;)h+=4;l.materialIndex=h+1}}s!=0&&(s<0&&(s+=4),e.material=this.DiceFactory.createMaterials(i,0,0,!1,s)),e.geometry=a}spawnDice(e,t=!1){const{pos:i,axis:r,angle:s,velocity:a}=e;let n;if(t)n=t,n.stopped=0,this.world.removeBody(n.body);else{if(n=this.DiceFactory.create(e.type,this.colorData),!n)return;n.notation=e,n.result=[],n.stopped=0,n.castShadow=this.shadows,this.scene.add(n),this.diceList.push(n)}n.body=new re({allowSleep:!0,sleepSpeedLimit:75,sleepTimeLimit:.9,mass:n.mass,shape:n.geometry.cannon_shape,material:this.dice_body_material}),n.body.type=re.DYNAMIC,n.body.position.set(i.x,i.y,i.z),n.body.quaternion.setFromAxisAngle(new b(r.x,r.y,r.z),r.a*Math.PI*2),n.body.angularVelocity.set(s.x,s.y,s.z),n.body.velocity.set(a.x,a.y,a.z),n.body.linearDamping=.1,n.body.angularDamping=.1,n.body.diceShape=n.shape,n.body.sleepState=0,n.body.addEventListener("collide",this.eventCollide.bind(this)),this.world.addBody(n.body)}eventCollide({body:e,target:t}){if(this.animstate=="simulate"||!this.sounds||!e||this.volume<=0)return;let i=Date.now(),r=e.mass>0?"dice":"table";if(!((this.lastSoundStep==e.world.stepnumber||this.lastSound>i)&&r!="dice")&&!((this.lastSoundStep==e.world.stepnumber||this.lastSound>i)&&r=="dice"&&this.lastSoundType=="dice")){if(e.mass>0){let s=e.velocity.length();if(s<250)return;let a;e.diceShape==="d2"?a=this.sounds_dice.coin[Math.floor(Math.random()*this.sounds_dice.coin.length)]:a=this.sounds_dice[this.sound_dieMaterial][Math.floor(Math.random()*this.sounds_dice[this.sound_dieMaterial].length)],a&&(a.volume=Math.min(s/8e3,this.volume/100),a.play().catch(n=>{})),this.lastSoundType="dice"}else{let s=t.velocity.length();if(s<250)return;let a=this.surface,n=this.sounds_table[a],o=n[Math.floor(Math.random()*n.length)];o&&(o.volume=Math.min(s/8e3,this.volume/100),o.play().catch(l=>{})),this.lastSoundType="table"}this.lastSoundStep=e.world.stepnumber,this.lastSound=i+this.soundDelay}}checkForRethrow(e){return e.notation.func&&e.notation.func.toLowerCase(),!1}throwFinished(){const e=this.iteration>this.iterationLimit;for(let t=0,i=this.diceList.length;t<i;++t){const r=this.diceList[t],s=re.SLEEPING;if(r.body.sleepState<s&&!e)return!1;if(r.body.sleepState==s||e){if(r.body.type===re.KINEMATIC)continue;let a=!1;if(r.result.length==0?(r.storeRolledValue(r.resultReason),a=this.checkForRethrow(r)):r.result.length>0&&r.rerolling&&(r.rerolling=!1,r.storeRolledValue("reroll"),a=this.checkForRethrow(r)),a)return r.rerolls+=1,r.rerolling=!0,r.body.wakeUp(),r.body.type=re.DYNAMIC,r.body.angularVelocity=new b(25,25,25),r.body.velocity=new b(0,0,3e3),!1;r.rerolling=!1,r.body.type=re.KINEMATIC}}return!0}simulateThrow(){for(this.animstate="simulate",this.iteration=0,this.rolling=!0;!this.throwFinished(!0);)++this.iteration,this.world.step(this.framerate)}animateThrow(e,t){this.animstate="throw";let i=Date.now();this.last_time=this.last_time||i-this.framerate*1e3;let r=(i-this.last_time)/1e3;++this.iteration;let s=Math.floor(r/this.framerate);for(let a=0;a<s;a++)this.world.step(this.framerate),++this.steps;for(let a in this.scene.children){let n=this.scene.children[a];n.body!=null&&(n.position.copy(n.body.position),n.quaternion.copy(n.body.quaternion))}if(this.renderer.render(this.scene,this.camera),this.last_time=this.last_time+s*this.framerate*1e3,this.running==e&&this.throwFinished()){this.running=!1,this.rolling=!1,t&&t.call(this,this.notationVectors),this.running=Date.now(),this.animateAfterThrow(this.running);return}this.running==e&&((a,n,o,l,h)=>{!o&&r<this.framerate?setTimeout(()=>{requestAnimationFrame(()=>{a.call(this,n,l,h)})},(this.framerate-r)*1e3):requestAnimationFrame(()=>{a.call(this,n,l,h)})}).bind(this)(this.animateThrow,e,this.adaptive_timestep,t)}animateAfterThrow(e){this.animstate="afterthrow";let t=Date.now(),i=(t-this.last_time)/1e3;i>3&&(i=this.framerate),this.running=!1,this.last_time=t,this.renderer.render(this.scene,this.camera),this.running==e&&((r,s,a)=>{!a&&i<this.framerate?setTimeout(()=>{requestAnimationFrame(()=>{r.call(this,s)})},(this.framerate-i)*1e3):requestAnimationFrame(()=>{r.call(this,s)})}).bind(this)(this.animateAfterThrow,e,this.adaptive_timestep)}startClickThrow(e){this.rolling&&(this.clearDice(),this.rolling=!1);let t={x:(Math.random()*2-.5)*this.display.currentWidth,y:-(Math.random()*2-.5)*this.display.currentHeight},i=Math.sqrt(t.x*t.x+t.y*t.y)+100,r=(Math.random()+3)*i*this.strength;return this.getNotationVectors(e,t,r,i)}clearDice(){this.running=!1;let e;for(;e=this.diceList.pop();)this.scene.remove(e),e.body&&this.world.removeBody(e.body);this.renderer.render(this.scene,this.camera),setTimeout(()=>{this.renderer.render(this.scene,this.camera)},100)}getDiceResults(e){if(e!==void 0)return{type:this.diceList[e].shape,sides:parseInt(this.diceList[e].shape.substring(1)),id:e,...this.diceList[e].result.at(-1)};let t=0;const i=this.notationVectors.constant?parseInt(`${this.notationVectors.op}${this.notationVectors.constant}`):0;let r=i;return{notation:this.notationVectors.notation,sets:this.notationVectors.set.map(s=>{const a=t+s.num-1;let n=0;const o=[];for(let h=t;h<=a;h++){if(this.diceList[t].result.at(-1).reason==="remove"){t++;continue}o.push({type:s.type,sides:parseInt(s.type.substring(1)),id:t,...this.diceList[t].result.at(-1)}),n+=this.diceList[t].result.at(-1).value,t++}const l={num:s.num,type:s.type,sides:parseInt(s.type.substring(1)),rolls:o,total:n};return r+=n,l}),modifier:i,total:r}}async roll(e){if(this.notationVectors=this.startClickThrow(e),this.notationVectors)return new Promise((t,i)=>{this.rollDice(()=>{const r=this.getDiceResults();this.onRollComplete(r);const s=new CustomEvent("rollComplete",{detail:r});document.dispatchEvent(s),t(r)})})}async reroll(e){return this.rolling=!0,this.running=Date.now(),this.iteration=0,new Promise((t,i)=>{e.forEach(r=>{const s=this.diceList[r];s.rerolls+=1,s.rerolling=!0,s.body.wakeUp(),s.body.type=re.DYNAMIC,s.body.angularVelocity=new b(25,25,25),s.body.velocity=new b(0,0,3e3)}),this.animateThrow(this.running,()=>{const r=e.map(a=>this.getDiceResults(a));this.onRerollComplete(r);const s=new CustomEvent("rerollComplete",{detail:r});document.dispatchEvent(s),t(r)})})}async add(e){let t=this.diceList.length;if(!t)return this.roll(e);let i=this.startClickThrow(e),r=[];for(let s=0,a=i.vectors.length;s<a;++s)this.spawnDice(i.vectors[s]);this.simulateThrow(),this.steps=0,this.iteration=0;for(let s=0,a=i.vectors.length;s<a;++s){const n=t+s;!this.diceList[n]||(this.spawnDice(i.vectors[s],this.diceList[n]),r.push(n))}if(i.result&&i.result.length>0)for(let s=0;s<i.result.length;s++){const a=t+s;let n=this.diceList[a];!n||n.getLastValue().value!=i.result[s]&&this.swapDiceFace(n,i.result[s])}return this.notationVectors=Kn.mergeNotation(this.notationVectors,i),new Promise((s,a)=>{const n=()=>{const o=r.map(h=>this.getDiceResults(h));this.onAddDiceComplete(o);const l=new CustomEvent("addDiceComplete",{detail:o});document.dispatchEvent(l),s(o)};this.rolling=!0,this.running=Date.now(),this.last_time=0,this.animateThrow(this.running,n)})}async remove(e){return new Promise((t,i)=>{const r=[];e.forEach(a=>{const n=this.diceList[a];n.body&&this.world.removeBody(n.body),this.scene.remove(n),n.storeRolledValue("remove"),r.push(this.getDiceResults(a))}),this.renderer.render(this.scene,this.camera),this.onRemoveDiceComplete(r);const s=new CustomEvent("removeDiceComplete",{detail:r});document.dispatchEvent(s),t(r)})}rollDice(e){if(this.notationVectors.error){e.call(this);return}this.clearDice();for(let t=0,i=this.notationVectors.vectors.length;t<i;++t)this.spawnDice(this.notationVectors.vectors[t]);this.simulateThrow(),this.steps=0,this.iteration=0;for(let t=0,i=this.diceList.length;t<i;++t)!this.diceList[t]||this.spawnDice(this.notationVectors.vectors[t],this.diceList[t]);if(this.notationVectors.result&&this.notationVectors.result.length>0)for(let t=0;t<this.notationVectors.result.length;t++){let i=this.diceList[t];!i||i.getLastValue().value!=this.notationVectors.result[t]&&this.swapDiceFace(i,this.notationVectors.result[t])}this.rolling=!0,this.running=Date.now(),this.last_time=0,this.animateThrow(this.running,e)}}export{Em as default};
