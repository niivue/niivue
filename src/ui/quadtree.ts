import { Vec2, Vec4 } from './types.js'
import { IUIComponent } from './interfaces.js'

export class Rectangle {
  x: number // Screen coordinates
  y: number // Screen coordinates
  width: number // Screen coordinates
  height: number // Screen coordinates

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  contains(point: Vec2): boolean {
    return (
      point[0] >= this.x && point[0] <= this.x + this.width && point[1] >= this.y && point[1] <= this.y + this.height
    )
  }

  intersects(range: Rectangle): boolean {
    return !(
      range.x > this.x + this.width ||
      range.x + range.width < this.x ||
      range.y > this.y + this.height ||
      range.y + range.height < this.y
    )
  }

  static fromVec4(vec: Vec4): Rectangle {
    const rectangle = new Rectangle(vec[0], vec[1], vec[2], vec[3])
    return rectangle
  }
}

export class QuadTree<T extends IUIComponent> {
  boundary: Rectangle
  capacity: number
  components: T[]
  divided: boolean
  northeast: QuadTree<T> | null
  northwest: QuadTree<T> | null
  southeast: QuadTree<T> | null
  southwest: QuadTree<T> | null

  constructor(boundary: Rectangle, capacity = 64) {
    this.boundary = boundary
    this.capacity = capacity
    this.components = []
    this.divided = false
    this.northeast = null
    this.northwest = null
    this.southeast = null
    this.southwest = null
  }

  insert(component: T): boolean {
    const position = component.getPosition()

    if (!this.boundary.contains(position)) {
      return false
    }

    if (this.components.length < this.capacity) {
      this.components.push(component)
      return true
    } else {
      if (!this.divided) {
        this.subdivide()
      }
      if (this.northeast!.insert(component)) {
        return true
      }
      if (this.northwest!.insert(component)) {
        return true
      }
      if (this.southeast!.insert(component)) {
        return true
      }
      if (this.southwest!.insert(component)) {
        return true
      }
    }
    return false
  }

  subdivide(): void {
    const x = this.boundary.x
    const y = this.boundary.y
    const w = this.boundary.width / 2
    const h = this.boundary.height / 2

    const ne = new Rectangle(x + w, y, w, h)
    this.northeast = new QuadTree<T>(ne, this.capacity)
    const nw = new Rectangle(x, y, w, h)
    this.northwest = new QuadTree<T>(nw, this.capacity)
    const se = new Rectangle(x + w, y + h, w, h)
    this.southeast = new QuadTree<T>(se, this.capacity)
    const sw = new Rectangle(x, y + h, w, h)
    this.southwest = new QuadTree<T>(sw, this.capacity)

    this.divided = true
  }

  remove(component: T): boolean {
    const position = component.getPosition()
    if (!this.boundary.contains(position)) {
      return false
    }

    const index = this.components.indexOf(component)
    if (index !== -1) {
      this.components.splice(index, 1)
      return true
    }

    if (this.divided) {
      if (this.northwest!.remove(component)) {
        return true
      }
      if (this.northeast!.remove(component)) {
        return true
      }
      if (this.southwest!.remove(component)) {
        return true
      }
      if (this.southeast!.remove(component)) {
        return true
      }
    }

    return false
  }

  query(range: Rectangle, found: T[] = []): T[] {
    if (!this.boundary.intersects(range)) {
      return found
    } else {
      for (const component of this.components) {
        const bounds = component.getBounds()
        if (range.contains([bounds[0], bounds[1]])) {
          found.push(component)
        }
      }
      if (this.divided) {
        this.northwest!.query(range, found)
        this.northeast!.query(range, found)
        this.southwest!.query(range, found)
        this.southeast!.query(range, found)
      }
      return found
    }
  }

  queryPoint(point: Vec2, found: T[] = []): T[] {
    if (!this.boundary.contains(point)) {
      return found
    } else {
      for (const component of this.components) {
        const bounds = component.getBounds()
        if (
          bounds[0] <= point[0] &&
          point[0] <= bounds[0] + bounds[2] &&
          bounds[1] <= point[1] &&
          point[1] <= bounds[1] + bounds[3]
        ) {
          found.push(component)
        }
      }
      if (this.divided) {
        this.northwest!.queryPoint(point, found)
        this.northeast!.queryPoint(point, found)
        this.southwest!.queryPoint(point, found)
        this.southeast!.queryPoint(point, found)
      }
      return found
    }
  }

  getAllElements(): T[] {
    let elements = [...this.components]
    if (this.divided) {
      elements = elements.concat(this.northwest!.getAllElements())
      elements = elements.concat(this.northeast!.getAllElements())
      elements = elements.concat(this.southwest!.getAllElements())
      elements = elements.concat(this.southeast!.getAllElements())
    }
    return elements
  }

  updateBoundary(newBoundary: Rectangle): void {
    this.boundary = newBoundary
    if (this.divided) {
      this.subdivide()
    }
  }

  getBoundary(): Vec4 {
    return [this.boundary.x, this.boundary.y, this.boundary.width, this.boundary.height]
  }
}
