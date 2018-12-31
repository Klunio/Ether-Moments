import jQuery from "jquery";
window.$ = window.jQuery = jQuery;
// Import bootstrap
import "bootstrap";

// Import the scss for full app (webpack will package it)
import "../app.scss";

import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'

import user_artifacts from "../../build/contracts/User.json"
window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

var User = contract(user_artifacts);  //  加载User合约
User.setProvider(web3.currentProvider);

window.App = {
	login:async function(){
		var username = $('#login-in-username').val();
		var password = $('#login-in-password').val();
		
		// 开始验证登录

		// 1. 通过username找到地址
		try {
			var addr = await User_instance.getAddressByUsername(username);
			console.log(username,' address : ', addr);
		} catch(e) {
			return;
			console.log('error getting', username, ' address :', e);
		}

		// 2. 通过addr和password来unlock
		try {
			var success = await web3.personal.unlockAccount(addr, password)
			if (success) {
				sessionStorage.clear();
				sessionStorage.setItem('username', username);
				sessionStorage.setItem('address', addr);
				sessionStorage.setItem('password', password);

				window.location.href = './home.html';
				console.log('success login in ');
			}
		} catch(e) {
			return;
			console.log(e);
		}
		
			
	},
	start: function(){
		var self = this;
		var login = $('#login_in').click(function(){
			self.login();
			return true;
		});
	}
};

window.addEventListener('load', function(){
	User.deployed().then(i=>{
		window.User_instance = i;
	});
	App.start();
});

