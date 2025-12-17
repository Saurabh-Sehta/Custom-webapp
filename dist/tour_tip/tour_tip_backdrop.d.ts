import React from 'react';
import type { Props as PunchOutCoordsHeightAndWidth } from '../common/hooks/useMeasurePunchouts';
type Props = {
    overlayPunchOut: PunchOutCoordsHeightAndWidth | null;
    show: boolean;
    interactivePunchOut?: boolean;
    onDismiss?: (e: React.MouseEvent) => void;
    onPunchOut?: (e: React.MouseEvent) => void;
    appendTo: HTMLElement;
    transparent?: boolean;
};
export declare const TourTipBackdrop: ({ show, overlayPunchOut, interactivePunchOut, onDismiss, onPunchOut, appendTo, transparent, }: Props) => React.JSX.Element;
export {};
