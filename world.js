import { place, sections, planets, me, addPlanet, setMe } from "./sections.js"

export const particles = new Set
export let particle
{
	class _particle{
		constructor(x, y, s, r,g,b,a, rot){ this.time=this.t=0;this.next=null;this.x=x;this.y=y;this.r=r;this.g=g;this.b=b;this.a=a;this.s=s;this.rot=rot }
		then(delay, x, y, s, r,g,b,a, rot){ this.time = delay; return this.next = new _particle(x,y,s,r,g,b,a,rot)}
		render(c){
			this.t += dt
			if(this.t>=this.time){particles.delete(this);if(this.next) particles.add(this.next); return}
			let {x,y,r,g,b,a,s,rot} = this
			const {x:x1,y:y1,r:r1,g:g1,b:b1,a:a1,s:s1,rot:rot1} = this.next
			const p = this.t/this.time
			x=x*(1-p)+x1*p; y=y*(1-p)+y1*p; s=s*(1-p)+s1*p; rot=rot*(1-p)+rot1*p
			r=r*(1-p)+r1*p; g=g*(1-p)+g1*p; b=b*(1-p)+b1*p; a=a*(1-p)+a1*p;

			c.fillStyle = `color(display-p3 ${r} ${g} ${b} / ${a})`
			c.translate(x-cam.x, y-cam.y); c.rotate(rot)
			c.fillRect(-s/2,-s/2,s,s)
		}
	}
	particle = (a,b,c,d,e,f,g,h)=>{const p=new _particle(a,b,c,d,e,f,g,h);particles.add(p);return p}
}

export class Obj{
	x = 0; y = 0; ix = NaN; iy = NaN
	dx = 0; dy = 0
	f = 0; df = 0
	section = null; id = -1
	animation = 1
	radius = 1
	mass = 10
	name = ''
	skintex = null; skinsize = 1
	speed(){return sqrt(me.dx*me.dx+me.dy*me.dy)}
	render(c){
		c.globalAlpha = max(0, 1-abs(this.animation))
		c.rotate(this.f)
		const s = this.skinsize
		if(this.skintex) c.image(this.skintex, -s, -s, s*2, s*2)
		c.globalAlpha = 1
	}
	tick(dt){
		this.x += this.dx*dt
		this.y += this.dy*dt
		this.f += this.df*dt
		
		if(this.animation > 0) this.animation = max(0, this.animation - dt)
		else if(this.animation < 0) this.animation -= dt
	}
	kill(){
		if(this.animation>=0) this.animation = -Number.EPSILON
	}
}
Obj.prototype.kind = 0
function defaultThrustParticle(ship){
	let {ix: x, iy: y, f} = ship
	let c = cos(f), s = sin(f)
	x -= c * ship.particleOffset + s * .7
	y -= s * ship.particleOffset + c * .7
	
	let endx = ship.dx*1.5 - sin(f) * 10, endy = ship.dy*1.5 - cos(ship.f) * 10
	return particle(x, y, 0.8, 1, 1, 0, 0.9, 0)
		.then(1.5, x + endx, y + endy, 1.6, 1, 0, 0, 0, 5)
}

export class Ship extends Obj{
	thrust = 10; maxSpeed = 50; particle = _; particleOffset = 0; particleFrequency = 20
	landed = null
	controls = 0
	lastParticle = 0
	tick(dt){
		if(!this.animation){
			if(this.controls&1){
				const mult = (dt+(this.landed?0.25:0))*this.thrust
				let pushx = sin(this.f)*mult, pushy = cos(this.f)*mult
				let nx = this.dx + pushx, ny = this.dy + pushy
				let mag = sqrt(nx*nx+ny*ny)
				let targetMag = mag-this.thrust*dt*min(1, this.speed()/this.maxSpeed)
				this.dx = nx*targetMag/mag
				this.dy = ny*targetMag/mag
				const pf = 1/this.particleFrequency
				if(t - this.lastParticle > pf) this.lastParticle = t, defaultThrustParticle(this)
			}
			a: if(this.landed){
				const dx = this.x - this.landed.x, dy = this.y - this.landed.y
				if(this.dx*dx+this.dy*dy>0){ this.landed = null; break a }
				const f = atan2(dx, dy) + this.landed.df*dt
				this.x = this.landed.x + sin(f)*(this.landed.radius+this.radius)
				this.y = this.landed.y + cos(f)*(this.landed.radius+this.radius)
				this.f = f; this.df = this.dx = this.dy = 0
				return
			}
			if(this.controls&2)
				this.df = max(0, this.df + 10*dt)
			if(this.controls&4)
				this.df = min(0, this.df - 10*dt)
		}
		super.tick(dt)
		this.df *= 0.1**dt
	}
}
Ship.prototype.kind = 1

