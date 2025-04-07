import { MicRecorder } from '@tauri-apps/plugin-mic-recorder';

async function startRecordingAndVisualize() {
  try {
    await MicRecorder.start();
    console.log('Recording started...');
    // For demonstration, record for 3 seconds then stop and process the audio data.
    setTimeout(async () => {
      const audioData = await MicRecorder.stop();
      console.log('Recording stopped', audioData);
      // Apply dummy animation logic: using audioData length as a stand-in for audio volume.
      const volume = audioData?.length ? audioData.length % 256 : 0;
      const illustrationElement = document.getElementById('chatgpt-illustration');
      if (illustrationElement) {
        illustrationElement.style.transform = `scale(${1 + volume / 256})`;
      }
    }, 3000);
  } catch (error) {
    console.error('Error with mic recorder:', error);
  }
}

window.addEventListener('load', () => {
  startRecordingAndVisualize();
});
