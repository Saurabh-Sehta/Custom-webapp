import React from 'react';
import type { Coords } from '../common/hooks/useMeasurePunchouts';
import './pulsating_dot.scss';
type Props = {
    targetRef?: React.RefObject<HTMLImageElement>;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    coords?: Coords;
};
export declare class PulsatingDot extends React.PureComponent<Props> {
    render(): React.JSX.Element;
}
export {};
