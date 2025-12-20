/**
 * Quadtree implementation for efficient spatial queries of precipitation cells
 */
/**
 * Quadtree node for spatial partitioning
 */
export class QuadTree {
    bounds;
    capacity;
    items;
    divided;
    northeast;
    northwest;
    southeast;
    southwest;
    constructor(bounds, capacity = 4) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.items = [];
        this.divided = false;
    }
    /**
     * Insert an item into the quadtree
     */
    insert(point, data) {
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
        return (this.northeast.insert(point, data) ||
            this.northwest.insert(point, data) ||
            this.southeast.insert(point, data) ||
            this.southwest.insert(point, data));
    }
    /**
     * Query all items within a circular range
     */
    queryRange(center, radius) {
        const found = [];
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
            found.push(...this.northeast.queryRange(center, radius));
            found.push(...this.northwest.queryRange(center, radius));
            found.push(...this.southeast.queryRange(center, radius));
            found.push(...this.southwest.queryRange(center, radius));
        }
        return found;
    }
    /**
     * Query all items (for iteration)
     */
    queryAll() {
        const found = [...this.items];
        if (this.divided) {
            found.push(...this.northeast.queryAll());
            found.push(...this.northwest.queryAll());
            found.push(...this.southeast.queryAll());
            found.push(...this.southwest.queryAll());
        }
        return found;
    }
    /**
     * Subdivide this node into four children
     */
    subdivide() {
        const { x, y, width, height } = this.bounds;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        this.northeast = new QuadTree({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);
        this.northwest = new QuadTree({ x: x - halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.capacity);
        this.southeast = new QuadTree({ x: x + halfWidth, y: y - halfHeight, width: halfWidth, height: halfHeight }, this.capacity);
        this.southwest = new QuadTree({ x: x - halfWidth, y: y - halfHeight, width: halfWidth, height: halfHeight }, this.capacity);
        this.divided = true;
    }
    /**
     * Check if point is within bounds
     */
    containsPoint(point) {
        const { x, y, width, height } = this.bounds;
        return (point.x >= x - width &&
            point.x <= x + width &&
            point.y >= y - height &&
            point.y <= y + height);
    }
    /**
     * Check if circle intersects bounds
     */
    intersectsCircle(center, radius) {
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
    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
//# sourceMappingURL=QuadTree.js.map