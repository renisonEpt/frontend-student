
// 
var ComponentType = require('renison-ept-frontend-core/src/constants/component-type');
var QuestionType = require('renison-ept-frontend-core/src/constants/question-type');
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
	var timer = new Timer($scope);
	var warningReminderTime = 10; // warn on 10min left
	var endingReminderTime = 1; // warn the ending on 1 min left
	$scope.loaded = false;
	$scope.timeLeft = 100;
	$scope.questionProgress = {
		numDone:0,
		numTotal:0
	};
	$scope.category = null;
	timer.setOnTick(function(timeLeft){
		if(timeLeft === warningReminderTime * 60){
			BaseToastService.warn('You have about '+ warningReminderTime+' min left. ' + 
				'Do not leave anything blank.'+
				'You will start the next ' + 
				'category once this one finishes.', 
				warningReminderTime + ' minute left',{
					timeOut:'15000' // how long message appears, in miliseconds
				});
		}else if(timeLeft == endingReminderTime * 60){
			BaseToastService.warn('Your current category will end in '+endingReminderTime+' min.',
				'Category ending soon',{
					timeOut:'15000' 
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
				BaseModalService
					.errorAlert('A technical issue occured. If problem persists, consider re-logging in');
				console.log(response);
			});
	}
	function scrollToTop(){
		window.scrollTo(0,0);
	}
	// passing undefined or other falsy value will result redirection
	// to test termination page
	function displayTest(testData){
		if(!testData.testComponents){
			return;
		}
		$scope.loaded = true;
		var questionIndex = 1;
		// todo refactor to the backend
		testData.testComponents = _.sortBy(testData.testComponents,'ordering');
		// a paragraph should be count towards question index
		for (var i=0;i<testData.testComponents.length;i++){
			if(!ComponentType.isQuestionType(testData.testComponents[i].componentType)){
				if(testData.testComponents[i].componentType === ComponentType.COMP_VIDEO){
					// add base url to video src url
					// we must go to http://myserver-address:8080/VIDEO_SRC_NAME, instead of 
					// localhost:8888/VIDEO_SRC_NAME
					testData.testComponents[i].content = BaseService.BASE_URL + testData.testComponents[i].content;
				}
				continue;
			}
			testData.testComponents[i]['questionIndex'] = questionIndex;
			questionIndex++;
		}
		$scope.category = testData;
		updateQuestionProgress();
		timer.start($scope.timeLeft);
		scrollToTop();
	}

	// determines from a response object whether a test is submitted
	function isTestSubmitted(response){
		return response && response.data && response.data.errorNumber == ErrorCodes.testSubmitted;
	}

	function goToEndOfTest(){
		$state.go('testEnd');
		return;
	}
	// save answers to questions
	$scope.saveResponse = function (question) {
		BaseService.post('/proctor/question/' + question.id,question.response)
			.then(function(){
				question.isSaved = true;
			})
			.then(updateQuestionProgress)
			.catch(showErrorMsg);
	};

	$scope.onTimerFinished = function(){
		$scope.next(true);
	};

	function getNumUnanswered(){
		return $scope.questionProgress.numTotal - $scope.questionProgress.numDone;
	}
	function getUnansweredWarning(){
		var numUnanswered = getNumUnanswered();
		if(numUnanswered>0){
			return 'You have ' + numUnanswered + ' questions left blank.';
		}else{
			return '';
		}
	}

	$scope.next = function(ignoreConfirm){
		if(!ignoreConfirm){
			var confirmMessage = getUnansweredWarning() + ' When you leave this section, you will not be able to return. \nSelect OK to continue to the next section. Select Cancel to stay in this section.';
			var modalOptions = {
				modalTitle: 'Moving on...',
				modalBody: '<p>'+confirmMessage+'</p>'
			};
			BaseModalService.confirm(modalOptions)
				.then(function(confirmResult){
					if(confirmResult) displayNextCategory();
				});
		}
	}
	$scope.isLastCategory = function(){
		return $scope.category && $scope.category.name === 
			$scope.category.allCategories[$scope.category.allCategories.length-1];
	};

	$scope.getNextButtonText = function(){
		var isLastCategory = $scope.isLastCategory();
		return isLastCategory?'Finish Test':'Next';
	};

	$scope.getNumCategoriesLeft = function(){
		if(!$scope.category) return 0;
		var index = $scope.category.allCategories.indexOf($scope.category.name);
		return  $scope.category.allCategories.length  - 1 - index;
	};
	function updateQuestionProgress(){
		var numDone = 0;
		var numTotal = 0;
		_.forEach($scope.category.testComponents,function(t){
			if(ComponentType.isQuestionType(t.componentType)){
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

	function showErrorMsg(response){
		var errorMsg = 'Oops, a technical just occurred.'
		if(response && response.data && response.data.errorMessage){
			errorMsg = response.data.errorMessage;
		}
		console.log(response);
		BaseToastService.error(errorMsg);
	}
 }