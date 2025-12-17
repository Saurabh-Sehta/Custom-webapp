import classNames from 'classnames';
import React, { useRef, useEffect, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import { useIntl, FormattedMessage } from 'react-intl';
import { ChevronLeftIcon, ChevronRightIcon } from '@mattermost/compass-icons/components';
import styled, { keyframes } from 'styled-components';
import Tippy from '@tippyjs/react';
import ReactDOM from 'react-dom';
import throttle from 'lodash/throttle';

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// A global stack to hold active focus trap containers.
// This ensures that only the topmost trap processes Tab events.
const activeFocusTraps = [];
/**
 * A hook that traps focus within a container element.
 * When multiple focus traps are active, only the topmost one will process Tab key events.
 * @param isActive Whether the focus trap is active
 * @param containerRef A ref to the container element
 * @param options FocusTrapOptions Options for the focus trap
 * @returns void
 */
function useFocusTrap(isActive, containerRef, options = { initialFocus: false, restoreFocus: false }) {
    const previousFocusRef = useRef(null);
    // Add a ref to store the cached focusable elements
    const focusableElementsRef = useRef([]);
    useEffect(() => {
        const container = containerRef.current;
        if (!isActive || !container) {
            return;
        }
        // Store the previously focused element for restoration if needed
        if (options.restoreFocus) {
            previousFocusRef.current = document.activeElement;
        }
        let timeoutId = null;
        let trapActive = false;
        // Function to cache focusable elements and activate the trap
        const activateFocusTrap = () => {
            // Cache the focusable elements
            focusableElementsRef.current = getFocusableElements(container);
            // Register this focus trap (push it onto the global stack)
            activeFocusTraps.push(container);
            trapActive = true;
            if (focusableElementsRef.current.length === 0) {
                return;
            }
            // Set initial focus if needed
            if (options.initialFocus && focusableElementsRef.current.length > 0) {
                focusableElementsRef.current[0].focus();
            }
        };
        // Function to refresh the cached elements if needed
        const refreshFocusableElements = () => {
            focusableElementsRef.current = getFocusableElements(container);
        };
        // Delay the activation if delayMs is specified
        if (options.delayMs && options.delayMs > 0) {
            timeoutId = setTimeout(activateFocusTrap, options.delayMs);
        }
        else {
            // Activate immediately if no delay
            activateFocusTrap();
        }
        // Handle tab key navigation - only trap Tab key, let other keys propagate
        const handleKeyDown = (e) => {
            // Only handle Tab key for focus trapping
            if (e.key !== 'Tab') {
                return;
            }
            // Only process if this container is the top-most active focus trap
            // AND if the focus trap has been activated (after delay)
            if (!trapActive || activeFocusTraps[activeFocusTraps.length - 1] !== container) {
                return;
            }
            // Use the cached focusable elements
            const elements = focusableElementsRef.current;
            if (elements.length === 0) {
                return;
            }
            const firstElement = elements[0];
            const lastElement = elements[elements.length - 1];
            // If shift+tab on first element, move to last element
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
            else if (!e.shiftKey && document.activeElement === lastElement) { // If tab on last element, move to first element
                e.preventDefault();
                firstElement.focus();
            }
        };
        // Set up a MutationObserver to detect DOM changes that might affect focusable elements
        const observer = new MutationObserver(() => {
            // Only refresh if the trap is active
            if (trapActive) {
                refreshFocusableElements();
            }
        });
        // Start observing the container for changes that might affect focusability
        observer.observe(container, {
            childList: true, // Watch for changes to child elements
            subtree: true, // Watch the entire subtree
            attributes: true, // Watch for attribute changes
            attributeFilter: ['tabindex', 'disabled'], // Only care about attributes that affect focusability
        });
        document.addEventListener('keydown', handleKeyDown);
        // Cleanup function
        // eslint-disable-next-line consistent-return
        return () => {
            // Clear the timeout if component unmounts during delay
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Stop the observer
            observer.disconnect();
            document.removeEventListener('keydown', handleKeyDown);
            // Only remove from stack if it was actually added
            if (trapActive) {
                const index = activeFocusTraps.indexOf(container);
                if (index > -1) {
                    activeFocusTraps.splice(index, 1);
                }
            }
            // Restore focus when trap is deactivated
            if (options.restoreFocus && previousFocusRef.current) {
                previousFocusRef.current.focus();
            }
        };
    }, [isActive, containerRef, options.initialFocus, options.restoreFocus, options.delayMs]);
}
/**
 * Helper function to get all focusable elements within a container
 * @param container The container element
 * @returns An array of focusable elements
 */
function getFocusableElements(container) {
    const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const elements = Array.from(container.querySelectorAll(selector));
    // Filter out hidden elements
    return elements.filter((element) => isElementVisible(element));
}
/**
 * Checks if an element is visible in the DOM
 * @param element The element to check
 * @returns true if the element is visible, false otherwise
 */
function isElementVisible(element) {
    // Check if the element has zero dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        return false;
    }
    // Check computed styles for this element and its ancestors
    let currentElement = element;
    while (currentElement) {
        const style = window.getComputedStyle(currentElement);
        // Check common ways elements can be hidden
        if (style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.pointerEvents === 'none' ||
            currentElement.hasAttribute('hidden')) {
            return false;
        }
        currentElement = currentElement.parentElement;
    }
    return true;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
const BASE_MODAL_Z_INDEX = 1050; // Bootstrap default modal z-index
const BASE_BACKDROP_Z_INDEX = 1040; // Bootstrap default backdrop z-index
const Z_INDEX_INCREMENT = 10; // Increment for each stacked modal level
/**
 * A hook that manages stacked modals, controlling backdrop visibility and z-index values.
 *
 * @param isStacked Whether this modal is stacked on top of another modal
 * @param isOpen Whether the modal is currently open
 * @returns An object with properties to control modal and backdrop rendering
 */
function useStackedModal(isStacked, isOpen) {
    // State to track whether this modal should render its own backdrop
    const [shouldRenderBackdrop, setShouldRenderBackdrop] = useState(!isStacked);
    // State to track z-index values
    const [zIndexes, setZIndexes] = useState({
        modal: BASE_MODAL_Z_INDEX,
        backdrop: BASE_BACKDROP_Z_INDEX,
    });
    // Ref to store the parent modal element
    const parentModalRef = useRef(null);
    // Ref to store the original z-index of the parent modal's backdrop
    const originalBackdropZIndexRef = useRef(null);
    // Ref to store the parent modal's backdrop element
    const backdropRef = useRef(null);
    // Ref to store the original opacity of the parent modal's backdrop
    const originalBackdropOpacityRef = useRef(null);
    useLayoutEffect(() => {
        // If this is not a stacked modal, do nothing
        if (!isStacked) {
            return;
        }
        // If modal is closed, reset state and do cleanup
        if (!isOpen) {
            setShouldRenderBackdrop(false);
            setZIndexes({
                modal: BASE_MODAL_Z_INDEX,
                backdrop: BASE_BACKDROP_Z_INDEX,
            });
            return;
        }
        // No timeout needed since we're not using delay
        // Function to adjust the backdrop for stacked modals
        const adjustBackdrop = () => {
            // For stacked modals, we want to render our own backdrop
            setShouldRenderBackdrop(true);
            // Calculate the z-index for the stacked modal
            const stackedModalZIndex = BASE_MODAL_Z_INDEX + Z_INDEX_INCREMENT;
            // Update the z-index for this modal and its backdrop
            // The backdrop should be above the parent modal (1050) but below the stacked modal
            setZIndexes({
                modal: stackedModalZIndex,
                backdrop: stackedModalZIndex - 1, // This is 1050 + 10 - 1 = 1059
            });
            // Adjust the parent backdrop's opacity and z-index
            if (typeof document !== 'undefined') {
                // Find all existing backdrops in the DOM
                const backdrops = document.querySelectorAll('.modal-backdrop');
                if (backdrops.length > 0) {
                    // Get the most recent backdrop (the one with the highest z-index)
                    // This should be the backdrop of the parent modal
                    const parentBackdrop = backdrops[backdrops.length - 1];
                    backdropRef.current = parentBackdrop;
                    originalBackdropZIndexRef.current = parentBackdrop.style.zIndex || String(BASE_BACKDROP_Z_INDEX);
                    originalBackdropOpacityRef.current = parentBackdrop.style.opacity || '0.5'; // Default Bootstrap backdrop opacity
                    // Add a transition for smooth opacity change
                    parentBackdrop.style.transition = 'opacity 150ms ease-in-out';
                    parentBackdrop.style.opacity = '0';
                }
            }
        };
        // Adjust the backdrop immediately (no delay option)
        adjustBackdrop();
        // Cleanup function
        // eslint-disable-next-line consistent-return
        return () => {
            // Restore original backdrop properties
            if (backdropRef.current) {
                if (originalBackdropZIndexRef.current) {
                    // Restore original z-index if it was stored
                    backdropRef.current.style.zIndex = originalBackdropZIndexRef.current;
                }
                if (originalBackdropOpacityRef.current) {
                    // Restore original opacity if it was stored
                    // Keep the transition for a smooth fade-in
                    backdropRef.current.style.transition = 'opacity 150ms ease-in-out';
                    backdropRef.current.style.opacity = originalBackdropOpacityRef.current;
                }
                // Clear refs
                backdropRef.current = null;
                originalBackdropZIndexRef.current = null;
                originalBackdropOpacityRef.current = null;
            }
        };
    }, [isOpen, isStacked]);
    const modalStyle = useMemo(() => {
        return isStacked ? {
            zIndex: zIndexes.modal,
        } : {};
    }, [isStacked, zIndexes.modal]);
    return {
        shouldRenderBackdrop,
        modalStyle,
        parentModalRef,
    };
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
const GenericModal = ({ show = true, id = 'genericModal', autoCloseOnCancelButton = true, autoCloseOnConfirmButton = true, enforceFocus = true, keyboardEscape = true, bodyPadding = true, showCloseButton = true, showHeader = true, modalLocation = 'center', className, onExited, onEntered, onHide, modalHeaderText, modalHeaderTextId, modalSubheaderText, handleCancel, handleConfirm, handleEnterKeyPress, handleKeydown, confirmButtonText, confirmButtonClassName, cancelButtonText, cancelButtonClassName, isConfirmDisabled, isDeleteModal, container, ariaLabel, ariaLabelledby, errorText, compassDesign, backdrop, backdropClassName, children, autoFocusConfirmButton, headerInput, bodyDivider, bodyOverflowVisible, footerContent, footerDivider, appendedContent, headerButton, dataTestId, delayFocusTrap, isStacked = false, }) => {
    const intl = useIntl();
    // Create a ref for the modal container
    const containerRef = useRef(null);
    const [showState, setShowState] = useState(show);
    const onHideCallback = useCallback(() => {
        setShowState(false);
        onHide?.();
    }, [onHide]);
    // Use focus trap to keep focus within the modal when it's open
    useFocusTrap(showState, containerRef, {
        delayMs: delayFocusTrap ? 500 : undefined,
    });
    // Use stacked modal hook to manage backdrop and z-index
    // Only pass isStacked=true when it's explicitly set to true
    const { shouldRenderBackdrop, modalStyle, } = useStackedModal(Boolean(isStacked), showState);
    useEffect(() => {
        setShowState(show);
    }, [show]);
    const handleCancelCallback = useCallback((event) => {
        event.preventDefault();
        if (autoCloseOnCancelButton) {
            onHideCallback();
        }
        handleCancel?.();
    }, [autoCloseOnCancelButton, onHideCallback, handleCancel]);
    const handleConfirmCallback = useCallback((event) => {
        event.preventDefault();
        if (autoCloseOnConfirmButton) {
            onHideCallback();
        }
        handleConfirm?.();
    }, [autoCloseOnConfirmButton, onHideCallback, handleConfirm]);
    const onEnterKeyDown = useCallback((event) => {
        if (event.key === 'Enter') {
            if (event.nativeEvent.isComposing) {
                return;
            }
            if (handleConfirm && autoCloseOnConfirmButton) {
                onHideCallback();
            }
            handleEnterKeyPress?.();
        }
        handleKeydown?.(event);
    }, [handleConfirm, autoCloseOnConfirmButton, onHideCallback, handleEnterKeyPress, handleKeydown]);
    // Build confirm button if provided.
    let confirmButtonElement;
    if (handleConfirm) {
        const buttonTypeClass = isDeleteModal ? 'delete' : 'confirm';
        let confirmButtonTextContent = (React.createElement(FormattedMessage, { id: 'generic_modal.confirm', defaultMessage: 'Confirm' }));
        if (confirmButtonText) {
            confirmButtonTextContent = confirmButtonText;
        }
        confirmButtonElement = (React.createElement("button", { autoFocus: autoFocusConfirmButton, type: 'submit', className: classNames('GenericModal__button btn btn-primary', buttonTypeClass, confirmButtonClassName, {
                disabled: isConfirmDisabled,
            }), onClick: handleConfirmCallback, disabled: isConfirmDisabled }, confirmButtonTextContent));
    }
    // Build cancel button if provided.
    let cancelButtonElement;
    if (handleCancel) {
        let cancelButtonTextContent = (React.createElement(FormattedMessage, { id: 'generic_modal.cancel', defaultMessage: 'Cancel' }));
        if (cancelButtonText) {
            cancelButtonTextContent = cancelButtonText;
        }
        cancelButtonElement = (React.createElement("button", { type: 'button', className: classNames('GenericModal__button btn btn-tertiary', cancelButtonClassName), onClick: handleCancelCallback }, cancelButtonTextContent));
    }
    // Build header text if provided.
    const headerText = modalHeaderText && (React.createElement("div", { className: 'GenericModal__header' },
        React.createElement("h1", { id: modalHeaderTextId || 'genericModalLabel', className: 'modal-title' }, modalHeaderText),
        headerButton));
    // Map modalLocation to a CSS class.
    const locationClassMapping = {
        top: 'GenericModal__location--top',
        center: 'GenericModal__location--center',
        bottom: 'GenericModal__location--bottom',
    };
    const modalLocationClass = locationClassMapping[modalLocation];
    // Accessibility labeling strategy:
    // 1. We always set aria-labelledby to ensure the modal has a proper label
    //    - First try to use the provided ariaLabeledBy prop
    //    - Fall back to 'genericModalLabel' which references the modal title
    // 2. We also support aria-label as a secondary option
    //    - This will only be used by screen readers if the element referenced by aria-labelledby doesn't exist
    //    - This provides a fallback for accessibility in case the referenced element is missing
    // Note: When both aria-labelledby and aria-label are present, aria-labelledby takes precedence
    const ariaLabelledbyValue = ariaLabelledby || 'genericModalLabel';
    return (React.createElement(Modal, { id: id, role: 'none', "aria-label": ariaLabel, "aria-labelledby": ariaLabelledbyValue, "aria-modal": 'true', dialogClassName: classNames(modalLocationClass, 'a11y__modal GenericModal', {
            GenericModal__compassDesign: compassDesign,
            'modal--overflow': bodyOverflowVisible,
        }, className), show: showState, restoreFocus: true, enforceFocus: enforceFocus, onHide: onHideCallback, onExited: onExited, backdrop: shouldRenderBackdrop ? backdrop : false, backdropStyle: isStacked ? { zIndex: 1051 } : undefined, backdropClassName: backdropClassName, container: container, keyboard: keyboardEscape, onEntered: onEntered, "data-testid": dataTestId, style: modalStyle },
        React.createElement("div", { ref: containerRef, onKeyDown: onEnterKeyDown, className: 'GenericModal__wrapper GenericModal__wrapper-enter-key-press-catcher' },
            showHeader && (React.createElement(Modal.Header, { closeButton: false },
                React.createElement("div", { className: 'GenericModal__header__text_container' },
                    compassDesign && (React.createElement(React.Fragment, null,
                        headerText,
                        headerInput)),
                    modalSubheaderText && (React.createElement("div", { className: 'modal-subheading-container' },
                        React.createElement("div", { id: 'genericModalSubheading', className: 'modal-subheading' }, modalSubheaderText)))),
                showCloseButton && (React.createElement("button", { type: 'button', className: 'close', onClick: onHideCallback, "aria-label": intl.formatMessage({ id: 'generic_modal.close', defaultMessage: 'Close' }) },
                    React.createElement("span", { "aria-hidden": 'true' }, '×'),
                    React.createElement("span", { className: 'sr-only' },
                        React.createElement(FormattedMessage, { id: 'generic_modal.close', defaultMessage: 'Close' })))))),
            React.createElement(Modal.Body, { className: classNames({ divider: bodyDivider, 'overflow-visible': bodyOverflowVisible }) },
                compassDesign ? (errorText && (React.createElement("div", { className: 'genericModalError' },
                    React.createElement("i", { className: 'icon icon-alert-outline' }),
                    React.createElement("span", null, errorText)))) : (headerText),
                React.createElement("div", { className: classNames('GenericModal__body', { padding: bodyPadding }) }, children)),
            (cancelButtonElement || confirmButtonElement || footerContent) && (React.createElement(Modal.Footer, { className: classNames({ divider: footerDivider }) }, (cancelButtonElement || confirmButtonElement) ? (React.createElement(React.Fragment, null,
                cancelButtonElement,
                confirmButtonElement)) : (footerContent))),
            Boolean(appendedContent) && appendedContent)));
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
const BUTTON_ICON_SIZE = 16;
const FooterPagination = ({ page, total, itemsPerPage, onNextPage, onPreviousPage, }) => {
    const { formatMessage } = useIntl();
    const startCount = page * itemsPerPage;
    const endCount = Math.min(startCount + itemsPerPage, total);
    const totalPages = Math.trunc((total - 1) / itemsPerPage);
    const prevDisabled = page <= 0;
    const nextDisabled = page >= totalPages;
    return (React.createElement("div", { className: 'footer-pagination' },
        React.createElement("div", { className: 'footer-pagination__legend' }, Boolean(total) && (formatMessage({
            id: 'footer_pagination.count',
            defaultMessage: 'Showing {startCount, number}-{endCount, number} of {total, number}',
        }, {
            startCount: startCount + 1,
            endCount,
            total,
        }))),
        React.createElement("div", { className: 'footer-pagination__button-container' },
            React.createElement("button", { type: 'button', className: classNames('footer-pagination__button-container__button', { disabled: prevDisabled }), onClick: onPreviousPage, disabled: prevDisabled },
                React.createElement(ChevronLeftIcon, { size: BUTTON_ICON_SIZE }),
                React.createElement("span", null, formatMessage({
                    id: 'footer_pagination.prev',
                    defaultMessage: 'Previous',
                }))),
            React.createElement("button", { type: 'button', className: classNames('footer-pagination__button-container__button', { disabled: nextDisabled }), onClick: onNextPage, disabled: nextDisabled },
                React.createElement("span", null, formatMessage({
                    id: 'footer_pagination.next',
                    defaultMessage: 'Next',
                })),
                React.createElement(ChevronRightIcon, { size: BUTTON_ICON_SIZE })))));
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
const skeletonFade = keyframes `
    0% {
        background-color: rgba(var(--center-channel-color-rgb), 0.08);
    }
    50% {
        background-color: rgba(var(--center-channel-color-rgb), 0.16);
    }
    100% {
        background-color: rgba(var(--center-channel-color-rgb), 0.08);
    }
`;
const BaseLoader = styled.div `
    animation-duration: 1500ms;
    animation-iteration-count: infinite;
    animation-name: ${skeletonFade};
    animation-timing-function: ease-in-out;
    background-color: rgba(var(--center-channel-color-rgb), 0.08);
`;
/**
 * CircleSkeletonLoader is a component that renders a filled circle with a loading animation.
 * It is used to indicate that the content is loading.
 * @param props.size - The size of the circle. When in number, it is treated as pixels.
 * @example
 * <CircleSkeletonLoader size={20}/>
 * <CircleSkeletonLoader size="50%"/>
 */
const CircleSkeletonLoader = styled(BaseLoader) `
    display: block;
    border-radius: 50%;
    height: ${(props) => getCorrectSizeDimension(props.size)};
    width: ${(props) => getCorrectSizeDimension(props.size)};
`;
/**
 * RectangleSkeletonLoader is a component that renders a filled rectangle with a loading animation.
 * It is used to indicate that the content is loading.
 * @param props.height - The height of the rectangle eg. 20, "20em", "20%". When in number, it is treated as pixels.
 * @param props.width - The width of the rectangle eg. 30, '100%'. When in number, it is treated as pixels.
 * @param props.borderRadius - The border radius of the rectangle eg. 4
 * @param props.margin - The margin of the rectangle eg. '0 10px', '10px 0 0 10px'
 * @param props.flex - The flex short hand of flex grow, shrink, basis of the rectangle, under flex parent css eg. '1 1 auto'
 * @default
 * width: 100% , borderRadius: 8px
 * @example
 * <RectangleSkeletonLoader height='100px' />
 * <RectangleSkeletonLoader height={40} width={100} borderRadius={4} margin='0 10px 0 0' flex='1' />
 */
const RectangleSkeletonLoader = styled(BaseLoader) `
    height: ${(props) => getCorrectSizeDimension(props.height)};
    width: ${(props) => getCorrectSizeDimension(props.width, '100%')};
    border-radius: ${(props) => props?.borderRadius ?? 8}px;
    margin: ${(props) => props?.margin ?? null};
    flex: ${(props) => props?.flex ?? null};
`;
function getCorrectSizeDimension(size, fallback = null) {
    if (size) {
        return (typeof size === 'string') ? size : `${size}px`;
    }
    return fallback;
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
const TourTipRootPortal = ({ children, show, element }) => (show ? ReactDOM.createPortal(children, element) : null);
const TourTipBackdrop = ({ show, overlayPunchOut, interactivePunchOut, onDismiss, onPunchOut, appendTo, transparent, }) => {
    const vertices = [];
    if (overlayPunchOut) {
        const { x, y, width, height } = overlayPunchOut;
        // draw to top left of punch out
        vertices.push('0% 0%');
        vertices.push('0% 100%');
        vertices.push('100% 100%');
        vertices.push('100% 0%');
        vertices.push(`${x} 0%`);
        vertices.push(`${x} ${y}`);
        // draw punch out
        vertices.push(`calc(${x} + ${width}) ${y}`);
        vertices.push(`calc(${x} + ${width}) calc(${y} + ${height})`);
        vertices.push(`${x} calc(${y} + ${height})`);
        vertices.push(`${x} ${y}`);
        // close off punch out
        vertices.push(`${x} 0%`);
        vertices.push('0% 0%');
    }
    const backdrop = (React.createElement("div", { onClick: onDismiss, className: `tour-tip__backdrop ${transparent ? 'tour-tip__backdrop--transparent' : ''}`, style: {
            clipPath: vertices.length ? `polygon(${vertices.join(', ')})` : undefined,
        } }));
    const overlay = interactivePunchOut ? backdrop : (React.createElement(React.Fragment, null,
        React.createElement("div", { className: 'tour-tip__overlay', onClick: onPunchOut || onDismiss }),
        backdrop));
    return (React.createElement(TourTipRootPortal, { show: show, element: appendTo }, overlay));
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
class PulsatingDot extends React.PureComponent {
    render() {
        let customStyles = {};
        if (this.props?.coords) {
            customStyles = {
                transform: `translate(${this.props.coords?.x}px, ${this.props.coords?.y}px)`,
            };
        }
        let effectiveClassName = 'pulsating_dot';
        if (this.props.onClick) {
            effectiveClassName += ' pulsating_dot-clickable';
        }
        if (this.props.className) {
            effectiveClassName = effectiveClassName + ' ' + this.props.className;
        }
        return (React.createElement("span", { className: effectiveClassName, onClick: this.props.onClick, ref: this.props.targetRef, style: { ...customStyles }, "data-testid": 'pulsating_dot' }));
    }
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// If this needs to alter, change in _variables $z-index-tour-tips-popover as well
const DEFAULT_Z_INDEX_TOUR_TIPS_POPOVER = 1300;
const TourTip = ({ title, screen, imageURL, overlayPunchOut, singleTip, step, show, interactivePunchOut, tourSteps, handleOpen, handleDismiss, handleNext, handlePrevious, handleSkip, handleJump, handlePunchOut, pulsatingDotTranslate, pulsatingDotPlacement, nextBtn, prevBtn, className, offset = [-18, 4], placement = 'right-start', showOptOut = true, width = 352, zIndex = DEFAULT_Z_INDEX_TOUR_TIPS_POPOVER, hideBackdrop = false, tippyBlueStyle = false, }) => {
    const FIRST_STEP_INDEX = 0;
    const triggerRef = useRef(null);
    const onJump = (event, jumpToStep) => {
        handleJump?.(event, jumpToStep);
    };
    // This needs to be changed if root-portal node isn't available to maybe body
    const rootPortal = document.getElementById('root-portal');
    const dots = [];
    if (!singleTip && tourSteps) {
        for (let dot = FIRST_STEP_INDEX; dot < (Object.values(tourSteps).length - 1); dot++) {
            let className = 'tour-tip__dot';
            let circularRing = 'tour-tip__dot-ring';
            if (dot === step) {
                className += ' active';
                circularRing += ' tour-tip__dot-ring-active';
            }
            dots.push(React.createElement("div", { className: circularRing },
                React.createElement("a", { href: '#', key: 'dotactive' + dot, className: className, "data-screen": dot, onClick: (e) => onJump(e, dot) })));
        }
    }
    const content = (React.createElement(React.Fragment, null,
        React.createElement("div", { className: 'tour-tip__header', "data-testid": 'current_tutorial_tip' },
            React.createElement("h4", { className: 'tour-tip__header__title' }, title),
            React.createElement("button", { className: 'btn btn-sm btn-icon', onClick: handleDismiss, "data-testid": 'close_tutorial_tip' },
                React.createElement("i", { className: 'icon icon-close' }))),
        React.createElement("div", { className: 'tour-tip__body' }, screen),
        imageURL && (React.createElement("div", { className: 'tour-tip__image' },
            React.createElement("img", { src: imageURL, alt: 'tutorial tour tip product image' }))),
        (nextBtn || prevBtn || showOptOut) && (React.createElement("div", { className: 'tour-tip__footer' },
            React.createElement("div", { className: 'tour-tip__footer-buttons' },
                React.createElement("div", { className: 'tour-tip__dot-ctr' }, dots),
                React.createElement("div", { className: 'tour-tip__btn-ctr' },
                    step !== 0 && prevBtn && (React.createElement("button", { id: 'tipPreviousButton', className: 'btn btn-sm btn-tertiary', onClick: handlePrevious }, prevBtn)),
                    nextBtn && (React.createElement("button", { id: 'tipNextButton', className: 'btn btn-sm btn-primary', onClick: handleNext }, nextBtn)))),
            showOptOut && (React.createElement("div", { className: 'tour-tip__opt' },
                React.createElement(FormattedMessage, { id: 'tutorial_tip.seen', defaultMessage: 'Seen this before? ' }),
                React.createElement("a", { href: '#', onClick: handleSkip },
                    React.createElement(FormattedMessage, { id: 'tutorial_tip.out', defaultMessage: 'Opt out of these tips.' }))))))));
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { id: 'tipButton', ref: triggerRef, onClick: handleOpen, className: 'tour-tip__pulsating-dot-ctr', "data-pulsating-dot-placement": pulsatingDotPlacement || 'right', style: {
                transform: `translate(${pulsatingDotTranslate?.x}px, ${pulsatingDotTranslate?.y}px)`,
            } },
            React.createElement(PulsatingDot, null)),
        React.createElement(TourTipBackdrop, { show: show, onDismiss: handleDismiss, onPunchOut: handlePunchOut, interactivePunchOut: interactivePunchOut, overlayPunchOut: overlayPunchOut, appendTo: rootPortal, transparent: hideBackdrop }),
        show && (React.createElement(Tippy, { showOnCreate: show, content: content, animation: 'scale-subtle', trigger: 'click', duration: [250, 150], maxWidth: width, aria: { content: 'labelledby' }, allowHTML: true, zIndex: zIndex, reference: triggerRef, interactive: true, appendTo: rootPortal, offset: offset, className: classNames('tour-tip__box', className, { 'tippy-blue-style': tippyBlueStyle }), placement: placement }))));
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
function useElementAvailable(elementIds, intervalMS = 250) {
    const checkAvailableInterval = useRef(null);
    const [available, setAvailable] = useState(false);
    useEffect(() => {
        if (available) {
            if (checkAvailableInterval.current) {
                clearInterval(checkAvailableInterval.current);
                checkAvailableInterval.current = null;
            }
            return;
        }
        else if (checkAvailableInterval.current) {
            return;
        }
        checkAvailableInterval.current = setInterval(() => {
            if (elementIds.every((x) => document.getElementById(x))) {
                setAvailable(true);
                if (checkAvailableInterval.current) {
                    clearInterval(checkAvailableInterval.current);
                    checkAvailableInterval.current = null;
                }
            }
        }, intervalMS);
    }, []);
    return useMemo(() => available, [available]);
}

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
const useMeasurePunchouts = (elementIds, additionalDeps, offset) => {
    const elementsAvailable = useElementAvailable(elementIds);
    const [size, setSize] = useState({ x: window.innerWidth, y: window.innerHeight });
    const updateSize = throttle(() => {
        setSize({ x: window.innerWidth, y: window.innerHeight });
    }, 100, { trailing: true });
    useLayoutEffect(() => {
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    const channelPunchout = useMemo(() => {
        let minX = Number.MAX_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;
        for (let i = 0; i < elementIds.length; i++) {
            const rectangle = document.getElementById(elementIds[i])?.getBoundingClientRect();
            if (!rectangle) {
                return null;
            }
            if (rectangle.x < minX) {
                minX = rectangle.x;
            }
            if (rectangle.y < minY) {
                minY = rectangle.y;
            }
            if (rectangle.x + rectangle.width > maxX) {
                maxX = rectangle.x + rectangle.width;
            }
            if (rectangle.y + rectangle.height > maxY) {
                maxY = rectangle.y + rectangle.height;
            }
        }
        return {
            x: `${minX + (offset ? offset.x : 0)}px`,
            y: `${minY + (offset ? offset.y : 0)}px`,
            width: `${(maxX - minX) + (offset ? offset.width : 0)}px`,
            height: `${(maxY - minY) + (offset ? offset.height : 0)}px`,
        };
    }, [...elementIds, ...additionalDeps, size, elementsAvailable]);
    return channelPunchout;
};

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
const useFollowElementDimensions = (elementId) => {
    const [dimensions, setDimensions] = useState(new DOMRect());
    useEffect(() => {
        const element = document.getElementById(elementId);
        if (!element) {
            return undefined;
        }
        const observer = new ResizeObserver((entries) => {
            if (entries.length > 0) {
                setDimensions(entries[0].contentRect);
            }
        });
        observer.observe(element);
        return () => {
            observer.unobserve(element);
        };
    }, [elementId]);
    return dimensions;
};

export { CircleSkeletonLoader, FooterPagination, GenericModal, PulsatingDot, RectangleSkeletonLoader, TourTip, TourTipBackdrop, useElementAvailable, useFollowElementDimensions, useMeasurePunchouts };
//# sourceMappingURL=index.esm.js.map
