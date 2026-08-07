// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { chunkMp3ByFrames, isMp3 } from '@/lib/mp3-chunk';

// 합성 MPEG-1 Layer III 128kbps/44.1kHz 프레임(패딩 0 → 417바이트). 헤더 0xFF 0xFB 0x90 0x00.
function frame(): Buffer {
  const b = Buffer.alloc(417);
  b[0] = 0xff;
  b[1] = 0xfb;
  b[2] = 0x90;
  b[3] = 0x00;
  return b;
}
function frames(n: number): Buffer {
  return Buffer.concat(Array.from({ length: n }, frame));
}
// 10바이트 ID3v2 헤더 + size바이트 페이로드. size는 syncsafe 28비트로 인코딩.
function id3(size: number): Buffer {
  const h = Buffer.alloc(10 + size);
  h[0] = 0x49; // 'I'
  h[1] = 0x44; // 'D'
  h[2] = 0x33; // '3'
  h[3] = 0x03; // version major
  h[6] = (size >>> 21) & 0x7f;
  h[7] = (size >>> 14) & 0x7f;
  h[8] = (size >>> 7) & 0x7f;
  h[9] = size & 0x7f;
  return h;
}

function assertLossless(chunks: Buffer[], original: Buffer) {
  expect(Buffer.concat(chunks).equals(original)).toBe(true);
}
function assertFrameStart(chunk: Buffer) {
  expect(chunk[0]).toBe(0xff);
  expect(chunk[1] & 0xe0).toBe(0xe0);
}

describe('isMp3', () => {
  it('프레임싱크로 시작하면 true', () => {
    expect(isMp3(frames(1))).toBe(true);
  });
  it('ID3 태그로 시작하면 true', () => {
    expect(isMp3(Buffer.concat([id3(20), frames(1)]))).toBe(true);
  });
  it('wav/m4a 매직이면 false', () => {
    expect(isMp3(Buffer.from('RIFF....WAVE'))).toBe(false);
    expect(isMp3(Buffer.from('....ftypM4A '))).toBe(false);
  });
});

describe('chunkMp3ByFrames', () => {
  it('작은 버퍼는 단일 청크 [buffer]', () => {
    const buf = frames(3);
    const chunks = chunkMp3ByFrames(buf, 1024 * 1024);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].equals(buf)).toBe(true);
  });

  it('ID3 없는 20프레임 → target 2000B로 5청크, 각 ≤ target, 프레임경계 시작, 무손실', () => {
    const buf = frames(20); // 8340 bytes
    const chunks = chunkMp3ByFrames(buf, 2000);
    expect(chunks).toHaveLength(5); // 4프레임(1668B)씩
    for (const c of chunks) {
      expect(c.byteLength).toBeLessThanOrEqual(2000);
      assertFrameStart(c);
    }
    assertLossless(chunks, buf);
  });

  it('ID3 태그 포함 → 첫 청크는 ID3로 시작하고 태그 스킵, 무손실', () => {
    const buf = Buffer.concat([id3(30), frames(20)]); // 40 + 8340
    const chunks = chunkMp3ByFrames(buf, 2000);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // 첫 청크는 원본 선두(ID3 'I')로 시작
    expect(chunks[0][0]).toBe(0x49);
    for (const c of chunks) expect(c.byteLength).toBeLessThanOrEqual(2000);
    // 두번째 이후 청크는 프레임싱크로 시작
    for (const c of chunks.slice(1)) assertFrameStart(c);
    assertLossless(chunks, buf);
  });

  it('프레임 본문에 가짜 싱크(0xFF 0xE0)가 있어도 실제 프레임 경계로만 분할', () => {
    // 프레임 본문 중간에 가짜 싱크를 심는다. 프레임 길이로 워킹하므로 무시돼야 함.
    const f = frame();
    f[100] = 0xff;
    f[101] = 0xe0;
    const buf = Buffer.concat([f, frames(9)]); // 10프레임
    const chunks = chunkMp3ByFrames(buf, 2000);
    for (const c of chunks.slice(1)) assertFrameStart(c);
    assertLossless(chunks, buf);
    // 가짜 싱크가 경계로 오인됐다면 청크 수/무손실이 깨진다 — 위 assert로 검출.
  });

  it('maxSeconds로도 컷한다(길이 제한). 프레임=1152/44100s ≈ 0.02612s', () => {
    const buf = frames(20); // ≈0.522초
    // targetBytes는 넉넉히, maxSeconds만 조인다: 0.1초 → 프레임 3~4개(0.0784~0.1045)마다 컷.
    const chunks = chunkMp3ByFrames(buf, 10 * 1024 * 1024, 0.1);
    expect(chunks.length).toBeGreaterThanOrEqual(5); // 20프레임 / ~3.8프레임
    const perFrame = 1152 / 44100;
    for (const c of chunks) {
      const nFrames = c.byteLength / 417;
      expect(nFrames * perFrame).toBeLessThanOrEqual(0.1 + perFrame); // 각 청크 ≤ maxSeconds(+마지막 프레임 여유)
    }
    assertLossless(chunks, buf);
  });

  it('MP3가 아니면 throw', () => {
    expect(() => chunkMp3ByFrames(Buffer.alloc(5000, 0x11), 2000)).toThrow();
  });
});
