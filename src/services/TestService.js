/**
 * Created by Han Chen on 25/01/2015.
 */

import angular from "angular";
import localStorageService from "angular-local-storage";
;

var TestServiceModule = angular.module('ept.student.TestService',['LocalStorageModule']).service('TestService',TestService).name;
var TestServiceName = "TestService";
export {
    TestServiceModule as default,
    TestServiceName
}


TestService.$inject = ['$http','localStorageService','$q'];
function TestService ($http,localStorageService,$q) {
    //the data should be a test object with the field questions
    var service=this;
    service.sessionID='';
    service.testStartTime=0;
    service.extensionTime = 0;
    service.isLoggedIn = false;
    service.debugLogin=false;
    service.urlParams={};
    service.categories=[];
    service.oneCategoryAtATime=true;
    (window.onpopstate = function () {
        var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
            query  = window.location.search.substring(1);
        service.urlParams = {};
        while (match = search.exec(query))
            service.urlParams[decode(match[1])] = decode(match[2]);
    })();

    var serviceRoute = "service/service.php";

    //communication with database
    service.studentLogin=function(user,onSuccess,onError){
        console.log("making login request");
        console.log(user);
        $http.post(serviceRoute,{'action':"login",'user':angular.toJson(user)})
            .then(function(response){
                //DEBUG use
                console.log("service trying to login, below is the response got from server");
                console.log(response);
                //if data is defined and is not of type error
                if(typeof response.data.type!=='undefined' && response.data.type!=='error'){
                    //set the sessionID
                    service.sessionID=parseInt(response.data.sessionID);
                    service.isLoggedIn = true;
                    localStorageService.clearAll();
                    var now = Math.floor(Date.now()/1000);
                    localStorageService.set("testStartTime",{"start":now,"sessionID":service.sessionID});
                    onSuccess(response.data);//success callback
                }else{//if no response or response is of type error
                    onError(response.data);//call the error callback
                }
            });
    };
    /**
     * retrives questions from the database
     * */

     service.retrieveQuestions = function (onSuccess,onError,config){
        var params = {action:"retrieve"};
        if(service.urlParams.previewID && service.urlParams.testID){
            params.previewID = service.urlParams.previewID;
            params.testID = service.urlParams.testID;
        }else if(service.sessionID){
            params.sessionID=service.sessionID
        }else{
            if(onError)onError();
            return;
        }
        $http.post(serviceRoute,params)
            .then(function(result){
                //if data is defined and is not of type error
                if(typeof result.data.type!=='undefined' && result.data.type!=='error'){
                    console.log(result.data);
                    var now = Math.floor(Date.now() / 1000);
                    var processedQuestions =[];
                    var finishedCategories = angular.fromJson(localStorageService.get("finishedCategories")) || [];
                    var lastFinishedCategoryID = finishedCategories.length>0?
                        finishedCategories[finishedCategories.length-1]["categoryID"]:
                        -1; 
                    var lastFinishedCategoryIndex = _.findIndex(result.data.data.questions,function(cat){
                        return cat.categoryID == lastFinishedCategoryID;
                    });
                    service.testStartTime = parseInt(result.data.data.testStartTime);
                    service.extensionTime = parseInt(result.data.data.extensionTime)*60;
                    service.updateCategorySubmitTime();

                    // for(var i =0;i<result.data.data.questions.length;i++){
                    //     var category = result.data.data.questions[i];
                    //     if(typeof category.cut_off_time ==='undefined' || typeof result.data.data.testStartTime ==="undefined"){
                    //         onError(result.data);
                    //         return;
                    //     }
                    //     //TODO testStartTime should not be changed, at the frontend. To properly address
                    //     // the problem of students finishing early and the allowable time for each category stays the same we need more work
                    //     if(!service.getTestStartTimeFromLocalStorage()){
                    //         onError({message:"cannot get test time"});
                    //         return;
                    //     }
                    //     if(i > lastFinishedCategoryIndex){
                    //         // I am now looking at the category student has yet to finish
                    //         maxTimeAllowedAfterLastSubmission+=parseInt(category.cut_off_time);
                    //     }

                    //     var shouldBeDisplayed = (function(){
                    //         //TODO whether or not this category should be displayed to the users,
                    //         // normally this would be done on the server side, so consider refactor this in the future
                    //         //whether the time is out for this category

                    //         //testStartTime is always equal to the submit time of the last category student finished
                    //         //if the last category student has finished is equal to the previous category,
                    //         // AND that testStartTime + this `category` s cut_off_time 
                    //         //student has timed out on the current category
                    //         var isTimedOut = ((service.testStartTime + (maxTimeAllowedAfterLastSubmission *60) + service.extensionTime)< now);
                    //         //if a locally stored finished categories exist, then test this category is in that, if not, user for sure has not submitted
                    //         console.log(finishedCategories);
                    //         var hasSubmitted = finishedCategories.length>0?_.findIndex(finishedCategories,function(i){
                    //             return i["categoryID"]==category.categoryID;
                    //         })>=0:false;
                    //         //if the category is neither timed out, nor submitted by the students
                    //         return !(isTimedOut || hasSubmitted);
                    //     })();
                    //     if(shouldBeDisplayed){
                    //         processedQuestions.push(category);
                    //     }
                    // }
                    var maxTimeAllowedAfterLastSubmission = 0;
                    var notToBeDisplayedUntil = lastFinishedCategoryIndex; //categories not to be displayed
                    // until and including `index` 
                    for(var i =0;i<result.data.data.questions.length;i++){
                        var category = result.data.data.questions[i];
                        if(i>lastFinishedCategoryIndex){
                            //see if time has passed
                            var shouldBeFinishedAt = parseInt(category.cut_off_time) * 60 + service.testStartTime ;
                            if(shouldBeFinishedAt<= now){
                                service.markAsSubmitted(category,shouldBeFinishedAt);
                                //test start time should be updated
                                notToBeDisplayedUntil = i;
                            }else{
                                break;
                                // processedQuestions.push(category); obsolete
                            }
                        }
                    }
                    // service.categories=processedQuestions || []; obsolete
                    // only display categories after `notToBeDisplayedUntil`
                    service.categories = _.filter(result.data.data.questions,function(category,index){
                        return index>notToBeDisplayedUntil;
                    });
                    if(service.categories.length<1) {
                        onError({message:"Test time out"});
                        return;
                    }
                    console.log(service.categories);
                    onSuccess(result.data);//success callback
                }else{//if no response or response is of type error
                    onError(result.data);//call the error callback
                }
            });
    };
     /**
     * @param response, string or array
     * @param questionID string or int
      * @param categoryName, string
     * @param onSuccess success callback
     * @param onError error callback
     * */
    service.submitResponse=function(response,questionID,categoryName,onSuccess,onError){
        var req =$http.post(serviceRoute,
            {'action':"submit_response",
            'sessionID':service.sessionID,
            'category':categoryName, //TODO on server side, we should not retrieve info by category name, it should be done by ID
            'questionID':questionID,
            'response':angular.toJson(response)
            });
        req.then(function(result){
                //if data is defined and is not of type error
                if(typeof result.data.type!=='undefined' && result.data.type!=='error'){
                    if(onSuccess)onSuccess(result.data);//success callback
                }else{//if no response or response is of type error
                    if(onError)onError(result.data);//call the error callback
                }
                //DEBUG use
                console.log(angular.toJson(response));
            });
        return req;
    };
    service.submitAll=function(onError) {
        var submitWithBlank = false;
        var promises = [];
        for (var i = 0; i < service.categories.length; i++) {
            if (!service.testStartTime) {
                onError({message: 'Service cannot find test start time'});
                return;
            }
            var category = service.categories[i];
            var now = Math.floor(Date.now() / 1000);
            if (service.testStartTime + category.cut_off_time * 60 < now) continue;
            var subcategories = service.categories[i].subcategories;
            for (var j = 0; j < subcategories.length; j++) {
                var questions = subcategories[j].questions;
                for (var k = 0; k < questions.length; k++) {
                    var question = questions[k];
                    var copy = k;
                    if ((question.type == Multiple_Choice || question.type == Short_Answer) && !question.response) {
                        if (!submitWithBlank) {//not asked yet
                            alert("Some of your questions that will be marked by computer are not answered, at least attempt them please, you won't be penalized for wrong answer");
                            return;
                        }
                        //if submitwithblank is true
                        else { //already asked, insist on submitting
                            promises.push(service.submitResponse(question.response,
                                question.questionID, category.name));
                        }
                    } else { //already asked, insist on submitting
                        promises.push(service.submitResponse(question.response,
                            question.questionID, category.name));
                    }
                }
            }

        }
        return $q.all(promises);
    };
    service.moveToNext = function(){
        if(service.categories.length>=1){
            
            service.categories.splice(0,1);
        }else if(service.categories.length<=1){ //only one category left
            alert("Time is up for the exam. Please make sure you return your devices");
            service.categories=[];
            return true;
        }
    };
    service.updateExtensionTime = function(){
        console.log("updating extension time");
        var params={"action":"getExtensionTime","sessionID":service.sessionID};
        var req= $http.post(serviceRoute,params);
        return req.then(function(response){
            if(response.data.type=="error"){
                alert("There is an error retrieving your extension time allowed. Error Message: " +response.data.message);
                console.log();
            }else{
                service.extensionTime = parseInt(response.data.extensionTime)*60;
            }
            console.log(response);
        });
    };

    service.cancelExtensionTime=function(){
        var params={"action":"cancelExtensionTime","sessionID":service.sessionID};
        var req= $http.post(serviceRoute,params);
        return req.then(function(response){
            if(response.data.type=="error"){
                alert("There is an error updating your extension time allowed. Error Message: " +response.data.message);
                console.log();
            }else{
                service.extensionTime = parseInt(response.data.extensionTime)*60;
            }
            console.log(response);
        });
    };
    service.updateCategorySubmitTime = function(){
        var finishedCategories = angular.fromJson(localStorageService.get("finishedCategories")) || [];
        if(finishedCategories.length>0) service.testStartTime = finishedCategories[finishedCategories.length-1].submitTime;
    };
    service.getTestStartTimeFromLocalStorage = function(){
        var testStartTime = angular.fromJson(localStorageService.get("testStartTime")) || null;
        if(testStartTime && testStartTime.sessionID==service.sessionID){
            service.testStartTime = testStartTime.start;
            return true;
        }else{
            alert("Service cannot retrieve your test start time information. " +
            "You probably did not enter the correct sessionID " +
            "If you keep seeing this message, please consider registering " +
            "another account at the login page");
            return false;
        }

    };
    service.markAsSubmitted=function(category,time){
        var params = {action:"finishCategory"};
        var justFinished = category;
        params["categoryID"] = justFinished.categoryID;
        params["sessionID"] = service.sessionID;
        $http.post(serviceRoute,params).then(function(data){
            //on success
            console.log("debug: on successful category finish");
            console.log(data);
        },function(err){
            //on error
            alert("an error occurred while moving on you to the next category, please contact site admin");
        });
        var finishedCategories = localStorageService.get("finishedCategories") ||[];
        if(!service.debugLogin)service.cancelExtensionTime();
        finishedCategories.push({
            categoryID:category.categoryID,
            submitTime:time?time:Math.floor(Date.now()/1000)
        });
        localStorageService.set('finishedCategories',finishedCategories);
        service.updateCategorySubmitTime();
        console.log(localStorageService.get("finishedCategories"));
    };
}