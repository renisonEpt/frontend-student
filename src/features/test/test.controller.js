import "angular-local-storage";
import {TestServiceName} from "TestService";
import ComponentType from "renison-ept-frontend-core/src/constants/component-type";
import QuestionType from "renison-ept-frontend-core/src/constants/question-type";
TestController.$inject  = ["$rootScope",'$scope', TestServiceName,"$stateParams", "$state","$q","localStorageService","BaseService","$cookies"];

export default function TestController($rootScope,$scope, TestService,$stateParams,$state,$q,localStorageService,BaseService,$cookies) {
	init();
	$scope.loaded = false;
	$scope.timeLeft = 0;

	function init(){
		BaseService.get("/proctor/timer").then(function(data){
			console.log(data);
			var timeLeft = data.timeLeft;
			if(timeLeft > 0){
				$scope.timeLeft = timeLeft;
				return BaseService.get("/proctor/currentCategory");
			}
			throw "time left is negative, server returns incorrect data";
		}).catch(function(err){
			console.log(err);
			// if test ended then signal test ended
			// if other error, try again
			// if test hasn't started, go to next category
			return BaseService.post("/proctor/nextCategory").then(function(data){
				$scope.timeLeft = data.timeAllowed;
				return data;
			});
		}).then(function(data){
			console.log(data);
			$scope.category = data;
			// TODO start continuously ping server for time
			// set test loaded
			displayTest();
		}).catch(function(err){

			console.log(err);
			// switch, if test 
			alert("a technical issue occured, please refresh the page and try again.");
		});
	}

	function displayTest(){
		$scope.loaded = true;
		startTimer();
	}

	function startTimer(){
		//TODO
	}
 }