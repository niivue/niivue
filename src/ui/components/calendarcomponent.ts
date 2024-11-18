import { UIKFont } from '../uikfont.js'
import { UIKRenderer } from '../uikrenderer.js'
import { Color } from '../types.js'
import { CalendarComponentConfig } from '../interfaces.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class CalendarComponent extends BaseUIComponent {
  private font: UIKFont
  private startX: number
  private startY: number
  private cellWidth: number
  private cellHeight: number
  private selectedDate: Date
  private selectedColor: Color
  private firstDayOfWeek: number

  constructor(config: CalendarComponentConfig) {
    super(config)
    this.font = config.font
    this.startX = config.startX
    this.startY = config.startY
    this.cellWidth = config.cellWidth
    this.cellHeight = config.cellHeight
    this.selectedDate = config.selectedDate
    this.selectedColor = config.selectedColor
    this.firstDayOfWeek = config.firstDayOfWeek ?? 0
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawCalendar(
      this.font,
      this.startX,
      this.startY,
      this.cellWidth,
      this.cellHeight,
      this.selectedDate,
      this.selectedColor,
      this.firstDayOfWeek
    )
  }

  // toJSON method to serialize the CalendarComponent instance
  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties
      className: 'CalendarComponent', // Class name for identification
      fontId: this.font.id, // Reference to the font by ID
      startX: this.startX,
      startY: this.startY,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
      selectedDate: this.selectedDate.toISOString(), // Serialize Date as an ISO string
      selectedColor: Array.from(this.selectedColor), // Convert to a serializable format
      firstDayOfWeek: this.firstDayOfWeek
    }
  }
}
