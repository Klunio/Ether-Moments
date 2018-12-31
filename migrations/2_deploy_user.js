var User = artifacts.require("User");
var Moment = artifacts.require("Moment");

module.exports = function(deployer) {
	// deployer.deploy(Moment,0).then(
	// 	DeployedContract => {
	// 		deployer.deploy(User,DeployedContract.address);
	// 	});
	deployer.deploy(Moment,0);
	deployer.link(Moment, User);
	deployer.deploy(User,0);
};