export class Planet{
	static SUPERHOT = 1
	static Layer = (path, s, r = 0) => ({tex: Tex(path), size: s, df: r})
	layers = []
	flags = 0
	x = 0; y = 0; df = 0.05
	mass = 1000; radius = 25
	render(c){
		c.rotate((now*this.df)%PI2)
		let r = 0
		for(const {tex, size, df} of this.layers){
			c.rotate(r+=((now*df%PI2)-r))
			c.image(tex, -size, -size, size*2, size*2)
		}
	}
	tick(dt){
		const g = sqrt(this.mass)*GEE
		const reach = (g**0.666666666666)*30
		iter(this.x-reach,this.y-reach,this.x+reach,this.y+reach, obj => {
			if(obj.landed) return
			const dx = obj.x - this.x, dy = obj.y - this.y
			const dist = sqrt(dx*dx+dy*dy)
			if(dist >= reach) return
			if(dist < this.radius+obj.radius-0.1){
				if(obj.landed === null &&
					obj.thrust/g*this.radius*this.radius>=36 // Gravity isn't too strong to take off
					&& !(this.flags & Planet.SUPERHOT) // Planet isn't a star or black hole
				){
					obj.landed = this
					obj.dx = obj.dy = 0
					const f = atan2(dx, dy)
					obj.x = this.x + sin(f)*(this.radius+obj.radius)
					obj.y = this.y + cos(f)*(this.radius+obj.radius)
					obj.f = f; obj.df = 0
				}else obj.kill()
				return
			}
			let atRadius = 0
			for(const c of this.layers)
				if(c.size > atRadius) atRadius = c.size
			if(dist < atRadius){
				let atDrag = (atRadius - dist) / (atRadius - this.radius - obj.radius) * this.df
				const pushx = dy * atDrag, pushy = -dx * atDrag
				const fac = max(0, (1 - (sqrt(obj.dx*pushx+obj.dy*pushy)/(dist*abs(atDrag)) || 0))*dt)
				obj.dx += pushx * fac
				obj.dy += pushy * fac
				obj.df += (1 - obj.df/this.df) * atDrag * dt
				/*
				const s = sin(atDrag), c = cos(atDrag)
				obj.x = this.x + c*dx + s*dy; obj.y = this.y + c*dy - s*dx
				obj.f += atDrag
				*/
			}
			obj.dx += -dx/dist**2.5*g
			obj.dy += -dy/dist**2.5*g
		})
	}
	decode(buf, sx, sy){
		const v = buf.flint()
		// x: f64, y: 64, mass: f32, radius: f32, flags: i32, df: f32
		const _pos = buf.int()
		this.x = (_pos>>>16)/64 + sx*1024
		this.y = (_pos&0xffff)/64 + sy*1024
		this.mass = buf.float()
		this.radius = buf.float()
		this.flags = buf.int()
		this.df = buf.float()
		let layerCount = buf.flint()
		this.layers.length = 0
		while(layerCount--)
			this.layers.push(Planet.Layer(buf.string(), buf.float(), buf.float()))
	}
}

export const cam = {x: 0, y: 0, z: .05, z2: 1, get zoom(){return this.z*this.z2}}
export function iter(xmin, ymin, xmax, ymax, cb){
	xmin = floor(xmin/1024)|0; ymin = floor(ymin/1024)|0
	xmax = ceil(xmax/1024+1)|0; ymax = ceil(ymax/1024+1)|0

	for(let x = xmin; x != xmax; x=x+1|0)
		for(let y = ymin; y != ymax; y=y+1|0){
			const s = sections.get(BigInt(x>>>0)|BigInt((y>>>0)*4294967296))
			if(s) for(const e of s.objects) if(cb(e)) return
		}
}
const GEE = 0.75

setMe(new Ship(0, 0)).skintex = Tex('/assets/ships/1.png')
/*const s = new Planet()
s.y = 1000; s.x = 400
s.radius = 60; s.mass = 10_000
s.flags |= Planet.SUPERHOT; s.df = -0.05
s.layers.push(Planet.Layer('/assets/planets/full/destroyer3.png', 200))
addPlanet(s)*/