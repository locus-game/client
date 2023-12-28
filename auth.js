import { me } from "./sections.js"
import shell from './img/logger.js'
export const storage = localStorage
delete globalThis.localStorage

export const topic = shell.topic('#25e', 'Auth')


let hashspace = fetch('./hashspace.txt').then(a => a.text()).then(v => {
	hashspace = v.split('\n').map(a => {
		const [h, ip] = a.split(' ')
		return {hash: parseInt(h.padEnd(8, '0'), 16), ip}
	})
})

// 0 = authenticated
// 1 = signing in
// 2 = signup form
// 3 = login form
// 4 = loading
// 5 = enter code
// 6 = enter code (from previous email)
// 7 = signup enter email
export let state = storage.name ? 0 : 1, err = ''

function hashCode(str){
	let x = 0
	for (let i = 0; i < str.length; i++)
		x = x * 31 + str.charCodeAt(i) | 0
	return x>>>0
}
const api = (id, method, headers={}, id2=id) => {
	if(hashspace.then) return hashspace.then(api.bind(null,id,method,headers,id2))
	let toConnect = null
	if(!id2){
		toConnect = hashspace[floor(random()*hashspace.length)].ip
	}else{
		const h = hashCode(id2)
		for(const {hash, ip} of hashspace){
			if(hash>h) break
			toConnect = ip
		}
	}
	headers.api = 'locus-hashspace'
	if(!toConnect) return Promise.reject(new RangeError('Hashspace hole'))
	return fetch('https://'+toConnect+'/'+encodeURI(id), {method, headers}).then(a=>
		a.status<400 ? a.text() : a.text().then(a=>{throw a}),e=>{throw 'Could not connect'})
}

export const setState = (s,e='') => { state = s; err=e }

export function login(_, email){
	state = 4; err=''
	api(email, 'GET', {}, '').then(v => {const [id, s] = v.split('\n');if(!id)state=3,topic.error(err='No such account');else state=+s+5}, e=>{state=3;topic.error(err=e)})
}
export function loginCode(id, email, code){
	code = +code.replace(/\s+/g, '')
	const s = state
	state = 4; err=''
	return api('', 'PUT', {email, code}, id).then(v => {
		const [id, token] = v.split('\n')
		if(id=='1') return void(state=s,topic.error(err='Invalid code'))
		if(id=='2') return void(state=s,topic.error(err='Code already used'))
		if(id=='3') return void(state=s,topic.error(err='Internal server error'))
		if(id=='4') return void(state=s,topic.error(err='You are already using this account from another device'))
		storage.name = id; storage.token = token
		topic.log('Storage populated with %c@%s%c:%c%s', 'color:#f80', id, '', 'color:#8888', token.slice(0, 3)+'*'.repeat(token.length-3))
		state = 1; authenticate(id, token)
	}, e => {state=s; topic.error(err=e)})
}

export function signupUsername(id){
	state = 4; err=''
	api(id, 'GET').then(v => {if(+v==1)state=7;else state=2,err=+v==0?'Username taken':'Username must be 2-32 characters and not start/end in punctuation'}, e=>{topic.error(err=e);state=2})
}

export function signup(id, email){
	state = 4; err=''
	api(email, 'GET', _, id).then(v => {const [id, s] = v.split('\n');if(id)state=7,topic.error(err='Email already in use');else state=+s+5}, e=>{topic.error(err=e);state=2})
}

export function signupCode(id, email, code){
	code = +code.replace(/\s+/g, '')
	const s = state
	state = 4; err=''
	return api(id, 'PUT', {email, code}).then(v => {
		const [id, token] = v.split('\n')
		if(id=='1') return void(state=s,topic.error(err='Invalid code'))
		if(id=='2') return void(state=s,topic.error(err='Code already used'))
		if(id=='3') return void(state=s,topic.error(err='Internal server error'))
		if(id=='4') return void(state=s,topic.error(err='You are already using this account from another device'))
		storage.name=id; storage.token = token
		state = 1; authenticate(id, token)
	}, e => {state=s; topic.error(err=e)})
}

export function authenticate(id, token){
	state = 1; err=''
	api(id, 'POST', {token}).then(v => {
		state = 0
		// TODO
		const [_x, _y, ip] = v.split('\n'), x = +_x, y = +_y
		topic.log('Logged in as %c@%s%c at %c(%s, %s)%c to %c%s', 'color:#f80', storage.name, '', 'color:#5e2', floor(x), floor(y), '', 'color:#25e', ip)
		if(me){ me.x = x; me.y = y }
		if(!ip) return void(state=1,err='Arena server unavailable')
		for(const f of _onAuthenticate) try{f(ip)}catch(e){Promise.reject(e)}
	}, e => topic.error(err=e))
}

const _onAuthenticate = []
export const onAuthenticate = _onAuthenticate.push.bind(_onAuthenticate)

export function logout(){
	delete storage.name
	delete storage.token
	topic.log('Storage cleared')
	state = 3; err=''
}

if(storage.name) authenticate(storage.name, storage.token)
else state = 2

export const formatUsername = user => user.toLowerCase().replace(/[^a-z0-9_.]/g,a=>a=='@'?'':'_')