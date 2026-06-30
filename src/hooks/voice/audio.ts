export const SAMPLE_RATE = 24_000;

export function base64ToPCM16AudioBuffer(base64: string, ctx: AudioContext): AudioBuffer {
  const binary = atob(base64);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm16   = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32_768;
  const buf = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
  buf.copyToChannel(float32, 0);
  return buf;
}
