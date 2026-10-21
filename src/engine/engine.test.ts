import { describe, expect, it } from 'vitest';
import { EVENTS } from '../data/events';
import { GLOSSARY } from '../data/glossary';
import { buildFeedbackPayload, buildPlayPayload, type PlayPayload } from './analytics';
import { replayPlay } from './replay';
import { computeBudgets, DEFAULT_DESIGN, SUBSYSTEMS } from './design';
import { availableChoices, choose, confirmDesign, getEvent, newGame, proceed } from './engine';
import { nextRandom } from './rng';
import { buildReport } from './report';
import type { Condition, Design, EndingId, GameState, Mode } from './types';

/** 乱数で選択を続け、エンディングまで遊ぶ */
function playthrough(mode: Mode, seed: number, pickDesign?: (r: number) => Design) {
  let s = newGame(mode, seed);
  let r = seed ^ 0x9e3779b9;
  const rand = () => {
    const [v, n] = nextRandom(r);
    r = n;
    return v;
  };
  for (let step = 0; step < 500 && !s.ending; step++) {
    if (s.lastResult) {
      s = proceed(s);
      continue;
    }
    const e = getEvent(s.currentEventId!);
    if (e.kind === 'design') {
      s = confirmDesign(s, pickDesign ? pickDesign(rand()) : randomDesign(rand));
      continue;
    }
    const cs = availableChoices(s, e);
    expect(cs.length, `event ${e.id} has no available choice`).toBeGreaterThan(0);
    s = choose(s, cs[Math.floor(rand() * cs.length)].id);
  }
  if (s.lastResult) s = proceed(s);
  return s;
}

function randomDesign(rand: () => number): Design {
  for (;;) {
    const d = Object.fromEntries(
      SUBSYSTEMS.map((sub) => [sub.id, sub.options[Math.floor(rand() * sub.options.length)].id]),
    ) as Design;
    if (computeBudgets(d).massMargin >= 0) return d;
  }
}

describe('event data', () => {
  it('has unique ids and unique choice ids', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EVENTS) {
      const cids = e.choices.map((c) => c.id);
      expect(new Set(cids).size, e.id).toBe(cids.length);
      if (e.kind !== 'design') expect(cids.length, e.id).toBeGreaterThan(0);
    }
  });

  it('defines every glossary term it references', () => {
    const terms = [...EVENTS.flatMap((e) => e.terms ?? []), ...SUBSYSTEMS.map((s) => s.term!)];
    for (const t of terms) expect(GLOSSARY[t], t).toBeTruthy();
  });

  it('meets the content target', () => {
    expect(EVENTS.filter((e) => e.mode === 'common').length).toBeGreaterThanOrEqual(110);
    expect(EVENTS.length).toBeGreaterThanOrEqual(150);
    console.log('event counts:', {
      total: EVENTS.length,
      common: EVENTS.filter((e) => e.mode === 'common').length,
      beginner: EVENTS.filter((e) => e.mode === 'beginner').length,
      expert: EVENTS.filter((e) => e.mode === 'expert').length,
    });
  });

  it('only checks flags that some choice can set (catches typos)', () => {
    const set = new Set<string>();
    const used = new Set<string>();
    const collectCond = (c?: Condition) => [...(c?.flags ?? []), ...(c?.notFlags ?? []), ...(c?.anyFlags ?? [])].forEach((f) => used.add(f));
    for (const e of EVENTS) {
      collectCond(e.conditions);
      for (const c of e.choices) {
        collectCond(c.requires);
        for (const o of [c, c.check?.success, c.check?.failure]) (o?.flags ?? []).forEach((f) => set.add(f));
      }
    }
    expect([...used].filter((f) => !set.has(f))).toEqual([]);
  });
});

describe('design budgets', () => {
  it('computes the default design with positive margins', () => {
    const b = computeBudgets(DEFAULT_DESIGN);
    expect(b.massMargin).toBeGreaterThan(0);
    expect(b.powerMargin).toBeGreaterThan(0);
  });

  it('rejects a design over the launch mass limit', () => {
    let s = newGame('expert', 1);
    while (getEvent(s.currentEventId!).kind !== 'design') {
      s = proceed(choose(s, availableChoices(s, getEvent(s.currentEventId!))[0].id));
    }
    const heavy: Design = { power: 'deployBattery', comm: 'xband', adcs: 'wheelTracker', thermal: 'heater', payload: 'large' };
    // 大型構成でも上限内に収まるかはモデル次第。上限超過なら必ず拒否されることを確認する
    if (computeBudgets(heavy).massMargin < 0) expect(() => confirmDesign(s, heavy)).toThrow();
    else expect(confirmDesign(s, heavy).design).toEqual(heavy);
  });
});

