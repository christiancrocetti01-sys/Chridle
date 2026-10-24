import { describe, expect, it } from 'vitest';
import { step, type CombatEvent } from '../src/core/combat';
import type { Item } from '../src/core/items';
import { castSkills, cooldownTicks, newSkills, skillValue } from '../src/core/skills';
import { newGame, type GameState } from '../src/core/state';
import { MAX_SKILL_CDR, stateStats } from '../src/core/stats';
import { AFFIXES, STAT_LABELS, type StatKey } from '../src/data/items';
import { SKILL_TAGS, skillDef } from '../src/data/skills';

function fighting(level = 30) {
  const s = newGame(0, 3);
  s.hero.level = level;
  s.skills = newSkills(level);
  while (!s.enemy) step(s);
  s.enemy!.hp = s.enemy!.maxHp = 1e12;
  s.enemy!.atk = 0;
  return s;
}

/** Indossa un anello con le statistiche indicate. */
function wear(s: GameState, slot: 'anello1' | 'anello2', mods: [StatKey, number][]) {
  const item: Item = {
    uid: 900 + slot.length, type: 'anello', rarity: 0, ilvl: 1, name: 'Prova', base: { stat: 'crit', value: 0 },
    affixes: [{ id: 'prova', tier: 1, mods: mods.map(([stat, value]) => ({ stat, value })) }],
  };
  s.gear.equipped[slot] = item;
}

function cast(s: GameState, skill: string): number {
  s.skills.slots = [skill, null, null, null];
  s.skills.cooldowns[skill] = 0;
  s.hero.light = 100;
  const ev: CombatEvent[] = [];
  castSkills(s, stateStats(s), ev);
  return (ev[0] as { amount: number }).amount;
}

describe('sinergie per tag', () => {
  it('ogni tag ha un affisso di effetto e uno di ricarica', () => {
    for (const t of SKILL_TAGS) {
      for (const k of [`${t}Skill`, `${t}Cdr`] as StatKey[]) {
        expect(STAT_LABELS[k]).toBeTruthy();
        expect(AFFIXES.some((a) => a.mods.some((m) => m.stat === k)), k).toBe(true);
      }
    }
  });

  it('il bonus del tag aumenta l’effetto solo delle skill con quel tag', () => {
    const s = fighting();
    const base = cast(s, 'colpoSacro');
    wear(s, 'anello1', [['sacroSkill', 0.3], ['fulmineSkill', 0.5]]);
    expect(cast(s, 'colpoSacro')).toBeCloseTo(base * 1.3);
    expect(skillValue(s, stateStats(s), skillDef('squarcio')!)).toBeCloseTo(skillDef('squarcio')!.effect.value);
  });

  it('i bonus dei tag della skill si sommano', () => {
    const s = fighting();
    wear(s, 'anello1', [['sacroSkill', 0.2], ['curaSkill', 0.1]]);
    const def = skillDef('preghiera')!;
    expect(skillValue(s, stateStats(s), def)).toBeCloseTo(def.effect.value * 1.3);
  });

  it('la riduzione ricarica per tag si somma ed è limitata', () => {
    const s = fighting();
    const def = skillDef('giudizio')!;
    wear(s, 'anello1', [['sacroCdr', 0.1]]);
    expect(cooldownTicks(s, stateStats(s), def)).toBe(Math.round(120 * 0.9));
    cast(s, 'giudizio');
    expect(s.skills.cooldowns.giudizio).toBe(Math.round(120 * 0.9));
    wear(s, 'anello2', [['sacroCdr', 5]]);
    expect(cooldownTicks(s, stateStats(s), def)).toBe(Math.round(120 * (1 - MAX_SKILL_CDR)));
  });
});
