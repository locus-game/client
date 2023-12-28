import { render as worldRender, stars } from './renderWorld.js'
import { authenticate, err, formatUsername, login, loginCode, logout, setState, signup, signupCode, signupUsername, state, storage } from './auth.js'
import * as world from './world.js'
import { me } from './sections.js'
import { meWs } from './socket.js'
globalThis.world = world
export const title = 'Locus'
export const icon = ['./img/icon32.png', './img/icon128.png']

const emailInput = Input('', 'email'), usernameInput = Input(''), codeInput = Input('', 'one-time-code')
let isLoggingIn = false
usernameInput.onenter = () => signupUsername(usernameInput.value)
emailInput.onenter = () => ((isLoggingIn = state != 7) ? login : signup)(usernameInput.value, emailInput.value)
codeInput.onenter = () => (isLoggingIn ? loginCode : signupCode)(usernameInput.value, emailInput.value, codeInput.value)
let lastState = -1, frame = 0
const screens = {
	1(w, h){
		if(err){
			this.fillStyle = '#f00'
			this.fillText(err, w/2, h/2, 48)
			if(this.button(0, 0, w, h)) authenticate(storage.name, storage.token)
			return
		}
		this.fillText('Authenticating...', w/2, h/2, 48)
	},
	2(w, h){
		if(!frame && err){
			usernameInput.selectionStart = 0
			usernameInput.selectionEnd = usernameInput.value.length
			usernameInput.focus()
		}
		usernameInput.format(formatUsername)
		this.translate(w/2,min(h-40, h/2+60))
		this.fillText('Welcome', 0, 10, 48)
		this.fillStyle = '#25ec'
		this.fillText('log in', 0, -24, 24)
		const {left, bottom, width, height} = this.measureText('log in', 24)
		if(this.button(-left, -24-bottom, width, height))
			setState(3)
		this.fillStyle = '#ffff'
		const mw = min(w-20, 400)
		this.textAlign = 'left'
		this.textBaseline = 'middle'
		this.push()
			this.translate(max(-200, 10-w/2), -120)
			this.fillRect(0, 0, mw, -5)
			this.save()
			this.font = DEFAULT_FONT
			this.input(usernameInput, 0, 0, mw, 40, 24)
			this.globalAlpha = usernameInput.value?1:.5
			this.scissor(0, 0, mw, 40)
			this.fillText(usernameInput.value||'Pick a username ↵', -usernameInput.scrollLeft, 20, 24)
			this.restore()
			this.globalAlpha = 1
			this.fillStyle = '#f00'
			this.textAlign = 'center'
			this.fillText(err, mw/2, -40, 20, 20, w)
		this.pop()
	},
	3(w, h){ screens[7].call(this, w, h, true) },
	4(w, h){
		if(err){
			this.fillStyle = '#f00'
			this.fillText(err, w/2, h/2+50, 30)
			return
		}
		const {left} = this.measureText('Loading...', 48)
		this.textAlign = 'left'
		this.fillText('Loading'+'.'.repeat(min(3, max(0, floor(t*10)%8-2))), w/2-left, h/2, 48)
	},
	5(w, h, reuse = false){
		if(!frame && err){
			codeInput.selectionStart = 0
			codeInput.selectionEnd = codeInput.value.length
			codeInput.focus()
		}
		this.translate(w/2,min(h-40, h/2+60))
		this.fillText(reuse ? 'We recently sent you a code via email. Enter it' : 'Enter the code we\'ve sent to your email', 0, 0, 30)
		const mw = min(w-20, 400)
		this.textAlign = 'left'
		this.textBaseline = 'middle'
		this.push()
			this.translate(max(-200, 10-w/2), -120)
			this.fillRect(0, 0, mw, -5)
			this.save()
			this.font = DEFAULT_FONT
			this.input(codeInput, 0, 0, mw, 40, 24)
			this.globalAlpha = codeInput.value?1:.5
			this.scissor(0, 0, mw, 40)
			this.fillText(codeInput.value||'Enter code ↵', -codeInput.scrollLeft, 20, 24)
			this.restore()
			this.globalAlpha = 1
			this.fillStyle = '#f00'
			this.textAlign = 'center'
			this.fillText(err, mw/2, -40, 20)
		this.pop()
	},
	6(w, h){ screens[5].call(this, w, h, true) },
	7(w, h, login = false){
		if(!frame && err){
			emailInput.selectionStart = 0
			emailInput.selectionEnd = emailInput.value.length
			emailInput.focus()
		}
		this.translate(w/2,min(h-40, h/2+60))
		this.fillText(login ? 'Enter your email to log in' : 'To protect against bots, please enter an email', 0, 10, 30)
		this.globalAlpha = 0.5
		this.fillText(login ? '' : 'We\'ll send you a code to verify, we do not send you junk', 0, -14, 20)
		this.globalAlpha = 1
		this.fillStyle = '#25ec'
		const str = login ? 'create a new account' : 'back'
		this.fillText(str, 0, login?-30:-50, 22)
		const {left, bottom, width, height} = this.measureText(str, 22)
		if(this.button(-left, (login?-30:-50)-bottom, width, height))
			setState(2)
		this.fillStyle = '#ffff'
		const mw = min(w-20, 400)
		this.textAlign = 'left'
		this.textBaseline = 'middle'
		this.push()
			this.translate(max(-200, 10-w/2), -120)
			this.fillRect(0, 0, mw, -5)
			this.save()
			this.font = DEFAULT_FONT
			this.input(emailInput, 0, 0, mw, 40, 24)
			this.globalAlpha = emailInput.value?1:.5
			this.scissor(0, 0, mw, 40)
			this.fillText(emailInput.value||'Enter email ↵', -emailInput.scrollLeft, 20, 24)
			this.restore()
			this.globalAlpha = 1
			this.fillStyle = '#f00'
			this.textAlign = 'center'
			this.fillText(err, mw/2, -40, 20)
		this.pop()
	},
	0(w, h){
		this.fillStyle = '#000'
		this.textAlign = 'left'
		const {width} = this.measureText('log out', 20)
		this.fillText('log out', w-width-10, h-50, 20)
		if(this.button(w-width-10,h-50,width,20)) logout()
		this.textAlign = 'right'; this.fillStyle = '#00f'
		const f = this.font; this.font = DEFAULT_FONT
		this.fillText(storage.name, w-12, h-25, 20)
		this.font = f; this.textAlign = 'center'	
		if(err){
			this.fillStyle = '#f00'
			this.fillText(err, w/2, h/6, 36)
		}else{
			this.fillStyle = '#fffc'
			this.fillText(meWs ? 'tap to start' : 'connecting...', w/2, h/6, 48)
			if(meWs && this.button(0, 0, w, h)){
				setState(-1)
				meWs.send(new Uint8Array(0))
				if(me){
					world.cam.z = 1/32
					world.cam.x = me.x; world.cam.y = me.y+h/256+.9375
				}
			}
		}
	}
}
const g = ctx.createLinearGradient(0, 0, 1, 0)
g.addColorStop(0, '#fff') // White
g.addColorStop(1/3, '#0cf') // Cyan
g.addColorStop(1, '#0cf0') // Cyan transparent

