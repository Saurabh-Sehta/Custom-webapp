export type Coords = {
    x?: string;
    y?: string;
};
export type Props = Coords & {
    width: string;
    height: string;
};
type PunchOutOffset = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export declare const useMeasurePunchouts: (elementIds: string[], additionalDeps: any[], offset?: PunchOutOffset) => Props | null;
export {};
