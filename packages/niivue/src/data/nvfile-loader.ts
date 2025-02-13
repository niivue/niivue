export abstract class NVFileLoader<T> {
    data: T
  
    protected constructor(data: T) {
      this.data = data
    }
  
    static async fetchBinary(url: string): Promise<ArrayBuffer> {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)
      return await response.arrayBuffer()
    }
  
    static async create<T, U extends NVFileLoader<T>>(this: new (data: T) => U, url: string): Promise<U> {
      const buffer = await NVFileLoader.fetchBinary(url) // Explicitly reference NVFileLoader
      return new this(this.prototype.parse(buffer)) // Use `this.prototype.parse`
    }
  
    static async createFromFile<T, U extends NVFileLoader<T>>(this: new (data: T) => U, file: File): Promise<U> {
      const buffer = await NVFileLoader.readFile(file) // Explicitly reference NVFileLoader
      return new this(this.prototype.parse(buffer))
    }
  
    static async readFile(file: File): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(file)
      })
    }
  
    protected abstract parse(buffer: ArrayBuffer): T
  }
  