
import ComponentType from 'renison-ept-frontend-core/src/constants/component-type';
import QuestionType from 'renison-ept-frontend-core/src/constants/question-type';
import _ from 'lodash';
require('./test.less');
var ErrorCodes = {
	testSubmitted:12
};

TestController.$inject  = ['$rootScope','$scope',
	'$stateParams', '$state','$q','localStorageService',
	'BaseService','$cookies','BaseToastService','BaseModalService'];

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
	// expect a callback that takes an int `timeLeft` as 
	// argument, fires whenever there is a tick
	setOnTick(callback){
		var that  = this;
		this.$scope.$on('timer-tick',function($event,d){
			$event.stopPropagation();
			if(callback) callback(d.millis/1000); // callback with the time left in seconds
		});
	}
	stop(){
		this.$scope.$broadcast('timer-stop');
	}
}

export default function TestController($rootScope,$scope, 
	$stateParams,$state,$q,localStorageService,
	BaseService,$cookies,BaseToastService,BaseModalService) {
	$scope.loaded = false;
	$scope.timeLeft = 100;
	var timer = new Timer($scope);
	$scope.questionProgress = {
		numDone:0,
		numTotal:0
	};
	timer.setOnTick(function(timeLeft){
		if(timeLeft === 60){
			BaseToastService.warn('You have about 1 min left. ' + 
				'Do not leave anything blank.'+
				'You will start the next ' + 
				'category once this one finishes.', 
				'1 minute left',{
					timeOut:'10000'
				});
		}else if(timeLeft == 10){
			BaseToastService.warn('Your current category will end in 10 seconds.',
				'Category ending soon',{
					timeOut:'8000'
				});
		}
	});
	// getting data
	BaseService.get('/proctor/timer').then(function(timeLeft){
		console.log(timeLeft);
		if(timeLeft > 0){
			$scope.timeLeft = timeLeft;
			// get current category
			return BaseService.get('/proctor/currentCategory');
		}
		// the catch block will execute
		throw new Error('Timer is done, automatically fetch next category');
	}).then(function(data){
		displayTest(data);
	}).catch(function(err){
		console.log(err);
		// if test ended then signal test ended
		// if other error, try again
		// if test hasn't started, go to next category
		return displayNextCategory();
	});
	function displayNextCategory(){
		return BaseService.post('/proctor/nextCategory')
			.then(function(data){
				if(!data){
					// test has already ended if server returns 200 and null
					goToEndOfTest();
					return;
				}
				$scope.timeLeft = data.timeAllowed * 60;
				return displayTest(data);
			})
			.catch(function(response){
				if(isTestSubmitted(response)){
					goToEndOfTest();
					return;
				}
				BaseModalService.errorAlert('A technical issue occured. If problem persists, consider re-logging in')
					.then(function(){
						$state.go('login');
					});
				console.log(response);
			});
	}
	// passing undefined or other falsy value will result redirection
	// to test termination page
	function displayTest(testData){
		if(!testData.testComponents){
			return;
		}
		$scope.loaded = true;
		var questionIndex = 1;
		// todo refactor in the backend
		testData.testComponents = _.sortBy(testData.testComponents,'ordering');
		console.log(testData);
		// a paragraph should be count towards question index
		for (var i=0;i<testData.testComponents.length;i++){
			if(!ComponentType.isQuestionType(testData.testComponents[i].componentType)){
				continue;
			}
			testData.testComponents[i]['questionIndex'] = questionIndex;
			questionIndex++;
		}
		$scope.category = testData;
		updateQuestionProgress();
		timer.start($scope.timeLeft);
	}

	// determines from a response object whether a test is submitted
	function isTestSubmitted(response){
		return response && response.data && response.data.errorNumber == ErrorCodes.testSubmitted;
	}

	function goToEndOfTest(){
		$state.go('testEnd');
		return;
	}
	$scope.saveResponse = function (question) {
		console.log(question);
		BaseService.post('/proctor/question/' + question.id,question.response)
			.then(function(){
				question.isSaved = true;
			})
			.then(updateQuestionProgress)
			.catch(function(response){
				console.log(response);
			});
	};

	$scope.onTimerFinished = function(){
		$scope.next(true);
	};

	$scope.next = function(ignoreConfirm){
		if(!ignoreConfirm){
			var confirm = window.confirm('Students, please make sure that all questions are answered before preceeding');
			if(!confirm){
				return;
			}
		}
		displayNextCategory();
	}

	function updateQuestionProgress(){
		var numDone = 0;
		var numTotal = 0;
		_.forEach($scope.category.testComponents,function(t){
			if(t.componentType !== ComponentType.COMP_HTML){
				// must be a question
				numTotal++;
				if(t.isSaved){
					numDone ++;
				}
			}
		});
		$scope.questionProgress.numDone = numDone;
		$scope.questionProgress.numTotal = numTotal;
	}
 }