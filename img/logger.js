const d = ('OffscreenCanvas' in globalThis ? new OffscreenCanvas(0,0) : document.createElement('canvas')).getContext('2d')
if(d.canvas.width) d.canvas.width=d.canvas.height=0
function toL(s){
	if(s==='#0000') return 0
	d.fillStyle = s
	s = d.fillStyle
	if(s[0]=='#'){
		const i = parseInt(s.slice(1),16)
		return ((i&255)+(i>>8&255)+(i>>16))/765
	}else{
		const [a,b,c] = s.slice(5, -1).split(',')
		return (+a+ +b+ +c)/765
	}
}
const SHADOW = 'filter' in d ? '-0.24em -0.5em,-0.24em 0.5em,-0.5em 0' : '-0.22em -0.6em,-0.22em 0.45em,-0.05em 0.17em,-0.05em -0.32em,-0.21em -0.05em,0.09em -0.08em'
class Topic{
	constructor(c='#0000',t,p){
		this.t=t;this.c=c||'#0000';this.p=p
		this.b=toL(c)>=0.5
	}
	topic(c='#0000',t){return new Topic(c,t,this.c?this:null)}
	color(c='#0000', m){
		let t = this, ot = null
		let s='', r = []
		while(t){
			s='%c'+t.t+'%c⧫'+s;r.push('display:inline-block;padding:.2em .2em .25em 0;text-shadow:'+SHADOW+';color:'+t.c+';background:'+(ot?ot.c:c),'display:inline-block;padding:.2em .2em .25em .2em;background:'+t.c+(t.b?';color:#000':';color:#fff'))
			ot=t; t=t.p
		}
		r.reverse()
		r[0]+=';border-radius:.6em 0 0 .6em;padding-left:.8em'
		r.push('display:inline-block;padding:.2em .8em .25em .2em;border-radius:0 .6em .6em 0;background:'+c+(toL(c)>=0.5?';color:#000':';color:#fff'))
		console.log(s+'%c'+m,...r)
	}
	log(st, ...a){
		if(!this.c) return console.log(...a)
		let t = this, ot = null
		let s='', r = []
		while(t){
			s='%c'+t.t+'%c⧫'+s;r.push('display:inline-block;padding:.2em .2em .25em 0;text-shadow:'+SHADOW+';color:'+t.c+';background:'+(ot?ot.c:'#0000'),'display:inline-block;padding:.2em .2em .25em .2em;background:'+t.c+(t.b?';color:#000':';color:#fff'))
			ot=t; t=t.p
		}
		r.reverse()
		r[0]+=';border-radius:.6em 0 0 .6em;padding-left:.8em'
		r.push('display:inline-block;padding-left:.25em')
		console.log(s+'%c'+st,...r,...a)
	}
	warn(a){this.c?this.color('#fa0d',a):console.log('%c%s', 'padding: .2em .8em .25em .8em; background:#fa0d;color:#fff;border-radius:.4em', a)}
	error(a){this.c?this.color('#f00d',a):console.log('%c%s', 'padding: .2em .8em .25em .8em; background:#f00d;color:#fff;border-radius:.4em', a)}
	info(a){this.c?this.color('#0f0d',a):console.log('%c%s', 'padding: .2em .8em .25em .8em; background:#0f0d;color:#fff;border-radius:.4em', a)}
	run(a,...r){
		const t = this.c?this:Topic.prototype
		try{t.info(a(...r))}catch(e){t.error(e)}
	}
}
console.topic = (c,t) => new Topic(c,t,undefined)

export default Topic.prototype