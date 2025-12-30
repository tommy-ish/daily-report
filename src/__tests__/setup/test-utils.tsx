import { ReactElement } from 'react';

import { render, RenderOptions } from '@testing-library/react';

/**
 * カスタムレンダー関数
 * 必要に応じてプロバイダーをラップする
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  // 将来的にProviderをここに追加
  // const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  //   return <SessionProvider>{children}</SessionProvider>;
  // };

  return render(ui, { ...options });
};

// Re-export everything from React Testing Library except render
export {
  screen,
  waitFor,
  within,
  fireEvent,
  act,
  cleanup,
  renderHook,
} from '@testing-library/react';

// Export our custom render function
export { customRender as render };
