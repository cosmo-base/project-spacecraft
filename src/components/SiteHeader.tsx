import { useState, type ReactNode } from 'react';

/**
 * 参加者ページ（cb-member.fsif.jp）のコンテンツ共通ヘッダーと同じ構成にする。
 * 左：戻る＋ロゴ＋「参加者ページ」／右：パートナー一覧・使い方・メニュー
 */
export const MEMBER_SITE = 'https://cb-member.fsif.jp';
const LOGO = './brand/cosmo-base-logo.png';

type Props = {
  onTitle: () => void;
  onOpenData: () => void;
};

export function SiteHeader({ onTitle, onOpenData }: Props) {
  const [open, setOpen] = useState(false);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="header-group">
          <button className="icon-button" onClick={() => window.history.back()} aria-label="戻る">
            <Icon d="m15 18-6-6 6-6" />
          </button>
          <a className="brand" href={`${MEMBER_SITE}/`}>
            <img className="brand-logo" src={LOGO} alt="Cosmo Base" />
            <span className="brand-sub">参加者ページ</span>
          </a>
        </div>

        <div className="header-group">
          <a className="ghost-button" href="https://cosmobase.fsif.jp/partners">
            <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" small />
            <span className="ghost-label">パートナー一覧</span>
          </a>
          <a className="ghost-button" href={`${MEMBER_SITE}/guide`}>
            <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01" small />
            <span className="ghost-label">使い方</span>
          </a>
          <button
            className="icon-button"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={open}
          >
            {open ? <Icon d="M18 6 6 18 M6 6l12 12" /> : <Icon d="M4 12h16 M4 6h16 M4 18h16" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="header-menu">
          <ul>
            <MenuItem onClick={run(onTitle)} icon={<Icon d="M3 10.5 12 3l9 7.5 M5 9v12h14V9" small />} title="宇宙機プロジェクトシミュレーター" sub="タイトルに戻る" />
            <MenuItem onClick={run(onOpenData)} icon={<Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" small />} title="保存とデータの設定" sub="ローカル保存・データ提供" />

            <li className="menu-divider" role="separator" />

            <MenuItem href="https://cosmobase.fsif.jp/" icon={<img src="./brand/cb-icon.png" alt="" />} title="Cosmo Base" sub="公式サイト" />
            <MenuItem href="https://cbl.fsif.jp" icon={<Icon d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" small />} title="Cosmo Base Library" sub="宇宙の知識を体系的に学ぶ" />

            <li className="menu-divider" role="separator" />

            <MenuItem href="https://x.com/CosmoBase" icon={<img src="./brand/x.png" alt="" className="icon-sm" />} title="X (Twitter)" sub="最新情報をチェック" />
            <MenuItem href="https://www.instagram.com/cosmobase.official/" icon={<img src="./brand/instagram.png" alt="" />} title="Instagram" sub="活動の様子をチェック" />
            <MenuItem href="https://note.com/cosmobase" icon={<img src="./brand/note.png" alt="" />} title="note" sub="記事を読む" />
            <MenuItem href="https://www.youtube.com/channel/UC3bcWCM6ccvsyQyiXLIwhkQ" icon={<img src="./brand/youtube.png" alt="" />} title="YouTube" sub="動画を見る" />
          </ul>
        </nav>
      )}
    </header>
  );
}

function MenuItem({ href, onClick, icon, title, sub }: { href?: string; onClick?: () => void; icon: ReactNode; title: string; sub: string }) {
  const body = (
    <>
      <span className="menu-icon">{icon}</span>
      <span>
        <span className="menu-title">{title}</span>
        <span className="menu-sub">{sub}</span>
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <a className="menu-item" href={href} target="_blank" rel="noopener noreferrer">
          {body}
        </a>
      ) : (
        <button className="menu-item" onClick={onClick}>
          {body}
        </button>
      )}
    </li>
  );
}

/** lucide と同じ線画アイコン（依存を増やさないためインラインで持つ） */
function Icon({ d, small }: { d: string; small?: boolean }) {
  const size = small ? 16 : 20;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
