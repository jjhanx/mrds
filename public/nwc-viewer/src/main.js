import './constants.js'
import { getLayoutMode, setZoomLevel, setLayoutMode } from './constants.js'
import { ajax } from './loaders.js'
import { decodeNwcArrayBuffer, getUseNewParser, setUseNewParser } from './nwc.js'
import { interpret } from './interpreter.js'
import { setup, resizeToFit } from './drawing.js'
import { exportLilypond } from './exporter.js'
import { score } from './layout/typeset.js'
import { blank } from './editing.js'
import { MusicContext } from './context.js'
import { PlaybackController, buildTempoMap, secondsToTicks } from './audio.js'
import { getZoomLevel } from './constants.js'

/**********************
 *
 *   Entry
 *
 **********************/

window.addEventListener('resize', () => {
	if (getLayoutMode() === 'wrap') {
		// In wrap mode, the layout depends on viewport width — must re-layout
		rerender()
	} else {
		resizeToFit()
		var scoreElm = document.getElementById('score')
		quickDraw(null, -(scoreElm?.scrollLeft || 0), -(scoreElm?.scrollTop || 0))
	}
})

if (location.hostname === 'localhost') {
	document.getElementById('debug_tools').style.display = ''
}

// everyStaveTokens().filter(t => t && t.tie)
// data.score.staves[1].tokens.filter(t => t && t.tie)
// findFirstToken(t => t && t.tie)

window.findFirstToken = (predicate) => {
	var s, t
	data.score.staves.some((stave, i) => {
		s = i
		return stave.tokens.some((token, j) => {
			if (predicate(token)) {
				t = j
				return true
			}
		})
	})

	return { s, t }
}

var samples = [
	'AChildThisDayIsBorn.nwc', // v2.02
	'AveMariaArcadelt.nwc', // v2.75
	'WakenChristianChildren.nwc', // v2.75
	'WeThreeKingsOfOrientAre.nwc', // v2.75
	'WhatChildIsThis.nwc', // v2.02
	'adohn.nwc', // v1.75 *
	'anongs.nwc', // v1.75
	'bwv140-2.nwc', // v1.75
	'carenot.nwc', // v1.75
	'jem001.nwc', // v1.55
]

var nwcSamples = ['abelp.nwc','adohn.nwc','albadag.nwc','albadagio.nwc','albast.nwc','albzargn.nwc','alleg_miscrv.nwc','anonitra.nwc','anonsp.nwc','arcmargot.nwc','aufblue.nwc','bacfuggm.nwc','bachairg.nwc','bachbra5.nwc','bachjesu.nwc','beetadag.nwc','beetfid72_3.nwc','beetfur.nwc','beethall.nwc','bellvaga.nwc','bohnpost.nwc','bortib.nwc','brah_gr_mgz-brahms4.nwc','conop9-lesson1.nwc','cortajaca.nwc','dannyboy.nwc','decnonti.nwc','dingdong.nwc','eccson_gm_1.nwc','enter.nwc','falcbeaut.nwc','faurcant.nwc','gimboda.nwc','godrest.nwc','gotzom.nwc','hand_josz-11_00-joyful.nwc','handacis-16.nwc','handalex-28.nwc','handdett-07.nwc','handjoshz-40-heroes.nwc','handjoshz-50-hail.nwc','handking-2.nwc','handmesscrv-31-lift.nwc','handsam-75_76.nwc','hanjudm-67.nwc','hanjudm-68.nwc','hansol-41.nwc','har_ohg.nwc','haydheav.nwc','haydn_hobxxiiibz-1-salve.nwc','hdn_cr05-amazd.nwc','hdn_cr33-sing.nwc','holbng.nwc','hoolchris.nwc','horhuron.nwc','hoxmas2001-2.nwc','jsb_slpz-31-ojesu.nwc','jsbjjcrv.nwc','jsbmgh.nwc','kimfflow.nwc','lachiop43.nwc','lenzlsong.nwc','liszthr2.nwc','lvb3rd1.nwc','lvb5th1.nwc','lvb9th1.nwc','lvb9th2.nwc','lynmhall.nwc','mac_xflav.nwc','mahres3.nwc','marpqam.nwc','mend_fingcovez-fc-parts.nwc','moresuno.nwc','mozflhp1.nwc','mozkv335.nwc','n_cavern_p.nwc','n_caverns1.nwc','namibia.nwc','offbold.nwc','ovegmont.nwc','palestine.nwc','pendp.nwc','penflight.nwc','perposui.nwc','rosfang.nwc','rosspms_06-quitl.nwc','rosspmsgrat.nwc','rosssoglio.nwc','rossvoce.nwc','satiegy1.nwc','schtrans.nwc','schuave.nwc','schuspri.nwc','stradpiet.nwc','suslab2.nwc','tanonshen.nwc','teddypic.nwc','test.nwc','tullplay.nwc','tulltaab.nwc','uzbekistan.nwc','vict_ommcrv.nwc','vierop16kyr.nwc','vitrtuba.nwc','wamavc.nwc','wamkv1.nwc','wamr06-conft.nwc','warnmoz.nwc']

