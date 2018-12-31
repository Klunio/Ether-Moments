import jQuery from "jquery";
window.$ = window.jQuery = jQuery;
// Import bootstrap
import "bootstrap";

// Import the scss for full app (webpack will package it)
import "../app.scss";

import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'

import user_artifacts from "../../build/contracts/User.json"
import moment_artifacts from "../../build/contracts/Moment.json"

window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));
import { default as web3Admin} from 'web3admin';
setTimeout(function(){
	web3Admin.extend(web3)
}, 1000)


var User = contract(user_artifacts);  //  加载User合约
var Moment = contract(moment_artifacts);  //  加载Moment合约

User.setProvider(web3.currentProvider);
Moment.setProvider(web3.currentProvider);

window.App = {
	NameTaken:async function(username){
		var takenIndeed = await User_instance.usernameTaken(username);
		if (takenIndeed == false) {
			console.log('User name', username, 'has not been taken.');
		}

		return takenIndeed;
	},
	register: async function(){
		var username = $('#register-username').val();
		var password = $('#register-password').val();
		var re_password = $('#register-confirm-password').val();
		
		if(password != re_password) {
			alert('重复密码不一致！');
			return;
		}

		// 需要验证用户名没有重复
		// 返回的是一个promise对象
		var taken = await this.NameTaken(username);
		if (taken == true) {
			alert('User name', username, 'has been taken!');	
			return false;
		} 



		// 先在链上创建账户
		var address = web3.personal.newAccount(password);
		console.log('creat accounts address:', address);

		// 解锁账户
		web3.personal.unlockAccount(address, password);

		// 先让Ganache里初始生成的账号给点钱...
		// 因为就算引入了miner还是没法在这个私链上挖矿
		// Ganache上的初始账号是不需要解锁的

		web3.eth.sendTransaction(
			{
				from: web3.eth.accounts[1],
				to : address,
				value: web3.toWei(5, "ether")	//	先转5个以太币
			});

		// Ganache会自动挖矿，完成事务
		console.log('Balance : ', web3.eth.getBalance(address).toString());



		// 在合约上创建用户
		User_instance.createUser(username, 'not-available', {gas: 200000, from: address})
		.then(success=>{
			if (success) {
              console.log('created user',username ,' on ethereum!');
            }else {
              console.log('error creating user on ethereum');
            }
		})
		.catch(e=>{
            console.log('error creating user:', username, ':', e);
         });

		// 存入session
		sessionStorage.clear();
		sessionStorage.setItem('username', username);
		sessionStorage.setItem('address', address);
		sessionStorage.setItem('password', password);

		return true;

	},

	start:function(){
		var self = this;
		var registerButton = $('#register-button').click(function(){
			self.register().then(success=>{
				if (success) {
					console.log('success in register');
					// 跳转到成功页面
					window.location.href = './success.html';

				}
			});
			return true;
		});
	}

}

window.addEventListener('load', function() {

    User.deployed().then(i=>{
      window.User_instance = i;
      Moment.deployed().then(k=>{
        window.Moment_instance = k;
        User_instance.setMomAddress(Moment_instance.address,{from:web3.eth.accounts[0]});
      });
    });

    App.start();

});
