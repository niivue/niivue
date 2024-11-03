import { IUIComponent } from './interfaces.js'
import { Rectangle } from './quadtree.js'
import { Vec2, Vec4, Color } from './types.js'
import { NVRenderer } from './nvrenderer.js'
import { QuadTree } from './quadtree.js'
import { NVFont } from './nvfont.js'
import { NVBitmap } from './nvbitmap.js'
import { LineTerminator } from './types.js'

export class NVUI {
    private gl: WebGL2RenderingContext
    private renderer: NVRenderer
    private quadTree: QuadTree<IUIComponent>

    // Style field
    public style: {
        textColor: Color
        foregroundColor: Color
        backgroundColor: Color
        textSize: number
    }

    private canvasWidth: number
    private canvasHeight: number
    private dpr: number
    private resizeListener: () => void

    // Static enum for line terminators
    public static lineTerminator = LineTerminator

    private lastHoveredComponents: Set<IUIComponent> = new Set()

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl
        this.renderer = new NVRenderer(gl)
        this.dpr = window.devicePixelRatio || 1
        // Initialize canvasWidth and canvasHeight
        const canvas = this.gl.canvas as HTMLCanvasElement
        const rect = canvas.parentElement.getBoundingClientRect()
        this.canvasWidth = rect.width
        this.canvasHeight = rect.height

        // Initialize style
        this.style = {
            textColor: [0, 0, 0, 1],
            foregroundColor: [1, 1, 1, 1],
            backgroundColor: [0, 0, 0, 1],
            textSize: 12 // default text size
        }
        // Initialize QuadTree with canvas bounds
        const bounds = new Rectangle(0, 0, this.canvasWidth * this.dpr, this.canvasHeight * this.dpr)
        this.quadTree = new QuadTree<IUIComponent>(bounds)

        // Add event listener for window resize
        this.resizeListener = this.handleWindowResize.bind(this)
        window.addEventListener('resize', this.resizeListener)