describe('simulation', () => {
  it('is deterministic for the same seed and choices', () => {
    const a = playthrough('beginner', 42);
    const b = playthrough('beginner', 42);
    expect(a.ending).toBe(b.ending);
    expect(a.stats).toEqual(b.stats);
    expect(a.log.map((l) => l.choiceId)).toEqual(b.log.map((l) => l.choiceId));
  });

  it('always reaches an ending in both modes, and every event is reachable', () => {
    const counts: Record<string, number> = {};
    const shown = new Set<string>();
    for (const mode of ['beginner', 'expert'] as Mode[]) {
      for (let seed = 1; seed <= 300; seed++) {
        const s = playthrough(mode, seed);
        expect(s.ending, `${mode} seed ${seed}`).not.toBeNull();
        s.log.forEach((l) => shown.add(l.eventId));
        counts[`${mode}:${s.ending}`] = (counts[`${mode}:${s.ending}`] ?? 0) + 1;
        const r = buildReport(s);
        expect(r.improvements.length).toBeGreaterThan(0);
      }
    }
    // 少なくとも複数種類のエンディングに分岐する
    const endings = new Set(Object.keys(counts).map((k) => k.split(':')[1] as EndingId));
    expect(endings.size).toBeGreaterThanOrEqual(3);
    console.log('ending distribution (random play):', counts);
    // i-mass-check は質量超過時の安全網。設計画面で超過を防いでいるため、ランダムプレイではまず起きない
    const SAFETY_NETS = ['i-mass-check'];
    expect(EVENTS.filter((e) => !shown.has(e.id) && !SAFETY_NETS.includes(e.id)).map((e) => e.id)).toEqual([]);
    const lens = [];
    for (let seed = 1; seed <= 100; seed++) lens.push(playthrough('beginner', seed).log.length);
    console.log('events per beginner play: min', Math.min(...lens), 'max', Math.max(...lens));
  });

  it('only shows mode-specific events in their mode', () => {
    const b = playthrough('beginner', 7);
    const e = playthrough('expert', 7);
    const modeOf = (id: string) => getEvent(id).mode;
    expect(b.log.every((l) => modeOf(l.eventId) !== 'expert')).toBe(true);
    expect(e.log.every((l) => modeOf(l.eventId) !== 'beginner')).toBe(true);
  });

  it('preparation improves the outcome (careful strategy beats rushing on average)', () => {
    const careful = ['tiered', 'lab', 'year', 'apply', 'parts', 'run', 'expert', 'commercial', 'network', 'rush', 'screen', 'lighten',
      'battery', 'add', 'investigate', 'join', 'full', 'fix', 'do', 'careful', 'rebook', 'contact', 'procedure', 'deploy',
      'analyze', 'attitude', 'pause', 'switch', 'automate', 'plan', 'open', 'finish', 'earth', 'rework', 'rest', 'wait', 'remove', 'ask'];
    const rushed = ['ambitious', 'open', 'two', 'skip', 'decline', 'push', 'own', 'single', 'alt', 'cots', 'keep', 'accept', 'none',
      'patch', 'schedule', 'ship', 'contact', 'isolate', 'deploy', 'quick', 'share', 'continue', 'reset', 'shift', 'explore', 'extend',
      'night', 'note', 'stop', 'remove', 'close', 'downsize'];
    const run = (prefs: string[], seed: number) => {
      let s = newGame('expert', seed);
      for (let i = 0; i < 500 && !s.ending; i++) {
        if (s.lastResult) { s = proceed(s); continue; }
        const e = getEvent(s.currentEventId!);
        if (e.kind === 'design') { s = confirmDesign(s, DEFAULT_DESIGN); continue; }
        const cs = availableChoices(s, e);
        const pick = cs.find((c) => prefs.includes(c.id)) ?? cs[cs.length - 1];
        s = choose(s, pick.id);
      }
      return s;
    };
    const avg = (prefs: string[]) => {
      let total = 0;
      for (let seed = 1; seed <= 200; seed++) total += run(prefs, seed).stats.progress;
      return total / 200;
    };
    expect(avg(careful)).toBeGreaterThan(avg(rushed));
  });
});

describe('analytics payload', () => {
  it('can reproduce the exact play from what is sent', () => {
    for (const mode of ['beginner', 'expert'] as Mode[]) {
      for (let seed = 1; seed <= 100; seed++) {
        const s: GameState = playthrough(mode, seed);
        // 送信と同じく JSON を通してから再現する
        const p = JSON.parse(JSON.stringify(buildPlayPayload(s, 'test-play-id'))) as PlayPayload;
        const r = replayPlay(p);
        expect(r.ending, `${mode} seed ${seed}`).toBe(s.ending);
        expect(r.stats).toEqual(s.stats);
        expect(r.flags).toEqual(s.flags);
        expect(buildPlayPayload(r, 'test-play-id').report).toEqual(p.report);
      }
    }
  });

  it('fits in a spreadsheet cell and has readable ids', () => {
    const s: GameState = playthrough('expert', 3);
    const p = buildPlayPayload(s, 'test-play-id');
    expect(JSON.stringify(p.log).length).toBeLessThan(45000);
    expect(JSON.stringify(p.report).length).toBeLessThan(45000);
    expect(p.choiceIds.every((c) => /^[\w-]+:[\w-]+$/.test(c))).toBe(true);
  });

  it('sends only the feedback and playId with feedback', () => {
    expect(Object.keys(buildFeedbackPayload('id', 'よかった')).sort()).toEqual(['appVersion', 'feedback', 'playId', 'schema', 'type']);
  });
});
