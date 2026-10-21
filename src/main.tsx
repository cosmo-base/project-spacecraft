import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// ブランド書体。外部CDNに頼らず同梱する（閲覧者のIPを第三者に送らないため）
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-serif-jp/700.css';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
