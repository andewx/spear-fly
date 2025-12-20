/**
 * Quadtree implementation for efficient spatial queries of precipitation cells
 */

export interface IPoint {
  x: number;
  y: number;
}

export interface IBounds {
  x: number; // Center x
  y: number; // Center y
  width: number; // Half-width
  height: number; // Half-height
}

export interface IQuadTreeItem<T> {
  point: IPoint;
  data: T;
}

/**
 * Quadtree node for spatial partitioning
 */
export class QuadTree<T> {
  private bounds: IBounds;
  private capacity: number;
  private items: IQuadTreeItem<T>[];
  private divided: boolean;
  private northeast?: QuadTree<T>;
  private northwest?: QuadTree<T>;
  private southeast?: QuadTree<T>;
  private southwest?: QuadTree<T>;

  constructor(bounds: IBounds, capacity: number = 4) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.items = [];
    this.divided = false;
  }

  /**
   * Insert an item into the quadtree
   */
  insert(point: IPoint, data: T): boolean {
    if (!this.containsPoint(point)) {
      return false;
    }

    if (this.items.length < this.capacity) {
      this.items.push({ point, data });
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northeast!.insert(point, data) ||
      this.northwest!.insert(point, data) ||
      this.southeast!.insert(point, data) ||
      this.southwest!.insert(point, data)
    );
  }

  /**
   * Query all items within a circular range
   */
  queryRange(center: IPoint, radius: number): IQuadTreeItem<T>[] {
    const found: IQuadTreeItem<T>[] = [];

    // Quick bounds check
    if (!this.intersectsCircle(center, radius)) {
      return found;
    }

    // Check items in this node
    for (const item of this.items) {
      const dist = this.distance(item.point, center);
      if (dist <= radius) {
        found.push(item);
      }
    }

    // Recursively check children
    if (this.divided) {
      found.push(...this.northeast!.queryRange(center, radius));
      found.push(...this.northwest!.queryRange(center, radius));
      found.push(...this.southeast!.queryRange(center, radius));
      found.push(...this.southwest!.queryRange(center, radius));
    }

    return found;
  }

  /**
   * Query all items (for iteration)
   */
  queryAll(): IQuadTreeItem<T>[] {
    const found: IQuadTreeItem<T>[] = [...this.items];

    if (this.divided) {
      found.push(...this.northeast!.queryAll());
      found.push(...this.northwest!.queryAll());
      found.push(...this.southeast!.queryAll());
      found.push(...this.southwest!.queryAll());
    }

    return found;
  }

  /**
   * Subdivide this node into four children
   */
  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.northeast = new QuadTree(
      { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
      this.capacity
    );
    this.northwest = new QuadTree(
      { x: x - halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
      this.capacity
    );
    this.southeast = new QuadTree(
      { x: x + halfWidth, y: y - halfHeight, width: halfWidth, height: halfHeight },
      this.capacity
    );
    this.southwest = new QuadTree(
      { x: x - halfWidth, y: y - halfHeight, width: halfWidth, height: halfHeight },
      this.capacity
    );

    this.divided = true;
  }

  /**
   * Check if point is within bounds
   */
  private containsPoint(point: IPoint): boolean {
    const { x, y, width, height } = this.bounds;
    return (
      point.x >= x - width &&
      point.x <= x + width &&
      point.y >= y - height &&
      point.y <= y + height
    );
  }

  /**
   * Check if circle intersects bounds
   */
  private intersectsCircle(center: IPoint, radius: number): boolean {
    const { x, y, width, height } = this.bounds;
    
    // Find closest point on rectangle to circle center
    const closestX = Math.max(x - width, Math.min(center.x, x + width));
    const closestY = Math.max(y - height, Math.min(center.y, y + height));
    
    // Calculate distance
    const dist = this.distance({ x: closestX, y: closestY }, center);
    return dist <= radius;
  }

  /**
   * Calculate Euclidean distance
   */
  private distance(p1: IPoint, p2: IPoint): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
