
import { RouteSectionProps } from '@solidjs/router'
import { children, Component } from 'solid-js'

export const AppRoot: Component<RouteSectionProps> = (props) => {

    return <div>
        <h1>Music Data Notation Demo</h1>
	    <p>A demo application to show off how this encoding works.</p>
        {children(() => props.children)()}
    </div>
}