/**
 * MP3(MPEG 오디오)를 프레임 경계에서 바이트 분할하는 순수 함수 (서버 전용).
 *
 * OpenAI 전사 API는 요청당 25MB 하드 리밋이 있다. Plaud 기기 녹음은 CBR MP3라
 * 프레임(각 프레임은 독립 디코딩 가능) 경계로 자르면 트랜스코딩 없이 여러 개의 유효 MP3로 쪼갤 수 있다.
 * 각 청크를 따로 전사한 뒤 텍스트를 순서대로 이어붙이면 긴 녹음도 처리할 수 있다.
 *
 * 프레임 헤더(4바이트): FFFx 싱크 + version/layer/bitrate/samplerate/padding 비트.
 * 프레임 길이 = floor(samplesPerFrame/8 * bitrate / samplerate) + padding*slotSize.
 */

// 비트레이트 표(kbps). index 0=free, 15=invalid. [version][layer] 조합으로 선택.
const BITRATE: Record<string, number[]> = {
  // MPEG-1
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  // MPEG-2 / 2.5
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
// 샘플레이트 표(Hz). version별 index 0..2 (3=invalid).
const SAMPLERATE: Record<string, number[]> = {
  '1': [44100, 48000, 32000],
  '2': [22050, 24000, 16000],
  '2.5': [11025, 12000, 8000],
};

interface FrameHeader {
  versionKey: string; // '1' | '2' | '2.5'
  bitrateKey: string; // '1-3' 등 (version group + layer)
  layer: number; // 1|2|3
  bitrate: number; // kbps
  samplerate: number; // Hz
  padding: number; // 0|1
  length: number; // 프레임 총 바이트
  seconds: number; // 프레임 재생 시간(초) = samplesPerFrame / samplerate
}

/** off 위치의 4바이트를 MPEG 프레임 헤더로 파싱한다. 유효하지 않으면 null. */
function parseHeader(buf: Buffer, off: number): FrameHeader | null {
  if (off + 4 > buf.length) return null;
  if (buf[off] !== 0xff || (buf[off + 1] & 0xe0) !== 0xe0) return null;

  const verBits = (buf[off + 1] >> 3) & 0x03; // 00=2.5,01=reserved,10=2,11=1
  const layerBits = (buf[off + 1] >> 1) & 0x03; // 00=reserved,01=L3,10=L2,11=L1
  if (verBits === 0b01 || layerBits === 0b00) return null;

  const versionKey = verBits === 0b11 ? '1' : verBits === 0b10 ? '2' : '2.5';
  const versionGroup = versionKey === '1' ? '1' : '2';
  const layer = layerBits === 0b11 ? 1 : layerBits === 0b10 ? 2 : 3;

  const bitrateIdx = (buf[off + 2] >> 4) & 0x0f;
  const srIdx = (buf[off + 2] >> 2) & 0x03;
  if (bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) return null;

  const bitrateKey = `${versionGroup}-${layer}`;
  const bitrate = BITRATE[bitrateKey]?.[bitrateIdx] ?? 0;
  const samplerate = SAMPLERATE[versionKey]?.[srIdx] ?? 0;
  if (!bitrate || !samplerate) return null;

  const padding = (buf[off + 2] >> 1) & 0x01;
  // samplesPerFrame: L1=384, L2=1152, L3=MPEG1 1152 / MPEG2·2.5 576.
  const samplesPerFrame = layer === 1 ? 384 : layer === 2 ? 1152 : versionKey === '1' ? 1152 : 576;
  const slot = layer === 1 ? 4 : 1;
  const length = Math.floor((samplesPerFrame / 8) * ((bitrate * 1000) / samplerate)) + padding * slot;
  if (length < 4) return null;
  const seconds = samplesPerFrame / samplerate;

  return { versionKey, bitrateKey, layer, bitrate, samplerate, padding, length, seconds };
}

/** 두 헤더가 같은 스트림(version/layer/samplerate 일치)인지 — 오싱크 방지용 시그니처 비교. */
function sameStream(a: FrameHeader, b: FrameHeader): boolean {
  return a.versionKey === b.versionKey && a.layer === b.layer && a.samplerate === b.samplerate;
}

/** ID3v2 태그가 있으면 그 길이를 반환(첫 프레임 오프셋), 없으면 0. */
function id3v2Size(buf: Buffer): number {
  if (buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return 0;
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  return 10 + size;
}

/**
 * ID3 태그 뒤에서 첫 유효 프레임 오프셋을 찾는다.
 * 후보 싱크가 나오면 그 헤더 길이만큼 뒤가 또 유효 싱크(같은 스트림)인지 체인 검증해 오싱크를 배제한다.
 */
function findFirstFrame(buf: Buffer, start: number): number {
  for (let i = start; i + 4 <= buf.length; i++) {
    if (buf[i] !== 0xff) continue;
    const h = parseHeader(buf, i);
    if (!h) continue;
    // 다음 프레임도 같은 스트림이면 확정(오싱크 배제). 마지막 프레임(끝에 닿음)은 다음이 없으니 유효로 인정.
    if (i + h.length >= buf.length) return i;
    const next = parseHeader(buf, i + h.length);
    if (next && sameStream(h, next)) return i;
  }
  return -1;
}

/** 버퍼가 MP3(MPEG 오디오)로 보이는지. ID3 태그 또는 초반부 유효 프레임 존재로 판정. */
export function isMp3(buffer: Buffer): boolean {
  const start = id3v2Size(buffer);
  return findFirstFrame(buffer, Math.min(start, buffer.length)) !== -1;
}

/**
 * MP3 버퍼를 각 청크가 targetBytes 이하 & maxSeconds 이하가 되도록 프레임 경계에서 분할한다.
 * (OpenAI gpt-4o-transcribe는 요청당 25MB뿐 아니라 1400초 길이 제한도 있어 둘 다 만족시켜야 한다.)
 * - 각 청크(첫 청크의 ID3 태그 제외)는 프레임싱크로 시작하는 독립 디코딩 가능 MP3.
 * - 청크들을 순서대로 concat 하면 원본과 바이트 동일(무손실).
 * - 분할 대상이 없으면(작은 버퍼) [buffer] 반환.
 * @throws MP3로 파싱 불가하거나 프레임 워킹이 깨질 때(호출자가 폴백)
 */
export function chunkMp3ByFrames(
  buffer: Buffer,
  targetBytes: number = 23 * 1024 * 1024,
  maxSeconds: number = Infinity
): Buffer[] {
  const firstFrame = findFirstFrame(buffer, id3v2Size(buffer));
  if (firstFrame === -1) throw new Error('유효한 MP3 프레임을 찾지 못했습니다.');

  const ref = parseHeader(buffer, firstFrame);
  if (!ref) throw new Error('MP3 프레임 헤더 파싱 실패.');

  const cuts: number[] = [0]; // 청크 시작 오프셋들. 첫 청크는 선두(ID3 포함)부터.
  let chunkStart = 0;
  let chunkSeconds = 0;
  let off = firstFrame;

  while (off < buffer.length) {
    const h = parseHeader(buffer, off);
    // 스트림에서 벗어나면(오싱크/손상) 안전하게 폴백.
    if (!h || !sameStream(ref, h)) throw new Error('MP3 프레임 워킹 중 오싱크.');

    const frameEnd = off + h.length;
    // 이 프레임을 더하면 바이트/길이 한도 초과 & 현재 청크가 비어있지 않으면, 이 프레임 앞에서 컷.
    const overBytes = frameEnd - chunkStart > targetBytes;
    const overSeconds = chunkSeconds + h.seconds > maxSeconds;
    if ((overBytes || overSeconds) && off > chunkStart) {
      cuts.push(off);
      chunkStart = off;
      chunkSeconds = 0;
    }
    chunkSeconds += h.seconds;
    off = frameEnd;
  }

  const chunks: Buffer[] = [];
  for (let i = 0; i < cuts.length; i++) {
    const end = i + 1 < cuts.length ? cuts[i + 1] : buffer.length;
    chunks.push(buffer.subarray(cuts[i], end));
  }
  return chunks;
}
