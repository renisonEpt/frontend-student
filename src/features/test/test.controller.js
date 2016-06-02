import "angular-local-storage";
import {TestServiceName} from "TestService";
import ComponentType from "renison-ept-frontend-core/src/constants/component-type";
import QuestionType from "renison-ept-frontend-core/src/constants/question-type";

var ErrorCodes = {
	testSubmitted:12
};

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
		BaseService.get("/proctor/timer").then(function(timeLeft){
			console.log(timeLeft);
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
			return toNextCategory();
		}).then(function(data){
			displayTest(data);
		}).catch(function(err){
			console.log(err);
			// if test is already submitted, go to end of test page
			if(isTestSubmitted(err)){
				goToEndOfTest();
				return;
			}
			alert("a technical issue occured, please refresh the page and try again.");
		});
	}
	function toNextCategory(){
		return BaseService.post("/proctor/nextCategory").then(function(data){
			if(!data){
				// test has already ended
				return null;
			}
			$scope.timeLeft = data.timeAllowed* 60;
			return data;
		});
	}
	// passing undefined or other falsy value will result redirection
	// to test termination page
	function displayTest(testData){
		$scope.loaded = true;
		$scope.category = testData;
		timer.start($scope.timeLeft);
	}

	// determines from a response object whether a test is submitted
	function isTestSubmitted(response){
		return response.data.errorNumber == ErrorCodes.testSubmitted;
	}

	function goToEndOfTest(){
		$state.go("testEnd");
		return;
	}

	$scope.saveResponse = function (question) {
		console.log(question);
		BaseService.post("/proctor/question/" + question.id,question.response)
			.then(function(){
				question.isSaved = true;
			})
			.catch(function(response){
				console.log(response);
			});
	};

	$scope.onTimerFinished = function(){
		$scope.next(true);
	};
	$scope.next = function(ignoreConfirm){
		if(!ignoreConfirm){
			var confirm = window.confirm("Students, please make sure that all questions are answered before preceeding");
			if(!confirm){
				return;
			}
		}
		toNextCategory()
			.then(function (testData){
				displayTest(testData);
			})
			.catch(function(response){
				if(isTestSubmitted(response)){
					goToEndOfTest();
					return;
				}
				alert("A technical issue occured. If problem persists, consider re-logging in");
				console.log(response);
			});
	}
 }