var sample_dom = document.getElementById('samples')
samples.forEach((sample) => {
	var option = document.createElement('option')
	option.value = sample
	option.text = sample
	sample_dom.appendChild(option)
})
nwcSamples.forEach((sample) => {
	var option = document.createElement('option')
	option.value = sample
	option.text = sample
	sample_dom.appendChild(option)
})
sample_dom.onchange = function () {
	const path = samples.includes(sample_dom.value) ? 'samples/' : 'nwcs/'
	ajax(path + sample_dom.value, (buf) => processData(buf, sample_dom.value))
}

// Default loading — ?file= param loads our NWC URL (for mrds integration)
const fileParam = new URLSearchParams(location.search).get('file')
if (fileParam) {
	const url = fileParam.startsWith('/') ? location.origin + fileParam : fileParam
	setZoomLevel(0.25)
	setLayoutMode('scroll')  // 한 줄에 길게, 오른쪽으로 스크롤
	const slider = document.getElementById('zoom_slider')
	const label = document.getElementById('zoom_label')
	if (slider) slider.value = 0.25
	if (label) label.textContent = '25%'
	ajax(url, (buf) => processData(buf, fileParam.split('/').pop() || 'file.nwc'))
} else {
	ajax('samples/WhatChildIsThis.nwc', (buf) => processData(buf, 'WhatChildIsThis.nwc'))
}

// Doesn't work yet

// ajax('samples/OhWhoAreTheySoPure.nwc', processData); // EcceConcipies IShouldLikeToHaveHeard GodRestYouMerry MountainsBowYourHeadsMajestic LetMusicBreakOnThisBlestMorn RingChristmasBells OhWhoAreTheySoPure
// ajax('samples/ComeLetUsAllSweetCarolSingNwc2.nwc', processData);
// ajax('samples/AShepherdBandTheirFlocksAreKeeping.nwc', processData);
// ajax('samples/canon.nwc', processData);
// ajax('samples/prelude.nwc', processData);

// v1.5
// ajax('samples/padstow-3.nwc', processData);
// ajax('samples/Mendelssohn.nwc', processData);

// Long piece
// ajax('samples/20171110c-bl.JingleBellsOverture.nwc', processData);

const test_data = {
	score: {
		staves: [
			{
				tokens: [
					{ type: 'Clef', clef: 'treble', octave: 0 },
					{ type: 'KeySignature', key: 'Bb' },
					{ type: 'TimeSignature', signature: 'AllaBreve' },
					{ type: 'Rest', position: 0, duration: 4, dots: 0 },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-1',
						position: -1,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-2',
						position: -2,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-1',
						position: -1,
						duration: 4,
						dots: 0,
					},
					{ type: 'Barline' },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-3',
						Opts: 'Slur=Downward',
						position: -3,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-2',
						Opts: 'Slur=Downward,Lyric=Never',
						position: -2,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: 'Half',
						Pos: '-1',
						position: -1,
						duration: 2,
						dots: 0,
					},
					{ type: 'Barline' },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-1',
						position: -1,
						duration: 4,
						dots: 0,
					},
				],
			},
			{
				tokens: [
					{ type: 'Clef', clef: 'bass', octave: 0 },
					{ type: 'KeySignature', key: 'Bb' },
					{ type: 'TimeSignature', signature: 'AllaBreve' },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-3',
						position: -3,
						duration: 4,
						dots: 0,
					},
					{ type: 'Rest', position: 0, duration: 4, dots: 0 },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-6',
						position: -6,
						duration: 4,
						dots: 0,
					},
					{ type: 'Barline' },
					{
						type: 'Note',
						Dur: 'Half',
						Pos: '-3',
						position: -3,
						duration: 2,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-5',
						Opts: 'Slur=Downward',
						position: -5,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						Opts: 'Lyric=Never',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{ type: 'Barline' },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-3',
						position: -3,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-3',
						position: -3,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: 'Half',
						Pos: '-3',
						position: -3,
						duration: 2,
						dots: 0,
					},
				],
			},
		],
	},
}

