type FocusTrapOptions = {
    initialFocus?: boolean;
    restoreFocus?: boolean;
    delayMs?: number;
};
/**
 * A hook that traps focus within a container element.
 * When multiple focus traps are active, only the topmost one will process Tab key events.
 * @param isActive Whether the focus trap is active
 * @param containerRef A ref to the container element
 * @param options FocusTrapOptions Options for the focus trap
 * @returns void
 */
export declare function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>, options?: FocusTrapOptions): void;
export {};
