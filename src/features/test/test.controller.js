import "angular-local-storage";
import {TestServiceName} from "TestService";
import ComponentType from "renison-ept-frontend-core/src/constants/component-type";
import QuestionType from "renison-ept-frontend-core/src/constants/question-type";

TestController.$inject  = ["$rootScope",'$scope', TestServiceName,"$stateParams", "$state","$q","localStorageService","BaseService","$cookies"];

class Timer{
	constructor($scope){
		this.$scope = $scope;
	}
	start(timeLeft){
		this.set(timeLeft);
		this.$scope.$broadcast('timer-start');
	}
	set(timeLeft){
		if(angular.isNumber(timeLeft) && timeLeft > 0){
			this.$scope.$broadcast('timer-set-countdown',timeLeft);
		}
	}
	stop(){
		this.$scope.$broadcast('timer-stop');
	}
}

export default function TestController($rootScope,$scope, TestService,$stateParams,$state,$q,localStorageService,BaseService,$cookies) {
	init();
	$scope.loaded = false;
	$scope.timeLeft = 100;
	var timer = new Timer($scope);

	function init(){
		BaseService.get("/proctor/timer").then(function(data){
			console.log(data);
			var timeLeft = data.timeLeft; //TODO refactor time left to be passed in data
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
		timer.start($scope.timeLeft);
	}

	function goToNext(){
		
	}

	$scope.onTimerFinished = function(){
		//TODO
		console.log("timer finished");
	}
 }