import 'angular-local-storage';
require('./login.less');

/*========================================
=            Login Controller            =
========================================*/
/**
 *
 * First asks user to fill out an info form 
 * then, moves the user to `LoginAttempt` Stage, when we 
 * constantly ask the server for logging in (test might not have start yet)
 * we repeatedly ask until instructor activates a test
 *
 */



LoginController.$inject  = ['$rootScope','$scope',
    '$stateParams', '$state','$q','localStorageService',
    'BaseService','$cookies','BaseModalService','BaseToastService','$interval','$document'];
var LOGIN_ATTEMPT_INTERVAL = 15000; // send login attempt every 15 seconds
export default function LoginController($rootScope,$scope, 
    $stateParams,$state,$q,localStorageService,
    BaseService,$cookies,BaseModalService,BaseToastService,$interval,$document) {

    $scope.user = {
        firstName:'',
        lastName:'',
        studentID:'',
        dateOfBirth:'',
        gender:'',
        email:'',
        university:'',
        currentMajor:'',
        UWMajor:'',
        faculty:'',
        password:'',
    };
    var loginPolling = null;
    $scope.loaded=true;
    $scope.loginStaging = false;
    function cancelLoading(){
        $scope.loaded = true;
    }
    //TODO validate information before sending to our backend
    var startTest = function (user) {
        $scope.loaded=false;
        return BaseService.post('/login',user);
    };
    function cancelPolling(){
        if(loginPolling){
            $interval.cancel(loginPolling);
            loginPolling = null;
        }
    }

    function getDiffDate(d1,d2){
        var timeDiff = d2.getTime()-d1.getTime();
        return timeDiff;
    }
    // first, we put user into login-staging, where we repeatedly
    // send request to server and ask for login
    // if the server says test has not started yet, we continue to try
    // if server says error, we prompt the user for correcting the mistakes
    // if all goes well, user will start test immediately once instructor
    // activates the test
    $scope.login = function(user){
        user = user || $scope.user;
        var timeDiffInYears = Math.ceil(getDiffDate(user.dateOfBirth,new Date())/(1000*3600*24*365));
        if(timeDiffInYears>40 || timeDiffInYears < 10){
            BaseModalService
                .errorAlert('<p>Please double check your date of birth. Are you really that old or young?</p>')
                .then(function(){
                    // hack to resolve modal backdrop not being removed
                    $document.find('.modal').remove();
                    $document.find('.modal-backdrop').remove();
                    $document.find('body').removeClass('modal-open');
                });
            return;
        }
        $scope.loginStaging = true;
        window.scrollTo(0,0);
        loginPolling = $interval(function(){
            startTest(user).then(function(data){ 
                console.log('service trying to login, below is the data got from server');
                console.log(data);
                cancelLoading();
                $cookies.put('loginToken',data.jwt,{
                    expires:new Date(Date.now() + 300*60*1000) //expires in 300 minutes
                });
                cancelPolling();
                $state.go('test');
            });
        },LOGIN_ATTEMPT_INTERVAL);
    };
    $scope.resetLogin = function(){
        cancelPolling();
        $scope.loginStaging = false;
        $scope.loaded=true;
    };
    $scope.expressLogin=function(){
        $scope.login({'firstName':'asdfads','lastName':'test ','studentId':123,'dateOfBirth':new Date(1996,1,1),'gender':'MALE','email':'1231231@ccc.com','university':'University of Hong Kong','currentMajor':'hello','UWMajor':'','faculty':'','password':'1234'});
    };
}