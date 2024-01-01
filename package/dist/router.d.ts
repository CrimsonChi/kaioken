import type { Rec } from "./types";
interface RouterProps {
    basePath?: string;
    children?: JSX.Element[];
}
export declare function Router({ basePath, children }: RouterProps): import("./types").VNode | null;
type ComponentFunc = ({ params }: {
    params: Rec;
}) => JSX.Element;
interface RouteProps {
    path: string;
    element: ComponentFunc;
}
export declare function Route({ path, element }: RouteProps): {
    type: string;
    props: {
        path: string;
        element: ComponentFunc;
        children: never[];
    };
    hooks: never[];
};
export declare function Link({ to, children }: {
    to: string;
    children?: JSX.Element;
}): import("./types").VNode;
export {};
