export class Section{
	objects = []
	ws = null
	sx = 0; sy = 0
}


export const sections = new Map
export const objects = new Set

export function place(object){
	const sx = floor(object.x/1024)>>>0, sy = floor(object.y/1024)>>>0
	if(object.section && object.section.sx == sx && object.section.sy == sy) return
	const s = sections.get(BigInt(sx)|BigInt(sy*4294967296))
	if(!s){
		const s = object.section
		if(!s) return
		if(object.x != (object.x = max(s.sx*1024, min(s.sx*1024+1023.984375, object.x)))) object.dx = object.dx*-0.5
		if(object.y != (object.y = max(s.sy*1024, min(s.sy*1024+1023.984375, object.y)))) object.dy = object.dy*-0.5
		return
	}
	if(s === object.section) return
	if(object.section) object.section.objects.delete(object)
	s.objects.push(object)
	object.section = s
}
export function remove(object){
	if(!object.section) return
	object.section.objects.delete(object)
	objects.delete(object)
}

export const planets = new Map
export let me = null
export const setMe = e => me = e

export function addPlanet(p){
	const k = BigInt(round(p.x*64)+140737488355328)|BigInt((round(p.y*64)+140737488355328)*281474976710656)
	planets.set(k, p)
}
export function rmPlanet(x, y){
	const k = BigInt(round(x*64)+140737488355328)|BigInt((round(y*64)+140737488355328)*281474976710656)
	planets.delete(k)
}