        // Add event listeners for click, focus, and mouse movement
        canvas.addEventListener('click', this.handleClick.bind(this))
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    }

    // Method to add a component to the QuadTree
    public addComponent(component: IUIComponent): void {
        component.requestRedraw = this.requestRedraw.bind(this)
        this.quadTree.insert(component)
    }

    public draw(boundsInScreenCoords?: Vec4): void {
        // Update the WebGL viewport using canvasWidth and canvasHeight
        this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight)

        let components: IUIComponent[]

        if (boundsInScreenCoords) {
            const queryRectangle = new Rectangle(
                boundsInScreenCoords[0],
                boundsInScreenCoords[1],
                boundsInScreenCoords[2],
                boundsInScreenCoords[3]
            )
            components = this.quadTree.query(queryRectangle)
        } else {
            components = this.quadTree.getAllElements()
        }

        for (const component of components) {
            if (component.isVisible) {
                component.draw(this.renderer)
            }
        }
    }


    // Method to request a redraw
    private requestRedraw(): void {
        this.draw()
    }

    // Method to handle window resize events
    public handleWindowResize(): void {
        const canvas = this.gl.canvas as HTMLCanvasElement
        const width = canvas.clientWidth * this.dpr
        const height = canvas.clientHeight * this.dpr

        // Update canvasWidth and canvasHeight
        this.canvasWidth = width
        this.canvasHeight = height

        const bounds = new Rectangle(0, 0, this.canvasWidth * this.dpr, this.canvasHeight * this.dpr)
        this.quadTree.updateBoundary(bounds)
    }

    // Method to handle click events
    private handleClick(event: MouseEvent): void {
        const canvas = this.gl.canvas as HTMLCanvasElement
        const rect = canvas.getBoundingClientRect()
        const point: Vec2 = [(event.clientX - rect.left) * this.dpr, (event.clientY - rect.top) * this.dpr]
        const components = this.quadTree.queryPoint(point)
        for (const component of components) {
            component.applyEventEffects('click')
        }
    }


    // Method to handle mouse move events for mouse enter and mouse leave
    private handleMouseMove(event: MouseEvent): void {
        const canvas = this.gl.canvas as HTMLCanvasElement
        const rect = canvas.getBoundingClientRect()
        const point: Vec2 = [(event.clientX - rect.left) * this.dpr, (event.clientY - rect.top) * this.dpr]

        const components = new Set(this.quadTree.queryPoint(point))

        // Handle mouse enter for newly hovered components
        for (const component of components) {
            if (!this.lastHoveredComponents.has(component)) {
                component.applyEventEffects('mouseEnter')
            }
        }

        // Handle mouse leave for components that are no longer hovered
        for (const component of this.lastHoveredComponents) {
            if (!components.has(component)) {
                component.applyEventEffects('mouseLeave')
            }
        }

        this.lastHoveredComponents = components
        if (components.size > 0) {
            this.draw()
        }
    }

    // Optional: Method to remove the resize listener when NVUI is no longer needed
    public destroy(): void {
        window.removeEventListener('resize', this.resizeListener)
        const canvas = this.gl.canvas as HTMLCanvasElement
        canvas.removeEventListener('click', this.handleClick.bind(this))
        canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    }

    // Proxy methods for renderer's draw calls

    public drawText(
        font: NVFont,
        position: Vec2,
        text: string,
        scale = 1.0,
        color: Color = [1, 1, 1, 1],
        maxWidth = 0
    ): void {
        this.renderer.drawText(font, position, text, scale, color, maxWidth)
    }

    public drawBitmap(bitmap: NVBitmap, position: Vec2, scale: number): void {
        this.renderer.drawBitmap(bitmap, position, scale)
    }

    public drawLine(
        startEnd: Vec4,
        thickness = 1,
        lineColor: Color = [1, 0, 0, 1],
        terminator: LineTerminator = LineTerminator.NONE
    ): void {
        this.renderer.drawLine(startEnd, thickness, lineColor, terminator)
    }

    public drawRect(
        leftTopWidthHeight: Vec4,
        lineColor: Color = [1, 0, 0, 1]
    ): void {
        this.renderer.drawRect(leftTopWidthHeight, lineColor)
    }

    public drawRoundedRect(
        leftTopWidthHeight: Vec4,
        fillColor: Color,
        outlineColor: Color,
        cornerRadius: number = -1,
        thickness: number = 10
    ): void {
        this.renderer.drawRoundedRect(leftTopWidthHeight, fillColor, outlineColor, cornerRadius, thickness)
    }

    public drawCircle(
        leftTopWidthHeight: Vec4,
        circleColor: Color = [1, 1, 1, 1],
        fillPercent = 1.0
    ): void {
        this.renderer.drawCircle(leftTopWidthHeight, circleColor, fillPercent)
    }

    public drawToggle(
        position: Vec2,
        size: Vec2,
        isOn: boolean,
        onColor: Color,
        offColor: Color
    ): void {
        this.renderer.drawToggle(position, size, isOn, onColor, offColor)
    }

    public drawTriangle(
        headPoint: Vec2,
        baseMidPoint: Vec2,
        baseLength: number,
        color: Color
    ): void {
        this.renderer.drawTriangle(headPoint, baseMidPoint, baseLength, color)
    }

    public drawRotatedText(
        font: NVFont,
        position: Vec2,
        text: string,
        scale = 1.0,
        color: Color = [1, 0, 0, 1],
        rotation = 0.0 // Rotation in radians
    ): void {
        this.renderer.drawRotatedText(font, position, text, scale, color, rotation)
    }

    // Updated drawTextBox method to support maxWidth and word wrapping
    drawTextBox(
        font: NVFont,
        xy: Vec2,
        str: string,
        textColor: Color = [0, 0, 0, 1.0],
        outlineColor: Color = [1.0, 1.0, 1.0, 1.0],
        fillColor: Color = [0.0, 0.0, 0.0, 0.3],
        margin: number = 15,
        roundness: number = 0.0,
        scale = 1.0,
        maxWidth = 0
    ): void {
        this.renderer.drawTextBox(font, xy, str, textColor, outlineColor, fillColor, margin, roundness, scale, maxWidth)
    }

    drawTextBoxCenteredOn(
        font: NVFont,
        xy: Vec2,
        str: string,
        textColor: Color = [0, 0, 0, 1.0],
        outlineColor: Color = [1.0, 1.0, 1.0, 1.0],
        fillColor: Color = [0.0, 0.0, 0.0, 0.3],
        margin: number = 15,
        roundness: number = 0.0,
        scale = 1.0,
        maxWidth = 0
    ): void {
        const textWidth = font.getTextWidth(str, scale)
        const textHeight = font.getTextHeight(str, scale)
        const padding = textHeight > textWidth ? textHeight - textWidth : 0
        const rectWidth = textWidth + 2 * margin * scale + textHeight + padding
        const rectHeight = font.getTextHeight(str, scale) + 4 * margin * scale // Height of the rectangle enclosing the text
        const centeredPos = [xy[0] - rectWidth / 2, xy[1] - rectHeight / 2] as Vec2

        this.drawTextBox(font, centeredPos, str, textColor, outlineColor, fillColor, margin, roundness, scale, maxWidth)
    }

    public drawCalendar(
        font: NVFont,
        startX: number,
        startY: number,
        cellWidth: number,
        cellHeight: number,
        selectedDate: Date,
        selectedColor: Color,
        firstDayOfWeek: number = 0 // 0 represents Sunday
    ): void {
        this.renderer.drawCalendar(
            font,
            startX,
            startY,
            cellWidth,
            cellHeight,
            selectedDate,
            selectedColor,
            firstDayOfWeek
        )
    }

    drawCaliper(pointA: Vec2, pointB: Vec2, text: string, font: NVFont, textColor: Color = [1, 0, 0, 1], lineColor: Color = [0, 0, 0, 1], lineThickness: number = 1, offset: number = 40): void {
        this.renderer.drawCaliper(pointA, pointB, text, font, textColor, lineColor, lineThickness, offset)
    }
}
