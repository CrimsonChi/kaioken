export function isVNode(node) {
    return node && node.type !== undefined && node.props !== undefined;
}
