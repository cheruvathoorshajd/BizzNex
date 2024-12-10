import React, { useEffect, useRef, useState } from 'react';

/**
 * Calculator component renders a custom calculator UI using HTML canvas.
 * 
 * @component
 * @example
 * return (
 *   <Calculator />
 * )
 */
const Calculator: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [expression, setExpression] = useState<string>('');

    // Constants
    const SCALE = 0.85; // Scale factor for the canvas elements
    const COLORS = {
        BACKGROUND: '#2D2D2D',
        DISPLAY: '#1C1C1C',
        BUTTON_REGULAR: '#505050',
        BUTTON_OPERATOR: '#FF9F0A',
        TEXT: '#FFFFFF',
        CONTROLS: {
            CLOSE: '#FF5F56',
            MINIMIZE: '#FFBD2E',
            MAXIMIZE: '#27C93F'
        }
    };

    const BUTTONS = [
        { label: '(', x: 0, y: 0, type: 'regular' },
        { label: '7', x: 1, y: 0, type: 'regular' },
        { label: '8', x: 2, y: 0, type: 'regular' },
        { label: '9', x: 3, y: 0, type: 'regular' },
        { label: '/', x: 4, y: 0, type: 'operator' },
        { label: ')', x: 0, y: 1, type: 'regular' },
        { label: '4', x: 1, y: 1, type: 'regular' },
        { label: '5', x: 2, y: 1, type: 'regular' },
        { label: '6', x: 3, y: 1, type: 'regular' },
        { label: 'x', x: 4, y: 1, type: 'operator' },
        { label: 'Back', x: 0, y: 2, type: 'regular' },
        { label: '1', x: 1, y: 2, type: 'regular' },
        { label: '2', x: 2, y: 2, type: 'regular' },
        { label: '3', x: 3, y: 2, type: 'regular' },
        { label: '-', x: 4, y: 2, type: 'operator' },
        { label: '%', x: 0, y: 3, type: 'regular' },
        { label: '0', x: 1, y: 3, colspan: 2, type: 'regular' },
        { label: '.', x: 3, y: 3, type: 'regular' },
        { label: '+', x: 4, y: 3, type: 'operator' },
        { label: '=', x: 4, y: 4, type: 'operator' }
    ];

    useEffect(() => {
        drawCalculator();
    }, [expression]);

    /**
     * Draws the window control buttons (close, minimize, maximize) on the canvas.
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     */
    const drawWindowControls = (ctx: CanvasRenderingContext2D) => {
        const controls = [
            { color: COLORS.CONTROLS.CLOSE },
            { color: COLORS.CONTROLS.MINIMIZE },
            { color: COLORS.CONTROLS.MAXIMIZE }
        ];

        controls.forEach((control, index) => {
            ctx.beginPath();
            ctx.fillStyle = control.color;
            ctx.arc(20 * SCALE + (index * 25 * SCALE), 20 * SCALE, 6 * SCALE, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    /**
     * Draws the display area of the calculator on the canvas.
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     */
    const drawDisplay = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = COLORS.DISPLAY;
        ctx.fillRect(0, 40 * SCALE, 500 * SCALE, 80 * SCALE);
        ctx.fillStyle = COLORS.TEXT;
        ctx.font = `${45 * SCALE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(expression || '0', 480 * SCALE, 80 * SCALE);
    };

    /**
     * Draws a button on the canvas.
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {Object} button - The button configuration object.
     */
    const drawButton = (ctx: CanvasRenderingContext2D, button: any) => {
        const BUTTON_SIZE = 100 * SCALE;
        const BUTTON_MARGIN = 1 * SCALE;
        const startY = 120 * SCALE;
        const x = button.x * BUTTON_SIZE;
        const y = startY + (button.y * BUTTON_SIZE);
        const width = (button.colspan || 1) * BUTTON_SIZE - BUTTON_MARGIN;
        const height = BUTTON_SIZE - BUTTON_MARGIN;

        ctx.fillStyle = button.type === 'operator' ? COLORS.BUTTON_OPERATOR : COLORS.BUTTON_REGULAR;
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = COLORS.TEXT;
        ctx.font = `${29 * SCALE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, x + width / 2, y + height / 2);
    };

    /**
     * Draws the entire calculator UI on the canvas.
     */
    const drawCalculator = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = COLORS.BACKGROUND;
        ctx.fillRect(0, 0, 500 * SCALE, 600 * SCALE);
        drawWindowControls(ctx);
        drawDisplay(ctx);
        BUTTONS.forEach(button => drawButton(ctx, button));
    };

    /**
     * Processes the button click and updates the expression state.
     * 
     * @param {string} label - The label of the button clicked.
     */
    const processButton = (label: string) => {
        switch(label) {
            case '=':
                try {
                    const evalExpression = expression.replace(/x/g, '*');
                    const result = eval(evalExpression);
                    setExpression(result.toString());
                } catch {
                    setExpression('Invalid Expression');
                }
                break;
            case 'Back':
                setExpression(prev => prev.slice(0, -1));
                break;
            default:
                setExpression(prev => prev + label);
        }
    };

    /**
     * Handles the click event on the canvas and determines which button was clicked.
     * 
     * @param {React.MouseEvent<HTMLCanvasElement>} event - The mouse click event.
     */
    const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const BUTTON_SIZE = 100 * SCALE;
        const startY = 120 * SCALE;

        const button = BUTTONS.find(btn => {
            const btnX = btn.x * BUTTON_SIZE;
            const btnY = startY + (btn.y * BUTTON_SIZE);
            const width = (btn.colspan || 1) * BUTTON_SIZE;
            return x >= btnX && x < btnX + width && y >= btnY && y < btnY + BUTTON_SIZE;
        });

        if (button) {
            processButton(button.label);
        }
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <canvas 
                ref={canvasRef} 
                width={500 * SCALE} 
                height={600 * SCALE} 
                onClick={handleClick}
                style={{ borderRadius: '15px', boxShadow: '20px 20px 30px rgba(0, 0, 0, 0.1)' }}
            />
        </div>
    );
};

export default Calculator;
