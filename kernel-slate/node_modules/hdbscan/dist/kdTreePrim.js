"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coreDistance_1 = require("./coreDistance");
const prim_1 = require("./prim");
const linkage_1 = require("./linkage");
function kdTreePrim(input, minSamples, alpha, metric) {
    // Transform the space - calculate mutual reachability distance(core distance)
    // using kd-tree
    const coreDistances = (0, coreDistance_1.kdTreeCoreDistance)(input, minSamples, metric);
    // Build the minimum spanning tree - using prim MST algorithm
    const mst = (0, prim_1.buildMstUsingPrim)(input, alpha, metric, coreDistances);
    // Build the cluster hierarchy using single linkage tree
    const { sortedMst, singleLinkage } = (0, linkage_1.buildSingleLinkage)(mst);
    return { coreDistances, mst, sortedMst, singleLinkage };
}
exports.default = kdTreePrim;
