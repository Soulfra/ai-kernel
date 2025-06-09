"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeNode = exports.DebugInfo = exports.HierarchyNode = void 0;
class HierarchyNode {
    constructor(parent, child, lambda, size) {
        this.parent = parent;
        this.child = child;
        this.lambda = lambda;
        this.size = size;
    }
}
exports.HierarchyNode = HierarchyNode;
class DebugInfo {
    constructor() {
    }
}
exports.DebugInfo = DebugInfo;
class TreeNode {
    constructor(data) {
        this.data = data;
    }
    getAncestor() {
        if (!this.parent) {
            return this;
        }
        return this.parent.getAncestor();
    }
}
exports.TreeNode = TreeNode;
