declare module '@niivue/dcm2niix' {
  export class Dcm2niix {
    init(): Promise<void>
    input(files: File[]): {
      run: () => Promise<File[]>
    }
  }
}
