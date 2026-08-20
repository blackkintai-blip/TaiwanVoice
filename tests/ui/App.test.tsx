import { render, screen, fireEvent } from '@testing-library/react';
import 'fake-indexeddb/auto';
import App from '../../src/App';

test('starts on the list tab and switches to listen on tap', () => {
  render(<App />);
  expect(screen.getByText('一覧')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '聞く' }));
  expect(screen.getByText('聞く画面')).toBeInTheDocument();
});

test('all four tabs are present', () => {
  render(<App />);
  for (const label of ['一覧', '聞く', '出題', '設定']) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  }
});
