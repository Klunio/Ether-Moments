import jQuery from "jquery";
window.$ = window.jQuery = jQuery;
// Import bootstrap
import "bootstrap";

// Import the scss for full app (webpack will package it)
import "../app.scss";

window.addEventListener('load', function(){

	$('input')[0].value = sessionStorage.getItem('username');
	$('input')[1].value = sessionStorage.getItem('address');
	$('input')[2].value = sessionStorage.getItem('password');



});