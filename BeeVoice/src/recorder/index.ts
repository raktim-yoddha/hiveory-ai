export interface AudioRecorder {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
  isRecording(): boolean;
}

export class AudioRecorderStub implements AudioRecorder {
  private recording = false;

  async startRecording(): Promise<void> {
    this.recording = true;
  }

  async stopRecording(): Promise<string> {
    this.recording = false;
    throw new Error('AudioRecorderStub: no OS audio capture — provide a pre-recorded .wav path directly');
  }

  isRecording(): boolean {
    return this.recording;
  }
}
