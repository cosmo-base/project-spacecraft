/**
 * 分析ページ（kpi-dashboard）用に、イベント・選択肢・機体構成などの日本語名を書き出す。
 * イベントを変更したら実行し直して、出力したファイルをダッシュボード側に置き直す。
 *
 *   npm run export-labels -- <出力先ファイル>
 */
import { writeFileSync } from 'node:fs';
import { EVENTS } from '../src/data/events';
import { CORE_EVENTS } from '../src/data/pacing';
import type { GameEvent } from '../src/engine/types';
import { ENDINGS } from '../src/data/endings';
import { RISK_NAMES } from '../src/data/riskNames';
import { APP_VERSION } from '../src/engine/analytics';
import { SUBSYSTEMS } from '../src/engine/design';
import { PHASES } from '../src/engine/engine';
import { LABELS } from '../src/engine/values';

const out = process.argv[2];
if (!out) {
  console.error('出力先ファイルを指定してください');
  process.exit(1);
}

// フラグ（通った分岐）には名前がないので、最初にそのフラグを立てる「イベント：選択肢」を名前にする
const flags: Record<string, string> = {};
for (const e of EVENTS) {
  for (const c of e.choices) {
    for (const f of c.flags ?? []) flags[f] ??= `${e.title}：${c.label}`;
    // 判定の成否で立つフラグは、どちらの結果かも名前に入れる（同じ選択肢から別のフラグが立つため）
    for (const f of c.check?.success.flags ?? []) flags[f] ??= `${e.title}：${c.label}（成功）`;
    for (const f of c.check?.failure.flags ?? []) flags[f] ??= `${e.title}：${c.label}（失敗）`;
  }
}

/**
 * イベントの出方の種類（src/data/pacing.ts と engine の proceed の考え方に合わせる）
 * - 柱：条件を満たせば必ず出る ／ 随時：資金不足などで割り込む
 * - 偶然：確率で起きる ／ 伏線回収：前の選択のフラグが条件 ／ 条件付き：数値や設計が条件 ／ ランダム：枠の中から抽選
 */
function kindOf(e: GameEvent) {
  if (e.phase === 'any') return '随時';
  if (e.kind === 'design' || CORE_EVENTS.has(e.id)) return '柱';
  if (e.trigger) return '偶然';
  if (e.conditions?.flags?.length || e.conditions?.anyFlags?.length) return '伏線回収';
  if (e.conditions) return '条件付き';
  return 'ランダム';
}

const labels = {
  appVersion: APP_VERSION,
  phases: PHASES.map((p) => p.name),
  endings: Object.fromEntries(Object.entries(ENDINGS).map(([k, v]) => [k, v.title])),
  risks: RISK_NAMES,
  values: LABELS,
  flags,
  subsystems: SUBSYSTEMS.map((s) => ({ id: s.id, name: s.name, options: Object.fromEntries(s.options.map((o) => [o.id, o.name])) })),
  events: Object.fromEntries(
    EVENTS.map((e, order) => [
      e.id,
      {
        title: e.title,
        phase: e.phase,
        mode: e.mode,
        kind: kindOf(e),
        order,
        ...(e.answer ? { answer: e.answer } : {}),
        choices: Object.fromEntries(e.choices.map((c) => [c.id, c.label])),
      },
    ]),
  ),
};

const body = `// このファイルは宇宙機プロジェクトシミュレーターの scripts/export-labels.ts で自動生成しています。手で編集しないでください。
// 生成元のバージョン: ${APP_VERSION}

export const SPACECRAFT_LABELS = ${JSON.stringify(labels, null, 2)} as const;
`;
writeFileSync(out, body, 'utf8');
console.log(`書き出しました：${out}（イベント ${EVENTS.length} 件）`);
