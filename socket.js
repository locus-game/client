import { onAuthenticate, setState, state, storage } from "./auth.js"
import { DataReader, DataWriter } from 'https://unpkg.com/dataproto/index.js'
import { objects, place, remove, sections, Section, me, setMe, rmPlanet, addPlanet, planets } from "./sections.js"
import { Ship, Obj, Planet } from "./world.js"
import shell from '/img/logger.js'
let meid = -1
const packets = {
	2(buf){
		meid = buf.uint32() + buf.uint16()*4294967296
		const o = this.objectMap.get(meid)
		if(o) setMe(o)
	},
	15(buf){
		while(buf.left){
			const sock = sockets.get(buf.string())
			const oldId = buf.uint32() + buf.uint16()*4294967296, newId = buf.uint32() + buf.uint16()*4294967296
			const o = sock.objectMap.get(oldId)
			if(!o) continue
			o.id = newId
			sock.objectMap.delete(oldId)
			this.objectMap.set(newId, o)
			if(o === me) meid = newId
		}
	},
	16(buf){
		// Entity data
		while(buf.left){
			const mv = buf.byte()
			const id = buf.uint32() + buf.uint16()*4294967296
			let o = this.objectMap.get(id)
			if(!mv){ this.objectMap.delete(id); o&&remove(o); continue }
			a: if(mv&8){
				const kind = buf.byte(), name = buf.string()
				if(o && kind == o.kind){ o.name = name }else{
					const o2 = o
					o = kind ? new Ship() : new Obj()
					o.id = id; o.name = name
					this.objectMap.set(id, o); objects.add(o)
					if(o2){
						remove(o2)
						objects.delete(o2)
						o.x = o2.x; o.y = o2.y; o.f = o2.f; o.df = o2.df; o.dx = o2.dx; o.dy = o2.dy
					}
				}
				if(id === meid && o !== me) setMe(o)
			}else if(!o) o = {}
			if(mv&1) o.x = buf.double(), o.y = buf.double()
			if(mv&2) o.dx = buf.float(), o.dy = buf.float()
			if(mv&4) o.f = buf.float(), o.df = buf.float()
			if(mv&16) o.skintex = Tex(buf.string()), o.skinsize = buf.float()
		}
	},
	17(buf){
		// Section data
		const dCount = buf.flint()
		// Deleted sections
		for(let i=0;i<dCount;i++)
			sections.delete(BigInt(buf.int()>>>0)|BigInt((buf.int()>>>0)*4294967296))

		const nCount = buf.flint()
		// New sections
		for(let i=0;i<nCount;i++){
			const x = buf.int(), y = buf.int()
			const k = BigInt(x>>>0)|BigInt((y>>>0)*4294967296)
			const s = sections.get(k) ?? new Section()
			s.sx = x; s.sy = y
			s.ws = this
			sections.set(k, s)
		}

		const pDcount = buf.flint()
		// Deleted planets
		for(let i = 0; i < pDcount; i++){
			const x = buf.int(), y = buf.int(), _pos = buf.int()
			rmPlanet(x*1024+(_pos&0xffff)/64, y*1024+(_pos>>>16)/64)
		}

		const pNcount = buf.flint()
		// New planets
		for(let i = 0; i < pNcount; i++){
			const p = new Planet()
			p.decode(buf, buf.int(), buf.int())
			addPlanet(p)
		}
		this.topic.log('Sections: %c+%s%c, %c-%s%c; Planets: %c+%s%c, %c-%s%c', 'color: #0f0', nCount, '', 'color: #f00', dCount, '', 'color: #0f0', pNcount, '', 'color: #f00', pDcount, '')

		const referCount = buf.flint()
		for(let i = 0; i < referCount; i++) conn(buf.string())
	}
}

function chat(str){
	console.log(str)
}
const sockets = new Map
export let meWs = null
const topic = shell.topic('#bbb', 'WebSocket')
export function conn(ip, retry = 3){
	let ws = sockets.get(ip)
	if(ws) return ws
	const protocol = ['locus-hashspace', storage.token, '']
	if(meWs) protocol[2] = 'a'
	else protocol.pop()
	ws = new WebSocket('wss://'+ip+'/'+storage.name, protocol)
	ws.topic = topic.topic('#000', ip)
	ws.cb = []
	ws.objectMap = new Map
	sockets.set(ip, ws)
	ws.binaryType = 'arraybuffer'
	retry -= 2
	ws.onopen = () => (ws.topic.info('Connected'),retry++)
	ws.onmessage = ({data}) => {
		if(typeof data == 'string') return void chat(data)
		if(!data.byteLength){
			retry++
			for(const f of ws.cb) f(ws)
			return
		} 
		const buf = new DataReader(data)
		const fn = packets[buf.flint()]
		if(fn) try{ fn.call(ws, buf) } catch(e){ Promise.reject(buf); throw e }
	}
	ws.onclose = ({code, reason}) => {
		reason = reason || 'Disconnected'
		ws.topic.error(reason)
		sockets.delete(ip)
		if(code != 1000 && retry>=0){ const w = conn(ip, retry); w.cb = ws.cb; return w }
		else connerr(reason)
	}
	return ws
}

setInterval(() => {
	if(state >= 0 || !me.section) return
	if(me.section && me.section.ws) meWs = me.section.ws
	const d = new DataWriter(); d.byte(16)
	const mv = 7
	d.byte(mv)
	if(mv&8) d.byte(me.kind), d.string(me.name) // 1<<3
	if(mv&1) d.double(me.x), d.double(me.y) // 1<<0
	if(mv&2) d.float(me.dx), d.float(me.dy) // 1<<1
	if(mv&4) d.float(me.f), d.float(me.df) // 1<<2
	if(mv&16) d.string(me.skintex), d.float(me.skinsize)
	meWs.send(d.build())
}, 50)

export function end(){
	objects.clear()
	for(const s of sockets.values()) s.close()
	sockets.clear()
	setMe(null)
	meWs = null
	sections.clear()
	planets.clear()
}

function connerr(e){
	for(const s of sockets.values()) s.onclose=null, s.close()
	sockets.clear()
	end()
	setState(1, e)
}
export function setMeWs(a){ meWs = a }

onAuthenticate(ip => conn(ip, _).cb.push(setMeWs))