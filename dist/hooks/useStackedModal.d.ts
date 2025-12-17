type StackedModalResult = {
    /**
     * Whether the modal should render its own backdrop
     */
    shouldRenderBackdrop: boolean;
    /**
     * Style object for the modal element
     */
    modalStyle: React.CSSProperties;
    /**
     * Reference to the parent modal element (if this is a stacked modal)
     */
    parentModalRef: React.RefObject<HTMLElement | null>;
};
/**
 * A hook that manages stacked modals, controlling backdrop visibility and z-index values.
 *
 * @param isStacked Whether this modal is stacked on top of another modal
 * @param isOpen Whether the modal is currently open
 * @returns An object with properties to control modal and backdrop rendering
 */
export declare function useStackedModal(isStacked: boolean, isOpen: boolean): StackedModalResult;
export default useStackedModal;