const test_dot_quaver = {
	score: {
		staves: [
			{
				tokens: [
					{ type: 'Barline' },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{ type: 'Barline' },
				],
			},
			{
				tokens: [
					{ type: 'Barline' },
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 1,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 8,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{
						type: 'Note',
						Dur: '4th',
						Pos: '-4',
						position: -4,
						duration: 4,
						dots: 0,
					},
					{ type: 'Barline' },
				],
			},
		],
	},
}

/**
 * Playback — soundfont-engine
 */

const playback = new PlaybackController()

function formatTime(sec) {
	if (!isFinite(sec) || sec < 0) sec = 0
	const m = Math.floor(sec / 60)
	const s = Math.floor(sec % 60)
	return m + ':' + String(s).padStart(2, '0')
}

const playBtn = document.getElementById('play')
const stopBtn = document.getElementById('stop')
const progressBar = document.getElementById('progress_bar')
const timeLabel = document.getElementById('playback_time')

let _seeking = false

playback.onTime((t, dur) => {
	if (!_seeking) {
		progressBar.value = dur > 0 ? t / dur : 0
		// Scroll score to follow playback
		const map = window._tickToXMap
		const tempo = window._tempoMap
		let playbackX = null
		if (map?.length && tempo?.length) {
			const tick = secondsToTicks(t, tempo)
			let x = map[0].x
			if (tick <= map[0].tick) x = map[0].x
			else if (tick >= map[map.length - 1].tick) x = map[map.length - 1].x
			else {
				for (let i = 1; i < map.length; i++) {
					if (map[i].tick >= tick) {
						const a = map[i - 1], b = map[i]
						const r = (tick - a.tick) / (b.tick - a.tick)
						x = a.x + r * (b.x - a.x)
						break
					}
				}
			}
			playbackX = x
			const scoreEl = document.getElementById('score')
			if (scoreEl) {
				const zoom = getZoomLevel()
				const PLAYHEAD_PX = 60
				const targetLeft = Math.max(0, x * zoom - PLAYHEAD_PX)
				scoreEl.scrollLeft = targetLeft
				const maxLeft = scoreEl.scrollWidth - scoreEl.clientWidth
				window._playbackAtEnd = maxLeft > 10 && scoreEl.scrollLeft >= maxLeft - 2
			} else {
				window._playbackAtEnd = false
			}
		} else {
			window._playbackAtEnd = false
		}
		window._playbackX = playbackX
		if (playbackX != null && window.quickDraw) {
			const se = document.getElementById('score')
			if (se) window.quickDraw(null, -se.scrollLeft, -se.scrollTop)
		}
	} else {
		window._playbackX = null
		window._playbackAtEnd = false
	}
	timeLabel.textContent = formatTime(t) + ' / ' + formatTime(dur)
})

playback.onStateChange((playing) => {
	playBtn.textContent = playing ? 'Pause' : 'Play'
})

playback.onEnd(() => {
	playBtn.textContent = 'Play'
	progressBar.value = 0
	window._playbackX = null
	window._playbackAtEnd = false
	timeLabel.textContent = formatTime(0) + ' / ' + formatTime(playback.duration)
	const scoreEl = document.getElementById('score')
	if (scoreEl && window.quickDraw) window.quickDraw(null, -scoreEl.scrollLeft, -scoreEl.scrollTop)
})

