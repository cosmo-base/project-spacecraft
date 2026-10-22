import { useEffect, useRef, useState } from 'react';
import { ConsentScreen } from './components/ConsentScreen';
import { DataSettings } from './components/DataSettings';
import { SiteHeader } from './components/SiteHeader';
import { GameScreen } from './components/GameScreen';
import { ReportScreen } from './components/ReportScreen';
import { TitleScreen } from './components/TitleScreen';
import { buildProgressPayload, CONSENT_VERSION, newPlayId, sendAnalyticsOnLeave } from './engine/analytics';
import { newGame } from './engine/engine';
import type { GameState, Mode } from './engine/types';
import { clearGame, loadGame, loadPrefs, saveGame, savePrefs, type Prefs } from './storage';

type Screen = 'title' | 'game' | 'report' | 'data';

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [game, setGame] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const [back, setBack] = useState<Screen>('title');
  const [saved, setSaved] = useState<GameState | null>(() => (loadPrefs().localSave ? loadGame() : null));

  const consented = prefs.analyticsConsent && prefs.consentVersion === CONSENT_VERSION;

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  // ローカル保存は参加者が有効にしたときだけ行う
  useEffect(() => {
    if (!prefs.localSave || !game) return;
    if (game.ending) clearGame();
    else saveGame(game);
  }, [game, prefs.localSave]);

  useEffect(() => {
    if (game?.ending && !game.lastResult) setScreen('report');
  }, [game]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, consented]);

  // プレイ途中でページを閉じた・別のタブに切り替えたときは、その時点の到達地点を送る（離脱の分析用）。
  // 同じ地点を何度も送らないよう、最後に送った地点を覚えておく
  const gameRef = useRef(game);
  gameRef.current = game;
  const consentRef = useRef(consented);
  consentRef.current = consented;
  const lastLeaveSent = useRef('');
  const reportLeave = (g: GameState | null) => {
    if (!g || g.ending || !g.playId) return;
    const key = `${g.playId}:${g.log.length}:${g.currentEventId}`;
    if (key === lastLeaveSent.current) return;
    lastLeaveSent.current = key;
    sendAnalyticsOnLeave(buildProgressPayload(g, g.playId), consentRef.current);
  };
  useEffect(() => {
    // タブの切り替え・アプリの切り替え（スマートフォン）で隠れたとき
    const onHide = () => {
      if (document.visibilityState === 'hidden') reportLeave(gameRef.current);
    };
    // ページを閉じる・別のページへ移るとき
    const onPageHide = () => reportLeave(gameRef.current);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  const start = (mode: Mode) => {
    // 遊んでいる途中で新しく始めた場合も、それまでのプレイは途中でやめたものとして記録する
    reportLeave(game);
    clearGame();
    setSaved(null);
    setGame({ ...newGame(mode), playId: newPlayId(), termOpens: {} });
    setScreen('game');
  };

  const openData = () => {
    if (screen !== 'data') setBack(screen);
    setScreen('data');
  };

  const updatePrefs = (p: Prefs) => {
    if (!p.localSave) {
      clearGame();
      setSaved(null);
    }
    setPrefs(p);
  };

  const agree = () => {
    setPrefs({ ...prefs, analyticsConsent: true, consentVersion: CONSENT_VERSION });
    // 撤回後に同意し直した場合も、タイトルから始め直す
    setScreen('title');
  };

  return (
    <div className="app">
      <SiteHeader onTitle={() => setScreen('title')} onOpenData={openData} />

      <main className="main">
        {!consented && screen !== 'data' ? (
          <ConsentScreen onAgree={agree} />
        ) : (
          <>
            {screen === 'title' && (
              <TitleScreen
                onStart={start}
                saved={saved}
                onContinue={() => {
                  // 古いセーブデータには playId がないので、続きから遊ぶときに付ける
                  setGame(saved && { ...saved, playId: saved.playId ?? newPlayId(), termOpens: saved.termOpens ?? {} });
                  setScreen('game');
                }}
                onOpenData={openData}
              />
            )}
            {screen === 'game' && game && <GameScreen game={game} setGame={setGame} />}
            {screen === 'report' && game && <ReportScreen game={game} onRestart={() => setScreen('title')} />}
            {screen === 'data' && (
              <DataSettings
                prefs={prefs}
                consented={consented}
                onChange={updatePrefs}
                onBack={() => setScreen(back === 'data' ? 'title' : back)}
              />
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p className="footer-note">
            アカウント不要・クラウドセーブなし。ゲームの進行や文章の表示にAIは使っていません（すべて事前に用意した内容です）。数値モデルはゲームとしての簡略化を含み、実機設計の精度を保証するものではありません。（運営：FSIF）
          </p>
          <img className="footer-logo" src="./brand/cosmo-base-logo.png" alt="Cosmo Base" />
          <p className="copyright">&copy; 2026 Cosmo Base. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
