/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import { routeBase, PagesReRouter } from '@quick-vite/gh-pages-spa/solidjs'

import { AppRoot } from './app'
import { LandingPage } from './pages/landing-page'
import { NotFoundPage } from './pages/404'
import { Editor } from './pages/editor'

export const routes = <Router base={routeBase()} root={AppRoot}>
	<PagesReRouter>
		<Route path="/edit/" component={Editor} />
		<Route path="/view/" component={Editor} />
		<Route path="/scan/" component={Editor} />
		<Route path="/" component={LandingPage} />
		<Route path="*404" component={NotFoundPage} />
	</PagesReRouter>
</Router>

render(() => routes, document.getElementById('root')!)