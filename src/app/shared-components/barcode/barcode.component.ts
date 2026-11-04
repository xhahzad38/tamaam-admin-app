import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Bar and space widths for Code 128 symbols 0–105, then the stop symbol.
 */
const PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232'
];
const START_B = 104;
const STOP = '2331112';
const QUIET = 10;

/**
 * Widths of the bars for a Code 128 (set B) barcode, quiet zones excluded. Characters outside printable ASCII are dropped.
 */
export function code128Modules(value: string): string {
    const codes = [...value].map((char) => char.charCodeAt(0) - 32).filter((code) => code >= 0 && code <= 95);
    const checksum = codes.reduce((sum, code, index) => sum + code * (index + 1), START_B) % 103;
    return [START_B, ...codes, checksum].map((code) => PATTERNS[code]).join('') + STOP;
}

interface Bar {
    x: number;
    width: number;
}

@Component({
    selector: 'app-barcode',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg
            class="barcode"
            [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
            [attr.width]="fluid() ? '100%' : width() * module()"
            [attr.height]="height() * module()"
            preserveAspectRatio="none"
            role="img"
            [attr.aria-label]="'Barcode ' + value()"
        >
            <rect x="0" y="0" [attr.width]="width()" [attr.height]="height()" fill="#fff" />
            @for (bar of bars(); track $index) {
                <rect [attr.x]="bar.x" y="0" [attr.width]="bar.width" [attr.height]="height()" fill="#000" />
            }
        </svg>
        @if (showText()) {
            <span class="barcode__text">{{ value() }}</span>
        }
    `,
    styles: [
        `
            :host {
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                max-width: 100%;
            }
            .barcode {
                display: block;
                max-width: 100%;
                shape-rendering: crispEdges;
            }
            .barcode__text {
                margin-top: 2px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 0.8em;
                letter-spacing: 0.08em;
            }
        `
    ]
})
export class BarcodeComponent {
    readonly value = input.required<string>();
    /** Bar height in modules. */
    readonly barHeight = input(40);
    /** Pixels per module when not fluid. */
    readonly module = input(1.5);
    readonly showText = input(true);
    /** Stretch to the width of the container instead of a fixed size. */
    readonly fluid = input(false);

    private readonly modules = computed(() => code128Modules(this.value() ?? ''));
    readonly width = computed(() => [...this.modules()].reduce((sum, digit) => sum + Number(digit), 0) + QUIET * 2);
    readonly height = computed(() => this.barHeight());
    readonly bars = computed(() => {
        const bars: Bar[] = [];
        let x = QUIET;
        [...this.modules()].forEach((digit, index) => {
            const width = Number(digit);
            if (index % 2 === 0) {
                bars.push({ x, width });
            }
            x += width;
        });
        return bars;
    });
}
