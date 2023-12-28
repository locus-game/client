import { Planet, cam } from "./world.js"
import { me, planets, sections, setMe } from './sections.js'

const statsIcon = Tex('/assets/ui/stats.png'), cinematicIcon = Tex('/assets/ui/cinematic.png')
const mapIcon = Tex('/assets/ui/map.png'), gridIcon = Tex('/assets/ui/grid.png')

export let ui = 0
let buttonAlpha = 1
let ci = 0
export function uiDraw(x, y, h){
	if(buttonAlpha>0.99) buttonAlpha -= dt/(ui == 3 ? 50 : 200)
	else buttonAlpha -= dt * (ui == 3 ? 2 : 1)
	if(buttonAlpha < 0) buttonAlpha = 0
	if(abs(mouse.dx)+abs(mouse.dy)>250*dt) buttonAlpha = 1
	if(buttons.pop(KEYS.TAB)) ui = (ui + 1) % 4

	this.fillStyle = '#fff'

	if(this.button(x, y, h, h)) ui = 0
	this.globalAlpha = buttonAlpha / (2 - (ui == 0))
	this.image(statsIcon, x, y, h, h)

	if(this.button(x+h*1.25, y, h, h)) ui = 1
	this.globalAlpha = buttonAlpha / (2 - (ui == 1))
	this.image(mapIcon, x+h*1.25, y, h, h)

	if(this.button(x+h*2.5, y, h, h)) ui = 2
	this.globalAlpha = buttonAlpha / (2 - (ui == 2))
	this.image(gridIcon, x+h*2.5, y, h, h)

	if(this.button(x+h*3.75, y, h, h)) ui = 3
	this.globalAlpha = buttonAlpha / (2 - (ui == 3))
	this.image(cinematicIcon, x+h*3.75, y, h, h)
	this.globalAlpha = 1
}

export function renderGrid(xmin, ymin, xmax, ymax, cam){
	xmin += cam.x; ymin += cam.y; xmax += cam.x; ymax += cam.y
	this.fillStyle = '#fff8'
	this.textAlign = 'right'
	const detail = 10**floor(log10(cam.zoom/.02)), digits = max(0, -1-log10(detail))
	const xmaxf = floor(xmax/detail+1)*detail, ymaxf = floor(ymax/detail+1)*detail
	for(let x = floor(xmin/detail)*detail; x < xmaxf; x+=detail){
		const xm = round((x/detail%1000+1000)%1000)
		this.globalAlpha = !xm?1:xm%100==0?0.75:xm%10==0?0.5:0.25
		this.fillRect(x-detail/40-cam.x,ymin-cam.y,detail/20,ymax-ymin)
		if(this.globalAlpha>0.25){
			this.rotate(PI/2)
			this.fillText(x.toFixed(digits), -(ymin+.25)+cam.y, x-cam.x, 15*cam.zoom)
			this.rotate(-PI/2)
		}
	}
	this.textAlign = 'left'
	for(let y = floor(ymin/detail)*detail; y < ymaxf; y+=detail){
		const ym = round((y/detail%1000+1000)%1000)
		this.globalAlpha = !ym?1:ym%100==0?0.75:ym%10==0?0.5:0.25
		this.fillRect(xmin-cam.x,y-detail/40-cam.y,xmax-xmin,detail/20)
		if(this.globalAlpha>0.25) this.fillText(y.toFixed(digits), xmin+.25-cam.x, y-cam.y, 15*cam.zoom)
	}
	this.fillStyle = '#8f0'
	this.globalAlpha = 1
	const thickness = cam.zoom
	const E = 1024
	const xmaxf2 = (floor(xmax/E)+1)*E, ymaxf2 = (floor(ymax/E)+1)*E
	for(let x = ceil(xmin/E)*E; x < xmaxf2; x+=E)
		this.fillRect(x-thickness-cam.x,ymin-cam.y,thickness*2,ymax-ymin)
	for(let y = ceil(ymin/E)*E; y < ymaxf2; y+=E)
		this.fillRect(xmin-cam.x,y-thickness-cam.y,xmax-xmin,thickness*2)
}

export function renderMap(x, y, wh, SIGHT = 1024){
	if(me){
		this.textAlign = 'left'
		this.textBaseline = 'bottom'
		this.fillStyle = '#fff'
		this.textAlign = 'right'
		this.fillText('('+(round(me.x)).toLocaleString().replace(/[.,]/g,' ')+',', x+wh,y-20, 16)
		this.textAlign = 'left'
		this.fillText(' '+(round(me.y)).toLocaleString().replace(/[.,]/g,' ')+')', x+wh, y-20, 16)
	}
	this.save()
	this.translate(x+wh,y+wh)
	if(me && !me.landed){
		this.rotate(me.f)
		this.beginPath()
		this.fillStyle = '#5e2'
		this.moveTo(0, 6)
		this.lineTo(6, -6)
		this.lineTo(0, -3)
		this.lineTo(-6, -6)
		this.closePath()
		this.fill()
		this.rotate(-me.f)
	}
	this.scale(wh/SIGHT, wh/SIGHT)
	this.beginPath()
	this.ellipse(0, 0, SIGHT, SIGHT, 0, 0, PI2)
	this.clip()
	const mex = me ? me.x : 0, mey = me ? me.y : 0
	for(const p of planets.values()){
		this.fillStyle = me?.landed == p ? '#08f' : p.flags & Planet.SUPERHOT ? '#f80' : '#fff'
		this.beginPath()
		this.ellipse(p.x - mex, p.y - mey, p.radius, p.radius, 0, 0, PI2)
		this.closePath()
		this.fill()
	}
	{
		const x1 = floor((mex+SIGHT)/1024)+1, y0 = floor((mey-SIGHT)/1024), y1 = floor((mey+SIGHT)/1024)+1
		for(let x = floor((mex-SIGHT)/1024); x < x1; x++)
			for(let y = y0; y < y1; y++){
				if(sections.has(BigInt(x>>>0)|BigInt((y>>>0)*4294967296))) continue
				this.fillStyle = '#f004'
				this.fillRect(x*1024-mex,y*1024-mey,1024,1024)
			}
	}
	this.fillStyle = '#8884'
	this.fillRect(-SIGHT, -SIGHT, SIGHT*2, SIGHT*2)
	this.restore()
}