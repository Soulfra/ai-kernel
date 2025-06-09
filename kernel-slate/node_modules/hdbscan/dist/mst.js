"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mstToBinaryTree = exports.sortMst = void 0;
const types_1 = require("./types");
function sortMst(mst) {
    return mst.sort((a, b) => a.lambda - b.lambda);
}
exports.sortMst = sortMst;
function mstToBinaryTree(mst) {
    const nodes = [...new Array(mst.length + 1).keys()]
        .map(i => new types_1.TreeNode(i));
    var root = nodes[0];
    sortMst(mst).forEach((val) => {
        const left = nodes[val.parent].getAncestor();
        const right = nodes[val.child].getAncestor();
        const node = new types_1.TreeNode(val.lambda);
        node.left = left;
        node.right = right;
        left.parent = right.parent = root = node;
    });
    return root;
}
exports.mstToBinaryTree = mstToBinaryTree;