// Voice select: multi-staff checkbox panel
function syncVoiceSelectUI() {
	const btn = document.getElementById('voice_select_btn')
	if (!btn) return
	const idx = window._selectedStaffIndices
	if (!idx || idx.length === 0) {
		btn.textContent = '전체'
	} else {
		const staves = (scoreManager.getData()?.score?.staves || [])
		const names = idx.map(i => staves[i]?.staff_label || staves[i]?.staff_name || `파트 ${i + 1}`)
		btn.textContent = names.length > 2 ? `${names.length}개 파트` : names.join(', ')
	}
}
function updateVoiceSelectFromPanel() {
	const panel = document.getElementById('voice_select_panel')
	if (!panel) return
	const allCb = panel.querySelector('[data-voice="all"]')
	const staffCbs = panel.querySelectorAll('[data-voice]:not([data-voice="all"])')
	if (allCb?.checked) {
		window._selectedStaffIndices = undefined
		staffCbs.forEach(cb => { cb.checked = false })
	} else {
		const idx = []
		staffCbs.forEach(cb => {
			if (cb.checked) idx.push(parseInt(cb.value, 10))
		})
		window._selectedStaffIndices = idx.length > 0 ? idx : undefined
		if (idx.length > 0) {
			allCb.checked = false
		} else {
			allCb.checked = true
		}
	}
	syncVoiceSelectUI()
	const se = document.getElementById('score')
	if (window.quickDraw && se) window.quickDraw(null, -se.scrollLeft, -se.scrollTop)
}
document.getElementById('voice_select_btn')?.addEventListener('click', (e) => {
	e.stopPropagation()
	const panel = document.getElementById('voice_select_panel')
	if (!panel) return
	panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
})
document.addEventListener('click', () => {
	const panel = document.getElementById('voice_select_panel')
	if (panel) panel.style.display = 'none'
})
document.getElementById('voice_select_panel')?.addEventListener('click', (e) => e.stopPropagation())

function getPlaybackStaffFilter() {
	const idx = window._selectedStaffIndices
	if (!idx || idx.length === 0) return undefined
	return idx
}

async function togglePlayPause() {
	if (playback.playing) {
		playback.pause()
	} else {
		const data = scoreManager.getData()
		const opts = getPlaybackStaffFilter()
		await playback.load(data, opts)
		await playback.play()
	}
}

playBtn.onclick = togglePlayPause

stopBtn.onclick = () => {
	playback.stop()
	progressBar.value = 0
	timeLabel.textContent = formatTime(0) + ' / ' + formatTime(playback.duration)
}

progressBar.addEventListener('pointerdown', () => { _seeking = true })
progressBar.addEventListener('pointerup', () => {
	_seeking = false
	const t = parseFloat(progressBar.value) * playback.duration
	playback.seek(t)
})
progressBar.addEventListener('input', () => {
	const t = parseFloat(progressBar.value) * playback.duration
	timeLabel.textContent = formatTime(t) + ' / ' + formatTime(playback.duration)
})

const rerender = () => {
	try {
		setup(
			() => {
				console.log('rerender')
				let data = scoreManager.getData()
				const musicContext = new MusicContext(data, window.canvas)
				interpret(musicContext)
				score(musicContext)
				// Build tick→x map for playback scroll sync (from first staff)
				const staves = data?.score?.staves || []
				const tickToX = []
				for (const tok of staves[0]?.tokens || []) {
					const tv = tok.tickValue
					const tick = typeof tv === 'number' ? tv : (tv && tv.value ? tv.value() : null)
					const x = tok.drawingNoteHead?.x
					if (tick != null && x != null) tickToX.push({ tick, x })
				}
				tickToX.sort((a, b) => a.tick - b.tick)
				window._tickToXMap = tickToX
				window._tempoMap = staves.length ? buildTempoMap(staves) : [{ tick: 0, bpm: 120 }]
				window.__renderComplete = { ts: Date.now(), file: window.__currentFile }
			},
			null,
			(canvas) => {
				console.log('ok')
				var score_div = document.getElementById('score')
				var invisible_canvas = document.getElementById('invisible_canvas')

				score_div.insertBefore(canvas, invisible_canvas)
				resizeToFit()
			}
		)
	} catch (error) {
		console.error('Rendering failed:', error)
		alert(`Error rendering score: ${error.message}\n\nSee DevTools console for the full stack trace.`)
	}
}

window.exportLilypond = exportLilypond

