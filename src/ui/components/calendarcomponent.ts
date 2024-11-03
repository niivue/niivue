import { NVFont } from "../nvfont.js";
import { NVRenderer } from "../nvrenderer.js";
import { Color } from "../types.js";
import { BaseUIComponent } from "./baseuicomponent.js";

export class CalendarComponent extends BaseUIComponent {
    private font: NVFont;
    private startX: number;
    private startY: number;
    private cellWidth: number;
    private cellHeight: number;
    private selectedDate: Date;
    private selectedColor: Color;
    private firstDayOfWeek: number;

    constructor(font: NVFont, startX: number, startY: number, cellWidth: number, cellHeight: number, selectedDate: Date, selectedColor: Color, firstDayOfWeek = 0) {
        super();
        this.font = font;
        this.startX = startX;
        this.startY = startY;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.selectedDate = selectedDate;
        this.selectedColor = selectedColor;
        this.firstDayOfWeek = firstDayOfWeek;
    }

    draw(renderer: NVRenderer): void {
        renderer.drawCalendar(this.font, this.startX, this.startY, this.cellWidth, this.cellHeight, this.selectedDate, this.selectedColor, this.firstDayOfWeek);
    }
}
