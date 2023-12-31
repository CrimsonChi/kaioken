export function diffMerge(oldNode, newNode) {
    if (oldNode.isEqualNode(newNode)) {
        return;
    }
    if (oldNode.nodeType === Node.TEXT_NODE) {
        if (oldNode.nodeValue !== newNode.nodeValue) {
            oldNode.nodeValue = newNode.nodeValue;
        }
        return;
    }
    if (oldNode.nodeType === Node.ELEMENT_NODE) {
        const oldElement = oldNode;
        const newElement = newNode;
        if (oldElement.tagName !== newElement.tagName) {
            oldElement.parentNode?.replaceChild(newElement, oldElement);
            return;
        }
        const oldAttributes = oldElement.attributes;
        const newAttributes = newElement.attributes;
        // Check for removed attributes
        for (let i = oldAttributes.length - 1; i >= 0; i--) {
            const attr = oldAttributes[i];
            // @ts-ignore
            if (!newAttributes[attr.name]) {
                oldElement.removeAttribute(attr.name);
            }
        }
        // Check for added or modified attributes
        for (let i = 0; i < newAttributes.length; i++) {
            const attr = newAttributes[i];
            if (oldElement.getAttribute(attr.name) !== attr.value) {
                oldElement.setAttribute(attr.name, attr.value);
            }
        }
        const oldChildren = oldElement.childNodes;
        const newChildren = newElement.childNodes;
        const maxLength = Math.max(oldChildren.length, newChildren.length);
        for (let i = 0; i < maxLength; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];
            if (oldChild && newChild) {
                diffMerge(oldChild, newChild);
            }
            else if (oldChild) {
                oldElement.removeChild(oldChild);
            }
            else if (newChild) {
                oldElement.appendChild(newChild);
            }
            else {
                throw new Error("This should never happen");
            }
        }
    }
}
