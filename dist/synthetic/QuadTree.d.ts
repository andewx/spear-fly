/**
 * Quadtree implementation for efficient spatial queries of precipitation cells
 */
export interface IPoint {
    x: number;
    y: number;
}
export interface IBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface IQuadTreeItem<T> {
    point: IPoint;
    data: T;
}
/**
 * Quadtree node for spatial partitioning
 */
export declare class QuadTree<T> {
    private bounds;
    private capacity;
    private items;
    private divided;
    private northeast?;
    private northwest?;
    private southeast?;
    private southwest?;
    constructor(bounds: IBounds, capacity?: number);
    /**
     * Insert an item into the quadtree
     */
    insert(point: IPoint, data: T): boolean;
    /**
     * Query all items within a circular range
     */
    queryRange(center: IPoint, radius: number): IQuadTreeItem<T>[];
    /**
     * Query all items (for iteration)
     */
    queryAll(): IQuadTreeItem<T>[];
    /**
     * Subdivide this node into four children
     */
    private subdivide;
    /**
     * Check if point is within bounds
     */
    private containsPoint;
    /**
     * Check if circle intersects bounds
     */
    private intersectsCircle;
    /**
     * Calculate Euclidean distance
     */
    private distance;
}
//# sourceMappingURL=QuadTree.d.ts.map