/** Результат withFaceLandmarks(): и thenable (.then()), и цепочка .withFaceDescriptor() */
type FaceLandmarksResult = PromiseLike<{
  withFaceDescriptor: () => Promise<{ descriptor: Float32Array }>
  detection: { box: { x: number; y: number; width: number; height: number } }
  landmarks: {
    getLeftEye: () => { x: number; y: number }[]
    getRightEye: () => { x: number; y: number }[]
    getNose: () => { x: number; y: number }[]
  }
}> & {
  withFaceDescriptor: () => Promise<{ descriptor: Float32Array }>
}

declare global {
  interface Window {
    faceapi?: {
      nets: {
        ssdMobilenetv1: { loadFromUri: (url: string) => Promise<void> }
        faceLandmark68Net: { loadFromUri: (url: string) => Promise<void> }
        faceRecognitionNet: { loadFromUri: (url: string) => Promise<void> }
      }
      detectSingleFace: (input: HTMLVideoElement | HTMLCanvasElement, options?: unknown) => {
        withFaceLandmarks: () => FaceLandmarksResult
      }
      SsdMobilenetv1Options: new () => unknown
    }
  }
}

export {}
