class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      const pcm16 = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(channel[i] * 32767)));
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
