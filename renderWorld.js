import { objects, place, planets, me, sections } from "./sections.js"
import { renderGrid, renderMap, ui, uiDraw } from "./ui.js"
import { cam, iter, particles, Planet } from "./world.js"

const arrows = [Tex('/assets/ui/arrow0.png'), Tex('/assets/ui/arrow1.png')]

export const stars = Can(1024, 1024)
stars.fillStyle = '#fff'
for(let i = 0; i < 512; i++) stars.fillRect(floor(random()*1024),floor(random()*1024),1,1)
for(let i = 0; i < 64; i++) stars.fillRect(floor(random()*512)<<1,floor(random()*512)<<1,2,2)
for(let i = 0; i < 32; i++) stars.fillRect(floor(random()*256)<<2,floor(random()*256)<<2,4,4)

const borderTex = Tex('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAAXNSR0IArs4c6QAAABJJREFUGFdj+M/A4MDwn4GhAQAO/QK/7dqWrQAAAABJRU5ErkJggg')

export function render(){
	const {x: x0, y: y0} = this.at(0, 0)
	const {x: x1, y: y1} = this.at(1, 1)
	const w = (x1 - x0)/2, h = (y1 - y0)/2
	uiDraw.call(this, x0+h*.05, y1-h*.05-40, 40)
	if(ui == 1){
		renderMap.call(this, x0, y0, min(w, h, (w+h)/4))
	}else if(ui != 3){
		const wh = min(w, h, 128)
		renderMap.call(this, x1-wh*2-50, y0+50, wh)
	}
	let closestP = null, closestDist = 4
	if(me){
		for(const p of planets.values()){
			const d = (sqrt((p.x-me.x)*(p.x-me.x)+(p.y-me.y)*(p.y-me.y))-me.radius)/p.radius
			if(d<closestDist) closestP = p, closestDist = d
		}
		let targetX = me.x, targetY = me.y, targetZ = max(0.05, me.speed()/300)
		if(closestP){
			targetZ += (closestP.radius/300 - targetZ) * (4-closestDist)/3
			const limit = 2/sqrt(closestP.radius)
			const F = 0.3
			targetZ *= 1-F*(1-limit)/(max(0, closestDist-1)+F)
			const r = closestDist/2-closestDist*closestDist/10-0.4 //-0.2x^2+x-0.8
			targetX = targetX*(1-r) + closestP.x*r
			targetY = targetY*(1-r) + closestP.y*r
		}
		cam.x += (targetX - cam.x)*(1-0.001**dt)
		cam.y += (targetY - cam.y)*(1-0.001**dt)
		cam.z *= (targetZ/cam.z)**(1-0.1**dt)
		me.controls = 0
		if(presses.pop(KEYS.UP) | presses.pop(KEYS.W))
			me.controls |= 1
		if(presses.pop(KEYS.RIGHT) | presses.pop(KEYS.D))
			me.controls |= 2
		if(presses.pop(KEYS.LEFT) | presses.pop(KEYS.A))
			me.controls |= 4
	}
	cam.z2 = min(4,max(.25,cam.z2*2**(mouse.wy/500*(cam.z2<1?mouse.wy<0?1-tanh(1/cam.z2-1):1:mouse.wy>0?1-tanh(cam.z2-1):1))))
	const uiSpace = this.push()
	this.scale(1/cam.zoom,1/cam.zoom)
	const {xmin, xmax, ymin, ymax} = this.coverBox()
	{
		this.push()
		this.imageSmoothingEnabled = false
		const x1 = floor((xmax+cam.x)/1024)+1, y0 = floor((ymin+cam.y)/1024), y1 = floor((ymax+cam.y)/1024)+1
		const scale = SQRT2*1024/min(1500,round(50/cam.zoom)*4)
		for(let x = floor((xmin+cam.x)/1024); x < x1; x++)
			for(let y = y0; y < y1; y++){
				if(sections.has(BigInt(x>>>0)|BigInt((y>>>0)*4294967296))) continue
				this.fillStyle = borderTex
				this.translate(x*1024-cam.x,y*1024-cam.y)
				this.beginPath()
				this.rect(0,0,1024,1024)
				this.translate(t,t)
				this.rotate(PI/4)
				this.scale(scale,scale)
				this.closePath()
				this.fill()
				this.peek()
			}
		this.imageSmoothingEnabled = true
		this.pop()
	}
	const xr = (xmax-xmin)/2, yr = (ymax-ymin)/2
	this.push()
	for(const a of objects){
		const r = a.radius + 128
		iter(a.x - r, a.y - r, a.x + r, a.y + r, b => {
			if(b === a) return true
			let x = a.x - b.x
			let y = a.y - b.y
			let d = (x * x + y * y)
			let r = (a.radius + b.radius) * (a.radius + b.radius)
			if(d < r){
				let q = min(500, sqrt(r / d))
				a.x = b.x + x * q
				a.y = b.y + y * q
				//self and node collided
				//simplified elastic collision
				let sum = a.mass + b.mass
				let diff = a.mass - b.mass
				let newvelx = (a.dx * diff + (2 * b.mass * b.dx)) / sum
				let newvely = (a.dy * diff + (2 * b.mass * b.dy)) / sum
				b.dx = ((2 * a.mass * a.dx) - b.dx * diff) / sum
				b.dy = ((2 * a.mass * a.dy) - b.dy * diff) / sum
				//hits.append(a, a.dx, a.dy)
				a.dx = newvelx
				a.dy = newvely
			}
		})
	}
	for(const s of objects){
		s.tick(dt)
		place(s)
		const mag = 10/(s.radius/cam.zoom)
		if(s===me)s.ix = s.x, s.iy = s.y
		else{
			if(!(abs(s.x-s.ix)<16)) s.ix = s.x
			else s.ix += (s.x - s.ix) * dt*10
			if(!(abs(s.y-s.iy)<16)) s.iy = s.y
			else s.iy += (s.y - s.iy) * dt*10
		}
		const rx = s.ix - cam.x, ry = s.iy - cam.y
		if(ui != 3 && mag > 4){
			this.translate(rx, ry)
			this.scale(mag, mag)
			s.render(this)
			this.peek()
			this.translate(rx, ry)
			this.scale(mag, mag)
			if(s.name && s !== me){
				this.textAlign = 'center'
				this.textBaseline = 'middle'
				this.fillStyle = '#fff'
				this.fillText(s.name, 0, s.skinsize+1.8, 1.7)
				const {width, height} = this.measureText(s.name, 1.7)
				this.fillStyle = '#0004'
				this.fillRect(-width/2-.1, -height/2+s.skinsize+1.7, width+.2, height+.2)
			}
			this.strokeStyle = '#fff'
			this.lineWidth = 0.3
			this.beginPath()
			this.ellipse(0, 0, s.radius*2, s.radius*2, 0, 0, PI2)
			this.closePath()
			this.fillStyle = '#fff'
			this.textAlign = 'left'
			this.textBaseline = 'bottom'
			const a = mag.toFixed(1) + 'x'
			this.fillText(a, 0.5*s.radius,-1.8*s.radius, s.radius)
			this.fillStyle = '#000'
			this.fillRect(0.5*s.radius,-0.8*s.radius,s.radius*0.63*a.length,-s.radius)
			this.stroke()
			this.peek()
		}else{
			this.translate(rx, ry)
			s.render(this)
			this.peek()
			if(s.name && s !== me){
				this.textAlign = 'center'
				this.textBaseline = 'middle'
				this.fillStyle = '#fff'
				const y = ry+s.skinsize+.6
				this.fillText(s.name, rx, y, 1)
				const {width, height} = this.measureText(s.name, 1)
				this.fillStyle = '#0004'
				this.fillRect(rx-width/2-.1, y-height/2-.1, width+.2, height+.2)
			}
		}
	}
	for(const p of planets.values()){
		const dst = max(abs(p.x - cam.x) - xr, abs(p.y - cam.y) - yr)/p.radius
		this.translate(p.x-cam.x, p.y-cam.y)
		if(ui==2){
			this.beginPath()
				const r = max(0, p.radius-.5)
				this.ellipse(0, 0, r, r, 0, 0, PI2, false)
			this.closePath()
			this.strokeStyle = p.flags&Planet.SUPERHOT ? '#f80' : '#fff'
			this.lineWidth = 1
			this.stroke()
			this.beginPath()
				let s = 0
				for(const l of p.layers) if(l.size > s) s = l.size
				s = max(0, s-.25)
				this.ellipse(0, 0, s, s, 0, 0, PI2, false)
			this.closePath()
			this.lineWidth = .5
			this.strokeStyle = p.flags&Planet.SUPERHOT ? '#f00' : '#00f'
			this.stroke()
		}
		p.render(this)
		this.peek()
		if(dst > 0 && dst < 100 && ui != 3){
			let {x, y} = this.to(p.x-cam.x, p.y-cam.y)
			this.peek(uiSpace)
			void({x, y} = this.from(x, y))
			const rat = y/x
			if(abs(rat)<abs(h/w)){
				// Left/right
				const y = rat*w
				this.fillStyle = '#fff'
				if(x>0) this.translate(w,y)
				else this.translate(-w,-y)
			}else{
				// Up/down
				const x = h/rat
				this.fillStyle = '#fff'
				if(y > 0) this.translate(x,h)
				else this.translate(-x,-h)
			}
			this.rotate(atan2(x, y))
			const tex = arrows[p.flags&Planet.SUPERHOT]
			const scale = min(3/(dst+5), 0.5)
			this.scale(scale, scale)
			this.image(tex, -tex.width/2, -tex.height)
			this.peek()
		}
		p.tick(dt)
	}
	for(const particle of particles){
		particle.render(this)
		this.peek()
	}
	this.pop()
	if(ui == 2) renderGrid.call(this, xmin, ymin, xmax, ymax, cam)
	{
		for(const S of [0.615, 0.5, 0.375]){
			const z = S/cam.zoom
			if(z<0.1) continue
			this.globalAlpha = (ui == 2 ? 0.7 : 1.3) * S
			this.peek(uiSpace)
			this.scale(z,z)
			this.imageSmoothingEnabled = z*px<4
			let {xmin, xmax, ymin, ymax} = this.coverBox()
			xmin += cam.x; ymin += cam.y; xmax += cam.x; ymax += cam.y
			xmin = (xmin-((xmin)%64+64)%64); xmax = (xmax-((xmax)%64+64)%64)+64
			ymin = (ymin-((ymin)%64+64)%64); ymax = (ymax-((ymax)%64+64)%64)+64
			for(let x = xmin;x<xmax;x+=64) for(let y = ymin;y<ymax;y+=64){
				let r = (imul(round(x),0x1235)>>14&255)^(imul(round(y),0x9876)>>14&255)^imul(round(S*255),0x512F)
				r ^= r >> 2; r ^= r << 3
				this.image(stars, (r&3)<<8, ((r&12)>>2)<<8, 256, 256, x-cam.x, y-cam.y, 64, 64)
			}
		}
		this.globalAlpha = 1
		this.imageSmoothingEnabled = true
	}
	this.pop()
	this.fillStyle = '#000'
	this.fillRect(x0, y0, w*2, h*2)
}