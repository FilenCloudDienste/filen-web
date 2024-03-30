function it(b){var kt=b.statementIndent,ot=b.jsonld,yt=b.json||ot,p=b.typescript,L=b.wordCharacters||/[\w$\xa1-\uffff]/,vt=function(){function t(g){return{type:g,style:"keyword"}}var e=t("keyword a"),n=t("keyword b"),i=t("keyword c"),o=t("keyword d"),l=t("operator"),m={type:"atom",style:"atom"};return{if:t("if"),while:e,with:e,else:n,do:n,try:n,finally:n,return:o,break:o,continue:o,new:t("new"),delete:i,void:i,throw:i,debugger:t("debugger"),var:t("var"),const:t("var"),let:t("var"),function:t("function"),catch:t("catch"),for:t("for"),switch:t("switch"),case:t("case"),default:t("default"),in:l,typeof:l,instanceof:l,true:m,false:m,null:m,undefined:m,NaN:m,Infinity:m,this:t("this"),class:t("class"),super:t("atom"),yield:i,export:t("export"),import:t("import"),extends:i,await:i}}(),wt=/[+\-*&%=<>!?|~^@]/,It=/^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;function St(t){for(var e=!1,n,i=!1;(n=t.next())!=null;){if(!e){if(n=="/"&&!i)return;n=="["?i=!0:i&&n=="]"&&(i=!1)}e=!e&&n=="\\"}}var D,M;function y(t,e,n){return D=t,M=n,e}function O(t,e){var n=t.next();if(n=='"'||n=="'")return e.tokenize=Nt(n),e.tokenize(t,e);if(n=="."&&t.match(/^\d[\d_]*(?:[eE][+\-]?[\d_]+)?/))return y("number","number");if(n=="."&&t.match(".."))return y("spread","meta");if(/[\[\]{}\(\),;\:\.]/.test(n))return y(n);if(n=="="&&t.eat(">"))return y("=>","operator");if(n=="0"&&t.match(/^(?:x[\dA-Fa-f_]+|o[0-7_]+|b[01_]+)n?/))return y("number","number");if(/\d/.test(n))return t.match(/^[\d_]*(?:n|(?:\.[\d_]*)?(?:[eE][+\-]?[\d_]+)?)?/),y("number","number");if(n=="/")return t.eat("*")?(e.tokenize=Q,Q(t,e)):t.eat("/")?(t.skipToEnd(),y("comment","comment")):le(t,e,1)?(St(t),t.match(/^\b(([gimyus])(?![gimyus]*\2))+\b/),y("regexp","string.special")):(t.eat("="),y("operator","operator",t.current()));if(n=="`")return e.tokenize=F,F(t,e);if(n=="#"&&t.peek()=="!")return t.skipToEnd(),y("meta","meta");if(n=="#"&&t.eatWhile(L))return y("variable","property");if(n=="<"&&t.match("!--")||n=="-"&&t.match("->")&&!/\S/.test(t.string.slice(0,t.start)))return t.skipToEnd(),y("comment","comment");if(wt.test(n))return(n!=">"||!e.lexical||e.lexical.type!=">")&&(t.eat("=")?(n=="!"||n=="=")&&t.eat("="):/[<>*+\-|&?]/.test(n)&&(t.eat(n),n==">"&&t.eat(n))),n=="?"&&t.eat(".")?y("."):y("operator","operator",t.current());if(L.test(n)){t.eatWhile(L);var i=t.current();if(e.lastType!="."){if(vt.propertyIsEnumerable(i)){var o=vt[i];return y(o.type,o.style,i)}if(i=="async"&&t.match(/^(\s|\/\*([^*]|\*(?!\/))*?\*\/)*[\[\(\w]/,!1))return y("async","keyword",i)}return y("variable","variable",i)}}function Nt(t){return function(e,n){var i=!1,o;if(ot&&e.peek()=="@"&&e.match(It))return n.tokenize=O,y("jsonld-keyword","meta");for(;(o=e.next())!=null&&!(o==t&&!i);)i=!i&&o=="\\";return i||(n.tokenize=O),y("string","string")}}function Q(t,e){for(var n=!1,i;i=t.next();){if(i=="/"&&n){e.tokenize=O;break}n=i=="*"}return y("comment","comment")}function F(t,e){for(var n=!1,i;(i=t.next())!=null;){if(!n&&(i=="`"||i=="$"&&t.eat("{"))){e.tokenize=O;break}n=!n&&i=="\\"}return y("quasi","string.special",t.current())}var Pt="([{}])";function ut(t,e){e.fatArrowAt&&(e.fatArrowAt=null);var n=t.string.indexOf("=>",t.start);if(!(n<0)){if(p){var i=/:\s*(?:\w+(?:<[^>]*>|\[\])?|\{[^}]*\})\s*$/.exec(t.string.slice(t.start,n));i&&(n=i.index)}for(var o=0,l=!1,m=n-1;m>=0;--m){var g=t.string.charAt(m),x=Pt.indexOf(g);if(x>=0&&x<3){if(!o){++m;break}if(--o==0){g=="("&&(l=!0);break}}else if(x>=3&&x<6)++o;else if(L.test(g))l=!0;else if(/["'\/`]/.test(g))for(;;--m){if(m==0)return;var K=t.string.charAt(m-1);if(K==g&&t.string.charAt(m-2)!="\\"){m--;break}}else if(l&&!o){++m;break}}l&&!o&&(e.fatArrowAt=m)}}var Ct={atom:!0,number:!0,variable:!0,string:!0,regexp:!0,this:!0,import:!0,"jsonld-keyword":!0};function bt(t,e,n,i,o,l){this.indented=t,this.column=e,this.type=n,this.prev=o,this.info=l,i!=null&&(this.align=i)}function Wt(t,e){for(var n=t.localVars;n;n=n.next)if(n.name==e)return!0;for(var i=t.context;i;i=i.prev)for(var n=i.vars;n;n=n.next)if(n.name==e)return!0}function Bt(t,e,n,i,o){var l=t.cc;for(a.state=t,a.stream=o,a.marked=null,a.cc=l,a.style=e,t.lexical.hasOwnProperty("align")||(t.lexical.align=!0);;){var m=l.length?l.pop():yt?k:v;if(m(n,i)){for(;l.length&&l[l.length-1].lex;)l.pop()();return a.marked?a.marked:n=="variable"&&Wt(t,i)?"variableName.local":e}}}var a={state:null,column:null,marked:null,cc:null};function f(){for(var t=arguments.length-1;t>=0;t--)a.cc.push(arguments[t])}function r(){return f.apply(null,arguments),!0}function ft(t,e){for(var n=e;n;n=n.next)if(n.name==t)return!0;return!1}function S(t){var e=a.state;if(a.marked="def",e.context){if(e.lexical.info=="var"&&e.context&&e.context.block){var n=ht(t,e.context);if(n!=null){e.context=n;return}}else if(!ft(t,e.localVars)){e.localVars=new G(t,e.localVars);return}}b.globalVars&&!ft(t,e.globalVars)&&(e.globalVars=new G(t,e.globalVars))}function ht(t,e){if(e)if(e.block){var n=ht(t,e.prev);return n?n==e.prev?e:new U(n,e.vars,!0):null}else return ft(t,e.vars)?e:new U(e.prev,new G(t,e.vars),!1);else return null}function R(t){return t=="public"||t=="private"||t=="protected"||t=="abstract"||t=="readonly"}function U(t,e,n){this.prev=t,this.vars=e,this.block=n}function G(t,e){this.name=t,this.next=e}var Dt=new G("this",new G("arguments",null));function _(){a.state.context=new U(a.state.context,a.state.localVars,!1),a.state.localVars=Dt}function X(){a.state.context=new U(a.state.context,a.state.localVars,!0),a.state.localVars=null}_.lex=X.lex=!0;function V(){a.state.localVars=a.state.context.vars,a.state.context=a.state.context.prev}V.lex=!0;function s(t,e){var n=function(){var i=a.state,o=i.indented;if(i.lexical.type=="stat")o=i.lexical.indented;else for(var l=i.lexical;l&&l.type==")"&&l.align;l=l.prev)o=l.indented;i.lexical=new bt(o,a.stream.column(),t,null,i.lexical,e)};return n.lex=!0,n}function u(){var t=a.state;t.lexical.prev&&(t.lexical.type==")"&&(t.indented=t.lexical.indented),t.lexical=t.lexical.prev)}u.lex=!0;function c(t){function e(n){return n==t?r():t==";"||n=="}"||n==")"||n=="]"?f():r(e)}return e}function v(t,e){return t=="var"?r(s("vardef",e),mt,c(";"),u):t=="keyword a"?r(s("form"),st,v,u):t=="keyword b"?r(s("form"),v,u):t=="keyword d"?a.stream.match(/^\s*$/,!1)?r():r(s("stat"),N,c(";"),u):t=="debugger"?r(c(";")):t=="{"?r(s("}"),X,tt,u,V):t==";"?r():t=="if"?(a.state.lexical.info=="else"&&a.state.cc[a.state.cc.length-1]==u&&a.state.cc.pop()(),r(s("form"),st,v,u,jt)):t=="function"?r($):t=="for"?r(s("form"),X,Tt,v,V,u):t=="class"||p&&e=="interface"?(a.marked="keyword",r(s("form",t=="class"?t:e),Ot,u)):t=="variable"?p&&e=="declare"?(a.marked="keyword",r(v)):p&&(e=="module"||e=="enum"||e=="type")&&a.stream.match(/^\s*\w/,!1)?(a.marked="keyword",e=="enum"?r(Et):e=="type"?r($t,c("operator"),d,c(";")):r(s("form"),A,c("{"),s("}"),tt,u,u)):p&&e=="namespace"?(a.marked="keyword",r(s("form"),k,v,u)):p&&e=="abstract"?(a.marked="keyword",r(v)):r(s("stat"),Kt):t=="switch"?r(s("form"),st,c("{"),s("}","switch"),X,tt,u,u,V):t=="case"?r(k,c(":")):t=="default"?r(c(":")):t=="catch"?r(s("form"),_,Ft,v,u,V):t=="export"?r(s("stat"),ie,u):t=="import"?r(s("stat"),oe,u):t=="async"?r(v):e=="@"?r(k,v):f(s("stat"),k,c(";"),u)}function Ft(t){if(t=="(")return r(I,c(")"))}function k(t,e){return gt(t,e,!1)}function h(t,e){return gt(t,e,!0)}function st(t){return t!="("?f():r(s(")"),N,c(")"),u)}function gt(t,e,n){if(a.state.fatArrowAt==a.stream.start){var i=n?Vt:xt;if(t=="(")return r(_,s(")"),w(I,")"),u,c("=>"),i,V);if(t=="variable")return f(_,A,c("=>"),i,V)}var o=n?P:q;return Ct.hasOwnProperty(t)?r(o):t=="function"?r($,o):t=="class"||p&&e=="interface"?(a.marked="keyword",r(s("form"),ae,u)):t=="keyword c"||t=="async"?r(n?h:k):t=="("?r(s(")"),N,c(")"),u,o):t=="operator"||t=="spread"?r(n?h:k):t=="["?r(s("]"),fe,u,o):t=="{"?H(Z,"}",null,o):t=="quasi"?f(Y,o):t=="new"?r(Gt(n)):r()}function N(t){return t.match(/[;\}\)\],]/)?f():f(k)}function q(t,e){return t==","?r(N):P(t,e,!1)}function P(t,e,n){var i=n==!1?q:P,o=n==!1?k:h;if(t=="=>")return r(_,n?Vt:xt,V);if(t=="operator")return/\+\+|--/.test(e)||p&&e=="!"?r(i):p&&e=="<"&&a.stream.match(/^([^<>]|<[^<>]*>)*>\s*\(/,!1)?r(s(">"),w(d,">"),u,i):e=="?"?r(k,c(":"),o):r(o);if(t=="quasi")return f(Y,i);if(t!=";"){if(t=="(")return H(h,")","call",i);if(t==".")return r(Lt,i);if(t=="[")return r(s("]"),N,c("]"),u,i);if(p&&e=="as")return a.marked="keyword",r(d,i);if(t=="regexp")return a.state.lastType=a.marked="operator",a.stream.backUp(a.stream.pos-a.stream.start-1),r(o)}}function Y(t,e){return t!="quasi"?f():e.slice(e.length-2)!="${"?r(Y):r(N,Ut)}function Ut(t){if(t=="}")return a.marked="string.special",a.state.tokenize=F,r(Y)}function xt(t){return ut(a.stream,a.state),f(t=="{"?v:k)}function Vt(t){return ut(a.stream,a.state),f(t=="{"?v:h)}function Gt(t){return function(e){return e=="."?r(t?Jt:Ht):e=="variable"&&p?r(Zt,t?P:q):f(t?h:k)}}function Ht(t,e){if(e=="target")return a.marked="keyword",r(q)}function Jt(t,e){if(e=="target")return a.marked="keyword",r(P)}function Kt(t){return t==":"?r(u,v):f(q,c(";"),u)}function Lt(t){if(t=="variable")return a.marked="property",r()}function Z(t,e){if(t=="async")return a.marked="property",r(Z);if(t=="variable"||a.style=="keyword"){if(a.marked="property",e=="get"||e=="set")return r(Mt);var n;return p&&a.state.fatArrowAt==a.stream.start&&(n=a.stream.match(/^\s*:\s*/,!1))&&(a.state.fatArrowAt=a.stream.pos+n[0].length),r(E)}else{if(t=="number"||t=="string")return a.marked=ot?"property":a.style+" property",r(E);if(t=="jsonld-keyword")return r(E);if(p&&R(e))return a.marked="keyword",r(Z);if(t=="[")return r(k,C,c("]"),E);if(t=="spread")return r(h,E);if(e=="*")return a.marked="keyword",r(Z);if(t==":")return f(E)}}function Mt(t){return t!="variable"?f(E):(a.marked="property",r($))}function E(t){if(t==":")return r(h);if(t=="(")return f($)}function w(t,e,n){function i(o,l){if(n?n.indexOf(o)>-1:o==","){var m=a.state.lexical;return m.info=="call"&&(m.pos=(m.pos||0)+1),r(function(g,x){return g==e||x==e?f():f(t)},i)}return o==e||l==e?r():n&&n.indexOf(";")>-1?f(t):r(c(e))}return function(o,l){return o==e||l==e?r():f(t,i)}}function H(t,e,n){for(var i=3;i<arguments.length;i++)a.cc.push(arguments[i]);return r(s(e,n),w(t,e),u)}function tt(t){return t=="}"?r():f(v,tt)}function C(t,e){if(p){if(t==":")return r(d);if(e=="?")return r(C)}}function Qt(t,e){if(p&&(t==":"||e=="in"))return r(d)}function At(t){if(p&&t==":")return a.stream.match(/^\s*\w+\s+is\b/,!1)?r(k,Rt,d):r(d)}function Rt(t,e){if(e=="is")return a.marked="keyword",r()}function d(t,e){if(e=="keyof"||e=="typeof"||e=="infer"||e=="readonly")return a.marked="keyword",r(e=="typeof"?h:d);if(t=="variable"||e=="void")return a.marked="type",r(z);if(e=="|"||e=="&")return r(d);if(t=="string"||t=="number"||t=="atom")return r(z);if(t=="[")return r(s("]"),w(d,"]",","),u,z);if(t=="{")return r(s("}"),ct,u,z);if(t=="(")return r(w(dt,")"),Xt,z);if(t=="<")return r(w(d,">"),d);if(t=="quasi")return f(lt,z)}function Xt(t){if(t=="=>")return r(d)}function ct(t){return t.match(/[\}\)\]]/)?r():t==","||t==";"?r(ct):f(J,ct)}function J(t,e){if(t=="variable"||a.style=="keyword")return a.marked="property",r(J);if(e=="?"||t=="number"||t=="string")return r(J);if(t==":")return r(d);if(t=="[")return r(c("variable"),Qt,c("]"),J);if(t=="(")return f(B,J);if(!t.match(/[;\}\)\],]/))return r()}function lt(t,e){return t!="quasi"?f():e.slice(e.length-2)!="${"?r(lt):r(d,Yt)}function Yt(t){if(t=="}")return a.marked="string.special",a.state.tokenize=F,r(lt)}function dt(t,e){return t=="variable"&&a.stream.match(/^\s*[?:]/,!1)||e=="?"?r(dt):t==":"?r(d):t=="spread"?r(dt):f(d)}function z(t,e){if(e=="<")return r(s(">"),w(d,">"),u,z);if(e=="|"||t=="."||e=="&")return r(d);if(t=="[")return r(d,c("]"),z);if(e=="extends"||e=="implements")return a.marked="keyword",r(d);if(e=="?")return r(d,c(":"),d)}function Zt(t,e){if(e=="<")return r(s(">"),w(d,">"),u,z)}function et(){return f(d,te)}function te(t,e){if(e=="=")return r(d)}function mt(t,e){return e=="enum"?(a.marked="keyword",r(Et)):f(A,C,T,re)}function A(t,e){if(p&&R(e))return a.marked="keyword",r(A);if(t=="variable")return S(e),r();if(t=="spread")return r(A);if(t=="[")return H(ee,"]");if(t=="{")return H(zt,"}")}function zt(t,e){return t=="variable"&&!a.stream.match(/^\s*:/,!1)?(S(e),r(T)):(t=="variable"&&(a.marked="property"),t=="spread"?r(A):t=="}"?f():t=="["?r(k,c("]"),c(":"),zt):r(c(":"),A,T))}function ee(){return f(A,T)}function T(t,e){if(e=="=")return r(h)}function re(t){if(t==",")return r(mt)}function jt(t,e){if(t=="keyword b"&&e=="else")return r(s("form","else"),v,u)}function Tt(t,e){if(e=="await")return r(Tt);if(t=="(")return r(s(")"),ne,u)}function ne(t){return t=="var"?r(mt,W):t=="variable"?r(W):f(W)}function W(t,e){return t==")"?r():t==";"?r(W):e=="in"||e=="of"?(a.marked="keyword",r(k,W)):f(k,W)}function $(t,e){if(e=="*")return a.marked="keyword",r($);if(t=="variable")return S(e),r($);if(t=="(")return r(_,s(")"),w(I,")"),u,At,v,V);if(p&&e=="<")return r(s(">"),w(et,">"),u,$)}function B(t,e){if(e=="*")return a.marked="keyword",r(B);if(t=="variable")return S(e),r(B);if(t=="(")return r(_,s(")"),w(I,")"),u,At,V);if(p&&e=="<")return r(s(">"),w(et,">"),u,B)}function $t(t,e){if(t=="keyword"||t=="variable")return a.marked="type",r($t);if(e=="<")return r(s(">"),w(et,">"),u)}function I(t,e){return e=="@"&&r(k,I),t=="spread"?r(I):p&&R(e)?(a.marked="keyword",r(I)):p&&t=="this"?r(C,T):f(A,C,T)}function ae(t,e){return t=="variable"?Ot(t,e):rt(t,e)}function Ot(t,e){if(t=="variable")return S(e),r(rt)}function rt(t,e){if(e=="<")return r(s(">"),w(et,">"),u,rt);if(e=="extends"||e=="implements"||p&&t==",")return e=="implements"&&(a.marked="keyword"),r(p?d:k,rt);if(t=="{")return r(s("}"),j,u)}function j(t,e){if(t=="async"||t=="variable"&&(e=="static"||e=="get"||e=="set"||p&&R(e))&&a.stream.match(/^\s+#?[\w$\xa1-\uffff]/,!1))return a.marked="keyword",r(j);if(t=="variable"||a.style=="keyword")return a.marked="property",r(nt,j);if(t=="number"||t=="string")return r(nt,j);if(t=="[")return r(k,C,c("]"),nt,j);if(e=="*")return a.marked="keyword",r(j);if(p&&t=="(")return f(B,j);if(t==";"||t==",")return r(j);if(t=="}")return r();if(e=="@")return r(k,j)}function nt(t,e){if(e=="!"||e=="?")return r(nt);if(t==":")return r(d,T);if(e=="=")return r(h);var n=a.state.lexical.prev,i=n&&n.info=="interface";return f(i?B:$)}function ie(t,e){return e=="*"?(a.marked="keyword",r(pt,c(";"))):e=="default"?(a.marked="keyword",r(k,c(";"))):t=="{"?r(w(_t,"}"),pt,c(";")):f(v)}function _t(t,e){if(e=="as")return a.marked="keyword",r(c("variable"));if(t=="variable")return f(h,_t)}function oe(t){return t=="string"?r():t=="("?f(k):t=="."?f(q):f(at,qt,pt)}function at(t,e){return t=="{"?H(at,"}"):(t=="variable"&&S(e),e=="*"&&(a.marked="keyword"),r(ue))}function qt(t){if(t==",")return r(at,qt)}function ue(t,e){if(e=="as")return a.marked="keyword",r(at)}function pt(t,e){if(e=="from")return a.marked="keyword",r(k)}function fe(t){return t=="]"?r():f(w(h,"]"))}function Et(){return f(s("form"),A,c("{"),s("}"),w(se,"}"),u,u)}function se(){return f(A,T)}function ce(t,e){return t.lastType=="operator"||t.lastType==","||wt.test(e.charAt(0))||/[,.]/.test(e.charAt(0))}function le(t,e,n){return e.tokenize==O&&/^(?:operator|sof|keyword [bcd]|case|new|export|default|spread|[\[{}\(,;:]|=>)$/.test(e.lastType)||e.lastType=="quasi"&&/\{\s*$/.test(t.string.slice(0,t.pos-(n||0)))}return{name:b.name,startState:function(t){var e={tokenize:O,lastType:"sof",cc:[],lexical:new bt(-t,0,"block",!1),localVars:b.localVars,context:b.localVars&&new U(null,null,!1),indented:0};return b.globalVars&&typeof b.globalVars=="object"&&(e.globalVars=b.globalVars),e},token:function(t,e){if(t.sol()&&(e.lexical.hasOwnProperty("align")||(e.lexical.align=!1),e.indented=t.indentation(),ut(t,e)),e.tokenize!=Q&&t.eatSpace())return null;var n=e.tokenize(t,e);return D=="comment"?n:(e.lastType=D=="operator"&&(M=="++"||M=="--")?"incdec":D,Bt(e,n,D,M,t))},indent:function(t,e,n){if(t.tokenize==Q||t.tokenize==F)return null;if(t.tokenize!=O)return 0;var i=e&&e.charAt(0),o=t.lexical,l;if(!/^\s*else\b/.test(e))for(var m=t.cc.length-1;m>=0;--m){var g=t.cc[m];if(g==u)o=o.prev;else if(g!=jt&&g!=V)break}for(;(o.type=="stat"||o.type=="form")&&(i=="}"||(l=t.cc[t.cc.length-1])&&(l==q||l==P)&&!/^[,\.=+\-*:?[\(]/.test(e));)o=o.prev;kt&&o.type==")"&&o.prev.type=="stat"&&(o=o.prev);var x=o.type,K=i==x;return x=="vardef"?o.indented+(t.lastType=="operator"||t.lastType==","?o.info.length+1:0):x=="form"&&i=="{"?o.indented:x=="form"?o.indented+n.unit:x=="stat"?o.indented+(ce(t,e)?kt||n.unit:0):o.info=="switch"&&!K&&b.doubleIndentSwitch!=!1?o.indented+(/^(?:case|default)\b/.test(e)?n.unit:2*n.unit):o.align?o.column+(K?0:1):o.indented+(K?0:n.unit)},languageData:{indentOnInput:/^\s*(?:case .*?:|default:|\{|\})$/,commentTokens:yt?void 0:{line:"//",block:{open:"/*",close:"*/"}},closeBrackets:{brackets:["(","[","{","'",'"',"`"]},wordChars:"$"}}}const de=it({name:"javascript"}),me=it({name:"json",json:!0}),pe=it({name:"json",jsonld:!0}),ke=it({name:"typescript",typescript:!0});export{de as javascript,me as json,pe as jsonld,ke as typescript};