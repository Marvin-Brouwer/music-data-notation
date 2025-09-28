
import { RouteSectionProps, useLocation } from '@solidjs/router'
import { children, Component } from 'solid-js'

export const AppRoot: Component<RouteSectionProps> = (props) => {

    const route = useLocation()

    return <div>
        <p>Route: {route.pathname}</p>
        {children(() => props.children)()}
    </div>
}