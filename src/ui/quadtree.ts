import { Vec2 } from './types.js'
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
            point[0] >= this.x &&
            point[0] <= this.x + this.width &&
            point[1] >= this.y &&
            point[1] <= this.y + this.height
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
}

export class QuadTree<T extends IUIComponent> {
    boundary: Rectangle // Normalized coordinates [0, 1]
    capacity: number
    components: T[]
    divided: boolean
    northeast: QuadTree<T> | null
    northwest: QuadTree<T> | null
    southeast: QuadTree<T> | null
    southwest: QuadTree<T> | null

    // Canvas dimensions
    canvasWidth: number
    canvasHeight: number

    constructor(boundary: Rectangle, canvasWidth: number, canvasHeight: number, capacity = 4) {
        // Normalize the boundary coordinates
        this.boundary = new Rectangle(
            boundary.x / canvasWidth,
            boundary.y / canvasHeight,
            boundary.width / canvasWidth,
            boundary.height / canvasHeight
        )
        this.capacity = capacity
        this.components = []
        this.divided = false
        this.northeast = null
        this.northwest = null
        this.southeast = null
        this.southwest = null

        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
    }

    insert(component: T): boolean {
        console.log('canvas dimensions', this.canvasWidth, this.canvasHeight)
        // Get component position in screen coordinates
        const position = component.getPosition()
        console.log('inserting component at ', component, position)
        // Normalize position
        const normalizedPosition: Vec2 = [
            position[0] / this.canvasWidth,
            position[1] / this.canvasHeight
        ]

        console.log('normalized position', normalizedPosition)

        // Check if the component's normalized position is within the boundary
        if (!this.boundary.contains(normalizedPosition)) {
            console.log('position outside of boundary')
            return false
        }

        if (this.components.length < this.capacity) {
            this.components.push(component)
            return true
        } else {
            if (!this.divided) {
                this.subdivide()
            }
            if (this.northeast!.insert(component)) return true
            if (this.northwest!.insert(component)) return true
            if (this.southeast!.insert(component)) return true
            if (this.southwest!.insert(component)) return true
        }
        return false
    }

    subdivide(): void {
        const x = this.boundary.x
        const y = this.boundary.y
        const w = this.boundary.width / 2
        const h = this.boundary.height / 2

        const ne = new Rectangle(x + w * this.canvasWidth, y * this.canvasHeight, w * this.canvasWidth, h * this.canvasHeight)
        this.northeast = new QuadTree<T>(ne, this.canvasWidth, this.canvasHeight, this.capacity)
        const nw = new Rectangle(x * this.canvasWidth, y * this.canvasHeight, w * this.canvasWidth, h * this.canvasHeight)
        this.northwest = new QuadTree<T>(nw, this.canvasWidth, this.canvasHeight, this.capacity)
        const se = new Rectangle(x + w * this.canvasWidth, y + h * this.canvasHeight, w * this.canvasWidth, h * this.canvasHeight)
        this.southeast = new QuadTree<T>(se, this.canvasWidth, this.canvasHeight, this.capacity)
        const sw = new Rectangle(x * this.canvasWidth, y + h * this.canvasHeight, w * this.canvasWidth, h * this.canvasHeight)
        this.southwest = new QuadTree<T>(sw, this.canvasWidth, this.canvasHeight, this.capacity)

        this.divided = true
    }

    query(range: Rectangle, found: T[] = []): T[] {
        // Normalize query range
        const normalizedRange = new Rectangle(
            range.x / this.canvasWidth,
            range.y / this.canvasHeight,
            range.width / this.canvasWidth,
            range.height / this.canvasHeight
        )

        if (!this.boundary.intersects(normalizedRange)) {
            return found
        } else {
            for (const component of this.components) {
                const position = component.getPosition()
                // Normalize position
                const normalizedPosition: Vec2 = [
                    position[0] / this.canvasWidth,
                    position[1] / this.canvasHeight
                ]
                if (normalizedRange.contains(normalizedPosition)) {
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
        // Normalize point
        const normalizedPoint: Vec2 = [
            point[0] / this.canvasWidth,
            point[1] / this.canvasHeight
        ]

        if (!this.boundary.contains(normalizedPoint)) {
            return found
        } else {
            for (const component of this.components) {
                const bounds = component.getBounds()
                if (bounds[0] <= point[0] && point[0] <= bounds[0] + bounds[2] &&
                    bounds[1] <= point[1] && point[1] <= bounds[1] + bounds[3]) {
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

    // Method to update canvas bounds
    updateCanvasSize(canvasWidth: number, canvasHeight: number): void {
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight

        // Update boundary
        this.boundary = new Rectangle(
            0, 0,
            1, 1 // Since boundary is normalized, remains the same
        )

        // Update children QuadTrees
        if (this.divided) {
            this.northeast!.updateCanvasSize(canvasWidth, canvasHeight)
            this.northwest!.updateCanvasSize(canvasWidth, canvasHeight)
            this.southeast!.updateCanvasSize(canvasWidth, canvasHeight)
            this.southwest!.updateCanvasSize(canvasWidth, canvasHeight)
        }
    }
}
