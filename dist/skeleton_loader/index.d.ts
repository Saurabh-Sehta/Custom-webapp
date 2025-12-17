export interface CircleSkeletonLoaderProps {
    size: string | number;
}
/**
 * CircleSkeletonLoader is a component that renders a filled circle with a loading animation.
 * It is used to indicate that the content is loading.
 * @param props.size - The size of the circle. When in number, it is treated as pixels.
 * @example
 * <CircleSkeletonLoader size={20}/>
 * <CircleSkeletonLoader size="50%"/>
 */
export declare const CircleSkeletonLoader: import("styled-components").StyledComponent<"div", any, CircleSkeletonLoaderProps, never>;
export interface RectangleSkeletonLoaderProps {
    height: string | number;
    width?: string | number;
    borderRadius?: number;
    margin?: string;
    flex?: string;
}
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
export declare const RectangleSkeletonLoader: import("styled-components").StyledComponent<"div", any, RectangleSkeletonLoaderProps, never>;