const FONT = await Font('/assets/HalogenbyPixelSurplus-Regular.otf')

let inLightSpeedShipY = 0
export function render(w, h){
	this.font = FONT
	if(state != lastState) frame = 0, lastState = state
	else frame++
	if(state in screens){
		inLightSpeedShipY += (!state - inLightSpeedShipY) * min(1, dt*4)
		this.fillStyle = '#fff'
		this.textAlign = 'center'
		this.push()
		screens[state].call(this, w, h)
		this.peek()
		//this.globalAlpha = sin(t*2)/8+.6
		this.fillStyle = g
		const W = w/10+100, W_2 = 4/W
		this.translate(floor(random()*9)-4, 0)
		this.scale(W, 1)
		this.fillRect(-W_2, 0, 1+W_2, h)
		this.peek()
		this.translate(w+floor(random()*9)-4, 0)
		this.scale(-W, 1)
		this.fillRect(-W_2, 0, 1+W_2, h)
		if(me){
			this.peek()
			this.translate(w/2 + sin(t*PI2),h*(.25+inLightSpeedShipY/8)+cos(t*10)-30)
			this.scale(32, 32)
			me.tick(dt)
			me.render(this)
			this.globalAlpha = max(0, 1-abs(me.animation))
			this.translate(0, 0.25-me.radius)
			this.scale(.35,2)
			this.beginPath()
			this.moveTo(-0.5,-1)
			this.lineTo(0.5,-1)
			this.lineTo(1,0)
			this.lineTo(-1,0)
			this.closePath()
			this.rotate(PI/2)
			this.fillStyle = g
			this.fill()
		}
		this.pop()
		this.globalAlpha = 1
		this.fillStyle = '#000'
		this.fillRect(0,0,w,h)
		return
	}
	this.translate(w/2, h/2)
	this.font = DEFAULT_FONT
	worldRender.call(this)
}