function updateVoiceSelect(data) {
	const wrap = document.getElementById('voice_select_wrap')
	const btn = document.getElementById('voice_select_btn')
	const panel = document.getElementById('voice_select_panel')
	if (!wrap || !panel) return
	const staves = data?.score?.staves || []
	wrap.style.display = staves.length > 1 ? '' : 'none'
	panel.innerHTML = ''
	const allId = 'voice_all'
	panel.appendChild((() => {
		const lab = document.createElement('label')
		lab.innerHTML = '<input type="checkbox" data-voice="all" id="' + allId + '" checked> 전체'
		lab.querySelector('input').onchange = () => updateVoiceSelectFromPanel()
		return lab
	})())
	for (let i = 0; i < staves.length; i++) {
		const name = staves[i].staff_label || staves[i].staff_name || '파트 ' + (i + 1)
		const lab = document.createElement('label')
		lab.innerHTML = '<input type="checkbox" data-voice="' + i + '" value="' + i + '"> ' + name
		lab.querySelector('input').onchange = () => updateVoiceSelectFromPanel()
		panel.appendChild(lab)
	}
	window._selectedStaffIndices = undefined
	syncVoiceSelectUI()
}

function setDataAndRender(_data) {
	scoreManager.setData(_data)
	updateVoiceSelect(_data)
	// data = _data;
	// window.data = data;
	rerender()
}

function processData(payload, filename) {
	try {
		window._lastPayload = payload
		window.__currentFile = filename || '(unknown)'
		window.__renderComplete = null
		var data = decodeNwcArrayBuffer(payload)
		const doRender = () => setDataAndRender(data)
		// 한글: 시스템 폰트 또는 Noto Sans KR 로드 후 렌더
		const fontFam = '"Malgun Gothic", "Noto Sans KR"'
		if (document.fonts && document.fonts.load) {
			Promise.all([
				document.fonts.load(`16px ${fontFam}`),
				document.fonts.load(`12px ${fontFam}`),
			]).then(doRender).catch(doRender)
		} else {
			setTimeout(doRender, 100)
		}
	} catch (error) {
		console.error('Failed to process NWC file:', error)
		// Log the full stack so the root cause is visible in DevTools, then
		// surface a user-readable message.  We deliberately do NOT catch errors
		// from rerender() here — those are caught inside rerender() itself.
		alert(`Error loading file: ${error.message}\n\nSee DevTools console for the full stack trace.`)
	}
}

document.getElementById('blank_button').onclick = () => {
	setDataAndRender(blank)
	// setDataAndRender(test_data)
	// setDataAndRender(test_dot_quaver)
}

window.rerender = rerender
window.processData = processData
window.setDataAndRender = setDataAndRender

const PARSER_STORAGE_KEY = 'nwc_use_new_parser'

function updateParserButton() {
	const btn = document.getElementById('parser_toggle')
	if (btn) btn.textContent = getUseNewParser() ? 'New' : 'Old'
}

window.toggleParser = function () {
	const next = !getUseNewParser()
	setUseNewParser(next)
	localStorage.setItem(PARSER_STORAGE_KEY, next)
	updateParserButton()
	if (window._lastPayload) {
		processData(window._lastPayload)
	}
}

// Restore persisted parser preference
const storedParser = localStorage.getItem(PARSER_STORAGE_KEY)
if (storedParser !== null) {
	setUseNewParser(storedParser === 'true')
}
updateParserButton()

// ---- Layout mode toggle (scroll vs wrap) ----

const LAYOUT_STORAGE_KEY = 'nwc_layout_mode'

function updateLayoutButton() {
	const btn = document.getElementById('layout_toggle')
	if (btn) btn.textContent = getLayoutMode() === 'wrap' ? 'Wrap' : 'Scroll'
}

window.toggleLayout = function () {
	const next = getLayoutMode() === 'scroll' ? 'wrap' : 'scroll'
	setLayoutMode(next)
	localStorage.setItem(LAYOUT_STORAGE_KEY, next)
	updateLayoutButton()
	rerender()
}

// Restore persisted layout preference (임베드 모드면 항상 scroll)
const storedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
if (fileParam) {
	setLayoutMode('scroll')
} else if (storedLayout === 'wrap' || storedLayout === 'scroll') {
	setLayoutMode(storedLayout)
}
updateLayoutButton()
