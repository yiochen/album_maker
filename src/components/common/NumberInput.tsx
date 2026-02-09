import React, { useState, useEffect, useRef } from 'react';

interface NumberInputProps {
    /** The current numeric value */
    value: number;
    /** Callback triggered when the value is committed (on blur/Enter) or on every keystroke if immediate is true */
    onChange: (value: string) => void;
    /** Minimum allowed value */
    min?: number;
    /** Maximum allowed value */
    max?: number;
    /** Increment/decrement step for the input */
    step?: number;
    /** CSS class name for the input element */
    className?: string;
    /** Number of decimal places to show when not focused */
    precision?: number;
    /** HTML id for the input element */
    id?: string;
    /** If true, triggers onChange on every valid numeric keystroke. If false (default), only on blur/Enter. */
    immediate?: boolean;
    /** Test ID for Cypress tests */
    'data-testid'?: string;
}

/**
 * A number input component that only triggers onChange when the user finishes editing.
 * Finishing editing is defined as:
 * 1. Loosing focus (blur)
 * 2. Pressing Enter
 * 
 * This prevents the input from being reformatted while the user is still typing
 * (e.g. typing "1" then "6" for "16" shouldn't format "1" to "1.00" immediately).
 */
export const NumberInput: React.FC<NumberInputProps> = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    className = 'property-input',
    precision = 2,
    id,
    immediate = false,
    'data-testid': dataTestId,
}) => {
    const [inputValue, setInputValue] = useState(value.toFixed(precision));
    const isFocused = useRef(false);

    // Sync from props only when not focused
    useEffect(() => {
        if (!isFocused.current) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setInputValue(value.toFixed(precision));
        }
    }, [value, precision]);

    const handleBlur = () => {
        isFocused.current = false;
        commitChanges();
    };

    const handleFocus = () => {
        isFocused.current = true;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            commitChanges();
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            // Cancel: Revert to external value
            setInputValue(value.toFixed(precision));
            e.currentTarget.blur();
        }
    };

    const commitChanges = () => {
        let numericValue = parseFloat(inputValue);

        if (isNaN(numericValue)) {
            // Revert to original if invalid
            setInputValue(value.toFixed(precision));
            return;
        }

        // Apply constraints if provided
        if (min !== undefined) numericValue = Math.max(min, numericValue);
        if (max !== undefined) numericValue = Math.min(max, numericValue);

        const stringValue = numericValue.toString();
        onChange(stringValue);

        // Even if the value didn't change enough to trigger a re-render from props,
        // we might want to re-format the local state to be clean (e.g. "1" -> "1.00")
        setInputValue(numericValue.toFixed(precision));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        if (immediate) {
            const numericValue = parseFloat(newValue);
            if (!isNaN(numericValue)) {
                onChange(newValue);
            }
        }
    };

    return (
        <input
            id={id}
            type="number"
            className={className}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            step={step}
            min={min}
            max={max}
            data-testid={dataTestId}
        />
    );
};
