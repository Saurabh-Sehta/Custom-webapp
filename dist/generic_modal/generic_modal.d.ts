import React from 'react';
import './generic_modal.scss';
export type ModalLocation = 'top' | 'center' | 'bottom';
export type Props = {
    className?: string;
    onExited?: () => void;
    onEntered?: () => void;
    onHide?: () => void;
    modalHeaderText?: React.ReactNode;
    modalHeaderTextId?: string;
    modalSubheaderText?: React.ReactNode;
    show?: boolean;
    handleCancel?: () => void;
    handleConfirm?: () => void;
    handleEnterKeyPress?: () => void;
    handleKeydown?: (event?: React.KeyboardEvent<HTMLDivElement>) => void;
    confirmButtonText?: React.ReactNode;
    confirmButtonClassName?: string;
    cancelButtonText?: React.ReactNode;
    cancelButtonClassName?: string;
    isConfirmDisabled?: boolean;
    isDeleteModal?: boolean;
    id?: string;
    autoCloseOnCancelButton?: boolean;
    autoCloseOnConfirmButton?: boolean;
    enforceFocus?: boolean;
    container?: React.ReactNode | React.ReactNodeArray;
    ariaLabel?: string;
    ariaLabelledby?: string;
    errorText?: string | React.ReactNode;
    compassDesign?: boolean;
    backdrop?: boolean | 'static';
    backdropClassName?: string;
    tabIndex?: number;
    children: React.ReactNode;
    autoFocusConfirmButton?: boolean;
    keyboardEscape?: boolean;
    headerInput?: React.ReactNode;
    bodyPadding?: boolean;
    bodyDivider?: boolean;
    bodyOverflowVisible?: boolean;
    footerContent?: React.ReactNode;
    footerDivider?: boolean;
    appendedContent?: React.ReactNode;
    headerButton?: React.ReactNode;
    showCloseButton?: boolean;
    showHeader?: boolean;
    /**
     * Whether this modal is stacked on top of another modal.
     * When true, the modal will not render its own backdrop and will
     * adjust the z-index of the parent modal's backdrop.
     */
    isStacked?: boolean;
    modalLocation?: ModalLocation;
    /**
     * Optionally set a test ID for the container, so that the modal can be easily referenced
     * in tests (Cypress, Playwright, etc.)
     */
    dataTestId?: string;
    /**
     * Whether to delay activating the focus trap.
     *
     * This is useful for modals with dynamic content that might not be fully
     * rendered when the modal is opened. The delay allows the DOM to settle
     * before the focus trap identifies focusable elements. ie. MultiSelect
     *
     * When true, applies a 500ms delay.
     */
    delayFocusTrap?: boolean;
};
export declare const GenericModal: React.FC<Props>;
export default GenericModal;
