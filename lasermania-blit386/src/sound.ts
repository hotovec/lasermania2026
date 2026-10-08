// Hudba a efekty. Předrenderované v Node ze stejného emulátoru 6502 + POKEY jako demo
// (../js-demo/tools/render_music.js --all, `npm run sound`): skladby CMC v OGG + MP3 s body smyčky
// v music.json, hlasitosti kanálů po snímcích ve vu.json (ekvalizér), efekty SFXPlayer ve WAV. Vite soubory
// zabalí do buildu (importy `?url`).

import { AudioClip, BT } from 'blit386';
import type { SoundEvent } from '@lasermania/js-demo/core';
import music from '@lasermania/js-demo/sound/music.json';
import vu from '@lasermania/js-demo/sound/vu.json';
import song0Ogg from '@lasermania/js-demo/sound/song0.ogg?url';
import song0Mp3 from '@lasermania/js-demo/sound/song0.mp3?url';
import song1Ogg from '@lasermania/js-demo/sound/song1.ogg?url';
import song1Mp3 from '@lasermania/js-demo/sound/song1.mp3?url';
import song2Ogg from '@lasermania/js-demo/sound/song2.ogg?url';
import song2Mp3 from '@lasermania/js-demo/sound/song2.mp3?url';
import song3Ogg from '@lasermania/js-demo/sound/song3.ogg?url';
import song3Mp3 from '@lasermania/js-demo/sound/song3.mp3?url';
import aim from '@lasermania/js-demo/sound/sfx/aim.wav?url';
import breaker from '@lasermania/js-demo/sound/sfx/breaker.wav?url';
import bump from '@lasermania/js-demo/sound/sfx/bump.wav?url';
import door from '@lasermania/js-demo/sound/sfx/door.wav?url';
import exitOpen from '@lasermania/js-demo/sound/sfx/exitOpen.wav?url';
import explode from '@lasermania/js-demo/sound/sfx/explode.wav?url';
import gone from '@lasermania/js-demo/sound/sfx/gone.wav?url';
import laserDead from '@lasermania/js-demo/sound/sfx/laserDead.wav?url';
import pickup from '@lasermania/js-demo/sound/sfx/pickup.wav?url';
import push from '@lasermania/js-demo/sound/sfx/push.wav?url';
import sensor from '@lasermania/js-demo/sound/sfx/sensor.wav?url';
import step from '@lasermania/js-demo/sound/sfx/step.wav?url';
import win from '@lasermania/js-demo/sound/sfx/win.wav?url';

/** 0 = titulka, 1 a 2 = ve hře, 3 = vítězná obrazovka. */
export type Song = 0 | 1 | 2 | 3;

// OGG, záloha MP3 (Safari)
const SONG_URLS: Record<Song, string[]> = {
    0: [song0Ogg, song0Mp3],
    1: [song1Ogg, song1Mp3],
    2: [song2Ogg, song2Mp3],
    3: [song3Ogg, song3Mp3],
};
const SFX_URLS: Record<SoundEvent, string> = {
    step,
    push,
    pickup,
    bump,
    door,
    aim,
    sensor,
    gone,
    explode,
    breaker,
    exitOpen,
    laserDead,
    win,
};
const LOOPS = music as Record<string, { loopStart: number; loopEnd: number }>;
const SONGS: Song[] = [0, 1, 2, 3];
const VU = vu as unknown as Record<string, string> & { rate: number };
const TICKS_PER_SECOND = 50; // targetFPS portu
const SFX_NAMES = Object.keys(SFX_URLS) as SoundEvent[];
const RECENT = 8; // kolik posledních efektů drží `recent` (dev hook)

/** Skladba ve hře: level n s `n & 4` -> 2, jinak 1 (originál $9897, js-demo/js/game.js levelSong). */
export function levelSong(n: number): Song {
    return n & 4 ? 2 : 1;
}

export class Sound {
    private songs = new Map<Song, AudioClip>();
    private sfx = new Map<SoundEvent, AudioClip>();
    private current: Song | null = null;
    private wanted: Song | null = null; // naposledy vyžádaná skladba (může se ještě načítat)
    private startTick: number | null = null; // BT.ticks skutečného startu skladby (po odemčení zvuku)
    private readonly vols = [0, 0, 0];
    /** Posledních pár přehraných efektů (jen pro dev hook / testy). */
    readonly recent: SoundEvent[] = [];

    get song(): Song | null {
        return this.current;
    }

    /**
     * Načte skladbu `first` (titulka) a efekty; ostatní skladby (~17 MB) se dotahují na pozadí a skladba
     * vyžádaná dřív, než dorazí, začne hrát po načtení.
     */
    async load(first: Song): Promise<void> {
        const clips = await AudioClip.loadAll([SONG_URLS[first], ...SFX_NAMES.map((n) => SFX_URLS[n])]);
        this.songs.set(first, clips[0]);
        SFX_NAMES.forEach((n, i) => this.sfx.set(n, clips[1 + i]));
        for (const s of SONGS) {
            if (s === first) continue;
            AudioClip.load(SONG_URLS[s]).then(
                (clip) => {
                    this.songs.set(s, clip);
                    if (this.wanted === s) this.playSong(s);
                },
                (err: unknown) => console.warn(`skladba ${s} se nenačetla`, err),
            );
        }
    }

    /** Pustí skladbu se smyčkou z music.json (úvod jednou, pak dokola); stejnou skladbu nerestartuje. */
    playSong(song: Song): void {
        this.wanted = song;
        if (song === this.current) return;
        const clip = this.songs.get(song);
        if (!clip) return; // ještě se načítá: pustí ji load()
        this.current = song;
        this.startTick = BT.isAudioUnlocked ? BT.ticks : null;
        BT.musicPlay(clip, LOOPS[song]);
    }

    /** Každý tick: zapamatuje si, kdy skladba opravdu začala hrát (BT.musicPlay čeká na první stisk). */
    update(): void {
        if (this.current !== null && this.startTick === null && BT.isAudioUnlocked) this.startTick = BT.ticks;
    }

    /**
     * Hlasitosti 3 kanálů CMC v právě hraném snímku skladby (vu.json, se smyčkou podle music.json) pro ekvalizér;
     * nuly, když hudba nehraje nebo je ztlumená.
     */
    volumes(): number[] {
        const song = this.current;
        this.vols.fill(0);
        if (song === null || this.startTick === null || BT.isAudioMuted('music') || BT.isAudioMuted('main')) {
            return this.vols;
        }
        const frames = VU[song];
        const loop = LOOPS[song];
        const start = Math.round(loop.loopStart * VU.rate);
        const end = frames.length / 3;
        let f = Math.floor(((BT.ticks - this.startTick) / TICKS_PER_SECOND) * VU.rate);
        if (f >= end) f = start + ((f - start) % (end - start));
        for (let k = 0; k < 3; k++) this.vols[k] = Number.parseInt(frames[f * 3 + k], 16);
        return this.vols;
    }

    /** Efekty pro události logiky (LMCore.takeEvents); před prvním stiskem je prohlížeč zahodí. */
    playEvents(events: SoundEvent[]): void {
        for (const name of events) {
            const clip = this.sfx.get(name);
            if (clip) BT.soundPlay(clip);
            this.recent.push(name);
            if (this.recent.length > RECENT) this.recent.shift();
        }
    }
}
