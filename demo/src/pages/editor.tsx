import { Component } from "solid-js";
import { Display } from '../components/display';
import { EditForm } from '../components/edit-form';

export const Editor: Component = () => {

	return <>
		<h2>Edit</h2>
		<Display />
		<EditForm />
	</>
}