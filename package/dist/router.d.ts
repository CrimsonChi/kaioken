import type { RouteChildProps } from "./types";
interface RouterProps {
    basePath?: string;
    children?: JSX.Element[];
}
export declare function Router({ basePath, children }: RouterProps): import("./types").VNode | null;
type RouteComponentFunc = (props: RouteChildProps) => JSX.Element;
interface RouteComponentProps {
    path: string;
    element: RouteComponentFunc;
}
export declare function Route({ path, element }: RouteComponentProps): {
    type: string;
    props: {
        path: string;
        element: RouteComponentFunc;
        children: never[];
    };
    hooks: never[];
};
export declare function Link({ to, children }: {
    to: string;
    children?: JSX.Element;
}): import("./types").VNode;
export {};
