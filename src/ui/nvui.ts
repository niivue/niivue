import { Rectangle, QuadTree } from './quadtree.js'
import { IUIComponent } from './interfaces.js'
import { NVRenderer } from './nvrenderer.js'
import { Color, Vec2, Vec4 } from './types.js'
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
        // this.canvasWidth = canvas.parentElement.getBoundingClientRect().width
        // this.canvasHeight = canvas.parentElement.getBoundingClientRect().height
        const rect = canvas.parentElement.getBoundingClientRect()
        console.log('c b', rect)
        this.canvasWidth = rect.width
        this.canvasHeight = rect.height
        console.log('canvas dimensions', this.canvasWidth, this.canvasHeight)

        // Initialize style
        this.style = {
            textColor: [0, 0, 0, 1],
            foregroundColor: [1, 1, 1, 1],
            backgroundColor: [0, 0, 0, 1],
            textSize: 12 // default text size
        }
        // Initialize QuadTree with canvas bounds
        const bounds = new Rectangle(0, 0, this.canvasWidth * this.dpr, this.canvasHeight * this.dpr)
        this.quadTree = new QuadTree<IUIComponent>(bounds, this.canvasWidth * this.dpr, this.canvasHeight * this.dpr)

        // Add event listener for window resize
        this.resizeListener = this.handleWindowResize.bind(this)
        window.addEventListener('resize', this.resizeListener)

        // Add event listeners for click, focus, and mouse movement
        canvas.addEventListener('click', this.handleClick.bind(this))
        canvas.addEventListener('focus', this.handleFocus.bind(this))
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
        // const resizeEvent = window.document.createEvent('UIEvents');
        // resizeEvent.initUIEvent('resize', true, false, window, 0);
        // window.dispatchEvent(resizeEvent);
    }

    // Method to add a component to the QuadTree
    public addComponent(component: IUIComponent): void {
        this.quadTree.insert(component)
    }

    // Updated draw method to set the viewport using canvasWidth and canvasHeight
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
            component.draw(this.renderer)
        }
    }

    // Method to handle window resize events
    public handleWindowResize(): void {
        const canvas = this.gl.canvas as HTMLCanvasElement
        const width = canvas.clientWidth * this.dpr
        const height = canvas.clientHeight * this.dpr

        // Update canvasWidth and canvasHeight
        this.canvasWidth = width
        this.canvasHeight = height

        // Update the QuadTree's canvas dimensions
        this.quadTree.updateCanvasSize(width, height)
    }

    // Method to handle click events
    private handleClick(event: MouseEvent): void {
        const canvas = this.gl.canvas as HTMLCanvasElement
        const rect = canvas.getBoundingClientRect()
        const point: Vec2 = [event.clientX - rect.left, event.clientY - rect.top]
        const components = this.quadTree.queryPoint(point)
        for (const component of components) {
            component.applyEventEffects('click')
        }
    }

    // Method to handle focus events
    private handleFocus(event: FocusEvent): void {
        const components = this.quadTree.getAllElements()
        for (const component of components) {
            component.applyEventEffects('focus')
        }
    }

    // Method to handle mouse move events for mouse enter and mouse leave
    private handleMouseMove(event: MouseEvent): void {
        const canvas = this.gl.canvas as HTMLCanvasElement
        const rect = canvas.getBoundingClientRect()
        const point: Vec2 = [event.clientX - rect.left, event.clientY - rect.top]
        const components = new Set(this.quadTree.queryPoint(point))
        console.log('!')

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
        if (components.values.length > 0) {
            this.draw()
        }
    }

    // Optional: Method to remove the resize listener when NVUI is no longer needed
    public destroy(): void {
        window.removeEventListener('resize', this.resizeListener)
        const canvas = this.gl.canvas as HTMLCanvasElement
        canvas.removeEventListener('click', this.handleClick.bind(this))
        canvas.removeEventListener('focus', this.handleFocus.bind(this))
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
        xy: number[],
        str: string,
        textColor: Float32List | null = [0, 0, 0, 1.0],
        outlineColor: Float32List | null = [1.0, 1.0, 1.0, 1.0],
        fillColor: Float32List = [0.0, 0.0, 0.0, 0.3],
        margin: number = 15,
        roundness: number = 0.0,
        scale = 1.0,
        maxWidth = 0
    ): void {
        const textHeight = font.getTextHeight(str, scale)
        const wrappedSize = font.getWordWrappedSize(str, scale, maxWidth)
        const rectWidth = wrappedSize[0] + 2 * margin * scale + textHeight
        const rectHeight = wrappedSize[1] + 4 * margin * scale // Height of the rectangle enclosing the text

        const leftTopWidthHeight = [xy[0], xy[1], rectWidth, rectHeight] as [number, number, number, number]
        this.drawRoundedRect(
            leftTopWidthHeight,
            fillColor,
            outlineColor,
            (Math.min(1.0, roundness) / 2) * Math.min(leftTopWidthHeight[2], leftTopWidthHeight[3])
        )
        const descenderDepth = font.getDescenderDepth(str, scale)

        const size = font.textHeight * Math.min(this.gl.canvas.height, this.gl.canvas.width) * scale
        // Adjust the position of the text with a margin, ensuring it's vertically centered
        const textPosition = [
            leftTopWidthHeight[0] + margin * scale + textHeight / 2,
            leftTopWidthHeight[1] + 2 * margin * scale + textHeight - size + descenderDepth
        ] as [number, number]

        // Render the text
        this.drawText(font, textPosition, str, scale, textColor, maxWidth)
    }

    drawTextBoxCenteredOn(
        font: NVFont,
        xy: number[],
        str: string,
        textColor: Float32List | null = null,
        outlineColor: Float32List | null = [1.0, 1.0, 1.0, 1.0],
        fillColor: Float32List = [0.0, 0.0, 0.0, 0.3],
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
        const centeredPos = [xy[0] - rectWidth / 2, xy[1] - rectHeight / 2]

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
}
