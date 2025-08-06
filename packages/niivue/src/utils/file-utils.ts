export function readFileAsDataURL(input: File | FileSystemFileEntry): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let filePromise: Promise<File>

    if (input instanceof File) {
      filePromise = Promise.resolve(input)
    } else {
      filePromise = new Promise<File>((resolve, reject) => {
        input.file(resolve, reject)
      })
    }

    filePromise
      .then((file) => {
        const reader = new FileReader()

        reader.onload = (): void => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Expected a string from FileReader.result'))
          }
        }

        reader.onerror = (): void => {
          reject(reader.error ?? new Error('Unknown FileReader error'))
        }

        reader.readAsDataURL(file)
      })
      .catch((err) => reject(err))
  })
}
