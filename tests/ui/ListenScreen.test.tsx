import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { ListenScreen } from '../../src/ui/screens/ListenScreen';
import { putCard, openDb } from '../../src/data/db';
import type { Card } from '../../src/core/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'a', hanzi: '你好', zhuyin: 'ㄋㄧˇㄏㄠˇ', zhuyinEdited: false, meaning: 'こんにちは',
    tags: [], note: '', examples: [],
    srs: { due: '2026-08-20', interval: 0, ease: 2.5, reps: 0, lapses: 0 },
    createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  const db = await openDb();
  await db.clear('cards');
  localStorage.clear();
  Object.defineProperty(window, 'speechSynthesis', {
    value: { getVoices: () => [], speak: () => {}, cancel: () => {}, addEventListener: () => {} },
    writable: true,
  });
});

test('card text is hidden until the reveal button is held', async () => {
  await putCard(makeCard());
  render(<ListenScreen />);
  await waitFor(() => screen.getByRole('button', { name: '再生' }));

  expect(screen.queryByText('你好')).not.toBeInTheDocument();

  const reveal = screen.getByRole('button', { name: '文字を見る' });
  fireEvent.pointerDown(reveal);
  expect(screen.getByText('你好')).toBeInTheDocument();

  fireEvent.pointerUp(reveal);
  expect(screen.queryByText('你好')).not.toBeInTheDocument();
});

test('shows a counter and next/prev controls', async () => {
  await putCard(makeCard({ id: 'a' }));
  await putCard(makeCard({ id: 'b', hanzi: '謝謝' }));
  render(<ListenScreen />);
  await waitFor(() => screen.getByText('1 / 2'));

  fireEvent.click(screen.getByRole('button', { name: '次' }));
  expect(screen.getByText('2 / 2')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '前' }));
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
});

class FakeTrack {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

class FakeStream {
  tracks = [new FakeTrack()];
  getTracks() {
    return this.tracks;
  }
}

class FakeMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: FakeStream) {}
  start() {
    this.state = 'recording';
  }
  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['x']) });
    this.onstop?.();
  }
}

describe('recording (聞く画面)', () => {
  let getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;

  beforeEach(() => {
    URL.createObjectURL = (() => 'blob:fake-url') as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    getUserMedia = async () => new FakeStream() as unknown as MediaStream;
    Object.defineProperty(window, 'MediaRecorder', {
      value: FakeMediaRecorder,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: (c: MediaStreamConstraints) => getUserMedia(c) },
      writable: true,
      configurable: true,
    });
  });

  test('recording then stopping enables playback of the take', async () => {
    await putCard(makeCard());
    render(<ListenScreen />);
    await waitFor(() => screen.getByRole('button', { name: '発音を録音' }));

    expect(screen.getByRole('button', { name: '録音を再生' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '発音を録音' }));
    await waitFor(() => screen.getByRole('button', { name: '録音を停止' }));

    fireEvent.click(screen.getByRole('button', { name: '録音を停止' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '録音を再生' })).toBeEnabled());
  });

  test('starting a recording turns off continuous playback', async () => {
    await putCard(makeCard());
    render(<ListenScreen />);
    await waitFor(() => screen.getByRole('button', { name: '発音を録音' }));

    const continuousCheckbox = screen.getByLabelText('自動連続再生') as HTMLInputElement;
    fireEvent.click(continuousCheckbox);
    expect(continuousCheckbox.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '発音を録音' }));
    await waitFor(() => expect(continuousCheckbox.checked).toBe(false));
  });

  test('moving to another card discards the recording', async () => {
    await putCard(makeCard({ id: 'a' }));
    await putCard(makeCard({ id: 'b', hanzi: '謝謝' }));
    render(<ListenScreen />);
    await waitFor(() => screen.getByRole('button', { name: '発音を録音' }));

    fireEvent.click(screen.getByRole('button', { name: '発音を録音' }));
    await waitFor(() => screen.getByRole('button', { name: '録音を停止' }));
    fireEvent.click(screen.getByRole('button', { name: '録音を停止' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '録音を再生' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: '次' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '録音を再生' })).toBeDisabled());
  });

  test('denied microphone permission hides the record button', async () => {
    getUserMedia = async () => {
      throw new DOMException('denied', 'NotAllowedError');
    };
    await putCard(makeCard());
    render(<ListenScreen />);
    await waitFor(() => screen.getByRole('button', { name: '発音を録音' }));

    fireEvent.click(screen.getByRole('button', { name: '発音を録音' }));
    await waitFor(() => screen.getByText('マイクが使用できません'));
    expect(screen.queryByRole('button', { name: '発音を録音' })).not.toBeInTheDocument();
  });
});

test('the image is shown only while its button is held', async () => {
  const image = 'data:image/webp;base64,AAAA';
  await putCard(makeCard({ image }));
  render(<ListenScreen />);
  await waitFor(() => screen.getByRole('button', { name: '再生' }));

  expect(screen.queryByAltText('你好 の画像')).not.toBeInTheDocument();

  const button = screen.getByRole('button', { name: '画像を見る' });
  fireEvent.pointerDown(button);
  expect(screen.getByAltText('你好 の画像')).toHaveAttribute('src', image);

  fireEvent.pointerUp(button);
  expect(screen.queryByAltText('你好 の画像')).not.toBeInTheDocument();
});

test('no image button for a card without an image', async () => {
  await putCard(makeCard());
  render(<ListenScreen />);
  await waitFor(() => screen.getByRole('button', { name: '再生' }));
  expect(screen.queryByRole('button', { name: '画像を見る' })).not.toBeInTheDocument();
});

test('loop playback wraps from the last card back to the first', async () => {
  await putCard(makeCard({ id: 'a', hanzi: '你好' }));
  await putCard(makeCard({ id: 'b', hanzi: '謝謝' }));
  render(<ListenScreen />);
  await waitFor(() => screen.getByText('1 / 2'));

  fireEvent.click(screen.getByLabelText('ループ再生'));
  fireEvent.click(screen.getByRole('button', { name: '次' }));
  expect(screen.getByText('2 / 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '次' }));
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '前' }));
  expect(screen.getByText('2 / 2')).toBeInTheDocument();
});

test('without loop the last card stays put', async () => {
  await putCard(makeCard({ id: 'a', hanzi: '你好' }));
  await putCard(makeCard({ id: 'b', hanzi: '謝謝' }));
  render(<ListenScreen />);
  await waitFor(() => screen.getByText('1 / 2'));

  fireEvent.click(screen.getByRole('button', { name: '次' }));
  fireEvent.click(screen.getByRole('button', { name: '次' }));
  expect(screen.getByText('2 / 2')).toBeInTheDocument();
});
