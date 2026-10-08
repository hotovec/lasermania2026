// Hudba a efekty. Předrenderované v Node ze stejného emulátoru 6502 + POKEY jako demo
// (../js-demo/tools/render_music.js --all, `npm run sound`): skladby CMC v OGG + MP3 s body smyčky
// v music.json, efekty SFXPlayer ve WAV. Vite soubory zabalí do buildu (importy `?url`).

import { AudioClip, BT } from 'blit386';
import type { SoundEvent } from '@lasermania/js-demo/core';
import music from '@lasermania/js-demo/sound/music.json';
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

/** 3 = titulka, 1 a 2 = ve hře. */
export type Song = 1 | 2 | 3;

// OGG, záloha MP3 (Safari)
const SONG_URLS: Record<Song, string[]> = {
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
const SONGS: Song[] = [1, 2, 3];
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
    /** Posledních pár přehraných efektů (jen pro dev hook / testy). */
    readonly recent: SoundEvent[] = [];

    get song(): Song | null {
        return this.current;
    }

    async load(): Promise<void> {
        const clips = await AudioClip.loadAll([
            ...SONGS.map((s) => SONG_URLS[s]),
            ...SFX_NAMES.map((n) => SFX_URLS[n]),
        ]);
        SONGS.forEach((s, i) => this.songs.set(s, clips[i]));
        SFX_NAMES.forEach((n, i) => this.sfx.set(n, clips[SONGS.length + i]));
    }

    /** Pustí skladbu se smyčkou z music.json (úvod jednou, pak dokola); stejnou skladbu nerestartuje. */
    playSong(song: Song): void {
        if (song === this.current) return;
        const clip = this.songs.get(song);
        if (!clip) return;
        this.current = song;
        BT.musicPlay(clip, LOOPS[song]);
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
