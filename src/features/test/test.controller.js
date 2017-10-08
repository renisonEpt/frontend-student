
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
	'BaseService','$cookies','BaseToastService',
	'BaseModalService','$timeout','$document','$interval'];

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
	BaseService,$cookies,BaseToastService,BaseModalService,
	$timeout,$document,$interval) {
	$scope.endLoading = function(){
		$scope.$emit('loadingEnd');
	};
	$scope.startLoading = function(){
		$scope.$emit('loadingStart');
	};
	var timer = new Timer($scope);
	var warningReminderTime = 10; // warn on 10min left
	var endingReminderTime = 1; // warn the ending on 1 min left
	$scope.startLoading();
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
		// constantly report status to admin
		// only report in the middle of 10sec interval
		// don't wanna report when timeLeft is close to 0, since we might have
		// switched category by then
		// WARNING, this does not work!
		// I observed that request had upto 15secs delay, even 
		// messing around with timer and statusReporter would be nightmare
		// if (timeLeft % 5===0 && timeLeft%10 !== 0){
		// 	reportStatusHandleResponse();
		// }
	});
	// getting data, note that BaseService behaves differently
	// from services using ngResource
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
	// reports current status, handle any action required from admin
	function reportStatusHandleResponse(){
		if($scope.catgory === null){// havn't fetched test yet
			return;
		}
		BaseService.post('/proctor/statusReporter',{
			categoryId:$scope.category.id,
			timeRemaining: $scope.timeLeft
		})
		.then(function(response){
			console.log(response);
			var refreshNeeded = response.refreshNeeded;
			if(refreshNeeded){
				refreshCurrentCategory();
				refreshTimer();
				BaseToastService.warn('Admin may have updated your timing, or your '+
					'test is out of sync, we are auto refreshing your test',{
						timeOut:'15000' // how long message appears, in miliseconds
					});
			}
		})
		.catch(showErrorMsg);
	}
	function refreshTimer(){
		return BaseService.get('/proctor/timer').then(function(timeLeft){
			$scope.timeLeft = timeLeft;
		});
	}
	function refreshCurrentCategory(){
		return BaseService.get('/proctor/currentCategory')
			.then(function(currentCategory){
				displayTest(currentCategory);
			})
			.catch(showErrorMsg);
	}
	function displayNextCategory(){
		$scope.startLoading();
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
		$scope.endLoading();
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
					$document.find('.modal').remove();
					$document.find('.modal-backdrop').remove();
					$document.find('body').removeClass('modal-open');
					if(!confirmResult) return;
					// hack to resolve modal backdrop not being removed
					displayNextCategory();
			});
		}else{
			displayNextCategory();
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